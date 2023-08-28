import { twMerge } from 'tailwind-merge';
import clsx, { ClassValue} from 'clsx';

export default function cn(...values: ClassValue[]) {
  return twMerge(clsx(values))
}
