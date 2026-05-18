export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { items: true },
    });
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(order);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { customerName, customerPhone, notes, status, items } = body;

    // If items are provided, replace all OrderItems atomically
    let newTotalAmount: number | undefined;
    if (Array.isArray(items)) {
      await prisma.orderItem.deleteMany({ where: { orderId: params.id } });
      if (items.length > 0) {
        await prisma.orderItem.createMany({
          data: items.map((item: any) => ({
            orderId: params.id,
            productId: item.productId || item.id || '',
            code: item.code,
            name: item.name,
            quantity: Math.max(1, Number(item.quantity) || 1),
            price: Number(item.price) || 0,
            customization: item.customization || null,
          })),
        });
      }
      newTotalAmount = items.reduce(
        (sum: number, item: any) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
        0
      );
    }

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: {
        ...(customerName   !== undefined && { customerName }),
        ...(customerPhone  !== undefined && { customerPhone }),
        ...(notes          !== undefined && { notes }),
        ...(status         !== undefined && { status }),
        ...(newTotalAmount !== undefined && { totalAmount: newTotalAmount }),
      },
      include: { items: true },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Patch order error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Delete order items first (FK constraint)
    await prisma.orderItem.deleteMany({ where: { orderId: params.id } });
    await prisma.order.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete order error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
