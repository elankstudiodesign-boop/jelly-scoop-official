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
          <td class="left">${name}</td>
          <td class="center">${item.quantity}</td>
          <td class="right">${formatCurrency(price)}</td>
          <td class="right">${formatCurrency(price * item.quantity)}</td>
        </tr>
      `;
    }).join('') || '';

    const html = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>Hoá đơn ${order.id.slice(0, 8)}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Oswald:wght@700&display=swap');
          
          @page {
            size: A4;
            margin: 0;
          }
          body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 60px 80px;
            color: #000;
            background: #fff;
            -webkit-print-color-adjust: exact;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 60px;
          }
          .brand-name {
            font-size: 36px;
            font-weight: 800;
            line-height: 1.1;
            text-transform: uppercase;
            margin-bottom: 20px;
          }
          .social-links {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .social-link {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 15px;
            font-weight: 500;
          }
          .social-link svg {
            width: 20px;
            height: 20px;
          }
          .invoice-title {
            font-family: 'Oswald', sans-serif;
            font-size: 80px;
            font-weight: 700;
            line-height: 1;
            text-transform: uppercase;
            letter-spacing: -1px;
          }
          
          .info-section {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr;
            gap: 20px;
            margin-bottom: 50px;
          }
          .info-block h3 {
            font-size: 15px;
            font-weight: 700;
            text-transform: uppercase;
            margin: 0 0 12px 0;
          }
          .info-block p {
            margin: 0 0 6px 0;
            font-size: 15px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 60px;
          }
          th {
            font-size: 15px;
            font-weight: 700;
            text-transform: uppercase;
            padding-bottom: 15px;
            border-bottom: none;
          }
          th.left { text-align: left; }
          th.center { text-align: center; }
          th.right { text-align: right; }
          
          td {
            padding: 15px 0;
            font-size: 15px;
            border-bottom: 2px dotted #000;
          }
          td.left { text-align: left; }
          td.center { text-align: center; }
          td.right { text-align: right; }
          
          .footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-top: 60px;
          }
          .payment-info h3 {
            font-size: 15px;
            font-weight: 700;
            text-transform: uppercase;
            margin: 0 0 12px 0;
          }
          .payment-info p {
            margin: 0 0 8px 0;
            font-size: 15px;
          }
          .payment-info .bold {
            font-weight: 700;
          }
          
          .summary {
            width: 300px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            font-size: 15px;
          }
          .summary-row.title {
            font-weight: 700;
            text-transform: uppercase;
            margin-bottom: 20px;
            font-size: 16px;
          }
          .summary-row.total {
            font-weight: 700;
            font-size: 18px;
            margin-top: 20px;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand-name">JELLY<br>SCOOP</div>
            <div class="social-links">
              <div class="social-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3V0Z"/>
                </svg>
                @jellyscoop
              </div>
              <div class="social-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.036 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z"/>
                </svg>
                @jellyscoop
              </div>
              <div class="social-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path fill-rule="evenodd" d="M1.885.511a1.745 1.745 0 0 1 2.61.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z"/>
                </svg>
                0886 849 783
              </div>
            </div>
          </div>
          <div class="invoice-title">INVOICE</div>
        </div>
      
        <div class="info-section">
          <div class="info-block">
            <h3>KHÁCH HÀNG</h3>
            <p>${order.customerName || 'Khách lẻ'}</p>
            ${order.customerPhone ? `<p>${order.customerPhone}</p>` : ''}
            ${order.customerAddress ? `<p>${order.customerAddress}</p>` : ''}
          </div>
          <div class="info-block">
            <h3>NGÀY</h3>
            <p>${new Date(order.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div class="info-block">
            <h3>MÃ ĐƠN HÀNG</h3>
            <p>INV-${order.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
      
        <table>
          <thead>
            <tr>
              <th class="left">SẢN PHẨM</th>
              <th class="center">SỐ LƯỢNG</th>
              <th class="right">ĐƠN GIÁ</th>
              <th class="right">THÀNH TIỀN</th>
            </tr>
          </thead>
          <tbody>
            ${orderItemsHtml}
          </tbody>
        </table>
      
        <div class="footer">
          <div class="payment-info">
            <h3>PHƯƠNG THỨC THANH TOÁN</h3>
            <p>Chuyển khoản ngân hàng</p>
            <p>MB bank</p>
            <p class="bold">LY THI KIM NHAN</p>
            <p>11391679168</p>
            
            <div style="margin-top: 25px; display: flex; align-items: center; gap: 15px;">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://zalo.me/0886849783" alt="Zalo QR" style="width: 70px; height: 70px;" />
              <div>
                <p style="font-weight: 700; margin-bottom: 4px; font-size: 14px;">Zalo Liên Hệ</p>
                <p style="font-size: 14px; margin: 0;">0886 849 783</p>
              </div>
            </div>
          </div>
          <div class="summary">
            <div class="summary-row title">
              <span>TỔNG PHỤ</span>
            </div>
            <div class="summary-row">
              <span>Giảm giá</span>
              <span>0</span>
            </div>
            <div class="summary-row">
              <span>Thuế</span>
              <span>0</span>
            </div>
            <div class="summary-row">
              <span>Vận chuyển</span>
              <span>0</span>
            </div>
            <div class="summary-row total">
              <span>TỔNG CỘNG</span>
              <span>${formatCurrency(order.amount)} VNĐ</span>
            </div>
          </div>
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
