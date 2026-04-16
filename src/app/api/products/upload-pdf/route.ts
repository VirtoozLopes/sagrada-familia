import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { processPdfCatalog } from '@/lib/pdf-parser';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extractedData = await processPdfCatalog(buffer);

    // Update product image URLs in database
    let updatedCount = 0;
    for (const item of extractedData) {
      // Find product by code and update its image URL
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
    console.error('PDF Process Error:', error);
    return NextResponse.json({ error: error.message || 'Falha ao processar PDF' }, { status: 500 });
  }
}
