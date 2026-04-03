import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, getDoc, query, where, limit, addDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import { Teacher, FinancialYear, MonthlyData, TaxStatement } from '../types';
import { Save, Printer, User, Calendar, Calculator, AlertTriangle, AlertCircle, ChevronRight, ChevronLeft, CheckCircle, Upload, Loader2, X, Users } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { calculateTax, calculateCess } from '../lib/tax';
import TaxStatementPrint from './TaxStatementPrint';

const MONTHS = [
  'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February'
];

export default function TaxCalculator({ isAdmin }: { isAdmin: boolean }) {
  const { teacherId } = useParams();
  const navigate = useNavigate();
  
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [activeFY, setActiveFY] = useState<FinancialYear | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [festivalAllowance, setFestivalAllowance] = useState(0);
  const [daArrear, setDaArrear] = useState(0);
  const [payRevisionArrear, setPayRevisionArrear] = useState(0);
  const [otherIncome, setOtherIncome] = useState(0);
  const [taxDeducted, setTaxDeducted] = useState(0);
  const [regime, setRegime] = useState<'New' | 'Old'>('New');
  
  const [incrementMonth, setIncrementMonth] = useState<string | null>(null);
  const [incrementAmount, setIncrementAmount] = useState(0);
  
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [statementType, setStatementType] = useState<'Anticipatory' | 'Final'>('Anticipatory');
  const [isBasicPayUpdatedInFY, setIsBasicPayUpdatedInFY] = useState(false);
  const [isStatementConfirmed, setIsStatementConfirmed] = useState(false);
  const [currentStatementId, setCurrentStatementId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [printMode, setPrintMode] = useState<'Anticipatory' | 'Final' | '12BB' | 'Form16' | null>(null);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSearch, setImportSearch] = useState('');
  const [selectedForImport, setSelectedForImport] = useState<string[]>([]);

  const activeTeachers = useMemo(() => {
    if (!activeFY) return [];
    return teachers.filter(t => t.activeFYs?.includes(activeFY.id!));
  }, [teachers, activeFY]);

  const handleImportTeachers = async () => {
    if (!activeFY || selectedForImport.length === 0) return;
    setImporting(true);
    try {
      const promises = selectedForImport.map(id => {
        const teacher = teachers.find(t => t.id === id);
        const currentActiveFYs = teacher?.activeFYs || [];
        if (!currentActiveFYs.includes(activeFY.id!)) {
          return updateDoc(doc(db, 'teachers', id), {
            activeFYs: [...currentActiveFYs, activeFY.id]
          });
        }
        return Promise.resolve();
      });
      await Promise.all(promises);
      
      // Refresh teachers list
      const snap = await getDocs(collection(db, 'teachers'));
      setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Teacher)));
      
      setShowImportModal(false);
      setSelectedForImport([]);
      setNotification({ message: 'Teachers imported successfully for this FY.', type: 'success' });
    } catch (error) {
      console.error("Error importing teachers:", error);
      setNotification({ message: 'Failed to import teachers.', type: 'error' });
    } finally {
      setImporting(false);
    }
  };

  const handleImportAll = async () => {
    if (!activeFY) return;
    const allIds = teachers.map(t => t.id!);
    setSelectedForImport(allIds);
    // We'll let the user click "Confirm Import" after this
  };

  const n = (val: any) => {
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    async function init() {
      try {
        // Fetch all teachers for selection
        const teachersSnap = await getDocs(collection(db, 'teachers'));
        const teachersList = teachersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Teacher));
        setTeachers(teachersList);

        // Fetch active FY
        const fyQuery = query(collection(db, 'financialYears'), where('isActive', '==', true), limit(1));
        const fySnap = await getDocs(fyQuery);
        if (!fySnap.empty) {
          setActiveFY({ id: fySnap.docs[0].id, ...fySnap.docs[0].data() } as FinancialYear);
        }

        if (teacherId) {
          const teacher = teachersList.find(t => t.id === teacherId);
          if (teacher) handleTeacherSelect(teacher);
        }
      } catch (error) {
        console.error("Error initializing calculator:", error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [teacherId]);

  const handleTeacherSelect = async (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setRegime(teacher.taxRegime || 'New');
    setIncrementMonth(teacher.incrementMonth || null);
    setIncrementAmount(teacher.incrementAmount || 0);
    
    // Check for existing statement in this FY
    if (activeFY) {
      try {
        const q = query(
          collection(db, 'taxStatements'), 
          where('teacherId', '==', teacher.id),
          where('financialYearId', '==', activeFY.id),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data() as TaxStatement;
          setCurrentStatementId(snap.docs[0].id);
          setIsBasicPayUpdatedInFY(data.isBasicPayUpdated || false);
          setIsStatementConfirmed(data.isConfirmed || false);
          setMonthlyData(data.monthlyData || []);
          setFestivalAllowance(data.festivalAllowance || 0);
          setDaArrear(data.daArrear || 0);
          setPayRevisionArrear(data.payRevisionArrear || 0);
          setOtherIncome(data.otherIncome || 0);
          setTaxDeducted(data.taxDeducted || 0);
        } else {
          setCurrentStatementId(null);
          setIsBasicPayUpdatedInFY(false);
          setIsStatementConfirmed(false);
          initializeMonthlyData(teacher, activeFY);
        }
      } catch (error) {
        console.error("Error fetching statement:", error);
        initializeMonthlyData(teacher, activeFY);
      }
    }
  };

  const initializeMonthlyData = (teacher: Teacher, fy: FinancialYear) => {
    const initialMonthlyData = MONTHS.map(month => {
      const monthConfig = fy.monthlyConfig?.find(c => c.month === month || c.month === month.substring(0, 3));
      const daPercent = monthConfig?.daPercent ?? 0;
      const hraPercent = monthConfig?.hraPercent ?? 0;
      
      // Determine basic pay based on increment month
      let basicPay = teacher.basicPay;
      const incrementMonthIdx = teacher.incrementMonth ? MONTHS.indexOf(teacher.incrementMonth) : -1;
      const currentMonthIdx = MONTHS.indexOf(month);
      
      if (incrementMonthIdx !== -1 && currentMonthIdx >= incrementMonthIdx) {
        basicPay += (teacher.incrementAmount || 0);
      }
      
      return {
        month,
        basicPay,
        da: Math.round((basicPay * daPercent) / 100),
        hra: Math.round((basicPay * hraPercent) / 100),
        ca: 0,
        otherAllowance: 0,
        pf: 0,
        gis: 0,
        sli: 0,
        lic: 0,
        medisep: 0,
        gpais: 0,
        nps: 0,
        tds: 0,
      };
    });
    setMonthlyData(initialMonthlyData);
  };

  const handleBasicPayChange = (idx: number, newVal: number) => {
    if (isStatementConfirmed) return;
    
    const updatedData = [...monthlyData];
    updatedData[idx].basicPay = newVal;
    
    // Recalculate DA/HRA for this month
    const month = updatedData[idx].month;
    const monthConfig = activeFY?.monthlyConfig?.find(c => c.month === month || c.month === month.substring(0, 3));
    const daPercent = monthConfig?.daPercent ?? 0;
    const hraPercent = monthConfig?.hraPercent ?? 0;
    
    updatedData[idx].da = Math.round((newVal * daPercent) / 100);
    updatedData[idx].hra = Math.round((newVal * hraPercent) / 100);

    // Smart Propagation: Ask if user wants to update subsequent months
    if (idx < updatedData.length - 1) {
      if (confirm(`Do you want to update basic pay to ${newVal} for all subsequent months?`)) {
        for (let i = idx + 1; i < updatedData.length; i++) {
          const m = updatedData[i].month;
          const mConfig = activeFY?.monthlyConfig?.find(c => c.month === m || c.month === m.substring(0, 3));
          const daP = mConfig?.daPercent ?? 0;
          const hraP = mConfig?.hraPercent ?? 0;
          
          updatedData[i].basicPay = newVal;
          updatedData[i].da = Math.round((newVal * daP) / 100);
          updatedData[i].hra = Math.round((newVal * hraP) / 100);
        }
      }
    }
    
    setMonthlyData(updatedData);
  };

  useEffect(() => {
    if (selectedTeacher && activeFY && incrementMonth && incrementAmount > 0) {
      const startIdx = MONTHS.indexOf(incrementMonth);
      if (startIdx === -1) return;
      
      const updatedData = [...monthlyData];
      if (updatedData.length === 0) return;
      
      const newBasic = selectedTeacher.basicPay + incrementAmount;
      
      for (let i = startIdx; i < updatedData.length; i++) {
        const month = MONTHS[i];
        const monthConfig = activeFY.monthlyConfig?.find(c => c.month === month || c.month === month.substring(0, 3));
        const daPercent = monthConfig?.daPercent ?? 0;
        const hraPercent = monthConfig?.hraPercent ?? 0;

        updatedData[i].basicPay = newBasic;
        updatedData[i].da = Math.round((newBasic * daPercent) / 100);
        updatedData[i].hra = Math.round((newBasic * hraPercent) / 100);
      }
      setMonthlyData(updatedData);
    }
  }, [incrementMonth, incrementAmount, selectedTeacher?.basicPay]);

  const totals = useMemo(() => {
    const res = {
      basicPay: 0, da: 0, hra: 0, ca: 0, otherAllowance: 0, total: 0,
      pf: 0, gis: 0, sli: 0, lic: 0, medisep: 0, gpais: 0, nps: 0, tds: 0
    };
    monthlyData.forEach(m => {
      res.basicPay += n(m.basicPay);
      res.da += n(m.da);
      res.hra += n(m.hra);
      res.ca += n(m.ca);
      res.otherAllowance += n(m.otherAllowance);
      res.pf += n(m.pf);
      res.gis += n(m.gis);
      res.sli += n(m.sli);
      res.lic += n(m.lic);
      res.medisep += n(m.medisep);
      res.gpais += n(m.gpais);
      res.nps += n(m.nps);
      res.tds += n(m.tds);
    });
    res.total = res.basicPay + res.da + res.hra + res.ca + res.otherAllowance;
    return res;
  }, [monthlyData]);

  const taxCalc = useMemo(() => {
    if (!activeFY) return null;
    
    const grossSalary = totals.total + n(festivalAllowance) + n(daArrear) + n(payRevisionArrear) + n(otherIncome);
    
    if (regime === 'New') {
      const taxableIncome = Math.max(0, grossSalary - n(activeFY.standardDeduction));
      
      // Calculate tax without marginal relief first to find the relief amount
      let taxWithoutRelief = 0;
      for (const slab of activeFY.newRegimeSlabs) {
        if (taxableIncome > slab.min) {
          const upperLimit = slab.max === null ? taxableIncome : Math.min(taxableIncome, slab.max);
          const taxableAmountInSlab = upperLimit - slab.min;
          taxWithoutRelief += (taxableAmountInSlab * slab.rate) / 100;
        }
      }
      if (taxableIncome <= activeFY.rebateLimit) {
        taxWithoutRelief = Math.max(0, taxWithoutRelief - activeFY.rebateAmount);
      }

      const taxOnTotal = calculateTax(taxableIncome, activeFY.newRegimeSlabs, activeFY.rebateLimit, activeFY.rebateAmount, true);
      const marginalRelief = Math.max(0, Math.round(taxWithoutRelief) - taxOnTotal);
      const cess = calculateCess(taxOnTotal);
      const totalTax = taxOnTotal + cess;
      
      return {
        grossSalary,
        taxableIncome,
        taxOnTotal,
        marginalRelief,
        cess,
        totalTax,
        balance: Math.max(0, totalTax - n(totals.tds)),
        deductions: n(activeFY.standardDeduction),
        standardDeduction: n(activeFY.standardDeduction),
        incomeChargeableSalaries: Math.max(0, grossSalary - n(activeFY.standardDeduction)),
        festivalAllowance,
        daArrear,
        payRevisionArrear,
        otherIncome,
        taxDeducted: totals.tds
      };
    } else {
      // Old Regime
      // 80C Deductions: PF + GIS + SLI + LIC + NPS (up to limit)
      const limit80C = activeFY.deductionLimits?.section80C || 150000;
      const section80C = Math.min(limit80C, totals.pf + totals.gis + totals.sli + totals.lic + totals.nps);
      // 80D: Medisep (up to limit)
      const limit80D = activeFY.deductionLimits?.section80D || 25000;
      const section80D = Math.min(limit80D, totals.medisep);
      
      const totalDeductions = n(activeFY.standardDeductionOld) + section80C + section80D + (regime === 'Old' ? totals.gpais : 0);
      const taxableIncome = Math.max(0, grossSalary - totalDeductions);
      
      const taxOnTotal = calculateTax(taxableIncome, activeFY.oldRegimeSlabs, activeFY.rebateLimitOld, activeFY.rebateAmountOld, false);
      const cess = calculateCess(taxOnTotal);
      const totalTax = taxOnTotal + cess;
      
      return {
        grossSalary,
        taxableIncome,
        taxOnTotal,
        cess,
        totalTax,
        balance: Math.max(0, totalTax - n(totals.tds)),
        deductions: totalDeductions,
        standardDeduction: n(activeFY.standardDeductionOld),
        incomeChargeableSalaries: Math.max(0, grossSalary - n(activeFY.standardDeductionOld)),
        section80C,
        section80D,
        festivalAllowance,
        daArrear,
        payRevisionArrear,
        otherIncome,
        taxDeducted: totals.tds
      };
    }
  }, [totals, festivalAllowance, otherIncome, taxDeducted, activeFY, regime, daArrear, payRevisionArrear]);

  const handleSaveStatement = () => {
    if (!selectedTeacher || !activeFY || !taxCalc) return;
    setShowSaveConfirm(true);
  };

  const confirmSaveStatement = async () => {
    if (!selectedTeacher || !activeFY || !taxCalc) return;
    setShowSaveConfirm(false);
    setSaving(true);
    try {
      // Increment Basic Logic
      const finalBasic = monthlyData[monthlyData.length - 1].basicPay;
      const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
      const currentMonthIdx = MONTHS.indexOf(currentMonth);
      const incrementMonthIdx = incrementMonth ? MONTHS.indexOf(incrementMonth) : -1;
      
      const shouldUpdateBasic = (incrementMonthIdx !== -1 && currentMonthIdx >= incrementMonthIdx) || statementType === 'Final';

      if (shouldUpdateBasic && finalBasic !== selectedTeacher.basicPay) {
        alert("பேசிக் மாற்றப்படுகிறது.");
        await updateDoc(doc(db, 'teachers', selectedTeacher.id!), { 
          basicPay: finalBasic,
          incrementMonth: incrementMonth,
          incrementAmount: incrementAmount
        });
        setIsBasicPayUpdatedInFY(true);
        setSelectedTeacher({ 
          ...selectedTeacher, 
          basicPay: finalBasic,
          incrementMonth: incrementMonth || undefined,
          incrementAmount: incrementAmount
        });
      }

      const statement: Partial<TaxStatement> = {
        teacherId: selectedTeacher.id,
        financialYearId: activeFY.id,
        regime,
        type: statementType,
        monthlyData,
        festivalAllowance,
        daArrear,
        payRevisionArrear,
        otherIncome,
        totalIncome: taxCalc.grossSalary,
        taxableIncome: taxCalc.taxableIncome,
        taxOnTotalIncome: taxCalc.taxOnTotal,
        taxRebate: 0,
        surcharge: 0,
        cess: taxCalc.cess,
        totalTax: taxCalc.totalTax,
        taxDeducted: totals.tds,
        balanceTax: taxCalc.balance,
        section80C: taxCalc.section80C,
        section80D: taxCalc.section80D,
        status: 'Draft',
        isConfirmed: isStatementConfirmed,
        isBasicPayUpdated: isBasicPayUpdatedInFY || shouldUpdateBasic,
        updatedAt: new Date().toISOString(),
      };

      if (currentStatementId) {
        await updateDoc(doc(db, 'taxStatements', currentStatementId), statement);
      } else {
        const newDoc = await addDoc(collection(db, 'taxStatements'), {
          ...statement,
          createdAt: new Date().toISOString(),
        });
        setCurrentStatementId(newDoc.id);
      }

      // Log activity
      await addDoc(collection(db, 'activities'), {
        type: 'save',
        description: `Saved ${statementType} tax statement for ${selectedTeacher.name}`,
        userId: auth.currentUser?.uid,
        userName: auth.currentUser?.displayName || 'Unknown User',
        timestamp: new Date().toISOString()
      });

      setNotification({ message: `Tax statement saved as ${statementType} successfully!`, type: 'success' });
    } catch (error) {
      console.error("Error saving statement:", error);
      setNotification({ message: "Failed to save statement", type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetStatement = async () => {
    if (!currentStatementId || !confirm("Are you sure you want to reset this statement? This will allow editing again.")) return;
    try {
      await updateDoc(doc(db, 'taxStatements', currentStatementId), {
        isConfirmed: false,
        status: 'Draft'
      });
      setIsStatementConfirmed(false);

      // Log activity
      await addDoc(collection(db, 'activities'), {
        type: 'update',
        description: `Reset tax statement for ${selectedTeacher?.name}`,
        userId: auth.currentUser?.uid,
        userName: auth.currentUser?.displayName || 'Unknown User',
        timestamp: new Date().toISOString()
      });

      setNotification({ message: "Statement reset successfully!", type: 'success' });
    } catch (error) {
      console.error("Error resetting statement:", error);
      setNotification({ message: "Failed to reset statement", type: 'error' });
    }
  };

  const handleConfirmStatement = async () => {
    if (!selectedTeacher || !activeFY || !taxCalc) return;
    setConfirming(true);
    try {
      const statementData: Partial<TaxStatement> = {
        isConfirmed: true,
        status: 'Approved',
        section80C: taxCalc.section80C,
        section80D: taxCalc.section80D,
        taxDeducted: totals.tds,
        balanceTax: taxCalc.balance,
        updatedAt: new Date().toISOString(),
      };

      if (currentStatementId) {
        await updateDoc(doc(db, 'taxStatements', currentStatementId), statementData);
      } else {
        const newDoc = await addDoc(collection(db, 'taxStatements'), {
          ...statementData,
          teacherId: selectedTeacher.id,
          financialYearId: activeFY.id,
          regime,
          type: statementType,
          monthlyData,
          festivalAllowance,
          daArrear,
          payRevisionArrear,
          otherIncome,
          totalIncome: taxCalc.grossSalary,
          taxableIncome: taxCalc.taxableIncome,
          taxOnTotalIncome: taxCalc.taxOnTotal,
          cess: taxCalc.cess,
          totalTax: taxCalc.totalTax,
          isBasicPayUpdated: isBasicPayUpdatedInFY,
          createdAt: new Date().toISOString(),
        });
        setCurrentStatementId(newDoc.id);
      }

      // Log activity
      await addDoc(collection(db, 'activities'), {
        type: 'confirm',
        description: `Confirmed ${statementType} tax statement for ${selectedTeacher.name}`,
        userId: auth.currentUser?.uid,
        userName: auth.currentUser?.displayName || 'Unknown User',
        timestamp: new Date().toISOString()
      });

      setIsStatementConfirmed(true);
      setNotification({ message: "Statement confirmed successfully!", type: 'success' });
    } catch (error) {
      console.error("Error confirming statement:", error);
      setNotification({ message: "Failed to confirm statement", type: 'error' });
    } finally {
      setConfirming(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  if (!activeFY) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 shadow-sm">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900">No Active Financial Year</h2>
        <p className="text-gray-600 mt-2">Please contact the administrator to set up an active financial year.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      {/* Notifications */}
      {notification && (
        <div className={cn(
          "fixed top-20 right-4 z-[100] px-6 py-3 rounded-xl shadow-lg border animate-in fade-in slide-in-from-top-4 duration-300",
          notification.type === 'success' ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
        )}>
          {notification.message}
        </div>
      )}

      {/* Confirmation Modal */}
      {showSaveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[110]">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Save Statement?</h3>
            <p className="text-gray-600 text-sm mb-6">
              Are you sure you want to save this statement?
            </p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setShowSaveConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={confirmSaveStatement}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Yes, save
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Income Tax Calculation ({activeFY.year})</h1>
        {selectedTeacher && (
          <div className="flex space-x-3">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button 
                onClick={() => setRegime('New')}
                className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", regime === 'New' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
              >
                New Regime
              </button>
              <button 
                onClick={() => setRegime('Old')}
                className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", regime === 'Old' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
              >
                Old Regime
              </button>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button 
                onClick={() => setStatementType('Anticipatory')}
                className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", statementType === 'Anticipatory' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
              >
                Anticipatory
              </button>
              <button 
                onClick={() => setStatementType('Final')}
                className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", statementType === 'Final' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
              >
                Final
              </button>
            </div>

            <button 
              onClick={handleSaveStatement} 
              disabled={saving || isStatementConfirmed}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 text-sm font-medium disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </button>

            {isStatementConfirmed ? (
              <button 
                onClick={handleResetStatement}
                className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 flex items-center space-x-2 text-sm font-medium"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Reset</span>
              </button>
            ) : (
              <button 
                onClick={handleConfirmStatement} 
                disabled={confirming}
                className="bg-purple-600 text-white hover:bg-purple-700 px-4 py-2 rounded-lg flex items-center space-x-2 text-sm font-medium transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                <span>{confirming ? 'Confirming...' : 'Confirm'}</span>
              </button>
            )}

            <div className="relative">
              <button 
                onClick={() => setShowPrintOptions(!showPrintOptions)}
                onBlur={() => setTimeout(() => setShowPrintOptions(false), 200)}
                className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center space-x-2 text-sm font-medium"
              >
                <Printer className="h-4 w-4" />
                <span>Print Statement</span>
              </button>
              {showPrintOptions && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <button 
                    onClick={() => { setPrintMode('Anticipatory'); setShowPrintOptions(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm font-medium border-b border-gray-100"
                  >
                    Anticipatory Statement
                  </button>
                  <button 
                    onClick={() => { setPrintMode('Final'); setShowPrintOptions(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm font-medium border-b border-gray-100"
                  >
                    Final Statement
                  </button>
                  <button 
                    onClick={() => { setPrintMode('12BB'); setShowPrintOptions(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm font-medium border-b border-gray-100"
                  >
                    Form No. 12BB
                  </button>
                  <button 
                    onClick={() => { setPrintMode('Form16'); setShowPrintOptions(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm font-medium"
                  >
                    Form No. 16 Part B
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Teacher Selection & Bulk Updates */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
        <div className="flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 w-full">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-medium text-gray-500 uppercase">Select Teacher</label>
              <button 
                onClick={() => setShowImportModal(true)}
                className="text-[10px] font-bold text-blue-600 hover:underline flex items-center"
              >
                <Upload className="h-3 w-3 mr-1" /> Import Teachers for {activeFY.year}
              </button>
            </div>
            <select
              value={selectedTeacher?.id || ''}
              disabled={isStatementConfirmed}
              onChange={e => {
                const teacher = activeTeachers.find(t => t.id === e.target.value);
                if (teacher) handleTeacherSelect(teacher);
              }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            >
              <option value="">-- Choose a teacher ({activeTeachers.length} imported) --</option>
              {activeTeachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.penNumber})</option>)}
            </select>
          </div>
          {selectedTeacher && (
            <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-4 gap-4 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
              <div>
                <p className="text-[10px] font-bold text-blue-600 uppercase">PEN</p>
                <p className="text-sm font-bold text-gray-900">{selectedTeacher.penNumber}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-blue-600 uppercase">Designation</p>
                <p className="text-sm font-bold text-gray-900">{selectedTeacher.designation}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-blue-600 uppercase">Increment</p>
                <p className="text-sm font-bold text-gray-900">{selectedTeacher.incrementMonth || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-blue-600 uppercase">Amount</p>
                <p className="text-sm font-bold text-gray-900">{formatCurrency(selectedTeacher.incrementAmount || 0)}</p>
              </div>
            </div>
          )}
        </div>

        {selectedTeacher && (
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
              <Calculator className="h-4 w-4 mr-2 text-blue-600" />
              Bulk Update Monthly Deductions
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {['pf', 'gis', 'sli', 'lic', 'medisep', 'nps', 'tds'].map(field => (
                <div key={field}>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{field}</label>
                  <input
                    type="number"
                    placeholder={`Set ${field}`}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 0;
                      const newData = monthlyData.map(m => ({ ...m, [field]: val }));
                      setMonthlyData(newData);
                    }}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-2 italic">* Entering a value here will update all 12 months for the selected field.</p>
          </div>
        )}
      </div>

      {selectedTeacher && (
        <>
          {/* Monthly Data Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left font-bold text-gray-500 uppercase">Month</th>
                    <th className="px-3 py-3 text-right font-bold text-gray-500 uppercase">Basic</th>
                    <th className="px-3 py-3 text-right font-bold text-gray-500 uppercase">DA %</th>
                    <th className="px-3 py-3 text-right font-bold text-gray-500 uppercase">DA</th>
                    <th className="px-3 py-3 text-right font-bold text-gray-500 uppercase">HRA</th>
                    <th className="px-3 py-3 text-right font-bold text-gray-500 uppercase">Total</th>
                    <th className="px-3 py-3 text-right font-bold text-gray-500 uppercase">PF</th>
                    <th className="px-3 py-3 text-right font-bold text-gray-500 uppercase">GIS</th>
                    <th className="px-3 py-3 text-right font-bold text-gray-500 uppercase">SLI</th>
                    <th className="px-3 py-3 text-right font-bold text-gray-500 uppercase">LIC</th>
                    <th className="px-3 py-3 text-right font-bold text-gray-500 uppercase">Medisep</th>
                    <th className="px-3 py-3 text-right font-bold text-gray-500 uppercase">NPS</th>
                    <th className="px-3 py-3 text-right font-bold text-gray-500 uppercase">TDS</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {monthlyData.map((m, idx) => {
                    const monthConfig = activeFY.monthlyConfig?.find(c => c.month === m.month || c.month === m.month.substring(0, 3));
                    return (
                      <tr key={m.month} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-3 font-bold text-gray-700">{m.month}</td>
                        <td className="px-3 py-3 text-right font-medium text-gray-900">
                          <input 
                            type="number" 
                            value={m.basicPay} 
                            disabled={isStatementConfirmed} 
                            onChange={e => handleBasicPayChange(idx, parseInt(e.target.value) || 0)} 
                            className="w-20 text-right bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none disabled:opacity-50 font-bold" 
                          />
                        </td>
                        <td className="px-3 py-3 text-right text-gray-500">{monthConfig?.daPercent}%</td>
                        <td className="px-3 py-3 text-right text-gray-600">{n(m.da)}</td>
                        <td className="px-3 py-3 text-right text-gray-600">{n(m.hra)}</td>
                        <td className="px-3 py-3 text-right font-bold text-blue-600">{n(m.basicPay) + n(m.da) + n(m.hra)}</td>
                        <td className="px-3 py-3 text-right">
                          <input type="number" value={m.pf} disabled={isStatementConfirmed} onChange={e => {
                            const newData = [...monthlyData];
                            newData[idx].pf = parseInt(e.target.value) || 0;
                            setMonthlyData(newData);
                          }} className="w-16 text-right bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none disabled:opacity-50" />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <input type="number" value={m.gis} disabled={isStatementConfirmed} onChange={e => {
                            const newData = [...monthlyData];
                            newData[idx].gis = parseInt(e.target.value) || 0;
                            setMonthlyData(newData);
                          }} className="w-12 text-right bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none disabled:opacity-50" />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <input type="number" value={m.sli} disabled={isStatementConfirmed} onChange={e => {
                            const newData = [...monthlyData];
                            newData[idx].sli = parseInt(e.target.value) || 0;
                            setMonthlyData(newData);
                          }} className="w-12 text-right bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none disabled:opacity-50" />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <input type="number" value={m.lic} disabled={isStatementConfirmed} onChange={e => {
                            const newData = [...monthlyData];
                            newData[idx].lic = parseInt(e.target.value) || 0;
                            setMonthlyData(newData);
                          }} className="w-12 text-right bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none disabled:opacity-50" />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <input type="number" value={m.medisep} disabled={isStatementConfirmed} onChange={e => {
                            const newData = [...monthlyData];
                            newData[idx].medisep = parseInt(e.target.value) || 0;
                            setMonthlyData(newData);
                          }} className="w-12 text-right bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none disabled:opacity-50" />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <input type="number" value={m.nps} disabled={isStatementConfirmed} onChange={e => {
                            const newData = [...monthlyData];
                            newData[idx].nps = parseInt(e.target.value) || 0;
                            setMonthlyData(newData);
                          }} className="w-16 text-right bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none disabled:opacity-50" />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <input type="number" value={m.tds} disabled={isStatementConfirmed} onChange={e => {
                            const newData = [...monthlyData];
                            newData[idx].tds = parseInt(e.target.value) || 0;
                            setMonthlyData(newData);
                          }} className="w-16 text-right bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none disabled:opacity-50" />
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
                    <td className="px-3 py-3">TOTAL</td>
                    <td className="px-3 py-3 text-right">{n(totals.basicPay)}</td>
                    <td className="px-3 py-3 text-right">-</td>
                    <td className="px-3 py-3 text-right">{n(totals.da)}</td>
                    <td className="px-3 py-3 text-right">{n(totals.hra)}</td>
                    <td className="px-3 py-3 text-right text-blue-700">{n(totals.total)}</td>
                    <td className="px-3 py-3 text-right">{n(totals.pf)}</td>
                    <td className="px-3 py-3 text-right">{n(totals.gis)}</td>
                    <td className="px-3 py-3 text-right">{n(totals.sli)}</td>
                    <td className="px-3 py-3 text-right">{n(totals.lic)}</td>
                    <td className="px-3 py-3 text-right">{n(totals.medisep)}</td>
                    <td className="px-3 py-3 text-right">{n(totals.nps)}</td>
                    <td className="px-3 py-3 text-right">{n(totals.tds)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Tax Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Income & Deductions</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">Incomes</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Gross Salary (Basic+DA+HRA)</span>
                      <span className="font-bold text-gray-900">{formatCurrency(totals.total)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Festival Allowance / Bonus</span>
                      <input type="number" value={festivalAllowance} disabled={isStatementConfirmed} onChange={e => setFestivalAllowance(parseInt(e.target.value) || 0)} className="w-24 text-right border-b border-gray-200 outline-none focus:border-blue-500 disabled:opacity-50" />
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">DA Arrear</span>
                      <input type="number" value={daArrear} disabled={isStatementConfirmed} onChange={e => setDaArrear(parseInt(e.target.value) || 0)} className="w-24 text-right border-b border-gray-200 outline-none focus:border-blue-500 disabled:opacity-50" />
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Pay Revision Arrear</span>
                      <input type="number" value={payRevisionArrear} disabled={isStatementConfirmed} onChange={e => setPayRevisionArrear(parseInt(e.target.value) || 0)} className="w-24 text-right border-b border-gray-200 outline-none focus:border-blue-500 disabled:opacity-50" />
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Other Income</span>
                      <input type="number" value={otherIncome} disabled={isStatementConfirmed} onChange={e => setOtherIncome(parseInt(e.target.value) || 0)} className="w-24 text-right border-b border-gray-200 outline-none focus:border-blue-500 disabled:opacity-50" />
                    </div>
                    <div className="flex justify-between items-center text-sm pt-2 border-t font-bold">
                      <span className="text-gray-900">Total Gross Income</span>
                      <span className="text-blue-600">{formatCurrency(taxCalc?.grossSalary || 0)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">Deductions</h4>
                  <div className="space-y-2">
                    {regime === 'Old' ? (
                      <>
                        <div className="flex justify-between items-center text-sm text-red-600">
                          <span>Standard Deduction</span>
                          <span>- {formatCurrency(activeFY.standardDeductionOld)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-red-600">
                          <span>Section 80C (PF, GIS, SLI, LIC, NPS)</span>
                          <span>- {formatCurrency(taxCalc?.section80C || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-red-600">
                          <span>Section 80D (Medisep)</span>
                          <span>- {formatCurrency(taxCalc?.section80D || 0)}</span>
                        </div>
                        {totals.gpais > 0 && (
                          <div className="flex justify-between items-center text-sm text-red-600">
                            <span>GPAIS</span>
                            <span>- {formatCurrency(totals.gpais)}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex justify-between items-center text-sm text-red-600">
                        <span>Standard Deduction</span>
                        <span>- {formatCurrency(activeFY.standardDeduction)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm pt-2 border-t font-bold text-red-700">
                      <span>Total Deductions</span>
                      <span>- {formatCurrency(taxCalc?.deductions || 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-lg pt-2 border-t font-black">
                  <span className="text-gray-900">Taxable Income</span>
                  <span className="text-green-600">{formatCurrency(taxCalc?.taxableIncome || 0)}</span>
                </div>
              </div>
            </section>

            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Tax Calculation ({regime} Regime)</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Tax on Total Income</span>
                  <span className="font-bold text-gray-900">{formatCurrency(taxCalc?.taxOnTotal || 0)}</span>
                </div>
                {taxCalc?.marginalRelief > 0 && (
                  <div className="flex justify-between items-center text-sm text-green-600">
                    <span>Marginal Relief u/s 87A</span>
                    <span>- {formatCurrency(taxCalc.marginalRelief)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Health & Education Cess (4%)</span>
                  <span className="font-bold text-gray-900">{formatCurrency(taxCalc?.cess || 0)}</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t font-bold">
                  <span className="text-gray-900">Total Tax Payable</span>
                  <span className="text-red-600">{formatCurrency(taxCalc?.totalTax || 0)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">TDS / Tax Already Paid</span>
                  <span className="font-bold text-gray-900">{formatCurrency(totals.tds)}</span>
                </div>
                <div className="flex justify-between items-center text-xl pt-4 border-t font-black">
                  <span className="text-gray-900">Balance Tax Due</span>
                  <span className={cn("px-4 py-1 rounded-lg", (taxCalc?.balance || 0) > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
                    {formatCurrency(taxCalc?.balance || 0)}
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* Tax Optimization Tips */}
          <div className="mt-8 bg-blue-50 p-6 rounded-2xl border border-blue-100">
            <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Smart Tax Optimization Tips
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-bold text-blue-800 text-sm uppercase tracking-wider">New Regime (FY 2025-26)</h4>
                <ul className="text-sm text-blue-700 space-y-2 list-disc pl-4">
                  <li><strong>Marginal Relief:</strong> If your income is between ₹12,00,001 and ₹12,75,000, you get marginal relief. Your tax (before cess) won't exceed the amount over ₹12 Lakhs.</li>
                  <li><strong>Standard Deduction:</strong> ₹75,000 is automatically deducted. No need to invest in 80C.</li>
                  <li><strong>Best for:</strong> Those with fewer investments or higher salary where 80C/80D limits are already exhausted.</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-bold text-blue-800 text-sm uppercase tracking-wider">Old Regime Optimization</h4>
                <ul className="text-sm text-blue-700 space-y-2 list-disc pl-4">
                  <li><strong>Section 80C:</strong> Maximize ₹1.5 Lakh limit with PF, LIC, SLI, GIS, and Housing Loan Principal.</li>
                  <li><strong>Section 80D:</strong> Medisep premium is deductible. Ensure it's correctly captured.</li>
                  <li><strong>HRA Exemption:</strong> If living in a rented house, provide rent receipts to claim HRA exemption (calculated separately from Gross).</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
      {/* Import Teachers Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Import Teachers for {activeFY.year}</h2>
                <p className="text-sm text-gray-500">Select teachers from the master list to work with this year.</p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 flex-grow overflow-y-auto">
              <div className="flex gap-4">
                <div className="flex-grow relative">
                  <input 
                    type="text" 
                    placeholder="Search by name or PEN..." 
                    value={importSearch}
                    onChange={e => setImportSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Users className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                </div>
                <button 
                  onClick={handleImportAll}
                  className="px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl border border-blue-200"
                >
                  Select All
                </button>
              </div>

              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="px-4 py-3 text-left w-10">
                        <input 
                          type="checkbox" 
                          checked={selectedForImport.length === teachers.length && teachers.length > 0}
                          onChange={e => {
                            if (e.target.checked) setSelectedForImport(teachers.map(t => t.id!));
                            else setSelectedForImport([]);
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left">Teacher Name</th>
                      <th className="px-4 py-3 text-left">PEN Number</th>
                      <th className="px-4 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {teachers
                      .filter(t => 
                        t.name.toLowerCase().includes(importSearch.toLowerCase()) || 
                        t.penNumber.includes(importSearch)
                      )
                      .map(t => {
                        const isAlreadyActive = t.activeFYs?.includes(activeFY.id!);
                        return (
                          <tr key={t.id} className={cn("hover:bg-gray-50", isAlreadyActive && "bg-green-50/30")}>
                            <td className="px-4 py-3">
                              <input 
                                type="checkbox" 
                                checked={selectedForImport.includes(t.id!) || isAlreadyActive}
                                disabled={isAlreadyActive}
                                onChange={e => {
                                  if (e.target.checked) setSelectedForImport([...selectedForImport, t.id!]);
                                  else setSelectedForImport(selectedForImport.filter(id => id !== t.id));
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                            <td className="px-4 py-3 text-gray-500 font-mono">{t.penNumber}</td>
                            <td className="px-4 py-3">
                              {isAlreadyActive ? (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase">Imported</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full uppercase">Pending</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-4">
              <button 
                onClick={() => setShowImportModal(false)}
                className="px-6 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleImportTeachers}
                disabled={importing || selectedForImport.length === 0}
                className="px-8 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Confirm Import ({selectedForImport.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {printMode && selectedTeacher && activeFY && (
        <TaxStatementPrint 
          mode={printMode}
          teacher={selectedTeacher}
          fy={activeFY}
          monthlyData={monthlyData}
          taxCalc={taxCalc}
          onClose={() => setPrintMode(null)}
        />
      )}
    </div>
  );
}
