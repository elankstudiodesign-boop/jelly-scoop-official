import React, { useEffect, useRef, useState } from 'react';
import { Product, Transaction, PriceGroup } from '../types';
import { PackagePlus, Search, AlertCircle, Trash2, X, CheckCircle2, Upload, Image as ImageIcon } from 'lucide-react';
import { formatCurrency, parseCurrency } from '../lib/format';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface ImportProps {
  products: Product[];
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  addTransaction: (transaction: Transaction) => void;
  deleteProduct: (id: string) => void;
}

export default function Import({ products, addProduct, updateProduct, addTransaction, deleteProduct }: ImportProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [unitCost, setUnitCost] = useState<string>('');
  const [totalCost, setTotalCost] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [deleteConfirmIds, setDeleteConfirmIds] = useState<string[] | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const imageDropzoneRef = useRef<HTMLDivElement>(null);
  const imageObjectUrlRef = useRef<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exactMatch = products.find(p => p.name.toLowerCase() === searchTerm.toLowerCase());
  const isNewProduct = searchTerm.trim().length > 0 && !exactMatch;

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const priceGroupFromUnitCost = (cost: number): PriceGroup => {
    if (cost < 5000) return 'Thấp';
    if (cost < 13000) return 'Trung';
    if (cost <= 20000) return 'Cao';
    return 'Cao cấp';
  };

  const setImagePreviewFromFile = (file: File) => {
    if (imageObjectUrlRef.current) URL.revokeObjectURL(imageObjectUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    imageObjectUrlRef.current = objectUrl;
    setImageUrl(objectUrl);
  };

  const dataUrlToBlob = (dataUrl: string) => {
    const [meta, b64] = dataUrl.split(',');
    const mime = meta.match(/data:(.*?);base64/i)?.[1] || 'application/octet-stream';
    const binary = atob(b64 || '');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  };

  const uploadProductImage = async (productId: string, file: Blob, contentType: string) => {
    const bucket = 'product-images';
    const ext = (() => {
      const t = (contentType || '').toLowerCase();
      if (t.includes('png')) return 'png';
      if (t.includes('webp')) return 'webp';
      if (t.includes('gif')) return 'gif';
      if (t.includes('jpeg') || t.includes('jpg')) return 'jpg';
      return 'bin';
    })();
    const random = Math.random().toString(16).slice(2);
    const path = `${productId}/${Date.now()}-${random}.${ext}`;

    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleClipboardPaste = async (clipboardData: DataTransfer | null | undefined) => {
    if (!clipboardData) return false;

    const items = clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.includes('image')) {
        const file = items[i].getAsFile();
        if (!file) continue;
        setImageFile(file);
        setImagePreviewFromFile(file);
        return true;
      }
    }

    const text = clipboardData.getData('text/plain')?.trim();
    if (text && (/^https?:\/\//i.test(text) || /^data:image\//i.test(text))) {
      if (imageObjectUrlRef.current) URL.revokeObjectURL(imageObjectUrlRef.current);
      imageObjectUrlRef.current = null;
      setImageFile(null);
      setImageUrl(text);
      return true;
    }

    return false;
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuantity(val);
    if (val && unitCost) {
      const parsedUnitCost = parseCurrency(unitCost);
      setTotalCost(formatCurrency(Math.round(Number(val) * parsedUnitCost)));
    }
  };

  const handleUnitCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const formatted = formatCurrency(val);
    setUnitCost(formatted);
    if (formatted && quantity) {
      const parsedUnitCost = parseCurrency(formatted);
      setTotalCost(formatCurrency(Math.round(Number(quantity) * parsedUnitCost)));
    }
  };

  const handleTotalCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const formatted = formatCurrency(val);
    setTotalCost(formatted);
    if (formatted && quantity && Number(quantity) > 0) {
      const parsedTotalCost = parseCurrency(formatted);
      setUnitCost(formatCurrency(Math.round(parsedTotalCost / Number(quantity))));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreviewFromFile(file);
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const handled = await handleClipboardPaste(e.clipboardData);
    if (handled) e.preventDefault();
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm || !quantity || !totalCost || !unitCost) return;

    const numQuantity = Number(quantity);
    const numTotalCost = parseCurrency(totalCost);
    const numUnitCost = parseCurrency(unitCost);
    const derivedPriceGroup = priceGroupFromUnitCost(numUnitCost);

    if (numQuantity <= 0 || numTotalCost <= 0 || numUnitCost <= 0) {
      alert('Số lượng, giá vốn và tổng chi phí phải lớn hơn 0');
      return;
    }

    let productName = searchTerm;

    let productToUpdate = selectedProduct;
    if (!productToUpdate) {
      productToUpdate = products.find(p => p.name.toLowerCase() === searchTerm.toLowerCase());
    }

    const productIdForImage = productToUpdate ? productToUpdate.id : uuidv4();
    let finalImageUrl = '';
    const currentImageUrl = imageUrl || '';
    const hasRemoteUrl = /^https?:\/\//i.test(currentImageUrl);
    const hasDataUrl = /^data:image\//i.test(currentImageUrl);

    if (imageFile) {
      if (!hasSupabaseConfig) {
        setNotification({ type: 'error', message: 'Chưa kết nối Supabase nên không thể lưu ảnh để đồng bộ.' });
        setTimeout(() => setNotification(null), 3000);
        return;
      }
      try {
        setImageProcessing(true);
        finalImageUrl = await uploadProductImage(productIdForImage, imageFile, imageFile.type || 'application/octet-stream');
      } catch {
        setNotification({ type: 'error', message: 'Tải ảnh lên Supabase thất bại. Vui lòng thử lại.' });
        setTimeout(() => setNotification(null), 3000);
        return;
      } finally {
        setImageProcessing(false);
      }
    } else if (hasDataUrl) {
      if (!hasSupabaseConfig) {
        finalImageUrl = currentImageUrl;
      } else {
        try {
          setImageProcessing(true);
          const blob = dataUrlToBlob(currentImageUrl);
          finalImageUrl = await uploadProductImage(productIdForImage, blob, blob.type || 'application/octet-stream');
        } catch {
          setNotification({ type: 'error', message: 'Tải ảnh lên Supabase thất bại. Vui lòng thử lại.' });
          setTimeout(() => setNotification(null), 3000);
          return;
        } finally {
          setImageProcessing(false);
        }
      }
    } else if (hasRemoteUrl) {
      finalImageUrl = currentImageUrl;
    }

    if (productToUpdate) {
      // Update existing product
      const newWarehouseQuantity = (productToUpdate.warehouseQuantity || 0) + numQuantity;
      const updates: Partial<Product> = {
        warehouseQuantity: newWarehouseQuantity,
        cost: numUnitCost,
        priceGroup: derivedPriceGroup,
        note: note
      };
      if (finalImageUrl) {
        updates.imageUrl = finalImageUrl;
      }
      updateProduct(productToUpdate.id, updates);
      productName = productToUpdate.name;
    } else {
      // Create new product
      const newProduct: Product = {
        id: productIdForImage,
        name: searchTerm,
        cost: numUnitCost,
        imageUrl: finalImageUrl || 'https://picsum.photos/seed/' + encodeURIComponent(searchTerm) + '/200/200',
        priceGroup: derivedPriceGroup,
        quantity: 0,
        warehouseQuantity: numQuantity,
        note: note
      };
      addProduct(newProduct);
    }

    // Add transaction
    addTransaction({
      id: uuidv4(),
      type: 'OUT',
      category: 'IMPORT',
      amount: numTotalCost,
      description: description || `Nhập kho: ${numQuantity} x ${productName}`,
      date: new Date().toISOString()
    });

    // Reset form
    setSelectedProductId('');
    setQuantity('');
    setUnitCost('');
    setTotalCost('');
    setDescription('');
    setNote('');
    setSearchTerm('');
    setImageUrl('');
    setImageFile(null);
    setShowDropdown(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageObjectUrlRef.current) URL.revokeObjectURL(imageObjectUrlRef.current);
    imageObjectUrlRef.current = null;
    setNotification({ type: 'success', message: 'Nhập kho thành công!' });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteMany = (ids: string[]) => {
    ids.forEach(id => deleteProduct(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
    setDeleteConfirmIds(null);
    setNotification({
      type: 'success',
      message: ids.length === 1 ? 'Đã xoá sản phẩm khỏi kho.' : `Đã xoá ${ids.length} sản phẩm khỏi kho.`
    });
    setTimeout(() => setNotification(null), 3000);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allIds = products.map(p => p.id);
  const allSelected = allIds.length > 0 && selectedIds.size === allIds.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      if (allSelected) return new Set();
      const next = new Set(prev);
      allIds.forEach(id => next.add(id));
      return next;
    });
  };

  useEffect(() => {
    const allowed = new Set(allIds);
    setSelectedIds(prev => new Set([...prev].filter(id => allowed.has(id))));
  }, [products]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  useEffect(() => {
    const onWindowPaste = async (e: ClipboardEvent) => {
      const handled = await handleClipboardPaste(e.clipboardData);
      if (handled) e.preventDefault();
    };
    window.addEventListener('paste', onWindowPaste);
    return () => window.removeEventListener('paste', onWindowPaste);
  }, []);

  useEffect(() => {
    return () => {
      if (imageObjectUrlRef.current) URL.revokeObjectURL(imageObjectUrlRef.current);
    };
  }, []);

  return (
    <div className="space-y-6 relative">
      {notification && (
        <div className={`fixed top-[calc(env(safe-area-inset-top)+1rem)] left-4 right-4 md:top-4 md:left-auto md:right-4 md:max-w-md z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
          <span className="font-medium text-sm">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {deleteConfirmIds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {deleteConfirmIds.length === 1 ? 'Xác nhận xoá sản phẩm' : `Xác nhận xoá ${deleteConfirmIds.length} sản phẩm`}
            </h3>
            <p className="text-slate-600 text-sm mb-6">
              {deleteConfirmIds.length === 1
                ? 'Bạn có chắc chắn muốn xoá sản phẩm này khỏi kho? Hành động này không thể hoàn tác.'
                : 'Bạn có chắc chắn muốn xoá các sản phẩm đang chọn khỏi kho? Hành động này không thể hoàn tác.'
              }
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmIds(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDeleteMany(deleteConfirmIds)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Xác nhận xoá
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Nhập kho</h1>
        <p className="text-slate-500 mt-1 text-sm">Thêm số lượng sản phẩm vào kho và ghi nhận chi phí.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6">
          <form onSubmit={handleImport} onPaste={handlePaste} className="space-y-6 max-w-2xl">
            
            {/* Product Selection / Creation */}
            <div className="space-y-3 relative">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">Tên sản phẩm</label>
                {isNewProduct && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                    <PackagePlus className="w-3 h-3" />
                    Chưa có trong kho (Sẽ tạo mới)
                  </span>
                )}
                {exactMatch && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <CheckCircle2 className="w-3 h-3" />
                    Đã có trong kho
                  </span>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Nhập tên sản phẩm mới hoặc tìm kiếm..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setSelectedProductId('');
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              
              {showDropdown && searchTerm && !selectedProductId && filteredProducts.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white max-h-48 overflow-y-auto border border-slate-200 rounded-lg shadow-lg divide-y divide-slate-100">
                  {filteredProducts.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedProductId(p.id);
                        setSearchTerm(p.name);
                        setUnitCost(formatCurrency(p.cost));
                        setNote(p.note || '');
                        if (imageObjectUrlRef.current) URL.revokeObjectURL(imageObjectUrlRef.current);
                        imageObjectUrlRef.current = null;
                        setImageFile(null);
                        setImageUrl(p.imageUrl || '');
                        if (quantity) {
                          setTotalCost(formatCurrency(Math.round(Number(quantity) * p.cost)));
                        }
                        setShowDropdown(false);
                      }}
                      className="w-full text-left p-3 hover:bg-slate-50 flex justify-between items-center"
                    >
                      <span className="font-medium text-slate-900">{p.name}</span>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">Trong kho: {p.warehouseQuantity || 0}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Image Upload/Paste */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">Hình ảnh sản phẩm (Tùy chọn)</label>
              <div 
                ref={imageDropzoneRef}
                tabIndex={0}
                onClick={() => imageDropzoneRef.current?.focus()}
                onPaste={handlePaste}
                className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg hover:border-indigo-500 transition-colors bg-slate-50 relative overflow-hidden group focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {imageUrl ? (
                  <div className="relative w-32 h-32 mx-auto">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover rounded-lg shadow-sm" />
                    <button 
                      type="button"
                      onClick={() => {
                        setImageUrl('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 transition-colors shadow-sm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1 text-center">
                    <ImageIcon className="mx-auto h-12 w-12 text-slate-400" />
                    <div className="flex text-sm text-slate-600 justify-center">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 px-2 py-1"
                      >
                        <span>Tải ảnh lên</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} ref={fileInputRef} />
                      </label>
                      <p className="pl-1 py-1">hoặc Paste (Ctrl+V) ảnh vào đây</p>
                    </div>
                    <p className="text-xs text-slate-500">Dán (Ctrl+V) ảnh hoặc tải ảnh bất kỳ lên</p>
                    {imageProcessing && (
                      <p className="text-xs text-indigo-600 font-medium mt-2">Đang xử lý ảnh...</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quantity & Cost */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Số lượng nhập</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={handleQuantityChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Giá vốn / 1 SP (VNĐ)</label>
                <input
                  type="text"
                  required
                  value={unitCost}
                  onChange={handleUnitCostChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0"
                />
              </div>
              
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Tổng chi phí (VNĐ)</label>
                <input
                  type="text"
                  required
                  value={totalCost}
                  onChange={handleTotalCostChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">Ghi chú sản phẩm (Tùy chọn)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Ghi chú về sản phẩm này (hiển thị ở phần tồn kho)..."
                rows={2}
              />
            </div>

            {/* Description */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">Mô tả giao dịch (Tùy chọn)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Ghi chú thêm về lô hàng này (lưu vào lịch sử giao dịch)..."
                rows={2}
              />
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                type="submit"
                className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 transition-colors flex items-center justify-center gap-2"
              >
                <PackagePlus className="w-5 h-5" />
                Xác nhận nhập kho
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Warehouse Inventory List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">Tồn kho hiện tại</h2>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600 select-none">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Chọn tất cả
            </label>
            <button
              type="button"
              onClick={() => setDeleteConfirmIds(Array.from(selectedIds))}
              disabled={selectedIds.size === 0}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Xoá đã chọn {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
            </button>
          </div>
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-12"></th>
                <th className="px-6 py-4 w-16">Ảnh</th>
                <th className="px-6 py-4">Sản phẩm</th>
                <th className="px-6 py-4 text-right">Giá vốn</th>
                <th className="px-6 py-4 text-right">Tồn kho</th>
                <th className="px-6 py-4 text-right">Trạng thái</th>
                <th className="px-6 py-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Kho hàng trống
                  </td>
                </tr>
              ) : (
                products.map(p => {
                  const wq = p.warehouseQuantity || 0;
                  const checked = selectedIds.has(p.id);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelected(p.id)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-10 h-10 rounded-md overflow-hidden bg-slate-100 border border-slate-200">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-5 h-5 m-2.5 text-slate-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{p.name}</div>
                        {p.note && <div className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{p.note}</div>}
                      </td>
                      <td className="px-6 py-4 text-right">{formatCurrency(p.cost)}đ</td>
                      <td className="px-6 py-4 text-right font-medium">{wq}</td>
                      <td className="px-6 py-4 text-right">
                        {wq === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            <AlertCircle className="w-3 h-3" />
                            Hết hàng
                          </span>
                        ) : wq <= 10 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                            <AlertCircle className="w-3 h-3" />
                            Sắp hết
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                            Còn hàng
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setDeleteConfirmIds([p.id])}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xoá sản phẩm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-100">
          {products.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Kho hàng trống</div>
          ) : (
            products.map(p => {
              const wq = p.warehouseQuantity || 0;
              const checked = selectedIds.has(p.id);
              return (
                <div key={p.id} className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSelected(p.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
                  />
                  <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <h3 className="font-semibold text-slate-900 pr-2 break-words">{p.name}</h3>
                        {p.note && <div className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{p.note}</div>}
                      </div>
                      <button
                        onClick={() => setDeleteConfirmIds([p.id])}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors -mt-1 -mr-1 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-sm text-slate-500 mb-2">Giá vốn: {formatCurrency(p.cost)}đ</div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-slate-900">Tồn kho: {wq}</div>
                      <div>
                        {wq === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            <AlertCircle className="w-3 h-3" />
                            Hết hàng
                          </span>
                        ) : wq <= 10 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-50 text-red-700 border border-red-100">
                            <AlertCircle className="w-3 h-3" />
                            Sắp hết
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                            Còn hàng
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
