'use client';

import { useState, useEffect } from 'react';
import { Upload, FileSpreadsheet, FileText, Settings, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon, Search, LayoutDashboard, Database, FolderHeart, Sparkles, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { processPdfAction, scanLocalCatalogAction } from '@/app/actions/pdf';
import { getAllProductsAction, uploadProductImageAction, createManualProductAction, deleteProductsAction } from '@/app/actions/product';
import { getWhatsAppNumberAction, saveWhatsAppNumberAction } from '@/app/actions/settings';

interface Product {
  id: string;
  code: string;
  name: string;
  imageUrl: string | null;
  categoryId: string | null;
}

interface Category {
  id: string;
  name: string;
}

export default function AdminPage() {
  const [excelStatus, setExcelStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'import' | 'catalog' | 'categories'>('dashboard');

  // Categories State
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Product Management State
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [uploadingProductId, setUploadingProductId] = useState<string | null>(null);
  const [deletingCategoryIds, setDeletingCategoryIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [confirmProductDeleteIds, setConfirmProductDeleteIds] = useState<string[] | null>(null);

  // Manual Product State
  const [manualName, setManualName] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [manualCategoryId, setManualCategoryId] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualStock, setManualStock] = useState('0');
  const [isCustomizable, setIsCustomizable] = useState(false);
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [isCreatingManualProduct, setIsCreatingManualProduct] = useState(false);

  // WhatsApp Settings State
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappInput, setWhatsappInput] = useState('');
  const [isSavingWhatsapp, setIsSavingWhatsapp] = useState(false);
  const [whatsappSaved, setWhatsappSaved] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchProducts();
    fetchCategories();
    // Load WhatsApp number
    getWhatsAppNumberAction().then(res => {
      if (res.whatsappNumber) {
        setWhatsappNumber(res.whatsappNumber);
        setWhatsappInput(res.whatsappNumber);
      }
    });
  }, []);

  const fetchCategories = async () => {
    try {
      // Use timestamp to prevent aggressive browser/BFF caching
      const res = await fetch(`/api/categories?t=${Date.now()}`);
      const data = await res.json();
      if (Array.isArray(data)) setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsCreatingCategory(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName })
      });
      if (res.ok) {
        setNewCategoryName('');
        fetchCategories();
      }
    } catch (error) {
      alert('Erro ao criar categoria');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    console.log('Attempting to delete category:', id);
    if (!id) return;

    // Two-step confirmation logic
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      // Auto-reset after 3 seconds if not clicked again
      setTimeout(() => setConfirmDeleteId(prev => prev === id ? null : prev), 3000);
      return;
    }

    setDeletingCategoryIds(prev => new Set(prev).add(id));
    setConfirmDeleteId(null);

    try {
      console.log('Fetching DELETE /api/categories for id:', id);
      const res = await fetch(`/api/categories?id=${id}&t=${Date.now()}`, { 
        method: 'DELETE',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (res.ok) {
        console.log('Deletion successful on server');
        fetchCategories();
      } else {
        const data = await res.json();
        console.error('Server error deleting category:', data.error);
        alert(`Erro: ${data.error || 'Falha ao excluir'}`);
      }
    } catch (error) {
      console.error('Network error during deletion:', error);
      alert('Erro na conexão ao excluir. Verifique se o servidor está rodando.');
    } finally {
      setDeletingCategoryIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleUpdateProductCategory = async (productId: string, categoryId: string) => {
    try {
      // Use raw SQL API or action
      const res = await fetch('/api/products/update-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, categoryId })
      });
      if (res.ok) {
        setProducts(prev => prev.map(p => 
          p.id === productId ? { ...p, categoryId: categoryId === 'none' ? null : categoryId } : p
        ));
      }
    } catch (error) {
      alert('Erro ao atualizar categoria');
    }
  };

  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    const result = await getAllProductsAction();
    if (result.success && result.products) {
      setProducts(result.products as any[]);
    }
    setIsLoadingProducts(false);
  };

  const handleToggleProductSelect = (id: string) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllProducts = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedProductIds(new Set(filteredProducts.map(p => p.id)));
    } else {
      setSelectedProductIds(new Set());
    }
  };

  const executeDeletion = async () => {
    if (!confirmProductDeleteIds) return;
    setIsDeletingSelected(true);
    try {
      const result = await deleteProductsAction(confirmProductDeleteIds);
      if (result.success) {
        alert('Produtos excluídos com sucesso');
        setSelectedProductIds(prev => {
          const next = new Set(prev);
          confirmProductDeleteIds.forEach(id => next.delete(id));
          return next;
        });
        fetchProducts();
      } else {
        alert(result.error || 'Erro ao excluir produtos');
      }
    } catch (err) {
      alert('Tivemos um problema na conexão.');
    } finally {
      setIsDeletingSelected(false);
      setConfirmProductDeleteIds(null);
    }
  };

  const handleDeleteProducts = (ids: string[]) => {
    setConfirmProductDeleteIds(ids);
  };

  const handleCreateManualProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName || !manualCode) return;
    setIsCreatingManualProduct(true);
    try {
      const formData = new FormData();
      formData.append('name', manualName);
      formData.append('code', manualCode);
      formData.append('price', manualPrice);
      formData.append('description', manualDescription);
      formData.append('stock', manualStock);
      formData.append('categoryId', manualCategoryId);
      formData.append('isCustomizable', String(isCustomizable));
      if (manualFile) formData.append('file', manualFile);

      const result = await createManualProductAction(formData);
      if (result.success) {
        alert('Produto cadastrado com sucesso!');
        setManualName(''); setManualCode(''); setManualPrice('');
        setManualDescription(''); setManualStock('0'); setManualCategoryId('');
        setIsCustomizable(false); setManualFile(null);
        fetchProducts();
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert('Erro ao criar produto manualmente.');
    } finally {
      setIsCreatingManualProduct(false);
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelStatus('uploading');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/products/upload-excel', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (res.ok) {
        setExcelStatus('success');
        setMessage(`${data.count} produtos importados/atualizados com sucesso!`);
      } else {
        setExcelStatus('error');
        setMessage(data.error);
      }
    } catch (error) {
      setExcelStatus('error');
      setMessage('Erro na conexão com o servidor.');
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfStatus('uploading');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await processPdfAction(formData);
      
      if (result.success) {
        setPdfStatus('success');
        setMessage(`${result.totalFound} códigos encontrados, ${result.updatedInDb} produtos vinculados!`);
      } else {
        setPdfStatus('error');
        setMessage(result.error || 'Erro desconhecido');
      }
    } catch (error) {
      setPdfStatus('error');
      setMessage('Erro na conexão com o servidor.');
    }
  };

  const handleLocalScan = async () => {
    setPdfStatus('uploading');
    try {
      const result = await scanLocalCatalogAction();
      if (result.success) {
        setPdfStatus('success');
        setMessage(`${result.totalFound} códigos encontrados, ${result.updatedInDb} produtos vinculados!`);
        fetchProducts(); // Refresh list to show new images
      } else {
        setPdfStatus('error');
        setMessage(result.error || 'Erro no escaneamento');
      }
    } catch (error) {
      setPdfStatus('error');
      setMessage('Erro na conexão.');
    }
  };

  const handleManualImageUpload = async (productId: string, code: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingProductId(productId);
    const formData = new FormData();
    formData.append('productId', productId);
    formData.append('code', code);
    formData.append('file', file);

    try {
      const result = await uploadProductImageAction(formData);
      if (result.success) {
        // Update local state
        setProducts(prev => prev.map(p => 
          p.id === productId ? { ...p, imageUrl: result.imageUrl || null } : p
        ));
      } else {
        alert(result.error || 'Erro ao subir imagem.');
      }
    } catch (error) {
      alert('Erro na conexão.');
    } finally {
      setUploadingProductId(null);
    }
  };

  const filteredProducts = products.filter(p => 
    p.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-transparent p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black text-gradient tracking-tight">GESTÃO SAGRADA FAMÍLIA</h1>
            <p className="text-stone-500 mt-1">Gerencie seu inventário de artigos religiosos com facilidade.</p>
          </div>
          
          <nav className="flex p-1.5 bg-white/80 backdrop-blur-xl border border-stone-200 rounded-2xl shadow-sm">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-stone-400 hover:text-primary'}`}
            >
              <LayoutDashboard size={16} />
              Geral
            </button>
            <button 
              onClick={() => setActiveTab('import')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'import' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-stone-400 hover:text-primary'}`}
            >
              <Database size={16} />
              Entrada
            </button>
            <button 
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'catalog' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-stone-400 hover:text-primary'}`}
            >
              <FolderHeart size={16} />
              Vitrine
            </button>
            <button 
              onClick={() => setActiveTab('categories')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'categories' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-stone-400 hover:text-primary'}`}
            >
              <Settings size={16} />
              Grupos
            </button>
          </nav>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass p-6 rounded-3xl border border-stone-100 bg-gradient-to-br from-primary/5 to-transparent">
                  <h3 className="text-stone-400 text-sm font-bold uppercase tracking-wider mb-2">Total de Itens</h3>
                  <div className="text-4xl font-black text-primary">{products.length}</div>
                </div>
                <div className="glass p-6 rounded-3xl border border-stone-100 bg-gradient-to-br from-green-500/5 to-transparent">
                  <h3 className="text-stone-400 text-sm font-bold uppercase tracking-wider mb-2">Com Foto</h3>
                  <div className="text-4xl font-black text-green-600 font-mono">{products.filter(p => p.imageUrl).length}</div>
                </div>
                <div className="glass p-6 rounded-3xl border border-stone-100 bg-gradient-to-br from-red-500/5 to-transparent">
                  <h3 className="text-stone-400 text-sm font-bold uppercase tracking-wider mb-2">Sem Foto</h3>
                  <div className="text-4xl font-black text-red-500 font-mono">{products.filter(p => !p.imageUrl).length}</div>
                </div>
                         <div className="glass p-8 rounded-3xl border border-stone-200 bg-white">
                <h2 className="text-xl font-black mb-8 flex items-center gap-3 text-stone-800 uppercase tracking-tight">
                  <Settings size={20} className="text-primary" />
                  Configurações de E-mail
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-3 ml-1">Gmail do Admin (Envio)</label>
                    <input 
                      type="email" 
                      placeholder="configurado no arquivo .env"
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-5 text-stone-400 outline-none cursor-not-allowed font-medium"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-3 ml-1">E-mail de Recebimento</label>
                    <input 
                      type="email" 
                      placeholder="configurado no arquivo .env"
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 px-5 text-stone-400 outline-none cursor-not-allowed font-medium"
                      disabled
                    />
                  </div>
                </div>
                <div className="mt-6 flex items-start gap-3 bg-stone-50 p-4 rounded-2xl border border-stone-100">
                  <div className="p-1 bg-primary/10 rounded-full text-primary">
                    <Sparkles size={14} />
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Dica: Para o Gmail funcionar, você deve gerar uma <strong className="text-stone-700">"Senha de App"</strong> nas configurações da sua conta Google.
                  </p>
                </div>
            </div>

            {/* WhatsApp Settings */}
            <div className="glass p-8 rounded-3xl border border-stone-200 bg-white">
              <h2 className="text-xl font-black mb-2 flex items-center gap-3 text-stone-800 uppercase tracking-tight">
                <span className="text-2xl">📱</span>
                WhatsApp para Recebimento de Pedidos
              </h2>
              <p className="text-stone-400 text-xs mb-8 uppercase tracking-widest font-bold">Configure o número que receberá os pedidos via WhatsApp</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-3 ml-1">Número (com DDI e DDD, ex: 5511999999999)</label>
                  <input
                    type="tel"
                    value={whatsappInput}
                    onChange={e => setWhatsappInput(e.target.value)}
                    placeholder="5511999999999"
                    className="w-full bg-white border border-stone-200 rounded-2xl py-4 px-5 text-stone-800 outline-none focus:border-green-400 focus:ring-4 focus:ring-green-400/10 transition-all font-medium placeholder:text-stone-300"
                  />
                </div>
                <button
                  onClick={async () => {
                    setIsSavingWhatsapp(true);
                    setWhatsappSaved(false);
                    const result = await saveWhatsAppNumberAction(whatsappInput);
                    if (result.success) {
                      setWhatsappNumber(result.whatsappNumber || '');
                      setWhatsappSaved(true);
                      setTimeout(() => setWhatsappSaved(false), 3000);
                    } else {
                      alert('Erro ao salvar: ' + result.error);
                    }
                    setIsSavingWhatsapp(false);
                  }}
                  disabled={isSavingWhatsapp}
                  className="self-end bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-black uppercase text-xs tracking-widest px-8 py-4 rounded-2xl shadow-lg shadow-green-600/20 flex items-center gap-2 transition-all whitespace-nowrap"
                >
                  {isSavingWhatsapp ? <Loader2 size={16} className="animate-spin" /> : whatsappSaved ? <CheckCircle2 size={16} /> : '💾'}
                  {whatsappSaved ? 'Salvo!' : 'Salvar'}
                </button>
              </div>
              {whatsappNumber && (
                <div className="mt-4 text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 font-bold flex items-center gap-2">
                  <CheckCircle2 size={14} /> Número ativo: +{whatsappNumber}
                </div>
              )}
              {!whatsappNumber && (
                <div className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 font-bold flex items-center gap-2">
                  ⚠️ Sem número configurado — clientes só poderão usar a opção de E-mail.
                </div>
              )}
            </div>
         </div>
            </motion.div>
          )}

          {activeTab === 'import' && (
            <motion.div
              key="import"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              {/* Excel Upload Card */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="glass p-8 rounded-3xl border border-white/5 flex flex-col gap-6"
              >
                <div className="bg-green-500/10 p-4 rounded-2xl w-fit">
                  <FileSpreadsheet size={32} className="text-green-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold mb-2">Importar Planilha</h2>
                  <p className="text-slate-400 text-sm leading-relaxed">Suba seu arquivo Excel (.xlsx). O sistema irá ler os códigos e nomes das peças para atualizar seu estoque.</p>
                </div>
                
                <div className="mt-auto">
                  <label className="cursor-pointer group">
                    <input 
                      type="file" 
                      accept=".xlsx" 
                      className="hidden" 
                      onChange={handleExcelUpload}
                      disabled={excelStatus === 'uploading'}
                    />
                    <div className="bg-slate-900/50 border-2 border-dashed border-white/10 group-hover:border-green-500/50 py-10 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all">
                      {excelStatus === 'uploading' ? (
                        <Loader2 size={32} className="animate-spin text-blue-500" />
                      ) : (
                        <Upload size={32} className="text-slate-500 group-hover:text-green-500" />
                      )}
                      <span className="text-sm font-medium text-slate-400">Clique para selecionar .xlsx</span>
                    </div>
                  </label>
                </div>

                {excelStatus === 'success' && (
                  <div className="bg-green-500/10 text-green-500 p-4 rounded-xl flex items-center gap-3 text-sm">
                    <CheckCircle2 size={18} />
                    {message}
                  </div>
                )}
                {excelStatus === 'error' && (
                  <div className="bg-red-500/10 text-red-500 p-4 rounded-xl flex items-center gap-3 text-sm">
                    <AlertCircle size={18} />
                    {message}
                  </div>
                )}
              </motion.div>

              {/* PDF Catalog Card */}
              <motion.div 
                whileHover={{ y: -5 }}
                className={`glass p-8 rounded-3xl border border-white/5 flex flex-col gap-6 ${pdfStatus === 'uploading' ? 'opacity-70' : ''}`}
              >
                <div className="bg-blue-500/10 p-4 rounded-2xl w-fit">
                  <FileText size={32} className="text-blue-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold mb-2">Catálogo PDF</h2>
                  <p className="text-slate-400 text-sm leading-relaxed">Processe o catálogo visual para extrair as imagens das peças automaticamente usando IA.</p>
                </div>
                
                <div className="mt-auto flex flex-col gap-4">
                  <label className="cursor-pointer group flex-grow">
                    <input 
                      type="file" 
                      accept=".pdf" 
                      className="hidden" 
                      onChange={handlePdfUpload}
                      disabled={pdfStatus === 'uploading'}
                    />
                    <div className="bg-slate-900/50 border-2 border-dashed border-white/10 group-hover:border-blue-500/50 py-10 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all">
                      {pdfStatus === 'uploading' ? (
                        <Loader2 size={32} className="animate-spin text-blue-500" />
                      ) : (
                        <Upload size={32} className="text-slate-500 group-hover:text-blue-500" />
                      )}
                      <span className="text-sm font-medium text-slate-400">Selecionar arquivo .pdf</span>
                    </div>
                  </label>
                  
                  <button 
                    onClick={handleLocalScan}
                    disabled={pdfStatus === 'uploading'}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl border border-white/5 text-sm font-bold transition-all shadow-lg"
                  >
                    Escanear Pasta Local
                  </button>
                </div>
                
                {pdfStatus === 'success' && (
                  <div className="bg-blue-500/10 text-blue-400 p-4 rounded-xl flex items-center gap-3 text-sm border border-blue-500/20">
                    <CheckCircle2 size={18} />
                    {message}
                  </div>
                )}
                {pdfStatus === 'error' && (
                  <div className="bg-red-500/10 text-red-500 p-4 rounded-xl flex items-center gap-3 text-sm border border-red-500/20">
                    <AlertCircle size={18} />
                    {message}
                  </div>
                )}
              </motion.div>

              {/* Manual Creation Card */}
              <motion.div 
                className="glass p-8 rounded-3xl border border-white/5 md:col-span-2 flex flex-col gap-6"
              >
                <div className="bg-primary/10 p-4 rounded-2xl w-fit">
                  <FolderHeart size={32} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold mb-2 text-stone-800">Cadastro Manual de Produto</h2>
                  <p className="text-stone-500 text-sm leading-relaxed">Adicione peças individualmente, defina preços e configure personalizações.</p>
                </div>
                
                <form onSubmit={handleCreateManualProduct} className="space-y-6 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2 ml-1">Nome da Peça *</label>
                      <input required type="text" value={manualName} onChange={e => setManualName(e.target.value)} className="w-full bg-white border border-stone-200 rounded-2xl py-3 px-4 text-stone-800 outline-none focus:border-primary transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2 ml-1">Código/SKU *</label>
                      <input required type="text" value={manualCode} onChange={e => setManualCode(e.target.value)} className="w-full bg-white border border-stone-200 rounded-2xl py-3 px-4 text-stone-800 outline-none focus:border-primary transition-all uppercase" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2 ml-1">Preço Sugerido (R$)</label>
                      <input type="number" step="0.01" value={manualPrice} onChange={e => setManualPrice(e.target.value)} className="w-full bg-white border border-stone-200 rounded-2xl py-3 px-4 text-stone-800 outline-none focus:border-primary transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2 ml-1">Estoque Inicial</label>
                      <input type="number" value={manualStock} onChange={e => setManualStock(e.target.value)} className="w-full bg-white border border-stone-200 rounded-2xl py-3 px-4 text-stone-800 outline-none focus:border-primary transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2 ml-1">Categoria Pai</label>
                      <select value={manualCategoryId} onChange={e => setManualCategoryId(e.target.value)} className="w-full bg-white border border-stone-200 rounded-2xl py-3 px-4 text-stone-800 outline-none focus:border-primary transition-all">
                        <option value="">Nenhuma Categoria</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2 ml-1">Foto Principal</label>
                      <input type="file" accept="image/*" onChange={e => setManualFile(e.target.files?.[0] || null)} className="w-full bg-white border border-stone-200 rounded-2xl py-2 px-4 text-stone-500 outline-none focus:border-primary transition-all file:mr-4 file:py-1 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2 ml-1">Descrição</label>
                    <textarea rows={3} value={manualDescription} onChange={e => setManualDescription(e.target.value)} className="w-full bg-white border border-stone-200 rounded-2xl py-3 px-4 text-stone-800 outline-none focus:border-primary transition-all resize-none"></textarea>
                  </div>

                  <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm cursor-pointer hover:border-primary/50 transition-all" onClick={() => setIsCustomizable(!isCustomizable)}>
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isCustomizable ? 'bg-primary border-primary text-white' : 'border-stone-300'}`}>
                      {isCustomizable && <CheckCircle2 size={16} />}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-stone-800">Permitir personalização pelo cliente</span>
                      <span className="text-[10px] text-stone-500 uppercase font-black tracking-widest">Exigirá um texto extra no carrinho (ex: nome do santo)</span>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isCreatingManualProduct || !manualName || !manualCode}
                    className="w-full bg-primary hover:bg-stone-800 disabled:opacity-50 text-white font-black uppercase text-xs tracking-widest py-4 rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-all active:scale-95"
                  >
                    {isCreatingManualProduct ? <Loader2 className="animate-spin" /> : 'Cadastrar Peça Manualmente'}
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}

          {activeTab === 'catalog' && (
            <motion.div
              key="catalog"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Gerenciar Fotos</h2>
                  <p className="text-slate-400 text-sm">Vincule fotos reais às suas peças individualmente.</p>
                </div>
                
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar por código ou nome..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-900 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 w-full md:w-80 outline-none focus:border-blue-500/50 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Bulk Action Toolbar */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200 flex flex-col sm:flex-row items-center justify-between shadow-sm gap-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={filteredProducts.length > 0 && selectedProductIds.size === filteredProducts.length}
                    onChange={handleSelectAllProducts}
                    className="w-5 h-5 rounded border-stone-300 text-primary focus:ring-primary/20 cursor-pointer"
                  />
                  <span className="text-sm font-bold text-stone-700">Selecionar Todos ({selectedProductIds.size})</span>
                </label>
                <AnimatePresence>
                  {selectedProductIds.size > 0 && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={() => handleDeleteProducts(Array.from(selectedProductIds))}
                      disabled={isDeletingSelected}
                      className="bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all border border-red-200"
                    >
                      {isDeletingSelected ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      Excluir Selecionados
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* Custom Deletion Modal */}
              <AnimatePresence>
                {confirmProductDeleteIds && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
                      onClick={() => !isDeletingSelected && setConfirmProductDeleteIds(null)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white p-8 rounded-3xl shadow-2xl relative z-10 max-w-sm w-full border border-stone-100 flex flex-col items-center text-center"
                    >
                      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                        <Trash2 size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-stone-800 mb-2">Atenção!</h3>
                      <p className="text-stone-500 mb-8">
                        {confirmProductDeleteIds.length > 1 
                          ? 'Deseja realmente excluir os produtos selecionados?' 
                          : 'Tem certeza que deseja excluir este produto?'}
                      </p>
                      <div className="flex gap-3 w-full">
                        <button 
                          onClick={() => setConfirmProductDeleteIds(null)}
                          disabled={isDeletingSelected}
                          className="flex-1 py-3 rounded-xl font-bold text-stone-500 bg-stone-100 hover:bg-stone-200 transition-all"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={executeDeletion}
                          disabled={isDeletingSelected}
                          className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-all flex justify-center items-center gap-2"
                        >
                          {isDeletingSelected ? <Loader2 size={16} className="animate-spin" /> : 'Excluir'}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <AnimatePresence mode="popLayout">
                  {isLoadingProducts ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="glass p-4 rounded-2xl border border-white/5 animate-pulse h-64" />
                    ))
                  ) : (
                    filteredProducts.map((product) => (
                      <motion.div
                        key={product.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white p-5 rounded-[2rem] border border-stone-100 flex flex-col gap-4 group hover:bg-stone-50 transition-all shadow-sm relative"
                      >
                        {/* Checkbox and Individual Delete Button */}
                        <div className="absolute top-7 left-7 z-10">
                          <input 
                            type="checkbox" 
                            checked={selectedProductIds.has(product.id)} 
                            onChange={() => handleToggleProductSelect(product.id)} 
                            className="w-5 h-5 rounded border-stone-300 text-primary focus:ring-primary/20 shadow-xl cursor-pointer" 
                          />
                        </div>
                        <button 
                          onClick={() => handleDeleteProducts([product.id])} 
                          disabled={isDeletingSelected}
                          className="absolute top-7 right-7 z-10 p-2 bg-white/90 hover:bg-red-50 text-stone-400 hover:text-red-500 rounded-xl backdrop-blur-sm shadow-xl transition-all border border-stone-100 opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-0"
                        >
                          <Trash2 size={16} />
                        </button>

                        <div className="relative aspect-square bg-stone-50 rounded-2xl overflow-hidden flex items-center justify-center border border-stone-100/50 mt-2">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name} 
                              className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-stone-200">
                              <ImageIcon size={40} strokeWidth={1.5} />
                              <span className="text-[10px] uppercase font-black tracking-widest">Sem Foto</span>
                            </div>
                          )}
                          
                          {uploadingProductId === product.id && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex items-center justify-center">
                              <Loader2 className="animate-spin text-primary" />
                            </div>
                          )}
                        </div>

                        <div className="px-1 overflow-hidden">
                          <div className="text-primary font-black text-[10px] uppercase tracking-widest mb-1">REF {product.code}</div>
                          <h3 className="font-bold text-stone-800 truncate text-sm uppercase" title={product.name}>{product.name}</h3>
                        </div>

                        {/* Category Selector */}
                        <div className="flex flex-col gap-2">
                          <select 
                            value={product.categoryId || 'none'}
                            onChange={(e) => handleUpdateProductCategory(product.id, e.target.value)}
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl py-2 px-3 text-[10px] font-bold text-stone-600 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all cursor-pointer uppercase tracking-tight"
                          >
                            <option value="none">Sem Grupo</option>
                            {categories.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                        </div>

                        <label className="cursor-pointer">
                          <input 
                            type="file" 
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleManualImageUpload(product.id, product.code, e)}
                            disabled={!!uploadingProductId}
                          />
                          <div className="bg-stone-50 hover:bg-primary hover:text-white text-stone-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-stone-200 shadow-sm cursor-pointer">
                            <Upload size={14} />
                            Subir Foto
                          </div>
                        </label>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
              
              {!isLoadingProducts && filteredProducts.length === 0 && (
                <div className="text-center py-20 bg-slate-900/20 rounded-3xl border border-dashed border-white/5">
                  <ImageIcon className="mx-auto text-slate-800 mb-4" size={48} />
                  <p className="text-slate-500 font-bold">Nenhum produto encontrado.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'categories' && (
            <motion.div
              key="categories"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl space-y-8"
            >
              <div className="glass p-8 rounded-3xl border border-white/5">
                <h2 className="text-xl font-bold mb-6">Nova Categoria</h2>
                <div className="flex gap-4">
                  <input 
                    type="text" 
                    placeholder="Ex: Terços, Imagens, Crucifixos..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-grow bg-white border border-stone-200 rounded-2xl py-4 px-5 text-stone-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-stone-400"
                  />
                  <button 
                    onClick={handleCreateCategory}
                    disabled={isCreatingCategory || !newCategoryName.trim()}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-8 rounded-xl font-bold transition-all h-[52px]"
                  >
                    {isCreatingCategory ? <Loader2 className="animate-spin" /> : 'Adicionar'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isMounted && categories.map(category => (
                  <div key={category.id} className="bg-white p-6 rounded-2xl border border-stone-200 flex items-center justify-between group hover:border-primary/50 transition-all duration-300 shadow-sm">
                    <div className="flex flex-col">
                      <span className="font-black text-stone-800 text-lg tracking-tight uppercase">{category.name}</span>
                      <span className="text-[10px] text-stone-400 font-mono uppercase tracking-widest">ID: {category.id}</span>
                    </div>
                    <button 
                      onClick={() => handleDeleteCategory(category.id)}
                      disabled={deletingCategoryIds.has(category.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group-hover:shadow-lg ${
                        confirmDeleteId === category.id 
                          ? 'bg-red-600 text-white shadow-lg shadow-red-500/30 scale-105' 
                          : 'bg-red-500/10 hover:bg-red-500/20 text-red-500'
                      }`}
                    >
                      {deletingCategoryIds.has(category.id) ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : confirmDeleteId === category.id ? (
                        'CONFIRMAR?'
                      ) : (
                        'Excluir'
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
