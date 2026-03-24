import React, { useState, useRef, useEffect } from 'react';
import { Product, PackagingItem, ComboItem, Transaction } from '../types';
import { PackagePlus, Search, Plus, Trash2, X, Upload, Image as ImageIcon, CheckCircle2, AlertCircle, Edit2 } from 'lucide-react';
import { formatCurrency, parseCurrency } from '../lib/format';
import { uploadProductImage, dataUrlToBlob, processImage } from '../lib/imageUpload';
import { v4 as uuidv4 } from 'uuid';
import { hasSupabaseConfig } from '../lib/supabase';

interface ComboTabProps {
  products: Product[];
  packagingItems: PackagingItem[];
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  updatePackagingItem: (id: string, updates: Partial<PackagingItem>) => Promise<{ error: any } | { error: null }>;
  addTransaction: (transaction: Transaction) => Promise<void>;
  setNotification: (notif: { type: 'success' | 'error', message: string } | null) => void;
}

export default function ComboTab({
  products,
  packagingItems,
  addProduct,
  updateProduct,
  updatePackagingItem,
  addTransaction,
  setNotification
}: ComboTabProps) {
  const [comboName, setComboName] = useState('');
  const [comboQuantity, setComboQuantity] = useState('1');
  const [comboItems, setComboItems] = useState<ComboItem[]>([]);
  const [comboMargin, setComboMargin] = useState('');
  const [comboPrice, setComboPrice] = useState('');
  const [comboImageUrl, setComboImageUrl] = useState('');
  const [comboImageFile, setComboImageFile] = useState<File | null>(null);
  const [comboImageProcessing, setComboImageProcessing] = useState(false);
  
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [itemSearchTerm, setItemSearchTerm] = useState('');

  const comboImageObjectUrlRef = useRef<string | null>(null);
  const comboFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (comboImageObjectUrlRef.current) URL.revokeObjectURL(comboImageObjectUrlRef.current);
    };
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setComboImageProcessing(true);
    try {
      const processed = await processImage(file);
      setComboImageFile(processed as File);
      if (comboImageObjectUrlRef.current) URL.revokeObjectURL(comboImageObjectUrlRef.current);
      const objectUrl = URL.createObjectURL(processed);
      comboImageObjectUrlRef.current = objectUrl;
      setComboImageUrl(objectUrl);
    } catch (err) {
      console.error('Image processing error:', err);
    } finally {
      setComboImageProcessing(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    for (const item of clipboardData.items) {
      const isHeic = item.type === 'image/heic' || item.type === 'image/heif';
      if (item.type.startsWith('image/') || isHeic) {
        const file = item.getAsFile();
        if (file) {
          setComboImageProcessing(true);
          try {
            const processed = await processImage(file);
            setComboImageFile(processed as File);
            if (comboImageObjectUrlRef.current) URL.revokeObjectURL(comboImageObjectUrlRef.current);
            const objectUrl = URL.createObjectURL(processed);
            comboImageObjectUrlRef.current = objectUrl;
            setComboImageUrl(objectUrl);
          } catch (err) {
            console.error('Paste processing error:', err);
          } finally {
            setComboImageProcessing(false);
          }
        }
      }
    }
  };

  const filteredProducts = products.filter(p => !p.isCombo && p.name.toLowerCase().includes(itemSearchTerm.toLowerCase()));
  const filteredPackaging = packagingItems.filter(p => p.name.toLowerCase().includes(itemSearchTerm.toLowerCase()));

  const addItem = (type: 'product' | 'packaging', id: string) => {
    setComboItems(prev => {
      const existing = prev.find(i => i.type === type && i.id === id);
      if (existing) {
        return prev.map(i => i.type === type && i.id === id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { type, id, quantity: 1 }];
    });
    setItemSearchTerm('');
    setShowItemDropdown(false);
  };

  const updateItemQuantity = (type: 'product' | 'packaging', id: string, delta: number) => {
    setComboItems(prev => prev.map(i => {
      if (i.type === type && i.id === id) {
        const newQ = i.quantity + delta;
        return newQ > 0 ? { ...i, quantity: newQ } : i;
      }
      return i;
    }));
  };

  const removeItem = (type: 'product' | 'packaging', id: string) => {
    setComboItems(prev => prev.filter(i => !(i.type === type && i.id === id)));
  };

  const totalCost = comboItems.reduce((sum, item) => {
    if (item.type === 'product') {
      const p = products.find(p => p.id === item.id);
      return sum + (p ? p.cost * item.quantity : 0);
    } else {
      const p = packagingItems.find(p => p.id === item.id);
      return sum + (p ? p.price * item.quantity : 0);
    }
  }, 0);

  const handleMarginChange = (val: string) => {
    setComboMargin(val);
    if (val && !isNaN(Number(val))) {
      const margin = Number(val);
      const price = totalCost * (1 + margin / 100);
      setComboPrice(formatCurrency(Math.round(price)));
    } else {
      setComboPrice('');
    }
  };

  const handlePriceChange = (val: string) => {
    const formatted = formatCurrency(val);
    setComboPrice(formatted);
    const parsedPrice = parseCurrency(formatted);
    if (parsedPrice > 0 && totalCost > 0) {
      const margin = ((parsedPrice - totalCost) / totalCost) * 100;
      setComboMargin(margin.toFixed(2));
    } else {
      setComboMargin('');
    }
  };

  const generateComboBarcode = (margin: number) => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomLetter = letters[Math.floor(Math.random() * letters.length)];
    const marginStr = Math.abs(Math.round(margin)).toString().padStart(3, '0').slice(-3);
    const randomPrefix = Math.floor(100000 + Math.random() * 900000).toString();
    return `${randomPrefix}${randomLetter}${marginStr}`;
  };

  const handleCreateCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comboName || comboItems.length === 0 || !comboQuantity || !comboPrice) {
      setNotification({ type: 'error', message: 'Vui lòng điền đầy đủ thông tin và thêm ít nhất 1 thành phần.' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    const numQuantity = Number(comboQuantity);
    if (numQuantity <= 0) {
      setNotification({ type: 'error', message: 'Số lượng phải lớn hơn 0.' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    // Check inventory
    for (const item of comboItems) {
      const required = item.quantity * numQuantity;
      if (item.type === 'product') {
        const p = products.find(p => p.id === item.id);
        if (!p || (p.warehouseQuantity || 0) < required) {
          setNotification({ type: 'error', message: `Không đủ tồn kho cho sản phẩm: ${p?.name || item.id}` });
          setTimeout(() => setNotification(null), 3000);
          return;
        }
      } else {
        const p = packagingItems.find(p => p.id === item.id);
        if (!p || p.quantity < required) {
          setNotification({ type: 'error', message: `Không đủ tồn kho cho bao bì: ${p?.name || item.id}` });
          setTimeout(() => setNotification(null), 3000);
          return;
        }
      }
    }

    const comboId = uuidv4();
    let finalImageUrl = '';

    if (comboImageFile) {
      if (!hasSupabaseConfig) {
        setNotification({ type: 'error', message: 'Chưa kết nối Supabase nên không thể lưu ảnh.' });
        setTimeout(() => setNotification(null), 3000);
        return;
      }
      try {
        setComboImageProcessing(true);
        finalImageUrl = await uploadProductImage(comboId, comboImageFile, comboImageFile.type || 'application/octet-stream');
      } catch {
        setNotification({ type: 'error', message: 'Tải ảnh lên thất bại.' });
        setTimeout(() => setNotification(null), 3000);
        return;
      } finally {
        setComboImageProcessing(false);
      }
    } else if (comboImageUrl) {
      finalImageUrl = comboImageUrl;
    } else {
      finalImageUrl = 'https://picsum.photos/seed/' + encodeURIComponent(comboName) + '/200/200';
    }

    const marginNum = Number(comboMargin) || 0;
    const barcode = generateComboBarcode(marginNum);

    const newCombo: Product = {
      id: comboId,
      name: comboName,
      cost: totalCost,
      retailPrice: parseCurrency(comboPrice),
      margin: marginNum,
      imageUrl: finalImageUrl,
      priceGroup: 'Trung',
      warehouseQuantity: numQuantity,
      isCombo: true,
      comboItems: comboItems,
      barcode: barcode
    };

    // Deduct inventory
    for (const item of comboItems) {
      const deductAmount = item.quantity * numQuantity;
      if (item.type === 'product') {
        const p = products.find(p => p.id === item.id);
        if (p) {
          await updateProduct(p.id, { warehouseQuantity: (p.warehouseQuantity || 0) - deductAmount });
        }
      } else {
        const p = packagingItems.find(p => p.id === item.id);
        if (p) {
          await updatePackagingItem(p.id, { quantity: p.quantity - deductAmount });
        }
      }
    }

    await addProduct(newCombo);

    await addTransaction({
      id: uuidv4(),
      type: 'OUT',
      category: 'OTHER',
      amount: 0, // Set to 0 to avoid double-counting costs
      description: `Tạo Combo: ${numQuantity} x ${comboName}`,
      date: new Date().toISOString(),
      items: [{ productId: comboId, quantity: numQuantity }]
    });

    setNotification({ type: 'success', message: 'Tạo Combo thành công!' });
    setTimeout(() => setNotification(null), 3000);

    // Reset
    setComboName('');
    setComboQuantity('1');
    setComboItems([]);
    setComboMargin('');
    setComboPrice('');
    setComboImageUrl('');
    setComboImageFile(null);
    if (comboFileInputRef.current) comboFileInputRef.current.value = '';
    if (comboImageObjectUrlRef.current) URL.revokeObjectURL(comboImageObjectUrlRef.current);
    comboImageObjectUrlRef.current = null;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6">
        <form onSubmit={handleCreateCombo} className="space-y-6 max-w-3xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Tên Combo</label>
                <input
                  type="text"
                  required
                  value={comboName}
                  onChange={(e) => setComboName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="VD: Combo Bút Pastel + Sổ tay..."
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Số lượng tạo</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={comboQuantity}
                  onChange={(e) => setComboQuantity(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="space-y-2 relative">
                <label className="block text-sm font-medium text-slate-700">Thêm thành phần</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm sản phẩm lẻ hoặc bao bì..."
                    value={itemSearchTerm}
                    onChange={(e) => {
                      setItemSearchTerm(e.target.value);
                      setShowItemDropdown(true);
                    }}
                    onFocus={() => setShowItemDropdown(true)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                {showItemDropdown && itemSearchTerm && (
                  <div className="absolute z-10 w-full mt-1 bg-white max-h-60 overflow-y-auto border border-slate-200 rounded-lg shadow-lg divide-y divide-slate-100">
                    {filteredProducts.length > 0 && (
                      <div className="p-2 bg-slate-50 text-xs font-bold text-slate-500 uppercase">Sản phẩm lẻ</div>
                    )}
                    {filteredProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addItem('product', p.id)}
                        className="w-full text-left px-4 py-2 hover:bg-indigo-50 flex justify-between items-center"
                      >
                        <span className="font-medium text-slate-900">{p.name}</span>
                        <span className="text-sm text-slate-500">Tồn: {p.warehouseQuantity || 0}</span>
                      </button>
                    ))}
                    {filteredPackaging.length > 0 && (
                      <div className="p-2 bg-slate-50 text-xs font-bold text-slate-500 uppercase">Bao bì</div>
                    )}
                    {filteredPackaging.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addItem('packaging', p.id)}
                        className="w-full text-left px-4 py-2 hover:bg-indigo-50 flex justify-between items-center"
                      >
                        <span className="font-medium text-slate-900">{p.name}</span>
                        <span className="text-sm text-slate-500">Tồn: {p.quantity}</span>
                      </button>
                    ))}
                    {filteredProducts.length === 0 && filteredPackaging.length === 0 && (
                      <div className="px-4 py-3 text-sm text-slate-500 text-center">Không tìm thấy kết quả</div>
                    )}
                  </div>
                )}
              </div>

              {comboItems.length > 0 && (
                <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <h4 className="text-sm font-bold text-slate-700">Thành phần Combo:</h4>
                  {comboItems.map((item, idx) => {
                    const isProd = item.type === 'product';
                    const detail = isProd ? products.find(p => p.id === item.id) : packagingItems.find(p => p.id === item.id);
                    if (!detail) return null;
                    const cost = isProd ? (detail as Product).cost : (detail as PackagingItem).price;
                    
                    return (
                      <div key={`${item.type}-${item.id}`} className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900 line-clamp-1">{detail.name}</div>
                          <div className="text-xs text-slate-500">{formatCurrency(cost)} / cái</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden">
                            <button type="button" onClick={() => updateItemQuantity(item.type, item.id, -1)} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600">-</button>
                            <span className="px-2 py-1 text-sm font-medium min-w-[2rem] text-center">{item.quantity}</span>
                            <button type="button" onClick={() => updateItemQuantity(item.type, item.id, 1)} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600">+</button>
                          </div>
                          <button type="button" onClick={() => removeItem(item.type, item.id)} className="text-red-500 hover:text-red-700 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-2 flex justify-between items-center border-t border-slate-200 mt-2">
                    <span className="text-sm font-medium text-slate-700">Tổng vốn 1 Combo:</span>
                    <span className="font-bold text-indigo-600">{formatCurrency(totalCost)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Ảnh Combo</label>
                <div className="flex items-start gap-4">
                  <div 
                    className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center bg-slate-50 overflow-hidden relative group cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onClick={() => comboFileInputRef.current?.click()}
                    onPaste={handlePaste}
                    tabIndex={0}
                    title="Click để chọn ảnh hoặc dán ảnh (Ctrl+V) vào đây"
                  >
                    {comboImageUrl ? (
                      <>
                        <img src={comboImageUrl} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Edit2 className="w-6 h-6 text-white" />
                        </div>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-xs text-slate-500 font-medium">Tải ảnh lên</span>
                      </>
                    )}
                    {comboImageProcessing && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      ref={comboFileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => comboFileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Chọn file ảnh
                    </button>
                    <p className="text-xs text-slate-500">
                      Hỗ trợ JPG, PNG, WEBP. Kích thước tối đa 5MB.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">% Lợi nhuận</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={comboMargin}
                      onChange={(e) => handleMarginChange(e.target.value)}
                      className="w-full pr-8 pl-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="VD: 30"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Giá bán</label>
                  <input
                    type="text"
                    value={comboPrice}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0 VNĐ"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              disabled={comboImageProcessing}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <PackagePlus className="w-5 h-5" />
              Tạo Combo
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Danh sách Combo đã tạo</h2>
        {products.filter(p => p.isCombo).length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <PackagePlus className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p>Chưa có Combo nào được tạo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.filter(p => p.isCombo).map(combo => (
              <div key={combo.id} className="border border-slate-200 rounded-xl p-4 flex gap-4 bg-slate-50">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-white border border-slate-200 flex-shrink-0">
                  {combo.imageUrl ? (
                    <img src={combo.imageUrl} alt={combo.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100">
                      <ImageIcon className="w-8 h-8 text-slate-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 line-clamp-1" title={combo.name}>{combo.name}</h3>
                  <div className="text-sm text-slate-500 mt-1">
                    SL trong kho: <span className="font-medium text-slate-700">{combo.warehouseQuantity || 0}</span>
                  </div>
                  <div className="text-sm text-slate-500">
                    Giá bán: <span className="font-medium text-indigo-600">{formatCurrency(combo.retailPrice || 0)}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Mã: {combo.barcode || 'N/A'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
