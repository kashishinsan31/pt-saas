import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Dumbbell,
  UserCheck,
  UserPlus,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  ArrowRight,
  User as UserIcon,
} from 'lucide-react';
import { User } from '../../types';

export const LoginPage: React.FC = () => {
  const { users, clients, trainers, setCurrentUser, addClient, logAudit } = useApp();

  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Sign In Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Client Registration Form State
  const [regForm, setRegForm] = useState({
    fullName: '',
    email: '',
    password: '',
    whatsappNumber: '+971 50 ',
    dateOfBirth: '1995-06-15',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    communityName: 'Dubai Marina',
    residentialAddress: 'Villa 14, St 12',
    assignedTrainerId: trainers[0]?.id || 'WW-TR-2001',
    emergencyName: '',
    emergencyRelationship: 'Family',
    emergencyPhone: '',
  });

  const [regSuccessMessage, setRegSuccessMessage] = useState('');
  const [regErrorMessage, setRegErrorMessage] = useState('');

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // 1. Primary lookup in users
    let matchedUser = users.find((u) => u.email.trim().toLowerCase() === cleanEmail);

    // 2. Resilient fallback lookup in clients (auto-reconcile user session if missing in users)
    if (!matchedUser) {
      const matchedClient = clients.find((c) => c.email.trim().toLowerCase() === cleanEmail);
      if (matchedClient) {
        matchedUser = {
          id: `USR-CL-${matchedClient.id.replace('WW-CL-', '')}`,
          email: matchedClient.email.trim().toLowerCase(),
          role: 'client',
          name: matchedClient.fullName,
          password: matchedClient.password || 'Dubai2026!',
          associatedId: matchedClient.id,
          createdAt: new Date().toISOString(),
        };
      }
    }

    // 3. Resilient fallback lookup in trainers
    if (!matchedUser) {
      const matchedTrainer = trainers.find((t) => t.email.trim().toLowerCase() === cleanEmail);
      if (matchedTrainer) {
        matchedUser = {
          id: `USR-TR-${matchedTrainer.id.replace('WW-TR-', '')}`,
          email: matchedTrainer.email.trim().toLowerCase(),
          role: 'trainer',
          name: matchedTrainer.fullName,
          password: matchedTrainer.password || 'Dubai2026!',
          associatedId: matchedTrainer.id,
          createdAt: new Date().toISOString(),
        };
      }
    }

    if (matchedUser) {
      const validPassword = matchedUser.password || 'Dubai2026!';
      if (cleanPassword && cleanPassword !== validPassword) {
        setErrorMessage(
          'Incorrect password. If your account was registered by an Admin, initial password is set by Admin (default: Dubai2026!).'
        );
        return;
      }
      setCurrentUser(matchedUser);
      logAudit('LOGIN_SUCCESS', `User ${matchedUser.email} (${matchedUser.role}) authenticated successfully.`);
    } else {
      setErrorMessage(
        'No user account found with this email. If you were recently registered by an Admin, check your email spelling or register a new client profile below.'
      );
    }
  };

  const handleClientRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegErrorMessage('');
    setRegSuccessMessage('');

    if (!regForm.fullName || !regForm.email || !regForm.whatsappNumber) {
      setRegErrorMessage('Please complete all required fields (Full Name, Email, WhatsApp Number).');
      return;
    }

    const cleanEmail = regForm.email.trim().toLowerCase();
    const cleanPassword = regForm.password.trim() || 'Dubai2026!';

    // Check if email already exists in users or clients
    const existingUser = users.find((u) => u.email.trim().toLowerCase() === cleanEmail);
    const existingClient = clients.find((c) => c.email.trim().toLowerCase() === cleanEmail);
    if (existingUser || existingClient) {
      setRegErrorMessage('An account with this email address already exists. Please sign in instead.');
      return;
    }

    try {
      // 1. Create Client Record with assigned password
      const newClient = addClient({
        fullName: regForm.fullName.trim(),
        email: cleanEmail,
        password: cleanPassword,
        whatsappNumber: regForm.whatsappNumber.trim(),
        dateOfBirth: regForm.dateOfBirth || '1995-01-01',
        gender: regForm.gender,
        residentialAddress: regForm.residentialAddress || 'Dubai, UAE',
        communityName: regForm.communityName || 'Dubai Marina',
        assignedTrainerId: regForm.assignedTrainerId || trainers[0]?.id || 'WW-TR-2001',
        emergencyContact: {
          name: regForm.emergencyName || 'Family Member',
          relationship: regForm.emergencyRelationship || 'Family',
          phone: regForm.emergencyPhone || regForm.whatsappNumber,
        },
      });

      // 2. Prepare User session object
      const newUserObj: User = {
        id: `USR-CL-${newClient.id.replace('WW-CL-', '')}`,
        email: cleanEmail,
        role: 'client',
        name: regForm.fullName.trim(),
        password: cleanPassword,
        associatedId: newClient.id,
        createdAt: new Date().toISOString(),
      };

      setRegSuccessMessage(
        `Registration successful! Welcome ${newClient.fullName} (${newClient.id}). Logging you in...`
      );

      setTimeout(() => {
        setCurrentUser(newUserObj);
        logAudit('CLIENT_SELF_REGISTRATION', `Client ${newClient.fullName} (${newClient.id}) registered independently.`);
      }, 1000);
    } catch (err: any) {
      setRegErrorMessage('Failed to register account. Please try again.');
    }
  };

  const dubaiCommunities = [
    'Dubai Marina',
    'Palm Jumeirah',
    'Downtown Dubai',
    'Business Bay',
    'Arabian Ranches',
    'Jumeirah Beach Residence (JBR)',
    'Jumeirah Golf Estates',
    'Emirates Hills',
    'Dubai Hills Estate',
    'Jumeirah Village Circle (JVC)',
    'Mirdif',
    'Al Barsha',
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full filter blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full filter blur-3xl pointer-events-none"></div>

      {/* Header Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center">
          <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-xl flex items-center justify-center">
            <Dumbbell className="w-8 h-8 stroke-[2.5]" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-black text-white tracking-tight">
          WAITER WALK
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Personal Training Management System • Dubai, UAE
        </p>
      </div>

      {/* Main Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg z-10 px-4">
        <div className="bg-white shadow-2xl rounded-2xl border border-slate-100 overflow-hidden">
          
          {/* Auth Navigation Tabs */}
          <div className="grid grid-cols-2 border-b border-slate-100 bg-slate-50 p-1.5">
            <button
              type="button"
              onClick={() => setAuthMode('LOGIN')}
              className={`py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                authMode === 'LOGIN'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Sign In to Portal</span>
            </button>

            <button
              type="button"
              onClick={() => setAuthMode('REGISTER')}
              className={`py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                authMode === 'REGISTER'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Register as New Client</span>
            </button>
          </div>

          <div className="py-7 px-6 sm:px-10">
            {/* SIGN IN VIEW */}
            {authMode === 'LOGIN' && (
              <div className="space-y-6">
                <div className="text-center pb-2">
                  <h3 className="text-lg font-extrabold text-slate-900">Sign in to your account</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Access Admin, Trainer, or Client portal</p>
                </div>

                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">
                    {errorMessage}
                  </div>
                )}

                {forgotSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl p-3">
                    Password reset link has been sent to your registered email address.
                  </div>
                )}

                <form onSubmit={handleCustomLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <div className="relative rounded-lg shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@waiterwalk.ae"
                        className="block w-full pl-10 pr-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Password
                    </label>
                    <div className="relative rounded-lg shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full pl-10 pr-10 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                      <span className="font-semibold text-slate-600">Client tip:</span>
                      <span>Initial password for accounts registered by Admin is <code className="bg-slate-100 text-blue-700 px-1 py-0.5 rounded font-mono font-bold">Dubai2026!</code></span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center space-x-2 text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span>Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setForgotSuccess(true)}
                      className="text-blue-600 hover:underline font-bold"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors cursor-pointer"
                  >
                    Sign In to Portal
                  </button>
                </form>

                {/* Quick Register Switch Prompt */}
                <div className="text-center pt-2">
                  <span className="text-xs text-slate-500">Don't have a personal training account yet? </span>
                  <button
                    type="button"
                    onClick={() => setAuthMode('REGISTER')}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Register as Client
                  </button>
                </div>
              </div>
            )}

            {/* REGISTER CLIENT VIEW */}
            {authMode === 'REGISTER' && (
              <div className="space-y-5">
                <div className="text-center pb-2">
                  <h3 className="text-lg font-extrabold text-slate-900">Create Client Profile</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Register for personal training sessions in Dubai</p>
                </div>

                {regErrorMessage && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">
                    {regErrorMessage}
                  </div>
                )}

                {regSuccessMessage && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3 flex items-center space-x-2 font-bold">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>{regSuccessMessage}</span>
                  </div>
                )}

                <form onSubmit={handleClientRegisterSubmit} className="space-y-4 text-xs">
                  {/* Full Name & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 uppercase mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={regForm.fullName}
                        onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                        placeholder="e.g. Tariq Mansoor"
                        className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 uppercase mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={regForm.email}
                        onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                        placeholder="tariq@example.ae"
                        className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                      />
                    </div>
                  </div>

                  {/* Password & WhatsApp */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 uppercase mb-1">
                        Create Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        required
                        value={regForm.password}
                        onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 uppercase mb-1">
                        WhatsApp Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={regForm.whatsappNumber}
                        onChange={(e) => setRegForm({ ...regForm, whatsappNumber: e.target.value })}
                        placeholder="+971 50 123 4567"
                        className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                      />
                    </div>
                  </div>

                  {/* DOB & Gender */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 uppercase mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={regForm.dateOfBirth}
                        onChange={(e) => setRegForm({ ...regForm, dateOfBirth: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 uppercase mb-1">Gender</label>
                      <select
                        value={regForm.gender}
                        onChange={(e) => setRegForm({ ...regForm, gender: e.target.value as any })}
                        className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none bg-white"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other / Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  {/* Dubai Community Location */}
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      Dubai Community / Area
                    </label>
                    <select
                      value={regForm.communityName}
                      onChange={(e) => setRegForm({ ...regForm, communityName: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none bg-white font-semibold"
                    >
                      {dubaiCommunities.map((comm) => (
                        <option key={comm} value={comm}>
                          {comm}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Residential Address */}
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Residential Address</label>
                    <input
                      type="text"
                      value={regForm.residentialAddress}
                      onChange={(e) => setRegForm({ ...regForm, residentialAddress: e.target.value })}
                      placeholder="e.g. Villa 14, Street 12, Sector 3"
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                    />
                  </div>

                  {/* Trainer Preferred Selection */}
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      Select Preferred Personal Trainer
                    </label>
                    <select
                      value={regForm.assignedTrainerId}
                      onChange={(e) => setRegForm({ ...regForm, assignedTrainerId: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none bg-white font-semibold"
                    >
                      {trainers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.fullName} ({t.specialization})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 space-y-2">
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center space-x-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors cursor-pointer"
                    >
                      <span>Complete Registration & Enter Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setAuthMode('LOGIN')}
                      className="w-full text-center py-2 text-xs font-bold text-slate-600 hover:text-blue-600"
                    >
                      Already have an account? Sign in here
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
