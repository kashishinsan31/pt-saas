import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import {
  Download,
  Smartphone,
  Share2,
  PlusSquare,
  CheckCircle2,
  X,
  Sparkles,
  Zap,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [selectedTab, setSelectedTab] = useState<'android' | 'ios'>(isIOS ? 'ios' : 'android');
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const handleTriggerInstall = async () => {
    setIsInstalling(true);
    const success = await install();
    setIsInstalling(false);
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header with App Branding */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white p-5 sm:p-6 flex items-start justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center space-x-3.5 relative z-10">
            <div className="w-13 h-13 rounded-2xl bg-white p-0.5 shadow-md shrink-0 flex items-center justify-center">
              <img src="/logo.png" alt="Waiter Walk" className="w-11 h-11 object-contain" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/20 tracking-wider">
                  Native PWA App
                </span>
                <span className="text-[11px] text-slate-400">&bull; Dubai</span>
              </div>
              <h3 className="text-lg font-black tracking-tight mt-1">Install Waiter Walk</h3>
              <p className="text-xs text-slate-300">Fast 1-tap access on Android & iOS Home Screen</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors shrink-0"
            aria-label="Close install modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Operating System Selector Tabs */}
        <div className="bg-slate-50 p-2 border-b border-slate-200 flex space-x-1">
          <button
            type="button"
            onClick={() => setSelectedTab('android')}
            className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
              selectedTab === 'android'
                ? 'bg-white text-slate-950 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>Android (Chrome)</span>
            {isAndroid && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('ios')}
            className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
              selectedTab === 'ios'
                ? 'bg-white text-slate-950 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Smartphone className="w-4 h-4 text-blue-600" />
            <span>iOS (iPhone & iPad)</span>
            {isIOS && (
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            )}
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Status if already running in standalone mode */}
          {isInstalled && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-3 text-xs text-emerald-800 font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>You are currently running the Waiter Walk installed web app in standalone mode!</span>
            </div>
          )}

          {/* Success banner after prompt accepted */}
          {installSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-3 text-xs text-emerald-800 font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Installation accepted! Waiter Walk is being added to your Home Screen.</span>
            </div>
          )}

          {/* ANDROID TAB CONTENT */}
          {selectedTab === 'android' && (
            <div className="space-y-4">
              {/* Direct 1-Click Install Button if supported */}
              {isInstallable ? (
                <div className="bg-gradient-to-br from-emerald-50 to-blue-50 p-4 rounded-2xl border border-emerald-200 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                    <Download className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">One-Click Android Installation</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Tap below to add Waiter Walk directly to your apps screen with no app store download required.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleTriggerInstall}
                    disabled={isInstalling}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-sm shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isInstalling ? 'Opening Installer...' : 'Install on Android Device'}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                        1
                      </span>
                      <span>Tap Chrome Menu (⋮)</span>
                    </div>
                    <p className="text-xs text-slate-600 pl-8 leading-relaxed">
                      In Google Chrome on your Android phone, tap the <strong>three vertical dots (⋮)</strong> menu in the upper right corner.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                        2
                      </span>
                      <span>Tap "Install app" or "Add to Home screen"</span>
                    </div>
                    <p className="text-xs text-slate-600 pl-8 leading-relaxed">
                      Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong> from the dropdown menu to place the Waiter Walk icon onto your launcher.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* IOS TAB CONTENT */}
          {selectedTab === 'ios' && (
            <div className="space-y-3">
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 text-xs space-y-2">
                <div className="font-extrabold text-blue-950 flex items-center space-x-2">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  <span>iPhone & iPad Safari Setup (3 Simple Steps)</span>
                </div>
                <p className="text-blue-900 leading-relaxed text-[11px]">
                  Apple iOS allows web app installation directly from Safari into a native fullscreen app container.
                </p>
              </div>

              {/* Step 1 */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start space-x-3">
                <div className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  1
                </div>
                <div className="text-xs space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Tap the Safari Share Button</span>
                    <span className="p-1 rounded-md bg-white border border-slate-200 text-blue-600">
                      <Share2 className="w-3.5 h-3.5 inline" />
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    At the bottom (or top) of your Safari browser bar, tap the square icon with an arrow pointing up.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start space-x-3">
                <div className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  2
                </div>
                <div className="text-xs space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Select "Add to Home Screen"</span>
                    <span className="p-1 rounded-md bg-white border border-slate-200 text-slate-700">
                      <PlusSquare className="w-3.5 h-3.5 inline" />
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Scroll down through the share options menu and tap <strong>"Add to Home Screen"</strong>.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start space-x-3">
                <div className="w-7 h-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  3
                </div>
                <div className="text-xs space-y-1">
                  <div className="font-bold text-slate-900">Tap "Add" in Upper Right</div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Confirm the name <strong>"WaiterWalk"</strong> and tap <strong>Add</strong>. The icon will be installed right on your home screen!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Key Advantages of Installed App */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-2">
              Why Install Waiter Walk App?
            </span>
            <div className="grid grid-cols-3 gap-2 text-center text-slate-700 text-[11px]">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <Zap className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                <span className="font-bold block text-slate-900">Instant</span>
                <span className="text-[10px] text-slate-500">Fast 1-tap open</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <Smartphone className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                <span className="font-bold block text-slate-900">Fullscreen</span>
                <span className="text-[10px] text-slate-500">No browser bar</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                <span className="font-bold block text-slate-900">Secure</span>
                <span className="text-[10px] text-slate-500">Safe UAE storage</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            Asia/Dubai GST &bull; v2026.1
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs transition-colors"
          >
            Got it, Close
          </button>
        </div>
      </div>
    </div>
  );
};
