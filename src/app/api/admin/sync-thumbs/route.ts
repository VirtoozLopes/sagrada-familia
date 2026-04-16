import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { Jimp } from 'jimp';

export async function GET() {
  try {
    // Raw SQL to find products without thumbs
    const products: any[] = await prisma.$queryRaw`
      SELECT * FROM Product 
      WHERE imageUrl IS NOT NULL 
      AND thumbUrl IS NULL
    `;

    console.log(`Found ${products.length} products needing thumbnails.`);
    
    const results = [];
    const thumbDir = path.join(process.cwd(), 'public', 'catalog-thumbnails');
    if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });

    for (const product of products) {
      try {
        const imagePath = path.join(process.cwd(), 'public', product.imageUrl!);
        if (!fs.existsSync(imagePath)) {
           results.push({ code: product.code, status: 'error', message: 'Original image not found' });
           continue;
        }

        const buffer = fs.readFileSync(imagePath);
        const image = await Jimp.read(buffer as any);
        
        const fileName = path.basename(imagePath);
        const thumbPath = path.join(thumbDir, fileName);
        
        await image.resize({ w: 300 });
        await image.write(thumbPath as any);

        const thumbUrl = `/catalog-thumbnails/${fileName}`;
        
        // Raw SQL to update
        await prisma.$executeRaw`
          UPDATE Product 
          SET thumbUrl = ${thumbUrl} 
          WHERE id = ${product.id}
        `;

        results.push({ code: product.code, status: 'success' });
      } catch (err: any) {
        results.push({ code: product.code, status: 'error', message: err.message });
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: products.length,
      details: results 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
