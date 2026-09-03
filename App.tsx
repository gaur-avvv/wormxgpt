import React, { useState, Suspense } from 'react';
import { WormGPTProvider, useWormGPT } from './context/GlobalContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { InputBar } from './components/InputBar';
import { SettingsModal } from './components/SettingsModal/SettingsModal';
import { ModelSelectorModal } from './components/ModelSelectorModal';
import { ActiveArsenalModal } from './components/ActiveArsenalModal';
import { ConfirmModal, ExportImportModal, Toast, AlertModal } from './components/Modals';
import { SETTINGS_KEY, SESSIONS_KEY } from './constants';

const WormGPTApp: React.FC = () => {
  const { 
    isSidebarOpen, setIsSidebarOpen,
    isSettingsOpen, setIsSettingsOpen,
    isArsenalOpen, setIsArsenalOpen,
    activeSession, sessions, setSessions,
    settings, setSettings,
    activeSessionId, setActiveSessionId,
    clearSessionBuffer, deleteSession, purgeAllSessions
  } = useWormGPT();

  // Custom Modal States (Replacing all window.alert and window.confirm)
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [modelSelectorTarget, setModelSelectorTarget] = useState<'text' | 'vision'>('text');
  const [isExportOpen, setIsExportOpen] = useState(false);
  
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ open: boolean; title: string; message: string; type?: 'info' | 'success' | 'warning' | 'error' }>({
    open: false,
    title: '',
    message: ''
  });

  const [toast, setToast] = useState<{ visible: boolean; message: string; type?: 'success' | 'error' | 'info' | 'warning' }>({ 
    visible: false, 
    message: '' 
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const handleNewSession = () => {
    const newSession = { 
      id: crypto.randomUUID(), 
      messages: [], 
      title: 'New Session', 
      timestamp: Date.now() 
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    showToast('New session created', 'info');
  };

  const handleOpenModelSelector = (mode: 'text' | 'vision' = 'text') => {
    setModelSelectorTarget(mode);
    setIsModelSelectorOpen(true);
  };

  const handleExecuteClear = () => {
    clearSessionBuffer(activeSession.id);
    setConfirmClearOpen(false);
    showToast('Conversation buffer purged & network streams disposed', 'info');
  };

  const handleExecuteReset = async () => {
    await purgeAllSessions();
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(SESSIONS_KEY);
    setConfirmResetOpen(false);
    showToast('Zero-trace purge complete. Resetting terminal...', 'warning');
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleImportSessions = (imported: typeof sessions) => {
    setSessions(imported);
    if (imported.length > 0) {
      setActiveSessionId(imported[0].id);
    }
  };

  return (
    <div className="flex h-screen bg-[#090d16] text-slate-100 font-sans overflow-hidden select-none">
      {/* Collapsible Sidebar */}
      <Sidebar 
        onNewSession={handleNewSession}
        onDeleteSession={async (id) => {
          await deleteSession(id);
          showToast('Session purged from device with zero trace', 'info');
        }}
        onClear={() => setConfirmClearOpen(true)}
        onHardReset={() => setConfirmResetOpen(true)}
        onExport={() => setIsExportOpen(true)}
      />

      {/* Main Workspace Area */}
      <main className={`flex-1 flex flex-col transition-all duration-300 h-full relative ${
        isSidebarOpen ? 'ml-16 sm:ml-72' : 'ml-16'
      }`}>
        <Header 
          fingerprint="DARK-PRIME-X"
          onNewSession={handleNewSession}
          activeAgentStatus={null}
          onOpenModelSelector={handleOpenModelSelector}
        />

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <ChatWindow onOpenModelSelector={handleOpenModelSelector} />
          <InputBar 
            suggestions={[
              'Perform an OSINT surface analysis',
              'Draft an automated penetration testing script',
              'Explain how neural network reasoning tokens work'
            ]}
            onOpenModelSelector={handleOpenModelSelector}
          />
        </div>

        {/* Dynamic Model Router & Selector Modal */}
        <ModelSelectorModal 
          isOpen={isModelSelectorOpen}
          onClose={() => setIsModelSelectorOpen(false)}
          targetMode={modelSelectorTarget}
        />

        {/* Active Arsenal (100 Remote HTTPS MCP Server Catalog) */}
        <ActiveArsenalModal 
          isOpen={isArsenalOpen}
          onClose={() => setIsArsenalOpen(false)}
        />

        {/* Settings & Model Harness Modal */}
        <Suspense fallback={null}>
          <SettingsModal 
            onOpenExport={() => setIsExportOpen(true)}
            onConfirmClear={() => setConfirmClearOpen(true)}
            onConfirmReset={() => setConfirmResetOpen(true)}
          />
        </Suspense>

        {/* Export / Import Sessions Modal */}
        <ExportImportModal 
          isOpen={isExportOpen}
          sessions={sessions}
          onClose={() => setIsExportOpen(false)}
          onImport={handleImportSessions}
          onToast={showToast}
        />

        {/* Custom Themed Confirm Modals */}
        <ConfirmModal 
          isOpen={confirmClearOpen}
          title="Clear Conversation Buffer?"
          message="This will wipe all messages in the active thread. The session itself will remain active."
          confirmLabel="Clear Buffer"
          onConfirm={handleExecuteClear}
          onCancel={() => setConfirmClearOpen(false)}
        />

        <ConfirmModal 
          isOpen={confirmResetOpen}
          title="Hard Reset All Settings and Sessions?"
          message="This will permanently delete all conversation history, custom API keys, and configuration preferences from your browser local storage."
          confirmLabel="Reset Everything"
          isDanger={true}
          onConfirm={handleExecuteReset}
          onCancel={() => setConfirmResetOpen(false)}
        />

        {/* Alert Modal */}
        <AlertModal 
          isOpen={alertInfo.open}
          title={alertInfo.title}
          message={alertInfo.message}
          type={alertInfo.type}
          onClose={() => setAlertInfo(prev => ({ ...prev, open: false }))}
        />

        {/* Toast Feedback */}
        <Toast 
          isVisible={toast.visible} 
          message={toast.message} 
          type={toast.type}
          onClose={() => setToast(prev => ({ ...prev, visible: false }))} 
        />
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <WormGPTProvider>
      <WormGPTApp />
    </WormGPTProvider>
  );
};

export default App;
