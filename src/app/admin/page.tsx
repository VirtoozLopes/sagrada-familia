'use client';

import { useState, useEffect } from 'react';
import { Upload, FileSpreadsheet, FileText, Settings, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon, Search, LayoutDashboard, Database, FolderHeart, Sparkles, Trash2, Lock, LogOut, Pencil, X, PackageCheck, TrendingDown, BarChart3, Save, RefreshCw, Printer, PieChart, Menu, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { processPdfAction, scanLocalCatalogAction } from '@/app/actions/pdf';
import { getAllProductsAction, uploadProductImageAction, createManualProductAction, deleteProductsAction, updateProductAction } from '@/app/actions/product';
import { getWhatsAppNumbersAction, saveWhatsAppNumbersAction } from '@/app/actions/settings';
import { changePasswordAction, logoutAction } from '@/app/actions/auth';

interface Product {
  id: string;
  code: string;
  name: string;
  price: number | null;
  description: string | null;
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
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'import' | 'catalog' | 'categories' | 'estoque' | 'relatorio'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
  const [whatsappContacts, setWhatsappContacts] = useState<{id: string, name: string, number: string}[]>([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactNumber, setNewContactNumber] = useState('');
  const [isSavingWhatsapp, setIsSavingWhatsapp] = useState(false);
  const [whatsappSaved, setWhatsappSaved] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  // Edit Product State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Inventory / Stock State
  interface StockProduct { id: string; code: string; name: string; stock: number | null; editStock: number; dirty: boolean; }
  const [stockProducts, setStockProducts] = useState<StockProduct[]>([]);
  const [stockSearch, setStockSearch] = useState('');
  const [isSavingStock, setIsSavingStock] = useState(false);
  const [stockSaveMsg, setStockSaveMsg] = useState('');
  const [isLoadingStock, setIsLoadingStock] = useState(false);

  // Daily Report State
  const todayStr = () => new Date().toISOString().split('T')[0];
  const [reportDate, setReportDate] = useState(todayStr());
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly'>('daily');
  const [reportData, setReportData] = useState<any>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState<string | null>(null);

  // Top Categories Dashboard State
  const [topCategories, setTopCategories] = useState<any[]>([]);
  const [topCatPeriod, setTopCatPeriod] = useState<'alltime' | 'monthly' | 'weekly'>('alltime');
  const [isLoadingTopCat, setIsLoadingTopCat] = useState(false);

  const fetchTopCategories = async (period = topCatPeriod) => {
    setIsLoadingTopCat(true);
    try {
      const res = await fetch(`/api/reports/top-categories?period=${period}`);
      const data = await res.json();
      if (Array.isArray(data)) setTopCategories(data);
    } catch (e) { /* silent */ }
    setIsLoadingTopCat(false);
  };

  useEffect(() => {
    setIsMounted(true);
    fetchProducts();
    fetchCategories();
    // Load WhatsApp configuration
    getWhatsAppNumbersAction().then(res => {
      if (res.whatsappNumbers) {
        setWhatsappContacts(res.whatsappNumbers);
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

  const fetchStock = async () => {
    setIsLoadingStock(true);
    try {
      const res = await fetch('/api/stock');
      const data = await res.json();
      if (Array.isArray(data)) {
        setStockProducts(data.map((p: any) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          stock: p.stock ?? 0,
          editStock: p.stock ?? 0,
          dirty: false,
        })));
      }
    } catch (e) { /* silent */ }
    setIsLoadingStock(false);
  };

  const handleStockChange = (id: string, value: string) => {
    setStockProducts(prev => prev.map(p =>
      p.id === id ? { ...p, editStock: parseInt(value) || 0, dirty: true } : p
    ));
  };

  const handleSaveStock = async () => {
    const dirty = stockProducts.filter(p => p.dirty);
    if (!dirty.length) return;
    setIsSavingStock(true);
    setStockSaveMsg('');
    try {
      const res = await fetch('/api/stock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dirty.map(p => ({ id: p.id, stock: p.editStock }))),
      });
      const data = await res.json();
      if (data.success) {
        setStockProducts(prev => prev.map(p => ({ ...p, stock: p.editStock, dirty: false })));
        setStockSaveMsg(`✓ ${data.updated} produto(s) atualizados`);
        setTimeout(() => setStockSaveMsg(''), 4000);
      } else {
        setStockSaveMsg('Erro ao salvar estoque.');
      }
    } catch {
      setStockSaveMsg('Erro de conexão.');
    }
    setIsSavingStock(false);
  };

  const fetchDailyReport = async (date: string, period: string = reportPeriod) => {
    setIsLoadingReport(true);
    try {
      const res = await fetch(`/api/reports/daily?date=${date}&period=${period}`);
      const data = await res.json();
      setReportData(data);
    } catch {
      setReportData(null);
    }
    setIsLoadingReport(false);
  };

  const handleDeleteReportItem = async (code: string) => {
    if (!confirm(`Tem certeza que deseja apagar as vendas do item ${code} deste período?\nO estoque será devolvido automaticamente.`)) return;

    setIsDeletingItem(code);
    try {
      const res = await fetch(`/api/reports/daily/item?date=${reportDate}&code=${code}&period=${reportPeriod}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      
      if (data.success) {
        await fetchDailyReport(reportDate);
        await fetchStock();
      } else {
        alert(data.error || 'Erro ao apagar item');
      }
    } catch (e) {
      alert('Erro de conexão ao apagar item');
    }
    setIsDeletingItem(null);
  };

  const handlePrintReport = () => {
    if (!reportData) return;

    const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const dateLabel = reportData.period === 'weekly'
      ? `Semana de ${reportData.startDate.split('-').reverse().join('/')} a ${reportData.endDate.split('-').reverse().join('/')}`
      : new Date(reportDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      
    const now = new Date().toLocaleString('pt-BR');

    const rows = (reportData.items as any[]).map((item: any, i: number) => {
      const outOfStock = item.currentStock !== null && Number(item.currentStock) < 0;
      return `
        <tr style="background:${outOfStock ? '#fff5f5' : i % 2 === 0 ? '#fafafa' : '#ffffff'}">
          <td style="padding:9px 12px;font-weight:700;color:#7c3aed;font-size:11px;border-bottom:1px solid #f0f0f0">${item.code}</td>
          <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0">
            ${item.name}
            ${outOfStock ? '<span style="margin-left:6px;padding:2px 7px;background:#fecaca;color:#dc2626;border-radius:999px;font-size:9px;font-weight:800">⚠ Sem estoque</span>' : ''}
          </td>
          <td style="padding:9px 12px;text-align:center;font-weight:800;color:#7c3aed;border-bottom:1px solid #f0f0f0">${Number(item.totalQuantity)}</td>
          <td style="padding:9px 12px;text-align:center;color:#555;border-bottom:1px solid #f0f0f0">${item.avgPrice ? 'R$ ' + fmt(Number(item.avgPrice)) : '—'}</td>
          <td style="padding:9px 12px;text-align:center;font-weight:700;border-bottom:1px solid #f0f0f0">${Number(item.totalValue) > 0 ? 'R$ ' + fmt(Number(item.totalValue)) : '—'}</td>
          <td style="padding:9px 12px;text-align:center;font-weight:800;color:${Number(item.currentStock) < 0 ? '#dc2626' : Number(item.currentStock) === 0 ? '#d97706' : '#16a34a'};border-bottom:1px solid #f0f0f0">${item.currentStock !== null ? Number(item.currentStock) : '—'}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório de Vendas – ${dateLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1c1917; background: #fff; padding: 32px 40px; font-size: 13px; }
    h1 { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #1c1917; }
    .subtitle { font-size: 11px; color: #78716c; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-top: 4px; }
    .meta { font-size: 11px; color: #a8a29e; margin-top: 2px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #7c3aed; margin-bottom: 24px; }
    .brand { font-size: 11px; font-weight: 800; color: #7c3aed; text-transform: uppercase; letter-spacing: 2px; }
    .summary { display: flex; gap: 0; border: 1px solid #e7e5e4; border-radius: 12px; overflow: hidden; margin-bottom: 24px; }
    .summary-card { flex: 1; text-align: center; padding: 16px 12px; border-right: 1px solid #e7e5e4; background: #faf9f8; }
    .summary-card:last-child { border-right: none; }
    .summary-card .val { font-size: 26px; font-weight: 900; }
    .summary-card .lbl { font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; color: #78716c; margin-top: 4px; }
    .val-orders { color: #1c1917; }
    .val-qty { color: #7c3aed; }
    .val-rev { color: #16a34a; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead tr { background: #f5f0ff; }
    th { padding: 10px 12px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 800; color: #7c3aed; border-bottom: 2px solid #e0d4ff; }
    th.center { text-align: center; }
    td { vertical-align: middle; }
    .footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #e7e5e4; display: flex; justify-content: space-between; font-size: 10px; color: #a8a29e; }
    @media print {
      body { padding: 16px 20px; }
      @page { margin: 15mm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Pecas Order System</div>
      <h1>Relatório de Vendas</h1>
      <div class="subtitle">${dateLabel}</div>
      <div class="meta">Gerado em ${now}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;color:#78716c;font-weight:700">Total de Pedidos</div>
      <div style="font-size:28px;font-weight:900;color:#1c1917">${Number(reportData.summary?.totalOrders ?? 0)}</div>
    </div>
  </div>

  <div class="summary">
    <div class="summary-card">
      <div class="val val-orders">${Number(reportData.summary?.totalOrders ?? 0)}</div>
      <div class="lbl">Pedidos</div>
    </div>
    <div class="summary-card">
      <div class="val val-qty">${Number(reportData.summary?.totalItems ?? 0)}</div>
      <div class="lbl">Peças Vendidas</div>
    </div>
    <div class="summary-card">
      <div class="val val-rev">${Number(reportData.summary?.totalRevenue ?? 0) > 0 ? 'R$ ' + fmt(Number(reportData.summary.totalRevenue)) : '—'}</div>
      <div class="lbl">Receita Total</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Código</th>
        <th>Nome da Peça</th>
        <th class="center">Qtd Vendida</th>
        <th class="center">Preço Unit.</th>
        <th class="center">Subtotal</th>
        <th class="center">Estoque Atual</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">
    <span>Pecas Order System – Relatório interno</span>
    <span>${dateLabel} · ${now}</span>
  </div>

  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
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

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditCode(product.code);
    setEditPrice(product.price != null ? String(product.price) : '');
    setEditDescription(product.description || '');
    setEditError('');
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    setIsSavingEdit(true);
    setEditError('');
    const result = await updateProductAction(editingProduct.id, {
      name: editName,
      code: editCode,
      price: editPrice,
      description: editDescription,
    });
    if (result.success) {
      setProducts(prev => prev.map(p =>
        p.id === editingProduct.id
          ? { ...p, name: editName, code: editCode, price: editPrice ? parseFloat(editPrice) : null, description: editDescription }
          : p
      ));
      setEditingProduct(null);
    } else {
      setEditError(result.error || 'Erro ao salvar.');
    }
    setIsSavingEdit(false);
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

  // Tab labels map
  const TABS = [
    { id: 'dashboard',  label: 'Geral',      icon: LayoutDashboard, action: () => setActiveTab('dashboard') },
    { id: 'import',     label: 'Entrada',    icon: Database,        action: () => setActiveTab('import') },
    { id: 'catalog',    label: 'Vitrine',    icon: FolderHeart,     action: () => setActiveTab('catalog') },
    { id: 'categories', label: 'Grupos',     icon: Settings,        action: () => setActiveTab('categories') },
    { id: 'estoque',    label: 'Estoque',    icon: PackageCheck,    action: () => { setActiveTab('estoque'); fetchStock(); } },
    { id: 'relatorio',  label: 'Relatório',  icon: PieChart,        action: () => { setActiveTab('relatorio'); fetchDailyReport(reportDate); fetchTopCategories('alltime'); } },
  ] as const;

  const activeTabLabel = TABS.find(t => t.id === activeTab)?.label ?? '';

  return (
    <main className="min-h-screen bg-transparent">

      {/* ── Mobile Menu Drawer overlay ── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-[200] md:hidden"
            />
            <motion.div
              key="drawer"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[201] bg-white rounded-t-3xl shadow-2xl pb-safe md:hidden"
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-stone-200 rounded-full" />
              </div>
              <div className="px-4 pt-2 pb-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-4 px-2">Navegar para</p>
                <div className="grid grid-cols-3 gap-3">
                  {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => { tab.action(); setIsMobileMenuOpen(false); }}
                        className={`flex flex-col items-center gap-2 py-4 px-2 rounded-2xl transition-all ${
                          isActive
                            ? 'bg-primary text-white shadow-lg shadow-primary/30'
                            : 'bg-stone-50 text-stone-500 hover:bg-stone-100'
                        }`}
                      >
                        <Icon size={22} />
                        <span className="text-[10px] font-black uppercase tracking-wider">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={async () => { await logoutAction(); window.location.href = '/admin/login'; }}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-red-50 text-red-500 border border-red-100 text-xs font-black uppercase tracking-widest"
                >
                  <LogOut size={18} />
                  Sair do Painel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Mobile sticky bottom bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-[150] md:hidden bg-white/95 backdrop-blur-xl border-t border-stone-100 shadow-2xl flex items-center px-2 pb-safe h-16">
        {TABS.slice(0, 5).map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => tab.action()}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all ${
                isActive ? 'text-primary' : 'text-stone-400'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[9px] font-black uppercase tracking-wide">{tab.label}</span>
            </button>
          );
        })}
        {/* More button — opens drawer */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all ${
            activeTab === 'relatorio' ? 'text-primary' : 'text-stone-400'
          }`}
        >
          <PieChart size={20} strokeWidth={activeTab === 'relatorio' ? 2.5 : 1.8} />
          <span className="text-[9px] font-black uppercase tracking-wide">Relatório</span>
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4 md:pt-8 pb-24 md:pb-8">
        {/* ── HEADER ── */}
        <header className="mb-8">
          {/* Mobile header */}
          <div className="flex items-center justify-between md:hidden">
            <div>
              <h1 className="text-xl font-black text-gradient tracking-tight leading-tight">GESTÃO SAGRADA FAMÍLIA</h1>
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{activeTabLabel}</p>
            </div>
            <button
              onClick={async () => { await logoutAction(); window.location.href = '/admin/login'; }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-red-50 text-red-500 border border-red-100"
            >
              <LogOut size={15} />
            </button>
          </div>

          {/* Desktop header */}
          <div className="hidden md:flex md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black text-gradient tracking-tight">GESTÃO SAGRADA FAMÍLIA</h1>
              <p className="text-stone-500 mt-1">Gerencie seu inventário de artigos religiosos com facilidade.</p>
            </div>
            <div className="flex items-center gap-4">
              <nav className="flex p-1.5 bg-white/80 backdrop-blur-xl border border-stone-200 rounded-2xl shadow-sm">
                {TABS.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => tab.action()}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        isActive ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-stone-400 hover:text-primary'
                      }`}
                    >
                      <Icon size={16} />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
              <button
                onClick={async () => { await logoutAction(); window.location.href = '/admin/login'; }}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all bg-red-50 text-red-500 hover:bg-red-100 border border-red-100 shrink-0"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          </div>
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

              {/* Security / Password Change */}
              <div className="glass p-8 rounded-3xl border border-stone-200 bg-white">
                <h2 className="text-xl font-black mb-2 flex items-center gap-3 text-stone-800 uppercase tracking-tight">
                  <Lock size={20} className="text-stone-800" />
                  Segurança e Acesso
                </h2>
                <p className="text-stone-400 text-xs mb-8 uppercase tracking-widest font-bold">Altere sua senha de acesso ao painel admin</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-3 ml-1">Senha Atual</label>
                    <input 
                      type="password" 
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-3 px-5 text-stone-800 outline-none focus:border-stone-400 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-3 ml-1">Nova Senha</label>
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-3 px-5 text-stone-800 outline-none focus:border-stone-400 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-3 ml-1">Confirmar Nova Senha</label>
                    <input 
                      type="password" 
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-3 px-5 text-stone-800 outline-none focus:border-stone-400 transition-all font-medium"
                    />
                  </div>
                </div>

                {passwordMessage && (
                  <div className={`mt-4 p-3 rounded-xl text-xs font-bold ${passwordMessage.includes('sucesso') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                    {passwordMessage}
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                    onClick={async () => {
                      if (newPassword !== confirmPassword) {
                        setPasswordMessage('A nova senha e a confirmação não conferem.');
                        return;
                      }
                      setIsChangingPassword(true);
                      setPasswordMessage('');
                      const res = await changePasswordAction(currentPassword, newPassword);
                      if (res.success) {
                        setPasswordMessage('Senha alterada com sucesso!');
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                      } else {
                        setPasswordMessage(res.error || 'Erro ao alterar a senha.');
                      }
                      setIsChangingPassword(false);
                    }}
                    className="bg-stone-800 hover:bg-stone-900 disabled:opacity-50 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
                  >
                    {isChangingPassword ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                    Alterar Senha
                  </button>
                </div>
              </div>

            {/* WhatsApp Settings */}
            <div className="glass p-8 rounded-3xl border border-stone-200 bg-white">
              <h2 className="text-xl font-black mb-2 flex items-center gap-3 text-stone-800 uppercase tracking-tight">
                <span className="text-2xl">📱</span>
                WhatsApp para Recebimento de Pedidos
              </h2>
              <p className="text-stone-400 text-xs mb-8 uppercase tracking-widest font-bold">Adicione os vendedores que poderão receber pedidos</p>
              
              <div className="space-y-4 mb-6">
                {whatsappContacts.map((contact, index) => (
                  <div key={contact.id} className="flex flex-col lg:flex-row gap-4 lg:items-center bg-stone-50 p-5 rounded-2xl border border-stone-100">
                    <div className="flex-1 w-full">
                      <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5 ml-1">Nome do Contato</label>
                      <input
                        type="text"
                        value={contact.name}
                        onChange={e => {
                          const newContacts = [...whatsappContacts];
                          newContacts[index].name = e.target.value;
                          setWhatsappContacts(newContacts);
                        }}
                        className="w-full bg-white border border-stone-200 rounded-xl py-3 px-4 text-stone-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm font-bold transition-all"
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5 ml-1">Número (ex: 5511...)</label>
                      <input
                        type="tel"
                        value={contact.number}
                        onChange={e => {
                          const newContacts = [...whatsappContacts];
                          newContacts[index].number = e.target.value;
                          setWhatsappContacts(newContacts);
                        }}
                        className="w-full bg-white border border-stone-200 rounded-xl py-3 px-4 text-stone-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm font-mono transition-all"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const newContacts = whatsappContacts.filter((_, i) => i !== index);
                        setWhatsappContacts(newContacts);
                      }}
                      className="lg:mt-5 p-3 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-all flex items-center justify-center gap-2 w-full lg:w-auto mt-2 shadow-sm shrink-0"
                    >
                      <Trash2 size={18} />
                      <span className="lg:hidden text-xs font-black uppercase tracking-widest">Remover Contato</span>
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col lg:flex-row gap-4 lg:items-end p-6 bg-green-50/50 rounded-3xl border border-green-100">
                <div className="flex-1 w-full">
                  <label className="block text-[10px] font-black text-green-700 uppercase tracking-widest mb-2 ml-1">Novo Nome (Ex: Filial Centro)</label>
                  <input
                    type="text"
                    value={newContactName}
                    onChange={e => setNewContactName(e.target.value)}
                    placeholder="Nome do Vendedor"
                    className="w-full bg-white border border-green-200 rounded-2xl py-3 px-5 text-stone-800 outline-none focus:border-green-400 focus:ring-4 focus:ring-green-400/10 transition-all font-medium placeholder:text-stone-300"
                  />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-[10px] font-black text-green-700 uppercase tracking-widest mb-2 ml-1">Novo Número (5511999999999)</label>
                  <input
                    type="tel"
                    value={newContactNumber}
                    onChange={e => setNewContactNumber(e.target.value)}
                    placeholder="5511999999999"
                    className="w-full bg-white border border-green-200 rounded-2xl py-3 px-5 text-stone-800 outline-none focus:border-green-400 focus:ring-4 focus:ring-green-400/10 transition-all font-medium placeholder:text-stone-300"
                  />
                </div>
                <button
                  onClick={() => {
                    if (newContactName.trim() && newContactNumber.trim()) {
                      setWhatsappContacts([...whatsappContacts, { id: crypto.randomUUID(), name: newContactName, number: newContactNumber }]);
                      setNewContactName('');
                      setNewContactNumber('');
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white shadow-lg w-full lg:w-auto px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all mt-4 lg:mt-0 flex items-center justify-center whitespace-nowrap shrink-0"
                >
                  Adicionar
                </button>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={async () => {
                    setIsSavingWhatsapp(true);
                    setWhatsappSaved(false);
                    const result = await saveWhatsAppNumbersAction(whatsappContacts);
                    if (result.success && result.whatsappNumbers) {
                      setWhatsappContacts(result.whatsappNumbers);
                      setWhatsappSaved(true);
                      setTimeout(() => setWhatsappSaved(false), 3000);
                    } else {
                      alert('Erro ao salvar: ' + result.error);
                    }
                    setIsSavingWhatsapp(false);
                  }}
                  disabled={isSavingWhatsapp}
                  className="bg-primary hover:bg-stone-800 disabled:opacity-50 text-white font-black uppercase text-xs tracking-widest px-8 py-4 rounded-2xl shadow-lg flex items-center gap-2 transition-all whitespace-nowrap"
                >
                  {isSavingWhatsapp ? <Loader2 size={16} className="animate-spin" /> : whatsappSaved ? <CheckCircle2 size={16} /> : '💾'}
                  {whatsappSaved ? 'Lista Salva!' : 'Salvar Lista de Vendedores'}
                </button>
              </div>

              {whatsappContacts.length === 0 && (
                <div className="mt-8 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 font-bold flex items-center gap-2">
                  ⚠️ Nenhum contato configurado — clientes não verão a opção "Enviar via WhatsApp".
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
                        <div className="absolute top-7 right-7 z-10 flex gap-1.5">
                          <button 
                            onClick={() => handleOpenEdit(product as any)} 
                            className="p-2 bg-white/90 hover:bg-primary/10 text-stone-400 hover:text-primary rounded-xl backdrop-blur-sm shadow-xl transition-all border border-stone-100 opacity-0 group-hover:opacity-100 focus:opacity-100"
                          >
                            <Pencil size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteProducts([product.id])} 
                            disabled={isDeletingSelected}
                            className="p-2 bg-white/90 hover:bg-red-50 text-stone-400 hover:text-red-500 rounded-xl backdrop-blur-sm shadow-xl transition-all border border-stone-100 opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-0"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

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
                            {categories.map((cat: any) => (
                              <optgroup key={cat.id} label={cat.name}>
                                <option value={cat.id}>{cat.name} (Geral)</option>
                                {cat.children?.map((child: any) => (
                                  <option key={child.id} value={child.id}>- {child.name}</option>
                                ))}
                              </optgroup>
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

          {/* Edit Product Modal */}
          <AnimatePresence>
            {editingProduct && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
                  onClick={() => !isSavingEdit && setEditingProduct(null)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-white rounded-3xl shadow-2xl relative z-10 w-full max-w-lg border border-stone-100 overflow-hidden"
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-stone-100">
                    <div>
                      <h3 className="text-xl font-black text-stone-800">Editar Produto</h3>
                      <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-0.5">{editingProduct.code}</p>
                    </div>
                    <button onClick={() => setEditingProduct(null)} className="p-2 hover:bg-stone-100 rounded-xl text-stone-400 transition-all">
                      <X size={20} />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="px-8 py-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2 ml-1">Código / SKU *</label>
                        <input
                          type="text"
                          value={editCode}
                          onChange={e => setEditCode(e.target.value)}
                          className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-3 px-4 text-stone-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 font-bold transition-all uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2 ml-1">Preço (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editPrice}
                          onChange={e => setEditPrice(e.target.value)}
                          placeholder="0,00"
                          className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-3 px-4 text-stone-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 font-bold transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2 ml-1">Nome da Peça *</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-3 px-4 text-stone-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 font-bold transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2 ml-1">Descrição</label>
                      <textarea
                        value={editDescription}
                        onChange={e => setEditDescription(e.target.value)}
                        rows={3}
                        placeholder="Descrição opcional do produto..."
                        className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-3 px-4 text-stone-800 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 font-medium transition-all resize-none"
                      />
                    </div>

                    {editError && (
                      <div className="flex items-center gap-2 text-red-500 bg-red-50 px-4 py-3 rounded-xl text-xs font-bold">
                        <AlertCircle size={14} />
                        {editError}
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="flex gap-3 px-8 pb-8">
                    <button
                      onClick={() => setEditingProduct(null)}
                      disabled={isSavingEdit}
                      className="flex-1 py-3.5 rounded-2xl font-black text-stone-500 bg-stone-100 hover:bg-stone-200 transition-all text-sm uppercase tracking-widest"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={isSavingEdit || !editName || !editCode}
                      className="flex-1 py-3.5 rounded-2xl font-black text-white bg-primary hover:bg-primary/90 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSavingEdit ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
                      Salvar
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ─── ESTOQUE TAB ─────────────────────────────────────────── */}
          {activeTab === 'estoque' && (
            <motion.div
              key="estoque"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
              {/* ── Inventory Control Panel ── */}
              <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-8 py-6 border-b border-stone-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <PackageCheck size={20} className="text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-stone-800 uppercase tracking-tight">Controle de Estoque</h2>
                      <p className="text-xs text-stone-400 font-medium">Edite as quantidades e clique em Salvar</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 sm:flex-none">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
                      <input
                        type="text"
                        placeholder="Buscar..."
                        value={stockSearch}
                        onChange={e => setStockSearch(e.target.value)}
                        className="bg-stone-50 border border-stone-200 rounded-xl py-2.5 pl-9 pr-4 w-full sm:w-56 outline-none focus:border-primary text-sm font-medium transition-all"
                      />
                    </div>
                    <button
                      onClick={fetchStock}
                      className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-500 hover:text-primary hover:border-primary/30 transition-all"
                      title="Recarregar"
                    >
                      <RefreshCw size={16} />
                    </button>
                    <button
                      onClick={handleSaveStock}
                      disabled={isSavingStock || !stockProducts.some(p => p.dirty)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 disabled:opacity-40 transition-all shadow-lg shadow-primary/20"
                    >
                      {isSavingStock ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Salvar
                    </button>
                  </div>
                </div>

                {/* Save message */}
                {stockSaveMsg && (
                  <div className={`px-8 py-3 text-xs font-bold flex items-center gap-2 ${stockSaveMsg.startsWith('✓') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                    {stockSaveMsg.startsWith('✓') ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    {stockSaveMsg}
                  </div>
                )}

                {/* Table */}
                {isLoadingStock ? (
                  <div className="flex items-center justify-center py-20 gap-3 text-stone-400">
                    <Loader2 size={24} className="animate-spin" />
                    <span className="text-sm font-bold">Carregando estoque...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-stone-100 bg-stone-50/60">
                          <th className="text-left py-3 px-6 text-[10px] font-black text-stone-400 uppercase tracking-widest">Código</th>
                          <th className="text-left py-3 px-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Nome</th>
                          <th className="text-center py-3 px-4 text-[10px] font-black text-stone-400 uppercase tracking-widest w-28">Estoque</th>
                          <th className="text-center py-3 px-4 text-[10px] font-black text-stone-400 uppercase tracking-widest w-20">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-50">
                        {stockProducts
                          .filter(p =>
                            !stockSearch ||
                            p.code.toLowerCase().includes(stockSearch.toLowerCase()) ||
                            p.name.toLowerCase().includes(stockSearch.toLowerCase())
                          )
                          .map(p => {
                            const isLow = p.editStock <= 3 && p.editStock > 0;
                            const isOut = p.editStock <= 0;
                            return (
                              <tr key={p.id} className={`transition-colors ${p.dirty ? 'bg-amber-50/50' : 'hover:bg-stone-50/60'}`}>
                                <td className="py-3 px-6">
                                  <span className="font-black text-primary text-[11px] uppercase tracking-wider">{p.code}</span>
                                </td>
                                <td className="py-3 px-4 font-medium text-stone-700 max-w-xs truncate">{p.name}</td>
                                <td className="py-3 px-4 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    value={p.editStock}
                                    onChange={e => handleStockChange(p.id, e.target.value)}
                                    className={`w-20 text-center border rounded-xl py-1.5 px-2 font-black text-sm outline-none transition-all focus:ring-4 ${
                                      p.dirty
                                        ? 'border-amber-400 bg-amber-50 text-amber-700 focus:ring-amber-100'
                                        : 'border-stone-200 bg-stone-50 text-stone-800 focus:border-primary focus:ring-primary/10'
                                    }`}
                                  />
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {isOut ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-600 rounded-full text-[10px] font-black uppercase tracking-wide">
                                      <TrendingDown size={10} /> Esgotado
                                    </span>
                                  ) : isLow ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-wide">
                                      Baixo
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase tracking-wide">
                                      OK
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                    {stockProducts.filter(p =>
                      !stockSearch ||
                      p.code.toLowerCase().includes(stockSearch.toLowerCase()) ||
                      p.name.toLowerCase().includes(stockSearch.toLowerCase())
                    ).length === 0 && (
                      <div className="text-center py-12 text-stone-400 text-sm font-bold">
                        Nenhum produto encontrado.
                      </div>
                    )}
                  </div>
                )}
              </div>

            </motion.div>
          )}

          {/* RELATÓRIO TAB */}
          {activeTab === 'relatorio' && (
            <motion.div key="relatorio" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10">
              <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-8 py-6 border-b border-stone-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center"><PieChart size={20} className="text-primary" /></div>
                    <div>
                      <h2 className="text-lg font-black text-stone-800 uppercase tracking-tight">Top 5 Categorias</h2>
                      <p className="text-xs text-stone-400 font-medium">Categorias mais vendidas por volume de peças</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-stone-100 border border-stone-200 rounded-xl p-1">
                    {(['alltime', 'monthly', 'weekly'] as const).map(p => (
                      <button key={p} onClick={() => { setTopCatPeriod(p); fetchTopCategories(p); }}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${topCatPeriod === p ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>
                        {p === 'alltime' ? 'Sempre' : p === 'monthly' ? 'Este Mês' : 'Esta Semana'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-8">
                  {isLoadingTopCat ? (
                    <div className="flex items-center justify-center py-12 gap-3 text-stone-400"><Loader2 size={24} className="animate-spin" /><span className="text-sm font-bold">Calculando...</span></div>
                  ) : topCategories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-stone-400 gap-3"><PieChart size={48} strokeWidth={1} className="opacity-30" /><p className="text-sm font-bold">Nenhum dado de vendas disponível.</p></div>
                  ) : (() => {
                    const maxQty = Math.max(...topCategories.map((c: any) => Number(c.totalQuantity)));
                    const colors = ['bg-primary','bg-amber-500','bg-green-500','bg-blue-500','bg-purple-500'];
                    const textColors = ['text-primary','text-amber-500','text-green-500','text-blue-500','text-purple-500'];
                    return (
                      <div className="space-y-6">
                        {topCategories.map((cat: any, idx: number) => {
                          const pct = maxQty > 0 ? (Number(cat.totalQuantity) / maxQty) * 100 : 0;
                          return (
                            <div key={cat.categoryId} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black text-white ${colors[idx]}`}>{idx + 1}</span>
                                  <span className="font-black text-stone-800 uppercase tracking-tight text-sm">{cat.categoryName}</span>
                                </div>
                                <div className="flex items-center gap-6 text-right">
                                  <div><div className={`text-xl font-black ${textColors[idx]}`}>{Number(cat.totalQuantity)}</div><div className="text-[10px] text-stone-400 font-black uppercase tracking-widest">peças</div></div>
                                  <div><div className="text-xl font-black text-stone-700">{Number(cat.totalRevenue) > 0 ? `R$ ${Number(cat.totalRevenue).toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '—'}</div><div className="text-[10px] text-stone-400 font-black uppercase tracking-widest">receita</div></div>
                                </div>
                              </div>
                              <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut', delay: idx * 0.1 }} className={`h-full rounded-full ${colors[idx]}`} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-8 py-6 border-b border-stone-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/10 rounded-2xl flex items-center justify-center"><BarChart3 size={20} className="text-green-600" /></div>
                    <div>
                      <h2 className="text-lg font-black text-stone-800 uppercase tracking-tight">Relatório de Vendas</h2>
                      <p className="text-xs text-stone-400 font-medium">{reportData?.period === 'weekly' && reportData?.startDate ? `Semana de ${reportData.startDate.split('-').reverse().join('/')} a ${reportData.endDate.split('-').reverse().join('/')}` : 'Pedidos recebidos no dia selecionado'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex items-center gap-1 bg-stone-100 border border-stone-200 rounded-xl p-1">
                      <button onClick={() => { setReportPeriod('daily'); fetchDailyReport(reportDate, 'daily'); }} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${reportPeriod === 'daily' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>Diário</button>
                      <button onClick={() => { setReportPeriod('weekly'); fetchDailyReport(reportDate, 'weekly'); }} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${reportPeriod === 'weekly' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>Semanal</button>
                    </div>
                    <input type="date" value={reportDate} max={todayStr()} onChange={e => { setReportDate(e.target.value); fetchDailyReport(e.target.value, reportPeriod); }} className="bg-stone-50 border border-stone-200 rounded-xl py-2.5 px-4 text-sm font-bold text-stone-700 outline-none focus:border-primary transition-all cursor-pointer" />
                    <button onClick={() => fetchDailyReport(reportDate)} className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-500 hover:text-green-600 hover:border-green-300 transition-all"><RefreshCw size={16} /></button>
                    <button onClick={handlePrintReport} disabled={!reportData || reportData.items?.length === 0} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-green-600/20"><Printer size={15} /><span className="hidden sm:inline">Exportar PDF</span></button>
                  </div>
                </div>
                {reportData && (
                  <div className="grid grid-cols-3 gap-4 px-8 py-5 border-b border-stone-100 bg-stone-50/40">
                    <div className="text-center"><div className="text-2xl font-black text-stone-800">{Number(reportData.summary?.totalOrders ?? 0)}</div><div className="text-[10px] text-stone-400 font-black uppercase tracking-widest mt-0.5">Pedidos</div></div>
                    <div className="text-center"><div className="text-2xl font-black text-primary">{Number(reportData.summary?.totalItems ?? 0)}</div><div className="text-[10px] text-stone-400 font-black uppercase tracking-widest mt-0.5">Peças Vendidas</div></div>
                    <div className="text-center"><div className="text-2xl font-black text-green-600">{Number(reportData.summary?.totalRevenue ?? 0) > 0 ? `R$ ${Number(reportData.summary.totalRevenue).toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '—'}</div><div className="text-[10px] text-stone-400 font-black uppercase tracking-widest mt-0.5">Receita Total</div></div>
                  </div>
                )}
                {isLoadingReport ? (
                  <div className="flex items-center justify-center py-16 gap-3 text-stone-400"><Loader2 size={24} className="animate-spin" /><span className="text-sm font-bold">Carregando relatório...</span></div>
                ) : !reportData || reportData.items?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-stone-400 gap-3"><BarChart3 size={48} strokeWidth={1} className="opacity-30" /><p className="text-sm font-bold">Nenhum pedido registrado nesta data.</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-stone-100 bg-stone-50/60">
                        <th className="text-left py-3 px-6 text-[10px] font-black text-stone-400 uppercase tracking-widest">Código</th>
                        <th className="text-left py-3 px-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Nome</th>
                        <th className="text-center py-3 px-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Qtd Vendida</th>
                        <th className="text-center py-3 px-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Preço Unit.</th>
                        <th className="text-center py-3 px-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Subtotal</th>
                        <th className="text-center py-3 px-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Estoque Atual</th>
                        <th className="text-center py-3 px-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Ações</th>
                      </tr></thead>
                      <tbody className="divide-y divide-stone-50">
                        {(reportData.items as any[]).map((item: any, idx: number) => {
                          const outOfStock = item.currentStock !== null && Number(item.currentStock) < 0;
                          return (
                            <tr key={idx} className={`transition-colors hover:bg-stone-50/60 ${outOfStock ? 'bg-red-50/30' : ''}`}>
                              <td className="py-3 px-6"><span className="font-black text-primary text-[11px] uppercase tracking-wider">{item.code}</span></td>
                              <td className="py-3 px-4 font-medium text-stone-700 max-w-xs"><div className="flex items-center gap-2">{item.name}{outOfStock && (<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-[9px] font-black uppercase tracking-wide whitespace-nowrap"><TrendingDown size={9} /> Sem estoque</span>)}</div></td>
                              <td className="py-3 px-4 text-center"><span className="inline-block px-3 py-1 bg-primary/10 text-primary font-black rounded-full text-xs">{Number(item.totalQuantity)}</span></td>
                              <td className="py-3 px-4 text-center text-stone-500 font-medium">{item.avgPrice ? `R$ ${Number(item.avgPrice).toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '—'}</td>
                              <td className="py-3 px-4 text-center font-bold text-stone-800">{Number(item.totalValue) > 0 ? `R$ ${Number(item.totalValue).toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '—'}</td>
                              <td className="py-3 px-4 text-center">{item.currentStock !== null ? (<span className={`font-black text-sm ${Number(item.currentStock) < 0 ? 'text-red-500' : Number(item.currentStock) === 0 ? 'text-amber-500' : 'text-green-600'}`}>{Number(item.currentStock)}</span>) : <span className="text-stone-300">—</span>}</td>
                              <td className="py-3 px-4 text-center"><button onClick={() => handleDeleteReportItem(item.code)} disabled={isDeletingItem === item.code} className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">{isDeletingItem === item.code ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}</button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
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
