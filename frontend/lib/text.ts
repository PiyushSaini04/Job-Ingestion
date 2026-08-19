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

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Not provided';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not provided';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

export function formatCooldownMessage(retryAfterMs: number | null | undefined, subject = 'Jobs'): string | null {
  if (!retryAfterMs || retryAfterMs <= 0) return null;
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60000));
  return `${subject} were refreshed recently. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}

export function compactLocation(value: string | null | undefined): string {
  if (!value || !value.trim()) return 'Not provided';
  return value.replace(/,\s*$/, '').trim();
}
