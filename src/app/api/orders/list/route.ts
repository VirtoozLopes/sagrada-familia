export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page  = parseInt(searchParams.get('page')  || '1');
    const limit = parseInt(searchParams.get('limit') || '30');
    const search = searchParams.get('search') || '';
    const date   = searchParams.get('date')   || '';
    const skip   = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.customerName = { contains: search, mode: 'insensitive' };
    }
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.order.count({ where }),
    ]);

    // Add a human-readable sequential number (newest = highest)
    const ordersWithNum = orders.map((o, idx) => ({
      ...o,
      _orderNum: total - skip - idx,
    }));

    return NextResponse.json({ orders: ordersWithNum, total, page, limit });
  } catch (error: any) {
    console.error('List orders error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
