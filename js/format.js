const naira = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });

export function formatPrice(property) {
  if (!property || property.hide_price || property.price == null) return 'Contact for price';
  return naira.format(Number(property.price));
}

export function formatLocation(property, includeAddress = false) {
  return [property.neighbourhood, property.city, property.state, includeAddress && property.address]
    .filter(Boolean).join(', ');
}

export function formatCategory(category) {
  return ({ residential: 'Residential', land: 'Land', commercial: 'Commercial', other: 'Other assets' })[category] || 'Property';
}

export function formatStatus(status) {
  return ({ active: 'Available', closed: 'Closed', coming_soon: 'Coming soon' })[status] || 'Status unavailable';
}

export function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, '\\$&');
}
