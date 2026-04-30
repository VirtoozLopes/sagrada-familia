import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendOrderEmails } from '@/lib/email-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customer, items } = body;

    if (!customer || !items || items.length === 0) {
      return NextResponse.json({ error: 'Dados do pedido incompletos' }, { status: 400 });
    }

    // 1. Process items and update stock
    const processedItems = [];
    
    for (const item of items) {
      if (item.customization) {
        // Get original product to inherit category if possible
        const originalProduct = await prisma.product.findUnique({
          where: { id: item.id }
        });

        const customCode = `${item.code}-${item.customization.trim()}`.toUpperCase().replace(/\s+/g, '-');
        const customName = `${item.name} (${item.customization.trim()})`;

        const customProduct = await prisma.product.upsert({
          where: { code: customCode },
          update: {
            stock: { decrement: item.quantity },
          },
          create: {
            code: customCode,
            name: customName,
            price: item.price || 0,
            stock: -item.quantity,
            categoryId: originalProduct?.categoryId || null,
          }
        });

        processedItems.push({
          productId: customProduct.id,
          code: customProduct.code,
          name: customProduct.name,
          quantity: item.quantity,
          price: item.price,
          customization: item.customization,
        });
      } else {
        // Normal item, just decrement stock
        if (item.id) {
          await prisma.product.update({
            where: { id: item.id },
            data: { stock: { decrement: item.quantity } }
          });
        }

        processedItems.push({
          productId: item.id,
          code: item.code,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          customization: null,
        });
      }
    }

    // 2. Save order to database
    const order = await prisma.order.create({
      data: {
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        totalAmount: processedItems.reduce((sum: number, item: any) => sum + (item.price || 0) * item.quantity, 0),
        items: {
          create: processedItems,
        },
      },
      include: { items: true },
    });

    // 2. TODO: Generate PDF
    // For now, we'll send the email without the PDF buffer or a placeholder
    // In a real scenario, we'd use a server-side PDF generator here.
    
    // 3. Send Emails
    await sendOrderEmails(customer, items);

    // 4. Fetch WhatsApp config if any
    const settings = await prisma.$queryRaw<any[]>`SELECT value FROM "Setting" WHERE key = 'whatsappNumber' LIMIT 1`;
    const whatsapp = (settings && settings.length > 0) ? settings[0].value : null;

    return NextResponse.json({ success: true, orderId: order.id, whatsapp });
  } catch (error: any) {
    console.error('Order error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process order' }, { status: 500 });
  }
}
