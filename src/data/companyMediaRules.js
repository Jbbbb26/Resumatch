export const MAX_GALLERY_PHOTOS = 5;
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function validateImage(file, maxBytes) {
  if (!file) return 'Choose an image.';
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return `"${file.name}" isn't a JPG, PNG, WebP or GIF image.`;
  if (file.size > maxBytes) return `"${file.name}" is larger than ${Math.round(maxBytes / 1024 / 1024)} MB.`;
  return '';
}

export function galleryFrom(value) {
  return (Array.isArray(value) ? value : [])
    .map((entry) => (typeof entry === 'string' ? { url: entry, path: null } : { url: entry?.url || entry?.src, path: entry?.path || null }))
    .filter((entry) => typeof entry.url === 'string' && /^https?:\/\//i.test(entry.url))
    .slice(0, MAX_GALLERY_PHOTOS);
}
