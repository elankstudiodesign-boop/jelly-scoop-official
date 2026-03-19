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
