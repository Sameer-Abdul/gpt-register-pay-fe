import { useCallback, useState, useRef, ChangeEvent } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useImageUpload } from '@/hooks/useImageUpload';
import { formatFileSize } from '@/lib/file-utils';

interface ImageUploadProps {
  value?: string | null;
  onChange: (value: string | null) => void;
  maxSize?: number;
  accept?: string[];
  className?: string;
  disabled?: boolean;
  label?: string;
  aspectRatio?: number;
}

export function ImageUpload({
  value,
  onChange,
  maxSize = 5 * 1024 * 1024, // 5MB
  accept = ['image/jpeg', 'image/png', 'image/webp'],
  className,
  disabled = false,
  label = 'Upload image',
  aspectRatio = 16 / 9,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);

  const { upload, progress, isUploading, error, reset: resetUpload } = useImageUpload({
    maxSize,
    accept,
    onSuccess: (_, fileUrl) => {
      setPreview(fileUrl);
      onChange(fileUrl);
    },
  });

  const handleFileChange = useCallback(
    async (file: File | null) => {
      if (!file) return;

      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload file
      await upload(file);
    },
    [upload]
  );

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) handleFileChange(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (disabled || !e.dataTransfer.files?.length) return;
    
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    onChange(null);
    resetUpload();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const acceptString = accept.join(',');
  const maxSizeMB = maxSize / (1024 * 1024);

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          <span className="ml-1 text-xs text-gray-500">
            (Max {maxSizeMB}MB, {accept.map(ext => ext.split('/')[1]).join(', ')})
          </span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptString}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      <div
        onClick={openFileDialog}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/10'
            : 'border-gray-300 hover:border-primary/50 dark:border-gray-700',
          disabled && 'cursor-not-allowed opacity-60',
          !disabled && 'cursor-pointer',
          preview ? 'h-auto' : 'h-48'
        )}
      >
        {preview ? (
          <div className="relative w-full">
            <div className="relative" style={{ paddingBottom: `${100 / aspectRatio}%` }}>
              <img
                src={preview}
                alt="Preview"
                className="absolute inset-0 h-full w-full rounded-md object-cover"
              />
            </div>
            {!disabled && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8 rounded-full bg-black/50 p-0 text-white hover:bg-black/70"
                onClick={handleRemove}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Remove image</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="rounded-full bg-primary/10 p-3">
              {isUploading ? (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <Upload className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="text-sm">
              {isUploading ? (
                <span>Uploading...</span>
              ) : (
                <>
                  <span className="font-medium text-primary">Click to upload</span> or drag and drop
                </>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {accept.map(ext => ext.split('/')[1]).join(', ')} (max {formatFileSize(maxSize)})
            </p>
          </div>
        )}
      </div>

      {isUploading && progress > 0 && progress < 100 && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-right text-xs text-muted-foreground">{progress}%</p>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export default ImageUpload;
