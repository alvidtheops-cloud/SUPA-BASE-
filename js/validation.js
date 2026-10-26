export const E164_PATTERN = /^\+[1-9]\d{7,14}$/;
export const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

export function validatePhone(phone) {
  return E164_PATTERN.test(String(phone || '').trim());
}

export function validateComingSoon(status, expectedDate, now = new Date()) {
  if (status !== 'coming_soon') return true;
  if (!expectedDate) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(expectedDate) && expectedDate > dateInNigeria(now);
}

export function expectedDatePassed(expectedDate, now = new Date()) {
  return Boolean(expectedDate && expectedDate <= dateInNigeria(now));
}

function dateInNigeria(date) {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const values=Object.fromEntries(parts.map((part)=>[part.type,part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function validateEnquiry({ name, contact, subject, message }) {
  return String(name || '').trim().length > 0 && String(name).trim().length <= 120 &&
    String(contact || '').trim().length >= 3 && String(contact).trim().length <= 254 &&
    String(subject || '').trim().length > 0 && String(subject).trim().length <= 160 &&
    String(message || '').trim().length > 0 && String(message).trim().length <= 5000;
}

export function validateImage(file) {
  if (!IMAGE_TYPES.has(file.type)) return 'Choose a JPEG, PNG, WebP, or AVIF image.';
  if (file.size > IMAGE_MAX_BYTES) return 'Each image must be 8 MB or smaller.';
  return '';
}

export async function resizeImage(file, maxWidth = 1800, quality = 0.82) {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
  const context = canvas.getContext('2d');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const outputType = file.type === 'image/png' ? 'image/png' : 'image/webp';
  const blob = await new Promise((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Image compression failed.')), outputType, quality));
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.${outputType === 'image/png' ? 'png' : 'webp'}`, { type: outputType, lastModified: Date.now() });
}
