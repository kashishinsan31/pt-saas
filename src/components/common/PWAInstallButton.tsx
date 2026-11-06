import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { InstallAppModal } from './InstallAppModal';
import { Download, Smartphone, Check } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'sidebar' | 'banner' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'header',
}) => {
  const { isInstalled, isIOS, isAndroid } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // If already running as an installed PWA on home screen, display subtle installed indicator or hide
  if (isInstalled) {
    if (variant === 'compact') return null;
    return (
      <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold ${className}`}>
        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span className="hidden sm:inline">App Installed</span>
      </div>
    );
  }

  return (
    <>
      {variant === 'header' && (
        <button
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer ${className}`}
          title="Install Web App on Android or iOS"
        >
          <Download className="w-3.5 h-3.5 animate-bounce shrink-0" />
          <span className="hidden sm:inline">Install App</span>
          <span className="sm:hidden">Install</span>
        </button>
      )}

      {variant === 'sidebar' && (
        <button
          onClick={() => setIsModalOpen(true)}
          className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/80 transition-colors cursor-pointer ${className}`}
        >
          <div className="p-1 rounded-lg bg-blue-600 text-white">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <div className="text-slate-900 font-extrabold truncate">Install App</div>
            <div className="text-[10px] text-blue-700 font-medium truncate">Android & iOS Home Screen</div>
          </div>
          <Download className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        </button>
      )}

      {variant === 'banner' && (
        <div className={`p-4 rounded-2xl bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white shadow-md flex items-center justify-between gap-3 ${className}`}>
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="font-extrabold text-sm truncate">Install Waiter Walk on Android & iOS</h4>
              <p className="text-xs text-blue-200 truncate">Add to your home screen for fast fullscreen training management.</p>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-sm shrink-0 transition-colors cursor-pointer flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
        </div>
      )}

      {variant === 'compact' && (
        <button
          onClick={() => setIsModalOpen(true)}
          className={`p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer ${className}`}
          title="Install Web App on Android or iOS"
        >
          <Download className="w-4 h-4 text-blue-600" />
        </button>
      )}

      <InstallAppModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
