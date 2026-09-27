'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Profile, ArticleSubmission } from '@/types/database';
import { updateProfilesOrderInSupabase, deleteProfileFromSupabase } from '@/lib/data-store';
import { ChevronDown, Plus, Check, Layers, GripVertical, Trash2 } from 'lucide-react';

// Props for ActiveProfileSwitcher component
interface ProfileSwitcherProps {
  profiles: Profile[];
  activeProfile: Profile | null;
  submissions?: ArticleSubmission[];
  onSelectProfile: (profile: Profile) => void;
  onCreateNewProfile: () => void;
  onRefreshData?: () => void;
}

// Admin topbar profile switcher dropdown with drag-and-drop reordering
export function ActiveProfileSwitcher({
  profiles,
  activeProfile,
  submissions = [],
  onSelectProfile,
  onCreateNewProfile,
  onRefreshData,
}: ProfileSwitcherProps) {
  // Switcher state management
  const [isOpen, setIsOpen] = useState(false);
  const [profileList, setProfileList] = useState<Profile[]>(profiles);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync profile list when profiles prop updates
  useEffect(() => {
    setProfileList([...profiles].sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999)));
  }, [profiles]);

  // Close dropdown menu when clicking outside container
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Drag-and-Drop Handlers for re-ordering profile display order
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...profileList];
    const [draggedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, draggedItem);

    setProfileList(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);

    const updates = updated.map((p, idx) => ({
      id: p.id,
      display_order: idx + 1,
    }));

    await updateProfilesOrderInSupabase(updates);
    if (onRefreshData) onRefreshData();
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Count pending submissions across other inactive profiles
  const totalOtherPending = submissions.filter(s => s.status === 'pending' && s.profile_id !== activeProfile?.id).length;

  return (
    <div className="relative" ref={containerRef}>
      {/* Profile Switcher Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-900 transition-all text-xs font-bold shadow-2xs cursor-pointer relative"
      >
        {activeProfile ? (
          <>
            <div
              className="w-3 h-3 rounded-full shrink-0 shadow-xs border border-slate-300"
              style={{ backgroundColor: activeProfile.accent_color || '#e11d48' }}
            />
            <span className="max-w-[140px] truncate">{activeProfile.title}</span>
          </>
        ) : (
          <span>Select Profile</span>
        )}
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        
        {totalOtherPending > 0 && (
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse absolute -top-0.5 -right-0.5" title="Other profile has pending submissions" />
        )}
      </button>

      {/* Dropdown Menu List */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl bg-white p-2.5 border border-slate-200 shadow-2xl z-50 animate-fade-in text-slate-900">
          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-rose-600 flex items-center justify-between border-b border-slate-100 mb-1.5">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-rose-600" />
              <span>Active Profiles</span>
            </div>
            <span className="text-[10px] font-semibold text-slate-400">Drag handle to re-order</span>
          </div>

          {/* Draggable profile item list */}
          <div className="max-h-64 overflow-y-auto space-y-1">
            {profileList.map((profile, idx) => {
              const isSelected = activeProfile?.id === profile.id;
              const pendingCount = submissions.filter(s => s.profile_id === profile.id && s.status === 'pending').length;

              return (
                <div
                  key={profile.id}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    draggedIndex === idx ? 'opacity-30 bg-rose-50 border-2 border-dashed border-rose-300' :
                    dragOverIndex === idx ? 'bg-rose-50 border-t-2 border-rose-600 scale-[1.01]' :
                    isSelected ? 'bg-rose-50/90 text-rose-700 border border-rose-200 shadow-2xs' : 'text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-grab active:cursor-grabbing rounded-md hover:bg-slate-200/60 shrink-0"
                      title="Drag to re-order profile"
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectProfile(profile);
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <div
                        className="w-3 h-3 rounded-full shrink-0 border border-slate-300"
                        style={{ backgroundColor: profile.accent_color || '#e11d48' }}
                      />
                      <span className="truncate">{profile.title}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    {pendingCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-extrabold" title={`${pendingCount} pending submission(s) for this profile`}>
                        {pendingCount} pending
                      </span>
                    )}
                    {isSelected && <Check className="w-4 h-4 text-rose-600 shrink-0" />}

                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete profile "${profile.title}"?`)) {
                          await deleteProfileFromSupabase(profile.id);
                          if (onRefreshData) onRefreshData();
                        }
                      }}
                      className="p-1 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete this profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Create new profile button */}
          <div className="pt-2 mt-2 border-t border-slate-100">
            <button
              onClick={() => {
                setIsOpen(false);
                onCreateNewProfile();
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-black transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Profile</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
