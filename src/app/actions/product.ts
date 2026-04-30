'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { put } from '@vercel/blob';
import { Jimp } from 'jimp';

export async function getAllProductsAction() {
  try {
    const products = await prisma.$queryRaw`SELECT * FROM "Product" ORDER BY code ASC`;
    return { success: true, products: products as any[] };
  } catch (error) {
    console.error('Error fetching products:', error);
    return { success: false, error: 'Falha ao buscar produtos.' };
  }
}

export async function uploadProductImageAction(formData: FormData) {
  try {
    const productId = formData.get('productId') as string;
    const code = formData.get('code') as string;
    const file = formData.get('file') as File;

    if (!productId || !file || !code) {
      return { success: false, error: 'Dados insuficientes.' };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const isPng = file.name.toLowerCase().endsWith('.png') || file.type === 'image/png';
    const ext = isPng ? 'png' : 'jpg';
    const mimeType = isPng ? 'image/png' : 'image/jpeg';
    
    const sanitizedCode = code.replace(/\s/g, '_');
    const fileName = `${sanitizedCode}.${ext}`;

    // Upload original to Vercel Blob
    const blob = await put(`catalog-images/${fileName}`, buffer, {
      access: 'public',
      contentType: mimeType,
    });
    const imageUrl = blob.url;

    // Generate thumbnail and upload
    let thumbUrl = imageUrl;
    try {
      const image = await Jimp.read(buffer);
      await image.resize({ w: 300 });
      const thumbBuffer = await image.getBuffer(mimeType as any);
      const thumbBlob = await put(`catalog-thumbnails/${fileName}`, thumbBuffer, {
        access: 'public',
        contentType: mimeType,
      });
      thumbUrl = thumbBlob.url;
    } catch (jimpError) {
      console.error('Error generating thumbnail:', jimpError);
    }

    await prisma.$executeRaw`
      UPDATE "Product" SET "imageUrl" = ${imageUrl}, "thumbUrl" = ${thumbUrl}, "updatedAt" = NOW()
      WHERE id = ${productId}
    `;

    revalidatePath('/');
    revalidatePath('/admin');
    
    return { success: true, imageUrl, thumbUrl };
  } catch (error: any) {
    console.error('Error uploading product image:', error);
    return { success: false, error: error.message || 'Falha ao realizar upload da imagem.' };
  }
}

export async function createManualProductAction(formData: FormData) {
  try {
    const code = formData.get('code') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string || null;
    const priceStr = formData.get('price') as string;
    const price = priceStr ? parseFloat(priceStr) : null;
    let categoryId = formData.get('categoryId') as string || null;
    if (categoryId === 'none' || categoryId === '') categoryId = null;
    const stockStr = formData.get('stock') as string;
    const stock = stockStr ? parseInt(stockStr) : 0;
    const isCustomizable = formData.get('isCustomizable') === 'true';
    const file = formData.get('file') as File | null;

    if (!code || !name) {
      return { success: false, error: 'Código e Nome são obrigatórios.' };
    }

    let imageUrl = null;
    let thumbUrl = null;

    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const isPng = file.name.toLowerCase().endsWith('.png') || file.type === 'image/png';
      const ext = isPng ? 'png' : 'jpg';
      const mimeType = isPng ? 'image/png' : 'image/jpeg';

      const sanitizedCode = code.replace(/\s/g, '_');
      const fileName = `${sanitizedCode}_${Date.now()}.${ext}`;

      const blob = await put(`catalog-images/${fileName}`, buffer, {
        access: 'public',
        contentType: mimeType,
      });
      imageUrl = blob.url;
      thumbUrl = blob.url;

      try {
        const image = await Jimp.read(buffer);
        await image.resize({ w: 300 });
        const thumbBuffer = await image.getBuffer(mimeType as any);
        const thumbBlob = await put(`catalog-thumbnails/${fileName}`, thumbBuffer, {
          access: 'public',
          contentType: mimeType,
        });
        thumbUrl = thumbBlob.url;
      } catch (jimpError) {
        console.error('Error generating thumbnail:', jimpError);
      }
    }

    const id = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "Product" (id, code, name, description, price, "categoryId", stock, "isCustomizable", "imageUrl", "thumbUrl", "updatedAt", "createdAt")
      VALUES (${id}, ${code}, ${name}, ${description}, ${price}, ${categoryId}, ${stock}, ${isCustomizable}, ${imageUrl}, ${thumbUrl}, NOW(), NOW())
    `;

    revalidatePath('/');
    revalidatePath('/admin');
    
    return { success: true };
  } catch (error: any) {
    console.error('Error creating manual product:', error);
    return { success: false, error: error.message || 'Falha ao cadastrar a peça.' };
  }
}

export async function deleteProductsAction(ids: string[]) {
  try {
    if (!ids || ids.length === 0) {
      return { success: false, error: 'Nenhum ID fornecido.' };
    }

    for (const id of ids) {
      await prisma.$executeRaw`DELETE FROM "Product" WHERE id = ${id}`;
    }

    revalidatePath('/');
    revalidatePath('/admin');
    
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting products:', error);
    return { success: false, error: 'Falha ao excluir os produtos selecionados.' };
  }
}

export async function updateProductAction(
  id: string,
  data: { name: string; code: string; price: string; description: string }
) {
  try {
    if (!id) return { success: false, error: 'ID inválido.' };
    if (!data.name || !data.code) return { success: false, error: 'Nome e Código são obrigatórios.' };

    const price = data.price ? parseFloat(data.price) : null;
    const description = data.description || null;

    await prisma.$executeRaw`
      UPDATE "Product"
      SET name = ${data.name},
          code = ${data.code},
          price = ${price},
          description = ${description},
          "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    revalidatePath('/');
    revalidatePath('/admin');

    return { success: true };
  } catch (error: any) {
    console.error('Error updating product:', error);
    return { success: false, error: error.message || 'Falha ao atualizar produto.' };
  }
}

