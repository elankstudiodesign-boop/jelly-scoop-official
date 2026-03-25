import React, { useState } from 'react';
import { Transaction, Product } from '../types';
import { formatCurrency } from '../lib/format';
import { Printer, Trash2, Eye, X, Search } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface OrderListProps {
  transactions: Transaction[];
  products: Product[];
  deleteTransaction: (id: string) => void;
}

export default function OrderList({ transactions, products, deleteTransaction }: OrderListProps) {
  const [selectedOrder, setSelectedOrder] = useState<Transaction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter only ORDER transactions and apply search
  const orders = transactions
    .filter(t => t.category === 'ORDER')
    .filter(t => 
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.customerName && t.customerName.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xoá đơn hàng này?')) {
      deleteTransaction(id);
      if (selectedOrder?.id === id) {
        setSelectedOrder(null);
      }
    }
  };

  const handlePrint = async (order: Transaction) => {
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

    // Create a hidden container for the invoice
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '76mm'; // A7 width
    container.style.backgroundColor = '#fff';
    container.style.padding = '5mm';
    container.style.fontFamily = "'Inter', sans-serif";
    container.style.color = '#000';
    
    container.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        .invoice-container {
          width: 76mm;
          height: 128mm;
          background: #fff;
          padding: 5mm;
          box-sizing: border-box;
          font-family: 'Inter', sans-serif;
          position: relative;
          overflow: hidden;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 15px;
        }
        .brand-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .brand-name {
          font-size: 18px;
          font-weight: 900;
          line-height: 1.1;
          letter-spacing: -0.5px;
          text-transform: uppercase;
          color: #000;
        }
        .social-links {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 9px;
          color: #444;
        }
        .social-link {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .logo-character {
          width: 50px;
          height: auto;
        }
        .invoice-title {
          font-size: 20px;
          font-weight: 900;
          letter-spacing: -0.5px;
          text-transform: uppercase;
          color: #000;
        }
        .info-section {
          display: grid;
          grid-template-columns: 1.2fr 1fr 1fr;
          gap: 6px;
          margin-bottom: 15px;
          border-top: 1px solid #eee;
          padding-top: 10px;
        }
        .info-block h3 {
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          margin: 0 0 2px 0;
          color: #666;
        }
        .info-block p {
          font-size: 9px;
          margin: 0;
          font-weight: 600;
          color: #000;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        th {
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 5px 0;
          border-bottom: 1px solid #000;
          color: #333;
        }
        td {
          font-size: 9px;
          padding: 5px 0;
          color: #000;
        }
        .border-dotted {
          border-bottom: 1px dotted #ccc;
        }
        .left { text-align: left; }
        .center { text-align: center; }
        .right { text-align: right; }
        
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 10px;
          position: absolute;
          bottom: 5mm;
          left: 5mm;
          right: 5mm;
        }
        .payment-info {
          flex: 1;
        }
        .payment-info h3 {
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          margin: 0 0 4px 0;
          color: #666;
        }
        .payment-info p {
          margin: 0 0 2px 0;
          font-size: 8px;
          color: #333;
        }
        .payment-info .bold {
          font-weight: 700;
          color: #000;
        }
        .qr-section {
          margin-top: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .qr-code {
          width: 45px;
          height: 45px;
          border: 1px solid #eee;
        }
        .qr-text {
          font-size: 7px;
          line-height: 1.2;
        }
        
        .summary {
          width: 90px;
          text-align: right;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
          font-size: 8px;
          color: #444;
        }
        .summary-row.title {
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 6px;
          font-size: 9px;
          color: #000;
        }
        .summary-row.total {
          font-weight: 900;
          font-size: 10px;
          margin-top: 8px;
          padding-top: 5px;
          border-top: 1px solid #000;
          color: #000;
        }
      </style>
      <div class="invoice-container">
        <div class="header">
          <div class="brand-section">
            <div class="brand-name">JELLY<br>SCOOP</div>
            <div class="social-links">
              <div class="social-link">
                <svg width="7" height="7" viewBox="0 0 16 16" fill="currentColor"><path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3V0Z"/></svg>
                @jellyscoop
              </div>
              <div class="social-link">
                <svg width="7" height="7" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.036 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z"/></svg>
              @jellyscoop
              </div>
              <div class="social-link">
                <svg width="7" height="7" viewBox="0 0 16 16" fill="currentColor"><path d="M1.885.511a1.745 1.745 0 0 1 2.61.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z"/></svg>
                0886 849 783
              </div>
            </div>
          </div>
          <img src="https://i.ibb.co/Lz0T1qZ/jelly-scoop-logo.png" class="logo-character" alt="Logo" crossorigin="anonymous" />
          <div class="invoice-title">INVOICE</div>
        </div>
      
        <div class="info-section">
          <div class="info-block">
            <h3>KHÁCH HÀNG</h3>
            <p>${order.customerName || 'Khách lẻ'}</p>
          </div>
          <div class="info-block">
            <h3>NGÀY</h3>
            <p>${new Date(order.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}</p>
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
              <th class="center">SL</th>
              <th class="right">ĐƠN GIÁ</th>
              <th class="right">THÀNH TIỀN</th>
            </tr>
          </thead>
          <tbody>
            ${orderItemsHtml}
            <tr>
              <td colspan="4" class="border-dotted"></td>
            </tr>
          </tbody>
        </table>
      
        <div class="footer">
          <div class="payment-info">
            <h3>THANH TOÁN</h3>
            <p>MB bank</p>
            <p class="bold">LY THI KIM NHAN</p>
            <p>11391679168</p>
            
            <div class="qr-section">
              <img src="https://img.vietqr.io/image/MB-11391679168-compact.png?amount=${order.amount}&addInfo=Thanh%20toan%20don%20hang%20${order.id.slice(0,8)}&accountName=LY%20THI%20KIM%20NHAN" class="qr-code" alt="Bank QR" crossorigin="anonymous" />
              <div class="qr-text">
                <p class="bold">Quét mã thanh toán</p>
                <p>MB Bank - 11391679168</p>
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
            <div class="summary-row total">
              <span>TỔNG CỘNG</span>
              <span>${formatCurrency(order.amount)} VNĐ</span>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    try {
      // Wait for images to load
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(container, {
        scale: 4,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 76 * 3.7795275591,
        height: 128 * 3.7795275591,
        windowWidth: 76 * 3.7795275591,
        windowHeight: 128 * 3.7795275591
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [76, 128]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 76, 128, undefined, 'FAST');
      pdf.save(`invoice-${order.id.slice(0, 8)}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Có lỗi xảy ra khi tạo PDF. Vui lòng thử lại.');
    } finally {
      document.body.removeChild(container);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo mô tả hoặc tên khách hàng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
          />
        </div>
        <div className="text-sm text-slate-500">
          Hiển thị <span className="font-semibold text-slate-900">{orders.length}</span> đơn hàng
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
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

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Chưa có đơn hàng nào
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="p-4 space-y-4 active:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(order.date).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-900">
                      {order.customerName || 'Khách lẻ'}
                    </div>
                    {order.customerPhone && (
                      <div className="text-xs text-slate-500">{order.customerPhone}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-indigo-600">
                      {formatCurrency(order.amount)}đ
                    </div>
                    <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                      {order.description.includes('Scoop') ? 'Đơn Scoop' : 'Đơn lẻ'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                  <div className="text-xs text-slate-500 truncate max-w-[180px]">
                    {order.description}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="text-xs font-medium">Xem</span>
                    </button>
                    <button
                      onClick={() => handlePrint(order)}
                      className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Printer className="w-4 h-4" />
                      <span className="text-xs font-medium">In</span>
                    </button>
                    <button
                      onClick={() => handleDelete(order.id)}
                      className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
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
            
            <div className="p-4 md:p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Thông tin chung</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between md:block">
                      <span className="text-slate-500 md:mr-2">Mã ĐH:</span>
                      <span className="font-mono font-bold text-slate-700">{selectedOrder.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between md:block">
                      <span className="text-slate-500 md:mr-2">Ngày:</span>
                      <span className="text-slate-700">{new Date(selectedOrder.date).toLocaleString('vi-VN')}</span>
                    </div>
                    <div className="flex justify-between md:block">
                      <span className="text-slate-500 md:mr-2">Mô tả:</span>
                      <span className="text-slate-700">{selectedOrder.description}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Khách hàng</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between md:block">
                      <span className="text-slate-500 md:mr-2">Tên:</span>
                      <span className="font-bold text-slate-700">{selectedOrder.customerName || 'Khách lẻ'}</span>
                    </div>
                    {selectedOrder.customerPhone && (
                      <div className="flex justify-between md:block">
                        <span className="text-slate-500 md:mr-2">SĐT:</span>
                        <span className="text-slate-700">{selectedOrder.customerPhone}</span>
                      </div>
                    )}
                    {selectedOrder.customerAddress && (
                      <div className="flex justify-between md:block">
                        <span className="text-slate-500 md:mr-2">Địa chỉ:</span>
                        <span className="text-slate-700">{selectedOrder.customerAddress}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Sản phẩm ({selectedOrder.items?.length || 0})</h3>
              
              {/* Desktop Table View */}
              <div className="hidden md:block border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="p-4">Sản phẩm</th>
                      <th className="p-4 text-center">Số lượng</th>
                      <th className="p-4 text-right">Đơn giá</th>
                      <th className="p-4 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrder.items?.map((item, index) => {
                      const product = products.find(p => p.id === item.productId);
                      const price = item.retailPrice ?? (product?.retailPrice ?? product?.cost ?? 0);
                      return (
                        <tr key={index} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {product?.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 border border-slate-200">No img</div>
                              )}
                              <span className="font-semibold text-slate-900">{product?.name || 'Sản phẩm không xác định'}</span>
                            </div>
                          </td>
                          <td className="p-4 text-center font-medium">{item.quantity}</td>
                          <td className="p-4 text-right text-slate-600">{formatCurrency(price)}đ</td>
                          <td className="p-4 text-right font-bold text-slate-900">{formatCurrency(price * item.quantity)}đ</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td colSpan={3} className="p-4 text-right font-bold text-slate-600 uppercase tracking-wider text-xs">Tổng cộng:</td>
                      <td className="p-4 text-right font-black text-lg text-indigo-600">{formatCurrency(selectedOrder.amount)}đ</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {selectedOrder.items?.map((item, index) => {
                  const product = products.find(p => p.id === item.productId);
                  const price = item.retailPrice ?? (product?.retailPrice ?? product?.cost ?? 0);
                  return (
                    <div key={index} className="bg-white border border-slate-200 rounded-xl p-3 flex gap-3 shadow-sm">
                      {product?.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-16 h-16 rounded-lg object-cover border border-slate-100 flex-shrink-0" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 border border-slate-100 flex-shrink-0">No img</div>
                      )}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div className="font-bold text-slate-900 text-sm truncate">{product?.name || 'Sản phẩm không xác định'}</div>
                        <div className="flex justify-between items-end">
                          <div className="text-xs text-slate-500">
                            {formatCurrency(price)}đ x {item.quantity}
                          </div>
                          <div className="font-bold text-indigo-600 text-sm">
                            {formatCurrency(price * item.quantity)}đ
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="bg-indigo-600 rounded-xl p-4 flex justify-between items-center shadow-lg shadow-indigo-200">
                  <span className="text-white/80 font-bold text-xs uppercase tracking-widest">Tổng cộng</span>
                  <span className="text-white font-black text-xl">{formatCurrency(selectedOrder.amount)}đ</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => handlePrint(selectedOrder)}
                className="w-full sm:w-auto px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
              >
                <Printer className="w-5 h-5" />
                In hoá đơn
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 active:scale-95"
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
