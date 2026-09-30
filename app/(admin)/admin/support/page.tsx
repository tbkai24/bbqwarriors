'use client';

import React, { useState, useEffect } from 'react';
import { useAdminWorkspace } from '../layout';
import { getStoredProfiles, saveProfiles, saveProfileToSupabase } from '@/lib/data-store';
import { ImageUploadInput } from '@/components/admin/image-upload-input';
import { getCloudinaryImageUrl } from '@/lib/cloudinary';
import { SupportQrOption } from '@/types/database';
import { Heart, Check, Save, QrCode, Plus, Trash2, Sparkles, Copy, Wallet, CreditCard } from 'lucide-react';

const PRESET_PLATFORMS = ['GCash', 'Maya', 'PayPal', 'Ko-fi', 'BuyMeACoffee', 'GoTyme', 'BDO', 'BPI', 'Bank Transfer'];

export default function SupportAdminPage() {
  const { activeProfile, refreshData } = useAdminWorkspace();

  const [supportTitle, setSupportTitle] = useState('');
  const [supportNote, setSupportNote] = useState('');
  const [qrOptions, setQrOptions] = useState<SupportQrOption[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeProfile) {
      setSupportTitle(activeProfile.support_title || '');
      setSupportNote(activeProfile.support_note || '');
      
      // If legacy single QR exists, migrate it as first option if options empty
      if (activeProfile.support_qr_options && activeProfile.support_qr_options.length > 0) {
        setQrOptions(activeProfile.support_qr_options);
      } else if (activeProfile.support_qr_image) {
        setQrOptions([
          {
            id: 'legacy-1',
            platform: 'GCash',
            qr_image: activeProfile.support_qr_image,
            note: activeProfile.support_note || '',
          }
        ]);
      } else {
        setQrOptions([]);
      }
      setError('');
    }
  }, [activeProfile]);

  if (!activeProfile) return null;

  const handleAddOption = (presetName: string = 'GCash') => {
    const newOpt: SupportQrOption = {
      id: 'qr_' + Math.random().toString(36).substr(2, 9),
      platform: presetName,
      qr_image: '',
      account_name: '',
      account_number: '',
      note: '',
    };
    setQrOptions(prev => [...prev, newOpt]);
  };

  const handleRemoveOption = (id: string) => {
    setQrOptions(prev => prev.filter(opt => opt.id !== id));
  };

  const handleUpdateOption = (id: string, key: keyof SupportQrOption, val: string) => {
    setQrOptions(prev => prev.map(opt => opt.id === id ? { ...opt, [key]: val } : opt));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const allProfiles = getStoredProfiles();
    const cleanOptions = qrOptions.filter(opt => opt.platform.trim() !== '');

    const updatedProfile = {
      ...activeProfile,
      support_title: supportTitle.trim() || null,
      support_note: supportNote.trim() || null,
      support_qr_options: cleanOptions,
      // Keep main support_qr_image synced to first option for backwards compatibility
      support_qr_image: cleanOptions.length > 0 ? (cleanOptions[0].qr_image || null) : null,
      updated_at: new Date().toISOString(),
    };

    const updated = allProfiles.map(p => p.id === activeProfile.id ? updatedProfile : p);
    saveProfiles(updated);
    await saveProfileToSupabase(updatedProfile);
    refreshData();

    setSavedSuccess(true);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-600 fill-rose-500" />
            <span>Support & Donation QR Channels</span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5 font-medium">
            Manage multiple donation methods (GCash, Maya, PayPal, etc.) for: <span className="text-rose-600 font-bold">{activeProfile.title}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleAddOption('GCash')}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Payment QR</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {savedSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Support & Donation QR options saved successfully!</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 shadow-xs">
            <span>{error}</span>
          </div>
        )}

        {/* Global Support Settings */}
        <div className="p-5 rounded-2xl glass-panel border border-slate-200 bg-white space-y-4 shadow-xs">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-rose-600" />
            <span>Modal Header & Instructions</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Overall Modal Title</label>
              <input
                type="text"
                value={supportTitle}
                onChange={(e) => setSupportTitle(e.target.value)}
                placeholder="Support SB19 Streamers Community"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Global Note / Message</label>
              <input
                type="text"
                value={supportNote}
                onChange={(e) => setSupportNote(e.target.value)}
                placeholder="Select a payment method below to send donations!"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Payment QR Channels List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold uppercase text-slate-700 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-rose-600" />
              <span>Active Payment Channels ({qrOptions.length})</span>
            </span>

            {/* Quick Add Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-600 font-bold mr-1">Add Option:</span>
              {['GCash', 'Bank Transfer', 'PayPal', 'Custom'].map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAddOption(preset)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 border border-slate-200 text-[11px] font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          {qrOptions.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white border border-dashed border-slate-300 text-center space-y-3">
              <QrCode className="w-10 h-10 text-rose-500/60 mx-auto" />
              <div>
                <p className="text-xs font-bold text-slate-800">No Support / Donation QR Channels Added Yet</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Click &quot;+ Add Payment QR&quot; above to add GCash, Bank Transfer, or any custom payment method!</p>
              </div>
              <button
                type="button"
                onClick={() => handleAddOption('GCash')}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Payment Option (GCash / Bank)</span>
              </button>
            </div>
          ) : (
            qrOptions.map((opt, index) => (
              <div key={opt.id} className="p-5 rounded-2xl glass-panel border border-slate-200 bg-white space-y-4 shadow-xs relative group">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 text-xs font-extrabold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={opt.platform}
                      onChange={(e) => handleUpdateOption(opt.id, 'platform', e.target.value)}
                      placeholder="Payment Method Name (e.g. GCash, BDO, PayPal)"
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-extrabold focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveOption(opt.id)}
                    className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                    title="Delete this payment option"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ImageUploadInput
                    label={`${opt.platform || 'Payment'} QR Code Image`}
                    value={opt.qr_image || ''}
                    onChange={(val) => handleUpdateOption(opt.id, 'qr_image', val)}
                    folder="SB19/qr_codes"
                    placeholder="https://... or upload QR picture"
                  />

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Account Holder Name (Optional)</label>
                      <input
                        type="text"
                        value={opt.account_name || ''}
                        onChange={(e) => handleUpdateOption(opt.id, 'account_name', e.target.value)}
                        placeholder="e.g. SB19 Streamers Admin / Juan D."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Account Number / Handle (For 1-Click Copy)</label>
                      <input
                        type="text"
                        value={opt.account_number || ''}
                        onChange={(e) => handleUpdateOption(opt.id, 'account_number', e.target.value)}
                        placeholder="e.g. 09171234567 or admin@paypal.com"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Channel Note (Optional)</label>
                      <input
                        type="text"
                        value={opt.note || ''}
                        onChange={(e) => handleUpdateOption(opt.id, 'note', e.target.value)}
                        placeholder="e.g. Scan QR or send via GCash Express Send"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Save Bar */}
        <div className="pt-3 flex items-center justify-between border-t border-slate-200">
          <button
            type="button"
            onClick={() => handleAddOption('Maya')}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Another Payment Channel</span>
          </button>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-colors cursor-pointer active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save All Payment Options</span>
          </button>
        </div>
      </form>
    </div>
  );
}
