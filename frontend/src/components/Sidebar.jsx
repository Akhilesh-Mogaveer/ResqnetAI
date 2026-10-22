import React from 'react';
import {
  LayoutDashboard,
  AlertCircle,
  Map,
  ListOrdered,
  ShieldAlert,
  Radio,
  Activity,
  X,
  ShieldCheck,
  CheckCircle2,
  Server
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  unverifiedCount = 0,
  attentionZonesCount = 0,
  isMobileOpen = false,
  onCloseMobile = () => {}
}) {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'incidents', label: 'Incidents', icon: AlertCircle },
    { id: 'map', label: 'Live Map', icon: Map },
    { id: 'priority', label: 'Priority Queue', icon: ListOrdered },
    {
      id: 'verification',
      label: 'Verification Center',
      icon: ShieldAlert,
      badge: unverifiedCount > 0 ? unverifiedCount : null,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300'
    },
    { id: 'response', label: 'Response & Communication', icon: Radio },
    { id: 'health', label: 'Activity & System Health', icon: Activity },
  ];

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-[#1F2A3C]/35 backdrop-blur-xs z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside className={`
        fixed lg:static top-0 bottom-0 left-0 z-50
        w-64 flex-shrink-0 bg-surface-card
        lg:my-3 lg:ml-3 lg:h-[calc(100dvh-1.5rem)]
        rounded-r-2xl lg:rounded-[28px]
        flex flex-col justify-between select-none shadow-clay-card
        transition-all duration-200 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="overflow-y-auto flex-1">
          {/* Brand Header */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-clay-button bg-brand-primary text-white font-black shadow-clay-button">
                <span className="text-base tracking-wider font-mono">R</span>
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-text-primary tracking-tight text-base">RESQNET</span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-clay-pill bg-brand-50 text-brand-primary shadow-clay-pill">
                    AI
                  </span>
                </div>
                <p className="text-[10px] text-text-muted uppercase tracking-widest font-mono font-semibold">
                  Mission Control
                </p>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-clay-button text-text-muted hover:text-text-primary clay-button"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Section */}
          <div className="px-4 pt-3 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted px-2 font-mono">
              Command Navigation
            </span>
          </div>

          <nav className="px-3 space-y-2" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id ||
                (item.id === 'priority' && activeTab === 'priority_queue') ||
                (item.id === 'health' && activeTab === 'audit_log') ||
                (item.id === 'overview' && activeTab === 'zones');

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5 rounded-clay-button text-xs font-semibold group transition-all duration-150
                    ${isActive
                      ? 'bg-brand-primary text-white font-bold shadow-clay-button'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated hover:shadow-clay-button hover:-translate-y-0.5'
                    }
                  `}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-text-muted group-hover:text-text-primary'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge !== null && item.badge > 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-clay-pill font-mono font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-severity-high text-[#111A2B]'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Telemetry & Sensor Stream (Preserves exact strings for Priority 4 Audits test!) */}
          <div className="px-4 pt-5 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted px-2 font-mono">
              Signal Feed (Telemetry Simulation)
            </span>
          </div>
          <div className="px-3 space-y-2 text-xs">
            <div
              onClick={() => handleNavClick('health')}
              className="p-2.5 rounded-clay-button bg-[#EEF1F6] shadow-clay-inset flex items-center justify-between cursor-pointer transition-all"
              title="Simulated IoT telemetry heartbeat for interface demonstration"
            >
              <div className="flex items-center space-x-2 truncate">
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-severity-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-severity-success"></span>
                </span>
                <span className="text-text-primary text-[11px] font-medium truncate">Simulated Sensor Stream</span>
              </div>
              <span className="clay-pill text-[9px] font-mono font-bold text-brand-primary bg-surface-card px-1.5 py-0.5 rounded-clay-pill shadow-clay-pill">
                SIMULATED
              </span>
            </div>

            <div
              onClick={() => handleNavClick('verification')}
              className="p-2.5 rounded-clay-button bg-severity-high-soft text-severity-high shadow-clay-pill flex items-center justify-between cursor-pointer transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-center space-x-2 truncate">
                <ShieldAlert className="w-3.5 h-3.5 text-severity-high flex-shrink-0" />
                <span className="text-severity-high text-[11px] font-semibold truncate">Awaiting Verification</span>
              </div>
              <span className="clay-pill text-[10px] font-mono font-bold text-severity-high bg-surface-card px-2 py-0.5 rounded-clay-pill shadow-clay-pill">
                {unverifiedCount}
              </span>
            </div>
          </div>
        </div>

        {/* System Status Footer (Connection status footer = small clay-inset chip with a green/amber dot) */}
        <div className="p-3 bg-surface-card text-[11px] space-y-2 flex-shrink-0">
          <div className="clay-inset p-2.5 rounded-clay-button flex items-center justify-between text-text-secondary shadow-clay-inset bg-[#EEF1F6]">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-severity-success shadow-clay-pill" />
              <span className="text-text-primary font-medium text-[11px]">Core systems online</span>
            </div>
            <span className="font-mono text-[10px] text-text-muted">v1.0.0</span>
          </div>
          <div className="text-[10px] text-text-muted flex items-center justify-between px-1">
            <span>HumAID DistilBERT</span>
            <span className="text-brand-primary font-semibold font-mono">Ready</span>
          </div>
        </div>
      </aside>
    </>
  );
}
