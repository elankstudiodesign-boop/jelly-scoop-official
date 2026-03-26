import React from 'react';
import { Supplier } from '../../types';
import { User, Phone, MapPin, Archive, Plus, X, Edit2, Trash2, Search, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../../lib/format';

interface SupplierFormProps {
  supplierName: string;
  setSupplierName: (val: string) => void;
  supplierPhone: string;
  setSupplierPhone: (val: string) => void;
  supplierAddress: string;
  setSupplierAddress: (val: string) => void;
  supplierNote: string;
  setSupplierNote: (val: string) => void;
  editingSupplierId: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function SupplierForm({ manager, products, suppliers, deleteSupplier }: { manager: any, products: any[], suppliers: Supplier[], deleteSupplier: (id: string) => void }) {
  const {
    supplierName, setSupplierName,
    supplierPhone, setSupplierPhone,
    supplierAddress, setSupplierAddress,
    supplierNote, setSupplierNote,
    editingSupplierId, setEditingSupplierId,
    handleSupplierSubmit,
    showSupplierForm, setShowSupplierForm,
    setSelectedSupplierForDetail,
    setNotification
  } = manager;

  const onCancel = () => {
    setSupplierName('');
    setSupplierPhone('');
    setSupplierAddress('');
    setSupplierNote('');
    setEditingSupplierId(null);
    setShowSupplierForm(false);
  };

  const handleEdit = (s: Supplier) => {
    setEditingSupplierId(s.id);
    setSupplierName(s.name);
    setSupplierPhone(s.phone);
    setSupplierAddress(s.address);
    setSupplierNote(s.note || '');
    setShowSupplierForm(true);
  };

  return (
    <div className="space-y-6">
      {showSupplierForm ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              {editingSupplierId ? <Archive className="w-5 h-5 text-blue-500" /> : <Plus className="w-5 h-5 text-blue-500" />}
              {editingSupplierId ? 'Cập nhật nhà cung cấp' : 'Thêm nhà cung cấp mới'}
            </h2>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <form onSubmit={handleSupplierSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <User className="w-4 h-4" /> Tên nhà cung cấp
                </label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Nhập tên nhà cung cấp..."
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Số điện thoại
                </label>
                <input
                  type="text"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Nhập số điện thoại..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Địa chỉ
              </label>
              <input
                type="text"
                value={supplierAddress}
                onChange={(e) => setSupplierAddress(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Nhập địa chỉ..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Ghi chú</label>
              <textarea
                value={supplierNote}
                onChange={(e) => setSupplierNote(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                placeholder="Nhập ghi chú (nếu có)..."
                rows={3}
              />
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
                {editingSupplierId ? 'Cập nhật' : 'Lưu nhà cung cấp'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Danh sách nhà cung cấp</h2>
              <p className="text-slate-500 text-sm">Quản lý thông tin các đơn vị cung cấp hàng hóa</p>
            </div>
            <button
              onClick={() => setShowSupplierForm(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-100"
            >
              <Plus className="w-4 h-4" />
              Thêm nhà cung cấp
            </button>
          </div>

          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Nhà cung cấp</th>
                  <th className="px-6 py-4">Liên hệ</th>
                  <th className="px-6 py-4">Địa chỉ</th>
                  <th className="px-6 py-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      Chưa có nhà cung cấp nào
                    </td>
                  </tr>
                ) : (
                  suppliers.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => setSelectedSupplierForDetail(s)}
                          className="font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                        >
                          {s.name}
                        </button>
                        {s.note && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{s.note}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="w-3.5 h-3.5" />
                          {s.phone || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600 max-w-xs truncate">
                          <MapPin className="w-3.5 h-3.5" />
                          {s.address || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(s)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Bạn có chắc chắn muốn xoá nhà cung cấp này?')) {
                                deleteSupplier(s.id);
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
            {suppliers.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-500">
                Chưa có nhà cung cấp nào
              </div>
            ) : (
              suppliers.map(s => (
                <div key={s.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <button 
                      onClick={() => setSelectedSupplierForDetail(s)}
                      className="font-bold text-slate-900 text-lg hover:text-indigo-600 transition-colors text-left"
                    >
                      {s.name}
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(s)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm border border-slate-100"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Bạn có chắc chắn muốn xoá nhà cung cấp này?')) {
                            deleteSupplier(s.id);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl transition-all shadow-sm border border-slate-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-4 h-4 text-slate-400" />
                      </div>
                      <span className="font-medium">{s.phone || 'Chưa có số điện thoại'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-slate-400" />
                      </div>
                      <span className="truncate">{s.address || 'Chưa có địa chỉ'}</span>
                    </div>
                  </div>
                  
                  {s.note && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 italic">
                      {s.note}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
