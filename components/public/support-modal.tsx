'use client';

import React, { useState, useEffect } from 'react';
import { Profile, SupportQrOption } from '@/types/database';
import { getCloudinaryImageUrl } from '@/lib/cloudinary';
import { Heart, X, Copy, Check, QrCode, Sparkles, CreditCard, Wallet } from 'lucide-react';

// Props for SupportModal component
interface SupportModalProps {
  profile?: Profile;
  isOpen: boolean;
  onClose: () => void;
}

// Modal component for displaying donation / hosting support QR codes and payment details
export function SupportModal({ profile, isOpen, onClose }: SupportModalProps) {
  const [selectedOptId, setSelectedOptId] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Normalize options array or fallback to legacy single QR code
  const options: SupportQrOption[] = React.useMemo(() => {
    if (profile?.support_qr_options && profile.support_qr_options.length > 0) {
      return profile.support_qr_options;
    }
    if (profile?.support_qr_image) {
      return [{
        id: 'legacy-1',
        platform: 'GCash / E-Wallet',
        qr_image: profile.support_qr_image,
        note: profile.support_note || '',
      }];
    }
    return [];
  }, [profile]);

  useEffect(() => {
    if (options.length > 0) {
      setSelectedOptId(options[0].id);
    }
  }, [options, isOpen]);

  if (!isOpen) return null;

  const currentOpt = options.find(o => o.id === selectedOptId) || options[0] || null;

  const qrImageUrl = currentOpt?.qr_image ? getCloudinaryImageUrl(currentOpt.qr_image, { width: 800 }) : null;
  const title = profile?.support_title || 'Support BBQ Warriors & Hosting Maintenance';
  const note = profile?.support_note || 'Optional support to help maintain server and hosting costs for BBQ Warriors!';

  // Handles copying account number or wallet link to clipboard
  const handleCopyText = (text: string) => {
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    // Modal backdrop overlay
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 relative text-center space-y-4">
        {/* Close Modal Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold shadow-xs">
          <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-500" />
          <span>Support Project & Hosting Maintenance</span>
        </div>

        {/* Title & Note */}
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 leading-snug">{title}</h3>
          <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">{note}</p>
        </div>

        {/* Payment Channels Tabs */}
        {options.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 flex-wrap pt-1">
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => setSelectedOptId(opt.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  selectedOptId === opt.id
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20 scale-105'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {opt.platform}
              </button>
            ))}
          </div>
        )}

        {/* QR Image & Details Display */}
        {currentOpt ? (
          <div className="space-y-3 pt-1">
            {qrImageUrl ? (
              <div className="w-full aspect-square max-w-[240px] mx-auto rounded-2xl overflow-hidden bg-slate-50 p-3 border-2 border-rose-200/80 shadow-md relative group">
                <img
                  src={qrImageUrl}
                  alt={currentOpt.platform}
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
            ) : (
              <div className="w-full h-36 rounded-2xl bg-rose-50/50 border border-rose-200 flex flex-col items-center justify-center text-rose-700 p-4">
                <Wallet className="w-10 h-10 text-rose-500 mb-1 opacity-80" />
                <p className="text-xs font-extrabold">{currentOpt.platform}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Copy account number below to send payment</p>
              </div>
            )}

            {/* Account Details Box */}
            {(currentOpt.account_number || currentOpt.account_name || currentOpt.note) && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-1.5">
                {currentOpt.account_name && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Account Name:</span>
                    <span className="font-bold text-slate-900">{currentOpt.account_name}</span>
                  </div>
                )}

                {currentOpt.account_number && (
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <span className="text-slate-500 font-medium">{currentOpt.platform} Number:</span>
                    <span className="font-extrabold text-rose-700 tracking-wide">{currentOpt.account_number}</span>
                  </div>
                )}

                {currentOpt.note && (
                  <p className="text-[11px] text-slate-500 font-medium pt-1 border-t border-slate-200/80">
                    {currentOpt.note}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-44 rounded-2xl bg-rose-50/50 border border-rose-200 flex flex-col items-center justify-center text-rose-700 p-4">
            <QrCode className="w-12 h-12 text-rose-500 mb-2 opacity-80" />
            <p className="text-xs font-bold">No QR Code Image Uploaded Yet</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Admin can add payment options in Admin → Support & Donation QR.</p>
          </div>
        )}

        {/* Copy Button */}
        <div className="pt-2">
          {currentOpt && (currentOpt.account_number || currentOpt.qr_image) && (
            <button
              onClick={() => handleCopyText(currentOpt.account_number || currentOpt.qr_image || '')}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
              <span>
                {copied
                  ? 'Copied to Clipboard!'
                  : currentOpt.account_number
                  ? `Copy ${currentOpt.platform} Number`
                  : 'Copy QR Image Link'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
