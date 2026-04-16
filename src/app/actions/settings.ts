'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getWhatsAppNumberAction() {
  try {
    const settings: any[] = await prisma.$queryRaw`SELECT value FROM "Setting" WHERE key = 'whatsappNumber' LIMIT 1`;
    if (settings && settings.length > 0) {
      return { success: true, whatsappNumber: settings[0].value };
    }
    return { success: true, whatsappNumber: '' };
  } catch (error) {
    console.error('Error fetching whatsapp number:', error);
    return { success: false, whatsappNumber: '' };
  }
}

export async function saveWhatsAppNumberAction(number: string) {
  try {
    const cleanNumber = number.replace(/\D/g, '');
    const id = crypto.randomUUID();
    
    await prisma.$executeRaw`DELETE FROM "Setting" WHERE key = 'whatsappNumber'`;
    await prisma.$executeRaw`INSERT INTO "Setting" (id, key, value) VALUES (${id}, 'whatsappNumber', ${cleanNumber})`;

    revalidatePath('/admin');
    return { success: true, whatsappNumber: cleanNumber };
  } catch (error: any) {
    console.error('Error saving whatsapp number:', error);
    return { success: false, error: 'Falha ao salvar configuração' };
  }
}
