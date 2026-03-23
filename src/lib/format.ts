export const formatCurrency = (value: number | string): string => {
  if (value === '' || value === null || value === undefined) return '';
  const num = typeof value === 'string' ? parseInt(value.replace(/\D/g, ''), 10) : value;
  if (isNaN(num)) return '';
  return num.toLocaleString('vi-VN');
};

export const parseCurrency = (value: string): number => {
  if (!value) return 0;
  return parseInt(value.replace(/\D/g, ''), 10) || 0;
};

export const generateBarcodeNumber = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString().padStart(14, '0');
};
