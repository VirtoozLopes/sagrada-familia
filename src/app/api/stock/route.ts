import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: returns all products with stock info, ordered by code
export async function GET() {
  try {
    const products = await prisma.$queryRaw`
      SELECT id, code, name, stock, "categoryId", "imageUrl"
      FROM "Product"
      ORDER BY code ASC
    `;
    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: bulk update stock for a list of products
// Body: [{ id: string, stock: number }, ...]
export async function PATCH(request: Request) {
  try {
    const updates: { id: string; stock: number }[] = await request.json();
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    for (const { id, stock } of updates) {
      const stockVal = Math.max(0, Math.round(Number(stock) || 0));
      await prisma.$executeRaw`
        UPDATE "Product" SET stock = ${stockVal}, "updatedAt" = NOW() WHERE id = ${id}
      `;
    }

    return NextResponse.json({ success: true, updated: updates.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
