'use client';

import { useEffect, useState } from 'react';
import { checkOllamaStatus } from '@/app/utils/ollama';

export default function OllamaStatus() {
  const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      setStatus('checking');
      try {
        const result = await checkOllamaStatus();
        setStatus(result.status as 'online' | 'offline');
        setVersion(result.version?.version || null);
      } catch (error) {
        setStatus('offline');
        console.error('Error checking Ollama status:', error);
      }
    };

    // Check status on mount
    checkStatus();

    // Check status every 30 seconds
    const interval = setInterval(checkStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  return (
    <div className="flex items-center space-x-2 text-sm">
      <span>Ollama Status:</span>
      <div className="flex items-center">
        <span className={`inline-block w-3 h-3 rounded-full mr-2 ${getStatusColor()}`}></span>
        <span className="capitalize">{status}</span>
        {version && status === 'online' && (
          <span className="ml-2 text-gray-500 text-xs">v{version}</span>
        )}
      </div>
    </div>
  );
}
