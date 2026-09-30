'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SupportRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/appearance');
  }, [router]);

  return null;
}
