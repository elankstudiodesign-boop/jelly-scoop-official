const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/pages/Live.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = "{activeTab === 'CREATE' ? (\n        <div className=\"grid grid-cols-1 lg:grid-cols-3 gap-6\">";
const endMarker = "      </div>\n      ) : (\n        <OrderList";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Markers not found!');
  process.exit(1);
}

const newContent = `{activeTab === 'CREATE' ? (
        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100dvh-180px)] min-h-[600px]">
          {/* Left Column: Product Grid (POS) */}
          <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden lg:h-full">
            {/* Search & Scanner Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-3 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Tìm tên sản phẩm..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
                {productSearch && (
                  <button 
                    onClick={() => setProductSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-200 rounded-full transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setIsScanning(true)}
                className="flex items-center justify-center w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors shrink-0"
              >
                <Barcode className="w-5 h-5" />
              </button>
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredProducts.map(product => {
                    const availableQty = orderType === 'RETAIL' ? (product.warehouseQuantity || 0) : (product.quantity || 0);
                    const isDisabled = availableQty <= 0;
                    return (
                      <button
                        key={product.id}
                        disabled={isDisabled}
                        onClick={() => addProductToOrder(product, orderType === 'RETAIL' ? (product.retailPrice || product.cost) : undefined)}
                        className={\`flex flex-col text-left bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.98] \${isDisabled ? 'opacity-50 grayscale cursor-not-allowed' : ''}\`}
                      >
                        <div className="h-24 w-full bg-slate-100 relative">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <Package className="w-8 h-8" />
                            </div>
                          )}
                          <div className={\`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm \${
                            availableQty > 10 ? 'bg-emerald-500 text-white' : availableQty > 0 ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                          }\`}>
                            {availableQty}
                          </div>
                        </div>
                        <div className="p-2.5 flex-1 flex flex-col justify-between">
                          <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight mb-1">{product.name}</p>
                          <p className="text-xs font-black text-indigo-600">
                            {formatCurrency(orderType === 'RETAIL' ? (product.retailPrice || product.cost) : product.cost)}đ
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Search className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-bold">Không tìm thấy sản phẩm</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Cart Panel */}
          <div className="w-full lg:w-[400px] xl:w-[450px] flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden lg:h-full shrink-0">
            
            {/* Header: Order Type Toggle & Clear */}
            <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <div className="flex bg-slate-200/50 p-1 rounded-lg flex-1">
                <button
                  onClick={() => { setOrderType('SCOOP'); handleClearOrder(); }}
                  className={\`flex-1 py-1.5 px-2 rounded-md text-xs font-bold transition-all \${
                    orderType === 'SCOOP' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                  }\`}
                >
                  Đơn Scoop
                </button>
                <button
                  onClick={() => { setOrderType('RETAIL'); handleClearOrder(); }}
                  className={\`flex-1 py-1.5 px-2 rounded-md text-xs font-bold transition-all \${
                    orderType === 'RETAIL' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                  }\`}
                >
                  Đơn Lẻ
                </button>
              </div>
              <button 
                onClick={handleClearOrder}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Làm mới đơn hàng"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Cart Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/30">
              
              {/* Order Items List */}
              {orderItems.length > 0 ? (
                <div className="space-y-2">
                  {orderItems.map((item) => (
                    <div key={item.product.id} className="flex gap-3 p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm">
                      <img src={item.product.imageUrl} alt={item.product.name} className="w-12 h-12 rounded-lg object-cover border border-slate-100" />
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-slate-800 text-xs leading-tight line-clamp-2 pr-2">{item.product.name}</p>
                          <button onClick={() => handleUpdateQuantity(item.product.id, -item.quantity)} className="text-slate-300 hover:text-red-500">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs font-black text-indigo-600">
                            {formatCurrency(item.retailPrice ?? item.product.retailPrice ?? item.product.cost)}đ
                          </p>
                          <div className="flex items-center bg-slate-100 rounded-lg overflow-hidden">
                            <button onClick={() => handleUpdateQuantity(item.product.id, -1)} className="px-2 py-1 text-slate-600 hover:bg-slate-200 font-bold">-</button>
                            <span className="w-6 text-center text-xs font-bold text-slate-900">{item.quantity}</span>
                            <button onClick={() => handleUpdateQuantity(item.product.id, 1)} className="px-2 py-1 text-slate-600 hover:bg-slate-200 font-bold">+</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-bold">Chưa có sản phẩm</p>
                </div>
              )}

              {/* Scanned Packaging Items */}
              {scannedPackagingItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Bao bì đã quét</h4>
                  {scannedPackagingItems.map((p) => (
                    <div key={p.item.id} className="flex gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-slate-200 shrink-0">
                        <Package className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-slate-800 text-xs leading-tight line-clamp-1 pr-2">{p.item.name}</p>
                          <button onClick={() => setScannedPackagingItems(prev => prev.filter(item => item.item.id !== p.item.id))} className="text-slate-300 hover:text-red-500">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-[10px] font-bold text-slate-500">{formatCurrency(p.item.price)}đ</p>
                          <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden">
                            <button onClick={() => setScannedPackagingItems(prev => prev.map(item => item.item.id === p.item.id ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item).filter(item => item.quantity > 0))} className="px-2 py-0.5 text-slate-600 hover:bg-slate-50 font-bold">-</button>
                            <span className="w-6 text-center text-[10px] font-bold text-slate-900">{p.quantity}</span>
                            <button onClick={() => setScannedPackagingItems(prev => prev.map(item => item.item.id === p.item.id ? { ...item, quantity: item.quantity + 1 } : item))} className="px-2 py-0.5 text-slate-600 hover:bg-slate-50 font-bold">+</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Order Settings (Scoop / Retail) */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                {orderType === 'SCOOP' ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Số lượng Scoop</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={scoopQuantity}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === '') { setScoopQuantity(''); return; }
                            const num = parseInt(val.replace(/[^0-9]/g, ''));
                            if (!isNaN(num)) setScoopQuantity(Math.min(10000, num).toString());
                          }}
                          onBlur={() => { if (scoopQuantity === '' || Number(scoopQuantity) < 1) setScoopQuantity('1'); }}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Giá Scoop</label>
                        <input
                          type="text"
                          value={customScoopPrice}
                          onChange={e => setCustomScoopPrice(formatCurrency(parseCurrency(e.target.value)))}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Ghi chú</label>
                      <textarea
                        value={scoopNotes}
                        onChange={e => setScoopNotes(e.target.value)}
                        placeholder="Ghi chú hoá đơn..."
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none resize-none h-16"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button
                        onClick={() => setRetailPricingMode('ITEM')}
                        className={\`flex-1 py-1.5 px-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all \${
                          retailPricingMode === 'ITEM' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                        }\`}
                      >
                        Tính theo món
                      </button>
                      <button
                        onClick={() => setRetailPricingMode('SCOOP')}
                        className={\`flex-1 py-1.5 px-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all \${
                          retailPricingMode === 'SCOOP' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                        }\`}
                      >
                        Tính theo Scoop
                      </button>
                    </div>
                    {retailPricingMode === 'SCOOP' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Số lượng Scoop</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={scoopQuantity}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '') { setScoopQuantity(''); return; }
                              const num = parseInt(val.replace(/[^0-9]/g, ''));
                              if (!isNaN(num)) setScoopQuantity(Math.min(10000, num).toString());
                            }}
                            onBlur={() => { if (scoopQuantity === '' || Number(scoopQuantity) < 1) setScoopQuantity('1'); }}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Giá Scoop</label>
                          <input
                            type="text"
                            value={customScoopPrice}
                            onChange={e => setCustomScoopPrice(formatCurrency(parseCurrency(e.target.value)))}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                          />
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Bao bì (đ)</label>
                        <input
                          type="text"
                          value={retailPackagingCost}
                          onChange={e => setRetailPackagingCost(formatCurrency(parseCurrency(e.target.value)))}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Vận chuyển (đ)</label>
                        <input
                          type="text"
                          value={shippingCost}
                          onChange={e => setShippingCost(formatCurrency(parseCurrency(e.target.value)))}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Giảm giá (đ)</label>
                        <input
                          type="text"
                          value={discount}
                          onChange={e => setDiscount(formatCurrency(parseCurrency(e.target.value)))}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Customer Info */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Khách hàng</h4>
                <div className="space-y-2.5">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Tên khách hàng"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                  />
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Số điện thoại"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                  />
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Địa chỉ"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                  />
                </div>
              </div>
              
            </div>

            {/* Sticky Footer: Summary & Pay */}
            <div className="p-4 border-t border-slate-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
              <div className="flex justify-between items-end mb-4">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Tổng thanh toán</span>
                <span className={\`text-2xl font-black \${orderType === 'SCOOP' ? 'text-indigo-600' : 'text-emerald-600'}\`}>
                  {formatCurrency(totalAmount)}đ
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDownloadCustomerPDF}
                  disabled={orderItems.length === 0 || (orderType === 'SCOOP' && Number(scoopQuantity) <= 0)}
                  className="py-3 rounded-xl font-bold text-xs uppercase tracking-wider border-2 border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Tải PDF
                </button>
                <button
                  onClick={handlePrintInternal}
                  disabled={orderItems.length === 0}
                  className={\`py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 \${
                    orderType === 'SCOOP' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }\`}
                >
                  <Printer className="w-4 h-4" />
                  In & Hoàn tất
                </button>
              </div>
              {orderType === 'RETAIL' && (
                <button
                  onClick={handleCompleteOrder}
                  disabled={orderItems.length === 0 || currentRevenue <= 0}
                  className="w-full mt-2 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Chỉ hoàn tất (Không in)
                </button>
              )}
            </div>
          </div>
        </div>`;

content = content.substring(0, startIndex) + newContent + content.substring(endIndex);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated Live.tsx successfully!');
