import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatBytes = (bytesString: string, decimals = 2): string => {
  const bytes = parseInt(bytesString, 10);
  if (isNaN(bytes) || bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizeUnits = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const unitIndex = Math.floor(Math.log(bytes) / Math.log(k));
  const convertedValue = parseFloat(
    (bytes / Math.pow(k, unitIndex)).toFixed(dm)
  );

  return `${convertedValue} ${sizeUnits[unitIndex]}`;
};
