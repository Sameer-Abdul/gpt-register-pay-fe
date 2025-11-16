import axios, { AxiosError, AxiosResponse } from 'axios';
import { toast } from '@/components/ui/use-toast';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response) {
      // Handle specific status codes
      const { status, data } = error.response;
      
      if (status === 401) {
        // Handle unauthorized (e.g., redirect to login)
        toast({
          title: 'Session Expired',
          description: 'Your session has expired. Please log in again.',
          variant: 'destructive',
        });
        // Clear user data and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else if (status === 403) {
        toast({
          title: 'Forbidden',
          description: 'You do not have permission to perform this action.',
          variant: 'destructive',
        });
      } else if (status === 404) {
        toast({
          title: 'Not Found',
          description: 'The requested resource was not found.',
          variant: 'destructive',
        });
      } else if (status >= 500) {
        toast({
          title: 'Server Error',
          description: 'An unexpected error occurred. Please try again later.',
          variant: 'destructive',
        });
      } else if (data && typeof data === 'object' && 'message' in data) {
        // Handle custom error messages from the server
        toast({
          title: 'Error',
          description: data.message as string,
          variant: 'destructive',
        });
      }
    } else if (error.request) {
      // The request was made but no response was received
      toast({
        title: 'Network Error',
        description: 'Unable to connect to the server. Please check your internet connection.',
        variant: 'destructive',
      });
    } else {
      // Something happened in setting up the request
      toast({
        title: 'Error',
        description: 'An error occurred while processing your request.',
        variant: 'destructive',
      });
    }
    
    return Promise.reject(error);
  }
);

export default api;
