import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseProductsExcel } from '@/lib/excel-parser';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const products = await parseProductsExcel(buffer);

    // Batch upsert products
    for (const product of products) {
      await prisma.product.upsert({
        where: { code: product.code },
        update: {
          name: product.name,
          description: product.description,
          price: product.price,
        },
        create: {
          code: product.code,
          name: product.name,
          description: product.description,
          price: product.price,
        },
      });
    }

    return NextResponse.json({ success: true, count: products.length });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process Excel' }, { status: 500 });
  }
}
