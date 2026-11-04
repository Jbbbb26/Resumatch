import { supabase } from '../../../supabaseClient.js';

import { ALLOWED_IMAGE_TYPES, MAX_GALLERY_PHOTOS, MAX_LOGO_BYTES, MAX_PHOTO_BYTES, galleryFrom, validateImage } from '../companyMediaRules';

export { ALLOWED_IMAGE_TYPES, MAX_GALLERY_PHOTOS, MAX_LOGO_BYTES, MAX_PHOTO_BYTES, galleryFrom, validateImage };
export const COMPANY_MEDIA_BUCKET = 'company-media';

const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
const randomId = () => (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);

async function uploadImage(userId, file, folder) {
  const path = `${userId}/${folder}${randomId()}.${EXTENSIONS[file.type] || 'img'}`;
  const { error } = await supabase.storage.from(COMPANY_MEDIA_BUCKET).upload(path, file, {
    cacheControl: '31536000', contentType: file.type, upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data } = supabase.storage.from(COMPANY_MEDIA_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

async function removeFiles(paths) {
  const valid = paths.filter(Boolean);
  if (!valid.length) return;
  const { error } = await supabase.storage.from(COMPANY_MEDIA_BUCKET).remove(valid);
  if (error) console.warn('Could not delete old company media:', error.message);
}

async function saveEmployer(user, fields, exists) {
  const request = exists
    ? supabase.from('employers').update(fields).eq('id', user.id)
    : supabase.from('employers').insert({ id: user.id, email: user.email, companyName: user.name || 'Company Workspace', ...fields });
  const { data, error } = await request.select('id, logo_url, logo_path, gallery_photos').single();
  if (error) throw new Error(`Could not save: ${error.message}`);
  return data;
}

export async function uploadCompanyLogo(user, file, { exists, previousPath }) {
  const problem = validateImage(file, MAX_LOGO_BYTES);
  if (problem) throw new Error(problem);
  const uploaded = await uploadImage(user.id, file, 'logo-');
  try {
    const row = await saveEmployer(user, { logo_url: uploaded.url, logo_path: uploaded.path }, exists);
    if (previousPath && previousPath !== uploaded.path) await removeFiles([previousPath]);
    return row;
  } catch (error) {
    await removeFiles([uploaded.path]);
    throw error;
  }
}

export async function removeCompanyLogo(user, { exists, previousPath }) {
  const row = await saveEmployer(user, { logo_url: null, logo_path: null }, exists);
  await removeFiles([previousPath]);
  return row;
}

export async function addGalleryPhotos(user, files, { exists, current }) {
  const gallery = galleryFrom(current);
  const room = MAX_GALLERY_PHOTOS - gallery.length;
  if (room <= 0) throw new Error(`You already have ${MAX_GALLERY_PHOTOS} photos. Remove one to add another.`);
  const chosen = Array.from(files);
  for (const file of chosen) {
    const problem = validateImage(file, MAX_PHOTO_BYTES);
    if (problem) throw new Error(problem);
  }
  const accepted = chosen.slice(0, room);
  const uploaded = [];
  try {
    for (const file of accepted) uploaded.push(await uploadImage(user.id, file, 'gallery/'));
    const row = await saveEmployer(user, { gallery_photos: [...gallery, ...uploaded] }, exists);
    return { row, skipped: chosen.length - accepted.length };
  } catch (error) {
    await removeFiles(uploaded.map((item) => item.path));
    throw error;
  }
}

export async function removeGalleryPhoto(user, photo, { exists, current }) {
  const gallery = galleryFrom(current).filter((item) => item.url !== photo.url);
  const row = await saveEmployer(user, { gallery_photos: gallery }, exists);
  await removeFiles([photo.path]);
  return row;
}
