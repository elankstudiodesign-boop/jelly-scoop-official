import { supabase } from './supabase';
import imageCompression from 'browser-image-compression';
import heic2any from 'heic2any';

export const dataUrlToBlob = (dataUrl: string) => {
  const [meta, b64] = dataUrl.split(',');
  const mime = meta.match(/data:(.*?);base64/i)?.[1] || 'application/octet-stream';
  const binary = atob(b64 || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
};

export const processImage = async (file: File | Blob): Promise<File | Blob> => {
  let processedFile = file;

  // 1. Handle HEIC/HEIF
  const type = file.type.toLowerCase();
  if (type === 'image/heic' || type === 'image/heif' || (file instanceof File && (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')))) {
    try {
      const converted = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.8
      });
      processedFile = Array.isArray(converted) ? converted[0] : converted;
    } catch (err) {
      console.error('HEIC conversion failed:', err);
    }
  }

  // 2. Compress and resize
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    initialQuality: 0.8
  };

  try {
    // If it's a Blob but not a File, we might need to wrap it or just pass it
    const compressedFile = await imageCompression(processedFile as File, options);
    return compressedFile;
  } catch (err) {
    console.error('Image compression failed:', err);
    return processedFile;
  }
};

export const uploadProductImage = async (productId: string, file: Blob, contentType: string) => {
  const bucket = 'product-images';
  
  // Process image before upload
  const processedFile = await processImage(file);
  const finalContentType = processedFile.type || contentType;

  const ext = (() => {
    const t = (finalContentType || '').toLowerCase();
    if (t.includes('png')) return 'png';
    if (t.includes('webp')) return 'webp';
    if (t.includes('gif')) return 'gif';
    if (t.includes('jpeg') || t.includes('jpg')) return 'jpg';
    return 'bin';
  })();
  const random = Math.random().toString(16).slice(2);
  const path = `${productId}/${Date.now()}-${random}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, processedFile, { upsert: true, contentType: finalContentType });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};
