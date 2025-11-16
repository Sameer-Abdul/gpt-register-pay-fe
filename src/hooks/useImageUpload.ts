import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { validateFile, formatFileSize } from '@/lib/file-utils';

type UploadOptions = {
  maxSize?: number;
  accept?: string[];
  onSuccess?: (file: File, url: string) => void;
  onError?: (error: string) => void;
};

type UploadState = {
  isUploading: boolean;
  progress: number;
  error: string | null;
  file: File | null;
  fileUrl: string | null;
};

const DEFAULT_OPTIONS: Required<Omit<UploadOptions, 'onSuccess' | 'onError'>> = {
  maxSize: 5 * 1024 * 1024, // 5MB
  accept: ['image/jpeg', 'image/png', 'image/webp'],
};

export function useImageUpload(options: UploadOptions = {}) {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    file: null,
    fileUrl: null,
  });

  const reset = useCallback(() => {
    setState({
      isUploading: false,
      progress: 0,
      error: null,
      file: null,
      fileUrl: null,
    });
  }, []);

  const upload = useCallback(
    async (file: File) => {
      const { maxSize, accept, onSuccess, onError } = { ...DEFAULT_OPTIONS, ...options };

      // Reset state
      setState({
        isUploading: true,
        progress: 0,
        error: null,
        file,
        fileUrl: null,
      });

      // Validate file
      const { valid, error: validationError } = validateFile(file, { maxSize, accept });
      if (!valid) {
        const error = validationError || 'Invalid file';
        setState(prev => ({ ...prev, error, isUploading: false }));
        onError?.(error);
        toast.error(error);
        return { success: false, error };
      }

      try {
        // Create form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'image');

        // Upload file
        const xhr = new XMLHttpRequest();
        
        const result = await new Promise<{ success: boolean; filePath?: string; error?: string }>(
          (resolve, reject) => {
            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const progress = Math.round((event.loaded / event.total) * 100);
                setState(prev => ({ ...prev, progress }));
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const response = JSON.parse(xhr.responseText);
                  resolve(response);
                } catch (error) {
                  reject(new Error('Invalid server response'));
                }
              } else {
                let error = 'Upload failed';
                try {
                  const errorResponse = JSON.parse(xhr.responseText);
                  error = errorResponse.error || error;
                } catch (e) {
                  console.error('Error parsing error response:', e);
                }
                reject(new Error(error));
              }
            };

            xhr.onerror = () => {
              reject(new Error('Network error during file upload'));
            };

            xhr.open('POST', '/api/upload', true);
            xhr.send(formData);
          }
        );

        if (result.success && result.filePath) {
          const fileUrl = result.filePath;
          setState(prev => ({
            ...prev,
            isUploading: false,
            progress: 100,
            fileUrl,
          }));
          
          onSuccess?.(file, fileUrl);
          toast.success('File uploaded successfully');
          return { success: true, fileUrl };
        } else {
          const error = result.error || 'Upload failed';
          setState(prev => ({ ...prev, error, isUploading: false }));
          onError?.(error);
          toast.error(error);
          return { success: false, error };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isUploading: false,
        }));
        onError?.(errorMessage);
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [options]
  );

  return {
    ...state,
    upload,
    reset,
  };
}

export default useImageUpload;
