import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const categoryId = searchParams.get('categoryId');

  try {
    let products;
    let sql = `SELECT * FROM Product WHERE 1=1 `;
    const params = [];

    if (query) {
      sql += `AND (name LIKE %${params.length + 1}% OR code LIKE %${params.length + 1}%) `;
      params.push(`%${query}%`);
    }

    if (categoryId && categoryId !== 'all') {
      sql += `AND categoryId = %${params.length + 1}% `;
      params.push(categoryId);
    }

    sql += `LIMIT 100`;

    // Note: Prisma raw query syntax with variables is specific. 
    // Since we are troubleshooting, I'll use a safer template literal approach if possible or simple string for SQLite.
    if (categoryId && categoryId !== 'all' && query) {
      products = await prisma.$queryRaw`
        SELECT p.* FROM "Product" p
        LEFT JOIN "Category" c ON p."categoryId" = c.id
        WHERE (p.name ILIKE ${`%${query}%`} OR p.code ILIKE ${`%${query}%`} OR c.name ILIKE ${`%${query}%`})
        AND p."categoryId" = ${categoryId}
        LIMIT 100
      `;
    } else if (categoryId && categoryId !== 'all') {
      products = await prisma.$queryRaw`
        SELECT * FROM "Product" 
        WHERE "categoryId" = ${categoryId}
        LIMIT 100
      `;
    } else if (query) {
      products = await prisma.$queryRaw`
        SELECT p.* FROM "Product" p
        LEFT JOIN "Category" c ON p."categoryId" = c.id
        WHERE p.name ILIKE ${`%${query}%`} OR p.code ILIKE ${`%${query}%`} OR c.name ILIKE ${`%${query}%`}
        LIMIT 100
      `;
    } else {
      products = await prisma.$queryRaw`
        SELECT * FROM "Product" 
        LIMIT 100
      `;
    }

    return NextResponse.json(products);
  } catch (error) {
    console.error('Raw query error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
