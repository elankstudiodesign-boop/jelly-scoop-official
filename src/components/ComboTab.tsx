import React, { useState, useRef, useEffect } from 'react';
import { Product, PackagingItem, ComboItem, Transaction } from '../types';
import { PackagePlus, Search, Plus, Trash2, X, Upload, Image as ImageIcon, CheckCircle2, AlertCircle, Edit2, RefreshCw, Printer, Download } from 'lucide-react';
import { formatCurrency, parseCurrency, generateBarcodeNumber } from '../lib/format';
import { uploadProductImage, dataUrlToBlob, processImage } from '../lib/imageUpload';
import { v4 as uuidv4 } from 'uuid';
import { hasSupabaseConfig } from '../lib/supabase';
import BarcodePrintModal, { PrintItem } from './BarcodePrintModal';
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';

const downloadBarcode = (product: Product) => {
  const barcodeValue = product.barcode ? product.barcode : generateBarcodeNumber(product.id);
  const canvas = document.createElement('canvas');
  
  // Standard label size: 40x30mm at 300 DPI (472x354)
  canvas.width = 472;
  canvas.height = 354;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Optional: Draw rounded border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(2, 2, canvas.width - 4, canvas.height - 4, 20);
    ctx.stroke();
  } else {
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  }

  // Top Left: Product Name
  ctx.fillStyle = '#1e293b';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  let fontSize = 28;
  ctx.font = `bold ${fontSize}px "Inter", Arial, sans-serif`;
  let name = product.name;
  
  while (ctx.measureText(name + '...').width > 412 && name.length > 0) {
    name = name.slice(0, -1);
  }
  if (name !== product.name) name += '...';
  
  ctx.fillText(name, 30, 25);

  // Middle: Price Block
  const yellowY = 70;
  const yellowHeight = 130;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(20, yellowY, 432, yellowHeight, 16);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(20, yellowY, 432, yellowHeight);
    ctx.strokeRect(20, yellowY, 432, yellowHeight);
  }

  // Price
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const priceText = product.retailPrice ? `${formatCurrency(product.retailPrice)} VNĐ` : 'Liên hệ';
  
  let priceFontSize = 80;
  ctx.font = `bold ${priceFontSize}px "Inter", Arial, sans-serif`;
  while (ctx.measureText(priceText).width > 382 && priceFontSize > 20) {
    priceFontSize -= 2;
    ctx.font = `bold ${priceFontSize}px "Inter", Arial, sans-serif`;
  }
  ctx.fillText(priceText, canvas.width / 2, yellowY + yellowHeight / 2);

  // Bottom: Barcode
  const barcodeCanvas = document.createElement('canvas');
  JsBarcode(barcodeCanvas, barcodeValue, {
    format: "CODE128",
    width: 3,
    height: 80,
    displayValue: true,
    fontSize: 24,
    textMargin: 6,
    margin: 0,
    font: '"Inter", Arial, sans-serif'
  });

  const bcWidth = barcodeCanvas.width;
  const bcHeight = barcodeCanvas.height;
  let scale = 1;
  if (bcWidth > 412) scale = 412 / bcWidth;
  const drawWidth = bcWidth * scale;
  const drawHeight = bcHeight * scale;
  const x = (canvas.width - drawWidth) / 2;
  const y = 220;
  ctx.drawImage(barcodeCanvas, x, y, drawWidth, drawHeight);

  // Download as PDF
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [canvas.width, canvas.height]
  });
  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
  pdf.save(`barcode-combo-${product.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
};

interface ComboTabProps {
  products: Product[];
  packagingItems: PackagingItem[];
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  updatePackagingItem: (id: string, updates: Partial<PackagingItem>) => Promise<void>;
  addTransaction: (transaction: Transaction) => Promise<void>;
  setNotification: (notif: { type: 'success' | 'error', message: string } | null) => void;
}

export default function ComboTab({
  products,
  packagingItems,
  addProduct,
  updateProduct,
  deleteProduct,
  updatePackagingItem,
  addTransaction,
  setNotification
}: ComboTabProps) {
  const [comboName, setComboName] = useState('');
  const [comboQuantity, setComboQuantity] = useState('1');
  const [comboItems, setComboItems] = useState<ComboItem[]>([]);
  const [comboMargin, setComboMargin] = useState('');
  const [comboPrice, setComboPrice] = useState('');
  const [comboBarcode, setComboBarcode] = useState('');
  const [comboImageUrl, setComboImageUrl] = useState('');
  const [comboImageFile, setComboImageFile] = useState<File | null>(null);
  const [comboImageProcessing, setComboImageProcessing] = useState(false);
  
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [itemSearchTerm, setItemSearchTerm] = useState('');

  const [selectedCombos, setSelectedCombos] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [printItems, setPrintItems] = useState<PrintItem[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
  const comboProducts = products.filter(p => p.isCombo);

  const toggleSelected = (id: string) => {
    const newSelected = new Set(selectedCombos);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCombos(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedCombos.size === comboProducts.length) {
      setSelectedCombos(new Set());
    } else {
      setSelectedCombos(new Set(comboProducts.map(p => p.id)));
    }
  };

  const handlePrintBarcodes = () => {
    const itemsToPrint: PrintItem[] = Array.from(selectedCombos).map(id => {
      const item = products.find(i => i.id === id);
      if (!item) return null;
      return {
        id: item.id,
        name: item.name,
        price: item.retailPrice || item.cost || 0,
        barcode: item.barcode || '',
        quantity: item.warehouseQuantity && item.warehouseQuantity > 0 ? item.warehouseQuantity : 1
      };
    }).filter(Boolean) as PrintItem[];
    
    if (itemsToPrint.length > 0) {
      setPrintItems(itemsToPrint);
      setShowBarcodeModal(true);
    }
  };

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
    // Ưu tiên lấy barcode từ ô nhập liệu (comboBarcode), nếu trống mới tự tạo
    const finalBarcode = comboBarcode.trim() || generateComboBarcode(marginNum);

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
      barcode: finalBarcode
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
    setComboBarcode('');
    setComboImageUrl('');
    setComboImageFile(null);
    if (comboFileInputRef.current) comboFileInputRef.current.value = '';
    if (comboImageObjectUrlRef.current) URL.revokeObjectURL(comboImageObjectUrlRef.current);
    comboImageObjectUrlRef.current = null;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 sm:p-6">
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
                      accept="image/*, .heic, .heif"
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
                      Hỗ trợ JPG, PNG, WEBP, HEIC. Kích thước tối đa 5MB.
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

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Mã Barcode</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={comboBarcode}
                    onChange={(e) => setComboBarcode(e.target.value)}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Nhập hoặc tạo ngẫu nhiên..."
                  />
                  <button
                    type="button"
                    onClick={() => setComboBarcode(generateComboBarcode(Number(comboMargin) || 0))}
                    className="px-3 py-2 bg-slate-100 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors"
                    title="Tạo mã ngẫu nhiên"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
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

      <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm mt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Danh sách Combo đã tạo</h2>
          <div className="flex items-center gap-3">
            {isSelectionMode && selectedCombos.size > 0 && (
              <button
                type="button"
                onClick={handlePrintBarcodes}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors border border-indigo-200 text-indigo-700 hover:bg-indigo-50 flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                In mã vạch ({selectedCombos.size})
              </button>
            )}
            {isSelectionMode ? (
              <>
                <label className="flex items-center gap-2 text-sm text-slate-600 select-none">
                  <input
                    type="checkbox"
                    checked={selectedCombos.size === comboProducts.length && comboProducts.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Chọn tất cả
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsSelectionMode(false);
                    setSelectedCombos(new Set());
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Hủy chọn
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsSelectionMode(true)}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Chọn
              </button>
            )}
          </div>
        </div>
        {comboProducts.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <PackagePlus className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p>Chưa có Combo nào được tạo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comboProducts.map(combo => (
              <div key={combo.id} className="border border-slate-200 rounded-xl p-3 sm:p-4 flex gap-3 sm:gap-4 bg-slate-50 relative">
                {isSelectionMode && (
                  <div className="absolute top-2 right-2 z-10">
                    <input
                      type="checkbox"
                      checked={selectedCombos.has(combo.id)}
                      onChange={() => toggleSelected(combo.id)}
                      className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                )}
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
                  
                  {/* Display Combo Items */}
                  {combo.comboItems && combo.comboItems.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Thành phần:</p>
                      <div className="flex flex-wrap gap-1">
                        {combo.comboItems.map((item, idx) => {
                          const isProd = item.type === 'product';
                          const detail = isProd ? products.find(p => p.id === item.id) : packagingItems.find(p => p.id === item.id);
                          if (!detail) return null;
                          return (
                            <span key={idx} className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <span className="truncate max-w-[60px]">{detail.name}</span>
                              <span className="font-bold">x{item.quantity}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => downloadBarcode(combo)}
                      className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors"
                      title="Tải mã vạch về máy"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Mã vạch
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(combo.id)}
                      className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showBarcodeModal && (
        <BarcodePrintModal
          initialItems={printItems}
          onClose={() => setShowBarcodeModal(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Xác nhận xóa sản phẩm</h3>
              <p className="text-slate-500">
                Bạn có chắc chắn muốn xóa sản phẩm này không? Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  deleteProduct(deleteConfirmId);
                  setDeleteConfirmId(null);
                  setNotification({ type: 'success', message: 'Đã xóa Combo thành công!' });
                  setTimeout(() => setNotification(null), 3000);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
              >
                Xóa sản phẩm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
