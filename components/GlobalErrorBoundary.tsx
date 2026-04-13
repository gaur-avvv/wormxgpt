import React, { Component, ErrorInfo } from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Global Error Boundary] Caught fatal error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRestart = () => {
    localStorage.clear();
    window.location.reload();
  };

  handleRecover = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/95 text-red-500 font-mono p-4">
          <div className="border border-red-600/50 bg-[#0a0505] p-6 max-w-2xl w-full rounded-xl shadow-[0_0_50px_rgba(220,38,38,0.3)]">
            <h1 className="text-2xl font-black mb-2 animate-pulse tracking-widest text-red-600">FATAL_INTERFACE_CRASH</h1>
            <p className="text-xs mb-4 text-zinc-400">The WormGPT environment encountered an unrecoverable exception.</p>
            
            <div className="bg-black border border-red-900/30 p-3 rounded mb-4 overflow-auto max-h-48 text-[10px]">
              <div className="font-bold text-red-400">{this.state.error && this.state.error.toString()}</div>
              <pre className="text-zinc-600 mt-2">{this.state.errorInfo?.componentStack}</pre>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={this.handleRecover}
                className="flex-1 py-2 bg-zinc-900 text-red-500 border border-red-900/50 rounded hover:bg-zinc-800 transition-colors uppercase text-xs font-bold tracking-wider"
              >
                Attempt Recovery
              </button>
              <button 
                onClick={this.handleRestart}
                className="flex-1 py-2 bg-red-600 text-black rounded hover:bg-red-500 transition-colors uppercase text-xs font-black tracking-wider shadow-[0_0_15px_rgba(220,38,38,0.5)]"
              >
                Purge & Reboot
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
