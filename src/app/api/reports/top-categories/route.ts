import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/reports/top-categories?period=alltime|monthly|weekly
// Returns the top 5 categories by sales volume
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'alltime';

    let dateFilter = '';
    const now = new Date();

    let start: Date | null = null;
    if (period === 'monthly') {
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    } else if (period === 'weekly') {
      const day = now.getUTCDay();
      const diffToMonday = now.getUTCDate() - day + (day === 0 ? -6 : 1);
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diffToMonday, 0, 0, 0, 0));
    }

    const whereClause = start ? `WHERE o."createdAt" >= '${start.toISOString()}'` : '';

    const result = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        COALESCE(parent.name, c.name, 'Sem Categoria')  AS "categoryName",
        COALESCE(parent.id,   c.id,   'uncategorized') AS "categoryId",
        SUM(oi.quantity)::int                           AS "totalQuantity",
        SUM(oi.quantity * COALESCE(oi.price, 0))        AS "totalRevenue",
        COUNT(DISTINCT oi."orderId")::int               AS "orderCount"
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      LEFT JOIN "Product" p ON p.code = oi.code
      LEFT JOIN "Category" c ON c.id = p."categoryId"
      LEFT JOIN "Category" parent ON parent.id = c."parentId"
      ${whereClause}
      GROUP BY COALESCE(parent.name, c.name, 'Sem Categoria'),
               COALESCE(parent.id,  c.id,  'uncategorized')
      ORDER BY SUM(oi.quantity) DESC
      LIMIT 5
    `);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Top categories error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
