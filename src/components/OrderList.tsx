import React, { useState } from 'react';
import { Transaction, Product } from '../types';
import { formatCurrency } from '../lib/format';
import { Printer, Trash2, Eye, X } from 'lucide-react';

interface OrderListProps {
  transactions: Transaction[];
  products: Product[];
  deleteTransaction: (id: string) => void;
}

export default function OrderList({ transactions, products, deleteTransaction }: OrderListProps) {
  const [selectedOrder, setSelectedOrder] = useState<Transaction | null>(null);
  
  // Filter only ORDER transactions
  const orders = transactions.filter(t => t.category === 'ORDER').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xoá đơn hàng này?')) {
      deleteTransaction(id);
      if (selectedOrder?.id === id) {
        setSelectedOrder(null);
      }
    }
  };

  const handlePrint = (order: Transaction) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Vui lòng cho phép popup để in hoá đơn');
      return;
    }

    const orderItemsHtml = order.items?.map(item => {
      const product = products.find(p => p.id === item.productId);
      const name = product ? product.name : 'Sản phẩm không xác định';
      const price = item.retailPrice ?? (product?.retailPrice ?? product?.cost ?? 0);
      return `
        <tr>
          <td style="padding: 4px 0; border-bottom: 1px dashed #ccc;">${name}</td>
          <td style="padding: 4px 0; border-bottom: 1px dashed #ccc; text-align: center;">${item.quantity}</td>
          <td style="padding: 4px 0; border-bottom: 1px dashed #ccc; text-align: right;">${formatCurrency(price * item.quantity)}</td>
        </tr>
      `;
    }).join('') || '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hoá đơn ${order.id.slice(0, 8)}</title>
        <style>
          @page {
            size: 76mm 128mm;
            margin: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 76mm;
            margin: 0;
            padding: 5mm;
            box-sizing: border-box;
            font-size: 12px;
            color: #000;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .title {
            font-size: 16px;
            font-weight: bold;
            margin: 0 0 5px 0;
          }
          .info {
            margin-bottom: 10px;
          }
          .info p {
            margin: 2px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
          }
          th {
            text-align: left;
            border-bottom: 1px solid #000;
            padding-bottom: 4px;
          }
          .total {
            text-align: right;
            font-weight: bold;
            font-size: 14px;
            border-top: 1px dashed #000;
            padding-top: 5px;
            margin-top: 10px;
          }
          .footer {
            text-align: center;
            margin-top: 15px;
            font-size: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">JELLYSCOOP</h1>
          <p style="margin: 0;">Hoá đơn bán hàng</p>
        </div>
        
        <div class="info">
          <p>Ngày: ${new Date(order.date).toLocaleString('vi-VN')}</p>
          <p>Mã ĐH: ${order.id.slice(0, 8).toUpperCase()}</p>
          ${order.customerName ? `<p>Khách hàng: ${order.customerName}</p>` : ''}
          ${order.customerPhone ? `<p>SĐT: ${order.customerPhone}</p>` : ''}
          ${order.customerAddress ? `<p>Địa chỉ: ${order.customerAddress}</p>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th>Tên SP</th>
              <th style="text-align: center;">SL</th>
              <th style="text-align: right;">TT</th>
            </tr>
          </thead>
          <tbody>
            ${orderItemsHtml}
          </tbody>
        </table>

        <div class="total">
          Tổng cộng: ${formatCurrency(order.amount)}đ
        </div>

        <div class="footer">
          <p>Cảm ơn quý khách!</p>
          <p>Hẹn gặp lại</p>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-600 font-semibold">
              <tr>
                <th className="p-4">Mã ĐH</th>
                <th className="p-4">Ngày</th>
                <th className="p-4">Khách hàng</th>
                <th className="p-4">Mô tả</th>
                <th className="p-4 text-right">Tổng tiền</th>
                <th className="p-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Chưa có đơn hàng nào
                  </td>
                </tr>
              ) : (
                orders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono text-xs text-slate-500">{order.id.slice(0, 8).toUpperCase()}</td>
                    <td className="p-4">{new Date(order.date).toLocaleString('vi-VN')}</td>
                    <td className="p-4">
                      {order.customerName ? (
                        <div>
                          <div className="font-medium text-slate-900">{order.customerName}</div>
                          {order.customerPhone && <div className="text-xs text-slate-500">{order.customerPhone}</div>}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Khách lẻ</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-600">{order.description}</td>
                    <td className="p-4 text-right font-medium text-indigo-600">{formatCurrency(order.amount)}đ</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePrint(order)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="In hoá đơn"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(order.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xoá đơn hàng"
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
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Chi tiết đơn hàng</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-1">Thông tin chung</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-slate-500">Mã ĐH:</span> <span className="font-mono">{selectedOrder.id.slice(0, 8).toUpperCase()}</span></p>
                    <p><span className="text-slate-500">Ngày:</span> {new Date(selectedOrder.date).toLocaleString('vi-VN')}</p>
                    <p><span className="text-slate-500">Mô tả:</span> {selectedOrder.description}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-1">Khách hàng</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-slate-500">Tên:</span> {selectedOrder.customerName || 'Khách lẻ'}</p>
                    {selectedOrder.customerPhone && <p><span className="text-slate-500">SĐT:</span> {selectedOrder.customerPhone}</p>}
                    {selectedOrder.customerAddress && <p><span className="text-slate-500">Địa chỉ:</span> {selectedOrder.customerAddress}</p>}
                  </div>
                </div>
              </div>

              <h3 className="text-sm font-medium text-slate-500 mb-3">Sản phẩm</h3>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="p-3">Sản phẩm</th>
                      <th className="p-3 text-center">Số lượng</th>
                      <th className="p-3 text-right">Đơn giá</th>
                      <th className="p-3 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrder.items?.map((item, index) => {
                      const product = products.find(p => p.id === item.productId);
                      const price = item.retailPrice ?? (product?.retailPrice ?? product?.cost ?? 0);
                      return (
                        <tr key={index}>
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              {product?.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name} className="w-8 h-8 rounded object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-xs text-slate-400">No img</div>
                              )}
                              <span className="font-medium text-slate-900">{product?.name || 'Sản phẩm không xác định'}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center">{item.quantity}</td>
                          <td className="p-3 text-right">{formatCurrency(price)}đ</td>
                          <td className="p-3 text-right font-medium">{formatCurrency(price * item.quantity)}đ</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td colSpan={3} className="p-3 text-right font-medium text-slate-600">Tổng cộng:</td>
                      <td className="p-3 text-right font-bold text-indigo-600">{formatCurrency(selectedOrder.amount)}đ</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => handlePrint(selectedOrder)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                In hoá đơn
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
