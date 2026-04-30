'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getWhatsAppNumbersAction() {
  try {
    const settings: any[] = await prisma.$queryRaw`SELECT value FROM "Setting" WHERE key = 'whatsappNumber' LIMIT 1`;
    if (settings && settings.length > 0) {
      const rawValue = settings[0].value;
      try {
        // Try to parse array
        const parsed = JSON.parse(rawValue);
        if (Array.isArray(parsed)) {
          return { success: true, whatsappNumbers: parsed };
        }
      } catch (e) {
        // Fallback for old single string data
        if (rawValue) {
          return {
            success: true,
            whatsappNumbers: [{ id: crypto.randomUUID(), name: 'Atendimento', number: rawValue }]
          };
        }
      }
    }
    return { success: true, whatsappNumbers: [] };
  } catch (error) {
    console.error('Error fetching whatsapp numbers:', error);
    return { success: false, whatsappNumbers: [] };
  }
}

export async function saveWhatsAppNumbersAction(contacts: { id: string, name: string, number: string }[]) {
  try {
    // Sanitize numbers
    const sanitized = contacts.map(c => ({
      ...c,
      number: c.number.replace(/\D/g, '')
    }));
    
    const id = crypto.randomUUID();
    const jsonValue = JSON.stringify(sanitized);
    
    await prisma.$executeRaw`DELETE FROM "Setting" WHERE key = 'whatsappNumber'`;
    await prisma.$executeRaw`INSERT INTO "Setting" (id, key, value) VALUES (${id}, 'whatsappNumber', ${jsonValue})`;

    revalidatePath('/admin');
    return { success: true, whatsappNumbers: sanitized };
  } catch (error: any) {
    console.error('Error saving whatsapp numbers:', error);
    return { success: false, error: 'Falha ao salvar configuração' };
  }
}
