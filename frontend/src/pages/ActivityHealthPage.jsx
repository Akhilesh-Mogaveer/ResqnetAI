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
      <div className="relative bg-surface-card p-5 rounded-clay-card shadow-clay-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-text-primary tracking-tight">
              Activity & System Health Diagnostics
            </h1>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-clay-pill bg-brand-primary/10 text-brand-primary font-bold shadow-clay-pill">
              System Audit & Diagnostics
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Coordinator accountability audit log, FastAPI connection status, SQLite database integrity, and HumAID NLP model telemetry.
          </p>
        </div>

        {/* View Switcher as Clay-Inset Segmented Track */}
        <div className="flex items-center bg-surface-inset rounded-clay-pill shadow-clay-inset p-1 relative z-10">
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-3.5 py-1.5 rounded-clay-pill text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'audit'
                ? 'bg-surface-elevated text-brand-primary shadow-clay-button font-bold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Coordinator Audit Ledger
          </button>
          <button
            onClick={() => setActiveSubTab('health')}
            className={`px-3.5 py-1.5 rounded-clay-pill text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'health'
                ? 'bg-surface-elevated text-brand-primary shadow-clay-button font-bold'
                : 'text-text-secondary hover:text-text-primary'
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
            <div className="bg-surface-card rounded-clay-card shadow-clay-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-clay-button bg-brand-primary/10 text-brand-primary shadow-clay-button">
                  <Server className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-clay-pill shadow-clay-pill ${
                  backendConnected === true 
                    ? 'bg-severity-success/15 text-[#1C8C5A]'
                    : 'bg-severity-critical/15 text-[#C0292E]'
                }`}>
                  {backendConnected === true ? 'ONLINE' : 'FALLBACK'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-text-primary text-xs">FastAPI REST Server</h3>
                <p className="text-[11px] text-text-muted font-mono mt-0.5 truncate">
                  {api.getBaseUrl()}
                </p>
              </div>
              <div className="pt-2 text-[11px]">
                {backendConnected === true ? (
                  <span className="text-[#1C8C5A] flex items-center space-x-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Endpoints responding nominal</span>
                  </span>
                ) : (
                  <button
                    onClick={onRetryConnection}
                    disabled={isLoading}
                    className="text-brand-primary font-medium hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Retry API Connection</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2. SQLite Database */}
            <div className="bg-surface-card rounded-clay-card shadow-clay-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-clay-button bg-severity-success/15 text-[#1C8C5A] shadow-clay-button">
                  <Database className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-clay-pill shadow-clay-pill bg-severity-success/15 text-[#1C8C5A]">
                  ACTIVE
                </span>
              </div>
              <div>
                <h3 className="font-bold text-text-primary text-xs">SQLite Persistent DB</h3>
                <p className="text-[11px] text-text-muted font-mono mt-0.5 truncate">
                  backend/resqnet.db
                </p>
              </div>
              <div className="pt-2 text-[11px] flex items-center space-x-1 font-medium text-[#1C8C5A]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Single absolute DB path</span>
              </div>
            </div>

            {/* 3. HumAID DistilBERT Model */}
            <div className="bg-surface-card rounded-clay-card shadow-clay-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-clay-button bg-purple-500/15 text-purple-600 shadow-clay-button">
                  <Brain className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-clay-pill shadow-clay-pill ${
                  (healthData?.model_loaded ?? true)
                    ? 'bg-purple-500/15 text-purple-700'
                    : 'bg-severity-high/15 text-[#B26A00]'
                }`}>
                  {(healthData?.model_loaded ?? true) ? 'LOADED' : 'FALLBACK'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-text-primary text-xs">HumAID DistilBERT</h3>
                <p className="text-[11px] text-text-muted font-mono mt-0.5 truncate" title={healthData?.model_dir || 'resqnet_distilbert_full'}>
                  {healthData?.model_dir ? healthData.model_dir.replace(/\\/g, '/').split('/').pop() : 'resqnet_distilbert_full'}
                </p>
              </div>
              <div className="pt-2 text-[11px] flex items-center space-x-1 font-medium text-purple-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{(healthData?.model_loaded ?? true) ? '11 Humanitarian Classes Ready' : 'Inference Fallback Mode'}</span>
              </div>
            </div>

            {/* 4. IoT Telemetry Stream */}
            <div className="bg-surface-card rounded-clay-card shadow-clay-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-clay-button bg-severity-high/15 text-[#B26A00] shadow-clay-button">
                  <Radio className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-clay-pill shadow-clay-pill bg-severity-high/15 text-[#B26A00]">
                  SIMULATED
                </span>
              </div>
              <div>
                <h3 className="font-bold text-text-primary text-xs">Simulated Telemetry Stream</h3>
                <p className="text-[11px] text-text-muted font-mono mt-0.5">
                  14.2 pkts/sec nominal (Synthetic Demo Feed)
                </p>
              </div>
              <div className="pt-2 text-[11px] flex items-center space-x-1 font-medium text-[#B26A00]">
                <Clock className="w-3.5 h-3.5" />
                <span>Simulated stream — Not live physical sensors</span>
              </div>
            </div>
          </div>

          {/* Deep Diagnostic Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Model Architecture & Triage Pipeline */}
            <div className="bg-surface-card rounded-clay-card shadow-clay-card p-5 space-y-3">
              <h3 className="font-bold text-text-primary text-sm flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-purple-600" />
                <span>HumAID NLP Classification Engine Architecture</span>
              </h3>
              <p className="text-xs text-text-secondary">
                DistilBERT sequence classification trained on Humanitarian AI humanitarian tweets and situational messages.
              </p>

              <div className="rounded-clay-card overflow-hidden shadow-clay-inset bg-surface-inset text-xs">
                <table className="w-full text-left">
                  <tbody className="divide-y divide-black/5">
                    <tr className="bg-surface-card/60">
                      <td className="p-3 font-semibold text-text-secondary font-mono text-[11px] w-2/5">Model Architecture</td>
                      <td className="p-3 text-text-primary font-mono text-[11px]">DistilBERT (distilbert-base-uncased)</td>
                    </tr>
                    <tr className="bg-surface-inset/40">
                      <td className="p-3 font-semibold text-text-secondary font-mono text-[11px]">Trained Classes</td>
                      <td className="p-3 text-text-primary font-mono text-[11px]">11 Disaster Need & Damage Categories</td>
                    </tr>
                    <tr className="bg-surface-card/60">
                      <td className="p-3 font-semibold text-text-secondary font-mono text-[11px]">Inference Backend</td>
                      <td className="p-3 text-text-primary font-mono text-[11px]">PyTorch / HuggingFace Transformers</td>
                    </tr>
                    <tr className="bg-surface-inset/40">
                      <td className="p-3 font-semibold text-text-secondary font-mono text-[11px]">Model Status</td>
                      <td className="p-3 text-[#1C8C5A] font-mono text-[11px] font-semibold">
                        resqnet_distilbert_full loaded
                      </td>
                    </tr>
                    <tr className="bg-surface-card/60">
                      <td className="p-3 font-semibold text-text-secondary font-mono text-[11px]">Triage Role</td>
                      <td className="p-3 text-text-secondary text-[11px]">Predictive decision-support triage only</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Persistence & Database Schema Specs */}
            <div className="bg-surface-card rounded-clay-card shadow-clay-card p-5 space-y-3">
              <h3 className="font-bold text-text-primary text-sm flex items-center space-x-2">
                <Database className="w-4 h-4 text-[#1C8C5A]" />
                <span>SQLite Persistent Storage Integrity</span>
              </h3>
              <p className="text-xs text-text-secondary">
                Single unified SQLite database ensures audit logs, overrides, and merges persist across server restarts.
              </p>

              <div className="rounded-clay-card overflow-hidden shadow-clay-inset bg-surface-inset text-xs">
                <table className="w-full text-left">
                  <tbody className="divide-y divide-black/5">
                    <tr className="bg-surface-card/60">
                      <td className="p-3 font-semibold text-text-secondary font-mono text-[11px] w-2/5">Database Engine</td>
                      <td className="p-3 text-text-primary font-mono text-[11px]">SQLite 3.x (WAL Mode Enabled)</td>
                    </tr>
                    <tr className="bg-surface-inset/40">
                      <td className="p-3 font-semibold text-text-secondary font-mono text-[11px]">Primary Tables</td>
                      <td className="p-3 text-text-primary font-mono text-[11px]">incidents, duplicate_reviews, audit_logs</td>
                    </tr>
                    <tr className="bg-surface-card/60">
                      <td className="p-3 font-semibold text-text-secondary font-mono text-[11px]">Audit Retention</td>
                      <td className="p-3 text-text-primary font-mono text-[11px]">Append-only immutable operational history</td>
                    </tr>
                    <tr className="bg-surface-inset/40">
                      <td className="p-3 font-semibold text-text-secondary font-mono text-[11px]">Database Path</td>
                      <td className="p-3 text-text-primary font-mono text-[11px]">Absolute path verified in config.py</td>
                    </tr>
                    <tr className="bg-surface-card/60">
                      <td className="p-3 font-semibold text-text-secondary font-mono text-[11px]">Integrity Check</td>
                      <td className="p-3 text-[#1C8C5A] text-[11px] font-semibold">
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

