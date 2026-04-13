import React, { useState, useEffect, Suspense } from 'react';
import { WormGPTProvider, useWormGPT } from './context/GlobalContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { InputBar } from './components/InputBar';
import { SettingsModal } from './components/SettingsModal/SettingsModal';
import { ConfirmModal, Toast } from './components/Modals';

// Global styles (inherited from legacy)

const WormGPTApp: React.FC = () => {
  const { 
    isSidebarOpen, setIsSidebarOpen,
    isSettingsOpen, setIsSettingsOpen,
    activeSession, setSessions,
    settings, setSettings,
    handleSend
  } = useWormGPT();


  // Legacy layout states (migrating...)
  const [showAppsPage, setShowAppsPage] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });

  const handleNewSession = () => {
    const newSession = { id: crypto.randomUUID(), messages: [], title: 'NEW_SESSION', timestamp: Date.now() };
    setSessions(prev => [newSession, ...prev]);
  };

  return (
    <div className="flex h-screen bg-[#050000] text-red-500 font-mono overflow-hidden">
      <Sidebar 
        onNewSession={handleNewSession}
        onDeleteSession={(id) => setSessions(prev => prev.filter(s => s.id !== id))}
        onClear={() => setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, messages: [] } : s))}
        onHardReset={() => { if(confirm('RESET ALL?')) { localStorage.clear(); window.location.reload(); } }}
        onExport={() => alert('EXPORT_NOT_READY')}
      />

      <main className={`flex-1 flex flex-col transition-all duration-500 h-full relative ${isSidebarOpen ? 'ml-0 sm:ml-72' : 'ml-16'}`}>
        <Header 
          fingerprint="DARK-PRIME-X"
          onNewSession={handleNewSession}
          activeAgentStatus={null}
          showAppsPage={showAppsPage}
          setShowAppsPage={setShowAppsPage}
        />

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <ChatWindow />
          <InputBar 
            onFileSelect={() => {}} 
            suggestions={['Explain the Matrix', 'Cybersecurity Audit', 'System Status']} 
          />
        </div>

        <Suspense fallback={null}>
          <SettingsModal />
        </Suspense>

        <Toast 
          isVisible={toast.visible} 
          message={toast.message} 
          onClose={() => setToast({ visible: false, message: '' })} 
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
