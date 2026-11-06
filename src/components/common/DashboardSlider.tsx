import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Calendar,
  CreditCard,
  ShieldCheck,
  Dumbbell,
  ArrowRight,
  Clock,
  Zap,
  TrendingUp,
  Edit3,
  X,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  Palette,
  Sliders,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DashboardSlide } from '../../types';

interface DashboardSliderProps {
  onActionClick?: (tab: string) => void;
}

const GRADIENT_PRESETS = [
  { id: 'from-blue-900 via-indigo-950 to-slate-900', label: 'Deep Ocean Blue' },
  { id: 'from-emerald-950 via-slate-900 to-teal-950', label: 'Emerald Forest' },
  { id: 'from-amber-950 via-slate-900 to-orange-950', label: 'Sunset Amber' },
  { id: 'from-purple-950 via-slate-900 to-indigo-950', label: 'Royal Purple' },
  { id: 'from-rose-950 via-slate-900 to-red-950', label: 'Ruby Red' },
  { id: 'from-slate-900 via-slate-800 to-zinc-950', label: 'Midnight Steel' },
];

const BADGE_COLOR_PRESETS = [
  { id: 'bg-blue-500/20 text-blue-300 border-blue-400/30', label: 'Blue' },
  { id: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30', label: 'Emerald' },
  { id: 'bg-amber-500/20 text-amber-300 border-amber-400/30', label: 'Amber' },
  { id: 'bg-purple-500/20 text-purple-300 border-purple-400/30', label: 'Purple' },
  { id: 'bg-rose-500/20 text-rose-300 border-rose-400/30', label: 'Rose' },
];

const TAB_OPTIONS = [
  { id: 'dashboard', label: 'Dashboard Overview' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'sessions', label: 'Sessions Schedule' },
  { id: 'clients', label: 'Clients Directory' },
  { id: 'trainers', label: 'Trainer Team' },
  { id: 'packages', label: 'Packages & Billing' },
  { id: 'payments', label: 'Payments & Receipts' },
  { id: 'subscriptions', label: 'Subscriptions (Auto-Pay)' },
  { id: 'credits', label: 'Session Credits' },
  { id: 'reports', label: 'Reports & Analytics' },
  { id: 'settings', label: 'System Settings' },
  { id: 'tests', label: 'System Test Suite' },
];

export const DashboardSlider: React.FC<DashboardSliderProps> = ({ onActionClick }) => {
  const {
    currentUser,
    slides,
    updateSlide,
    addSlide,
    deleteSlide,
    resetSlidesToDefault,
  } = useApp();

  const isAdmin = currentUser?.role === 'admin';

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Admin Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSlideId, setSelectedSlideId] = useState<string>('');
  const [editForm, setEditForm] = useState<Partial<DashboardSlide>>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Safeguard: ensure currentSlide is within bounds
  useEffect(() => {
    if (slides.length === 0) return;
    if (currentSlide >= slides.length) {
      setCurrentSlide(0);
    }
  }, [slides.length, currentSlide]);

  // Auto-advance slider every 5 seconds when not paused and modal closed
  useEffect(() => {
    if (isPaused || isEditModalOpen || slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused, isEditModalOpen, slides.length]);

  const handlePrev = () => {
    if (slides.length <= 1) return;
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    if (slides.length <= 1) return;
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  // Touch Swipe handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) {
      handleNext();
    } else if (distance < -50) {
      handlePrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Open Edit Modal for a specific slide or first slide
  const handleOpenEditModal = (slideId?: string) => {
    const targetId = slideId || slides[currentSlide]?.id || slides[0]?.id;
    const target = slides.find((s) => s.id === targetId) || slides[0];
    if (target) {
      setSelectedSlideId(target.id);
      setEditForm({ ...target });
    }
    setSaveSuccessMsg('');
    setIsEditModalOpen(true);
  };

  const handleSelectSlideToEdit = (slideId: string) => {
    const target = slides.find((s) => s.id === slideId);
    if (target) {
      setSelectedSlideId(target.id);
      setEditForm({ ...target });
      setSaveSuccessMsg('');
    }
  };

  const handleSaveSlideChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlideId) return;
    updateSlide(selectedSlideId, editForm);
    setSaveSuccessMsg('Slide updated successfully!');
    setTimeout(() => setSaveSuccessMsg(''), 2500);
  };

  const handleAddNewSlide = () => {
    const newSlide = addSlide({
      badge: 'SPECIAL ANNOUNCEMENT',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
      title: 'New Fitness Initiative',
      subtitle: 'Exclusive Member Highlight',
      description: 'Personalized training sessions designed for athletic conditioning, fat loss, and strength progression.',
      gradient: 'from-blue-900 via-indigo-950 to-slate-900',
      actionText: 'Learn More',
      actionTab: 'packages',
      statLabel: 'VIP Promotion',
      statValue: 'Active',
    });
    setSelectedSlideId(newSlide.id);
    setEditForm({ ...newSlide });
    setSaveSuccessMsg('New slide created!');
    setTimeout(() => setSaveSuccessMsg(''), 2500);
  };

  const handleDeleteCurrentSlide = (id: string) => {
    if (slides.length <= 1) {
      alert('You must keep at least one slide in the dashboard carousel.');
      return;
    }
    deleteSlide(id);
    const remaining = slides.filter((s) => s.id !== id);
    if (remaining.length > 0) {
      setSelectedSlideId(remaining[0].id);
      setEditForm({ ...remaining[0] });
    }
  };

  if (!slides || slides.length === 0) {
    return null;
  }

  const activeSlide = slides[currentSlide] || slides[0];
  const gradientClass = activeSlide.gradient || 'from-blue-900 via-indigo-950 to-slate-900';
  const badgeColorClass = activeSlide.badgeColor || 'bg-blue-500/20 text-blue-300 border-blue-400/30';

  return (
    <>
      <div
        className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-800/80 select-none group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background Gradient & Ambient Glow */}
        <div className={`bg-gradient-to-br ${gradientClass} text-white p-6 sm:p-8 transition-all duration-500 min-h-[220px] sm:min-h-[240px] flex flex-col justify-between relative`}>
          {/* Subtle decorative glow circles */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-1/3 -mb-8 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>

          {/* Top Header inside Slide */}
          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className={`text-[10px] sm:text-xs font-extrabold px-3 py-0.5 rounded-full border ${badgeColorClass}`}>
                  {activeSlide.badge}
                </span>
                {activeSlide.subtitle && (
                  <span className="text-[11px] text-slate-300 font-medium">
                    {activeSlide.subtitle}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white mt-1">
                {activeSlide.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-lg line-clamp-2 sm:line-clamp-none">
                {activeSlide.description}
              </p>
            </div>

            {/* Right Header Area: Admin Edit Button + Quick Stat */}
            <div className="flex flex-col items-end space-y-2 shrink-0">
              {/* ADMIN-ONLY EDIT SLIDER BUTTON */}
              {isAdmin && (
                <button
                  onClick={() => handleOpenEditModal(activeSlide.id)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-bold transition-all border border-white/20 shadow-sm cursor-pointer"
                  title="Edit dashboard slider content (Admin Only)"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                  <span>Edit Slider</span>
                </button>
              )}

              {/* Quick Stat Pill */}
              {activeSlide.statValue && (
                <div className="hidden sm:flex flex-col items-end bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 shrink-0">
                  <span className="text-[10px] text-slate-300 font-medium uppercase tracking-wider">
                    {activeSlide.statLabel || 'Status'}
                  </span>
                  <span className="text-base font-black text-white mt-0.5">
                    {activeSlide.statValue}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Bar: Action button + Navigation & Pagination dots */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10 relative z-10 flex-wrap gap-3">
            {/* Action CTA Button */}
            <button
              onClick={() => {
                if (activeSlide.actionTab && onActionClick) {
                  onActionClick(activeSlide.actionTab);
                }
              }}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-extrabold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <span>{activeSlide.actionText || 'Explore'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-900" />
            </button>

            {/* Controls: Left/Right arrows + Indicators */}
            <div className="flex items-center space-x-3">
              {/* Dots */}
              <div className="flex items-center space-x-1.5">
                {slides.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      idx === currentSlide
                        ? 'w-6 bg-white'
                        : 'w-2 bg-white/30 hover:bg-white/60'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Arrows */}
              <div className="flex items-center space-x-1 pl-2">
                <button
                  onClick={handlePrev}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
                  aria-label="Previous Slide"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNext}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
                  aria-label="Next Slide"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ADMIN-ONLY SLIDER EDIT MODAL */}
      {isAdmin && isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-600/30 rounded-2xl border border-blue-500/40 text-blue-400">
                  <Sliders className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-bold text-white tracking-tight">Slider Management</h2>
                    <span className="bg-purple-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Admin Only
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Customize titles, descriptions, CTA buttons, and color themes for the dashboard slider
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Slide Selector Pills & Action Bar */}
            <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between overflow-x-auto gap-2 shrink-0">
              <div className="flex items-center space-x-1.5 overflow-x-auto">
                {slides.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSlideToEdit(s.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      s.id === selectedSlideId
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    Slide {idx + 1}: {s.badge.slice(0, 15)}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={handleAddNewSlide}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all cursor-pointer"
                  title="Add new slide to carousel"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Slide</span>
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Reset all slides to factory default content?')) {
                      resetSlidesToDefault();
                      setIsEditModalOpen(false);
                    }
                  }}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-600 hover:bg-slate-200 border border-slate-300 transition-all cursor-pointer"
                  title="Reset to default slides"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              </div>
            </div>

            {/* Slide Edit Form */}
            <form onSubmit={handleSaveSlideChanges} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {saveSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {/* Title & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Slide Badge
                  </label>
                  <input
                    type="text"
                    value={editForm.badge || ''}
                    onChange={(e) => setEditForm({ ...editForm, badge: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    placeholder="e.g. WAITER WALK PTMS"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Badge Color Theme
                  </label>
                  <select
                    value={editForm.badgeColor || BADGE_COLOR_PRESETS[0].id}
                    onChange={(e) => setEditForm({ ...editForm, badgeColor: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    {BADGE_COLOR_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Main Headline */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Main Headline / Title
                </label>
                <input
                  type="text"
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  placeholder="e.g. Dubai Personal Training Operations"
                  required
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Subtitle / Region Tag
                </label>
                <input
                  type="text"
                  value={editForm.subtitle || ''}
                  onChange={(e) => setEditForm({ ...editForm, subtitle: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Asia/Dubai GST • 30-Day Package Cycle"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description Text
                </label>
                <textarea
                  rows={3}
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                  placeholder="Slide promotional or informative message..."
                  required
                />
              </div>

              {/* Gradient Style Background */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Background Gradient Theme
                </label>
                <select
                  value={editForm.gradient || GRADIENT_PRESETS[0].id}
                  onChange={(e) => setEditForm({ ...editForm, gradient: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                >
                  {GRADIENT_PRESETS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Button & Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Action Button Label
                  </label>
                  <input
                    type="text"
                    value={editForm.actionText || ''}
                    onChange={(e) => setEditForm({ ...editForm, actionText: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    placeholder="e.g. View Calendar"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Navigation Destination Tab
                  </label>
                  <select
                    value={editForm.actionTab || 'calendar'}
                    onChange={(e) => setEditForm({ ...editForm, actionTab: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    {TAB_OPTIONS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stat Pill */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Stat Label (Optional)
                  </label>
                  <input
                    type="text"
                    value={editForm.statLabel || ''}
                    onChange={(e) => setEditForm({ ...editForm, statLabel: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Active Bookings"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Stat Value (Optional)
                  </label>
                  <input
                    type="text"
                    value={editForm.statValue || ''}
                    onChange={(e) => setEditForm({ ...editForm, statValue: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 14 Sessions"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                {slides.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCurrentSlide(selectedSlideId)}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Slide</span>
                  </button>
                )}

                <div className="flex items-center space-x-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
