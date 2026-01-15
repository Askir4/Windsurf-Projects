import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
    case 'approved':
      return 'bg-green-500/10 text-green-600 dark:text-green-400';
    case 'denied':
      return 'bg-red-500/10 text-red-600 dark:text-red-400';
    case 'expired':
      return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    default:
      return 'bg-gray-500/10 text-gray-600';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Ausstehend';
    case 'approved':
      return 'Genehmigt';
    case 'denied':
      return 'Abgelehnt';
    case 'expired':
      return 'Abgelaufen';
    default:
      return status;
  }
}
