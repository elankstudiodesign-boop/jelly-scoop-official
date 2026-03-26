import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';
import { Product, PackagingItem } from '../types';
import { formatCurrency, generateBarcodeNumber } from './format';

export const downloadBarcode = (product: Product) => {
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

export const downloadPackagingBarcode = (item: PackagingItem) => {
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
