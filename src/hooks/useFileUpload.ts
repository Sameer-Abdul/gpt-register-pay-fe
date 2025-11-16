import { useState } from 'react';
import { toast } from 'react-hot-toast';

type UploadResponse = {
  success: boolean;
  filePath?: string;
  filename?: string;
  error?: string;
};

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFile = async (file: File, type: 'payment' | 'event'): Promise<UploadResponse> => {
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve, reject) => {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = JSON.parse(xhr.responseText);
            resolve({ ...response, success: true });
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
          setIsUploading(false);
          setUploadProgress(0);
        };

        xhr.onerror = () => {
          setIsUploading(false);
          setUploadProgress(0);
          reject(new Error('Network error during file upload'));
        };

        xhr.open('POST', '/api/upload', true);
        xhr.send(formData);
      });
    } catch (error) {
      console.error('Upload error:', error);
      setIsUploading(false);
      setUploadProgress(0);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to upload file' 
      };
    }
  };

  return { uploadFile, isUploading, uploadProgress };
};

export default useFileUpload;
