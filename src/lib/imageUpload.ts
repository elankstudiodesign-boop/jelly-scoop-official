import { supabase } from './supabase';

export const dataUrlToBlob = (dataUrl: string) => {
  const [meta, b64] = dataUrl.split(',');
  const mime = meta.match(/data:(.*?);base64/i)?.[1] || 'application/octet-stream';
  const binary = atob(b64 || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
};

export const uploadProductImage = async (productId: string, file: Blob, contentType: string) => {
  const bucket = 'product-images';
  const ext = (() => {
    const t = (contentType || '').toLowerCase();
    if (t.includes('png')) return 'png';
    if (t.includes('webp')) return 'webp';
    if (t.includes('gif')) return 'gif';
    if (t.includes('jpeg') || t.includes('jpg')) return 'jpg';
    return 'bin';
  })();
  const random = Math.random().toString(16).slice(2);
  const path = `${productId}/${Date.now()}-${random}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};
