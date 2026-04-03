import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, writeBatch } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { FinancialYear, TaxSlab } from '../types';
import { Plus, Trash2, Edit2, CheckCircle, XCircle, Save, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

const MONTHS = ['March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February'];

const DEFAULT_SLABS: TaxSlab[] = [
  { min: 0, max: 400000, rate: 0 },
  { min: 400000, max: 800000, rate: 5 },
  { min: 800000, max: 1200000, rate: 10 },
  { min: 1200000, max: 1600000, rate: 15 },
  { min: 1600000, max: 2000000, rate: 20 },
  { min: 2000000, max: 2400000, rate: 25 },
  { min: 2400000, max: null, rate: 30 },
];

const DEFAULT_OLD_SLABS: TaxSlab[] = [
  { min: 0, max: 250000, rate: 0 },
  { min: 250000, max: 500000, rate: 5 },
  { min: 500000, max: 1000000, rate: 20 },
  { min: 1000000, max: null, rate: 30 },
];

export default function FinancialYearManager() {
  const [fys, setFys] = useState<FinancialYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFy, setEditingFy] = useState<Partial<FinancialYear> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchFys();
  }, []);

  async function fetchFys() {
    setLoading(true);
    try {
      const q = query(collection(db, 'financialYears'), orderBy('year', 'desc'));
      const snapshot = await getDocs(q);
      setFys(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialYear)));
    } catch (error) {
      console.error("Error fetching FYs:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!editingFy?.year || !editingFy?.schoolName) {
      setNotification({ message: 'Year and School Name are required', type: 'error' });
      return;
    }

    try {
      const dataToSave = {
        ...editingFy,
        isActive: editingFy.isActive || false,
        newRegimeSlabs: editingFy.newRegimeSlabs || DEFAULT_SLABS,
        oldRegimeSlabs: editingFy.oldRegimeSlabs || DEFAULT_OLD_SLABS,
        monthlyConfig: editingFy.monthlyConfig || MONTHS.map(m => ({ month: m, daPercent: 0, hraPercent: 0 })),
        standardDeduction: editingFy.standardDeduction || 75000,
        standardDeductionOld: editingFy.standardDeductionOld || 50000,
        rebateLimit: editingFy.rebateLimit || 1200000,
        rebateAmount: editingFy.rebateAmount || 60000,
        rebateLimitOld: editingFy.rebateLimitOld || 500000,
        rebateAmountOld: editingFy.rebateAmountOld || 12500,
        deductionLimits: editingFy.deductionLimits || { section80C: 150000, section80D: 25000, section80G: 0, other: 0 },
      };

      if (editingFy.id) {
        await updateDoc(doc(db, 'financialYears', editingFy.id), dataToSave);
        
        // Log activity
        await addDoc(collection(db, 'activities'), {
          type: 'update',
          description: `Updated financial year ${dataToSave.year}`,
          userId: auth.currentUser?.uid,
          userName: auth.currentUser?.displayName || 'Unknown User',
          timestamp: new Date().toISOString()
        });

        setNotification({ message: 'Financial Year updated successfully', type: 'success' });
      } else {
        await addDoc(collection(db, 'financialYears'), dataToSave);

        // Log activity
        await addDoc(collection(db, 'activities'), {
          type: 'create',
          description: `Created financial year ${dataToSave.year}`,
          userId: auth.currentUser?.uid,
          userName: auth.currentUser?.displayName || 'Unknown User',
          timestamp: new Date().toISOString()
        });

        setNotification({ message: 'Financial Year created successfully', type: 'success' });
      }
      setIsModalOpen(false);
      setEditingFy(null);
      fetchFys();
    } catch (error) {
      console.error("Error saving FY:", error);
      setNotification({ message: 'Error saving Financial Year', type: 'error' });
    }
  }

  async function handleActivate(id: string) {
    if (!confirm("Are you sure you want to set this financial year as active?")) return;
    try {
      const batch = writeBatch(db);
      fys.forEach(fy => {
        batch.update(doc(db, 'financialYears', fy.id!), { isActive: fy.id === id });
      });
      await batch.commit();

      // Log activity
      await addDoc(collection(db, 'activities'), {
        type: 'update',
        description: `Activated financial year ${fys.find(f => f.id === id)?.year}`,
        userId: auth.currentUser?.uid,
        userName: auth.currentUser?.displayName || 'Unknown User',
        timestamp: new Date().toISOString()
      });

      setNotification({ message: 'Financial Year activated', type: 'success' });
      fetchFys();
    } catch (error) {
      console.error("Error activating FY:", error);
      setNotification({ message: 'Error activating Financial Year', type: 'error' });
    }
  }

  async function handleDelete(id: string) {
    const fy = fys.find(f => f.id === id);
    if (fy?.isActive) {
      setNotification({ message: 'Cannot delete an active Financial Year', type: 'error' });
      return;
    }
    if (!confirm("Are you sure you want to delete this financial year? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, 'financialYears', id));

      // Log activity
      await addDoc(collection(db, 'activities'), {
        type: 'delete',
        description: `Deleted financial year ${fy?.year}`,
        userId: auth.currentUser?.uid,
        userName: auth.currentUser?.displayName || 'Unknown User',
        timestamp: new Date().toISOString()
      });

      setNotification({ message: 'Financial Year deleted successfully', type: 'success' });
      fetchFys();
    } catch (error) {
      console.error("Error deleting FY:", error);
      setNotification({ message: 'Error deleting Financial Year', type: 'error' });
    }
  }

  return (
    <div className="space-y-6">
      {notification && (
        <div className={cn(
          "fixed top-4 right-4 z-[100] p-4 rounded-xl shadow-lg flex items-center space-x-3 animate-in fade-in slide-in-from-top-4",
          notification.type === 'success' ? "bg-green-600 text-white" : "bg-red-600 text-white"
        )}>
          {notification.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span className="font-medium">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-4 hover:opacity-80"><XCircle className="h-4 w-4" /></button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Financial Years</h1>
        <button
          onClick={() => {
            const activeFy = fys.find(f => f.isActive);
            setEditingFy({ 
              year: '', 
              schoolName: activeFy?.schoolName || '', 
              monthlyConfig: MONTHS.map(m => ({ month: m, daPercent: 0, hraPercent: 0 })),
              newRegimeSlabs: DEFAULT_SLABS,
              oldRegimeSlabs: DEFAULT_OLD_SLABS,
              standardDeduction: 75000,
              standardDeductionOld: 50000,
              rebateLimit: 1200000,
              rebateAmount: 60000,
              rebateLimitOld: 500000,
              rebateAmountOld: 12500,
              deductionLimits: { section80C: 150000, section80D: 25000, section80G: 0, other: 0 },
              hmName: activeFy?.hmName || '',
              hmPan: activeFy?.hmPan || '',
              hmTan: activeFy?.hmTan || '',
              hmFatherName: activeFy?.hmFatherName || '',
              place: activeFy?.place || '',
              hmMobile: activeFy?.hmMobile || '',
              hmEmail: activeFy?.hmEmail || '',
              principalName: activeFy?.principalName || '',
              principalFatherName: activeFy?.principalFatherName || '',
              principalPan: activeFy?.principalPan || '',
              principalTan: activeFy?.principalTan || '',
              principalMobile: activeFy?.principalMobile || '',
              principalEmail: activeFy?.principalEmail || '',
              schoolMail: activeFy?.schoolMail || '',
            });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add New FY</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {fys.map((fy) => (
              <tr key={fy.id} className={cn(fy.isActive && "bg-blue-50/30")}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{fy.year}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{fy.schoolName}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {fy.isActive ? (
                    <span className="flex items-center text-green-600 text-xs font-bold uppercase">
                      <CheckCircle className="h-4 w-4 mr-1" /> Active
                    </span>
                  ) : (
                    <button
                      onClick={() => handleActivate(fy.id!)}
                      className="text-gray-400 hover:text-blue-600 text-xs font-medium uppercase"
                    >
                      Set Active
                    </button>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                  <button onClick={() => { setEditingFy(fy); setIsModalOpen(true); }} className="text-blue-600 hover:text-blue-900">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(fy.id!)} className="text-red-600 hover:text-red-900">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">{editingFy?.id ? 'Edit' : 'Add'} Financial Year</h2>
              <button onClick={() => setIsModalOpen(false)}><XCircle className="h-6 w-6 text-gray-400" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Financial Year (e.g. 2025-26)</label>
                <input
                  type="text"
                  value={editingFy?.year || ''}
                  onChange={e => setEditingFy({ ...editingFy, year: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
                <input
                  type="text"
                  value={editingFy?.schoolName || ''}
                  onChange={e => setEditingFy({ ...editingFy, schoolName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">School & HM Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">HM Name</label>
                  <input type="text" value={editingFy?.hmName || ''} onChange={e => setEditingFy({...editingFy, hmName: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">HM PAN Number</label>
                  <input type="text" value={editingFy?.hmPan || ''} onChange={e => setEditingFy({...editingFy, hmPan: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">HM TAN Number</label>
                  <input type="text" value={editingFy?.hmTan || ''} onChange={e => setEditingFy({...editingFy, hmTan: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">HM Father Name</label>
                  <input type="text" value={editingFy?.hmFatherName || ''} onChange={e => setEditingFy({...editingFy, hmFatherName: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Place</label>
                  <input type="text" value={editingFy?.place || ''} onChange={e => setEditingFy({...editingFy, place: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">HM Mobile</label>
                  <input type="text" value={editingFy?.hmMobile || ''} onChange={e => setEditingFy({...editingFy, hmMobile: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">HM Email</label>
                  <input type="email" value={editingFy?.hmEmail || ''} onChange={e => setEditingFy({...editingFy, hmEmail: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">School Mail</label>
                  <input type="email" value={editingFy?.schoolMail || ''} onChange={e => setEditingFy({...editingFy, schoolMail: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Principal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Principal Name</label>
                  <input type="text" value={editingFy?.principalName || ''} onChange={e => setEditingFy({...editingFy, principalName: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Principal Father Name</label>
                  <input type="text" value={editingFy?.principalFatherName || ''} onChange={e => setEditingFy({...editingFy, principalFatherName: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Principal PAN</label>
                  <input type="text" value={editingFy?.principalPan || ''} onChange={e => setEditingFy({...editingFy, principalPan: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Principal TAN</label>
                  <input type="text" value={editingFy?.principalTan || ''} onChange={e => setEditingFy({...editingFy, principalTan: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Principal Mobile</label>
                  <input type="text" value={editingFy?.principalMobile || ''} onChange={e => setEditingFy({...editingFy, principalMobile: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Principal Email</label>
                  <input type="email" value={editingFy?.principalEmail || ''} onChange={e => setEditingFy({...editingFy, principalEmail: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Monthly DA & HRA Configuration</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {MONTHS.map((month, idx) => {
                  const config = editingFy?.monthlyConfig?.find(c => c.month === month || c.month === month.substring(0, 3)) || { month, daPercent: 0, hraPercent: 0 };
                  return (
                    <div key={month} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <span className="text-sm font-bold text-gray-700 block mb-2">{month}</span>
                      <div className="space-y-2">
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase block">DA %</span>
                          <input
                            type="number"
                            value={config.daPercent}
                            onChange={e => {
                              const newConfigs = [...(editingFy?.monthlyConfig || MONTHS.map(m => ({ month: m, daPercent: 0, hraPercent: 0 })))];
                              const targetIdx = newConfigs.findIndex(c => c.month === month);
                              newConfigs[targetIdx].daPercent = parseFloat(e.target.value) || 0;
                              setEditingFy({ ...editingFy, monthlyConfig: newConfigs });
                            }}
                            className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase block">HRA %</span>
                          <input
                            type="number"
                            value={config.hraPercent}
                            onChange={e => {
                              const newConfigs = [...(editingFy?.monthlyConfig || MONTHS.map(m => ({ month: m, daPercent: 0, hraPercent: 0 })))];
                              const targetIdx = newConfigs.findIndex(c => c.month === month);
                              newConfigs[targetIdx].hraPercent = parseFloat(e.target.value) || 0;
                              setEditingFy({ ...editingFy, monthlyConfig: newConfigs });
                            }}
                            className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h3 className="text-sm font-bold text-blue-900 mb-4 uppercase tracking-wider">New Regime Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1">Standard Deduction (New)</label>
                    <input
                      type="number"
                      value={editingFy?.standardDeduction || 0}
                      onChange={e => setEditingFy({ ...editingFy, standardDeduction: parseInt(e.target.value) || 0 })}
                      className="w-full border border-blue-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-blue-700 mb-1">Rebate Limit</label>
                      <input
                        type="number"
                        value={editingFy?.rebateLimit || 0}
                        onChange={e => setEditingFy({ ...editingFy, rebateLimit: parseInt(e.target.value) || 0 })}
                        className="w-full border border-blue-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-blue-700 mb-1">Rebate Amount</label>
                      <input
                        type="number"
                        value={editingFy?.rebateAmount || 0}
                        onChange={e => setEditingFy({ ...editingFy, rebateAmount: parseInt(e.target.value) || 0 })}
                        className="w-full border border-blue-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                <h3 className="text-sm font-bold text-amber-900 mb-4 uppercase tracking-wider">Old Regime Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-amber-700 mb-1">Standard Deduction (Old)</label>
                    <input
                      type="number"
                      value={editingFy?.standardDeductionOld || 0}
                      onChange={e => setEditingFy({ ...editingFy, standardDeductionOld: parseInt(e.target.value) || 0 })}
                      className="w-full border border-amber-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-amber-700 mb-1">Rebate Limit</label>
                      <input
                        type="number"
                        value={editingFy?.rebateLimitOld || 0}
                        onChange={e => setEditingFy({ ...editingFy, rebateLimitOld: parseInt(e.target.value) || 0 })}
                        className="w-full border border-amber-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-amber-700 mb-1">Rebate Amount</label>
                      <input
                        type="number"
                        value={editingFy?.rebateAmountOld || 0}
                        onChange={e => setEditingFy({ ...editingFy, rebateAmountOld: parseInt(e.target.value) || 0 })}
                        className="w-full border border-amber-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-amber-700 mb-1">Max 80C Deduction</label>
                      <input
                        type="number"
                        value={editingFy?.deductionLimits?.section80C || 150000}
                        onChange={e => setEditingFy({ 
                          ...editingFy, 
                          deductionLimits: { 
                            ...(editingFy?.deductionLimits || { section80C: 150000, section80D: 25000, section80G: 0, other: 0 }), 
                            section80C: parseInt(e.target.value) || 0 
                          } 
                        })}
                        className="w-full border border-amber-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-amber-700 mb-1">Max 80D Deduction</label>
                      <input
                        type="number"
                        value={editingFy?.deductionLimits?.section80D || 25000}
                        onChange={e => setEditingFy({ 
                          ...editingFy, 
                          deductionLimits: { 
                            ...(editingFy?.deductionLimits || { section80C: 150000, section80D: 25000, section80G: 0, other: 0 }), 
                            section80D: parseInt(e.target.value) || 0 
                          } 
                        })}
                        className="w-full border border-amber-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">New Regime Slabs</h3>
                <div className="space-y-3">
                  {(editingFy?.newRegimeSlabs || DEFAULT_SLABS).map((slab, idx) => (
                    <div key={idx} className="flex items-center space-x-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <span className="text-[10px] text-gray-500 block">Min</span>
                        <input
                          type="number"
                          value={slab.min}
                          onChange={e => {
                            const newSlabs = [...(editingFy?.newRegimeSlabs || DEFAULT_SLABS)];
                            newSlabs[idx].min = parseInt(e.target.value) || 0;
                            setEditingFy({ ...editingFy, newRegimeSlabs: newSlabs });
                          }}
                          className="w-full bg-transparent text-xs font-medium outline-none"
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] text-gray-500 block">Max</span>
                        <input
                          type="number"
                          value={slab.max || ''}
                          placeholder="Inf"
                          onChange={e => {
                            const newSlabs = [...(editingFy?.newRegimeSlabs || DEFAULT_SLABS)];
                            newSlabs[idx].max = e.target.value ? parseInt(e.target.value) : null;
                            setEditingFy({ ...editingFy, newRegimeSlabs: newSlabs });
                          }}
                          className="w-full bg-transparent text-xs font-medium outline-none"
                        />
                      </div>
                      <div className="w-16">
                        <span className="text-[10px] text-gray-500 block">Rate %</span>
                        <input
                          type="number"
                          value={slab.rate}
                          onChange={e => {
                            const newSlabs = [...(editingFy?.newRegimeSlabs || DEFAULT_SLABS)];
                            newSlabs[idx].rate = parseFloat(e.target.value) || 0;
                            setEditingFy({ ...editingFy, newRegimeSlabs: newSlabs });
                          }}
                          className="w-full bg-transparent text-xs font-medium outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Old Regime Slabs</h3>
                <div className="space-y-3">
                  {(editingFy?.oldRegimeSlabs || DEFAULT_OLD_SLABS).map((slab, idx) => (
                    <div key={idx} className="flex items-center space-x-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <span className="text-[10px] text-gray-500 block">Min</span>
                        <input
                          type="number"
                          value={slab.min}
                          onChange={e => {
                            const newSlabs = [...(editingFy?.oldRegimeSlabs || DEFAULT_OLD_SLABS)];
                            newSlabs[idx].min = parseInt(e.target.value) || 0;
                            setEditingFy({ ...editingFy, oldRegimeSlabs: newSlabs });
                          }}
                          className="w-full bg-transparent text-xs font-medium outline-none"
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] text-gray-500 block">Max</span>
                        <input
                          type="number"
                          value={slab.max || ''}
                          placeholder="Inf"
                          onChange={e => {
                            const newSlabs = [...(editingFy?.oldRegimeSlabs || DEFAULT_OLD_SLABS)];
                            newSlabs[idx].max = e.target.value ? parseInt(e.target.value) : null;
                            setEditingFy({ ...editingFy, oldRegimeSlabs: newSlabs });
                          }}
                          className="w-full bg-transparent text-xs font-medium outline-none"
                        />
                      </div>
                      <div className="w-16">
                        <span className="text-[10px] text-gray-500 block">Rate %</span>
                        <input
                          type="number"
                          value={slab.rate}
                          onChange={e => {
                            const newSlabs = [...(editingFy?.oldRegimeSlabs || DEFAULT_OLD_SLABS)];
                            newSlabs[idx].rate = parseFloat(e.target.value) || 0;
                            setEditingFy({ ...editingFy, oldRegimeSlabs: newSlabs });
                          }}
                          className="w-full bg-transparent text-xs font-medium outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end space-x-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Save Financial Year</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
