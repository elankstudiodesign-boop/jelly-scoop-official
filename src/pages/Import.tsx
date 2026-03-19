import React, { useState } from 'react';
import { Product, Transaction } from '../types';
import { PackagePlus, Search, AlertCircle, Trash2, X, CheckCircle2 } from 'lucide-react';
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
  const [showDropdown, setShowDropdown] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exactMatch = products.find(p => p.name.toLowerCase() === searchTerm.toLowerCase());
  const isNewProduct = searchTerm.trim().length > 0 && !exactMatch;

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuantity(val);
    if (val && unitCost) {
      setTotalCost(Math.round(Number(val) * Number(unitCost)).toString());
    }
  };

  const handleUnitCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUnitCost(val);
    if (val && quantity) {
      setTotalCost(Math.round(Number(quantity) * Number(val)).toString());
    }
  };

  const handleTotalCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTotalCost(val);
    if (val && quantity && Number(quantity) > 0) {
      setUnitCost(Math.round(Number(val) / Number(quantity)).toString());
    }
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm || !quantity || !totalCost || !unitCost) return;

    const numQuantity = Number(quantity);
    const numTotalCost = Number(totalCost);
    const numUnitCost = Number(unitCost);

    if (numQuantity <= 0 || numTotalCost <= 0 || numUnitCost <= 0) {
      alert('Số lượng, giá vốn và tổng chi phí phải lớn hơn 0');
      return;
    }

    let productName = searchTerm;

    let productToUpdate = selectedProduct;
    if (!productToUpdate) {
      productToUpdate = products.find(p => p.name.toLowerCase() === searchTerm.toLowerCase());
    }

    if (productToUpdate) {
      // Update existing product
      const newWarehouseQuantity = (productToUpdate.warehouseQuantity || 0) + numQuantity;
      updateProduct(productToUpdate.id, { 
        warehouseQuantity: newWarehouseQuantity,
        cost: numUnitCost // Update to latest cost
      });
      productName = productToUpdate.name;
    } else {
      // Create new product
      const productId = uuidv4();
      const newProduct: Product = {
        id: productId,
        name: searchTerm,
        cost: numUnitCost,
        imageUrl: 'https://picsum.photos/seed/' + encodeURIComponent(searchTerm) + '/200/200',
        priceGroup: 'Thấp',
        quantity: 0,
        warehouseQuantity: numQuantity
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
    setSearchTerm('');
    setShowDropdown(false);
    setNotification({ type: 'success', message: 'Nhập kho thành công!' });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDelete = (id: string) => {
    deleteProduct(id);
    setDeleteConfirmId(null);
    setNotification({ type: 'success', message: 'Đã xoá sản phẩm khỏi kho.' });
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="space-y-6 relative">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
          <span className="font-medium text-sm">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Xác nhận xoá sản phẩm</h3>
            <p className="text-slate-600 text-sm mb-6">
              Bạn có chắc chắn muốn xoá sản phẩm này khỏi kho? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
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
          <form onSubmit={handleImport} className="space-y-6 max-w-2xl">
            
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
                        setUnitCost(p.cost.toString());
                        if (quantity) {
                          setTotalCost(Math.round(Number(quantity) * p.cost).toString());
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
                  type="number"
                  min="0"
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
                  type="number"
                  min="0"
                  required
                  value={totalCost}
                  onChange={handleTotalCostChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">Mô tả (Tùy chọn)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Ghi chú thêm về lô hàng này..."
                rows={3}
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
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Tồn kho hiện tại</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
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
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Kho hàng trống
                  </td>
                </tr>
              ) : (
                products.map(p => {
                  const wq = p.warehouseQuantity || 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{p.name}</td>
                      <td className="px-6 py-4 text-right">{p.cost.toLocaleString()}đ</td>
                      <td className="px-6 py-4 text-right font-medium">{wq}</td>
                      <td className="px-6 py-4 text-right">
                        {wq <= 10 ? (
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
                          onClick={() => setDeleteConfirmId(p.id)}
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
      </div>
    </div>
  );
}
