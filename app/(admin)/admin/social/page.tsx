'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SocialLinksRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/appearance');
  }, [router]);

  return null;
}
