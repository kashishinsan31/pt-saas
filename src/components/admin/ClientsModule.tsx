import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Client, HealthIssueNote } from '../../types';
import { formatAED, formatReadableDate, calculateExpiryDate, formatDubaiDate } from '../../utils/dubaiTime';
import { HealthDeclarationModal } from '../common/HealthDeclarationModal';
import { AddHealthIssueModal } from '../common/AddHealthIssueModal';
import {
  Search,
  UserPlus,
  Filter,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Dumbbell,
  CreditCard,
  History,
  X,
  Edit2,
  Archive,
  CheckCircle,
  Eye,
  EyeOff,
  LayoutGrid,
  List,
  Lock,
  KeyRound,
  Check,
  HeartPulse,
  AlertTriangle,
  PenTool,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Plus,
  Trash2,
  Activity,
  Stethoscope,
  Tag,
} from 'lucide-react';

export const ClientsModule: React.FC = () => {
  const {
    currentUser,
    users,
    clients,
    trainers,
    clientPackages,
    bookings,
    payments,
    addClient,
    updateClient,
    deactivateClient,
    setUserPassword,
    deleteClientHealthIssue,
    updateClientHealthIssue,
    extendPackageExpiry,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [communityFilter, setCommunityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<'info' | 'health' | 'package' | 'sessions' | 'payments'>('info');

  // Health Declaration & Health Issues State
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [isAddIssueModalOpen, setIsAddIssueModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<HealthIssueNote | undefined>(undefined);
  const [healthCategoryFilter, setHealthCategoryFilter] = useState<string>('ALL');

  // Client Password Management State (Admin Only)
  const [clientPassword, setClientPassword] = useState('Dubai2026!');
  const [showClientPassword, setShowClientPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState('');


  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    profilePhoto: '',
    dateOfBirth: '1990-01-01',
    gender: 'Male' as const,
    email: '',
    whatsappNumber: '+97150',
    residentialAddress: '',
    communityName: 'Palm Jumeirah',
    emergencyContactName: '',
    emergencyContactRel: '',
    emergencyContactPhone: '+97150',
    additionalNotes: '',
    assignedTrainerId: trainers[0]?.id || '',
  });

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    addClient({
      fullName: formData.fullName,
      profilePhoto: formData.profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      email: formData.email,
      whatsappNumber: formData.whatsappNumber,
      residentialAddress: formData.residentialAddress,
      communityName: formData.communityName,
      emergencyContact: {
        name: formData.emergencyContactName,
        relationship: formData.emergencyContactRel,
        phone: formData.emergencyContactPhone,
      },
      additionalNotes: formData.additionalNotes,
      assignedTrainerId: formData.assignedTrainerId,
    });
    setIsAddModalOpen(false);
  };

  const handleUpdateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    updateClient(selectedClient.id, {
      fullName: formData.fullName,
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      email: formData.email,
      whatsappNumber: formData.whatsappNumber,
      residentialAddress: formData.residentialAddress,
      communityName: formData.communityName,
      assignedTrainerId: formData.assignedTrainerId,
      additionalNotes: formData.additionalNotes,
    });

    if (clientPassword) {
      setUserPassword(selectedClient.id, clientPassword);
    }

    setIsEditModalOpen(false);
  };

  const openEditModal = (client: Client) => {
    setSelectedClient(client);
    const matchedUser = users.find(
      (u) =>
        u.associatedId?.toLowerCase() === client.id.toLowerCase() ||
        u.email.toLowerCase() === client.email.toLowerCase()
    );
    setClientPassword(matchedUser?.password || client.password || 'Dubai2026!');
    setShowClientPassword(false);
    setPasswordFeedback('');

    setFormData({
      fullName: client.fullName,
      profilePhoto: client.profilePhoto || '',
      dateOfBirth: client.dateOfBirth,
      gender: client.gender as any,
      email: client.email,
      whatsappNumber: client.whatsappNumber,
      residentialAddress: client.residentialAddress,
      communityName: client.communityName,
      emergencyContactName: client.emergencyContact.name,
      emergencyContactRel: client.emergencyContact.relationship,
      emergencyContactPhone: client.emergencyContact.phone,
      additionalNotes: client.additionalNotes || '',
      assignedTrainerId: client.assignedTrainerId,
    });
    setIsEditModalOpen(true);
  };

  // Role-based Client Access Control: Trainers see ONLY clients allotted to them by Admin
  const accessibleClients = clients.filter((c) => {
    if (currentUser?.role === 'trainer') {
      return c.assignedTrainerId === currentUser.associatedId;
    }
    return true;
  });

  const currentSelectedClient = selectedClient
    ? clients.find((c) => c.id === selectedClient.id) || selectedClient
    : null;

  // Filter clients
  const filteredClients = accessibleClients.filter((c) => {
    const matchesSearch =
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.communityName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCommunity = communityFilter === 'ALL' || c.communityName === communityFilter;
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;

    return matchesSearch && matchesCommunity && matchesStatus;
  });

  const communities = Array.from(new Set(accessibleClients.map((c) => c.communityName)));

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Client Database</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage personal training clients across Dubai communities & view complete profile records.
          </p>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => {
              setFormData({
                fullName: '',
                profilePhoto: '',
                dateOfBirth: '1990-05-15',
                gender: 'Male',
                email: '',
                whatsappNumber: '+97150',
                residentialAddress: 'Villa M, Palm Jumeirah',
                communityName: 'Palm Jumeirah',
                emergencyContactName: 'Spouse',
                emergencyContactRel: 'Spouse',
                emergencyContactPhone: '+97150',
                additionalNotes: '',
                assignedTrainerId: trainers[0]?.id || '',
              });
              setIsAddModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center space-x-2 transition-colors self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Client</span>
          </button>
        )}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, ID, email, community..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div>
          <select
            value={communityFilter}
            onChange={(e) => setCommunityFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-600"
          >
            <option value="ALL">All Dubai Communities</option>
            {communities.map((comm) => (
              <option key={comm} value={comm}>
                {comm}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-600"
          >
            <option value="ALL">All Client Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
              viewMode === 'grid'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Box Cards</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
              viewMode === 'table'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* Client Records View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClients.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              No clients found matching search criteria.
            </div>
          ) : (
            filteredClients.map((client) => {
              const trainer = trainers.find((t) => t.id === client.assignedTrainerId);
              const activePkg = clientPackages.find((p) => p.clientId === client.id && p.status === 'Active');

              return (
                <div
                  key={client.id}
                  className="bg-white rounded-2xl border-2 border-slate-200/90 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4 relative overflow-hidden group"
                >
                  {/* Top Client Header Box */}
                  <div className="flex items-start justify-between pb-3.5 border-b border-slate-100">
                    <div className="flex items-center space-x-3">
                      <img
                        src={
                          client.profilePhoto ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                        }
                        alt={client.fullName}
                        className="w-12 h-12 rounded-2xl object-cover border-2 border-slate-200 shadow-xs shrink-0"
                      />
                      <div>
                        <h3 className="font-black text-slate-900 text-base leading-snug">{client.fullName}</h3>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="font-mono text-[10px] font-extrabold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {client.id}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500">{client.age} yrs • {client.gender}</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold shrink-0 ${
                        client.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {client.status}
                    </span>
                  </div>

                  {/* Details Cards Container */}
                  <div className="space-y-2.5 text-xs">
                    {/* Location Box */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-start space-x-2.5">
                      <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 text-xs">{client.communityName}</div>
                        <div className="text-[11px] text-slate-500 truncate">{client.residentialAddress}</div>
                      </div>
                    </div>

                    {/* Assigned Trainer Box */}
                    <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/70 flex items-start space-x-2.5">
                      <Dumbbell className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="font-extrabold text-blue-950 text-xs">
                          Trainer: {trainer?.fullName || 'Unassigned'}
                        </div>
                        <div className="text-[11px] text-blue-800/80 font-medium">{trainer?.specialization || 'Personal Training Specialist'}</div>
                      </div>
                    </div>

                    {/* Contact Info Box Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 min-w-0">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp</div>
                        <div className="font-mono text-[11px] font-bold text-slate-800 truncate">{client.whatsappNumber}</div>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 min-w-0">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Email</div>
                        <div className="text-[11px] font-semibold text-slate-800 truncate">{client.email}</div>
                      </div>
                    </div>

                    {/* Health & PAR-Q Status Bar */}
                    <div className="flex items-center justify-between text-[10px] py-2 px-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="flex items-center gap-1 font-bold text-slate-700">
                        <HeartPulse className="w-3.5 h-3.5 text-red-500" />
                        <span>Health & PAR-Q</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {client.healthDeclaration?.signed ? (
                          <span className="text-emerald-700 font-extrabold bg-emerald-100/70 px-2 py-0.5 rounded text-[10px] border border-emerald-300 flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" />
                            <span>Signed</span>
                          </span>
                        ) : (
                          <span className="text-amber-800 font-extrabold bg-amber-100/70 px-2 py-0.5 rounded text-[10px] border border-amber-300">
                            Unsigned
                          </span>
                        )}
                        {client.healthIssues && client.healthIssues.length > 0 && (
                          <span className="text-blue-800 font-extrabold bg-blue-100/70 px-2 py-0.5 rounded text-[10px] border border-blue-300">
                            {client.healthIssues.length} {client.healthIssues.length === 1 ? 'Condition' : 'Conditions'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Active Package Box */}
                    <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200/80">
                      <div className="flex items-center justify-between text-[10px] font-extrabold text-emerald-950 uppercase tracking-wider">
                        <span>Active Package Box</span>
                        <span>Wallet Status</span>
                      </div>
                      {activePkg ? (
                        <div className="mt-1.5 space-y-1">
                          <div className="font-black text-slate-900 text-xs">{activePkg.packageName}</div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-extrabold text-emerald-700">
                              {activePkg.remainingSessions} / {activePkg.totalSessions} Sessions Left
                            </span>
                            <span className="text-amber-800 font-bold text-[10px]">Exp: {activePkg.expiryDate}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic mt-1">No active training package</div>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer Box */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedClient(client);
                        setActiveProfileTab('info');
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-2.5 px-3 rounded-xl shadow-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Profile & History</span>
                    </button>

                    {currentUser?.role === 'admin' && (
                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() => openEditModal(client)}
                          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                          title="Edit Client"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            updateClient(client.id, {
                              status: client.status === 'Active' ? 'Inactive' : 'Active',
                            })
                          }
                          className={`p-2 rounded-xl transition-colors border ${
                            client.status === 'Active'
                              ? 'text-red-600 hover:bg-red-50 border-red-200'
                              : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200'
                          }`}
                          title={client.status === 'Active' ? 'Deactivate' : 'Activate'}
                        >
                          {client.status === 'Active' ? <Archive className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Clients Table */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Client ID & Name</th>
                  <th className="py-3 px-4">Community & Location</th>
                  <th className="py-3 px-4">Contact Details</th>
                  <th className="py-3 px-4">Assigned Trainer</th>
                  <th className="py-3 px-4">Active Package & Wallet</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      No clients found matching the search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => {
                    const trainer = trainers.find((t) => t.id === client.assignedTrainerId);
                    const activePkg = clientPackages.find((p) => p.clientId === client.id && p.status === 'Active');

                    return (
                      <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-3">
                            <img
                              src={
                                client.profilePhoto ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                              }
                              alt={client.fullName}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200"
                            />
                            <div>
                              <div className="font-bold text-slate-900">{client.fullName}</div>
                              <div className="text-[10px] text-slate-400 font-mono font-semibold">{client.id} • {client.age} yrs</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{client.communityName}</div>
                          <div className="text-[10px] text-slate-500 truncate max-w-xs">{client.residentialAddress}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-slate-800 font-mono text-[11px]">{client.whatsappNumber}</div>
                          <div className="text-[10px] text-slate-500">{client.email}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-blue-900">{trainer?.fullName || 'Unassigned'}</div>
                          <div className="text-[10px] text-slate-500">{trainer?.specialization || ''}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          {activePkg ? (
                            <div>
                              <span className="font-bold text-emerald-800">{activePkg.packageName}</span>
                              <div className="text-[10px] text-slate-600 mt-0.5">
                                Remaining: <strong className="text-emerald-700">{activePkg.remainingSessions}</strong> / {activePkg.totalSessions} sessions
                              </div>
                              <div className="text-[10px] text-amber-700 font-medium">Expires: {activePkg.expiryDate}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">No active package</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              client.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {client.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => {
                                setSelectedClient(client);
                                setActiveProfileTab('info');
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Profile & History"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {currentUser?.role === 'admin' && (
                              <>
                                <button
                                  onClick={() => openEditModal(client)}
                                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                  title="Edit Client Profile & Allot Trainer"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    updateClient(client.id, {
                                      status: client.status === 'Active' ? 'Inactive' : 'Active',
                                    })
                                  }
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    client.status === 'Active'
                                      ? 'text-red-600 hover:bg-red-50'
                                      : 'text-emerald-600 hover:bg-emerald-50'
                                  }`}
                                  title={client.status === 'Active' ? 'Deactivate Client' : 'Activate Client'}
                                >
                                  {client.status === 'Active' ? (
                                    <Archive className="w-4 h-4" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4" />
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Individual Client Profile Modal */}
      {/* Individual Client Profile Modal */}
      {selectedClient && !isEditModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0">
                <img
                  src={
                    selectedClient.profilePhoto ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                  }
                  alt={selectedClient.fullName}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-white/20 shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-black truncate">{selectedClient.fullName}</h3>
                  <p className="text-xs text-blue-300 truncate">
                    ID: {selectedClient.id} • {selectedClient.communityName} • Age {selectedClient.age}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedClient(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Navigation Tabs */}
            <div className="bg-slate-50 border-b border-slate-200 px-3 sm:px-4 py-2">
              <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar scroll-smooth">
                <button
                  onClick={() => setActiveProfileTab('info')}
                  className={`py-2 px-3 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-all flex items-center space-x-1.5 ${
                    activeProfileTab === 'info'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Personal Info</span>
                </button>
                <button
                  onClick={() => setActiveProfileTab('health')}
                  className={`py-2 px-3 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-all flex items-center space-x-1.5 ${
                    activeProfileTab === 'health'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
                  }`}
                >
                  <HeartPulse className="w-3.5 h-3.5 text-red-500" />
                  <span>Health & PAR-Q</span>
                  {currentSelectedClient?.healthIssues && currentSelectedClient.healthIssues.length > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                        activeProfileTab === 'health' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {currentSelectedClient.healthIssues.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveProfileTab('package')}
                  className={`py-2 px-3 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-all flex items-center space-x-1.5 ${
                    activeProfileTab === 'package'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
                  }`}
                >
                  <Dumbbell className="w-3.5 h-3.5" />
                  <span>Packages</span>
                </button>
                <button
                  onClick={() => setActiveProfileTab('sessions')}
                  className={`py-2 px-3 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-all flex items-center space-x-1.5 ${
                    activeProfileTab === 'sessions'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Sessions</span>
                </button>
                {(currentUser?.role === 'admin' || currentUser?.role === 'trainer') && (
                  <button
                    onClick={() => setActiveProfileTab('payments')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-all flex items-center space-x-1.5 ${
                      activeProfileTab === 'payments'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Receipts</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tab Body */}
            <div className="p-4 sm:p-6 max-h-[65vh] overflow-y-auto">
              {activeProfileTab === 'info' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="min-w-0">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Email Address</span>
                      </span>
                      <div className="font-semibold text-slate-900 mt-1 break-all text-xs selection:bg-blue-100">
                        {selectedClient.email}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>WhatsApp</span>
                      </span>
                      <div className="font-semibold text-slate-900 font-mono mt-1 break-words text-xs">
                        {selectedClient.whatsappNumber}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span>Residential Address</span>
                      </span>
                      <div className="font-semibold text-slate-900 mt-1 break-words text-xs">
                        {selectedClient.residentialAddress}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>Community</span>
                      </span>
                      <div className="font-semibold text-slate-900 mt-1 break-words text-xs">
                        {selectedClient.communityName}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block">
                      Emergency Contact
                    </span>
                    <div className="font-bold text-slate-900 text-xs mt-1 break-words">
                      {selectedClient.emergencyContact.name}{' '}
                      <span className="font-medium text-slate-500">
                        ({selectedClient.emergencyContact.relationship})
                      </span>
                    </div>
                    <div className="text-slate-600 font-mono text-xs mt-0.5 break-words">
                      {selectedClient.emergencyContact.phone}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block">
                      Trainer Notes & Health Guidance
                    </span>
                    <div className="text-slate-700 text-xs mt-1 leading-relaxed break-words">
                      {currentSelectedClient?.additionalNotes ||
                        selectedClient.additionalNotes ||
                        'No specific notes recorded.'}
                    </div>
                  </div>
                </div>
              )}

              {activeProfileTab === 'health' && currentSelectedClient && (
                <div className="space-y-6 text-xs">
                  {/* Health Declaration Card */}
                  <div className="p-4 rounded-2xl border bg-slate-50/70 border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <ShieldCheck
                            className={`w-5 h-5 ${
                              currentSelectedClient.healthDeclaration?.signed
                                ? 'text-emerald-600'
                                : 'text-amber-500'
                            }`}
                          />
                          <h4 className="font-extrabold text-slate-900 text-sm">
                            Declaration of Health & Illness (PAR-Q)
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Physical Activity Readiness Questionnaire & digital electronic touch signature
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {currentSelectedClient.healthDeclaration?.signed ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Signed & Verified</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Signature Pending</span>
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setIsHealthModalOpen(true)}
                          className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                        >
                          <PenTool className="w-3 h-3" />
                          <span>
                            {currentSelectedClient.healthDeclaration?.signed ? 'View / Re-Sign' : 'Open & Sign'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Declaration Details */}
                    {currentSelectedClient.healthDeclaration?.signed ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Signed Timestamp</span>
                          <span className="font-bold text-slate-800">
                            {new Date(currentSelectedClient.healthDeclaration.signedAt || '').toLocaleString('en-AE', {
                              timeZone: 'Asia/Dubai',
                            })}{' '}
                            GST
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Signatory Name</span>
                          <span className="font-bold text-slate-800">
                            {currentSelectedClient.healthDeclaration.clientName}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Medical Status</span>
                          <span className="font-bold text-emerald-700">
                            {currentSelectedClient.healthDeclaration.doctorClearanceProvided ? '✓ Doctor Cleared' : 'Cleared'}
                          </span>
                        </div>

                        {currentSelectedClient.healthDeclaration.signatureDataUrl && (
                          <div className="sm:col-span-3 bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-500">
                              Captured Digital Electronic Signature:
                            </span>
                            <div className="h-12 border border-dashed border-slate-300 rounded-lg px-3 bg-slate-50 flex items-center">
                              <img
                                src={currentSelectedClient.healthDeclaration.signatureDataUrl}
                                alt="Signature"
                                className="h-9 max-w-[180px] object-contain"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-center justify-between">
                        <span>
                          The client has not yet signed their Health & Illness Declaration. Click <strong>"Open & Sign"</strong> to launch the PAR-Q and record their digital touch signature.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Health Conditions & Categorized Notes Section */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                          <Stethoscope className="w-4 h-4 text-blue-600" />
                          <span>Client Health Conditions & Notes</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Categorized records of injuries, surgeries, chronic illnesses, and training restrictions
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingIssue(undefined);
                          setIsAddIssueModalOpen(true);
                        }}
                        className="self-start sm:self-auto px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Health Note / Issue</span>
                      </button>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex flex-wrap gap-1 text-[11px]">
                      {['ALL', 'Injury', 'Cardiovascular', 'Chronic Condition', 'Allergy', 'Surgery', 'Active'].map((filterCat) => (
                        <button
                          key={filterCat}
                          type="button"
                          onClick={() => setHealthCategoryFilter(filterCat)}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                            healthCategoryFilter === filterCat
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {filterCat === 'ALL' ? 'All Notes' : filterCat}
                        </button>
                      ))}
                    </div>

                    {/* Notes List */}
                    <div className="space-y-3">
                      {!currentSelectedClient.healthIssues || currentSelectedClient.healthIssues.length === 0 ? (
                        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                          <HeartPulse className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                          <p className="font-bold text-xs text-slate-600">No health issues or medical notes recorded</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Click "+ Add Health Note / Issue" above to log injuries, allergies, or restrictions.
                          </p>
                        </div>
                      ) : (
                        currentSelectedClient.healthIssues
                          .filter((issue) => {
                            if (healthCategoryFilter === 'ALL') return true;
                            if (healthCategoryFilter === 'Active') return issue.status === 'Active';
                            return issue.category === healthCategoryFilter;
                          })
                          .map((issue) => {
                            const isCritical = issue.severity === 'Critical';
                            const isHigh = issue.severity === 'High';
                            const isModerate = issue.severity === 'Moderate';

                            const borderClass = isCritical
                              ? 'border-l-4 border-l-red-500 bg-red-50/20'
                              : isHigh
                              ? 'border-l-4 border-l-orange-500 bg-orange-50/20'
                              : isModerate
                              ? 'border-l-4 border-l-amber-500 bg-amber-50/20'
                              : 'border-l-4 border-l-blue-500 bg-blue-50/20';

                            return (
                              <div
                                key={issue.id}
                                className={`p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5 ${borderClass}`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-900 text-white">
                                        {issue.category}
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                          isCritical
                                            ? 'bg-red-100 text-red-800 border border-red-200'
                                            : isHigh
                                            ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                            : isModerate
                                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                                        }`}
                                      >
                                        {issue.severity} Severity
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                          issue.status === 'Active'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : issue.status === 'Monitoring'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-slate-200 text-slate-700'
                                        }`}
                                      >
                                        {issue.status}
                                      </span>

                                      {issue.trainerAlert && (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-500 text-white flex items-center gap-1 animate-pulse">
                                          <AlertTriangle className="w-2.5 h-2.5" />
                                          <span>Trainer Pre-Session Alert</span>
                                        </span>
                                      )}
                                    </div>

                                    <h5 className="font-extrabold text-slate-900 text-sm">{issue.title}</h5>
                                    {issue.affectedArea && (
                                      <div className="text-[11px] text-slate-500 font-medium">
                                        Target Area / Joint: <strong className="text-slate-800">{issue.affectedArea}</strong>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center space-x-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingIssue(issue);
                                        setIsAddIssueModalOpen(true);
                                      }}
                                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Edit Note"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateClientHealthIssue(currentSelectedClient.id, issue.id, {
                                          status: issue.status === 'Active' ? 'Resolved' : 'Active',
                                        })
                                      }
                                      className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-colors ${
                                        issue.status === 'Active'
                                          ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                                          : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                                      }`}
                                      title="Toggle status"
                                    >
                                      {issue.status === 'Active' ? 'Mark Resolved' : 'Reactivate'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteClientHealthIssue(currentSelectedClient.id, issue.id)}
                                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Delete Note"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <p className="text-xs text-slate-700 leading-relaxed font-normal bg-white p-2.5 rounded-lg border border-slate-200">
                                  {issue.description}
                                </p>

                                {issue.treatmentPlan && (
                                  <div className="text-[11px] text-blue-900 bg-blue-50/70 p-2 rounded-lg border border-blue-200 flex items-start gap-1.5">
                                    <Activity className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                                    <div>
                                      <strong className="font-bold">Coach & Doctor Guidance: </strong>
                                      <span>{issue.treatmentPlan}</span>
                                    </div>
                                  </div>
                                )}

                                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                                  <span>Recorded by: {issue.recordedBy}</span>
                                  <span>Reported: {issue.dateReported}</span>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                </div>
              )}


              {activeProfileTab === 'package' && (
                <div className="space-y-4">
                  {clientPackages
                    .filter((p) => p.clientId === selectedClient.id)
                    .map((pkg) => (
                      <div key={pkg.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-extrabold text-slate-900 text-sm">{pkg.packageName}</span>
                            <div className="text-slate-500 text-[11px] mt-0.5">Package ID: {pkg.id}</div>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                              pkg.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : pkg.status === 'Expired'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {pkg.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-200 text-center">
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between items-center min-h-[52px]">
                            <div className="text-[10px] text-slate-500 font-extrabold uppercase">TOTAL</div>
                            <div className="font-black text-slate-900 mt-1">{pkg.totalSessions}</div>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between items-center min-h-[52px]">
                            <div className="text-[10px] text-slate-500 font-extrabold uppercase">COMPLETED</div>
                            <div className="font-black text-blue-700 mt-1">{pkg.completedSessions}</div>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between items-center min-h-[52px]">
                            <div className="text-[10px] text-slate-500 font-extrabold uppercase">REMAINING</div>
                            <div className="font-black text-emerald-700 mt-1">{pkg.remainingSessions}</div>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between items-center min-h-[52px]">
                            <div className="text-[10px] text-slate-500 font-extrabold uppercase">EXPIRED</div>
                            <div className="font-black text-red-600 mt-1">{pkg.expiredSessions}</div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                          <div>
                            <span>Start: {pkg.startDate}</span> • <span className="font-bold text-amber-800">Expiry Date: {pkg.expiryDate}</span>
                          </div>
                          {currentUser?.role === 'admin' && (
                            <button
                              type="button"
                              onClick={() => {
                                const baseDate = pkg.expiryDate < formatDubaiDate(new Date()) ? formatDubaiDate(new Date()) : pkg.expiryDate;
                                const newExpiry = calculateExpiryDate(baseDate, 30);
                                extendPackageExpiry(pkg.id, newExpiry, 'Admin validity extension from Client Profile');
                              }}
                              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[10px] self-end sm:self-auto cursor-pointer shadow-2xs"
                              title="Extend validity by 30 days and reactivate if expired"
                            >
                              +30 Days Validity Extension
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {activeProfileTab === 'sessions' && (
                <div className="space-y-2 text-xs">
                  {bookings
                    .filter((b) => b.clientId === selectedClient.id)
                    .map((b) => (
                      <div key={b.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-slate-900">{b.sessionDate} at {b.startTime}</div>
                          <div className="text-slate-500 text-[11px]">{b.location}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">{b.status}</span>
                      </div>
                    ))}
                </div>
              )}

              {activeProfileTab === 'payments' && (
                <div className="space-y-2 text-xs">
                  {payments
                    .filter((p) => p.clientId === selectedClient.id)
                    .map((p) => (
                      <div key={p.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-slate-900">{p.packageName}</div>
                          <div className="text-slate-500 text-[11px]">{p.paymentDate} • Method: {p.paymentMethod} • Ref: {p.transactionReference}</div>
                        </div>
                        <div className="text-right">
                          {currentUser?.role === 'admin' ? (
                            <div className="font-black text-slate-900">{formatAED(p.amountPaidAED)}</div>
                          ) : (
                            <div className="font-bold text-slate-400 font-mono text-[11px]">[Amount Confidential]</div>
                          )}
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">{p.status}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-lg">Add New Client</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
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
                  <label className="block font-bold text-slate-700 uppercase mb-1">WhatsApp Number</label>
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
                  <label className="block font-bold text-slate-700 uppercase mb-1">Dubai Community</label>
                  <select
                    value={formData.communityName}
                    onChange={(e) => setFormData({ ...formData, communityName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Palm Jumeirah">Palm Jumeirah</option>
                    <option value="Dubai Marina">Dubai Marina</option>
                    <option value="Downtown Dubai">Downtown Dubai</option>
                    <option value="Business Bay">Business Bay</option>
                    <option value="Jumeirah Lakes Towers">Jumeirah Lakes Towers (JLT)</option>
                    <option value="Arabian Ranches">Arabian Ranches</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Assigned Trainer</label>
                  <select
                    value={formData.assignedTrainerId}
                    onChange={(e) => setFormData({ ...formData, assignedTrainerId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    {trainers.length === 0 ? (
                      <option value="">No trainers registered yet (Unassigned)</option>
                    ) : (
                      trainers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.fullName} ({t.specialization})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Residential Address</label>
                <input
                  type="text"
                  required
                  value={formData.residentialAddress}
                  onChange={(e) => setFormData({ ...formData, residentialAddress: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
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
                  Save & Register Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {isEditModalOpen && selectedClient && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Edit Client Profile ({selectedClient.id})</h3>
                <p className="text-xs text-slate-500">Update personal details, allotted trainer, and status.</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateClient} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
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
                  <label className="block font-bold text-slate-700 uppercase mb-1">WhatsApp Number</label>
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
                  <label className="block font-bold text-slate-700 uppercase mb-1">Dubai Community</label>
                  <select
                    value={formData.communityName}
                    onChange={(e) => setFormData({ ...formData, communityName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Palm Jumeirah">Palm Jumeirah</option>
                    <option value="Dubai Marina">Dubai Marina</option>
                    <option value="Downtown Dubai">Downtown Dubai</option>
                    <option value="Business Bay">Business Bay</option>
                    <option value="Jumeirah Lakes Towers">Jumeirah Lakes Towers (JLT)</option>
                    <option value="Arabian Ranches">Arabian Ranches</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Assigned Trainer</label>
                  <select
                    value={formData.assignedTrainerId}
                    onChange={(e) => setFormData({ ...formData, assignedTrainerId: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-semibold"
                  >
                    {trainers.length === 0 ? (
                      <option value="">No trainers registered yet (Unassigned)</option>
                    ) : (
                      trainers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.fullName} ({t.specialization})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Residential Address</label>
                <input
                  type="text"
                  required
                  value={formData.residentialAddress}
                  onChange={(e) => setFormData({ ...formData, residentialAddress: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Trainer / Health Notes</label>
                <textarea
                  rows={2}
                  value={formData.additionalNotes}
                  onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  placeholder="Additional health or progress notes..."
                />
              </div>

              {/* Security & Portal Access - Change / Create Password (Admin Only) */}
              {currentUser?.role === 'admin' && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-2xl border border-purple-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-purple-600 text-white rounded-lg shadow-2xs">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-xs">Client Login Password (Admin Only)</h4>
                        <p className="text-[11px] text-slate-500">Change or create credentials for this client portal account.</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200/60 text-purple-900 border border-purple-300">
                      Security
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <div className="relative flex-1">
                      <input
                        type={showClientPassword ? 'text' : 'password'}
                        value={clientPassword}
                        onChange={(e) => setClientPassword(e.target.value)}
                        className="w-full pl-3 pr-9 py-2 text-xs font-mono font-bold bg-white rounded-xl border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter new password (min 4 chars)..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowClientPassword(!showClientPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title={showClientPassword ? 'Hide password' : 'Show password'}
                      >
                        {showClientPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const generated = `WW-${Math.floor(1000 + Math.random() * 9000)}!`;
                        setClientPassword(generated);
                        setShowClientPassword(true);
                      }}
                      className="px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl transition-colors cursor-pointer shrink-0 shadow-2xs"
                      title="Generate a random secure password"
                    >
                      Generate Key
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const res = setUserPassword(selectedClient.id, clientPassword);
                        setPasswordFeedback(res.message);
                        setTimeout(() => setPasswordFeedback(''), 3000);
                      }}
                      className="px-3.5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors cursor-pointer shrink-0 shadow-sm"
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
              )}

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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Health & Illness Declaration Signature Modal */}
      {isHealthModalOpen && currentSelectedClient && (
        <HealthDeclarationModal
          client={currentSelectedClient}
          isOpen={isHealthModalOpen}
          onClose={() => setIsHealthModalOpen(false)}
        />
      )}

      {/* Add / Edit Health Condition Note Modal */}
      {isAddIssueModalOpen && currentSelectedClient && (
        <AddHealthIssueModal
          clientId={currentSelectedClient.id}
          clientName={currentSelectedClient.fullName}
          isOpen={isAddIssueModalOpen}
          onClose={() => {
            setIsAddIssueModalOpen(false);
            setEditingIssue(undefined);
          }}
          initialNote={editingIssue}
        />
      )}
    </div>
  );
};

