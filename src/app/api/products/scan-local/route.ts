import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { processPdfCatalog } from '@/lib/pdf-parser';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const desktopPath = 'C:\\Users\\victo\\Desktop\\catalogos';
    const filename = 'catalogo.pdf'; // Main one we analyzed
    const fullPath = path.join(desktopPath, filename);

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'Arquivo catalogo.pdf não encontrado no Desktop' }, { status: 404 });
    }

    const buffer = fs.readFileSync(fullPath);
    const extractedData = await processPdfCatalog(buffer);

    let updatedCount = 0;
    for (const item of extractedData) {
      const product = await prisma.product.updateMany({
        where: { code: item.code },
        data: { imageUrl: item.imagePath }
      });
      if (product.count > 0) updatedCount++;
    }

    return NextResponse.json({ 
      success: true, 
      totalFound: extractedData.length,
      updatedInDb: updatedCount 
    });
  } catch (error: any) {
    console.error('Local Scan Error:', error);
    return NextResponse.json({ error: error.message || 'Falha ao escanear catálogo local' }, { status: 500 });
  }
}
