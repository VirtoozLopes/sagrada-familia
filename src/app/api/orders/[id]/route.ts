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
    const { customerName, customerPhone, notes, status } = body;

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: {
        ...(customerName  !== undefined && { customerName }),
        ...(customerPhone !== undefined && { customerPhone }),
        ...(notes         !== undefined && { notes }),
        ...(status        !== undefined && { status }),
      },
      include: { items: true },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Patch order error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
