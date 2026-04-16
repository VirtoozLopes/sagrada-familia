'use client';

import { ImageIcon } from 'lucide-react';

interface Product {
  id: string;
  code: string;
  name: string;
  imageUrl?: string | null;
  thumbUrl?: string | null;
  isCustomizable?: boolean;
}

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const displayImage = product.thumbUrl || product.imageUrl;

  return (
    <div 
      onClick={() => onClick(product)}
      className="group relative bg-white aspect-square flex flex-col cursor-pointer overflow-hidden border border-stone-100 shadow-sm"
    >
      {product.isCustomizable && (
        <div className="absolute top-3 right-3 z-10 bg-primary text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-sm shadow-sm pb-0.5">
          Personalizável
        </div>
      )}
      {/* Image Area */}
      <div className="flex-grow flex items-center justify-center p-4 relative">
        {displayImage ? (
          <img
            src={displayImage}
            alt={product.name}
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 opacity-[0.15]">
            <ImageIcon size={32} strokeWidth={1} className="text-primary" />
            <span className="text-[8px] font-black tracking-widest uppercase text-primary">Imagem Indisponível</span>
          </div>
        )}
      </div>
      
      {/* Divine Info Bar (Internal Overlay) */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-sm border-t border-stone-100">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black text-primary/80 leading-none tracking-widest uppercase">
            Cód. {product.code}
          </span>
          <h3 className="text-[11px] font-bold text-stone-800 leading-tight truncate uppercase tracking-tight">
            {product.name}
          </h3>
        </div>
      </div>

      {/* Hover Gold Glow */}
      <div className="absolute inset-0 border-[3px] border-primary/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
    </div>
  );
}
