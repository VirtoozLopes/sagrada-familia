import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { productId, categoryId } = await request.json();
    if (!productId) return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });

    const targetCategoryId = categoryId === 'none' ? null : categoryId;

    // Raw SQL Update since prisma client is out of sync
    await prisma.$executeRaw`
      UPDATE "Product" 
      SET "categoryId" = ${targetCategoryId} 
      WHERE id = ${productId}
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
