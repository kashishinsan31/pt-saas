import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Trainer } from '../../types';
import {
  UserCheck,
  UserPlus,
  Mail,
  Phone,
  Award,
  Users,
  CheckCircle,
  Edit2,
  X,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  Lock,
  Star,
} from 'lucide-react';

export const TrainersModule: React.FC = () => {
  const { currentUser, users, trainers, clients, bookings, addTrainer, updateTrainer, setUserPassword } = useApp();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);

  // Edit Trainer State
  const [isEditTrainerModalOpen, setIsEditTrainerModalOpen] = useState(false);
  const [selectedTrainerForEdit, setSelectedTrainerForEdit] = useState<Trainer | null>(null);
  const [trainerPassword, setTrainerPassword] = useState('Dubai2026!');
  const [showTrainerPassword, setShowTrainerPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState('');

  const [formData, setFormData] = useState<{
    fullName: string;
    profilePhoto: string;
    email: string;
    whatsappNumber: string;
    specialization: string;
    employmentStatus: 'Full-Time' | 'Part-Time' | 'Contractor';
    bio: string;
  }>({
    fullName: '',
    profilePhoto: '',
    email: '',
    whatsappNumber: '+97150',
    specialization: 'Strength & Conditioning',
    employmentStatus: 'Full-Time',
    bio: '',
  });

  const openEditTrainerModal = (t: Trainer) => {
    setSelectedTrainerForEdit(t);
    const matchedUser = users.find(
      (u) =>
        u.associatedId?.toLowerCase() === t.id.toLowerCase() ||
        u.email.toLowerCase() === t.email.toLowerCase()
    );
    setTrainerPassword(matchedUser?.password || t.password || 'Dubai2026!');
    setShowTrainerPassword(false);
    setPasswordFeedback('');

    setFormData({
      fullName: t.fullName,
      profilePhoto: t.profilePhoto || '',
      email: t.email,
      whatsappNumber: t.whatsappNumber,
      specialization: t.specialization,
      employmentStatus: t.employmentStatus,
      bio: t.bio || '',
    });
    setIsEditTrainerModalOpen(true);
  };

  const handleUpdateTrainerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrainerForEdit) return;

    updateTrainer(selectedTrainerForEdit.id, {
      fullName: formData.fullName,
      email: formData.email,
      whatsappNumber: formData.whatsappNumber,
      specialization: formData.specialization,
      employmentStatus: formData.employmentStatus,
      bio: formData.bio,
    });

    if (trainerPassword) {
      setUserPassword(selectedTrainerForEdit.id, trainerPassword);
    }

    setIsEditTrainerModalOpen(false);
  };

  const handleCreateTrainer = (e: React.FormEvent) => {
    e.preventDefault();
    addTrainer({
      fullName: formData.fullName,
      profilePhoto: formData.profilePhoto || 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=150&auto=format&fit=crop&q=80',
      email: formData.email,
      whatsappNumber: formData.whatsappNumber,
      specialization: formData.specialization,
      employmentStatus: formData.employmentStatus,
      bio: formData.bio,
    });
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Trainer Roster</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage Waiter Walk personal training team, specializations and client assignments.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              fullName: '',
              profilePhoto: '',
              email: '',
              whatsappNumber: '+97150',
              specialization: 'Strength & Conditioning',
              employmentStatus: 'Full-Time',
              bio: '',
            });
            setIsAddModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center space-x-2 transition-colors self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Trainer</span>
        </button>
      </div>

      {/* Trainers Grid */}
      {trainers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
            <UserPlus className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-slate-800 text-base">No Trainers Registered Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Your database is in clean production state. Click &quot;Add New Trainer&quot; above to register your certified personal trainers and set their weekly availability.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trainers.map((trainer) => {
          const assignedClients = clients.filter((c) => c.assignedTrainerId === trainer.id);
          const trainerReviews = bookings.filter((b) => b.trainerId === trainer.id && b.trainerRating);
          const avgScore = trainerReviews.length > 0
            ? (trainerReviews.reduce((sum, b) => sum + (b.trainerRating || 0), 0) / trainerReviews.length).toFixed(1)
            : 'N/A';

          return (
            <div
              key={trainer.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col"
            >
              <div className="p-5 flex-1">
                <div className="flex items-start space-x-4">
                  <img
                    src={
                      trainer.profilePhoto ||
                      'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=150&auto=format&fit=crop&q=80'
                    }
                    alt={trainer.fullName}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-100 shadow-sm shrink-0"
                  />
                  <div>
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                      {trainer.employmentStatus}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-base mt-1">{trainer.fullName}</h3>
                    <p className="text-xs text-slate-400 font-mono">{trainer.id}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center space-x-2 text-slate-700 font-medium">
                    <Award className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="truncate">{trainer.specialization}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-amber-700 font-bold">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-500 shrink-0" />
                    <span>Rating: {avgScore !== 'N/A' ? `⭐ ${avgScore} / 5` : 'No reviews'} ({trainerReviews.length} reviews)</span>
                  </div>

                  <div className="flex items-center space-x-2 text-slate-600 font-mono">
                    <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{trainer.whatsappNumber}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-slate-600">
                    <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="truncate">{trainer.email}</span>
                  </div>
                </div>

                {/* Assigned Clients */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-slate-700 flex items-center space-x-1">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>Assigned Clients</span>
                    </span>
                    <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded text-[11px]">
                      {assignedClients.length} Clients
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                    {assignedClients.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">No clients assigned yet.</span>
                    ) : (
                      assignedClients.map((c) => (
                        <span
                          key={c.id}
                          className="bg-slate-100 text-slate-700 font-medium text-[11px] px-2 py-1 rounded-md border border-slate-200"
                        >
                          {c.fullName}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-emerald-600 font-bold flex items-center space-x-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{trainer.status} Status</span>
                </span>
                <div className="flex items-center space-x-2">
                  {currentUser?.role === 'admin' && (
                    <button
                      onClick={() => openEditTrainerModal(trainer)}
                      className="flex items-center space-x-1 p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer font-semibold"
                      title="Edit Trainer Profile & Password"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedTrainer(trainer)}
                    className="text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Performance
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Edit Trainer Modal (Admin Only) */}
      {isEditTrainerModalOpen && selectedTrainerForEdit && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">
                  Edit Trainer Profile ({selectedTrainerForEdit.id})
                </h3>
                <p className="text-xs text-slate-500">Update personal info, employment, and portal password.</p>
              </div>
              <button
                onClick={() => setIsEditTrainerModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateTrainerSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Trainer Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">WhatsApp</label>
                  <input
                    type="text"
                    required
                    value={formData.whatsappNumber}
                    onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Specialization</label>
                  <input
                    type="text"
                    required
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Employment</label>
                  <select
                    value={formData.employmentStatus}
                    onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-semibold"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Contractor">Contractor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Trainer Bio / Credentials</label>
                <textarea
                  rows={2}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white leading-relaxed"
                  placeholder="NASM, REPs UAE certified..."
                />
              </div>

              {/* Password Management for Trainer (Admin Only) */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-2xs">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-xs">Trainer Login Password (Admin Only)</h4>
                      <p className="text-[11px] text-slate-500">Change or create credentials for this trainer account.</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-200/60 text-blue-900 border border-blue-300">
                    Security
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  <div className="relative flex-1">
                    <input
                      type={showTrainerPassword ? 'text' : 'password'}
                      value={trainerPassword}
                      onChange={(e) => setTrainerPassword(e.target.value)}
                      className="w-full pl-3 pr-9 py-2 text-xs font-mono font-bold bg-white rounded-xl border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter new password (min 4 chars)..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowTrainerPassword(!showTrainerPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                      title={showTrainerPassword ? 'Hide password' : 'Show password'}
                    >
                      {showTrainerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const generated = `TR-${Math.floor(1000 + Math.random() * 9000)}!`;
                      setTrainerPassword(generated);
                      setShowTrainerPassword(true);
                    }}
                    className="px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl transition-colors cursor-pointer shrink-0 shadow-2xs"
                    title="Generate a random secure password"
                  >
                    Generate Key
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const res = setUserPassword(selectedTrainerForEdit.id, trainerPassword);
                      setPasswordFeedback(res.message);
                      setTimeout(() => setPasswordFeedback(''), 3000);
                    }}
                    className="px-3.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors cursor-pointer shrink-0 shadow-sm"
                  >
                    Update Password
                  </button>
                </div>

                {passwordFeedback && (
                  <div className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-3 py-1.5 rounded-xl border border-emerald-300 flex items-center space-x-1.5 animate-in fade-in">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{passwordFeedback}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditTrainerModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold shadow-md transition-all cursor-pointer"
                >
                  Save Profile & Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Trainer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-lg">Add New Trainer</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTrainer} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Trainer Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">WhatsApp</label>
                  <input
                    type="text"
                    required
                    value={formData.whatsappNumber}
                    onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Specialization</label>
                  <input
                    type="text"
                    required
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Employment</label>
                  <select
                    value={formData.employmentStatus}
                    onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Contractor">Contractor</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                >
                  Save Trainer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Trainer Performance Scorecard & Retention Modal */}
      {selectedTrainer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <img
                  src={selectedTrainer.profilePhoto || 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=150&auto=format&fit=crop&q=80'}
                  alt={selectedTrainer.fullName}
                  className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-sm"
                />
                <div>
                  <h3 className="font-black text-slate-900 text-lg">{selectedTrainer.fullName}</h3>
                  <p className="text-xs text-slate-500">{selectedTrainer.specialization} • Performance Scorecard</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTrainer(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const assigned = clients.filter((c) => c.assignedTrainerId === selectedTrainer.id);
              const assignedRetained = assigned.filter((c) => {
                const cPkgs = bookings.filter((b) => b.clientId === c.id);
                return cPkgs.length >= 2;
              }).length;
              const retentionPct = assigned.length > 0 ? ((assignedRetained / assigned.length) * 100).toFixed(0) : '100';

              const tBookings = bookings.filter((b) => b.trainerId === selectedTrainer.id);
              const completedBookings = tBookings.filter((b) => b.status === 'Completed');
              const lateCancels = tBookings.filter((b) => b.status === 'Late Cancellation').length;
              const noShows = tBookings.filter((b) => b.status === 'No Show').length;

              const reviews = tBookings.filter((b) => b.trainerRating);
              const avgScore = reviews.length > 0
                ? (reviews.reduce((sum, b) => sum + (b.trainerRating || 0), 0) / reviews.length).toFixed(1)
                : '5.0';

              return (
                <div className="space-y-4 text-xs">
                  {/* KPI Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200 text-center">
                      <div className="text-[10px] font-bold text-emerald-800 uppercase">Retention Ratio</div>
                      <div className="text-xl font-black text-emerald-900 mt-0.5">{retentionPct}%</div>
                      <div className="text-[10px] text-emerald-700">{assignedRetained}/{assigned.length} Clients</div>
                    </div>

                    <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-center">
                      <div className="text-[10px] font-bold text-amber-800 uppercase">Avg Client Rating</div>
                      <div className="text-xl font-black text-amber-900 mt-0.5">⭐ {avgScore}</div>
                      <div className="text-[10px] text-amber-700">{reviews.length} Ratings</div>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-2xl border border-blue-200 text-center">
                      <div className="text-[10px] font-bold text-blue-800 uppercase">Completed</div>
                      <div className="text-xl font-black text-blue-900 mt-0.5">{completedBookings.length}</div>
                      <div className="text-[10px] text-blue-700">Sessions</div>
                    </div>

                    <div className="bg-purple-50 p-3 rounded-2xl border border-purple-200 text-center">
                      <div className="text-[10px] font-bold text-purple-800 uppercase">Assigned</div>
                      <div className="text-xl font-black text-purple-900 mt-0.5">{assigned.length}</div>
                      <div className="text-[10px] text-purple-700">Active Clients</div>
                    </div>
                  </div>

                  {/* Attendance Reliability Breakdown */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <h4 className="font-extrabold text-slate-900 text-xs">Attendance & Reliability Breakdown</h4>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-white p-2 rounded-xl border border-slate-200">
                        <span className="text-slate-500 text-[10px] block font-bold">COMPLETED</span>
                        <span className="font-black text-emerald-700 text-sm">{completedBookings.length}</span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-200">
                        <span className="text-slate-500 text-[10px] block font-bold">LATE CANCELS</span>
                        <span className="font-black text-amber-700 text-sm">{lateCancels}</span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-200">
                        <span className="text-slate-500 text-[10px] block font-bold">NO SHOWS</span>
                        <span className="font-black text-red-700 text-sm">{noShows}</span>
                      </div>
                    </div>
                  </div>

                  {/* Recent Client Reviews */}
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-slate-900 text-xs">Recent Client Ratings & Feedback</h4>
                    {reviews.length === 0 ? (
                      <div className="p-3 bg-slate-50 text-slate-400 text-center italic rounded-xl border border-slate-200">
                        No client reviews submitted yet for this trainer.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {reviews.map((r) => (
                          <div key={r.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-900">Session Date: {r.sessionDate}</span>
                              <span className="font-black text-amber-600">⭐ {r.trainerRating} / 5</span>
                            </div>
                            {r.clientReview && (
                              <p className="text-slate-600 italic text-[11px]">"{r.clientReview}"</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTrainer(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs shadow-md cursor-pointer"
              >
                Close Scorecard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

