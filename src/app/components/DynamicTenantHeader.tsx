'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { getSession } from 'next-auth/react';
import { Skeleton } from '@/components/ui/skeleton';

interface TenantHeaderData {
  id: string;
  tenant_name: string;
  left_image_url: string | null;
  right_image_url: string | null;
  header_format: 'single' | 'double' | 'multiline' | 'auto' | 'custom';
  header_custom_lines: string | null;
}

const DynamicTenantHeader = () => {
  const [headerData, setHeaderData] = useState<TenantHeaderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const fetchTenantHeader = async () => {
      try {
        console.log('Fetching tenant header...');
        
        // First try to get tenantId from session
        try {
          const session = await getSession();
          console.log('Session data:', session);
          
          if (session?.user?.tenantId) {
            console.log('Found tenantId in session:', session.user.tenantId);
            // Store in localStorage for persistence
            localStorage.setItem('tenant_id', session.user.tenantId);
            // Use the tenantId from session
            await fetchTenantData(session.user.tenantId);
            return;
          }
        } catch (err) {
          console.error('Error getting session:', err);
        }
        
        // Fallback to localStorage if session doesn't have tenantId
        const tenantId = localStorage.getItem('tenant_id');
        console.log('Retrieved tenantId from localStorage:', tenantId);
        
        if (!tenantId) {
          console.error('No tenantId found in session or localStorage');
          setError('Tenant information not found. Please log in again.');
          setLoading(false);
          return;
        }
        
        await fetchTenantData(tenantId);
      } catch (err) {
        console.error('Error in fetchTenantHeader:', err);
        setError('Failed to load tenant information');
        setLoading(false);
      }
    };
    
    const fetchTenantData = async (tenantId: string) => {
      try {
        setLoading(true);

        const baseUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL ||
          process.env.NEXT_PUBLIC_API_URL ||
          '';

        const url = baseUrl
          ? `${baseUrl}/tenants/${tenantId}/header`
          : `/api/tenants/${tenantId}/header`;

        console.log('Fetching tenant header from URL:', url);

        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch tenant data: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.data) {
          console.log('Received raw tenant data:', data.data);

          const src: any = data.data;
          const normalized: TenantHeaderData = {
            id: src.id ?? src.tenantId ?? tenantId,
            tenant_name: src.tenant_name ?? src.name ?? '',
            left_image_url: src.left_image_url ?? src.imageLeft ?? null,
            right_image_url: src.right_image_url ?? src.imageRight ?? null,
            header_format: (src.header_format as TenantHeaderData['header_format']) ?? 'auto',
            header_custom_lines: src.header_custom_lines ?? null,
          };

          console.log('Normalized tenant header data:', normalized);
          setHeaderData(normalized);
        } else {
          throw new Error(data.error || 'Invalid tenant data format');
        }
      } catch (err) {
        console.error('Error fetching tenant data:', err);
        setError('Failed to load tenant data');
      } finally {
        setLoading(false);
      }
    };
    
    // Only run on client side
    if (typeof window !== 'undefined') {
      fetchTenantHeader();
    }
  }, [pathname]);
  
  const renderHeaderContent = () => {
    if (!headerData) return null;

    const { tenant_name, header_format, header_custom_lines } = headerData;

    switch (header_format) {
      case 'single':
        return (
          <h1 className="text-center text-xl md:text-2xl font-bold text-orange-600 leading-tight">
            {tenant_name}
          </h1>
        );

      case 'double': {
        const words = tenant_name.split(' ');
        const mid = Math.ceil(words.length / 2);
        const firstLine = words.slice(0, mid).join(' ');
        const secondLine = words.slice(mid).join(' ');
        
        return (
          <div className="text-center space-y-0.5">
            <h1 className="text-xl md:text-2xl font-bold text-orange-600 leading-tight">
              {firstLine}
            </h1>
            <h1 className="text-lg md:text-xl font-bold text-pink-800">
              {secondLine}
            </h1>
            {header_custom_lines && (
              <h3 className="text-xs md:text-sm font-bold text-green-700 leading-tight">
                {header_custom_lines}
              </h3>
            )}
          </div>
        );
      }

      case 'multiline':
        return (
          <div className="text-center">
            {tenant_name.split(' ').map((word: string, index: number) => (
              <h1 key={index} className="text-xl font-bold">
                {word}
              </h1>
            ))}
          </div>
        );

      case 'custom':
        return (
          <div className="text-center space-y-0.5">
            {header_custom_lines?.split('\n').map((line: string, index: number) => (
              <h1
                key={index}
                className={
                  index === 0
                    ? 'text-xl md:text-2xl font-bold text-orange-600 leading-tight'
                    : index === 1
                    ? 'text-lg md:text-xl font-bold text-pink-800'
                    : 'text-xs md:text-sm font-bold text-green-700 leading-tight'
                }
              >
                {line}
              </h1>
            ))}
          </div>
        );

      case 'auto':
      default: {
        return (
          <div className="text-center space-y-0.5">
            <h1 className="text-xl md:text-2xl font-bold text-orange-600 leading-tight">
              {tenant_name}
            </h1>
            {header_custom_lines && (
              <h3 className="text-xs md:text-sm font-bold text-green-700 leading-tight">
                {header_custom_lines}
              </h3>
            )}
          </div>
        );
      }
    }
  };

  // Don't render anything during server-side rendering
  if (typeof window === 'undefined') {
    return null;
  }
  
  if (loading) {
    return (
      <div className="w-full bg-white shadow-sm py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-4">
            <div className="w-20" />
            <div className="flex-1 max-w-2xl">
              <div className="h-6 bg-gray-200 rounded w-48 mx-auto"></div>
            </div>
            <div className="w-20" />
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="w-full bg-red-50 border-l-4 border-red-400 p-4">
        <div className="container mx-auto">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }
  
  if (!headerData) {
    return null;
  }


  return (
    <div className="w-full bg-white shadow-sm py-4">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-4">
          {/* Left Image */}
          {headerData?.left_image_url && (
            <div className="shrink-0" style={{ maxHeight: '80px', maxWidth: '80px' }}>
              <Image
                src={`${process.env.NEXT_PUBLIC_BACKEND_URL || ''}${headerData.left_image_url}`}
                alt={`${headerData.tenant_name} Left Logo`}
                width={80}
                height={80}
                className="object-contain h-full w-full"
                unoptimized={true}
                priority
              />
            </div>
          )}
          
          {/* Center Content */}
          <div className="flex-1 max-w-2xl">
            {renderHeaderContent()}
          </div>
          
          {/* Right Image */}
          {headerData?.right_image_url && (
            <div className="shrink-0" style={{ maxHeight: '80px', maxWidth: '80px' }}>
              <Image
                src={`${process.env.NEXT_PUBLIC_BACKEND_URL || ''}${headerData.right_image_url}`}
                alt={`${headerData.tenant_name} Right Logo`}
                width={80}
                height={80}
                className="object-contain h-full w-full"
                unoptimized={true}
                priority
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DynamicTenantHeader;
