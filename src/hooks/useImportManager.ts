import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Product, Transaction, Supplier, PackagingItem, PriceGroup } from '../types';
import { formatCurrency, parseCurrency, generateBarcodeNumber } from '../lib/format';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import { uploadProductImage, dataUrlToBlob, processImage } from '../lib/imageUpload';
import { PrintItem } from '../components/BarcodePrintModal';

interface UseImportManagerProps {
  products: Product[];
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

export function useImportManager({
  products,
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
}: UseImportManagerProps) {
  const [activeTab, setActiveTab] = useState<'import' | 'suppliers' | 'packaging' | 'combo'>('import');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [unitCost, setUnitCost] = useState<string>('');
  const [retailPrice, setRetailPrice] = useState<string>('');
  const [totalCost, setTotalCost] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [deleteConfirmIds, setDeleteConfirmIds] = useState<string[] | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [inventorySearchTerm, setInventorySearchTerm] = useState('');
  const [inventoryTab, setInventoryTab] = useState<'all' | 'single' | 'combo'>('all');
  const [inventoryStockFilter, setInventoryStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [printItems, setPrintItems] = useState<PrintItem[]>([]);

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const imageDropzoneRef = useRef<HTMLDivElement>(null);
  const imageObjectUrlRef = useRef<string | null>(null);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exactMatch = products.find(p => p.name.toLowerCase() === searchTerm.toLowerCase());
  const selectedProduct = products.find(p => p.id === selectedProductId);

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

  const handlePaste = async (e: React.ClipboardEvent) => {
    const handled = await handleClipboardPaste(e.clipboardData);
    if (handled) e.preventDefault();
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

  const handleRetailPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRetailPrice(formatCurrency(val));
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

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm || !quantity || !totalCost || !unitCost) return;
    const numQuantity = Number(quantity);
    const numTotalCost = parseCurrency(totalCost);
    const numUnitCost = parseCurrency(unitCost);
    const numRetailPrice = retailPrice ? parseCurrency(retailPrice) : undefined;
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
      const newWarehouseQuantity = (productToUpdate.warehouseQuantity || 0) + numQuantity;
      const updates: Partial<Product> = {
        warehouseQuantity: newWarehouseQuantity,
        cost: numUnitCost,
        priceGroup: derivedPriceGroup,
        note: note,
        supplierId: finalSupplierId,
        retailPrice: numRetailPrice,
        isCombo: productToUpdate.isCombo,
        comboItems: productToUpdate.comboItems
      };
      if (finalImageUrl) updates.imageUrl = finalImageUrl;
      updateProduct(productToUpdate.id, updates);
      productName = productToUpdate.name;
    } else {
      const newProduct: Product = {
        id: productIdForImage,
        name: searchTerm,
        cost: numUnitCost,
        imageUrl: finalImageUrl || 'https://picsum.photos/seed/' + encodeURIComponent(searchTerm) + '/200/200',
        priceGroup: derivedPriceGroup,
        quantity: 0,
        warehouseQuantity: numQuantity,
        retailPrice: numRetailPrice,
        note: note,
        supplierId: finalSupplierId || undefined
      };
      addProduct(newProduct);
    }
    addTransaction({
      id: uuidv4(),
      type: 'OUT',
      category: 'IMPORT',
      amount: numTotalCost,
      description: description || `Nhập kho: ${numQuantity} x ${productName}`,
      date: new Date().toISOString(),
      items: [{ productId: productToUpdate ? productToUpdate.id : productIdForImage, quantity: numQuantity, retailPrice: numRetailPrice }],
      supplierId: finalSupplierId || undefined
    });
    setSelectedProductId('');
    setSelectedSupplierId('');
    setQuantity('');
    setUnitCost('');
    setRetailPrice('');
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
    setSupplierName('');
    setSupplierPhone('');
    setSupplierAddress('');
    setSupplierNote('');
    setEditingSupplierId(null);
    setShowSupplierForm(false);
    setTimeout(() => setNotification(null), 3000);
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
          createdAt: new Date().toISOString()
        });
        setNotification({ type: 'success', message: 'Thêm bao bì mới thành công!' });
      } catch (error: any) {
        setNotification({ type: 'error', message: 'Lỗi khi thêm bao bì: ' + error.message });
      }
    }
    setPackagingName('');
    setPackagingPrice('');
    setPackagingQuantity('');
    setPackagingBarcode('');
    setEditingPackagingId(null);
    setShowPackagingForm(false);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteMany = async (ids: string[]) => {
    const productUpdates: Record<string, number> = {};
    const packagingUpdates: Record<string, number> = {};
    for (const id of ids) {
      const product = products.find(p => p.id === id);
      if (product && product.isCombo && product.comboItems) {
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
    for (const [id, amount] of Object.entries(productUpdates)) {
      const p = products.find(p => p.id === id);
      if (p) await updateProduct(id, { warehouseQuantity: (p.warehouseQuantity || 0) + amount });
    }
    for (const [id, amount] of Object.entries(packagingUpdates)) {
      const p = packagingItems.find(p => p.id === id);
      if (p) await updatePackagingItem(id, { quantity: p.quantity + amount });
    }
    for (const id of ids) await deleteProduct(id);
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

  return {
    activeTab, setActiveTab,
    searchTerm, setSearchTerm,
    selectedProductId, setSelectedProductId,
    selectedSupplierId, setSelectedSupplierId,
    quantity, setQuantity,
    unitCost, setUnitCost,
    retailPrice, setRetailPrice,
    totalCost, setTotalCost,
    description, setDescription,
    note, setNote,
    imageUrl, setImageUrl,
    imageProcessing,
    showDropdown, setShowDropdown,
    deleteConfirmIds, setDeleteConfirmIds,
    notification, setNotification,
    selectedIds, setSelectedIds,
    isSelectionMode, setIsSelectionMode,
    inventorySearchTerm, setInventorySearchTerm,
    inventoryTab, setInventoryTab,
    inventoryStockFilter, setInventoryStockFilter,
    viewMode, setViewMode,
    showBarcodeModal, setShowBarcodeModal,
    printItems, setPrintItems,
    supplierName, setSupplierName,
    supplierPhone, setSupplierPhone,
    supplierAddress, setSupplierAddress,
    supplierNote, setSupplierNote,
    editingSupplierId, setEditingSupplierId,
    showSupplierForm, setShowSupplierForm,
    selectedSupplierForDetail, setSelectedSupplierForDetail,
    assigningSupplierForProductId, setAssigningSupplierForProductId,
    modalSupplierId, setModalSupplierId,
    packagingName, setPackagingName,
    packagingPrice, setPackagingPrice,
    packagingQuantity, setPackagingQuantity,
    packagingBarcode, setPackagingBarcode,
    editingPackagingId, setEditingPackagingId,
    showPackagingForm, setShowPackagingForm,
    fileInputRef, selectAllRef, imageDropzoneRef,
    filteredProducts, selectedProduct,
    handleQuantityChange, handleUnitCostChange, handleRetailPriceChange, handleTotalCostChange,
    handleImageUpload, handleImport, handleSupplierSubmit, handlePackagingSubmit,
    handleDeleteMany, handlePrintBarcodes, handleClipboardPaste, handlePaste
  };
}
