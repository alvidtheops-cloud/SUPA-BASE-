export function whatsappUrl(phone, propertyTitle, enquiryMessage = '') {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  const message = enquiryMessage || `Hello, I am enquiring about ${propertyTitle}. Please share more information.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
