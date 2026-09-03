import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, X, Copy, Download, Upload, Info, Terminal } from 'lucide-react';
import { ChatSession } from '../types';

export interface ToastNotification {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
}

export const ConfirmModal: React.FC<{
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({
  isOpen,
  title = 'Confirmation Required',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDanger = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-[#0d1322] border border-indigo-500/30 rounded-xl p-6 shadow-2xl shadow-indigo-950/50 flex flex-col gap-4 text-slate-100"
        role="dialog"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${isDanger ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-slate-100">{title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">WormGPT Security & Harness Control</p>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed font-sans py-1">
          {message}
        </p>

        <div className="flex justify-end gap-2.5 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700/60 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-xs font-semibold shadow-md transition-all ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/40'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export const AlertModal: React.FC<{
  isOpen: boolean;
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  onClose: () => void;
}> = ({ isOpen, title = 'Notification', message, type = 'info', onClose }) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-rose-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      default:
        return <Info className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0d1322] border border-indigo-500/30 rounded-xl p-6 shadow-2xl shadow-indigo-950/50 flex flex-col gap-4 text-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/40">
              {getIcon()}
            </div>
            <h3 className="font-semibold text-base text-slate-100">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed py-1 font-sans">
          {message}
        </p>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-950/40"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};

export const ExportImportModal: React.FC<{
  isOpen: boolean;
  sessions: ChatSession[];
  onClose: () => void;
  onImport: (sessions: ChatSession[]) => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}> = ({ isOpen, sessions, onClose, onImport, onToast }) => {
  const [importJson, setImportJson] = useState('');
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const exportData = JSON.stringify(sessions, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportData);
      setCopied(true);
      onToast('Session logs copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onToast('Failed to copy to clipboard', 'error');
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wormxgpt_sessions_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onToast('Session logs exported as JSON file', 'success');
    } catch {
      onToast('Failed to export session logs', 'error');
    }
  };

  const handleImportSubmit = () => {
    try {
      if (!importJson.trim()) {
        onToast('Please paste valid JSON logs', 'error');
        return;
      }
      const parsed = JSON.parse(importJson);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
        onImport(parsed);
        onToast(`Successfully restored ${parsed.length} chat sessions`, 'success');
        onClose();
      } else {
        onToast('Invalid session format: expected array of chat sessions', 'error');
      }
    } catch {
      onToast('JSON parse error: check syntax of pasted logs', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#0d1322] border border-indigo-500/30 rounded-xl p-6 shadow-2xl shadow-indigo-950/50 flex flex-col gap-4 text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-base text-slate-100">Conversation Data Hub</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 p-1 bg-slate-900/80 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'export'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Export Logs ({sessions.length})
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'import'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Import Logs
          </button>
        </div>

        {activeTab === 'export' ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-slate-300">
              Export all stored threads, message histories, and reasoning traces in portable JSON format:
            </p>
            <div className="relative">
              <pre className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto">
                {exportData}
              </pre>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={handleCopy}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-950/40"
              >
                <Download className="w-3.5 h-3.5" />
                Download JSON
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-slate-300">
              Paste exported JSON session array below to restore threads:
            </p>
            <textarea
              value={importJson}
              onChange={e => setImportJson(e.target.value)}
              placeholder='[ { "id": "...", "title": "...", "messages": [...] } ]'
              rows={6}
              className="w-full p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImportSubmit}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-950/40"
              >
                <Upload className="w-3.5 h-3.5" />
                Restore Sessions
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const Toast: React.FC<{
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  isVisible: boolean;
  onClose: () => void;
}> = ({ message, type = 'success', isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const getTheme = () => {
    switch (type) {
      case 'error':
        return 'border-rose-500/40 bg-[#160b0f] text-rose-200 shadow-rose-950/40';
      case 'warning':
        return 'border-amber-500/40 bg-[#16120b] text-amber-200 shadow-amber-950/40';
      case 'info':
        return 'border-indigo-500/40 bg-[#0d1322] text-indigo-200 shadow-indigo-950/40';
      default:
        return 'border-emerald-500/40 bg-[#0b1612] text-emerald-200 shadow-emerald-950/40';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[2100] animate-in slide-in-from-top-2 fade-in duration-200">
      <div className={`border rounded-lg px-4 py-3 shadow-xl backdrop-blur-md flex items-center gap-3 text-xs font-medium ${getTheme()}`}>
        {type === 'error' ? (
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
        ) : type === 'warning' ? (
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        ) : type === 'info' ? (
          <Info className="w-4 h-4 text-indigo-400 shrink-0" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        )}
        <span>{message}</span>
        <button
          onClick={onClose}
          className="ml-2 opacity-60 hover:opacity-100 p-0.5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
