import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ALLOWED_ORIGINS } from '../../constants/config';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDomains() {
  return ALLOWED_ORIGINS;
}

// Info: truncate the string to the given length (20240416 - Shirley)
export function truncateString(str: string, length: number) {
  const result = str.length > length ? str.slice(0, length) + '...' : str;
  return result;
}
