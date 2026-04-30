'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/app/actions/auth';
import { Loader2, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await loginAction(password);
      if (res.success) {
        router.push('/admin');
        router.refresh(); // Force reload to apply auth state
      } else {
        setError(res.error || 'Erro ao fazer login');
        setLoading(false);
      }
    } catch (err) {
      setError('Tivemos um problema de conexão. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl border border-stone-200 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="text-primary" size={32} />
          </div>
          
          <h1 className="text-2xl font-black text-stone-800 uppercase tracking-tight mb-2">
            Acesso Restrito
          </h1>
          <p className="text-stone-400 text-sm font-bold uppercase tracking-widest mb-8">
            Painel Administrativo
          </p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha de acesso"
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-5 text-center text-stone-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold tracking-widest placeholder:tracking-normal placeholder:font-medium placeholder:text-stone-400"
              />
            </div>

            {error && (
              <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-stone-800 hover:bg-stone-900 disabled:opacity-50 disabled:hover:bg-stone-800 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Acessando...
                </>
              ) : (
                'Entrar no Painel'
              )}
            </button>
          </form>

          <p className="mt-8 text-[10px] text-stone-400 font-bold uppercase tracking-[0.2em]">
            Sagrada Família • Gestão
          </p>
        </div>
      </motion.div>
    </main>
  );
}
