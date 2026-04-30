import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Returns up to N products per category, ordered by code ASC
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawLimit = parseInt(searchParams.get('limitPerCategory') || '6');
  // Clamp to a safe integer to avoid injection
  const limitPerCategory = Math.max(1, Math.min(rawLimit, 50));

  try {
    // Use a window function to get the first N products per category.
    // We inject the limit as a raw integer (safe, clamped above).
    const limitSql = Prisma.sql`${limitPerCategory}`;
    const products = await prisma.$queryRaw`
      SELECT id, code, name, description, price, "imageUrl", "thumbUrl",
             "categoryId", "createdAt", "updatedAt", stock, "isCustomizable"
      FROM (
        SELECT
          p.*,
          ROW_NUMBER() OVER (
            PARTITION BY p."categoryId"
            ORDER BY p.code ASC
          ) AS rn
        FROM "Product" p
        WHERE p.code != 'Código' AND p.name != 'Produto'
      ) ranked
      WHERE rn <= ${limitSql}
      ORDER BY "categoryId", code ASC
    `;

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching grouped products:', error);
    return NextResponse.json({ error: 'Failed to fetch products', detail: String(error) }, { status: 500 });
  }
}
