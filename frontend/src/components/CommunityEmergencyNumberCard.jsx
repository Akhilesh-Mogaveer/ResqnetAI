import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Edit2,
  Send,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
  Info,
  Radio,
  Lock,
  PhoneCall,
  Flame,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';

const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'USA / Canada', flag: '🇺🇸' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+254', country: 'Kenya', flag: '🇰🇪' },
];

function getStatusBadge(status) {
  switch (status) {
    case 'connected':
      return {
        label: 'Connected',
        className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        icon: CheckCircle2,
        desc: 'Gateway active. Forwarded emergency SMS packets reaching backend.',
      };
    case 'testing':
      return {
        label: 'Testing',
        className: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
        icon: RefreshCw,
        desc: 'Connectivity test or handshake verification in progress.',
      };
    case 'setup_required':
      return {
        label: 'Setup required',
        className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        icon: AlertTriangle,
        desc: 'Phone number saved. Volunteer Android app needs configuration.',
      };
    case 'unavailable':
      return {
        label: 'Unavailable',
        className: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        icon: XCircle,
        desc: 'SMS intake unavailable. Number was deactivated or deleted.',
      };
    case 'not_configured':
    default:
      return {
        label: 'Not configured',
        className: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
        icon: Smartphone,
        desc: 'No shared community emergency number is currently assigned.',
      };
  }
}

