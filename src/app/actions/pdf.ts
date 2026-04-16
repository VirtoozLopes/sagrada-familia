'use server';

import prisma from '@/lib/prisma';
import { processPdfCatalog } from '@/lib/pdf-parser';

export async function processPdfAction(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) throw new Error('Nenhum arquivo enviado.');

    const buffer = Buffer.from(await file.arrayBuffer());
    const extractedData = await processPdfCatalog(buffer);

    let updatedCount = 0;
    for (const item of extractedData) {
      const product = await prisma.product.updateMany({
        where: { code: item.code },
        data: { imageUrl: item.imagePath }
      });
      if (product.count > 0) updatedCount++;
    }

    return { 
      success: true, 
      totalFound: extractedData.length,
      updatedInDb: updatedCount 
    };
  } catch (error: any) {
    console.error('Action Error:', error);
    return { success: false, error: error.message || 'Erro ao processar PDF' };
  }
}

export async function scanLocalCatalogAction() {
  try {
    const fs = require('fs');
    const path = require('path');
    const desktopPath = 'C:\\Users\\victo\\Desktop\\catalogos';
    const filename = 'catalogo.pdf';
    const fullPath = path.join(desktopPath, filename);

    if (!fs.existsSync(fullPath)) {
      throw new Error('Arquivo catalogo.pdf não encontrado no Desktop.');
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

    return { 
      success: true, 
      totalFound: extractedData.length,
      updatedInDb: updatedCount 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
