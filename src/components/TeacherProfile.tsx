import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, addDoc, collection, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Teacher } from '../types';
import { Save, ArrowLeft, Calendar, User, Briefcase, CreditCard, Lock, Calculator, Upload, X } from 'lucide-react';
import { calculateRetirementDate, calculateExperience } from '../lib/retirement';
import { format, parseISO } from 'date-fns';

export default function TeacherProfile({ isAdmin }: { isAdmin: boolean }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(id !== 'new');
  const [saving, setSaving] = useState(false);
  const [teacher, setTeacher] = useState<Partial<Teacher>>({
    name: '',
    penNumber: '',
    gender: 'Male',
    panNumber: '',
    aadhaarNumber: '',
    pfNumber: '',
    designation: 'LPST',
    subject: '',
    mobile: '',
    email: '',
    bankAccountNumber: '',
    branch: '',
    ifscCode: '',
    electionId: '',
    dob: '',
    doj: '',
    dor: '',
    taxRegime: 'New',
    category: 'Below 60',
    basicPay: 0,
    signatureUrl: '',
  });

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTeacher({ ...teacher, signatureUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (id && id !== 'new') {
      fetchTeacher();
    }
  }, [id]);

  async function fetchTeacher() {
    try {
      const docRef = doc(db, 'teachers', id!);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setTeacher({ id: docSnap.id, ...docSnap.data() } as Teacher);
      }
    } catch (error) {
      console.error("Error fetching teacher:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleDateChange = (field: 'dob' | 'doj', value: string) => {
    const updatedTeacher = { ...teacher, [field]: value };
    
    if (updatedTeacher.dob && updatedTeacher.doj) {
      const dor = calculateRetirementDate(
        parseISO(updatedTeacher.dob),
        parseISO(updatedTeacher.doj),
        true // Assuming all are teachers for now
      );
      updatedTeacher.dor = format(dor, 'yyyy-MM-dd');
    }
    
    setTeacher(updatedTeacher);
  };

  async function handleSave() {
    setSaving(true);
    try {
      if (id === 'new') {
        const docRef = await addDoc(collection(db, 'teachers'), teacher);
        
        // Log activity
        await addDoc(collection(db, 'activities'), {
          type: 'create',
          description: `Created teacher profile for ${teacher.name}`,
          userId: auth.currentUser?.uid,
          userName: auth.currentUser?.displayName || 'Unknown User',
          timestamp: new Date().toISOString()
        });
      } else {
        await updateDoc(doc(db, 'teachers', id!), teacher);

        // Log activity
        await addDoc(collection(db, 'activities'), {
          type: 'update',
          description: `Updated teacher profile for ${teacher.name}`,
          userId: auth.currentUser?.uid,
          userName: auth.currentUser?.displayName || 'Unknown User',
          timestamp: new Date().toISOString()
        });
      }
      navigate('/admin/teachers');
    } catch (error) {
      console.error("Error saving teacher:", error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-blue-600">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{id === 'new' ? 'Create Teacher Profile' : 'Edit Teacher Profile'}</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Saving...' : 'Save Profile'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Personal Info */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
          <div className="flex items-center space-x-2 text-blue-600 font-bold mb-4">
            <User className="h-5 w-5" />
            <span>Personal Information</span>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Full Name</label>
              <input
                type="text"
                value={teacher.name || ''}
                onChange={e => setTeacher({ ...teacher, name: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Father's Name</label>
              <input
                type="text"
                value={teacher.fatherName || ''}
                onChange={e => setTeacher({ ...teacher, fatherName: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">PEN Number</label>
                <input
                  type="text"
                  value={teacher.penNumber || ''}
                  onChange={e => setTeacher({ ...teacher, penNumber: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Gender</label>
                <select
                  value={teacher.gender}
                  onChange={e => setTeacher({ ...teacher, gender: e.target.value as any })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Mobile Number</label>
                <input
                  type="tel"
                  value={teacher.mobile || ''}
                  onChange={e => setTeacher({ ...teacher, mobile: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  value={teacher.email || ''}
                  onChange={e => setTeacher({ ...teacher, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">PAN Number</label>
                <input
                  type="text"
                  value={teacher.panNumber || ''}
                  onChange={e => setTeacher({ ...teacher, panNumber: e.target.value.toUpperCase() })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Aadhaar Number</label>
                <input
                  type="text"
                  value={teacher.aadhaarNumber || ''}
                  onChange={e => setTeacher({ ...teacher, aadhaarNumber: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Signature Image</label>
              <div className="flex items-center space-x-4">
                {teacher.signatureUrl ? (
                  <div className="relative">
                    <img src={teacher.signatureUrl} alt="Signature" className="h-12 border border-gray-200 rounded p-1" referrerPolicy="no-referrer" />
                    <button
                      onClick={() => setTeacher({ ...teacher, signatureUrl: '' })}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center w-full h-12 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50">
                    <div className="flex items-center space-x-2 text-gray-500">
                      <Upload className="h-4 w-4" />
                      <span className="text-sm">Upload Signature</span>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleSignatureUpload} />
                  </label>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Professional Info */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
          <div className="flex items-center space-x-2 text-purple-600 font-bold mb-4">
            <Briefcase className="h-5 w-5" />
            <span>Professional Information</span>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Designation</label>
                <select
                  value={teacher.designation}
                  onChange={e => setTeacher({ ...teacher, designation: e.target.value as any })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="LPST">LPST</option>
                  <option value="UPST">UPST</option>
                  <option value="HST">HST</option>
                  <option value="VHSE">VHSE</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Subject</label>
                <input
                  type="text"
                  value={teacher.subject || ''}
                  onChange={e => setTeacher({ ...teacher, subject: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">PF Number</label>
              <input
                type="text"
                value={teacher.pfNumber || ''}
                onChange={e => setTeacher({ ...teacher, pfNumber: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Increment Month</label>
                <select
                  value={teacher.incrementMonth || ''}
                  onChange={e => setTeacher({ ...teacher, incrementMonth: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Month</option>
                  {['March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Increment Amount (₹)</label>
                <input
                  type="number"
                  value={teacher.incrementAmount || 0}
                  onChange={e => setTeacher({ ...teacher, incrementAmount: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Current Basic Pay (₹)</label>
              <input
                type="number"
                value={teacher.basicPay || 0}
                onChange={e => setTeacher({ ...teacher, basicPay: parseInt(e.target.value) || 0 })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg"
              />
            </div>
          </div>
        </section>

        {/* Dates & Retirement */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
          <div className="flex items-center space-x-2 text-green-600 font-bold mb-4">
            <Calendar className="h-5 w-5" />
            <span>Service & Retirement</span>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={teacher.dob || ''}
                  onChange={e => handleDateChange('dob', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Date of Joining</label>
                <input
                  type="date"
                  value={teacher.doj || ''}
                  onChange={e => handleDateChange('doj', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">Retirement Date (DOR):</span>
                <span className="text-sm font-bold text-gray-900">{teacher.dor ? format(parseISO(teacher.dor), 'dd MMMM yyyy') : 'Auto-calculated'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Experience:</span>
                <span className="text-sm font-bold text-gray-900">{teacher.doj ? calculateExperience(parseISO(teacher.doj)) : 'N/A'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Bank & Security */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
          <div className="flex items-center space-x-2 text-amber-600 font-bold mb-4">
            <CreditCard className="h-5 w-5" />
            <span>Bank & Security</span>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Bank Account Number</label>
              <input
                type="text"
                value={teacher.bankAccountNumber || ''}
                onChange={e => setTeacher({ ...teacher, bankAccountNumber: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Branch</label>
                <input
                  type="text"
                  value={teacher.branch || ''}
                  onChange={e => setTeacher({ ...teacher, branch: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={teacher.ifscCode || ''}
                  onChange={e => setTeacher({ ...teacher, ifscCode: e.target.value.toUpperCase() })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1 flex items-center">
                <Lock className="h-3 w-3 mr-1" /> Password (Optional)
              </label>
              <input
                type="text"
                value={teacher.password || ''}
                onChange={e => setTeacher({ ...teacher, password: e.target.value })}
                placeholder="Leave blank to keep current"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Tax Preferences */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4 md:col-span-2">
          <div className="flex items-center space-x-2 text-red-600 font-bold mb-4">
            <Calculator className="h-5 w-5" />
            <span>Tax Preferences</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Tax Regime</label>
              <select
                value={teacher.taxRegime}
                onChange={e => setTeacher({ ...teacher, taxRegime: e.target.value as any })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="New">New Regime</option>
                <option value="Old">Old Regime</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Category</label>
              <select
                value={teacher.category}
                onChange={e => setTeacher({ ...teacher, category: e.target.value as any })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Below 60">Below 60 Years</option>
                <option value="Above 60">Above 60 Years</option>
                <option value="Senior Citizen">Senior Citizen (80+)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Election ID</label>
              <input
                type="text"
                value={teacher.electionId || ''}
                onChange={e => setTeacher({ ...teacher, electionId: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
