import React, { useState } from 'react';
import { Download, X, Copy, Check, FileText } from 'lucide-react';

export default function ExportBriefModal({ isOpen, onClose, incidents = [], attentionZones = [] }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const activeIncidents = incidents.filter(i => i.responseStatus !== 'resolved');
  const critical = incidents.filter(i => i.severity === 'critical');

  const briefText = `# RESQNET AI - EMERGENCY SITUATION BRIEF (SITREP)
Generated: ${new Date().toISOString()}
Environment: SIMULATED OPERATIONAL ENVIRONMENT

## 1. Executive Summary
- Total Active Incidents: ${activeIncidents.length}
- Critical Life-Threat Threats: ${critical.length}
- Unverified Reports Requiring Ground Truth: ${incidents.filter(i => i.verificationStatus === 'unverified').length}
- Signal Gap / Underreported Zones: ${attentionZones.length}

## 2. Critical Priority Queue
${critical.map((c, idx) => `### [${c.id}] ${c.title}
- Priority Score: ${c.priorityScore}/100 | Severity: ${c.severity.toUpperCase()}
- Sector: ${c.sector} (${c.locationName})
- Verification Status: ${c.verificationStatus.toUpperCase()} | Response: ${c.responseStatus.toUpperCase()}
- Affected Population: ${c.peopleAffected}
- Rationale: ${c.whyPrioritised}
`).join('\n')}

## 3. Signal Gap / Underreported Zones (Caution: Lack of reports does not indicate safety)
${attentionZones.map(z => `- **${z.name}** (${z.id}): ${z.signalDeviation} signal deviation | ${z.confidence} | Est. Barrier: ${z.estimatedBarriers}`).join('\n')}

---
*Notice: Operational data synthesized for coordination simulation.*
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(briefText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([briefText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RESQNET_SITREP_${new Date().toISOString().slice(0, 16).replace(/:/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F2A3C]/35 backdrop-blur-xs animate-fade-in">
      <div className="bg-surface-elevated rounded-clay-modal max-w-2xl w-full shadow-clay-modal overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-brand-primary" />
            <h3 className="text-sm font-bold text-text-primary tracking-tight">
              Export Operational Situation Brief (SITREP)
            </h3>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1.5 rounded-clay-button hover:bg-surface-inset transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 font-mono text-xs bg-surface-inset text-text-primary shadow-clay-inset rounded-clay-input m-4">
          <pre className="whitespace-pre-wrap leading-relaxed">{briefText}</pre>
        </div>

        <div className="px-6 py-4 bg-surface-elevated flex items-center justify-between">
          <span className="text-[11px] font-mono text-text-muted">
            Markdown format with operational headers
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-clay-button clay-button text-text-primary text-xs font-semibold transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-severity-success" /> : <Copy className="w-3.5 h-3.5 text-text-muted" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-clay-button clay-button-primary text-white font-bold text-xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .MD Brief</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
