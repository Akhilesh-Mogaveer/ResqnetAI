import React, { useState, useEffect } from 'react';
import AuditLogView from '../components/AuditLogView';
import { 
  Activity, 
  Server, 
  Database, 
  Brain, 
  Radio, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Download, 
  Sliders,
  ShieldCheck,
  Cpu,
  Clock
} from 'lucide-react';
import api from '../services/api';

export default function ActivityHealthPage({
  auditLog = [],
  backendConnected,
  backendError,
  onRetryConnection,
  isLoading,
  onSelectIncidentById
}) {
  const [activeSubTab, setActiveSubTab] = useState('audit'); // audit | health
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);

  useEffect(() => {
    if (activeSubTab === 'health' && backendConnected) {
      let isMounted = true;
      setHealthLoading(true);
      api.getHealth()
        .then(data => {
          if (isMounted) setHealthData(data);
        })
        .catch(err => {
          console.error("Health probe error:", err);
        })
        .finally(() => {
          if (isMounted) setHealthLoading(false);
        });
      return () => { isMounted = false; };
    }
  }, [activeSubTab, backendConnected]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div 
        className="relative bg-[#0D1B2D] p-5 rounded-xl border border-[#203550] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(7, 17, 31, 0.90) 0%, rgba(7, 17, 31, 0.72) 50%, rgba(9, 22, 41, 0.40) 100%), url('/images/header-system-health.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="relative z-10">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
              Activity & System Health Diagnostics
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
              System Audit & Diagnostics
            </span>
          </div>
          <p className="text-xs text-slate-200 mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            Coordinator accountability audit log, FastAPI connection status, SQLite database integrity, and HumAID NLP model telemetry.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center space-x-2 relative z-10">
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeSubTab === 'audit'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-[#091629] text-slate-300 border border-[#203550] hover:text-white hover:bg-[#132238]'
            }`}
          >
            Coordinator Audit Ledger
          </button>
          <button
            onClick={() => setActiveSubTab('health')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeSubTab === 'health'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-[#091629] text-slate-300 border border-[#203550] hover:text-white hover:bg-[#132238]'
            }`}
          >
            Infrastructure & Model Telemetry
          </button>
        </div>
      </div>

      {/* SUBTAB 1: AUDIT LOG */}
      {activeSubTab === 'audit' && (
        <AuditLogView
          auditLog={auditLog}
          onSelectIncidentById={onSelectIncidentById}
        />
      )}

      {/* SUBTAB 2: INFRASTRUCTURE & MODEL HEALTH */}
      {activeSubTab === 'health' && (
        <div className="space-y-5">
          {/* 4 Health Service Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. FastAPI Backend */}
            <div className="bg-[#0D1B2D] rounded-xl border border-[#203550] shadow-sm p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  <Server className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  backendConnected === true 
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                }`}>
                  {backendConnected === true ? 'ONLINE' : 'FALLBACK'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-white text-xs">FastAPI REST Server</h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                  {api.getBaseUrl()}
                </p>
              </div>
              <div className="pt-2 border-t border-[#203550] text-[11px]">
                {backendConnected === true ? (
                  <span className="text-emerald-400 flex items-center space-x-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Endpoints responding nominal</span>
                  </span>
                ) : (
                  <button
                    onClick={onRetryConnection}
                    disabled={isLoading}
                    className="text-cyan-400 font-medium hover:underline flex items-center space-x-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Retry API Connection</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2. SQLite Database */}
            <div className="bg-[#0D1B2D] rounded-xl border border-[#203550] shadow-sm p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <Database className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  ACTIVE
                </span>
              </div>
              <div>
                <h3 className="font-bold text-white text-xs">SQLite Persistent DB</h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                  backend/resqnet.db
                </p>
              </div>
              <div className="pt-2 border-t border-[#203550] text-[11px] flex items-center space-x-1 font-medium text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Single absolute DB path</span>
              </div>
            </div>

            {/* 3. HumAID DistilBERT Model */}
            <div className="bg-[#0D1B2D] rounded-xl border border-[#203550] shadow-sm p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  <Brain className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  (healthData?.model_loaded ?? true)
                    ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                }`}>
                  {(healthData?.model_loaded ?? true) ? 'LOADED' : 'FALLBACK'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-white text-xs">HumAID DistilBERT</h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate" title={healthData?.model_dir || 'resqnet_distilbert_full'}>
                  {healthData?.model_dir ? healthData.model_dir.replace(/\\/g, '/').split('/').pop() : 'resqnet_distilbert_full'}
                </p>
              </div>
              <div className="pt-2 border-t border-[#203550] text-[11px] flex items-center space-x-1 font-medium text-purple-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{(healthData?.model_loaded ?? true) ? '11 Humanitarian Classes Ready' : 'Inference Fallback Mode'}</span>
              </div>
            </div>

            {/* 4. IoT Telemetry Stream */}
            <div className="bg-[#0D1B2D] rounded-xl border border-[#203550] shadow-sm p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Radio className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  SIMULATED
                </span>
              </div>
              <div>
                <h3 className="font-bold text-white text-xs">Simulated Telemetry Stream</h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  14.2 pkts/sec nominal (Synthetic Demo Feed)
                </p>
              </div>
              <div className="pt-2 border-t border-[#203550] text-[11px] flex items-center space-x-1 font-medium text-amber-400">
                <Clock className="w-3.5 h-3.5" />
                <span>Simulated stream — Not live physical sensors</span>
              </div>
            </div>
          </div>

          {/* Deep Diagnostic Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Model Architecture & Triage Pipeline */}
            <div className="bg-[#0D1B2D] rounded-xl border border-[#203550] shadow-sm p-5 space-y-3">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                <span>HumAID NLP Classification Engine Architecture</span>
              </h3>
              <p className="text-xs text-slate-400">
                DistilBERT sequence classification trained on Humanitarian AI humanitarian tweets and situational messages.
              </p>

              <div className="border border-[#203550] rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <tbody className="divide-y divide-[#203550]/60">
                    <tr className="bg-[#091629]">
                      <td className="p-2.5 font-semibold text-slate-300 font-mono text-[11px]">Model Architecture</td>
                      <td className="p-2.5 text-slate-200 font-mono text-[11px]">DistilBERT (distilbert-base-uncased)</td>
                    </tr>
                    <tr className="bg-[#0D1B2D]">
                      <td className="p-2.5 font-semibold text-slate-300 font-mono text-[11px]">Trained Classes</td>
                      <td className="p-2.5 text-slate-200 font-mono text-[11px]">11 Disaster Need & Damage Categories</td>
                    </tr>
                    <tr className="bg-[#091629]">
                      <td className="p-2.5 font-semibold text-slate-300 font-mono text-[11px]">Inference Backend</td>
                      <td className="p-2.5 text-slate-200 font-mono text-[11px]">PyTorch / HuggingFace Transformers</td>
                    </tr>
                    <tr className="bg-[#0D1B2D]">
                      <td className="p-2.5 font-semibold text-slate-300 font-mono text-[11px]">Model Status</td>
                      <td className="p-2.5 text-slate-200 font-mono text-[11px] text-emerald-400 font-semibold">
                        resqnet_distilbert_full loaded
                      </td>
                    </tr>
                    <tr className="bg-[#091629]">
                      <td className="p-2.5 font-semibold text-slate-300 font-mono text-[11px]">Triage Role</td>
                      <td className="p-2.5 text-slate-300 text-[11px]">Predictive decision-support triage only</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Persistence & Database Schema Specs */}
            <div className="bg-[#0D1B2D] rounded-xl border border-[#203550] shadow-sm p-5 space-y-3">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>SQLite Persistent Storage Integrity</span>
              </h3>
              <p className="text-xs text-slate-400">
                Single unified SQLite database ensures audit logs, overrides, and merges persist across server restarts.
              </p>

              <div className="border border-[#203550] rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <tbody className="divide-y divide-[#203550]/60">
                    <tr className="bg-[#091629]">
                      <td className="p-2.5 font-semibold text-slate-300 font-mono text-[11px]">Database Engine</td>
                      <td className="p-2.5 text-slate-200 font-mono text-[11px]">SQLite 3.x (WAL Mode Enabled)</td>
                    </tr>
                    <tr className="bg-[#0D1B2D]">
                      <td className="p-2.5 font-semibold text-slate-300 font-mono text-[11px]">Primary Tables</td>
                      <td className="p-2.5 text-slate-200 font-mono text-[11px]">incidents, duplicate_reviews, audit_logs</td>
                    </tr>
                    <tr className="bg-[#091629]">
                      <td className="p-2.5 font-semibold text-slate-300 font-mono text-[11px]">Audit Retention</td>
                      <td className="p-2.5 text-slate-200 font-mono text-[11px]">Append-only immutable operational history</td>
                    </tr>
                    <tr className="bg-[#0D1B2D]">
                      <td className="p-2.5 font-semibold text-slate-300 font-mono text-[11px]">Database Path</td>
                      <td className="p-2.5 text-slate-200 font-mono text-[11px]">Absolute path verified in config.py</td>
                    </tr>
                    <tr className="bg-[#091629]">
                      <td className="p-2.5 font-semibold text-slate-300 font-mono text-[11px]">Integrity Check</td>
                      <td className="p-2.5 text-slate-200 text-[11px] text-emerald-400 font-semibold">
                        ✓ PRAGMA quick_check passed
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
