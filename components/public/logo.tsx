'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

// Brand Logo component - displays the BBQ Warriors logo and title for Josh Cullen (Blue, Black & White Cyber Theme)
export function BrandLogo({ size = 'md', showText = true }: LogoProps) {
  const [imgError, setImgError] = useState(false);

  const localLogoUrl = '/assets/bbqwarriorslogo.jpg';

  const iconSizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      {/* Brand logo icon */}
      <div className="relative shrink-0">
        {!imgError ? (
          <img
            src={localLogoUrl}
            alt="BBQ Warriors"
            onError={() => setImgError(true)}
            className={`${iconSizes[size]} object-cover rounded-xl drop-shadow group-hover:scale-105 transition-transform border border-sky-500/40`}
          />
        ) : (
          <div className={`${iconSizes[size]} rounded-xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-700 flex items-center justify-center font-extrabold text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform`}>
            <span>BBQ</span>
          </div>
        )}
      </div>

      {/* Brand title text */}
      {showText && (
        <div className="flex flex-col text-left">
          <span className="font-extrabold text-slate-900 [.cyber-dark-theme_&]:text-white tracking-tight leading-none text-sm group-hover:text-sky-600 transition-colors">
            BBQ <span className="text-sky-600 [.cyber-dark-theme_&]:text-sky-400">Warriors</span>
          </span>
          <span className="text-[10px] text-slate-600 [.cyber-dark-theme_&]:text-slate-400 font-semibold tracking-wide">Josh Cullen Streaming Hub</span>
        </div>
      )}
    </Link>
  );
}
