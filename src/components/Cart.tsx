'use client';

import { Trash2, ShoppingCart, X, Minus, Plus, FileText, Send } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CartItem {
  id: string;
  code: string;
  name: string;
  price?: number;
  quantity: number;
  customization?: string;
}

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onSubmit: (customer: any, useWhatsapp: boolean) => void;
}

export default function Cart({ items, onUpdateQuantity, onRemove, onSubmit }: CartProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'review' | 'checkout'>('review');
  const [submitType, setSubmitType] = useState<'whatsapp' | 'email'>('whatsapp');
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' });

  const total = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(customer, submitType === 'whatsapp');
    setStep('review');
    setIsOpen(false);
  };

  return (
    <>
      {/* Divine Floating Cart Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 bg-primary hover:bg-stone-800 text-white p-4 rounded-full shadow-2xl z-40 flex items-center gap-2 group transition-all active:scale-95 border-2 border-white/20"
      >
        <ShoppingCart size={24} />
        {items.length > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full absolute -top-1 -right-1 border-2 border-white">
            {items.reduce((sum, i) => sum + i.quantity, 0)}
          </span>
        )}
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 font-black uppercase text-[10px] tracking-widest">
          Meu Carrinho
        </span>
      </button>

      {/* Divine Cart Drawer Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 px-4"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-stone-50 border-l border-stone-200 shadow-2xl z-50 flex flex-col pt-0"
            >
              <div className="p-8 border-b border-stone-200 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <ShoppingCart size={20} />
                  </div>
                  <h2 className="text-xl font-black text-stone-800 tracking-tight uppercase">Seu Carrinho</h2>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-stone-400 hover:text-stone-800 transition-colors p-2 hover:bg-stone-100 rounded-full"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-8 space-y-6">
                {items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-stone-400 text-center gap-6">
                    <div className="w-24 h-24 bg-stone-100 rounded-full flex items-center justify-center">
                      <ShoppingCart size={40} strokeWidth={1} />
                    </div>
                    <p className="font-medium text-stone-500">Seu carrinho está vazio.<br />Adicione itens para começar.</p>
                  </div>
                ) : step === 'review' ? (
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={item.id} className="bg-white rounded-[2rem] p-5 border border-stone-100 shadow-sm flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{item.code}</div>
                            <div className="text-stone-800 font-bold uppercase text-sm leading-tight">{item.name}</div>
                            {item.customization && (
                              <div className="text-xs text-stone-500 font-medium mt-1">
                                📌 Personalização: <span className="font-bold text-stone-700">{item.customization}</span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => onRemove(item.id)}
                            className="text-stone-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center bg-stone-50 rounded-2xl p-1 border border-stone-100">
                            <button
                              onClick={() => onUpdateQuantity(item.id, -1)}
                              className="p-1.5 text-stone-400 hover:text-primary disabled:opacity-30"
                              disabled={item.quantity <= 1}
                            >
                              <Minus size={16} />
                            </button>
                            <span className="px-5 text-stone-800 font-black text-sm min-w-[40px] text-center">{item.quantity}</span>
                            <button
                              onClick={() => onUpdateQuantity(item.id, 1)}
                              className="p-1.5 text-stone-400 hover:text-primary"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          <div className="text-primary font-black text-lg">
                            {item.price ? `R$ ${(item.price * item.quantity).toFixed(2)}` : '--'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <form id="checkout-form" onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-stone-900 uppercase tracking-widest ml-1">Nome Completo</label>
                      <input
                        required
                        type="text"
                        className="w-full bg-white border border-stone-200 rounded-2xl py-4 px-5 text-stone-800 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-stone-400"
                        value={customer.name}
                        onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                        placeholder="Digite seu nome completo"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-stone-900 uppercase tracking-widest ml-1">WhatsApp (Celular)</label>
                      <input
                        required
                        type="tel"
                        className="w-full bg-white border border-stone-200 rounded-2xl py-4 px-5 text-stone-800 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-stone-400"
                        value={customer.phone}
                        onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </form>
                )}
              </div>

              {items.length > 0 && (
                <div className="p-8 border-t border-stone-200 bg-white space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400 font-bold uppercase text-[10px] tracking-[0.2em]">Total</span>
                    <span className="text-3xl font-black text-stone-800 whitespace-nowrap">R$ {total.toFixed(2)}</span>
                  </div>
                  
                  {step === 'review' ? (
                    <button
                      onClick={() => setStep('checkout')}
                      className="w-full bg-primary hover:bg-stone-800 text-white font-black uppercase text-xs tracking-[0.2em] py-5 rounded-[2rem] shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-all active:scale-95 border-b-4 border-black/10"
                    >
                      <FileText size={18} />
                      Próximo Passo
                    </button>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <button
                        form="checkout-form"
                        type="submit"
                        onClick={() => setSubmitType('whatsapp')}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-black uppercase text-xs tracking-[0.2em] py-5 rounded-[2rem] shadow-xl shadow-green-600/20 flex items-center justify-center gap-3 transition-all active:scale-95"
                      >
                        <Send size={18} />
                        Enviar no WhatsApp
                      </button>
                      <button
                        form="checkout-form"
                        type="submit"
                        onClick={() => setSubmitType('email')}
                        className="w-full bg-stone-100 hover:bg-stone-200 text-stone-500 font-bold py-4 rounded-3xl transition-all text-xs uppercase tracking-widest"
                      >
                        Apenas por E-mail
                      </button>
                      <button
                        onClick={() => setStep('review')}
                        className="w-full text-stone-400 hover:text-stone-600 font-bold mt-2 transition-all py-2 text-xs uppercase tracking-widest"
                      >
                        Voltar para revisão
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
