import { format, formatDistanceToNow } from 'date-fns';

export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return format(new Date(dateString), 'MMM d, yyyy HH:mm:ss');
}

export function formatTimeAgo(dateString) {
  if (!dateString) return 'N/A';
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
}

export function formatConfidence(confidence) {
  if (confidence === null || confidence === undefined) return 'N/A';
  return `${(confidence * 100).toFixed(1)}%`;
}

export function formatPosition(x, y, z) {
  if (x === null || y === null || z === null) return 'N/A';
  return `(${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}) mm`;
}

export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString();
}
