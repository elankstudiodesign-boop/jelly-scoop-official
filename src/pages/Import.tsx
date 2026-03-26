import React, { useEffect, useRef, useState } from 'react';
import { Product, Transaction, PriceGroup, Supplier, PackagingItem } from '../types';
import { PackagePlus, Search, AlertCircle, Trash2, X, CheckCircle2, Upload, Image as ImageIcon, Edit2, Barcode, Truck, Plus, Phone, MapPin, User, Archive, Download } from 'lucide-react';
import { formatCurrency, parseCurrency, generateBarcodeNumber } from '../lib/format';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import { uploadProductImage, dataUrlToBlob, processImage } from '../lib/imageUpload';
import EditProductModal from '../components/EditProductModal';
import ComboTab from '../components/ComboTab';
import BarcodePrintModal, { PrintItem } from '../components/BarcodePrintModal';
import { v4 as uuidv4 } from 'uuid';
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

  // Optional: Draw rounded border for the whole label
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
  ctx.fillStyle = '#1e293b'; // slate-800
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  let fontSize = 28;
  ctx.font = `bold ${fontSize}px "Inter", Arial, sans-serif`;
  let name = product.name;
  
  // Truncate product name if too long
  while (ctx.measureText(name + '...').width > 412 && name.length > 0) {
    name = name.slice(0, -1);
  }
  if (name !== product.name) name += '...';
  
  ctx.fillText(name, 30, 25);

  // Middle: White Block with Black Border
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
  if (bcWidth > 412) {
    scale = 412 / bcWidth;
  }
  
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
  pdf.save(`barcode-${product.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
};

const downloadPackagingBarcode = (item: PackagingItem) => {
  const canvas = document.createElement('canvas');
  // Standard label size: 40x30mm at 300 DPI (472x354)
  canvas.width = 472;
  canvas.height = 354;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Optional: Draw rounded border for the whole label
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
  ctx.fillStyle = '#1e293b'; // slate-800
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  let fontSize = 28;
  ctx.font = `bold ${fontSize}px "Inter", Arial, sans-serif`;
  let name = item.name;
  
  // Truncate product name if too long
  while (ctx.measureText(name + '...').width > 412 && name.length > 0) {
    name = name.slice(0, -1);
  }
  if (name !== item.name) name += '...';
  
  ctx.fillText(name, 30, 25);

  // Middle: White Block with Black Border
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
  const priceText = item.price ? `${formatCurrency(item.price)} VNĐ` : 'Liên hệ';
  
  let priceFontSize = 80;
  ctx.font = `bold ${priceFontSize}px "Inter", Arial, sans-serif`;
  while (ctx.measureText(priceText).width > 382 && priceFontSize > 20) {
    priceFontSize -= 2;
    ctx.font = `bold ${priceFontSize}px "Inter", Arial, sans-serif`;
  }
  ctx.fillText(priceText, canvas.width / 2, yellowY + yellowHeight / 2);

  // Bottom: Barcode
  const barcodeCanvas = document.createElement('canvas');
  JsBarcode(barcodeCanvas, item.barcode, {
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
  if (bcWidth > 412) {
    scale = 412 / bcWidth;
  }
  
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
  pdf.save(`barcode-packaging-${item.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
};

interface ImportProps {
  products: Product[];
  transactions: Transaction[];
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  addTransaction: (transaction: Transaction) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  suppliers: Supplier[];
  addSupplier: (supplier: Supplier) => Promise<void>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  packagingItems: PackagingItem[];
  addPackagingItem: (item: PackagingItem) => Promise<void>;
  updatePackagingItem: (id: string, updates: Partial<PackagingItem>) => Promise<void>;
  deletePackagingItem: (id: string) => Promise<void>;
}

export default function Import({ 
  products, 
  transactions,
  addProduct, 
  updateProduct, 
  addTransaction, 
  deleteProduct,
  suppliers,
  addSupplier,
  updateSupplier,
  deleteSupplier,
  packagingItems,
  addPackagingItem,
  updatePackagingItem,
  deletePackagingItem
}: ImportProps) {
  const [activeTab, setActiveTab] = useState<'import' | 'suppliers' | 'packaging' | 'combo'>('import');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const imageDropzoneRef = useRef<HTMLDivElement>(null);
  const imageObjectUrlRef = useRef<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [inventorySearchTerm, setInventorySearchTerm] = useState('');
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [printItems, setPrintItems] = useState<PrintItem[]>([]);

  const handlePrintBarcodes = () => {
    const itemsToPrint: PrintItem[] = Array.from(selectedIds).map(id => {
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

  // Supplier Form State
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [supplierNote, setSupplierNote] = useState('');
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [selectedSupplierForDetail, setSelectedSupplierForDetail] = useState<Supplier | null>(null);
  const [assigningSupplierForProductId, setAssigningSupplierForProductId] = useState<string | null>(null);
  const [modalSupplierId, setModalSupplierId] = useState<string>('');

  // Packaging Form State
  const [packagingName, setPackagingName] = useState('');
  const [packagingPrice, setPackagingPrice] = useState('');
  const [packagingQuantity, setPackagingQuantity] = useState('');
  const [packagingBarcode, setPackagingBarcode] = useState('');
  const [editingPackagingId, setEditingPackagingId] = useState<string | null>(null);
  const [showPackagingForm, setShowPackagingForm] = useState(false);

  const openAssignModal = (productId: string) => {
    const p = products.find(prod => prod.id === productId);
    setModalSupplierId(p?.supplierId || '');
    setAssigningSupplierForProductId(productId);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exactMatch = products.find(p => p.name.toLowerCase() === searchTerm.toLowerCase());
  const isNewProduct = searchTerm.trim().length > 0 && !exactMatch;

  const selectedProduct = products.find(p => p.id === selectedProductId);

  // Sync form state with selected product if it changes in the background (e.g. via modal)
  useEffect(() => {
    if (selectedProduct && !searchTerm.includes(selectedProduct.name)) {
      // If the search term doesn't match the selected product anymore, reset
      setSelectedProductId('');
    } else if (selectedProduct) {
      // Sync supplier if it changed
      if (selectedProduct.supplierId !== undefined && selectedProduct.supplierId !== selectedSupplierId) {
        setSelectedSupplierId(selectedProduct.supplierId || '');
      }
    }
  }, [selectedProduct, selectedSupplierId, searchTerm]);

  // Auto-fill form when exact match is found but not explicitly selected
  useEffect(() => {
    if (exactMatch && !selectedProductId && searchTerm === exactMatch.name) {
      setUnitCost(formatCurrency(exactMatch.cost));
      setNote(exactMatch.note || '');
      setSelectedSupplierId(exactMatch.supplierId || '');
      setImageUrl(exactMatch.imageUrl || '');
      setSelectedProductId(exactMatch.id);
    }
  }, [exactMatch, selectedProductId, searchTerm]);

  const priceGroupFromUnitCost = (cost: number): PriceGroup => {
    if (cost < 5000) return 'Thấp';
    if (cost < 13000) return 'Trung';
    if (cost <= 20000) return 'Cao';
    return 'Cao cấp';
  };

  const setImagePreviewFromFile = (file: File | Blob) => {
    if (imageObjectUrlRef.current) URL.revokeObjectURL(imageObjectUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    imageObjectUrlRef.current = objectUrl;
    setImageUrl(objectUrl);
  };

  const handleClipboardPaste = async (clipboardData: DataTransfer | null | undefined) => {
    if (!clipboardData) return false;

    const items = clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const isHeic = items[i].type === 'image/heic' || items[i].type === 'image/heif';
      if (items[i].type.includes('image') || isHeic) {
        const file = items[i].getAsFile();
        if (!file) continue;
        
        setImageProcessing(true);
        try {
          const processed = await processImage(file);
          setImageFile(processed as File);
          setImagePreviewFromFile(processed);
          return true;
        } catch (err) {
          console.error('Paste processing error:', err);
        } finally {
          setImageProcessing(false);
        }
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImageProcessing(true);
    try {
      const processed = await processImage(file);
      setImageFile(processed as File);
      setImagePreviewFromFile(processed);
    } catch (err) {
      console.error('Image processing error:', err);
    } finally {
      setImageProcessing(false);
    }
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

    const finalSupplierId = selectedSupplierId || (productToUpdate?.supplierId) || null;

    if (productToUpdate) {
      // Update existing product
      const newWarehouseQuantity = (productToUpdate.warehouseQuantity || 0) + numQuantity;
      const updates: Partial<Product> = {
        warehouseQuantity: newWarehouseQuantity,
        cost: numUnitCost,
        priceGroup: derivedPriceGroup,
        note: note,
        supplierId: finalSupplierId
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
        note: note,
        supplierId: finalSupplierId || undefined
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
      date: new Date().toISOString(),
      items: [{ productId: productToUpdate ? productToUpdate.id : productIdForImage, quantity: numQuantity }],
      supplierId: finalSupplierId || undefined
    });

    // Reset form
    setSelectedProductId('');
    setSelectedSupplierId('');
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

  const handleDeleteMany = async (ids: string[]) => {
    const productUpdates: Record<string, number> = {};
    const packagingUpdates: Record<string, number> = {};

    for (const id of ids) {
      const product = products.find(p => p.id === id);
      if (product && product.isCombo && product.comboItems) {
        // Accumulate inventory restoration for combo components
        for (const item of product.comboItems) {
          const required = item.quantity * ((product.warehouseQuantity || 0) + (product.quantity || 0));
          if (required > 0) {
            if (item.type === 'product') {
              productUpdates[item.id] = (productUpdates[item.id] || 0) + required;
            } else {
              packagingUpdates[item.id] = (packagingUpdates[item.id] || 0) + required;
            }
          }
        }
      }
    }

    // Apply accumulated updates
    for (const [id, amount] of Object.entries(productUpdates)) {
      const p = products.find(p => p.id === id);
      if (p) {
        await updateProduct(id, { warehouseQuantity: (p.warehouseQuantity || 0) + amount });
      }
    }

    for (const [id, amount] of Object.entries(packagingUpdates)) {
      const p = packagingItems.find(p => p.id === id);
      if (p) {
        await updatePackagingItem(id, { quantity: p.quantity + amount });
      }
    }

    for (const id of ids) {
      await deleteProduct(id);
    }
    
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
  const visibleInventoryIds = products
    .filter(p => 
      p.name.toLowerCase().includes(inventorySearchTerm.toLowerCase()) ||
      (p.note && p.note.toLowerCase().includes(inventorySearchTerm.toLowerCase()))
    )
    .map(p => p.id);

  const selectedVisibleCount = visibleInventoryIds.filter(id => selectedIds.has(id)).length;
  const allSelected = visibleInventoryIds.length > 0 && selectedVisibleCount === visibleInventoryIds.length;
  const someSelected = selectedVisibleCount > 0 && !allSelected;

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        visibleInventoryIds.forEach(id => next.delete(id));
      } else {
        visibleInventoryIds.forEach(id => next.add(id));
      }
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

  const handleSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName) return;

    if (editingSupplierId) {
      updateSupplier(editingSupplierId, {
        name: supplierName,
        phone: supplierPhone,
        address: supplierAddress,
        note: supplierNote,
      });
      setNotification({ type: 'success', message: 'Cập nhật nhà cung cấp thành công!' });
    } else {
      addSupplier({
        id: uuidv4(),
        name: supplierName,
        phone: supplierPhone,
        address: supplierAddress,
        note: supplierNote,
        createdAt: new Date().toISOString(),
      });
      setNotification({ type: 'success', message: 'Thêm nhà cung cấp mới thành công!' });
    }

    // Reset form
    setSupplierName('');
    setSupplierPhone('');
    setSupplierAddress('');
    setSupplierNote('');
    setEditingSupplierId(null);
    setShowSupplierForm(false);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSupplierName(supplier.name);
    setSupplierPhone(supplier.phone);
    setSupplierAddress(supplier.address);
    setSupplierNote(supplier.note || '');
    setEditingSupplierId(supplier.id);
    setShowSupplierForm(true);
  };

  const handleDeleteSupplier = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xoá nhà cung cấp này?')) {
      deleteSupplier(id);
      setNotification({ type: 'success', message: 'Đã xoá nhà cung cấp.' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handlePackagingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packagingName || !packagingPrice || !packagingQuantity) return;

    const price = parseCurrency(packagingPrice);
    const quantity = Number(packagingQuantity);
    const id = editingPackagingId || uuidv4();
    const barcode = packagingBarcode || generateBarcodeNumber(id);

    if (editingPackagingId) {
      try {
        await updatePackagingItem(editingPackagingId, {
          name: packagingName,
          price,
          quantity,
          barcode,
        });
        setNotification({ type: 'success', message: 'Cập nhật bao bì thành công!' });
      } catch (error: any) {
        setNotification({ type: 'error', message: 'Lỗi khi cập nhật bao bì: ' + error.message });
      }
    } else {
      try {
        await addPackagingItem({
          id,
          name: packagingName,
          price,
          quantity,
          barcode,
          createdAt: new Date().toISOString(),
        });
        setNotification({ type: 'success', message: 'Thêm bao bì mới thành công!' });
      } catch (error: any) {
        setNotification({ type: 'error', message: 'Lỗi khi thêm bao bì: ' + error.message });
      }
    }

    // Reset form
    setPackagingName('');
    setPackagingPrice('');
    setPackagingQuantity('');
    setPackagingBarcode('');
    setEditingPackagingId(null);
    setShowPackagingForm(false);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleEditPackaging = (item: PackagingItem) => {
    setPackagingName(item.name);
    setPackagingPrice(formatCurrency(item.price));
    setPackagingQuantity(item.quantity.toString());
    setPackagingBarcode(item.barcode);
    setEditingPackagingId(item.id);
    setShowPackagingForm(true);
  };

  const handleDeletePackaging = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xoá bao bì này?')) {
      try {
        await deletePackagingItem(id);
        setNotification({ type: 'success', message: 'Đã xoá bao bì.' });
      } catch (error: any) {
        setNotification({ type: 'error', message: 'Lỗi khi xoá bao bì: ' + error.message });
      }
      setTimeout(() => setNotification(null), 3000);
    }
  };

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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Nhập kho</h1>
          <p className="text-slate-500 mt-1 text-sm">Thêm số lượng sản phẩm vào kho và ghi nhận chi phí.</p>
        </div>

        {/* Tabs - Redesigned for Mobile & Aesthetic */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-[11px] md:text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'import' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <PackagePlus className={`${activeTab === 'import' ? 'w-4 h-4' : 'w-5 h-5 md:w-4 md:h-4 opacity-70'}`} />
            Nhập kho
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-[11px] md:text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'suppliers' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Truck className={`${activeTab === 'suppliers' ? 'w-4 h-4' : 'w-5 h-5 md:w-4 md:h-4 opacity-70'}`} />
            Nhà cung cấp
          </button>
          <button
            onClick={() => setActiveTab('packaging')}
            className={`flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-[11px] md:text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'packaging' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Archive className={`${activeTab === 'packaging' ? 'w-4 h-4' : 'w-5 h-5 md:w-4 md:h-4 opacity-70'}`} />
            Bao bì
          </button>
          <button
            onClick={() => setActiveTab('combo')}
            className={`flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-[11px] md:text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'combo' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <PackagePlus className={`${activeTab === 'combo' ? 'w-4 h-4' : 'w-5 h-5 md:w-4 md:h-4 opacity-70'}`} />
            Tạo Combo
          </button>
        </div>
      </div>

      {activeTab === 'import' ? (
        <>
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
                            setSelectedSupplierId(p.supplierId || '');
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

                {/* Supplier Selection */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">Nhà cung cấp (Tùy chọn)</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  >
                    <option value="">-- Chọn nhà cung cấp --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  {suppliers.length === 0 && (
                    <p className="text-xs text-slate-500">Chưa có nhà cung cấp nào. Hãy thêm ở tab "Nhà cung cấp".</p>
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
                {imageProcessing ? (
                  <div className="flex flex-col items-center justify-center p-4">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p className="text-sm font-medium text-slate-600">Đang xử lý ảnh...</p>
                  </div>
                ) : imageUrl ? (
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
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*, .heic, .heif" onChange={handleImageUpload} ref={fileInputRef} />
                      </label>
                      <p className="pl-1 py-1">hoặc Paste (Ctrl+V) ảnh vào đây</p>
                    </div>
                    <p className="text-xs text-slate-500">Dán (Ctrl+V) ảnh hoặc tải ảnh bất kỳ lên (Hỗ trợ JPG, PNG, WEBP, HEIC)</p>
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
        <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-900">Tồn kho hiện tại</h2>
            
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
              {isSelectionMode ? (
                <div className="flex items-center gap-2 w-full md:w-auto">
                  {selectedIds.size > 0 && (
                    <button
                      type="button"
                      onClick={handlePrintBarcodes}
                      className="flex-none flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl transition-all bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 shadow-sm"
                    >
                      <Barcode className="w-4 h-4" />
                      <span>In ({selectedIds.size})</span>
                    </button>
                  )}
                  
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className={`flex-none flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl transition-all border ${
                      allSelected 
                        ? 'bg-slate-900 text-white border-slate-900' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    } shadow-sm`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${allSelected ? 'bg-white border-white' : 'border-slate-300'}`}>
                      {allSelected && <div className="w-2 h-2 bg-slate-900 rounded-sm" />}
                    </div>
                    <span>Tất cả</span>
                  </button>

                  {selectedIds.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmIds(Array.from(selectedIds))}
                      className="flex-none flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl transition-all bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Xoá ({selectedIds.size})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsSelectionMode(false);
                      setSelectedIds(new Set());
                    }}
                    className="flex-none flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl transition-all bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 shadow-sm"
                  >
                    <X className="w-4 h-4" />
                    <span>Hủy</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSelectionMode(true)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
                >
                  <Edit2 className="w-4 h-4 text-slate-400" />
                  Quản lý kho
                </button>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={inventorySearchTerm}
              onChange={(e) => setInventorySearchTerm(e.target.value)}
              placeholder="Tìm kiếm sản phẩm theo tên hoặc ghi chú..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
            {inventorySearchTerm && (
              <button
                onClick={() => setInventorySearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                {isSelectionMode && <th className="px-6 py-4 w-12"></th>}
                <th className="px-6 py-4 w-16">Ảnh</th>
                <th className="px-6 py-4">Sản phẩm</th>
                <th className="px-6 py-4 text-right">Giá vốn</th>
                <th className="px-6 py-4 text-right">Tồn kho</th>
                <th className="px-6 py-4 text-right">Nhà cung cấp</th>
                <th className="px-6 py-4 text-right">Trạng thái</th>
                <th className="px-6 py-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.filter(p => 
                p.name.toLowerCase().includes(inventorySearchTerm.toLowerCase()) ||
                (p.note && p.note.toLowerCase().includes(inventorySearchTerm.toLowerCase()))
              ).length === 0 ? (
                <tr>
                  <td colSpan={isSelectionMode ? 8 : 7} className="px-6 py-8 text-center text-slate-500">
                    {inventorySearchTerm ? 'Không tìm thấy sản phẩm phù hợp' : 'Kho hàng trống'}
                  </td>
                </tr>
              ) : (
                products
                  .filter(p => 
                    p.name.toLowerCase().includes(inventorySearchTerm.toLowerCase()) ||
                    (p.note && p.note.toLowerCase().includes(inventorySearchTerm.toLowerCase()))
                  )
                  .map(p => {
                  const wq = p.warehouseQuantity || 0;
                  const checked = selectedIds.has(p.id);
                  const supplier = suppliers.find(s => s.id === p.supplierId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      {isSelectionMode && (
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelected(p.id)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                      )}
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
                        {supplier ? (
                          <div className="flex flex-col items-end">
                            <span className="text-slate-900 font-medium">{supplier.name}</span>
                            <span className="text-xs text-slate-500">{supplier.phone}</span>
                            <button 
                              onClick={() => openAssignModal(p.id)}
                              className="text-[10px] text-indigo-600 hover:underline mt-1"
                            >
                              Thay đổi
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end">
                            <span className="text-slate-400 italic">Chưa gán</span>
                            <button 
                              onClick={() => openAssignModal(p.id)}
                              className="text-[10px] text-indigo-600 hover:underline mt-1"
                            >
                              Gán ngay
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {wq === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            <AlertCircle className="w-3 h-3" />
                            Hết hàng
                          </span>
                        ) : wq < 4 ? (
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
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => downloadBarcode(p)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Tải mã vạch"
                          >
                            <Barcode className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmIds([p.id])}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xoá sản phẩm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
          {products.filter(p => 
            p.name.toLowerCase().includes(inventorySearchTerm.toLowerCase()) ||
            (p.note && p.note.toLowerCase().includes(inventorySearchTerm.toLowerCase()))
          ).length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              {inventorySearchTerm ? 'Không tìm thấy sản phẩm phù hợp' : 'Kho hàng trống'}
            </div>
          ) : (
            products
              .filter(p => 
                p.name.toLowerCase().includes(inventorySearchTerm.toLowerCase()) ||
                (p.note && p.note.toLowerCase().includes(inventorySearchTerm.toLowerCase()))
              )
              .map(p => {
              const wq = p.warehouseQuantity || 0;
              const checked = selectedIds.has(p.id);
              return (
                <div key={p.id} className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                  {isSelectionMode && (
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelected(p.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
                    />
                  )}
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
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => downloadBarcode(p)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors flex-shrink-0"
                          title="Tải mã vạch"
                        >
                          <Barcode className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmIds([p.id])}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors -mt-1 -mr-1 flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-slate-500 mb-1">Giá vốn: {formatCurrency(p.cost)}đ</div>
                    <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      {suppliers.find(s => s.id === p.supplierId)?.name || 'Chưa gán'}
                      <button 
                        onClick={() => openAssignModal(p.id)}
                        className="text-indigo-600 hover:underline ml-1"
                      >
                        {p.supplierId ? 'Sửa' : 'Gán'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-slate-900">Tồn kho: {wq}</div>
                      <div>
                        {wq === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            <AlertCircle className="w-3 h-3" />
                            Hết hàng
                          </span>
                        ) : wq < 4 ? (
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
        </>
      ) : activeTab === 'suppliers' ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Danh sách nhà cung cấp</h2>
              <p className="text-slate-500 text-sm">Quản lý thông tin liên hệ của các đối tác cung cấp hàng hóa.</p>
            </div>
            <button
              onClick={() => {
                setEditingSupplierId(null);
                setSupplierName('');
                setSupplierPhone('');
                setSupplierAddress('');
                setSupplierNote('');
                setShowSupplierForm(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Thêm nhà cung cấp
            </button>
          </div>

          {showSupplierForm && (
            <div className="bg-white rounded-xl border border-indigo-200 shadow-md overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingSupplierId ? 'Cập nhật nhà cung cấp' : 'Thêm nhà cung cấp mới'}
                  </h3>
                  <button onClick={() => setShowSupplierForm(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleSupplierSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">Tên nhà cung cấp</label>
                      <div className="relative">
                        <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={supplierName}
                          onChange={(e) => setSupplierName(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Công ty A, Kho B..."
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">Số điện thoại</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="tel"
                          value={supplierPhone}
                          onChange={(e) => setSupplierPhone(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="090..."
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Địa chỉ</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={supplierAddress}
                        onChange={(e) => setSupplierAddress(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Địa chỉ kho hàng hoặc văn phòng..."
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Ghi chú / Liên hệ khác</label>
                    <textarea
                      value={supplierNote}
                      onChange={(e) => setSupplierNote(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Zalo, Facebook, hoặc ghi chú về chính sách nhập hàng..."
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowSupplierForm(false)}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      {editingSupplierId ? 'Cập nhật' : 'Lưu nhà cung cấp'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200 border-dashed">
                <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Chưa có nhà cung cấp nào.</p>
                <button
                  onClick={() => setShowSupplierForm(true)}
                  className="mt-4 text-indigo-600 font-medium hover:underline"
                >
                  Thêm nhà cung cấp đầu tiên
                </button>
              </div>
            ) : (
              suppliers.map(s => (
                <div key={s.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedSupplierForDetail(s)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md"
                        title="Xem chi tiết"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditSupplier(s)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSupplier(s.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-900 mb-3">{s.name}</h3>
                  <div className="space-y-2 text-sm text-slate-600">
                    {s.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span>{s.phone}</span>
                      </div>
                    )}
                    {s.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="line-clamp-1">{s.address}</span>
                      </div>
                    )}
                    {s.note && (
                      <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 italic">
                        {s.note}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : activeTab === 'packaging' ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm bao bì..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              onClick={() => {
                setEditingPackagingId(null);
                setPackagingName('');
                setPackagingPrice('');
                setPackagingQuantity('');
                setPackagingBarcode('');
                setShowPackagingForm(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Thêm bao bì mới
            </button>
          </div>

          {showPackagingForm && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">
                  {editingPackagingId ? 'Chỉnh sửa bao bì' : 'Thêm bao bì mới'}
                </h3>
                <button 
                  onClick={() => setShowPackagingForm(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handlePackagingSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Tên bao bì</label>
                  <input
                    type="text"
                    required
                    value={packagingName}
                    onChange={(e) => setPackagingName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Ví dụ: Túi zip 10x15"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Giá nhập (VNĐ)</label>
                  <input
                    type="text"
                    required
                    value={packagingPrice}
                    onChange={(e) => setPackagingPrice(formatCurrency(e.target.value))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Số lượng</label>
                  <input
                    type="number"
                    required
                    value={packagingQuantity}
                    onChange={(e) => setPackagingQuantity(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Mã Barcode</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={packagingBarcode}
                      onChange={(e) => setPackagingBarcode(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Quét hoặc nhập mã vạch (Để trống để tự tạo)"
                    />
                    <button
                      type="button"
                      onClick={() => setPackagingBarcode(generateBarcodeNumber(uuidv4()))}
                      className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                      title="Tạo mã ngẫu nhiên"
                    >
                      <Barcode className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowPackagingForm(false)}
                    className="px-6 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                  >
                    {editingPackagingId ? 'Lưu thay đổi' : 'Thêm bao bì'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tên bao bì</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Giá nhập</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Số lượng</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Barcode</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {packagingItems.length > 0 ? (
                    packagingItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{item.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-slate-600">{formatCurrency(item.price)}đ</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-slate-600">{item.quantity}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-500 font-mono text-xs">
                            <Barcode className="w-3 h-3" />
                            {item.barcode}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => downloadPackagingBarcode(item)}
                              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Tải mã vạch"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditPackaging(item)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePackaging(item.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Xoá"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        Chưa có bao bì nào được nhập.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'combo' ? (
        <ComboTab
          products={products}
          packagingItems={packagingItems}
          addProduct={addProduct}
          updateProduct={updateProduct}
          updatePackagingItem={updatePackagingItem}
          addTransaction={addTransaction}
          setNotification={setNotification}
        />
      ) : null}

      {selectedSupplierForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedSupplierForDetail.name}</h3>
                <p className="text-slate-500 text-sm mt-1">Chi tiết nhập hàng từ nhà cung cấp</p>
              </div>
              <button onClick={() => setSelectedSupplierForDetail(null)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                  <div className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">Tổng tiền đã nhập</div>
                  <div className="text-2xl font-black text-indigo-900">
                    {formatCurrency(transactions
                      .filter(t => 
                        t.category === 'IMPORT' && 
                        (t.supplierId === selectedSupplierForDetail.id || 
                         (t.items && t.items.some(item => products.find(p => p.id === item.productId)?.supplierId === selectedSupplierForDetail.id)))
                      )
                      .reduce((sum, t) => sum + t.amount, 0)
                    )}đ
                  </div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <div className="text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">Số loại sản phẩm</div>
                  <div className="text-2xl font-black text-emerald-900">
                    {products.filter(p => p.supplierId === selectedSupplierForDetail.id).length}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <section>
                  <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <PackagePlus className="w-4 h-4 text-indigo-600" />
                    Sản phẩm cung cấp
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {products.filter(p => p.supplierId === selectedSupplierForDetail.id).length === 0 ? (
                      <div className="col-span-full text-center py-8 text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        Chưa có sản phẩm nào được gán cho nhà cung cấp này.
                      </div>
                    ) : (
                      products.filter(p => p.supplierId === selectedSupplierForDetail.id).map(p => (
                        <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                          <div className="w-10 h-10 rounded-md overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-5 h-5 m-2.5 text-slate-300" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-900 truncate text-sm">{p.name}</div>
                            <div className="text-[10px] text-slate-500">Tồn kho: {p.warehouseQuantity || 0}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-bold text-indigo-600">{formatCurrency(p.cost)}đ</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section>
                  <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    Lịch sử nhập hàng
                  </h4>
                  
                  <div className="space-y-3">
                    {transactions
                      .filter(t => 
                        t.category === 'IMPORT' && 
                        (t.supplierId === selectedSupplierForDetail.id || 
                         (t.items && t.items.some(item => products.find(p => p.id === item.productId)?.supplierId === selectedSupplierForDetail.id)))
                      )
                      .length === 0 ? (
                      <div className="text-center py-8 text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        Chưa có giao dịch nhập hàng nào.
                      </div>
                    ) : (
                      transactions
                        .filter(t => 
                          t.category === 'IMPORT' && 
                          (t.supplierId === selectedSupplierForDetail.id || 
                           (t.items && t.items.some(item => products.find(p => p.id === item.productId)?.supplierId === selectedSupplierForDetail.id)))
                        )
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map(t => (
                          <div key={t.id} className="p-3 rounded-lg border border-slate-100 bg-white hover:border-indigo-100 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <div className="text-xs font-medium text-slate-500">
                                {new Date(t.date).toLocaleDateString('vi-VN', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                              <div className="text-sm font-bold text-red-600">-{formatCurrency(t.amount)}đ</div>
                            </div>
                            <div className="text-sm text-slate-700 font-medium">{t.description}</div>
                            {t.items && t.items.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {t.items.map((item, idx) => {
                                  const p = products.find(prod => prod.id === item.productId);
                                  return (
                                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600">
                                      {p?.name || 'Sản phẩm ẩn'}: {item.quantity}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))
                    )}
                  </div>
                </section>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedSupplierForDetail(null)}
                className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Supplier Modal */}
      {assigningSupplierForProductId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Gán nhà cung cấp</h3>
            <p className="text-slate-600 text-sm mb-6">
              Chọn nhà cung cấp cho sản phẩm: <span className="font-bold text-slate-900">
                {products.find(p => p.id === assigningSupplierForProductId)?.name}
              </span>
            </p>
            
            <div className="space-y-4">
              <select
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                value={modalSupplierId}
                onChange={(e) => setModalSupplierId(e.target.value)}
              >
                <option value="">-- Chưa gán --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setAssigningSupplierForProductId(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={async () => {
                    if (!assigningSupplierForProductId) return;
                    try {
                      await updateProduct(assigningSupplierForProductId, { supplierId: modalSupplierId || null });
                      setAssigningSupplierForProductId(null);
                      setNotification({ type: 'success', message: 'Đã cập nhật nhà cung cấp cho sản phẩm.' });
                      setTimeout(() => setNotification(null), 3000);
                    } catch (err) {
                      console.error('Lỗi cập nhật nhà cung cấp:', err);
                      setNotification({ type: 'error', message: 'Lỗi khi cập nhật nhà cung cấp. Vui lòng thử lại.' });
                      setTimeout(() => setNotification(null), 3000);
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBarcodeModal && (
        <BarcodePrintModal
          initialItems={printItems}
          onClose={() => setShowBarcodeModal(false)}
        />
      )}
    </div>
  );
}
