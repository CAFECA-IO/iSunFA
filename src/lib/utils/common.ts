import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ALLOWED_ORIGINS } from '../../constants/config';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDomains() {
  return ALLOWED_ORIGINS;
}
