import React, { useState, useRef } from 'react';
import { Product, PriceGroup, ComboItem, PackagingItem } from '../types';
import { X, Upload, Image as ImageIcon, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { uploadProductImage, dataUrlToBlob, processImage } from '../lib/imageUpload';
import { hasSupabaseConfig } from '../lib/supabase';
import { formatCurrency, parseCurrency } from '../lib/format';

interface EditProductModalProps {
  product: Product;
  products: Product[];
  packagingItems: PackagingItem[];
  onClose: () => void;
  onSave: (id: string, updates: Partial<Product>) => void;
}

export default function EditProductModal({ product, products, packagingItems, onClose, onSave }: EditProductModalProps) {
  const [name, setName] = useState(product.name);
  const [cost, setCost] = useState(formatCurrency(product.cost));
  const [retailPrice, setRetailPrice] = useState(formatCurrency(product.retailPrice || ''));
  const [warehouseQuantity, setWarehouseQuantity] = useState(product.warehouseQuantity?.toString() || '0');
  const [materialQuantity, setMaterialQuantity] = useState(product.materialQuantity?.toString() || '0');
  const [priceGroup, setPriceGroup] = useState<PriceGroup>(product.priceGroup);
  const [category, setCategory] = useState<string>(product.category || 'Sản phẩm');
  const [note, setNote] = useState(product.note || '');
  const [isCombo, setIsCombo] = useState(product.isCombo || false);
  const [comboItems, setComboItems] = useState<ComboItem[]>(product.comboItems || []);
  
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  
  const [imageUrl, setImageUrl] = useState(product.imageUrl || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageObjectUrlRef = useRef<string | null>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Support HEIC by checking extension if type is missing or generic
    const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
    
    if (!file.type.startsWith('image/') && !isHeic) {
      setError('Vui lòng chọn file hình ảnh hợp lệ.');
      return;
    }

    setImageProcessing(true);
    try {
      const processed = await processImage(file);
      
      if (imageObjectUrlRef.current) {
        URL.revokeObjectURL(imageObjectUrlRef.current);
      }

      setImageFile(processed as File);
      const objectUrl = URL.createObjectURL(processed);
      imageObjectUrlRef.current = objectUrl;
      setImageUrl(objectUrl);
    } catch (err) {
      console.error('Image processing error:', err);
      setError('Lỗi khi xử lý hình ảnh. Vui lòng thử lại.');
    } finally {
      setImageProcessing(false);
    }
  };

  const handleClipboardPaste = async (clipboardData: DataTransfer | null | undefined) => {
    if (!clipboardData) return false;

    for (const item of clipboardData.items) {
      const isHeic = item.type === 'image/heic' || item.type === 'image/heif';
      if (item.type.startsWith('image/') || isHeic) {
        const file = item.getAsFile();
        if (file) {
          setImageProcessing(true);
          try {
            const processed = await processImage(file);
            
            if (imageObjectUrlRef.current) {
              URL.revokeObjectURL(imageObjectUrlRef.current);
            }
            setImageFile(processed as File);
            const objectUrl = URL.createObjectURL(processed);
            imageObjectUrlRef.current = objectUrl;
            setImageUrl(objectUrl);
            return true;
          } catch (err) {
            console.error('Paste processing error:', err);
            setError('Lỗi khi xử lý hình ảnh dán. Vui lòng thử lại.');
          } finally {
            setImageProcessing(false);
          }
        }
      }
    }
    return false;
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    handleClipboardPaste(e.clipboardData);
  };

  const handleSave = async () => {
    setImageProcessing(true);
    setError('');
    let finalImageUrl = product.imageUrl;

    try {
      const hasDataUrl = imageUrl.startsWith('data:image/');
      const hasRemoteUrl = imageUrl.startsWith('http');
      
      if (imageFile && hasSupabaseConfig) {
        finalImageUrl = await uploadProductImage(product.id, imageFile, imageFile.type || 'application/octet-stream');
      } else if (hasDataUrl && hasSupabaseConfig) {
        const blob = dataUrlToBlob(imageUrl);
        finalImageUrl = await uploadProductImage(product.id, blob, blob.type || 'application/octet-stream');
      } else if (hasRemoteUrl || hasDataUrl) {
        finalImageUrl = imageUrl;
      }

      onSave(product.id, {
        name,
        cost: parseCurrency(cost),
        retailPrice: retailPrice ? parseCurrency(retailPrice) : undefined,
        warehouseQuantity: Number(warehouseQuantity),
        materialQuantity: Number(materialQuantity),
        priceGroup,
        category,
        note,
        imageUrl: finalImageUrl,
        isCombo,
        comboItems: isCombo ? comboItems : undefined
      });
      onClose();
    } catch (err) {
      setError('Lỗi khi lưu sản phẩm. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setImageProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onPaste={handlePaste}>
        <div className="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-slate-800">Chỉnh sửa sản phẩm</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên sản phẩm</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Giá vốn</label>
                  <input
                    type="text"
                    required
                    min="0"
                    value={cost}
                    onChange={(e) => setCost(formatCurrency(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Giá bán lẻ</label>
                  <input
                    type="text"
                    required
                    min="0"
                    value={retailPrice}
                    onChange={(e) => setRetailPrice(formatCurrency(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] sm:text-xs font-medium text-slate-700 mx-1">Kho: Sản phẩm</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={warehouseQuantity}
                    onChange={(e) => setWarehouseQuantity(e.target.value)}
                    disabled={product.isCombo}
                    className="w-full border border-slate-300 rounded-lg px-2 sm:px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] sm:text-xs font-medium text-amber-700 mx-1">Kho: Nguyên vật liệu</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={materialQuantity}
                    onChange={(e) => setMaterialQuantity(e.target.value)}
                    disabled={product.isCombo}
                    className="w-full border border-slate-300 rounded-lg px-2 sm:px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phân loại giá</label>
                  <select
                    value={priceGroup}
                    onChange={(e) => setPriceGroup(e.target.value as PriceGroup)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="Thấp">Thấp</option>
                    <option value="Trung">Trung</option>
                    <option value="Cao">Cao</option>
                    <option value="Cao cấp">Cao cấp</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Danh mục</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="Sản phẩm">Sản phẩm</option>
                    <option value="Nguyên vật liệu">Nguyên vật liệu</option>
                    <option value="Sản phẩm & Nguyên vật liệu">Sản phẩm & Nguyên vật liệu</option>
                    <option value="Bao bì">Bao bì</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={2}
                />
              </div>

              {/* Combo Section */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800">Cấu hình Combo</h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCombo}
                      onChange={(e) => setIsCombo(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-600">Là sản phẩm Combo</span>
                  </label>
                </div>

                {isCombo && (
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Tìm thành phần..."
                          value={itemSearchTerm}
                          onChange={(e) => {
                            setItemSearchTerm(e.target.value);
                            setShowItemDropdown(true);
                          }}
                          onFocus={() => setShowItemDropdown(true)}
                          className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      {showItemDropdown && itemSearchTerm && (
                        <div className="absolute z-20 w-full mt-1 bg-white max-h-48 overflow-y-auto border border-slate-200 rounded-lg shadow-lg divide-y divide-slate-100">
                          {products
                            .filter(p => !p.isCombo && p.id !== product.id && (p.category === 'Nguyên vật liệu' || p.category === 'Sản phẩm & Nguyên vật liệu') && p.name.toLowerCase().includes(itemSearchTerm.toLowerCase()))
                            .map(p => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setComboItems(prev => {
                                    const exists = prev.find(i => i.id === p.id && i.type === 'product');
                                    if (exists) return prev.map(i => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
                                    return [...prev, { type: 'product', id: p.id, quantity: 1 }];
                                  });
                                  setItemSearchTerm('');
                                  setShowItemDropdown(false);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm flex justify-between"
                              >
                                <span>{p.name}</span>
                                <span className="text-slate-400">NVL</span>
                              </button>
                            ))}
                          {packagingItems
                            .filter(p => p.name.toLowerCase().includes(itemSearchTerm.toLowerCase()))
                            .map(p => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setComboItems(prev => {
                                    const exists = prev.find(i => i.id === p.id && i.type === 'packaging');
                                    if (exists) return prev.map(i => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
                                    return [...prev, { type: 'packaging', id: p.id, quantity: 1 }];
                                  });
                                  setItemSearchTerm('');
                                  setShowItemDropdown(false);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm flex justify-between"
                              >
                                <span>{p.name}</span>
                                <span className="text-slate-400">Bao bì</span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {comboItems.map((item, idx) => {
                        const detail = item.type === 'product' 
                          ? products.find(p => p.id === item.id)
                          : packagingItems.find(p => p.id === item.id);
                        
                        if (!detail) return null;

                        return (
                          <div key={`${item.type}-${item.id}`} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                            <div className="flex-1 min-w-0 mr-2">
                              <p className="text-xs font-bold text-slate-800 truncate">{detail.name}</p>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{item.type === 'product' ? 'Nguyên vật liệu' : 'Bao bì'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center border border-slate-300 rounded-md bg-white overflow-hidden">
                                <button 
                                  type="button" 
                                  onClick={() => setComboItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))}
                                  className="px-1.5 py-0.5 hover:bg-slate-100 text-slate-600"
                                >-</button>
                                <span className="px-2 py-0.5 text-xs font-bold min-w-[1.5rem] text-center">{item.quantity}</span>
                                <button 
                                  type="button" 
                                  onClick={() => setComboItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))}
                                  className="px-1.5 py-0.5 hover:bg-slate-100 text-slate-600"
                                >+</button>
                              </div>
                              <button 
                                type="button" 
                                onClick={() => setComboItems(prev => prev.filter(i => !(i.id === item.id && i.type === item.type)))}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {comboItems.length === 0 && (
                        <p className="text-center py-4 text-xs text-slate-400 italic">Chưa có thành phần nào</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hình ảnh (Dán hoặc tải lên)</label>
              <div 
                className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors cursor-pointer relative group h-64 flex flex-col items-center justify-center"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*, .heic, .heif"
                  onChange={handleImageChange}
                />
                
                {imageProcessing ? (
                  <div className="flex flex-col items-center text-slate-500">
                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-3" />
                    <p className="font-medium text-slate-700">Đang xử lý ảnh...</p>
                  </div>
                ) : imageUrl ? (
                  <div className="relative w-full h-full">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <span className="text-white font-medium flex items-center gap-2">
                        <Upload className="w-5 h-5" /> Thay đổi ảnh
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-slate-500">
                    <ImageIcon className="w-12 h-12 mb-3 text-slate-400" />
                    <p className="font-medium text-slate-700">Click hoặc dán ảnh (Ctrl+V)</p>
                    <p className="text-sm mt-1">Hỗ trợ PNG, JPG, WEBP, HEIC</p>
                  </div>
                )}
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Hoặc nhập URL ảnh</label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-xl sticky bottom-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium transition-colors"
            disabled={imageProcessing}
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={imageProcessing}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {imageProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              'Lưu thay đổi'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
