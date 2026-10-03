'use client';

import React, { useState, useEffect } from 'react';
import { useAdminWorkspace } from '../layout';
import { AdminUser, AdminRole } from '@/types/database';
import {
  getStoredAdminUsers,
  fetchAdminUsersFromSupabase,
  saveAdminUserToSupabase,
  deleteAdminUserFromSupabase,
  getActiveAdminUser,
} from '@/lib/data-store';
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Edit,
  Trash2,
  Lock,
  Mail,
  User,
  KeyRound,
  CheckCircle2,
  X,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function AdminUsersPage() {
  const { currentUser } = useAdminWorkspace();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  // Password visibility state
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [showFormPassword, setShowFormPassword] = useState(false);

  // Form fields
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AdminRole>('editor');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [submitting, setSubmitting] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'rose' } | null>(null);

  const showToast = (message: string, type: 'success' | 'rose' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminUsersFromSupabase();
      setUsers(data);
    } catch {
      setUsers(getStoredAdminUsers());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setEmail('');
    setName('');
    setPassword('admin123');
    setRole('editor');
    setStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (u: AdminUser) => {
    setEditingUser(u);
    setEmail(u.email);
    setName(u.name);
    setPassword(u.password || '');
    setRole(u.role);
    setStatus(u.status || 'active');
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) return;

    setSubmitting(true);
    if (isSelfEditingSuperAdmin && role === 'editor') {
      showToast('Super Admins cannot demote their own account role.', 'rose');
      setSubmitting(false);
      return;
    }
    if (isSelfEditingSuperAdmin && status === 'inactive') {
      showToast('You cannot deactivate your active Super Admin account.', 'rose');
      setSubmitting(false);
      return;
    }

    const payload: Partial<AdminUser> = {
      id: editingUser ? editingUser.id : undefined,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      password: password.trim() || 'admin123',
      role,
      status,
    };

    const res = await saveAdminUserToSupabase(payload);
    if (res.success) {
      showToast(editingUser ? 'Team member updated successfully!' : 'New team member added!', 'success');
      loadUsers();
      setIsModalOpen(false);
    } else {
      showToast(res.error || 'Failed to save team member.', 'rose');
    }
    setSubmitting(false);
  };

  const handleDeleteUser = async (u: AdminUser) => {
    if (u.email.toLowerCase() === 'admin@bbqwarriors.com') {
      showToast('Cannot delete the primary Super Admin account.', 'rose');
      return;
    }
    if (currentUser && (u.id === currentUser.id || u.email.toLowerCase() === currentUser.email.toLowerCase())) {
      showToast('You cannot remove your own active account.', 'rose');
      return;
    }

    if (confirm(`Are you sure you want to remove ${u.name} (${u.email}) from team members?`)) {
      await deleteAdminUserFromSupabase(u.id);
      showToast(`Removed ${u.name} from team access.`, 'success');
      loadUsers();
    }
  };

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isSelfEditingSuperAdmin = Boolean(
    editingUser &&
    currentUser &&
    (editingUser.id === currentUser.id || editingUser.email.toLowerCase() === currentUser.email.toLowerCase()) &&
    editingUser.role === 'super_admin'
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold animate-fade-in border ${
            toast.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-rose-900 text-white border-rose-700'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <Users className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Team Roles & Permissions</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium pl-10">
            Manage admin users, assigned roles (Super Admin vs Editor), and login credentials for BBQ Warriors.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Team Member</span>
          </button>
        )}
      </div>

      {/* Role Permission Matrix Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Super Admin Info */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-rose-50 to-red-50 border border-rose-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-rose-600" />
              <h3 className="text-sm font-extrabold text-slate-900">Super Admin Role</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider">
              FULL CONTROL
            </span>
          </div>
          <p className="text-xs text-slate-600 font-medium mb-3">
            Super Admins have unrestricted access across all system features, team roles, and profile management.
          </p>
          <ul className="text-[11px] text-slate-700 font-semibold space-y-1 pl-1">
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-rose-600" /> Create & Delete Release Profiles</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-rose-600" /> Manage Team Accounts & Change Passwords</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-rose-600" /> Analytics, Push Notifications & Theme Styling</li>
          </ul>
        </div>

        {/* Content Editor Info */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-extrabold text-slate-900">Content Editor Role</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider">
              EDIT ACCESS
            </span>
          </div>
          <p className="text-xs text-slate-600 font-medium mb-3">
            Editors can add, edit, and order articles and approve fan submissions without modifying core profile settings.
          </p>
          <ul className="text-[11px] text-slate-700 font-semibold space-y-1 pl-1">
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Add & Edit Articles / Spotify Embeds</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Review & Approve Fan Submissions</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Drag & Drop Article Display Ordering</li>
          </ul>
        </div>
      </div>

      {/* Team Members List Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-600" />
            <span>Authorized Team Members ({users.length})</span>
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            Active Logged User: <span className="font-mono text-rose-600 font-bold">{currentUser?.name}</span> ({currentUser?.role})
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 font-medium">Loading team accounts...</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {users.map((u) => {
              const isSuper = u.role === 'super_admin';
              return (
                <div key={u.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 ${
                        isSuper ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-slate-900 truncate">{u.name}</h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isSuper ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'
                          }`}
                        >
                          {isSuper ? 'Super Admin' : 'Content Editor'}
                        </span>
                        {u.status === 'active' ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">Active</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">Inactive</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-0.5">
                        <span className="font-mono">{u.email}</span>
                        {isSuperAdmin && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <span>Password: <span className="font-mono text-slate-700 font-bold">{showPasswords[u.id] ? (u.password || '••••••••') : '••••••••'}</span></span>
                              <button
                                type="button"
                                onClick={() => setShowPasswords(prev => ({ ...prev, [u.id]: !prev[u.id] }))}
                                className="p-0.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                title={showPasswords[u.id] ? "Hide password" : "Show password"}
                              >
                                {showPasswords[u.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {isSuperAdmin && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openEditModal(u)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5 text-slate-500" />
                        <span>Edit Role</span>
                      </button>
                      {u.email.toLowerCase() !== 'admin@bbqwarriors.com' && !(currentUser && (u.id === currentUser.id || u.email.toLowerCase() === currentUser.email.toLowerCase())) && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Team Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4 animate-fade-in relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-rose-600" />
                <span>{editingUser ? 'Edit Team Member & Role' : 'Add New Team Member'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-rose-600" /> Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full name..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-rose-600" /> Admin Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-rose-600" /> Account Password
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showFormPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password..."
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 font-bold focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormPassword(!showFormPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    title={showFormPassword ? "Hide password" : "Show password"}
                  >
                    {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-rose-600" /> Assigned Access Role
                </label>
                <select
                  value={role}
                  disabled={isSelfEditingSuperAdmin}
                  onChange={(e) => setRole(e.target.value as AdminRole)}
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500 ${
                    isSelfEditingSuperAdmin ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="super_admin">Super Admin (Full System Access)</option>
                  <option value="editor" disabled={isSelfEditingSuperAdmin}>Content Editor (Manage Articles & Submissions)</option>
                </select>
                {isSelfEditingSuperAdmin && (
                  <p className="text-[10px] text-amber-600 font-semibold mt-1">
                    * Super Admins cannot demote their own account role.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Account Status
                </label>
                <select
                  value={status}
                  disabled={isSelfEditingSuperAdmin}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500 ${
                    isSelfEditingSuperAdmin ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="active">Active (Can Sign In)</option>
                  <option value="inactive" disabled={isSelfEditingSuperAdmin}>Inactive (Disabled Access)</option>
                </select>
                {isSelfEditingSuperAdmin && (
                  <p className="text-[10px] text-amber-600 font-semibold mt-1">
                    * You cannot deactivate your active Super Admin account.
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md"
                >
                  {submitting ? 'Saving...' : 'Save Account Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
