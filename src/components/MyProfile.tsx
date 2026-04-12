import { useState, useEffect } from 'react';
import { authService } from '../api';
import { User, Mail, Phone, MapPin, Lock, Save, CheckCircle, AlertCircle, XCircle, Eye, EyeOff, Shield, Briefcase, CreditCard } from 'lucide-react';
import { cn } from '../lib/utils';

export default function MyProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Editable fields
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  
  // Professional & Bank fields
  const [designation, setDesignation] = useState('');
  const [subject, setSubject] = useState('');
  const [basicPay, setBasicPay] = useState('');
  const [taxRegime, setTaxRegime] = useState('Old');
  const [category, setCategory] = useState('State Employee');
  const [panNumber, setPanNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [pfNumber, setPfNumber] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [branch, setBranch] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [electionId, setElectionId] = useState('');
  const [dob, setDob] = useState('');
  const [doj, setDoj] = useState('');
  const [dor, setDor] = useState('');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  async function fetchProfile() {
    try {
      const data = await authService.getProfile();
      setProfile(data);
      setName(data.name || '');
      setMobile(data.teacher?.mobile || '');
      setEmail(data.teacher?.email || '');
      setAddress(data.teacher?.address || '');
      setDesignation(data.teacher?.designation || '');
      setSubject(data.teacher?.subject || '');
      setBasicPay(data.teacher?.basicPay ? String(data.teacher.basicPay) : '');
      setTaxRegime(data.teacher?.taxRegime || 'Old');
      setCategory(data.teacher?.category || 'State Employee');
      setPanNumber(data.teacher?.panNumber || '');
      setAadhaarNumber(data.teacher?.aadhaarNumber || '');
      setPfNumber(data.teacher?.pfNumber || '');
      setBankAccountNumber(data.teacher?.bankAccountNumber || '');
      setBranch(data.teacher?.branch || '');
      setIfscCode(data.teacher?.ifscCode || '');
      setElectionId(data.teacher?.electionId || '');
      setDob(data.teacher?.dob ? new Date(data.teacher.dob).toISOString().split('T')[0] : '');
      setDoj(data.teacher?.doj ? new Date(data.teacher.doj).toISOString().split('T')[0] : '');
      setDor(data.teacher?.dor ? new Date(data.teacher.dor).toISOString().split('T')[0] : '');
    } catch (error) {
      console.error("Error fetching profile:", error);
      setNotification({ message: 'Failed to load profile', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setNotification({ message: 'Name cannot be empty', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const payload: any = { 
        name, mobile, email, address,
        designation, subject, taxRegime, category,
        panNumber, aadhaarNumber, pfNumber, bankAccountNumber, branch, ifscCode, electionId
      };
      if (basicPay) payload.basicPay = Number(basicPay);
      if (dob) payload.dob = dob;
      if (doj) payload.doj = doj;
      if (dor) payload.dor = dor;
      
      const updated = await authService.updateProfile(payload);
      setProfile(updated);
      setNotification({ message: 'Profile updated successfully!', type: 'success' });
    } catch (error) {
      setNotification({ message: 'Failed to update profile: ' + (error as Error).message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setNotification({ message: 'Please fill in all password fields', type: 'error' });
      return;
    }
    if (newPassword.length < 2) {
      setNotification({ message: 'New password must be at least 2 characters', type: 'error' });
      return;
    }
    if (newPassword.length > 18) {
      setNotification({ message: 'New password must not exceed 18 characters', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setNotification({ message: 'New passwords do not match', type: 'error' });
      return;
    }
    setChangingPassword(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotification({ message: 'Password changed successfully!', type: 'success' });
    } catch (error) {
      setNotification({ message: (error as Error).message || 'Failed to change password', type: 'error' });
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const teacher = profile?.teacher;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Notification */}
      {notification && (
        <div className={cn(
          "fixed top-20 right-4 z-[100] px-5 py-3 rounded-xl shadow-lg border flex items-center space-x-3 animate-in fade-in slide-in-from-top-4 duration-300",
          notification.type === 'success'
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-red-50 border-red-200 text-red-700"
        )}>
          {notification.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span className="font-medium text-sm">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-70"><XCircle className="h-4 w-4" /></button>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3"></div>
        <div className="relative flex items-center space-x-5">
          <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-lg">
            <User className="h-10 w-10 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{profile?.name || 'My Profile'}</h1>
            <p className="text-blue-200 text-sm mt-1">
              {profile?.role === 'admin' ? 'Administrator' : `Teacher • PEN: ${profile?.penNumber || 'N/A'}`}
            </p>
            {teacher?.designation && (
              <span className="inline-block mt-2 px-3 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold uppercase tracking-wider border border-white/20">
                {teacher.designation} — {teacher.subject || 'N/A'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Edit Profile Card */}
        <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Edit Profile Details</h2>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all font-semibold text-sm shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save All Changes</span>
                </>
              )}
            </button>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                  placeholder="Enter your full name"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Mobile Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="tel"
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                  placeholder="Enter mobile number"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                  placeholder="Enter email address"
                />
              </div>
            </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <textarea
                    rows={2}
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm resize-none"
                    placeholder="Enter residential address"
                  />
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center"><Briefcase className="h-4 w-4 mr-2 text-purple-600" /> Professional & Tax Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Designation</label>
                  <input type="text" value={designation} onChange={e => setDesignation(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm" placeholder="Enter designation" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Subject</label>
                  <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm" placeholder="Enter subject" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Basic Pay</label>
                  <input type="number" value={basicPay} onChange={e => setBasicPay(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm" placeholder="e.g. 50000" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm bg-white">
                    <option value="State Employee">State Employee</option>
                    <option value="Central Employee">Central Employee</option>
                    <option value="Private Employee">Private Employee</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tax Regime</label>
                  <select value={taxRegime} onChange={e => setTaxRegime(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm bg-white">
                    <option value="Old">Old Regime (Allows deductions)</option>
                    <option value="New">New Regime (Lower rates, no deductions)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">PAN Number</label>
                  <input type="text" value={panNumber} onChange={e => setPanNumber(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm uppercase font-mono" placeholder="ABCDE1234F" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Aadhaar Number</label>
                  <input type="text" value={aadhaarNumber} onChange={e => setAadhaarNumber(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm font-mono" placeholder="1234 5678 9012" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">PF Number / PRAN</label>
                  <input type="text" value={pfNumber} onChange={e => setPfNumber(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm uppercase font-mono" placeholder="Enter PF or PRAN" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center"><CreditCard className="h-4 w-4 mr-2 text-green-600" /> Bank & Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Bank Account Number</label>
                  <input type="text" value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-sm font-mono" placeholder="Account Number" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Branch</label>
                  <input type="text" value={branch} onChange={e => setBranch(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-sm" placeholder="Bank Branch" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">IFSC Code</label>
                  <input type="text" value={ifscCode} onChange={e => setIfscCode(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-sm uppercase font-mono" placeholder="SBIN0000123" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Election ID</label>
                  <input type="text" value={electionId} onChange={e => setElectionId(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-sm uppercase font-mono" placeholder="Election ID" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Date of Birth</label>
                  <input type="date" value={dob} onChange={e => setDob(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Date of Joining</label>
                  <input type="date" value={doj} onChange={e => setDoj(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Date of Retirement</label>
                  <input type="date" value={dor} onChange={e => setDor(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-sm" />
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-8 py-2.5 rounded-xl hover:bg-blue-700 transition-all font-semibold text-sm shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Change Password Card */}
        <form onSubmit={handleChangePassword} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-amber-100 rounded-lg">
                <Shield className="h-4 w-4 text-amber-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Change Password</h2>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm"
                  placeholder="Enter current password"
                />
                <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm"
                  placeholder="Enter new password (at least 2 characters)"
                />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm"
                  placeholder="Re-enter new password"
                />
                <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" /> Passwords do not match
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={changingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
              className="w-full flex items-center justify-center space-x-2 bg-amber-600 text-white py-2.5 rounded-xl hover:bg-amber-700 transition-all font-semibold text-sm shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {changingPassword ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </div>
        </form>

            {/* Removed read only info cards since they are now in the single form */}

      </div>
    </div>
  );
}

function InfoField({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={cn("text-sm font-medium text-gray-800", mono && "font-mono")}>{value || 'N/A'}</p>
    </div>
  );
}
