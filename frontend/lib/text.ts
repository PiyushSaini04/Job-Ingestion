export function stripHtml(value: string | null | undefined): string {
  if (!value) return 'Not provided';
  const withoutTags = value.replace(/<[^>]*>/g, ' ');
  return withoutTags.replace(/\s+/g, ' ').trim() || 'Not provided';
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not provided';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not provided';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

export function compactLocation(value: string | null | undefined): string {
  if (!value || !value.trim()) return 'Not provided';
  return value.replace(/,\s*$/, '').trim();
}
