import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/reports/daily?date=YYYY-MM-DD
// Returns all order items for that day, aggregated by product
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    const period = searchParams.get('period') || 'daily';

    // Default to today in UTC if no date provided
    const date = dateParam ? new Date(dateParam) : new Date();
    
    let start, end;
    if (period === 'weekly') {
      const day = date.getUTCDay(); // 0 is Sunday, 1 is Monday
      const diffToMonday = date.getUTCDate() - day + (day === 0 ? -6 : 1);
      start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diffToMonday, 0, 0, 0, 0));
      end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 6, 23, 59, 59, 999));
    } else {
      start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
      end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
    }

    // Get aggregated sales per product for the day (all orders regardless of status)
    const items = await prisma.$queryRaw<any[]>`
      SELECT
        oi.code,
        oi.name,
        SUM(oi.quantity)::int           AS "totalQuantity",
        AVG(oi.price)                   AS "avgPrice",
        SUM(oi.quantity * COALESCE(oi.price, 0)) AS "totalValue",
        p.stock                          AS "currentStock",
        COUNT(DISTINCT oi."orderId")::int AS "orderCount"
      FROM "OrderItem" oi
      LEFT JOIN "Product" p ON p.code = oi.code
      JOIN "Order" o ON o.id = oi."orderId"
      WHERE o."createdAt" >= ${start}
        AND o."createdAt" <= ${end}
      GROUP BY oi.code, oi.name, p.stock
      ORDER BY SUM(oi.quantity) DESC
    `;

    // Total summary for the day
    const summary = await prisma.$queryRaw<any[]>`
      SELECT
        COUNT(DISTINCT o.id)::int          AS "totalOrders",
        SUM(oi.quantity)::int              AS "totalItems",
        SUM(oi.quantity * COALESCE(oi.price, 0)) AS "totalRevenue"
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      WHERE o."createdAt" >= ${start}
        AND o."createdAt" <= ${end}
    `;

    return NextResponse.json({
      period,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      items,
      summary: summary[0] || { totalOrders: 0, totalItems: 0, totalRevenue: 0 },
    });
  } catch (error: any) {
    console.error('Daily report error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
