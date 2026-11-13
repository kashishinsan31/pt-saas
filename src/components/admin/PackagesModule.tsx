import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PackageDefinition, PromoCode } from '../../types';
import { formatAED, formatDubaiDate, calculateExpiryDate, getDaysRemaining } from '../../utils/dubaiTime';
import {
  Package,
  Plus,
  Edit2,
  X,
  ShoppingBag,
  Search,
  CheckCircle,
  CreditCard,
  User,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Tag,
  Percent,
  Calendar,
  CalendarDays,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  Layers,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
} from 'lucide-react';

export const PackagesModule: React.FC = () => {
  const {
    packageDefinitions,
    clients,
    trainers,
    savePackageDefinition,
    createDuePackage,
    purchasePackage,
    promoCodes,
    addPromoCode,
    updatePromoCode,
    deletePromoCode,
    togglePromoCodeStatus,
    validatePromoCode,
  } = useApp();

  // Top Module Tab: 'packages' | 'promos'
  const [activeModuleTab, setActiveModuleTab] = useState<'packages' | 'promos'>('packages');

  // Package Definition Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPkgDef, setSelectedPkgDef] = useState<PackageDefinition | null>(null);

  // Allocate Package Modal State
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [allocationMode, setAllocationMode] = useState<'DUE' | 'INSTANT_ADMIN'>('DUE');
  const [adminPaymentMethod, setAdminPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Card'>('Cash');
  const [allocPromoCode, setAllocPromoCode] = useState('');
  const [allocPromoFeedback, setAllocPromoFeedback] = useState<{ discountAED: number; text: string; error?: boolean } | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Form State for edit package definition
  const [formData, setFormData] = useState<PackageDefinition>({
    id: '',
    name: '',
    sessionCount: 12,
    priceAED: 1200,
    validityDays: 30,
    sessionDurationMinutes: 60,
    trainingFrequency: '3x per week',
    description: '',
    status: 'Active',
  });

  // Promo Code Management State
  const [promoSearchQuery, setPromoSearchQuery] = useState('');
  const [promoStatusFilter, setPromoStatusFilter] = useState<'ALL' | 'Active' | 'Inactive' | 'Expired'>('ALL');
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [promoNotice, setPromoNotice] = useState<string>('');

  const todayStr = formatDubaiDate(new Date());

  // Promo Code Form State
  const [promoForm, setPromoForm] = useState({
    code: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 15,
    validFrom: todayStr,
    validUntil: calculateExpiryDate(todayStr, 60),
    maxUses: '' as number | '',
    minOrderAmountAED: '' as number | '',
    status: 'Active' as 'Active' | 'Inactive',
  });

  // Open Edit Package Definition
  const openEdit = (e: React.MouseEvent, pkg: PackageDefinition) => {
    e.stopPropagation();
    setSelectedPkgDef(pkg);
    setFormData({ ...pkg });
    setIsEditModalOpen(true);
  };

  // Open Allocate Modal
  const openAllocate = (pkg: PackageDefinition) => {
    setSelectedPkgDef(pkg);
    setClientSearchQuery('');
    setSelectedClientId(clients[0]?.id || '');
    setAllocationMode('DUE');
    setAllocPromoCode('');
    setAllocPromoFeedback(null);
    setFeedbackMessage('');
    setIsAllocateModalOpen(true);
  };

  const handleSavePackage = (e: React.FormEvent) => {
    e.preventDefault();
    savePackageDefinition({
      ...formData,
      id: formData.id || `PKG-DEF-${Date.now()}`,
    });
    setIsEditModalOpen(false);
  };

  const filteredClients = clients.filter((c) => {
    const q = clientSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      c.fullName.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.whatsappNumber.toLowerCase().includes(q) ||
      c.communityName.toLowerCase().includes(q)
    );
  });

  const handleApplyAllocPromo = () => {
    if (!allocPromoCode.trim() || !selectedPkgDef) return;
    const res = validatePromoCode(allocPromoCode.trim(), selectedPkgDef.priceAED, selectedPkgDef.id);
    if (res.isValid) {
      setAllocPromoFeedback({
        discountAED: res.discountAmountAED,
        text: `Promo applied: ${res.discountPercent ? `${res.discountPercent}% Off` : ''} (-${formatAED(res.discountAmountAED)})`,
        error: false,
      });
    } else {
      setAllocPromoFeedback({
        discountAED: 0,
        text: res.errorMessage || 'Invalid promo code',
        error: true,
      });
    }
  };

  const handleConfirmAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkgDef || !selectedClientId) return;

    const discountAmount = allocPromoFeedback && !allocPromoFeedback.error ? allocPromoFeedback.discountAED : 0;
    const basePrice = selectedPkgDef.priceAED;
    const subtotal = Math.max(0, basePrice - discountAmount);
    const vatAmount = Math.round(subtotal * 0.05 * 100) / 100;
    const totalPayable = Math.round((subtotal + vatAmount) * 100) / 100;

    if (allocationMode === 'DUE') {
      const res = createDuePackage(selectedClientId, selectedPkgDef.id, {
        discountInfo: {
          discountCode: allocPromoFeedback && !allocPromoFeedback.error ? allocPromoCode.trim().toUpperCase() : undefined,
          discountAmountAED: discountAmount,
          vatAmountAED: vatAmount,
          totalAmountAED: totalPayable,
        },
      });
      if (res.success) {
        setFeedbackMessage(res.message);
        setTimeout(() => {
          setIsAllocateModalOpen(false);
          setFeedbackMessage('');
        }, 1800);
      }
    } else {
      const res = purchasePackage(
        selectedClientId,
        selectedPkgDef.id,
        adminPaymentMethod,
        false,
        undefined,
        false,
        undefined,
        {
          discountCode: allocPromoFeedback && !allocPromoFeedback.error ? allocPromoCode.trim().toUpperCase() : undefined,
          discountAmountAED: discountAmount,
          vatAmountAED: vatAmount,
          totalAmountAED: totalPayable,
        }
      );
      if (res.success) {
        setFeedbackMessage(
          `Package activated immediately for ${clients.find((c) => c.id === selectedClientId)?.fullName}! Paid AED ${totalPayable} (Base AED ${basePrice} + 5% VAT AED ${vatAmount}) via ${adminPaymentMethod}.`
        );
        setTimeout(() => {
          setIsAllocateModalOpen(false);
          setFeedbackMessage('');
        }, 1800);
      }
    }
  };

  // Promo Code Modal Handlers
  const openCreatePromoModal = () => {
    setEditingPromoId(null);
    setPromoForm({
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: 15,
      validFrom: todayStr,
      validUntil: calculateExpiryDate(todayStr, 60),
      maxUses: '',
      minOrderAmountAED: '',
      status: 'Active',
    });
    setIsPromoModalOpen(true);
  };

  const openEditPromoModal = (promo: PromoCode) => {
    setEditingPromoId(promo.id);
    setPromoForm({
      code: promo.code,
      description: promo.description || '',
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      validFrom: promo.validFrom,
      validUntil: promo.validUntil,
      maxUses: promo.maxUses !== undefined ? promo.maxUses : '',
      minOrderAmountAED: promo.minOrderAmountAED !== undefined ? promo.minOrderAmountAED : '',
      status: promo.status === 'Expired' ? 'Active' : promo.status,
    });
    setIsPromoModalOpen(true);
  };

  const handleSavePromo = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = promoForm.code.trim().toUpperCase();
    if (!cleanCode) return;

    if (editingPromoId) {
      updatePromoCode(editingPromoId, {
        code: cleanCode,
        description: promoForm.description.trim(),
        discountType: promoForm.discountType,
        discountValue: Number(promoForm.discountValue) || 10,
        validFrom: promoForm.validFrom,
        validUntil: promoForm.validUntil,
        maxUses: promoForm.maxUses !== '' ? Number(promoForm.maxUses) : undefined,
        minOrderAmountAED: promoForm.minOrderAmountAED !== '' ? Number(promoForm.minOrderAmountAED) : undefined,
        status: promoForm.status,
      });
      setPromoNotice(`Promo code "${cleanCode}" updated successfully.`);
    } else {
      addPromoCode({
        code: cleanCode,
        description: promoForm.description.trim(),
        discountType: promoForm.discountType,
        discountValue: Number(promoForm.discountValue) || 10,
        validFrom: promoForm.validFrom,
        validUntil: promoForm.validUntil,
        maxUses: promoForm.maxUses !== '' ? Number(promoForm.maxUses) : undefined,
        minOrderAmountAED: promoForm.minOrderAmountAED !== '' ? Number(promoForm.minOrderAmountAED) : undefined,
        status: promoForm.status,
      });
      setPromoNotice(`Promo code "${cleanCode}" created and activated.`);
    }

    setIsPromoModalOpen(false);
    setTimeout(() => setPromoNotice(''), 3500);
  };

  const handleCopyPromo = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Filtered Promo Codes
  const filteredPromos = promoCodes.filter((p) => {
    const q = promoSearchQuery.trim().toLowerCase();
    const matchesQuery = !q || p.code.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q));

    const isDateExpired = p.validUntil < todayStr;
    const isUsesExpired = Boolean(p.maxUses && p.currentUses >= p.maxUses);
    const effectiveStatus = (isDateExpired || isUsesExpired || p.status === 'Expired') ? 'Expired' : p.status;

    if (promoStatusFilter === 'ALL') return matchesQuery;
    if (promoStatusFilter === 'Expired') return matchesQuery && effectiveStatus === 'Expired';
    if (promoStatusFilter === 'Active') return matchesQuery && effectiveStatus === 'Active';
    if (promoStatusFilter === 'Inactive') return matchesQuery && effectiveStatus === 'Inactive';
    return matchesQuery;
  });

  const activePromosCount = promoCodes.filter((p) => {
    const isExpired = p.validUntil < todayStr || (p.maxUses ? p.currentUses >= p.maxUses : false);
    return p.status === 'Active' && !isExpired;
  }).length;

  const totalRedemptions = promoCodes.reduce((sum, p) => sum + p.currentUses, 0);

  return (
    <div className="space-y-6">
      {/* Top Module Sub-Navigation Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveModuleTab('packages')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeModuleTab === 'packages'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4 text-blue-600" />
            <span>Service Packages ({packageDefinitions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModuleTab('promos')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeModuleTab === 'promos'
                ? 'bg-white text-purple-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="w-4 h-4 text-purple-600" />
            <span>Promo & Discount Codes</span>
            <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 text-[10px] rounded-full font-black">
              {activePromosCount} Active
            </span>
          </button>
        </div>

        {activeModuleTab === 'packages' ? (
          <button
            type="button"
            onClick={() => {
              setFormData({
                id: '',
                name: 'Custom Package',
                sessionCount: 10,
                priceAED: 1100,
                validityDays: 30,
                sessionDurationMinutes: 60,
                trainingFrequency: '2x per week',
                description: 'Customized personal training package',
                status: 'Active',
              });
              setSelectedPkgDef(null);
              setIsEditModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center space-x-2 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Package</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={openCreatePromoModal}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center space-x-2 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Promo Code</span>
          </button>
        )}
      </div>

      {promoNotice && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-2xl text-xs font-bold flex items-center space-x-2 shadow-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{promoNotice}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: SERVICE PACKAGES & ALLOCATION                       */}
      {/* ========================================================= */}
      {activeModuleTab === 'packages' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="text-xl font-extrabold text-slate-900">Package Catalog & Client Allocation</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any package card to allocate to a client with instant payment or Payment Due invoicing with 30-day validity.
            </p>
          </div>

          {/* Package Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {packageDefinitions.map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => openAllocate(pkg)}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-xl transition-all flex flex-col justify-between overflow-hidden relative group cursor-pointer border-l-4 border-l-blue-600"
              >
                {pkg.sessionCount === 12 && (
                  <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-black uppercase text-center py-1 tracking-widest">
                    ★ MOST POPULAR TRANSFORMATION ★
                  </div>
                )}

                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Package className="w-6 h-6" />
                    </div>
                    <span className="bg-slate-100 text-slate-700 font-bold text-[10px] px-2 py-1 rounded-md">
                      {pkg.sessionCount} Sessions
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-lg mt-4">{pkg.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{pkg.description}</p>

                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Per Session Rate:</span>
                      <span className="font-bold text-slate-900">{formatAED(Math.round(pkg.priceAED / pkg.sessionCount))}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Frequency:</span>
                      <span className="font-medium text-slate-700">{pkg.trainingFrequency}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Session Duration:</span>
                      <span className="font-medium text-slate-700">{pkg.sessionDurationMinutes} Mins</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Strict Validity:</span>
                      <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                        {pkg.validityDays || 30} Days
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-xl font-black text-blue-900">{formatAED(pkg.priceAED)}</div>
                    <div className="text-[10px] text-slate-400 font-medium">+5% UAE VAT</div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={(e) => openEdit(e, pkg)}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit Package Definition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <span className="px-3 py-1.5 bg-blue-600 group-hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors">
                      Allot
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: PROMO & DISCOUNT CODES MANAGEMENT                  */}
      {/* ========================================================= */}
      {activeModuleTab === 'promos' && (
        <div className="space-y-6">
          {/* Promo Header & KPI Row */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 bg-purple-100 text-purple-900 text-[10px] font-extrabold uppercase rounded-full">
                    DISCOUNT & PROMOTION ENGINE
                  </span>
                  <span className="text-xs text-slate-400">Stripe & Manual Billing</span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 mt-1">Promo & Discount Codes</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set up promotional voucher codes, configure validity start & expiry dates, define % or fixed AED discounts, and enforce usage limits.
                </p>
              </div>

              <button
                type="button"
                onClick={openCreatePromoModal}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center space-x-2 transition-colors self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Promo Code</span>
              </button>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100">
                <span className="text-[10px] font-bold text-purple-700 uppercase">Total Codes</span>
                <div className="text-xl font-black text-purple-950 mt-0.5">{promoCodes.length}</div>
              </div>
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <span className="text-[10px] font-bold text-emerald-700 uppercase">Active & Valid</span>
                <div className="text-xl font-black text-emerald-950 mt-0.5">{activePromosCount}</div>
              </div>
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                <span className="text-[10px] font-bold text-blue-700 uppercase">Total Redemptions</span>
                <div className="text-xl font-black text-blue-950 mt-0.5">{totalRedemptions}</div>
              </div>
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                <span className="text-[10px] font-bold text-amber-700 uppercase">Best Discount</span>
                <div className="text-xl font-black text-amber-950 mt-0.5">
                  {promoCodes.length > 0
                    ? `${Math.max(...promoCodes.map((p) => (p.discountType === 'percentage' ? p.discountValue : 0)))}% OFF`
                    : 'None'}
                </div>
              </div>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={promoSearchQuery}
                onChange={(e) => setPromoSearchQuery(e.target.value)}
                placeholder="Search promo codes by code name or description..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none"
              />
            </div>

            <div className="flex items-center space-x-1.5 self-start sm:self-auto">
              {(['ALL', 'Active', 'Inactive', 'Expired'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setPromoStatusFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    promoStatusFilter === filter
                      ? 'bg-purple-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Promo Code Cards List */}
          {filteredPromos.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto">
                <Tag className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-base">No Promo Codes Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {promoSearchQuery
                  ? `No promo codes match "${promoSearchQuery}".`
                  : 'No promo codes in this filter. Click "Create Promo Code" to add a new discount.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPromos.map((promo) => {
                const isDateExpired = promo.validUntil < todayStr;
                const isUsesExpired = Boolean(promo.maxUses && promo.currentUses >= promo.maxUses);
                const isExpired = isDateExpired || isUsesExpired || promo.status === 'Expired';
                const daysRemaining = getDaysRemaining(promo.validUntil);

                return (
                  <div
                    key={promo.id}
                    className={`bg-white rounded-2xl border shadow-xs transition-all overflow-hidden flex flex-col justify-between ${
                      isExpired
                        ? 'border-slate-200 opacity-75'
                        : promo.status === 'Active'
                        ? 'border-purple-200 hover:border-purple-400 hover:shadow-md'
                        : 'border-slate-200 bg-slate-50/60'
                    }`}
                  >
                    <div className="p-5 space-y-4">
                      {/* Code Tag & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-black text-lg text-purple-950 bg-purple-100/80 px-2.5 py-1 rounded-xl border border-purple-300 tracking-wider">
                              {promo.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyPromo(promo.code)}
                              className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                              title="Copy Promo Code"
                            >
                              {copiedCode === promo.code ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">
                            {promo.description || 'General personal training promo discount.'}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {isExpired ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                              Expired
                            </span>
                          ) : promo.status === 'Active' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Active
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Discount Value Pill */}
                      <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-black">
                            {promo.discountType === 'percentage' ? <Percent className="w-4 h-4" /> : 'AED'}
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-purple-700 uppercase block">Discount Value</span>
                            <span className="text-sm font-black text-purple-950">
                              {promo.discountType === 'percentage'
                                ? `${promo.discountValue}% OFF`
                                : `${formatAED(promo.discountValue)} OFF`}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Min Purchase</span>
                          <span className="text-xs font-bold text-slate-700">
                            {promo.minOrderAmountAED ? formatAED(promo.minOrderAmountAED) : 'No Minimum'}
                          </span>
                        </div>
                      </div>

                      {/* Validity Period Box */}
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center space-x-1.5 text-slate-500">
                            <CalendarDays className="w-3.5 h-3.5 text-purple-600" />
                            <span>Validity Window:</span>
                          </span>
                          <span className="font-mono font-bold text-slate-800">
                            {promo.validFrom} &rarr; {promo.validUntil}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-slate-500">Status Check:</span>
                          {isExpired ? (
                            <span className="text-rose-600 font-bold text-[11px]">
                              {isDateExpired ? `Expired on ${promo.validUntil}` : 'Usage Limit Reached'}
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-bold text-[11px]">
                              {daysRemaining === 0 ? 'Expires Today!' : `${daysRemaining} Days Remaining`}
                            </span>
                          )}
                        </div>

                        {/* Usage Progress */}
                        <div className="pt-2 border-t border-slate-100 space-y-1">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-500 font-medium">Redemptions:</span>
                            <span className="font-bold text-slate-900">
                              {promo.currentUses} {promo.maxUses ? `/ ${promo.maxUses}` : 'times (Unlimited)'}
                            </span>
                          </div>
                          {promo.maxUses && (
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full ${
                                  promo.currentUses >= promo.maxUses ? 'bg-rose-500' : 'bg-purple-600'
                                }`}
                                style={{
                                  width: `${Math.min(100, (promo.currentUses / promo.maxUses) * 100)}%`,
                                }}
                              ></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => togglePromoCodeStatus(promo.id)}
                        className={`flex items-center space-x-1.5 font-bold cursor-pointer transition-colors ${
                          promo.status === 'Active' ? 'text-amber-700 hover:text-amber-800' : 'text-emerald-700 hover:text-emerald-800'
                        }`}
                      >
                        {promo.status === 'Active' ? (
                          <>
                            <ToggleRight className="w-4 h-4 text-emerald-600" />
                            <span>Deactivate</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4 text-slate-400" />
                            <span>Activate</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => openEditPromoModal(promo)}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:border-purple-300 text-slate-700 hover:text-purple-900 rounded-xl font-bold transition-colors cursor-pointer flex items-center space-x-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete promo code "${promo.code}"?`)) {
                              deletePromoCode(promo.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Promo Code"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* PROMO CODE CREATE / EDIT MODAL                            */}
      {/* ========================================================= */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {editingPromoId ? 'Edit Promo Code & Validity' : 'Create New Promo Code'}
                  </h3>
                  <p className="text-xs text-slate-400">Configure discount value, date validity, and usage limits</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPromoModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePromo} className="space-y-4 pt-4 text-xs">
              {/* Promo Code & Description */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Promo / Coupon Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={promoForm.code}
                  onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SUMMER2026, WELCOME15, VIP100"
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold text-purple-950 uppercase focus:ring-2 focus:ring-purple-600 bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Description / Campaign Purpose</label>
                <input
                  type="text"
                  value={promoForm.description}
                  onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })}
                  placeholder="e.g. 20% discount for Dubai Marina transformation trainees"
                  className="w-full p-2 border border-slate-300 rounded-xl"
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Discount Type</label>
                  <select
                    value={promoForm.discountType}
                    onChange={(e) =>
                      setPromoForm({
                        ...promoForm,
                        discountType: e.target.value as 'percentage' | 'fixed',
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-xl font-bold bg-white"
                  >
                    <option value="percentage">Percentage (% Off)</option>
                    <option value="fixed">Fixed Amount (AED Off)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    {promoForm.discountType === 'percentage' ? 'Percentage (e.g. 20%)' : 'Amount in AED (e.g. 100)'}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={promoForm.discountType === 'percentage' ? 100 : 5000}
                    value={promoForm.discountValue}
                    onChange={(e) => setPromoForm({ ...promoForm, discountValue: Number(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Validity Dates (Start and Expiry) */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 uppercase block text-[11px] flex items-center space-x-1.5">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span>Validity & Expiration Period (Asia/Dubai)</span>
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-600 text-[11px] mb-1">Valid From (Start Date)</label>
                    <input
                      type="date"
                      required
                      value={promoForm.validFrom}
                      onChange={(e) => setPromoForm({ ...promoForm, validFrom: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 text-[11px] mb-1">Valid Until (Expiry Date)</label>
                    <input
                      type="date"
                      required
                      value={promoForm.validUntil}
                      onChange={(e) => setPromoForm({ ...promoForm, validUntil: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono text-xs font-bold text-amber-900"
                    />
                  </div>
                </div>

                {/* Quick Expiry Date Preset Buttons */}
                <div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
                  <span className="text-slate-400 self-center font-bold">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => setPromoForm({ ...promoForm, validUntil: calculateExpiryDate(promoForm.validFrom, 30) })}
                    className="px-2 py-0.5 bg-white border border-slate-300 hover:border-purple-400 rounded font-bold cursor-pointer"
                  >
                    +30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setPromoForm({ ...promoForm, validUntil: calculateExpiryDate(promoForm.validFrom, 60) })}
                    className="px-2 py-0.5 bg-white border border-slate-300 hover:border-purple-400 rounded font-bold cursor-pointer"
                  >
                    +60 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setPromoForm({ ...promoForm, validUntil: calculateExpiryDate(promoForm.validFrom, 90) })}
                    className="px-2 py-0.5 bg-white border border-slate-300 hover:border-purple-400 rounded font-bold cursor-pointer"
                  >
                    +90 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setPromoForm({ ...promoForm, validUntil: '2026-12-31' })}
                    className="px-2 py-0.5 bg-purple-50 text-purple-900 border border-purple-200 rounded font-bold cursor-pointer"
                  >
                    End of Year (2026-12-31)
                  </button>
                </div>
              </div>

              {/* Usage & Minimum Spend Limits */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Max Redemptions</label>
                  <input
                    type="number"
                    min={1}
                    value={promoForm.maxUses}
                    onChange={(e) =>
                      setPromoForm({
                        ...promoForm,
                        maxUses: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                    placeholder="Leave blank for Unlimited"
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Min Spend (AED)</label>
                  <input
                    type="number"
                    min={0}
                    value={promoForm.minOrderAmountAED}
                    onChange={(e) =>
                      setPromoForm({
                        ...promoForm,
                        minOrderAmountAED: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                    placeholder="Leave blank for None"
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Status Radio */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1.5">Initial Status</label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-1.5 cursor-pointer font-bold text-slate-800">
                    <input
                      type="radio"
                      name="promoStatus"
                      checked={promoForm.status === 'Active'}
                      onChange={() => setPromoForm({ ...promoForm, status: 'Active' })}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span>Active (Available for checkout)</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer font-bold text-slate-600">
                    <input
                      type="radio"
                      name="promoStatus"
                      checked={promoForm.status === 'Inactive'}
                      onChange={() => setPromoForm({ ...promoForm, status: 'Inactive' })}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span>Inactive (Paused)</span>
                  </label>
                </div>
              </div>

              {/* Real-time Calculation Simulation Preview */}
              <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 text-purple-900">
                <span className="font-extrabold block uppercase text-[10px] tracking-wider mb-1">
                  💡 Live Calculation Preview (Sample AED 1,200 Package):
                </span>
                {(() => {
                  const sampleBase = 1200;
                  const discountVal =
                    promoForm.discountType === 'percentage'
                      ? Math.round((sampleBase * (promoForm.discountValue || 0)) / 100)
                      : Math.min(sampleBase, promoForm.discountValue || 0);
                  const sampleSubtotal = Math.max(0, sampleBase - discountVal);
                  const sampleVat = Math.round(sampleSubtotal * 0.05 * 100) / 100;
                  const sampleTotal = sampleSubtotal + sampleVat;

                  return (
                    <div className="text-[11px] font-medium space-y-0.5">
                      <div>
                        Base AED 1,200 &minus; Discount {formatAED(discountVal)} = Subtotal {formatAED(sampleSubtotal)}
                      </div>
                      <div className="font-bold text-purple-950">
                        + 5% UAE VAT ({formatAED(sampleVat)}) = Final Client Total: {formatAED(sampleTotal)}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Modal Footer */}
              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPromoModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-md cursor-pointer"
                >
                  {editingPromoId ? 'Save Promo Code Changes' : 'Create & Activate Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ALLOCATE PACKAGE MODAL                                    */}
      {/* ========================================================= */}
      {isAllocateModalOpen && selectedPkgDef && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase text-blue-700 tracking-wider">Selected Package</span>
                <h4 className="font-black text-slate-900 text-base">{selectedPkgDef.name}</h4>
                <p className="text-xs text-slate-600">
                  {selectedPkgDef.sessionCount} Sessions • {selectedPkgDef.validityDays || 30}-Day Validity in Dubai
                </p>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-blue-900">{formatAED(selectedPkgDef.priceAED)}</div>
                <div className="text-[10px] text-slate-500 font-medium">Base Price (+5% VAT)</div>
              </div>
            </div>

            <form onSubmit={handleConfirmAllocation} className="p-6 space-y-5">
              {feedbackMessage && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3.5 flex items-center space-x-2.5 shadow-xs">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-semibold">{feedbackMessage}</span>
                </div>
              )}

              {/* Client Search Section */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  1. Search & Select Client
                </label>
                <div className="relative mb-2">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={clientSearchQuery}
                    onChange={(e) => setClientSearchQuery(e.target.value)}
                    placeholder="Search client by name, email, phone, or ID..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>

                {/* Client List */}
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50">
                  {filteredClients.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      No client found matching &quot;{clientSearchQuery}&quot;. Please add a client first.
                    </div>
                  ) : (
                    filteredClients.map((c) => {
                      const isSelected = selectedClientId === c.id;
                      const trainer = trainers.find((t) => t.id === c.assignedTrainerId);

                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelectedClientId(c.id)}
                          className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-100/70 border-l-4 border-blue-600' : 'hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <img
                              src={
                                c.profilePhoto ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                              }
                              alt={c.fullName}
                              className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
                            />
                            <div>
                              <div className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                                <span>{c.fullName}</span>
                                <span className="text-[10px] text-slate-400 font-mono">({c.id})</span>
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center space-x-2 mt-0.5">
                                <span>{c.communityName}</span>
                                <span>•</span>
                                <span>Trainer: {trainer?.fullName || 'Unassigned'}</span>
                              </div>
                            </div>
                          </div>

                          <input
                            type="radio"
                            name="clientSelection"
                            checked={isSelected}
                            onChange={() => setSelectedClientId(c.id)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Optional Promo Code Application */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  2. Apply Promo Code (Optional)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={allocPromoCode}
                    onChange={(e) => setAllocPromoCode(e.target.value.toUpperCase())}
                    placeholder="Enter code (e.g. WELCOME10, VIP20)"
                    className="flex-1 p-2 text-xs font-mono font-bold uppercase border border-slate-300 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleApplyAllocPromo}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
                {allocPromoFeedback && (
                  <div
                    className={`text-[11px] font-bold mt-1.5 ${
                      allocPromoFeedback.error ? 'text-red-600' : 'text-emerald-700'
                    }`}
                  >
                    {allocPromoFeedback.text}
                  </div>
                )}
              </div>

              {/* Allocation Mode Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  3. Payment & Activation Flow
                </label>

                <div className="space-y-2 text-xs">
                  <label
                    onClick={() => setAllocationMode('DUE')}
                    className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      allocationMode === 'DUE' ? 'bg-amber-50/60 border-amber-300' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="allocationMode"
                      value="DUE"
                      checked={allocationMode === 'DUE'}
                      onChange={() => setAllocationMode('DUE')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold text-slate-900">Mark as "Payment Due" (Client Pays via Stripe Portal)</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Creates an unpaid package invoice. Session credits remain locked until the client completes payment.
                      </div>
                    </div>
                  </label>

                  <label
                    onClick={() => setAllocationMode('INSTANT_ADMIN')}
                    className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      allocationMode === 'INSTANT_ADMIN' ? 'bg-blue-50/60 border-blue-300' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="allocationMode"
                      value="INSTANT_ADMIN"
                      checked={allocationMode === 'INSTANT_ADMIN'}
                      onChange={() => setAllocationMode('INSTANT_ADMIN')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-bold text-slate-900">Direct Admin Payment (Instant Credit Activation)</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Client paid via Cash or Bank Transfer. Instantly activates all {selectedPkgDef.sessionCount} credits for booking.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {allocationMode === 'INSTANT_ADMIN' && (
                <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100 space-y-2 text-xs animate-in fade-in">
                  <label className="block font-bold text-blue-900 uppercase">Payment Method Received</label>
                  <div className="flex space-x-3">
                    {(['Cash', 'Bank Transfer', 'Card'] as const).map((method) => (
                      <label key={method} className="flex items-center space-x-1.5 cursor-pointer font-semibold text-slate-700">
                        <input
                          type="radio"
                          name="adminPaymentMethod"
                          value={method}
                          checked={adminPaymentMethod === method}
                          onChange={() => setAdminPaymentMethod(method)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span>{method}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Financial VAT Breakdown Summary */}
              {selectedPkgDef && (() => {
                const discountAmount = allocPromoFeedback && !allocPromoFeedback.error ? allocPromoFeedback.discountAED : 0;
                const basePrice = selectedPkgDef.priceAED;
                const subtotal = Math.max(0, basePrice - discountAmount);
                const vatAmount = Math.round(subtotal * 0.05 * 100) / 100;
                const totalPayable = subtotal + vatAmount;

                return (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                    <div className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] pb-1.5 border-b border-slate-200 flex justify-between items-center">
                      <span>Plan & VAT Calculation Breakdown</span>
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[10px] border border-emerald-200">
                        +5% UAE VAT Calculated
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Base Plan Price:</span>
                      <span className="font-bold text-slate-900">{formatAED(basePrice)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center text-purple-700 font-semibold">
                        <span>Promo Discount ({allocPromoCode.trim().toUpperCase()}):</span>
                        <span>-{formatAED(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Subtotal (excl. VAT):</span>
                      <span className="font-bold text-slate-900">{formatAED(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-blue-700 font-semibold">
                      <span>+ 5% UAE VAT:</span>
                      <span>+{formatAED(vatAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-black pt-2 border-t border-slate-200 text-slate-900">
                      <span>Total Invoice Amount (incl. VAT):</span>
                      <span className="text-blue-900 text-base">{formatAED(totalPayable)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAllocateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={!selectedClientId || filteredClients.length === 0}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>
                    {allocationMode === 'DUE' ? 'Generate Payment Due Package' : 'Activate Package Immediately'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EDIT / CREATE PACKAGE DEFINITION MODAL                    */}
      {/* ========================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">
                {selectedPkgDef ? 'Edit Package Definition' : 'Create Custom Package'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePackage} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Package Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  placeholder="e.g. 12 Sessions Transformation"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Session Count</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={formData.sessionCount}
                    onChange={(e) => setFormData({ ...formData, sessionCount: Number(e.target.value) || 1 })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Base Price (AED)</label>
                  <input
                    type="number"
                    required
                    min={2}
                    step="any"
                    value={formData.priceAED}
                    onChange={(e) => setFormData({ ...formData, priceAED: Number(e.target.value) || 0 })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold text-blue-900"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block font-medium">
                    Minimum: AED 2 (Stripe gateway threshold)
                  </span>
                </div>
              </div>

              {/* VAT Calculation Preview */}
              <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 text-blue-950 space-y-1">
                <div className="flex justify-between items-center text-[11px] font-semibold">
                  <span>Base Price (excl. VAT):</span>
                  <span>{formatAED(formData.priceAED || 0)}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-semibold text-blue-700">
                  <span>+ 5% UAE VAT:</span>
                  <span>+{formatAED(Math.round((formData.priceAED || 0) * 0.05 * 100) / 100)}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-black pt-1 border-t border-blue-200 text-slate-900">
                  <span>Total Plan Price (incl. 5% VAT):</span>
                  <span className="text-blue-900 font-extrabold">
                    {formatAED((formData.priceAED || 0) + Math.round((formData.priceAED || 0) * 0.05 * 100) / 100)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Session Duration</label>
                  <select
                    value={formData.sessionDurationMinutes}
                    onChange={(e) => setFormData({ ...formData, sessionDurationMinutes: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes (Standard)</option>
                    <option value={90}>90 Minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={365}
                    value={formData.validityDays || 30}
                    onChange={(e) => setFormData({ ...formData, validityDays: Number(e.target.value) || 30 })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold text-amber-800"
                    placeholder="e.g. 30"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  rows={2}
                ></textarea>
              </div>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-[11px] text-amber-900 font-medium">
                Package Validity: Set any custom duration (e.g. 7, 14, 30, 60, 90, 365 days). Package expiration date is calculated automatically upon purchase, and auto-pay triggers only when validity expires.
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                >
                  Save Package Definition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
