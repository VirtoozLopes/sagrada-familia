'use client';

import { useState, useEffect } from 'react';
import { X, Plus, ImageIcon, Tag, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Product {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  price?: number | null;
  imageUrl?: string | null;
  thumbUrl?: string | null;
  isCustomizable?: boolean;
  customization?: string;
}

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (product: Product) => void;
}

export default function ProductModal({ product, isOpen, onClose, onAdd }: ProductModalProps) {
  const [customizationText, setCustomizationText] = useState('');

  useEffect(() => {
    if (isOpen) setCustomizationText('');
  }, [isOpen, product]);

  if (!product) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          {/* Divine Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-md"
          />

          {/* Modal Content - Divine Light Style */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-4xl bg-stone-50 border border-stone-200 rounded-[3.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh] accent-glow"
          >
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 z-10 p-2.5 bg-white hover:bg-stone-100 rounded-full transition-all text-stone-400 hover:text-stone-800 border border-stone-200 shadow-sm"
            >
              <X size={24} />
            </button>

            {/* Left: Image Section */}
            <div className="md:w-1/2 h-64 md:h-auto bg-white flex items-center justify-center relative border-b md:border-b-0 md:border-r border-stone-100 overflow-hidden">
              {product.imageUrl ? (
                <img 
                  src={product.imageUrl} 
                  alt={product.name}
                  className="w-full h-full object-contain p-10 md:p-14 hover:scale-110 transition-transform duration-1000" 
                />
              ) : (
                <div className="flex flex-col items-center gap-4 text-stone-200">
                  <ImageIcon size={100} strokeWidth={1} />
                  <span className="text-[10px] uppercase font-black tracking-[0.3em]">Ilustração Indisponível</span>
                </div>
              )}
              
              <div className="absolute bottom-8 left-8">
                <span className="bg-primary/5 px-5 py-2 rounded-full border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em]">
                  Item Ref. {product.code}
                </span>
              </div>
            </div>

            {/* Right: Info Section */}
            <div className="md:w-1/2 p-10 md:p-16 flex flex-col overflow-y-auto bg-white">
              <div className="mb-10">
                <div className="text-primary font-black text-[10px] uppercase tracking-[0.4em] mb-4">Arte & Devoção</div>
                <h2 className="text-3xl md:text-4xl font-black text-stone-800 leading-tight mb-6 tracking-tight uppercase">
                  {product.name}
                </h2>
                <div className="w-16 h-1 bg-primary rounded-full"></div>
              </div>

              <div className="space-y-8 flex-grow">
                <div className="space-y-3">
                  <h4 className="text-stone-400 text-[10px] font-black uppercase tracking-[0.2em]">Sobre esta peça</h4>
                  <p className="text-stone-700 leading-relaxed font-medium text-sm md:text-base">
                    {product.description || 'Uma peça selecionada com cuidado e devoção para momentos especiais.'}
                  </p>
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-8 md:gap-16 pt-6 border-t border-stone-100">
                  <div>
                    <h4 className="text-stone-400 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Valor Sugerido</h4>
                    <div className="text-4xl font-black text-stone-900 tracking-tight">
                      {product.price ? `R$ ${product.price.toFixed(2)}` : '--'}
                    </div>
                  </div>
                  {product.code && (
                    <div>
                      <h4 className="text-stone-400 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Identificação</h4>
                      <div className="text-xl font-bold text-stone-800 font-mono bg-stone-50 px-3 py-1 rounded-lg border border-stone-100">#{product.code}</div>
                    </div>
                  )}
                </div>

                {product.isCustomizable && (
                  <div className="pt-6 border-t border-stone-100">
                    <label className="block text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-3">
                      Personalização Obrigatória
                    </label>
                    <input 
                      required
                      type="text" 
                      placeholder="Ex: Nome do santo, frase, etc..."
                      value={customizationText}
                      onChange={(e) => setCustomizationText(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-5 text-stone-800 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-stone-400 font-bold"
                    />
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="mt-12">
                <button
                  disabled={!!(product.isCustomizable && !customizationText.trim())}
                  onClick={() => {
                    onAdd({ ...product, customization: product.isCustomizable ? customizationText.trim() : undefined });
                    onClose();
                  }}
                  className="w-full bg-primary hover:bg-stone-800 disabled:opacity-50 disabled:hover:bg-primary disabled:cursor-not-allowed text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-[0.98] shadow-xl shadow-primary/20 flex items-center justify-center gap-4 group border-b-4 border-black/10"
                >
                  <ShoppingCart size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                  Levar para o Carrinho
                </button>
                <p className="text-center text-stone-400 text-[9px] uppercase font-black tracking-[0.3em] mt-6">
                  Artigos Religiosos • Sagrada Família
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
