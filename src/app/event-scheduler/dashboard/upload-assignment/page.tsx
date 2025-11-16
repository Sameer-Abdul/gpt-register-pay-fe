'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FileText, Upload, CheckCircle2, AlertCircle, ChevronDown, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const INDIAN_HOLIDAYS = [
  { id: 'republic-day', name: 'Republic Day (January 26)' },
  { id: 'holi', name: 'Holi (March)' },
  { id: 'ram-navami', name: 'Ram Navami (March-April)' },
  { id: 'independence-day', name: 'Independence Day (August 15)' },
  { id: 'gandhi-jayanti', name: 'Gandhi Jayanti (October 2)' },
  { id: 'diwali', name: 'Diwali (October-November)' },
  { id: 'christmas', name: 'Christmas (December 25)' },
  { id: 'eid', name: 'Eid al-Fitr (Date Varies)' },
  { id: 'gurunanak-jayanti', name: 'Guru Nanak Jayanti (November)' },
  { id: 'other', name: 'Other Festival/Holiday' },
];

interface Assignment {
  id: number;
  file_name: string;
  submission_date: string;
  context: string;
}

export default function UploadAssignmentPage() {
  const [file, setFile] = useState<File | null>(null);
  const [selectedHoliday, setSelectedHoliday] = useState('');
  const [showHolidayDropdown, setShowHolidayDropdown] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [existingAssignment, setExistingAssignment] = useState<Assignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | 'info' | null;
    message: string;
  }>({ type: null, message: '' });
  const router = useRouter();
  const { data: session } = useSession();

  // Check for existing assignment when component mounts
  useEffect(() => {
    const checkExistingAssignment = async () => {
      try {
        console.log('Checking for existing assignment...');
        const response = await fetch('/api/assignments/check');
        const data = await response.json();
        
        console.log('API Response:', data);
        
        if (data.success) {
          if (data.hasAssignment && data.assignment) {
            console.log('Found existing assignment:', data.assignment);
            setExistingAssignment(data.assignment);
          } else {
            console.log('No existing assignment found');
            setExistingAssignment(null);
          }
        } else {
          console.error('Error from server:', data.error || 'Unknown error');
          // Show error to user but don't block the UI
          setUploadStatus({
            type: 'error',
            message: data.message || 'Failed to check for existing assignments'
          });
        }
      } catch (error) {
        console.error('Error checking for existing assignment:', error);
        setUploadStatus({
          type: 'error',
          message: 'Failed to check for existing assignments. Please refresh the page.'
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingAssignment();
  }, []);

  const selectedHolidayName = selectedHoliday 
    ? INDIAN_HOLIDAYS.find(h => h.id === selectedHoliday)?.name 
    : 'Select a Context';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadStatus({ type: null, message: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted');
    
    // Reset any previous status
    setUploadStatus({ type: null, message: '' });
    
    // Validate file
    if (!file) {
      const errorMsg = 'Please select a file to upload.';
      console.error('Validation error:', errorMsg);
      setUploadStatus({
        type: 'error',
        message: errorMsg
      });
      return;
    }

    // Validate context
    if (!selectedHoliday) {
      const errorMsg = 'Please select a context.';
      console.error('Validation error:', errorMsg);
      setUploadStatus({
        type: 'error',
        message: errorMsg
      });
      return;
    }

    // Prepare form data
    const formData = new FormData();
    const context = INDIAN_HOLIDAYS.find(h => h.id === selectedHoliday)?.name || '';
    
    formData.append('file', file);
    formData.append('context', context);
    
    console.log('Form data prepared:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      context: context,
      formDataEntries: Array.from(formData.entries())
    });

    // Set loading state
    setIsUploading(true);
    setUploadStatus({ 
      type: 'info', 
      message: 'Uploading your assignment...' 
    });

    try {
      console.log('Sending request to /api/assignments');
      
      const response = await fetch('/api/assignments', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header, let the browser set it with the correct boundary
      }).catch(err => {
        console.error('Network error:', err);
        throw new Error(`Network error: ${err.message}`);
      });

      console.log('Response status:', response.status);
      
      // Try to parse response as JSON, but handle non-JSON responses
      let data;
      try {
        const text = await response.text();
        console.log('Raw response:', text);
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        console.error('Server error:', data);
        throw new Error(data.error || `Server error: ${response.status} ${response.statusText}`);
      }

      console.log('Upload successful:', data);
      
      // On success
      setUploadStatus({
        type: 'success',
        message: 'Assignment uploaded successfully!',
      });
      
      // Reset form
      setFile(null);
      setSelectedHoliday('');
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Refresh the page to show the success message
      router.refresh();
      
    } catch (error) {
      console.error('Upload error:', error);
      
      // Handle specific error cases
      let errorMessage = 'Failed to upload file. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          errorMessage = 'Please log in to upload files.';
        } else if (error.message.includes('413')) {
          errorMessage = 'File is too large. Please upload a smaller file.';
        } else if (error.message.includes('Network error')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = error.message || errorMessage;
        }
      }
      
      setUploadStatus({
        type: 'error',
        message: errorMessage,
      });
    } finally {
      console.log('Upload process completed');
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // If assignment exists, show the success message and hide the form
  if (existingAssignment) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-6">
            <FileText className="h-8 w-8 text-indigo-600 mr-2" />
            <h1 className="text-2xl font-bold text-gray-900">Assignment Submitted</h1>
          </div>
          
          <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
            <div className="flex">
              <div className="shrink-0">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  You have already submitted your assignment for <span className="font-medium">{existingAssignment.context}</span> on{' '}
                  {new Date(existingAssignment.submission_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                <p className="mt-1 text-sm text-green-700">
                  File: <span className="font-mono">{existingAssignment.file_name}</span>
                </p>
              </div>
            </div>
          </div>
          
          <div className="text-center py-8">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Assignment Already Submitted</h3>
            <p className="text-gray-600 mb-6">
              You have already submitted your assignment. You cannot submit another assignment at this time.
            </p>
            <Button onClick={() => router.push('/event-scheduler/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Only show the upload form if no assignment exists
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-6">
          <FileText className="h-8 w-8 text-indigo-600 mr-2" />
          <h1 className="text-2xl font-bold text-gray-900">
            Upload Assignment
          </h1>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <div className="flex flex-col items-center justify-center">
              <Upload className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                {file ? file.name : 'Drag and drop your file here, or click to browse'}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Supported formats: PDF, DOC, DOCX, TXT (Max size: 10MB)
              </p>
              
              {/* Context Dropdown */}
              <div className="w-full max-w-md mb-6">
                <label htmlFor="holiday-select" className="block text-sm font-medium text-gray-700 mb-2 text-left">
                  Context
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Context dropdown clicked');
                      setShowHolidayDropdown(!showHolidayDropdown);
                    }}
                    className="w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <span className="block truncate">{selectedHolidayName}</span>
                    <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    </span>
                  </button>
                  
                  {showHolidayDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                      {INDIAN_HOLIDAYS.map((holiday) => (
                        <div
                          key={holiday.id}
                          className={`cursor-default select-none relative py-2 pl-3 pr-9 hover:bg-indigo-100 ${selectedHoliday === holiday.id ? 'bg-indigo-100' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Selected holiday:', holiday.name);
                            setSelectedHoliday(holiday.id);
                            setShowHolidayDropdown(false);
                          }}
                        >
                          <span className={`block truncate ${selectedHoliday === holiday.id ? 'font-semibold text-indigo-700' : 'font-normal'}`}>
                            {holiday.name}
                          </span>
                          {selectedHoliday === holiday.id && (
                            <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-indigo-600">
                              ✓
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <label
                htmlFor="file-upload"
                className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150 ease-in-out"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('File input label clicked');
                }}
              >
                <span>Upload Your Assignment File</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.txt"
                  onClick={(e) => e.stopPropagation()}
                />
              </label>
              
              {uploadStatus.type && (
                <div className={`mt-4 p-3 rounded-md ${uploadStatus.type === 'error' ? 'bg-red-50 text-red-700' : uploadStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                  <div className="flex items-center">
                    {uploadStatus.type === 'success' ? (
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                    ) : uploadStatus.type === 'error' ? (
                      <AlertCircle className="h-5 w-5 mr-2" />
                    ) : (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
                    )}
                    <span>{uploadStatus.message}</span>
                  </div>
                </div>
              )}
              
              <div className="mt-6">
                <Button
                  type="submit"
                  disabled={isUploading || !file || !selectedHoliday}
                  className={`mt-4 ${isUploading || !file || !selectedHoliday ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'}`}
                  onClick={(e) => {
                    console.log('Upload button clicked');
                    e.stopPropagation();
                  }}
                >
                  {isUploading ? 'Uploading...' : 'Upload Assignment'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
