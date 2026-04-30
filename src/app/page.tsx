'use client';

import { useState, useEffect } from 'react';
import SearchInput from '@/components/SearchInput';
import ProductCard from '@/components/ProductCard';
import ProductModal from '@/components/ProductModal';
import Cart from '@/components/Cart';
import { PackageSearch, Loader2, Menu, X, ChevronRight, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [products, setProducts] = useState([]);
  const [groupedProducts, setGroupedProducts] = useState<Record<string, any[]>>({});
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [isCartLoaded, setIsCartLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Load cart from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pecas_cart');
      if (saved) setCartItems(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load cart', e);
    }
    setIsCartLoaded(true);
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    if (isCartLoaded) {
      localStorage.setItem('pecas_cart', JSON.stringify(cartItems));
    }
  }, [cartItems, isCartLoaded]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (Array.isArray(data)) {
          setCategories(data);
          
          // Initial load from URL
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const catSlug = params.get('categoria');
            if (catSlug) {
              let foundId = 'all';
              for (const cat of data) {
                 if (cat.slug === catSlug) foundId = cat.id;
                 else if (cat.children) {
                    for (const child of cat.children) {
                       if (child.slug === catSlug) foundId = child.id;
                    }
                 }
              }
              setSelectedCategoryId(foundId);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  const handleCategorySelect = (id: string, slug?: string) => {
    setSelectedCategoryId(id);
    setIsSidebarOpen(false); // Close sidebar on selection
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (id === 'all' || !slug) {
        url.searchParams.delete('categoria');
      } else {
        url.searchParams.set('categoria', slug);
      }
      window.history.pushState({}, '', url.toString());
    }
  };

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        if (selectedCategoryId === 'all' && !query) {
          // Use the grouped endpoint to get 6 per category efficiently
          const res = await fetch('/api/products/grouped?limitPerCategory=6');
          const data: any[] = await res.json();
          // Build groupedProducts map: categoryId -> products[]
          const map: Record<string, any[]> = {};
          for (const p of data) {
            const key = p.categoryId || '__uncategorized__';
            if (!map[key]) map[key] = [];
            map[key].push(p);
          }
          setGroupedProducts(map);
          setProducts(data); // keep flat list for compat
        } else {
          const url = `/api/products?${new URLSearchParams({
            q: query,
            categoryId: selectedCategoryId
          }).toString()}`;
          const res = await fetch(url);
          const data = await res.json();
          setProducts(data);
          setGroupedProducts({});
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchProducts, 300);
    return () => clearTimeout(debounce);
  }, [query, selectedCategoryId]);

  const addToCart = (product: any, quantity: number = 1) => {
    setCartItems(prev => {
      const cartItemId = product.customization ? `${product.id}-${product.customization}` : product.id;
      const existing = prev.find((item: any) => (item.cartItemId || item.id) === cartItemId);
      
      let nextItems;
      if (existing) {
        nextItems = prev.map((item: any) => 
          (item.cartItemId || item.id) === cartItemId ? { ...item, quantity: item.quantity + quantity } : item
        );
      } else {
        nextItems = [...prev, { ...product, cartItemId, quantity }];
      }

      // Sort by code alphanumerically
      return nextItems.sort((a, b) => String(a.code || '').localeCompare(String(b.code || ''), 'pt-BR', { numeric: true }));
    });
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCartItems(prev => prev.map((item: any) => 
      (item.cartItemId || item.id) === cartItemId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    ));
  };

  const removeFromCart = (cartItemId: string) => {
    setCartItems(prev => prev.filter((item: any) => (item.cartItemId || item.id) !== cartItemId));
  };

  const [whatsappContacts, setWhatsappContacts] = useState<{id: string, name: string, number: string}[]>([]);

  // Fetch whatsapp settings
  useEffect(() => {
    import('@/app/actions/settings').then(({ getWhatsAppNumbersAction }) => {
      getWhatsAppNumbersAction().then(res => {
        if (res.whatsappNumbers) setWhatsappContacts(res.whatsappNumbers);
      }).catch(console.error);
    });
  }, []);

  const handleOrderSubmit = async (customer: any, useWhatsapp: boolean, targetWhatsappNumber?: string) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer, items: cartItems }),
      });
      
      if (res.ok) {
        await res.json();
        setCartItems([]);

        if (useWhatsapp && targetWhatsappNumber) {
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

          window.open(`https://wa.me/${targetWhatsappNumber}?text=${message}`, '_blank');
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
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[100]"
            />
            {/* Sidebar */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-[85%] max-w-[320px] bg-white z-[101] shadow-2xl overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-black text-stone-800 uppercase tracking-tighter">Categorias</h2>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-stone-100 rounded-xl text-stone-500 hover:text-stone-800 transition-all">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => handleCategorySelect('all')}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${selectedCategoryId === 'all' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-stone-50 text-stone-500 hover:bg-stone-100'}`}
                  >
                    <LayoutGrid size={18} />
                    Ver Tudo
                  </button>

                  {categories.map((cat: any) => {
                    const isParentSelected = selectedCategoryId === cat.id || cat.children?.some((c:any) => c.id === selectedCategoryId);
                    return (
                      <div key={cat.id} className="space-y-1">
                        <button
                          onClick={() => handleCategorySelect(cat.id, cat.slug)}
                          className={`w-full flex items-center justify-between p-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${isParentSelected ? 'bg-stone-800 text-white shadow-md' : 'bg-stone-50 text-stone-500 hover:bg-stone-100'}`}
                        >
                          <span className="truncate">{cat.name}</span>
                          <ChevronRight size={16} className={`transition-transform ${isParentSelected ? 'rotate-90' : ''}`} />
                        </button>
                        
                        {isParentSelected && cat.children && cat.children.length > 0 && (
                          <div className="pl-4 space-y-1 py-1">
                            {cat.children.map((child: any) => (
                              <button
                                key={child.id}
                                onClick={() => handleCategorySelect(child.id, child.slug)}
                                className={`w-full flex items-center p-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${selectedCategoryId === child.id ? 'bg-primary/10 text-primary border border-primary/20' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'}`}
                              >
                                {child.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
            
            <div className="w-full max-w-xl flex items-center gap-2">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-3.5 bg-white border border-stone-200 rounded-2xl text-stone-600 hover:text-primary hover:border-primary/30 transition-all shadow-sm flex items-center gap-2 group"
              >
                <Menu size={20} className="group-hover:scale-110 transition-transform" />
                <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">Menu</span>
              </button>
              <div className="flex-1">
                <SearchInput value={query} onSearch={setQuery} />
              </div>
            </div>




          </motion.div>
        </header>

        {/* Catalog Content Section */}
        <section className="relative">
          {(selectedCategoryId !== 'all' || query) && (
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black uppercase tracking-widest text-stone-800 flex items-center gap-3">
                <div className="w-8 h-[2px] bg-primary"></div>
                {selectedCategoryId === 'all' ? 'Catálogo Geral' : (() => {
                  for (const cat of categories as any[]) {
                    if (cat.id === selectedCategoryId) return cat.name;
                    if (cat.children) {
                      const child = cat.children.find((c: any) => c.id === selectedCategoryId);
                      if (child) return child.name;
                    }
                  }
                  return 'Catálogo';
                })()}
              </h2>
              {query && (
                <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 px-4 py-2 rounded-full border border-primary/20 shadow-sm animate-in fade-in slide-in-from-right-4">
                  Filtrando: {query}
                </span>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 size={40} className="animate-spin text-blue-500" />
              <p className="text-slate-500 font-bold">CARREGANDO PEÇAS...</p>
            </div>
          ) : selectedCategoryId === 'all' && !query ? (() => {
            // "TUDO" view: use groupedProducts from dedicated endpoint
            const CATEGORY_ORDER = [
              'porta chaves religiosos',
              'cruzes e capelas',
              'linha infantil e berço',
              'adornos e proteção',
              'mandalas e trios',
              'decoração e utilidades'
            ];

            const getPriority = (name: string) => {
              const idx = CATEGORY_ORDER.indexOf(name.toLowerCase().trim());
              return idx === -1 ? Infinity : idx;
            };

            const sections = (categories as any[])
              .map((cat: any) => {
                let prods = groupedProducts[cat.id] || [];
                if (cat.children) {
                  cat.children.forEach((child: any) => {
                    if (groupedProducts[child.id]) {
                      prods = [...prods, ...groupedProducts[child.id]];
                    }
                  });
                }
                return { ...cat, products: prods };
              })
              .filter((cat: any) => cat.products.length > 0)
              .sort((a: any, b: any) => {
                const pa = getPriority(a.name);
                const pb = getPriority(b.name);
                if (pa !== pb) return pa - pb;
                return a.name.localeCompare(b.name, 'pt-BR');
              });

            const uncategorizedProducts = groupedProducts['__uncategorized__'] || [];

            if (sections.length === 0 && uncategorizedProducts.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-40 glass rounded-[3rem] border border-dashed border-white/10 text-slate-500">
                  <PackageSearch size={80} strokeWidth={1} className="mb-6 opacity-20" />
                  <p className="text-2xl font-bold bg-gradient-to-br from-slate-400 to-slate-600 bg-clip-text text-transparent italic">Nenhuma peça encontrada...</p>
                </div>
              );
            }

            return (
              <div className="space-y-14">
                {sections.map((category: any) => {
                  const catProducts = category.products;
                  return (
                    <div key={category.id}>
                      {/* Category heading */}
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-base font-black uppercase tracking-widest text-stone-800 flex items-center gap-3">
                          <div className="w-6 h-[2px] bg-primary"></div>
                          {category.name}
                        </h3>
                        <button
                          onClick={() => handleCategorySelect(category.id, category.slug)}
                          className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-stone-700 transition-colors flex items-center gap-1"
                        >
                          Ver todos →
                        </button>
                      </div>
                      <div className="technical-grid">
                        {catProducts.map((product: any) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            onClick={openProductDetails}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {uncategorizedProducts.length > 0 && (
                  <div>
                    <h3 className="text-base font-black uppercase tracking-widest text-stone-800 flex items-center gap-3 mb-6">
                      <div className="w-6 h-[2px] bg-primary"></div>
                      Sem Categoria
                    </h3>
                    <div className="technical-grid">
                      {uncategorizedProducts.map((product: any) => (
                        <ProductCard key={product.id} product={product} onClick={openProductDetails} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()
          : products.length > 0 ? (
            // Specific category or search: flat grid
            <div className="technical-grid">
              {(products as any[])
                .filter(p => p.code !== 'Código' && p.name !== 'Produto')
                .map((product: any) => (
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
          onClear={() => setCartItems([])}
          onSubmit={handleOrderSubmit}
          whatsappContacts={whatsappContacts}
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
