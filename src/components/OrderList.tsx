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

    const dateObj = new Date(order.date);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;

    // Create a hidden container for the invoice
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '210mm'; // A4 width
    container.style.backgroundColor = '#fff';
    container.style.fontFamily = "'Inter', sans-serif";
    container.style.color = '#000';
    
    container.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        .invoice-container {
          width: 210mm;
          min-height: 297mm;
          background: #fff;
          padding: 20mm;
          box-sizing: border-box;
          font-family: 'Inter', sans-serif;
          position: relative;
          color: #000;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
        }
        .brand-name {
          font-size: 48px;
          font-weight: 900;
          line-height: 1;
          text-transform: uppercase;
          margin-bottom: 15px;
        }
        .social-links {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 18px;
        }
        .social-link {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .invoice-title {
          font-size: 96px;
          font-weight: 900;
          line-height: 1;
          text-transform: uppercase;
        }
        .info-section {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
          margin-bottom: 40px;
        }
        .info-block h3 {
          font-size: 18px;
          font-weight: 900;
          text-transform: uppercase;
          margin: 0 0 10px 0;
        }
        .info-block p {
          font-size: 16px;
          margin: 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 40px;
        }
        th {
          font-size: 18px;
          font-weight: 900;
          text-transform: uppercase;
          padding: 15px 0;
          border-bottom: 2px solid #000;
          text-align: left;
        }
        td {
          font-size: 16px;
          padding: 15px 0;
        }
        .product-row {
          border-bottom: 2px dotted #000;
        }
        .left { text-align: left; }
        .center { text-align: center; }
        .right { text-align: right; }
        
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-top: 40px;
        }
        .payment-info h3 {
          font-size: 18px;
          font-weight: 900;
          text-transform: uppercase;
          margin: 0 0 10px 0;
        }
        .payment-info p {
          margin: 0 0 5px 0;
          font-size: 16px;
        }
        .payment-info .bold {
          font-weight: 900;
        }
        
        .summary {
          width: 300px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 16px;
        }
        .summary-row.total {
          font-weight: 900;
          font-size: 24px;
          margin-top: 20px;
          padding-top: 15px;
          border-top: 2px solid #000;
        }
      </style>
      <div class="invoice-container">
        <div class="header">
          <div class="brand-section">
            <div class="brand-name">JELLY<br>SCOOP</div>
            <div class="social-links">
              <div class="social-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.6-4.12-1.31a6.33 6.33 0 0 1-1.87-1.5c-.02 3.87-.03 7.74-.03 11.61 0 .54-.08 1.1-.23 1.62-.83 2.85-3.67 4.64-6.55 4.39-3.82-.31-6.03-4.72-4.05-7.96 1.08-1.79 3.13-2.79 5.23-2.53v4.26c-.74-.18-1.54-.02-2.14.39-.87.61-1.17 1.81-.7 2.7.42.8 1.48 1.11 2.31.7.58-.29.91-.9.91-1.54V0h1.25z"/></svg>
                @jellyscoop
              </div>
              <div class="social-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.332 3.608 1.308.975.975 1.245 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.332 2.633-1.308 3.608-.975.975-2.242 1.245-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.332-3.608-1.308-.975-.975-1.245-2.242-1.308-3.608-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.062-1.366.332-2.633 1.308-3.608.975-.975 2.242-1.245 3.608-1.308 1.266-.058 1.646-.07 4.85-.07zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.355 2.618 6.778 6.98 6.978 1.28.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.058-1.28.072-1.689.072-4.948 0-3.259-.014-3.668-.072-4.948-.199-4.359-2.612-6.784-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4.162 4.162 0 110-8.324 4.162 4.162 0 010 8.324zM18.406 4.406a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z"/></svg>
                @jellyscoop
              </div>
              <div class="social-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.46 14.88l-1.05-1.05c-.14-.14-.14-.37 0-.51l1.05-1.05c.14-.14.37-.14.51 0l1.05 1.05c.14.14.14.37 0 .51l-1.05 1.05c-.14.14-.37.14-.51 0zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/></svg>
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
            ${order.customerAddress ? `<p>${order.customerAddress}</p>` : ''}
          </div>
          <div class="info-block">
            <h3>NGÀY</h3>
            <p>${formattedDate}</p>
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
            ${order.items?.map(item => {
              const product = products.find(p => p.id === item.productId);
              const name = product ? product.name : 'Sản phẩm không xác định';
              const price = item.retailPrice ?? (product?.retailPrice ?? product?.cost ?? 0);
              return `
                <tr class="product-row">
                  <td class="left">${name}</td>
                  <td class="center">${item.quantity}</td>
                  <td class="right">${formatCurrency(price)}</td>
                  <td class="right">${formatCurrency(price * item.quantity)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      
        <div class="footer">
          <div class="payment-info">
            <h3>PHƯƠNG THỨC THANH TOÁN</h3>
            <p>Chuyển khoản ngân hàng</p>
            <p class="bold">MB BANK</p>
            <p class="bold">LÝ THỊ KIM NHẪN</p>
            <p class="bold">11391679168</p>
          </div>
          <div class="summary">
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
      </div>
    `;

    document.body.appendChild(container);

    try {
      // Wait for images to load
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 210 * 3.7795275591,
        height: 297 * 3.7795275591,
        windowWidth: 210 * 3.7795275591,
        windowHeight: 297 * 3.7795275591
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
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
