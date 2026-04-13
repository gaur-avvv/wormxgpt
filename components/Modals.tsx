import React, { useEffect } from 'react';

export const ConfirmModal: React.FC<{
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fadeIn">
      <div className="bg-zinc-950 border-2 border-red-900 rounded p-6 max-w-md w-full mx-4 shadow-[0_0_30px_rgba(220,38,38,0.4)] animate-slideUp">
        <div className="text-red-600 text-sm font-mono mb-6 text-center break-words uppercase tracking-widest">{message}</div>
        <div className="flex gap-3 justify-center">
          <button onClick={onConfirm} className="px-6 py-2 bg-red-600 text-black hover:bg-red-500 transition-all rounded uppercase text-xs font-black tracking-widest">OK</button>
          <button onClick={onCancel} className="px-6 py-2 bg-zinc-800 text-red-600 hover:bg-zinc-700 transition-all rounded uppercase text-xs font-black tracking-widest border border-red-900/50">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export const Toast: React.FC<{
  message: string;
  isVisible: boolean;
  onClose: () => void;
}> = ({ message, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 2000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;
  return (
    <div className="fixed top-4 right-4 z-[2000] animate-slideInRight">
      <div className="bg-zinc-950 border-2 border-green-600 rounded p-4 shadow-[0_0_20px_rgba(34,197,94,0.4)] flex items-center gap-3">
        <span className="text-green-500 text-[10px] font-black font-mono">OK</span>
        <span className="text-green-400 text-sm font-mono uppercase tracking-widest">{message}</span>
      </div>
    </div>
  );
};

export const ImagePopup: React.FC<{
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
}> = ({ isOpen, imageSrc, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-fadeIn" onClick={onClose}>
      <div className="relative max-w-[90vw] max-h-[90vh] animate-slideUp" onClick={e => e.stopPropagation()}>
        <div className="p-1 rounded-2xl bg-gradient-to-r from-red-600 via-red-900 to-red-600 shadow-[0_0_50px_rgba(220,38,38,0.5)]">
          <div className="bg-black rounded-xl overflow-hidden">
            <img src={imageSrc} alt="Preview" className="max-w-full max-h-[75vh] object-contain" />
          </div>
        </div>
        <button onClick={onClose} className="mt-4 w-full py-3 bg-red-600 text-black font-black uppercase text-xs tracking-widest rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.3)]">CLOSE_PREVIEW</button>
      </div>
    </div>
  );
};
