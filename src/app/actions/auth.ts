'use server';

import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import prisma from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'sacred-family-default-secret-key-2026';
const COOKIE_NAME = 'admin_session';

async function getSecretKey() {
  return new TextEncoder().encode(JWT_SECRET);
}

// Retorna o hash da senha armazenada, ou o hash padrão de "admin" se ainda não configurado
async function getAdminPasswordHash() {
  const setting = await prisma.setting.findUnique({
    where: { key: 'admin_password_hash' }
  });
  
  if (setting?.value) {
    return setting.value;
  }
  
  // Hash para a senha "admin"
  return await bcrypt.hash('admin', 10);
}

export async function loginAction(password: string) {
  try {
    const hash = await getAdminPasswordHash();
    const isValid = await bcrypt.compare(password, hash);
    
    if (!isValid) {
      return { success: false, error: 'Senha incorreta' };
    }
    
    // Gerar JWT válido por 7 dias
    const token = await new SignJWT({ role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(await getSecretKey());
      
    // Definir cookie
    cookies().set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 dias
    });
    
    return { success: true };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Erro no servidor' };
  }
}

export async function changePasswordAction(currentPassword: string, newPassword: string) {
  try {
    const hash = await getAdminPasswordHash();
    const isValid = await bcrypt.compare(currentPassword, hash);
    
    if (!isValid) {
      return { success: false, error: 'Senha atual incorreta' };
    }
    
    if (newPassword.length < 4) {
      return { success: false, error: 'A nova senha deve ter no mínimo 4 caracteres' };
    }
    
    const newHash = await bcrypt.hash(newPassword, 10);
    
    await prisma.setting.upsert({
      where: { key: 'admin_password_hash' },
      update: { value: newHash },
      create: { key: 'admin_password_hash', value: newHash }
    });
    
    return { success: true };
  } catch (error) {
    console.error('Change password error:', error);
    return { success: false, error: 'Erro no servidor' };
  }
}

export async function logoutAction() {
  cookies().delete(COOKIE_NAME);
  return { success: true };
}
