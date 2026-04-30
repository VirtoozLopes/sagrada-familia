import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const categoryId = searchParams.get('categoryId');

  try {
    let whereClause: any = {};

    if (query) {
      whereClause.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { code: { contains: query, mode: 'insensitive' } },
        { category: { name: { contains: query, mode: 'insensitive' } } }
      ];
    }

    if (categoryId && categoryId !== 'all') {
      // Find category and its children
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        include: { children: true }
      });
      
      if (category) {
        const catIds = [category.id, ...category.children.map(c => c.id)];
        whereClause.categoryId = { in: catIds };
      } else {
        whereClause.categoryId = categoryId;
      }
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      orderBy: { code: 'asc' },
      take: 100
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
