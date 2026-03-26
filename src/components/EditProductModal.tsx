import React, { useState, useRef } from 'react';
import { Product, PriceGroup } from '../types';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { uploadProductImage, dataUrlToBlob, processImage } from '../lib/imageUpload';
import { hasSupabaseConfig } from '../lib/supabase';
import { formatCurrency, parseCurrency } from '../lib/format';

interface EditProductModalProps {
  product: Product;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Product>) => void;
}

export default function EditProductModal({ product, onClose, onSave }: EditProductModalProps) {
  const [name, setName] = useState(product.name);
  const [cost, setCost] = useState(formatCurrency(product.cost));
  const [retailPrice, setRetailPrice] = useState(formatCurrency(product.retailPrice || ''));
  const [warehouseQuantity, setWarehouseQuantity] = useState(product.warehouseQuantity?.toString() || '0');
  const [quantity, setQuantity] = useState(product.quantity.toString());
  const [priceGroup, setPriceGroup] = useState<PriceGroup>(product.priceGroup);
  const [note, setNote] = useState(product.note || '');
  
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
        quantity: Number(quantity),
        priceGroup,
        note,
        imageUrl: finalImageUrl,
        isCombo: product.isCombo,
        comboItems: product.comboItems
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
                    value={cost}
                    onChange={(e) => setCost(formatCurrency(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Giá bán lẻ</label>
                  <input
                    type="text"
                    value={retailPrice}
                    onChange={(e) => setRetailPrice(formatCurrency(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">SL trong kho</label>
                  <input
                    type="number"
                    value={warehouseQuantity}
                    onChange={(e) => setWarehouseQuantity(e.target.value)}
                    disabled={product.isCombo}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">SL trong bể</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    disabled={product.isCombo}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phân loại</label>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  rows={2}
                />
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
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
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
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors flex items-center gap-2"
          >
            {imageProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
