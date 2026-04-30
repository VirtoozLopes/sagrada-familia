import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// DELETE /api/reports/daily/item?date=YYYY-MM-DD&code=123
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const code = searchParams.get('code');

    if (!dateParam || !code) {
      return NextResponse.json({ error: 'Faltam parâmetros: date ou code' }, { status: 400 });
    }

    const period = searchParams.get('period') || 'daily';

    const date = new Date(dateParam);
    
    let start, end;
    if (period === 'weekly') {
      const day = date.getUTCDay();
      const diffToMonday = date.getUTCDate() - day + (day === 0 ? -6 : 1);
      start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diffToMonday, 0, 0, 0, 0));
      end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 6, 23, 59, 59, 999));
    } else {
      start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
      end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
    }

    // Encontra os itens que serão apagados
    const itemsToDelete = await prisma.orderItem.findMany({
      where: {
        code: code,
        order: {
          createdAt: {
            gte: start,
            lte: end
          }
        }
      }
    });

    if (itemsToDelete.length === 0) {
      return NextResponse.json({ success: true, count: 0, restoredQuantity: 0 });
    }

    const totalQuantityToRestore = itemsToDelete.reduce((sum, item) => sum + item.quantity, 0);

    // Usa transação para garantir que a exclusão e o retorno de estoque ocorram juntos
    await prisma.$transaction(async (tx) => {
      // 1. Exclui os itens do pedido
      await tx.orderItem.deleteMany({
        where: {
          code: code,
          order: {
            createdAt: {
              gte: start,
              lte: end
            }
          }
        }
      });

      // 2. Devolve o estoque para o produto
      await tx.$executeRaw`
        UPDATE "Product"
        SET stock = stock + ${totalQuantityToRestore}, "updatedAt" = NOW()
        WHERE code = ${code}
      `;
    });

    return NextResponse.json({ 
      success: true, 
      count: itemsToDelete.length, 
      restoredQuantity: totalQuantityToRestore 
    });

  } catch (error: any) {
    console.error('Erro ao excluir item do relatório:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
