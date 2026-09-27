'use client';

import React, { useState, useEffect } from 'react';
import { useAdminWorkspace } from '../layout';
import { ShieldCheck, RefreshCw, Activity, Database, Server, CheckCircle2, AlertTriangle, Terminal, Zap, Globe, Cpu } from 'lucide-react';

interface HealthData {
  status: 'healthy' | 'healed' | 'degraded';
  timestamp: string;
  responseTimeMs: number;
  checks: {
    supabase_db: { status: string; latencyMs: number; error?: string };
    environment: { status: string; fallbackUsed: boolean };
    data_integrity: { profilesCount: number; articlesCount: number; status: string };
    auto_healed: boolean;
    healed_actions: string[];
  };
}

interface HealResult {
  success: boolean;
  executionTimeMs: number;
  totalProfilesChecked: number;
  healedProfilesCount: number;
  repairsCount: number;
  logs: string[];
}

export default function DevOpsAdminPage() {
  const { refreshData } = useAdminWorkspace();

  const [health, setHealth] = useState<HealthData | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(true);
  const [isHealing, setIsHealing] = useState(false);
  const [healResult, setHealResult] = useState<HealResult | null>(null);
  const [activeTab, setActiveTab] = useState<'health' | 'repair_logs'>('health');

  const fetchHealth = async () => {
    setIsLoadingHealth(true);
    try {
      const res = await fetch('/api/health?t=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoadingHealth(false);
    }
  };

  const triggerAutoHeal = async () => {
    setIsHealing(true);
    setHealResult(null);
    try {
      const res = await fetch('/api/admin/auto-heal', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setHealResult(data);
        setActiveTab('repair_logs');
        refreshData();
        await fetchHealth();
      }
    } catch (err: any) {
      setHealResult({
        success: false,
        executionTimeMs: 0,
        totalProfilesChecked: 0,
        healedProfilesCount: 0,
        repairsCount: 0,
        logs: [`[ERROR] Auto-healing request failed: ${err?.message}`],
      });
    } finally {
      setIsHealing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-rose-600" />
            <span>DevOps & Auto-Healing Control Center</span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5 font-medium">
            Real-time infrastructure health monitoring, automated database self-healing & CI/CD pipeline diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchHealth}
            disabled={isLoadingHealth}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoadingHealth ? 'animate-spin' : ''}`} />
            <span>Check Diagnostics</span>
          </button>

          <button
            onClick={triggerAutoHeal}
            disabled={isHealing}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-black flex items-center gap-2 shadow-md hover:shadow-lg cursor-pointer transition-all active:scale-95"
          >
            <Zap className={`w-4 h-4 fill-white ${isHealing ? 'animate-bounce' : ''}`} />
            <span>{isHealing ? 'Healing System...' : 'Run 1-Click Auto-Heal'}</span>
          </button>
        </div>
      </div>

      {/* System Status Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Supabase DB Status */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-slate-600 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-rose-600" />
              Supabase DB Status
            </span>
            {health?.checks.supabase_db.status === 'healthy' ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Healthy
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                Degraded
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-slate-900">
            {health ? `${health.checks.supabase_db.latencyMs} ms` : '--'}
          </div>
          <p className="text-[10px] text-slate-500 font-semibold">PostgreSQL Egress & API Latency</p>
        </div>

        {/* Database Payload Integrity */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-slate-600 flex items-center gap-1.5">
              <Server className="w-4 h-4 text-blue-600" />
              Isolated Records
            </span>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black">
              Verified
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {health ? `${health.checks.data_integrity.profilesCount} Profiles / ${health.checks.data_integrity.articlesCount} Links` : '--'}
          </div>
          <p className="text-[10px] text-slate-500 font-semibold">BBQ Warriors Schema Tables</p>
        </div>

        {/* Environment & Credentials */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-slate-600 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-purple-600" />
              DevOps Environment
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
              Auto-Resilient
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <span>Production</span>
            {health?.checks.environment.fallbackUsed && (
              <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                Fallback Used
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 font-semibold">Edge CDN & Fallback Credentials</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('health')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'health'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Activity className="w-4 h-4" />
            System Diagnostics
          </span>
        </button>

        <button
          onClick={() => setActiveTab('repair_logs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
            activeTab === 'repair_logs'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Terminal className="w-4 h-4" />
            Auto-Heal Terminal & Logs
            {healResult?.repairsCount ? (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 text-[10px] font-extrabold">
                {healResult.repairsCount}
              </span>
            ) : null}
          </span>
        </button>
      </div>

      {/* Health Tab Content */}
      {activeTab === 'health' && (
        <div className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white space-y-4 shadow-xs">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-4 h-4 text-rose-600" />
            Automated Self-Healing Pipeline Details
          </h2>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Database Connectivity & RLS Policy Check</span>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                  {health?.checks.supabase_db.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Monitors Supabase PostgreSQL rest API response times. If database permissions or RLS policies return empty arrays, the self-healing layer automatically injects fallback credentials and clears stale CDN caches.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Automated 15-Minute Health Audit (GitHub Actions)</span>
                <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono">
                  ACTIVE CRON
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Every 15 minutes, a background cron workflow checks <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[11px]">/api/health</code>. If an anomaly is detected, it automatically executes the 1-Click Auto-Heal repair sequence.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Data Integrity & Fallback Sanitization</span>
                <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-mono">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Automatically computes missing URL slugs (e.g. <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[11px]">/profile/like-mw-mv</code>) and sets default published status for manually inserted Supabase table rows.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Repair Logs Tab Content */}
      {activeTab === 'repair_logs' && (
        <div className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-700" />
              DevOps Auto-Healing Execution Terminal
            </h2>
            {healResult && (
              <span className="text-xs font-bold text-slate-500">
                Execution Time: <span className="font-mono text-rose-600">{healResult.executionTimeMs} ms</span>
              </span>
            )}
          </div>

          {!healResult ? (
            <div className="p-8 text-center bg-slate-900 text-slate-400 rounded-2xl font-mono text-xs border border-slate-800 space-y-2">
              <p>No recent auto-heal execution log available.</p>
              <p className="text-slate-500 text-[11px]">Click &quot;Run 1-Click Auto-Heal&quot; at the top to inspect and repair all database records live.</p>
            </div>
          ) : (
            <div className="p-4 bg-slate-950 text-emerald-400 rounded-2xl font-mono text-xs overflow-x-auto space-y-1.5 border border-slate-800 shadow-inner max-h-96">
              {healResult.logs.map((log, idx) => (
                <div key={idx} className="leading-relaxed">
                  {log.includes('[HEALED]') ? (
                    <span className="text-amber-400 font-bold">{log}</span>
                  ) : log.includes('[ERROR]') || log.includes('[CRITICAL]') ? (
                    <span className="text-rose-400 font-bold">{log}</span>
                  ) : log.includes('[SUCCESS]') ? (
                    <span className="text-emerald-300 font-bold">{log}</span>
                  ) : (
                    <span className="text-slate-300">{log}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
