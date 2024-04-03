import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDomain() {
  if (process.env.NODE_ENV === 'development') {
    return process.env.DOMAIN_FOR_DEVELOPMENT || 'http://localhost:3000/';
  } else if (process.env.NODE_ENV === 'production') {
    return process.env.DOMAIN_FOR_PRODUCTION || 'http://localhost:3000/';
  } else {
    return process.env.DOMAIN_FOR_DEVELOPMENT;
  }
}
