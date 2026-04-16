import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const categories = await prisma.$queryRaw`SELECT * FROM "Category" ORDER BY name ASC`;
    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const id = `cat_${Date.now()}`;
    await prisma.$executeRaw`INSERT INTO "Category" (id, name) VALUES (${id}, ${name})`;
    
    return NextResponse.json({ id, name });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  console.log(`[API] DELETE /api/categories called for ID: ${id}`);

  try {
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    // 1. Unlink products from this category first (to avoid foreign key violation)
    await prisma.$executeRaw`UPDATE "Product" SET "categoryId" = NULL WHERE "categoryId" = ${id}`;

    // 2. Delete the category
    await prisma.$executeRaw`DELETE FROM "Category" WHERE id = ${id}`;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete category error:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
