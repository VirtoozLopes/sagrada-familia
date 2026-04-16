'use client';

import { useState, useEffect } from 'react';
import SearchInput from '@/components/SearchInput';
import ProductCard from '@/components/ProductCard';
import ProductModal from '@/components/ProductModal';
import Cart from '@/components/Cart';
import { PackageSearch, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [products, setProducts] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (Array.isArray(data)) setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const url = `/api/products?${new URLSearchParams({
          q: query,
          categoryId: selectedCategoryId
        }).toString()}`;
        const res = await fetch(url);
        const data = await res.json();
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchProducts, 300);
    return () => clearTimeout(debounce);
  }, [query, selectedCategoryId]);

  const addToCart = (product: any) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCartItems(prev => prev.map(item => 
      item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    ));
  };

  const removeFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const handleOrderSubmit = async (customer: any, useWhatsapp: boolean) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer, items: cartItems }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setCartItems([]);

        if (useWhatsapp && data.whatsapp) {
          // Build WhatsApp message
          const itemLines = (cartItems as any[]).map((item: any) => {
            const customText = item.customization ? ` (${item.customization})` : '';
            return `• ${item.quantity}x ${item.name}${customText} — R$ ${((item.price || 0) * item.quantity).toFixed(2)}`;
          }).join('\n');

          const total = (cartItems as any[]).reduce((sum: number, item: any) => sum + (item.price || 0) * item.quantity, 0);

          const message = encodeURIComponent(
            `Olá! Gostaria de fazer um pedido 🙏\n\n` +
            `*Nome:* ${customer.name}\n` +
            `*Telefone:* ${customer.phone || 'não informado'}\n\n` +
            `*Itens do Pedido:*\n${itemLines}\n\n` +
            `*Total: R$ ${total.toFixed(2)}*`
          );

          window.open(`https://wa.me/${data.whatsapp}?text=${message}`, '_blank');
        } else {
          alert('Pedido enviado com sucesso! Você receberá uma confirmação no e-mail.');
        }
      } else {
        alert('Erro ao enviar pedido. Tente novamente.');
      }
    } catch (error) {
      alert('Tivemos um problema na conexão.');
    }
  };

  const openProductDetails = (product: any) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  return (
    <main className="min-h-screen bg-transparent pb-20 pt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Divine Header Section */}
        <header className="relative pt-10 pb-8 flex flex-col items-center text-center">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-8 w-full"
          >
            <div className="flex flex-col items-center gap-3">
              <span className="text-primary text-xs font-black uppercase tracking-[0.4em] mb-2">Artigos Religiosos</span>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight bg-gradient-to-br from-primary via-primary/80 to-stone-500 bg-clip-text text-transparent uppercase">
                SAGRADA FAMÍLIA
              </h1>
            </div>
            
            <div className="w-full max-w-xl">
              <SearchInput value={query} onSearch={setQuery} />
            </div>

            {/* Category Filter Pills - Divine Style */}
            <div className="w-full flex flex-wrap items-center justify-center gap-3 px-4">
              <button
                onClick={() => setSelectedCategoryId('all')}
                className={`px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border shadow-sm ${selectedCategoryId === 'all' ? 'bg-primary border-primary text-white shadow-primary/20' : 'bg-white/80 border-stone-200 text-stone-500 hover:text-primary hover:border-primary/30 hover:bg-white'}`}
              >
                Tudo
              </button>
              {[...categories].sort((a: any, b: any) => a.name.localeCompare(b.name, 'pt-BR')).map((cat: any) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border shadow-sm ${selectedCategoryId === cat.id ? 'bg-primary border-primary text-white shadow-primary/20' : 'bg-white/80 border-stone-200 text-stone-500 hover:text-primary hover:border-primary/30 hover:bg-white'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>


          </motion.div>
        </header>

        {/* Catalog Content Section */}
        <section className="relative">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black uppercase tracking-widest text-stone-800 flex items-center gap-3">
              <div className="w-8 h-[2px] bg-primary"></div>
              {selectedCategoryId === 'all' ? 'Catálogo Geral' : categories.find((c: any) => c.id === selectedCategoryId)?.name || 'Catálogo'}
            </h2>
            {query && (
              <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 px-4 py-2 rounded-full border border-primary/20 shadow-sm animate-in fade-in slide-in-from-right-4">
                Filtrando: {query}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 size={40} className="animate-spin text-blue-500" />
              <p className="text-slate-500 font-bold">CARREGANDO PEÇAS...</p>
            </div>
          ) : products.length > 0 ? (
            <div className="technical-grid">
              {products
                .filter(p => p.code !== 'Código' && p.name !== 'Produto')
                .map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onClick={openProductDetails} 
                  />
                ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-40 glass rounded-[3rem] border border-dashed border-white/10 text-slate-500">
              <PackageSearch size={80} strokeWidth={1} className="mb-6 opacity-20" />
              <p className="text-2xl font-bold bg-gradient-to-br from-slate-400 to-slate-600 bg-clip-text text-transparent italic">
                Nenhuma peça encontrada...
              </p>
              <button 
                onClick={() => setQuery('')}
                className="mt-6 text-blue-500 font-black uppercase text-xs tracking-widest hover:text-blue-400 transition-colors"
              >
                Limpar filtros de busca
              </button>
            </div>
          )}
        </section>

        {/* Cart Drawer Overlay */}
        <Cart 
          items={cartItems} 
          onUpdateQuantity={updateQuantity} 
          onRemove={removeFromCart}
          onSubmit={handleOrderSubmit}
        />

        <ProductModal 
          product={selectedProduct}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAdd={addToCart}
        />
      </div>
    </main>
  );
}