export default function CommunityEmergencyNumberCard({ onShowToast }) {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [countryCode, setCountryCode] = useState('+91');
  const [rawNumber, setRawNumber] = useState('');
  const [volunteerNotes, setVolunteerNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Test Simulation Drawer State
  const [showTester, setShowTester] = useState(false);
  const [testSender, setTestSender] = useState('+91 94480 12345');
  const [testBody, setTestBody] = useState('HELP! Flash flood near Udupi Bus Stand. 4 people stranded on shop roof.');
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    fetchNumberConfig();
  }, []);

  const fetchNumberConfig = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCommunityEmergencyNumber();
      setConfig(data);
      if (data && data.is_active) {
        setIsEditing(false);
        setCountryCode(data.country_code || '+91');
        setRawNumber(data.raw_number || '');
        setVolunteerNotes(data.volunteer_notes || '');
      } else {
        // If not configured or unavailable, show form if never configured
        if (data?.status === 'not_configured') {
          setIsEditing(true);
        }
      }
    } catch (err) {
      console.error('Failed to load community emergency number:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    onShowToast?.('Copied to clipboard', 'info');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    setFormError('');

    const cleanRaw = rawNumber.replace(/\D/g, '');
    if (cleanRaw.length < 5) {
      setFormError('Please enter a valid phone number with at least 5 digits.');
      return;
    }

    const fullFormatted = `${countryCode} ${cleanRaw.slice(0, 5)} ${cleanRaw.slice(5)}`.trim();

    setIsSubmitting(true);
    try {
      const res = await api.saveCommunityEmergencyNumber({
        phone_number: fullFormatted,
        country_code: countryCode,
        raw_number: cleanRaw,
        volunteer_notes: volunteerNotes || null,
      });

      setConfig(res);
      setIsEditing(false);
      onShowToast?.('Community emergency number configured successfully', 'success');
    } catch (err) {
      setFormError(err.message || 'Failed to save community emergency number.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.deleteCommunityEmergencyNumber();
      setConfig(res);
      setShowDeleteModal(false);
      setIsEditing(false);
      onShowToast?.('Community emergency number removed. SMS intake is now unavailable.', 'warning');
    } catch (err) {
      onShowToast?.(err.message || 'Failed to delete emergency number.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestPing = async () => {
    setIsSubmitting(true);
    try {
      await api.testCommunityEmergencyNumberPing();
      await fetchNumberConfig();
      onShowToast?.('Forwarding connection verified. Status set to Connected.', 'success');
    } catch (err) {
      onShowToast?.(err.message || 'Connection test failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendTestForward = async () => {
    if (!testBody.trim()) {
      onShowToast?.('Please enter message body for test forwarding.', 'error');
      return;
    }

    setIsSendingTest(true);
    try {
      const payload = {
        from: testSender.trim(),
        text: testBody.trim(),
        id: `fwd-test-${Date.now()}`,
        timestamp: new Date().toISOString(),
      };

      const res = await api.sendForwardedSMSTest(payload, config?.forwarding_secret);
      await fetchNumberConfig();

      if (res.is_duplicate) {
        onShowToast?.(`Message processed as duplicate (Incident: ${res.incident_id || 'N/A'})`, 'info');
      } else {
        onShowToast?.(`Real Forwarded SMS processed! Created incident ${res.incident_id}`, 'success');
      }
    } catch (err) {
      onShowToast?.(err.message || 'Failed to send forwarded SMS test.', 'error');
    } finally {
      setIsSendingTest(false);
    }
  };

  const statusMeta = getStatusBadge(config?.status || 'not_configured');
  const StatusIcon = statusMeta.icon;

  // Determine public webhook URL recommendation
  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000';
  const isLocalhost = currentHost.includes('localhost') || currentHost.includes('127.0.0.1');
  const sampleWebhookUrl = isLocalhost
    ? 'https://your-public-resqnet.domain/api/v1/sms/forwarded'
    : `${currentHost}/api/v1/sms/forwarded`;

  return (
    <div className="bg-[#0D1B2D] rounded-xl border border-[#203550] shadow-sm p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#203550] gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Dynamic Community Emergency Number & Android SMS Gateway
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure a volunteer-supplied phone number. An Android SMS-forwarding app on that phone forwards citizen SMS to RESQNET AI.
          </p>
        </div>

        {/* Current Status Pill */}
        <div className="flex items-center space-x-2">
          <span
            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusMeta.className}`}
            data-testid="community-number-status-badge"
          >
            <StatusIcon className="w-3.5 h-3.5" />
            <span>{statusMeta.label}</span>
          </span>
          <button
            onClick={fetchNumberConfig}
            title="Refresh status"
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-[#091629] border border-[#203550] text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status Explanatory Banner */}
      <div className={`p-3.5 rounded-lg border text-xs flex items-start space-x-3 ${
        config?.status === 'connected'
          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
          : config?.status === 'setup_required'
          ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
          : config?.status === 'unavailable'
          ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
          : 'bg-[#132238] border-[#203550] text-slate-300'
      }`}>
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">
            Connection Status: {statusMeta.label}
          </p>
          <p className="text-[11px] leading-relaxed text-slate-300">
            {statusMeta.desc}{' '}
            <strong className="text-white">Adding a number does not itself enable SMS reception.</strong> The volunteer must install an Android forwarding app and link this webhook.
          </p>
        </div>
      </div>

      {/* Main Body: Active Number View OR Configuration Form */}
      {config && config.is_active && !isEditing ? (
        /* Active Number Display */
        <div className="space-y-4">
          <div className="bg-[#091629] p-4 rounded-xl border border-[#203550] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Shared Community Emergency Line
                </span>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-xl font-mono font-bold text-white tracking-wide">
                    {config.phone_number}
                  </span>
                  <button
                    onClick={() => handleCopy(config.phone_number, 'phone')}
                    title="Copy phone number"
                    className="text-slate-400 hover:text-cyan-300 transition-colors p-1"
                  >
                    {copiedKey === 'phone' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                {config.volunteer_notes && (
                  <p className="text-xs text-slate-400 mt-1 italic">
                    Volunteer notes: {config.volunteer_notes}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#132238] hover:bg-[#1c3252] text-slate-200 border border-[#203550] text-xs font-semibold transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Change Number</span>
                </button>

                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Number</span>
                </button>
              </div>
            </div>

            {/* Webhook Configuration Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-[#203550]/70 text-xs font-mono">
              {/* Webhook Path */}
              <div className="space-y-1">
                <span className="text-slate-400 text-[11px] block font-sans">
                  Target Webhook Path (HTTPS)
                </span>
                <div className="flex items-center justify-between bg-[#07111F] px-2.5 py-1.5 rounded border border-[#203550]">
                  <span className="text-cyan-300 truncate">/api/v1/sms/forwarded</span>
                  <button
                    onClick={() => handleCopy('/api/v1/sms/forwarded', 'path')}
                    className="text-slate-400 hover:text-white ml-2 flex-shrink-0"
                  >
                    {copiedKey === 'path' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Forwarding Secret */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-sans">
                  <span>Authentication Secret Token</span>
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="text-cyan-400 hover:underline text-[10px] flex items-center space-x-1"
                  >
                    {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showSecret ? 'Hide' : 'Reveal'}</span>
                  </button>
                </div>
                <div className="flex items-center justify-between bg-[#07111F] px-2.5 py-1.5 rounded border border-[#203550]">
                  <span className="text-amber-300 truncate font-mono">
                    {showSecret ? config.forwarding_secret : '••••••••••••••••••••••••••••'}
                  </span>
                  <button
                    onClick={() => handleCopy(config.forwarding_secret, 'secret')}
                    className="text-slate-400 hover:text-white ml-2 flex-shrink-0"
                  >
                    {copiedKey === 'secret' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Last Ping Footer */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-[#203550]/40 font-mono">
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>
                  Last Heartbeat / SMS:{' '}
                  {config.last_ping_at
                    ? new Date(config.last_ping_at).toLocaleString()
                    : 'No packets received yet'}
                </span>
              </span>

              <button
                onClick={handleTestPing}
                disabled={isSubmitting}
                className="text-cyan-400 hover:underline font-sans text-xs flex items-center space-x-1"
              >
                <span>Ping Handshake</span>
              </button>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowTester(!showTester)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-[#132238] hover:bg-[#1a2f4c] text-white font-semibold text-xs border border-[#203550] shadow-sm transition-colors"
            >
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span>{showTester ? 'Hide Test Gateway' : 'Test Forwarded SMS Intake'}</span>
            </button>

            <button
              onClick={() => setShowGuide(!showGuide)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-[#091629] hover:bg-[#132238] text-slate-300 hover:text-white font-semibold text-xs border border-[#203550] transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>Android Forwarder App Setup Guide</span>
              {showGuide ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
            </button>
          </div>
        </div>
      ) : (
        /* Configuration Form (Add or Edit) */
        <form onSubmit={handleSave} className="bg-[#091629] p-4 rounded-xl border border-[#203550] space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#203550]">
            <h3 className="text-sm font-bold text-white">
              {config?.is_active ? 'Change Community Emergency Number' : 'Configure Shared Community Emergency Number'}
            </h3>
            {config?.is_active && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            )}
          </div>

          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Country Code Selector */}
            <div className="md:col-span-4 space-y-1">
              <label className="block text-xs font-medium text-slate-300">
                Country Dial Code
              </label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full bg-[#0D1B2D] border border-[#203550] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.country} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Raw Phone Number Input */}
            <div className="md:col-span-8 space-y-1">
              <label className="block text-xs font-medium text-slate-300">
                Volunteer Mobile / SIM Number
              </label>
              <input
                type="tel"
                placeholder="e.g. 98765 43210"
                value={rawNumber}
                onChange={(e) => setRawNumber(e.target.value)}
                className="w-full bg-[#0D1B2D] border border-[#203550] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                required
              />
            </div>
          </div>

          {/* Volunteer Notes */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300">
              Volunteer Operator / Device Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Shift Lead Priya (Samsung Galaxy A14, Airtel SIM 1)"
              value={volunteerNotes}
              onChange={(e) => setVolunteerNotes(e.target.value)}
              className="w-full bg-[#0D1B2D] border border-[#203550] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end space-x-2 pt-2">
            {config?.is_active && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-2 rounded-lg bg-[#132238] hover:bg-[#1c3252] text-slate-300 text-xs font-semibold border border-[#203550]"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-colors flex items-center space-x-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Add / Save Number'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Test Simulator Drawer */}
      {showTester && config?.is_active && (
        <div className="bg-[#091629] p-4 rounded-xl border border-emerald-500/30 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#203550]">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white">
                Test Real Forwarded SMS Ingestion (Simulate Volunteer Android App)
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Authenticated Webhook Test
            </span>
          </div>

          <p className="text-[11px] text-slate-400">
            Simulates an incoming HTTP POST to <code className="text-cyan-300">/api/v1/sms/forwarded</code> using your active secret. Confirms HumAID classification, priority scoring, deduplication, and notification creation.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-300 text-[11px] font-medium mb-1">
                Citizen Sender Number
              </label>
              <input
                type="text"
                value={testSender}
                onChange={(e) => setTestSender(e.target.value)}
                className="w-full bg-[#0D1B2D] border border-[#203550] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-300 text-[11px] font-medium mb-1">
                SMS Distress Message Body
              </label>
              <input
                type="text"
                value={testBody}
                onChange={(e) => setTestBody(e.target.value)}
                className="w-full bg-[#0D1B2D] border border-[#203550] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={handleSendTestForward}
              disabled={isSendingTest}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSendingTest ? 'Forwarding...' : 'Dispatch Forwarded SMS'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Provider-Independent Android Forwarding Integration Guide */}
      {showGuide && (
        <div className="bg-[#091629] p-5 rounded-xl border border-cyan-500/30 space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#203550]">
            <div className="flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">
                Volunteer Android SMS-Forwarding App Setup Guide
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              Provider-Independent
            </span>
          </div>

          {/* Alert: Real phone requires public HTTPS */}
          <div className="bg-[#132238] p-3 rounded-lg border border-amber-500/30 text-amber-200 text-[11px] space-y-1">
            <div className="flex items-center space-x-1.5 font-bold text-amber-300">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Public Webhook Requirement Notice</span>
            </div>
            <p className="leading-relaxed">
              External physical phones cannot reach <code className="text-white font-mono">http://localhost</code>. For live field testing from a real smartphone, your RESQNET backend must be hosted on a public domain with HTTPS, or exposed locally via a secure tunnel (e.g. <strong className="text-white">Cloudflare Tunnel</strong> or <strong className="text-white">ngrok</strong>: <code className="text-cyan-300 font-mono">ngrok http 8000</code>).
            </p>
          </div>

          {/* Step 1 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-white flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-mono font-bold">1</span>
              <span>Install a Compatible Android SMS Forwarder App</span>
            </h4>
            <p className="text-slate-300 text-[11px] pl-6 leading-relaxed">
              Any Android app capable of sending incoming SMS to a configurable HTTPS Webhook via JSON POST is supported (e.g., open-source <strong>SMS Forwarder (开源短信转发器)</strong>, <strong>Macrodroid</strong>, or <strong>IFTTT</strong>).
            </p>
            <div className="pl-6 space-y-1 text-slate-400 text-[11px]">
              <p><strong>Required Android Permissions:</strong></p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                <li><code className="text-cyan-300">RECEIVE_SMS</code> & <code className="text-cyan-300">READ_SMS</code> (to detect incoming emergency messages)</li>
                <li><code className="text-cyan-300">INTERNET</code> (to POST payloads to RESQNET)</li>
                <li><code className="text-cyan-300">POST_NOTIFICATIONS</code> (required on Android 13+ to keep foreground service alive)</li>
              </ul>
              <p className="pt-1 text-amber-300">
                ⚠️ <strong>Battery Optimization Exemption:</strong> Whitelist the app under Android Settings → Apps → Battery → "Unrestricted / Don't Optimize". Enable Autostart on Xiaomi/Oppo/Samsung devices to prevent OS from killing background forwarding.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-white flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-mono font-bold">2</span>
              <span>Configure Public Webhook Destination</span>
            </h4>
            <div className="pl-6 space-y-2 text-[11px]">
              <div className="bg-[#07111F] p-2.5 rounded border border-[#203550] font-mono text-slate-300 space-y-1">
                <div><span className="text-slate-500">Method:</span> <strong className="text-emerald-300">POST</strong></div>
                <div><span className="text-slate-500">URL:</span> <span className="text-cyan-300">{sampleWebhookUrl}</span></div>
                <div><span className="text-slate-500">Header:</span> <span className="text-amber-300">X-RESQNET-FORWARDING-SECRET: {config?.forwarding_secret || 'YOUR_SECRET'}</span></div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-white flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-mono font-bold">3</span>
              <span>JSON Webhook Payload Template</span>
            </h4>
            <div className="pl-6">
              <pre className="bg-[#07111F] p-2.5 rounded border border-[#203550] font-mono text-[11px] text-slate-300 overflow-x-auto">
{`{
  "from": "[from]",
  "text": "[sms_content]",
  "id": "[sms_id]",
  "timestamp": "[timestamp]"
}`}
              </pre>
            </div>
          </div>

          {/* Step 4 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-white flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-mono font-bold">4</span>
              <span>Security, Privacy & Sender Identity Safeguards</span>
            </h4>
            <div className="pl-6 space-y-1 text-slate-300 text-[11px] leading-relaxed">
              <p>
                • <strong>Dedicated SIM Recommendation:</strong> We strongly recommend using a dedicated mobile number or secondary SIM for emergency response to avoid accidental forwarding of private civilian messages.
              </p>
              <p>
                • <strong>Keyword Rule Filters:</strong> You can configure the Android app to only forward SMS messages containing keywords such as <code className="text-cyan-300">HELP</code>, <code className="text-cyan-300">SOS</code>, <code className="text-cyan-300">EMERGENCY</code>, <code className="text-cyan-300">FLOOD</code>, or <code className="text-cyan-300">FIRE</code>.
              </p>
              <p>
                • <strong>Sender Authentication Limitations:</strong> Cellular SMS does not cryptographically authenticate caller ID. Treat all SMS reports as unverified until confirmed by ground coordinators.
              </p>
              <p>
                • <strong>No End-to-End Emergency Guarantee:</strong> SMS is a best-effort telecommunications protocol without SLA guarantees during cellular grid outages.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#0D1B2D] border border-rose-500/40 rounded-xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center space-x-2.5 text-rose-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h3 className="text-sm font-bold text-white">
                Delete Community Emergency Number?
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete the active emergency number <strong className="text-white font-mono">{config?.phone_number}</strong>?
            </p>

            <div className="bg-[#091629] p-3 rounded-lg border border-[#203550] text-[11px] text-slate-300 space-y-1">
              <p>• <strong>SMS intake will become Unavailable</strong> until a new number is configured.</p>
              <p>• The forwarding secret token will be immediately invalidated.</p>
              <p>• <strong>Previously created incidents and audit history are PRESERVED</strong> and will not be deleted.</p>
              <p className="text-amber-300 pt-1">
                • <strong>Action Required:</strong> The volunteer must also turn off or uninstall the forwarding app on their Android device.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-3 py-2 rounded-lg bg-[#132238] hover:bg-[#1c3252] text-slate-300 text-xs font-semibold border border-[#203550]"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm transition-colors flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Deleting...' : 'Confirm Deletion'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
