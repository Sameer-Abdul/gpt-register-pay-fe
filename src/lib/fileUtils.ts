/**
 * Utility functions for handling file operations
 */

/**
 * Opens a PDF file from a base64 string in a new tab
 * @param base64Data The base64-encoded file data
 * @param mimeType The MIME type of the file (default: 'application/pdf')
 */
export const openFileFromBase64 = (base64Data: string, mimeType: string = 'application/pdf'): void => {
  try {
    // Convert base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create blob and open in new tab
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const newWindow = window.open(url, '_blank');
    if (!newWindow) {
      console.error('Failed to open file: popup blocked');
      // Fallback to download
      downloadFileFromBase64(base64Data, 'document', mimeType);
    }
  } catch (error) {
    console.error('Error opening file:', error);
  }
};

/**
 * Downloads a file from a base64 string
 * @param base64Data The base64-encoded file data
 * @param fileName The name of the file (without extension)
 * @param mimeType The MIME type of the file
 */
export const downloadFileFromBase64 = (
  base64Data: string, 
  fileName: string, 
  mimeType: string
): void => {
  try {
    // Convert base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create blob and download
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.${mimeType.split('/')[1] || 'bin'}`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Error downloading file:', error);
  }
};
