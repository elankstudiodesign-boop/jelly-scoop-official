import React from 'react';
import { PackagingItem } from '../../types';
import { PackagePlus, Search, AlertCircle, Trash2, X, CheckCircle2, Upload, Image as ImageIcon, Edit2, Barcode, Truck, Plus, Phone, MapPin, User, Archive, Download } from 'lucide-react';
import { formatCurrency, parseCurrency } from '../../lib/format';

interface PackagingFormProps {
  packagingName: string;
  setPackagingName: (val: string) => void;
  packagingPrice: string;
  setPackagingPrice: (val: string) => void;
  packagingQuantity: string;
  setPackagingQuantity: (val: string) => void;
  packagingBarcode: string;
  setPackagingBarcode: (val: string) => void;
  editingPackagingId: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function PackagingForm({ manager, packagingItems, deletePackagingItem }: { manager: any, packagingItems: PackagingItem[], deletePackagingItem: (id: string) => void }) {
  const {
    packagingName, setPackagingName,
    packagingPrice, setPackagingPrice,
    packagingQuantity, setPackagingQuantity,
    packagingBarcode, setPackagingBarcode,
    editingPackagingId, setEditingPackagingId,
    handlePackagingSubmit,
    showPackagingForm, setShowPackagingForm
  } = manager;

  const onCancel = () => {
    setPackagingName('');
    setPackagingPrice('');
    setPackagingQuantity('');
    setPackagingBarcode('');
    setEditingPackagingId(null);
    setShowPackagingForm(false);
  };

  const handleEdit = (item: PackagingItem) => {
    setEditingPackagingId(item.id);
    setPackagingName(item.name);
    setPackagingPrice(formatCurrency(item.price));
    setPackagingQuantity(item.quantity.toString());
    setPackagingBarcode(item.barcode);
    setShowPackagingForm(true);
  };

  return (
    <div className="space-y-6">
      {showPackagingForm ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              {editingPackagingId ? <Edit2 className="w-5 h-5 text-blue-500" /> : <Plus className="w-5 h-5 text-blue-500" />}
              {editingPackagingId ? 'Cập nhật bao bì' : 'Thêm bao bì mới'}
            </h2>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <form onSubmit={handlePackagingSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Tên bao bì</label>
                <input
                  type="text"
                  value={packagingName}
                  onChange={(e) => setPackagingName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Nhập tên bao bì..."
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Giá nhập (VNĐ)</label>
                <input
                  type="text"
                  min="0"
                  value={packagingPrice}
                  onChange={(e) => setPackagingPrice(formatCurrency(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Nhập giá nhập..."
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Số lượng hiện có</label>
                <input
                  type="number"
                  min="0"
                  value={packagingQuantity}
                  onChange={(e) => setPackagingQuantity(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Nhập số lượng..."
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Mã vạch (Tùy chọn)</label>
                <input
                  type="text"
                  value={packagingBarcode}
                  onChange={(e) => setPackagingBarcode(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Nhập mã vạch hoặc để trống để tự tạo..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-all"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all"
              >
                {editingPackagingId ? 'Cập nhật' : 'Lưu bao bì'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Quản lý bao bì</h2>
              <p className="text-slate-500 text-sm">Theo dõi tồn kho và chi phí bao bì đóng gói</p>
            </div>
            <button
              onClick={() => setShowPackagingForm(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-100"
            >
              <Plus className="w-4 h-4" />
              Thêm bao bì
            </button>
          </div>

          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Bao bì</th>
                  <th className="px-6 py-4 text-right">Giá nhập</th>
                  <th className="px-6 py-4 text-right">Tồn kho</th>
                  <th className="px-6 py-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {packagingItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      Chưa có thông tin bao bì
                    </td>
                  </tr>
                ) : (
                  packagingItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Barcode className="w-3 h-3" />
                          {item.barcode}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900">
                        {formatCurrency(item.price)}đ
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-bold ${item.quantity < 10 ? 'text-red-600' : 'text-slate-900'}`}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Bạn có chắc chắn muốn xoá loại bao bì này?')) {
                                deletePackagingItem(item.id);
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-slate-100">
            {packagingItems.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-500">
                Chưa có thông tin bao bì
              </div>
            ) : (
              packagingItems.map(item => (
                <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 text-lg truncate pr-2">{item.name}</h3>
                      <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-bold uppercase tracking-wider">
                        <Barcode className="w-3 h-3" />
                        {item.barcode}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm border border-slate-100"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Bạn có chắc chắn muốn xoá loại bao bì này?')) {
                            deletePackagingItem(item.id);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl transition-all shadow-sm border border-slate-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Giá nhập</span>
                      <span className="font-black text-indigo-600">{formatCurrency(item.price)}đ</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tồn kho</span>
                      <span className={`text-lg font-black ${item.quantity < 10 ? 'text-red-600' : 'text-slate-900'}`}>
                        {item.quantity}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
