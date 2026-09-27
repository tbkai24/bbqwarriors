import React from 'react';
import { Heart } from 'lucide-react';

interface PublicFooterProps {
  onOpenSupport?: () => void;
}

export function PublicFooter({ onOpenSupport }: PublicFooterProps) {
  return (
    <footer className="w-full max-w-xl mt-12 mb-6 pt-6 border-t border-slate-200 text-center z-10 space-y-3">
      {onOpenSupport && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onOpenSupport}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 hover:text-sky-800 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <Heart className="w-3.5 h-3.5 text-sky-600 fill-sky-500" />
            <span>Support BBQ Warriors & Hosting</span>
          </button>
        </div>
      )}

      <p className="text-[11px] text-slate-500 font-medium">
        © {new Date().getFullYear()} <span className="text-sky-600 font-semibold">BBQ Warriors</span> (Josh Cullen Streaming Hub). All rights reserved.
      </p>
    </footer>
  );
}
