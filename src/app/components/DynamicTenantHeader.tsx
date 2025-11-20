'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

interface TenantHeaderData {
  tenantId: string;
  name: string;
  imageLeft: string | null;
  imageRight: string | null;
  header_format: 'single' | 'double' | 'multiline' | 'auto' | 'custom';
  header_custom_lines: string | null;
}

const DynamicTenantHeader = () => {
  // Don't render if window is not defined (server-side rendering)
  if (typeof window === 'undefined') {
    return null;
  }
  const [headerData, setHeaderData] = useState<TenantHeaderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const fetchTenantHeader = async () => {
      try {
        // Get tenantId from localStorage
        const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenant_id') : null;
        
        if (!tenantId) {
          setLoading(false);
          return;
        }
        
        const response = await fetch(`/api/tenants/${tenantId}/header`);
         console.log('Response status:', response.status); 
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText); // Log the full error response
          throw new Error(`Failed to fetch tenant header: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.data) {
          setHeaderData(data.data);
        } else {
          throw new Error(data.error || 'Invalid response format');
        }
      } catch (err: unknown) {
        console.error('Error fetching tenant header:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load header';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchTenantHeader();
  }, [pathname]);

  const renderHeaderContent = () => {
    if (!headerData) return null;

    const { name, header_format, header_custom_lines } = headerData;

    switch (header_format) {
      case 'single':
        return <h1 className="text-center text-xl font-bold">{name}</h1>;

      case 'double': {
        const words = name.split(' ');
        const mid = Math.ceil(words.length / 2);
        const firstLine = words.slice(0, mid).join(' ');
        const secondLine = words.slice(mid).join(' ');
        
        return (
          <div className="text-center">
            <h1 className="text-xl font-bold">{firstLine}</h1>
            <h1 className="text-xl font-bold">{secondLine}</h1>
          </div>
        );
      }

      case 'multiline':
        return (
          <div className="text-center">
            {name.split(' ').map((word, index) => (
              <h1 key={index} className="text-xl font-bold">
                {word}
              </h1>
            ))}
          </div>
        );

      case 'custom':
        return (
          <div className="text-center">
            {header_custom_lines?.split('\n').map((line, index) => (
              <h1 key={index} className="text-xl font-bold">
                {line}
              </h1>
            ))}
          </div>
        );

      case 'auto':
      default: {
        const words = name.split(' ');
        if (words.length <= 3) {
          return <h1 className="text-center text-xl font-bold">{name}</h1>;
        } else {
          return (
            <div className="text-center">
              {words.map((word, index) => (
                <h1 key={index} className="text-xl font-bold">
                  {word}
                </h1>
              ))}
            </div>
          );
        }
      }
    }
  };

  if (loading) {
    return <div className="h-20 flex items-center justify-center">Loading header...</div>;
  }

  if (error) {
    return (
      <div className="h-20 flex items-center justify-center text-red-500">
        Error loading header: {error}
      </div>
    );
  }

  return (
    <header className="w-full py-4 px-4 bg-white shadow-sm">
      <div className="container mx-auto flex items-center justify-between">
        {/* Left Image */}
        <div className="w-24 h-24 relative">
          {headerData?.imageLeft && (
            <Image
              src={headerData.imageLeft}
              alt="Left Header Logo"
              fill
              className="object-contain"
              priority
            />
          )}
        </div>

        {/* Center Content */}
        <div className="flex-1 mx-4">
          {renderHeaderContent()}
        </div>

        {/* Right Image */}
        <div className="w-24 h-24 relative">
          {headerData?.imageRight && (
            <Image
              src={headerData.imageRight}
              alt="Right Header Logo"
              fill
              className="object-contain"
              priority
            />
          )}
        </div>
      </div>
    </header>
  );
};

export default DynamicTenantHeader;
