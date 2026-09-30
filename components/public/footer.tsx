import React from 'react';

interface PublicFooterProps {
  onOpenSupport?: () => void;
}

export function PublicFooter(_props?: PublicFooterProps) {
  return (
    <footer className="w-full max-w-xl mt-12 mb-6 pt-6 border-t border-slate-200 text-center z-10 space-y-3">
      <p className="text-[11px] text-slate-500 font-medium">
        © {new Date().getFullYear()} <span className="text-sky-600 font-semibold">BBQ Warriors</span>. All rights reserved.
      </p>
    </footer>
  );
}
