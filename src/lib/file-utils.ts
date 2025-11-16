export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function validateFile(file: File, options?: {
  accept?: string[];
  maxSize?: number;
}): { valid: boolean; error?: string } {
  const { accept = ACCEPTED_IMAGE_TYPES, maxSize = MAX_FILE_SIZE } = options || {};

  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (!accept.includes(file.type)) {
    return { 
      valid: false, 
      error: `Invalid file type. Only ${accept.join(', ')} are allowed.` 
    };
  }

  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `File size exceeds ${formatFileSize(maxSize)} limit` 
    };
  }

  return { valid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf';
}

export function getFileIcon(file: File): string {
  if (isImageFile(file)) return 'image';
  if (isPdfFile(file)) return 'file-text';
  return 'file';
}
