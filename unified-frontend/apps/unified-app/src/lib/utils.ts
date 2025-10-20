import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { get } from 'lodash-es';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export { get };