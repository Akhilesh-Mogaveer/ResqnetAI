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
        className: 'bg-severity-success/15 text-[#1C8C5A] shadow-clay-pill',
        icon: CheckCircle2,
        desc: 'Gateway active. Forwarded emergency SMS packets reaching backend.',
      };
    case 'testing':
      return {
        label: 'Testing',
        className: 'bg-brand-primary/15 text-brand-primary shadow-clay-pill',
        icon: RefreshCw,
        desc: 'Connectivity test or handshake verification in progress.',
      };
    case 'setup_required':
      return {
        label: 'Setup required',
        className: 'bg-severity-high/15 text-[#B26A00] shadow-clay-pill',
        icon: AlertTriangle,
        desc: 'Phone number saved. Volunteer Android app needs configuration.',
      };
    case 'unavailable':
      return {
        label: 'Unavailable',
        className: 'bg-severity-critical/15 text-[#C0292E] shadow-clay-pill',
        icon: XCircle,
        desc: 'SMS intake unavailable. Number was deactivated or deleted.',
      };
    case 'not_configured':
    default:
      return {
        label: 'Not configured',
        className: 'bg-severity-low/15 text-[#52606D] shadow-clay-pill',
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

  // Determine public webhook URL recommendation for Android SMS Forwarder
  const backendBase = (api.getBaseUrl ? api.getBaseUrl() : 'http://127.0.0.1:8000').replace(/\/+$/, '');
  const isLocalhost = backendBase.includes('localhost') || backendBase.includes('127.0.0.1');
  const sampleWebhookUrl = isLocalhost
    ? 'https://your-public-resqnet.domain/api/v1/sms/forwarded'
    : `${backendBase}/api/v1/sms/forwarded`;

  return (
    <div className="bg-surface-card rounded-clay-card shadow-clay-card p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-brand-primary" />
            <h2 className="text-base font-bold text-text-primary tracking-tight">
              Dynamic Community Emergency Number & Android SMS Gateway
            </h2>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Configure a volunteer-supplied phone number. An Android SMS-forwarding app on that phone forwards citizen SMS to RESQNET AI.
          </p>
        </div>

        {/* Current Status Pill */}
        <div className="flex items-center space-x-2">
          <span
            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-clay-pill text-xs font-semibold ${statusMeta.className}`}
            data-testid="community-number-status-badge"
          >
            <StatusIcon className="w-3.5 h-3.5" />
            <span>{statusMeta.label}</span>
          </span>
          <button
            onClick={fetchNumberConfig}
            title="Refresh status"
            disabled={isLoading}
            className="p-2 rounded-clay-button bg-surface-card shadow-clay-button active:shadow-clay-inset text-text-secondary hover:text-text-primary transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status Explanatory Banner */}
      <div className={`p-4 rounded-clay-card text-xs flex items-start space-x-3 ${
        config?.status === 'connected'
          ? 'bg-severity-success/10 text-text-primary shadow-clay-card'
          : config?.status === 'setup_required'
          ? 'bg-severity-high/10 text-text-primary shadow-clay-card'
          : config?.status === 'unavailable'
          ? 'bg-severity-critical/10 text-text-primary shadow-clay-card'
          : 'bg-surface-inset shadow-clay-inset text-text-secondary'
      }`}>
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-brand-primary" />
        <div className="space-y-1">
          <p className="font-semibold text-text-primary">
            Connection Status: {statusMeta.label}
          </p>
          <p className="text-[11px] leading-relaxed text-text-secondary">
            {statusMeta.desc}{' '}
            <strong className="text-text-primary">Adding a number does not itself enable SMS reception.</strong> The volunteer must install an Android forwarding app and link this webhook.
          </p>
        </div>
      </div>

      {/* Main Body: Active Number View OR Configuration Form */}
      {config && config.is_active && !isEditing ? (
        /* Active Number Display */
        <div className="space-y-4">
          <div className="bg-surface-inset p-4 rounded-clay-card shadow-clay-inset space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                  Shared Community Emergency Line
                </span>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-xl font-mono font-bold text-text-primary tracking-wide">
                    {config.phone_number}
                  </span>
                  <button
                    onClick={() => handleCopy(config.phone_number, 'phone')}
                    title="Copy phone number"
                    className="text-text-muted hover:text-brand-primary transition-colors p-1 cursor-pointer"
                  >
                    {copiedKey === 'phone' ? <Check className="w-4 h-4 text-[#1C8C5A]" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                {config.volunteer_notes && (
                  <p className="text-xs text-text-secondary mt-1 italic">
                    Volunteer notes: {config.volunteer_notes}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-clay-button bg-surface-card hover:bg-surface-card/80 text-text-primary shadow-clay-button active:shadow-clay-inset text-xs font-semibold transition-all cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Change Number</span>
                </button>

                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-clay-button bg-severity-critical/10 hover:bg-severity-critical/20 text-[#C0292E] shadow-clay-button active:shadow-clay-inset text-xs font-semibold transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Number</span>
                </button>
              </div>
            </div>

            {/* Webhook Configuration Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 text-xs font-mono">
              {/* Webhook Path */}
              <div className="space-y-1">
                <span className="text-text-muted text-[11px] block font-sans">
                  Target Webhook Path (HTTPS)
                </span>
                <div className="flex items-center justify-between bg-surface-card px-3 py-2 rounded-clay-input shadow-clay-card">
                  <span className="text-brand-primary truncate font-bold">/api/v1/sms/forwarded</span>
                  <button
                    onClick={() => handleCopy('/api/v1/sms/forwarded', 'path')}
                    className="text-text-muted hover:text-text-primary ml-2 flex-shrink-0 cursor-pointer"
                  >
                    {copiedKey === 'path' ? <Check className="w-3.5 h-3.5 text-[#1C8C5A]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Forwarding Secret */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-text-muted text-[11px] font-sans">
                  <span>Authentication Secret Token</span>
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="text-brand-primary hover:underline text-[10px] flex items-center space-x-1 cursor-pointer"
                  >
                    {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showSecret ? 'Hide' : 'Reveal'}</span>
                  </button>
                </div>
                <div className="flex items-center justify-between bg-surface-card px-3 py-2 rounded-clay-input shadow-clay-card">
                  <span className="text-[#B26A00] truncate font-mono font-bold">
                    {showSecret ? config.forwarding_secret : '••••••••••••••••••••••••••••'}
                  </span>
                  <button
                    onClick={() => handleCopy(config.forwarding_secret, 'secret')}
                    className="text-text-muted hover:text-text-primary ml-2 flex-shrink-0 cursor-pointer"
                  >
                    {copiedKey === 'secret' ? <Check className="w-3.5 h-3.5 text-[#1C8C5A]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Last Ping Footer */}
            <div className="flex items-center justify-between text-[11px] text-text-muted pt-2 font-mono">
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-text-muted" />
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
                className="text-brand-primary hover:underline font-sans text-xs flex items-center space-x-1 cursor-pointer"
              >
                <span>Ping Handshake</span>
              </button>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowTester(!showTester)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-clay-button bg-surface-card hover:bg-surface-card/80 text-text-primary font-semibold text-xs shadow-clay-button active:shadow-clay-inset transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-[#1C8C5A]" />
              <span>{showTester ? 'Hide Test Gateway' : 'Test Forwarded SMS Intake'}</span>
            </button>

            <button
              onClick={() => setShowGuide(!showGuide)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-clay-button bg-surface-card hover:bg-surface-card/80 text-text-secondary hover:text-text-primary font-semibold text-xs shadow-clay-button active:shadow-clay-inset transition-all cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-brand-primary" />
              <span>Android Forwarder App Setup Guide</span>
              {showGuide ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
            </button>
          </div>
        </div>
      ) : (
        /* Configuration Form (Add or Edit) */
        <form onSubmit={handleSave} className="bg-surface-inset p-4 rounded-clay-card shadow-clay-inset space-y-4">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-bold text-text-primary">
              {config?.is_active ? 'Change Community Emergency Number' : 'Configure Shared Community Emergency Number'}
            </h3>
            {config?.is_active && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs text-text-muted hover:text-text-primary cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          {formError && (
            <div className="p-3 rounded-clay-card bg-severity-critical/10 text-[#C0292E] text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Country Code Selector */}
            <div className="md:col-span-4 space-y-1">
              <label className="block text-xs font-medium text-text-secondary">
                Country Dial Code
              </label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full bg-surface-card shadow-clay-card rounded-clay-input px-3 py-2 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 transition-all cursor-pointer"
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
              <label className="block text-xs font-medium text-text-secondary">
                Volunteer Mobile / SIM Number
              </label>
              <input
                type="tel"
                placeholder="e.g. 98765 43210"
                value={rawNumber}
                onChange={(e) => setRawNumber(e.target.value)}
                className="w-full bg-surface-card shadow-clay-card rounded-clay-input px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/30 font-mono transition-all"
                required
              />
            </div>
          </div>

          {/* Volunteer Notes */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-text-secondary">
              Volunteer Operator / Device Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Shift Lead Priya (Samsung Galaxy A14, Airtel SIM 1)"
              value={volunteerNotes}
              onChange={(e) => setVolunteerNotes(e.target.value)}
              className="w-full bg-surface-card shadow-clay-card rounded-clay-input px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/30 transition-all"
            />
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end space-x-2 pt-2">
            {config?.is_active && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3.5 py-2 rounded-clay-button bg-surface-card hover:bg-surface-card/80 text-text-secondary hover:text-text-primary text-xs font-semibold shadow-clay-button active:shadow-clay-inset cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-clay-button bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold shadow-clay-primary active:shadow-clay-inset transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Add / Save Number'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Test Simulator Drawer */}
      {showTester && config?.is_active && (
        <div className="bg-surface-inset p-4 rounded-clay-card shadow-clay-inset space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-black/5">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-[#1C8C5A]" />
              <h3 className="text-xs font-bold text-text-primary">
                Test Real Forwarded SMS Ingestion (Simulate Volunteer Android App)
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-clay-pill bg-severity-success/15 text-[#1C8C5A] shadow-clay-pill font-bold">
              Authenticated Webhook Test
            </span>
          </div>

          <p className="text-[11px] text-text-secondary">
            Simulates an incoming HTTP POST to <code className="text-brand-primary font-bold">/api/v1/sms/forwarded</code> using your active secret. Confirms HumAID classification, priority scoring, deduplication, and notification creation.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-text-secondary text-[11px] font-medium mb-1">
                Citizen Sender Number
              </label>
              <input
                type="text"
                value={testSender}
                onChange={(e) => setTestSender(e.target.value)}
                className="w-full bg-surface-card shadow-clay-card rounded-clay-input px-3 py-2 text-xs text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary/30 transition-all"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-text-secondary text-[11px] font-medium mb-1">
                SMS Distress Message Body
              </label>
              <input
                type="text"
                value={testBody}
                onChange={(e) => setTestBody(e.target.value)}
                className="w-full bg-surface-card shadow-clay-card rounded-clay-input px-3 py-2 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={handleSendTestForward}
              disabled={isSendingTest}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-clay-button bg-[#1C8C5A] hover:bg-emerald-700 text-white font-semibold text-xs shadow-clay-button active:shadow-clay-inset transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSendingTest ? 'Forwarding...' : 'Dispatch Forwarded SMS'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Provider-Independent Android Forwarding Integration Guide */}
      {showGuide && (
        <div className="bg-surface-inset p-5 rounded-clay-card shadow-clay-inset space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-black/5">
            <div className="flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-brand-primary" />
              <h3 className="text-sm font-bold text-text-primary">
                Volunteer Android SMS-Forwarding App Setup Guide
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-clay-pill bg-brand-primary/10 text-brand-primary shadow-clay-pill font-bold">
              Provider-Independent
            </span>
          </div>

          {/* Alert: Real phone requires public HTTPS */}
          <div className="bg-severity-high/10 p-3.5 rounded-clay-card shadow-clay-card text-text-primary text-[11px] space-y-1">
            <div className="flex items-center space-x-1.5 font-bold text-[#B26A00]">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Public Webhook Requirement Notice</span>
            </div>
            <p className="leading-relaxed text-text-secondary">
              External physical phones cannot reach <code className="text-text-primary font-mono">http://localhost</code>. For live field testing from a real smartphone, your RESQNET backend must be hosted on a public domain with HTTPS, or exposed locally via a secure tunnel (e.g. <strong className="text-text-primary">Cloudflare Tunnel</strong> or <strong className="text-text-primary">ngrok</strong>: <code className="text-brand-primary font-mono font-bold">ngrok http 8000</code>).
            </p>
          </div>

          {/* Step 1 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-text-primary flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-brand-primary text-white flex items-center justify-center text-[11px] font-mono font-bold shadow-clay-pill">1</span>
              <span>Install a Compatible Android SMS Forwarder App</span>
            </h4>
            <p className="text-text-secondary text-[11px] pl-6 leading-relaxed">
              Any Android app capable of sending incoming SMS to a configurable HTTPS Webhook via JSON POST is supported (e.g., open-source <strong>SMS Forwarder </strong>, <strong>Macrodroid</strong>, or <strong>IFTTT</strong>).
            </p>
            <div className="pl-6 space-y-1 text-text-secondary text-[11px]">
              <p><strong className="text-text-primary">Required Android Permissions:</strong></p>
              <ul className="list-disc list-inside space-y-0.5 text-text-secondary">
                <li><code className="text-brand-primary font-mono font-bold">RECEIVE_SMS</code> & <code className="text-brand-primary font-mono font-bold">READ_SMS</code> (to detect incoming emergency messages)</li>
                <li><code className="text-brand-primary font-mono font-bold">INTERNET</code> (to POST payloads to RESQNET)</li>
                <li><code className="text-brand-primary font-mono font-bold">POST_NOTIFICATIONS</code> (required on Android 13+ to keep foreground service alive)</li>
              </ul>
              <p className="pt-1 text-[#B26A00]">
                ⚠️ <strong>Battery Optimization Exemption:</strong> Whitelist the app under Android Settings → Apps → Battery → "Unrestricted / Don't Optimize". Enable Autostart on Xiaomi/Oppo/Samsung devices to prevent OS from killing background forwarding.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-text-primary flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-brand-primary text-white flex items-center justify-center text-[11px] font-mono font-bold shadow-clay-pill">2</span>
              <span>Configure Public Webhook Destination</span>
            </h4>
            <div className="pl-6 space-y-2 text-[11px]">
              <div className="bg-surface-card p-3 rounded-clay-input shadow-clay-card font-mono text-text-primary space-y-1">
                <div><span className="text-text-muted">Method:</span> <strong className="text-[#1C8C5A]">POST</strong></div>
                <div><span className="text-text-muted">URL:</span> <span className="text-brand-primary font-bold">{sampleWebhookUrl}</span></div>
                <div><span className="text-text-muted">Header:</span> <span className="text-[#B26A00] font-bold">X-RESQNET-FORWARDING-SECRET: {config?.forwarding_secret || 'YOUR_SECRET'}</span></div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-text-primary flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-brand-primary text-white flex items-center justify-center text-[11px] font-mono font-bold shadow-clay-pill">3</span>
              <span>JSON Webhook Payload Template</span>
            </h4>
            <div className="pl-6">
              <pre className="bg-surface-card p-3 rounded-clay-input shadow-clay-card font-mono text-[11px] text-text-primary overflow-x-auto">
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
            <h4 className="font-bold text-text-primary flex items-center space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-brand-primary text-white flex items-center justify-center text-[11px] font-mono font-bold shadow-clay-pill">4</span>
              <span>Security, Privacy & Sender Identity Safeguards</span>
            </h4>
            <div className="pl-6 space-y-1 text-text-secondary text-[11px] leading-relaxed">
              <p>
                • <strong className="text-text-primary">Dedicated SIM Recommendation:</strong> We strongly recommend using a dedicated mobile number or secondary SIM for emergency response to avoid accidental forwarding of private civilian messages.
              </p>
              <p>
                • <strong className="text-text-primary">Keyword Rule Filters:</strong> You can configure the Android app to only forward SMS messages containing keywords such as <code className="text-brand-primary font-mono font-bold">HELP</code>, <code className="text-brand-primary font-mono font-bold">SOS</code>, <code className="text-brand-primary font-mono font-bold">EMERGENCY</code>, <code className="text-brand-primary font-mono font-bold">FLOOD</code>, or <code className="text-brand-primary font-mono font-bold">FIRE</code>.
              </p>
              <p>
                • <strong className="text-text-primary">Sender Authentication Limitations:</strong> Cellular SMS does not cryptographically authenticate caller ID. Treat all SMS reports as unverified until confirmed by ground coordinators.
              </p>
              <p>
                • <strong className="text-text-primary">No End-to-End Emergency Guarantee:</strong> SMS is a best-effort telecommunications protocol without SLA guarantees during cellular grid outages.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F2A3C]/35 backdrop-blur-xs">
          <div className="bg-surface-elevated rounded-clay-modal p-6 max-w-md w-full space-y-4 shadow-clay-modal">
            <div className="flex items-center space-x-2.5 text-[#C0292E]">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h3 className="text-sm font-bold text-text-primary">
                Delete Community Emergency Number?
              </h3>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Are you sure you want to delete the active emergency number <strong className="text-text-primary font-mono">{config?.phone_number}</strong>?
            </p>

            <div className="bg-surface-inset p-3.5 rounded-clay-input shadow-clay-inset text-[11px] text-text-secondary space-y-1">
              <p>• <strong className="text-text-primary">SMS intake will become Unavailable</strong> until a new number is configured.</p>
              <p>• The forwarding secret token will be immediately invalidated.</p>
              <p>• <strong className="text-text-primary">Previously created incidents and audit history are PRESERVED</strong> and will not be deleted.</p>
              <p className="text-[#B26A00] pt-1">
                • <strong>Action Required:</strong> The volunteer must also turn off or uninstall the forwarding app on their Android device.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-3.5 py-2 rounded-clay-button clay-button text-text-secondary hover:text-text-primary text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-clay-button clay-button-critical text-white text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
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
