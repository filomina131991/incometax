import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dbService, authService } from '../api';
import { Teacher, FinancialYear, MonthlyData, TaxStatement } from '../types';
import { Save, Printer, User, Calendar, Calculator, AlertTriangle, AlertCircle, ChevronRight, ChevronLeft, CheckCircle, Upload, Loader2, X, Users, Box } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { calculateTax, calculateCess } from '../lib/tax';
import TaxStatementPrint from './TaxStatementPrint';
import Tax3DVisualizer from './Tax3DVisualizer';
import { AnimatePresence } from 'framer-motion';

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
  const [leaveSurrender, setLeaveSurrender] = useState(0);
  const [otherIncome, setOtherIncome] = useState(0);
  const [taxDeducted, setTaxDeducted] = useState(0);
  const [section80G, setSection80G] = useState(0);
  const [section80E, setSection80E] = useState(0);
  const [hbaInterest, setHbaInterest] = useState(0);
  const [hbaPrincipal, setHbaPrincipal] = useState(0);
  const [tuitionFees, setTuitionFees] = useState(0);
  const [anyOtherDeductions, setAnyOtherDeductions] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);
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
  const [show3DVisualizer, setShow3DVisualizer] = useState(false);
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
      const promises = selectedForImport.map(async id => {
        const teacher = teachers.find(t => t.id === id);
        const currentActiveFYs = teacher?.activeFYs || [];
        if (!currentActiveFYs.includes(activeFY.id!)) {
          return dbService.updateTeacher(id, {
            activeFYs: [...currentActiveFYs, activeFY.id]
          });
        }
      });
      await Promise.all(promises);

      // Refresh teachers list
      const data = await dbService.getTeachers();
      setTeachers(data);

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
        const teachersList = await dbService.getTeachers();
        setTeachers(teachersList);

        // Fetch active FY
        const fyears = await dbService.getFinancialYears();
        const active = fyears.find(f => f.isActive);
        if (active) {
          setActiveFY(active);
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
    setIncrementMonth(teacher.incrementMonth || null);
    setIncrementAmount(teacher.incrementAmount || 0);

    if (activeFY) {
      try {
        const statements = await dbService.getTaxStatements({ teacherId: teacher.id });
        // Handle both string and object financialYearId
        const existing = statements.find(s => {
          const fyId = typeof s.financialYearId === 'object' ? (s.financialYearId as any).id || (s.financialYearId as any)._id : s.financialYearId;
          return fyId === activeFY.id;
        });

        if (existing) {
          setCurrentStatementId(existing.id || null);
          setIsBasicPayUpdatedInFY(existing.isBasicPayUpdated || false);
          setIsStatementConfirmed(existing.isConfirmed || false);
          setMonthlyData(existing.monthlyData || []);
          setFestivalAllowance(existing.festivalAllowance || 0);
          setDaArrear(existing.daArrear || 0);
          setPayRevisionArrear(existing.payRevisionArrear || 0);
          setOtherIncome(existing.otherIncome || 0);
          setTaxDeducted(existing.taxDeducted || 0);
          setSection80G(existing.section80G || 0);
          setSection80E(existing.section80E || 0);
          setHbaInterest(existing.hbaInterest || 0);
          setAnyOtherDeductions(existing.anyOtherDeductions || 0);
          setLeaveSurrender(existing.leaveSurrender || 0);
          setHbaPrincipal(existing.hbaPrincipal || 0);
          setTuitionFees(existing.tuitionFees || 0);
          if (existing.regime) setRegime(existing.regime as 'New' | 'Old');
          if (existing.type) setStatementType(existing.type as 'Anticipatory' | 'Final');
        } else {
          setCurrentStatementId(null);
          setIsBasicPayUpdatedInFY(false);
          setIsStatementConfirmed(false);
          initializeMonthlyData(teacher, activeFY);
          setFestivalAllowance(0);
          setDaArrear(0);
          setPayRevisionArrear(0);
          setOtherIncome(0);
          setTaxDeducted(0);
          setSection80G(0);
          setSection80E(0);
          setHbaInterest(0);
          setAnyOtherDeductions(0);
          setLeaveSurrender(0);
          setHbaPrincipal(0);
          setTuitionFees(0);
          setRegime(teacher.taxRegime || 'New');
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
        pf: teacher.defaultPF || 0,
        gis: teacher.defaultGIS || 0,
        sli: teacher.defaultSLI || 0,
        lic: teacher.defaultLIC || 0,
        medisep: teacher.defaultMedisep || 0,
        gpais: teacher.defaultGPAIS || 0,
        nps: teacher.defaultNPS || 0,
        tds: teacher.defaultTDS || 0,
      };
    });
    setMonthlyData(initialMonthlyData);
  };

  const handleBasicPayChange = (idx: number, newVal: number) => {
    if (isStatementConfirmed) return;

    const updatedData = [...monthlyData];
    updatedData[idx].basicPay = newVal;

    const month = updatedData[idx].month;
    const monthConfig = activeFY?.monthlyConfig?.find(c => c.month === month || c.month === month.substring(0, 3));
    const daPercent = monthConfig?.daPercent ?? 0;
    const hraPercent = monthConfig?.hraPercent ?? 0;

    updatedData[idx].da = Math.round((newVal * daPercent) / 100);
    updatedData[idx].hra = Math.round((newVal * hraPercent) / 100);

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

    const grossSalary = totals.total + n(festivalAllowance) + n(daArrear) + n(payRevisionArrear) + n(leaveSurrender) + n(otherIncome);

    if (regime === 'New') {
      const stdDed = n(activeFY.standardDeduction) || 75000;
      const taxableIncome = Math.max(0, grossSalary - stdDed);

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
        balance: Math.max(0, totalTax - n(taxDeducted > 0 ? taxDeducted : totals.tds)),
        deductions: stdDed,
        standardDeduction: stdDed,
        incomeChargeableSalaries: Math.max(0, grossSalary - stdDed),
        festivalAllowance,
        leaveSurrender,
        daArrear,
        payRevisionArrear,
        otherIncome,
        hbaPrincipal,
        tuitionFees,
        hbaInterest,
        section80C: 0,
        section80D: 0,
        section80G,
        section80E,
        anyOtherDeductions,
        taxDeducted: n(taxDeducted > 0 ? taxDeducted : totals.tds)
      };
    } else {
      const limit80C = activeFY.deductionLimits?.section80C || 150000;
      const section80C = Math.min(limit80C, n(totals.pf) + n(totals.gis) + n(totals.sli) + n(totals.lic) + n(totals.nps) + n(totals.gpais) + n(hbaPrincipal) + n(tuitionFees));
      const limit80D = activeFY.deductionLimits?.section80D || 25000;
      const section80D = Math.min(limit80D, n(totals.medisep));

      const totalDeductions = n(activeFY.standardDeductionOld) + section80C + section80D +
        n(section80G) + n(section80E) + n(hbaInterest) + n(anyOtherDeductions);
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
        balance: Math.max(0, totalTax - n(taxDeducted > 0 ? taxDeducted : totals.tds)),
        deductions: totalDeductions,
        standardDeduction: n(activeFY.standardDeductionOld),
        incomeChargeableSalaries: Math.max(0, grossSalary - n(activeFY.standardDeductionOld)),
        section80C,
        section80D,
        section80G,
        section80E,
        hbaInterest,
        hbaPrincipal,
        tuitionFees,
        anyOtherDeductions,
        festivalAllowance,
        leaveSurrender,
        daArrear,
        payRevisionArrear,
        otherIncome,
        taxDeducted: n(taxDeducted > 0 ? taxDeducted : totals.tds)
      };
    }
  }, [totals, festivalAllowance, leaveSurrender, otherIncome, taxDeducted, activeFY, regime, daArrear, payRevisionArrear, section80G, section80E, hbaInterest, hbaPrincipal, tuitionFees, anyOtherDeductions]);

  const handleSaveStatement = () => {
    if (!selectedTeacher || !activeFY || !taxCalc) return;
    setShowSaveConfirm(true);
  };

  const confirmSaveStatement = async () => {
    if (!selectedTeacher || !activeFY || !taxCalc) return;
    setShowSaveConfirm(false);
    setSaving(true);
    try {
      const user = authService.getCurrentUser();
      const finalBasic = monthlyData[monthlyData.length - 1].basicPay;
      const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
      const currentMonthIdx = MONTHS.indexOf(currentMonth);
      const incrementMonthIdx = incrementMonth ? MONTHS.indexOf(incrementMonth) : -1;

      const shouldUpdateBasic = (incrementMonthIdx !== -1 && currentMonthIdx >= incrementMonthIdx) || statementType === 'Final';

      if (shouldUpdateBasic && finalBasic !== selectedTeacher.basicPay) {
        await dbService.updateTeacher(selectedTeacher.id!, {
          basicPay: finalBasic,
          incrementMonth: incrementMonth || undefined,
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
        leaveSurrender,
        totalIncome: taxCalc.grossSalary,
        taxableIncome: taxCalc.taxableIncome,
        taxOnTotalIncome: taxCalc.taxOnTotal,
        taxRebate: 0,
        surcharge: 0,
        cess: taxCalc.cess,
        totalTax: taxCalc.totalTax,
        taxDeducted: n(taxDeducted > 0 ? taxDeducted : totals.tds),
        balanceTax: taxCalc.balance,
        annualPF: totals.pf,
        annualGIS: totals.gis,
        annualSLI: totals.sli,
        annualLIC: totals.lic,
        annualMedisep: totals.medisep,
        annualGPAIS: totals.gpais,
        annualNPS: totals.nps,
        annualTDS: totals.tds,
        section80C: taxCalc.section80C || 0,
        section80D: taxCalc.section80D || 0,
        section80G: section80G || 0,
        section80E: section80E || 0,
        hbaInterest: hbaInterest || 0,
        hbaPrincipal: hbaPrincipal || 0,
        tuitionFees: tuitionFees || 0,
        anyOtherDeductions: anyOtherDeductions || 0,
        status: 'Draft',
        isConfirmed: isStatementConfirmed,
        isBasicPayUpdated: isBasicPayUpdatedInFY || !!shouldUpdateBasic,
        updatedAt: new Date().toISOString(),
      };

      if (currentStatementId) {
        await dbService.updateTaxStatement(currentStatementId, statement);
      } else {
        const newDoc = await dbService.addTaxStatement({
          ...statement,
          createdAt: new Date().toISOString(),
        } as TaxStatement);
        setCurrentStatementId(newDoc.id);
      }

      await dbService.logActivity({
        type: 'save',
        description: `Saved ${statementType} tax statement for ${selectedTeacher.name}`,
        userId: user?.id,
        userName: user?.name || 'Unknown User',
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
      const user = authService.getCurrentUser();
      await dbService.updateTaxStatement(currentStatementId, {
        isConfirmed: false,
        status: 'Draft'
      });
      setIsStatementConfirmed(false);

      await dbService.logActivity({
        type: 'update',
        description: `Reset tax statement for ${selectedTeacher?.name}`,
        userId: user?.id,
        userName: user?.name || 'Unknown User',
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
      const user = authService.getCurrentUser();
      const statementData: Partial<TaxStatement> = {
        isConfirmed: true,
        status: 'Approved',
        teacherId: selectedTeacher.id,
        financialYearId: activeFY.id,
        regime,
        type: statementType,
        monthlyData,
        festivalAllowance: n(festivalAllowance),
        daArrear: n(daArrear),
        payRevisionArrear: n(payRevisionArrear),
        otherIncome: n(otherIncome),
        leaveSurrender: n(leaveSurrender),
        totalIncome: taxCalc.grossSalary,
        taxableIncome: taxCalc.taxableIncome,
        taxOnTotalIncome: taxCalc.taxOnTotal,
        cess: taxCalc.cess,
        totalTax: taxCalc.totalTax,
        taxDeducted: n(taxDeducted > 0 ? taxDeducted : totals.tds),
        balanceTax: taxCalc.balance,
        section80C: taxCalc.section80C || 0,
        section80D: taxCalc.section80D || 0,
        section80G: section80G || 0,
        section80E: section80E || 0,
        hbaInterest: hbaInterest || 0,
        hbaPrincipal: hbaPrincipal || 0,
        tuitionFees: tuitionFees || 0,
        anyOtherDeductions: anyOtherDeductions || 0,
        annualPF: totals.pf,
        annualGIS: totals.gis,
        annualSLI: totals.sli,
        annualLIC: totals.lic,
        annualMedisep: totals.medisep,
        annualGPAIS: totals.gpais,
        annualNPS: totals.nps,
        annualTDS: totals.tds,
        updatedAt: new Date().toISOString(),
      };

      if (currentStatementId) {
        await dbService.updateTaxStatement(currentStatementId, statementData);
      } else {
        const newDoc = await dbService.addTaxStatement({
          ...statementData,
          createdAt: new Date().toISOString(),
        } as TaxStatement);
        setCurrentStatementId(newDoc.id);
      }

      await dbService.logActivity({
        type: 'confirm',
        description: `Confirmed ${statementType} tax statement for ${selectedTeacher.name}`,
        userId: user?.id,
        userName: user?.name || 'Unknown User',
        timestamp: new Date().toISOString()
      });

      setIsStatementConfirmed(true);
      setNotification({ message: "Statement confirmed and approved!", type: 'success' });
    } catch (error) {
      console.error("Error confirming statement:", error);
      setNotification({ message: "Failed to confirm statement", type: 'error' });
    } finally {
      setConfirming(false);
    }
  };
  const handleDownloadPDF = (mode: 'Anticipatory' | 'Final' | '12BB' | 'Form16') => {
    if (!selectedTeacher) return;
    const filename = `${selectedTeacher.name}_${mode}_Statement_${activeFY.year}.pdf`;
    const oldTitle = document.title;
    document.title = filename;
    setPrintMode(mode);
    // Restoration of title happens in TaxStatementPrint's onClose
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
      {/* Background UI wrapper - Hidden during print */}
      <div className="space-y-8 print:hidden">
        {notification && (
          <div className={cn(
            "fixed top-20 right-4 z-[100] px-6 py-3 rounded-xl shadow-lg border animate-in fade-in slide-in-from-top-4 duration-300",
            notification.type === 'success' ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
          )}>
            {notification.message}
          </div>
        )}

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

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
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

              <button
                onClick={() => setShow3DVisualizer(true)}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center space-x-2 text-sm font-medium transition-all shadow-sm hover:shadow-md"
              >
                <Box className="h-4 w-4" />
                <span>3D/AR View</span>
              </button>

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
                  className="bg-purple-600 text-white hover:bg-purple-700 px-4 py-2 rounded-lg flex items-center space-x-2 text-sm font-medium transition-colors shadow-sm hover:shadow-md"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>{confirming ? 'Confirming...' : 'Confirm'}</span>
                </button>
              )}

              <div className="relative">
                <button
                  onClick={() => setShowPrintOptions(!showPrintOptions)}
                  onBlur={() => setTimeout(() => setShowPrintOptions(false), 200)}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center space-x-2 text-sm font-medium transition-all shadow-sm hover:shadow-md"
                >
                  <Printer className="h-4 w-4" />
                  <span>Statements</span>
                </button>
                {showPrintOptions && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <button
                      onClick={() => { handleDownloadPDF('Anticipatory'); setShowPrintOptions(false); }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm font-medium border-b border-gray-100 flex items-center"
                    >
                      <div className="bg-blue-50 p-1.5 rounded-lg mr-3"><Printer className="h-4 w-4 text-blue-600" /></div>
                      Anticipatory Statement
                    </button>
                    <button
                      onClick={() => { handleDownloadPDF('Final'); setShowPrintOptions(false); }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm font-medium border-b border-gray-100 flex items-center"
                    >
                      <div className="bg-green-50 p-1.5 rounded-lg mr-3"><CheckCircle className="h-4 w-4 text-green-600" /></div>
                      Final Statement
                    </button>
                    <button
                      onClick={() => { handleDownloadPDF('12BB'); setShowPrintOptions(false); }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm font-medium border-b border-gray-100 flex items-center"
                    >
                      <div className="bg-purple-50 p-1.5 rounded-lg mr-3"><Box className="h-4 w-4 text-purple-600" /></div>
                      Form No. 12BB
                    </button>
                    <button
                      onClick={() => { handleDownloadPDF('Form16'); setShowPrintOptions(false); }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm font-medium flex items-center"
                    >
                      <div className="bg-orange-50 p-1.5 rounded-lg mr-3"><User className="h-4 w-4 text-orange-600" /></div>
                      Form No. 16 Part B
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6 print:hidden">
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

          {selectedTeacher && !isStatementConfirmed && (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h3 className="text-xs font-bold text-gray-700 mb-3 flex items-center">
                <Calculator className="h-4 w-4 mr-2 text-blue-600" />
                Update Monthly Deductions
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
                {['pf', 'gis', 'sli', 'lic', 'medisep', 'gpais', 'nps', 'tds'].map(field => (
                  <div key={field}>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{field}</label>
                    <input
                      type="number"
                      placeholder={`Set ${field}`}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0;
                        const newData = monthlyData.map(m => ({ ...m, [field as keyof MonthlyData]: val }));
                        setMonthlyData(newData as MonthlyData[]);
                      }}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 bg-white"
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden print:hidden">
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
                      <th className="px-3 py-3 text-right font-bold text-gray-500 uppercase">GPAIS</th>
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
                            {isStatementConfirmed ? (
                              <span className="font-bold">{formatCurrency(m.basicPay)}</span>
                            ) : (
                              <input
                                type="number"
                                value={m.basicPay || 0}
                                onChange={e => handleBasicPayChange(idx, parseInt(e.target.value) || 0)}
                                className="w-20 text-right bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none font-bold"
                              />
                            )}
                          </td>
                          <td className="px-3 py-3 text-right text-gray-500">{monthConfig?.daPercent}%</td>
                          <td className="px-3 py-3 text-right text-gray-600">{formatCurrency(m.da)}</td>
                          <td className="px-3 py-3 text-right text-gray-600">{formatCurrency(m.hra)}</td>
                          <td className="px-3 py-3 text-right font-bold text-blue-600">{formatCurrency(n(m.basicPay) + n(m.da) + n(m.hra))}</td>
                          <td className="px-3 py-3 text-right">
                            {isStatementConfirmed ? (
                              <span>{formatCurrency(m.pf)}</span>
                            ) : (
                              <input type="number" value={m.pf || 0} onChange={e => {
                                const newData = [...monthlyData];
                                newData[idx].pf = parseInt(e.target.value) || 0;
                                setMonthlyData(newData);
                              }} className="w-16 text-right bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none" />
                            )}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {isStatementConfirmed ? (
                              <span>{formatCurrency(m.gis)}</span>
                            ) : (
                              <input type="number" value={m.gis || 0} onChange={e => {
                                const newData = [...monthlyData];
                                newData[idx].gis = parseInt(e.target.value) || 0;
                                setMonthlyData(newData);
                              }} className="w-12 text-right bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none" />
                            )}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {isStatementConfirmed ? (
                              <span>{formatCurrency(m.sli)}</span>
                            ) : (
                              <input type="number" value={m.sli || 0} onChange={e => {
                                const newData = [...monthlyData];
                                newData[idx].sli = parseInt(e.target.value) || 0;
                                setMonthlyData(newData);
                              }} className="w-12 text-right bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none" />
                            )}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {isStatementConfirmed ? (
                              <span>{formatCurrency(m.lic)}</span>
                            ) : (
                              <input type="number" value={m.lic || 0} onChange={e => {
                                const newData = [...monthlyData];
                                newData[idx].lic = parseInt(e.target.value) || 0;
                                setMonthlyData(newData);
                              }} className="w-12 text-right bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none" />
                            )}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {isStatementConfirmed ? (
                              <span>{formatCurrency(m.medisep)}</span>
                            ) : (
                              <input type="number" value={m.medisep || 0} onChange={e => {
                                const newData = [...monthlyData];
                                newData[idx].medisep = parseInt(e.target.value) || 0;
                                setMonthlyData(newData);
                              }} className="w-12 text-right bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none" />
                            )}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {isStatementConfirmed ? (
                              <span>{formatCurrency(m.gpais)}</span>
                            ) : (
                              <input type="number" value={m.gpais || 0} onChange={e => {
                                const newData = [...monthlyData];
                                newData[idx].gpais = parseInt(e.target.value) || 0;
                                setMonthlyData(newData);
                              }} className="w-12 text-right bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none" />
                            )}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {isStatementConfirmed ? (
                              <span>{formatCurrency(m.nps)}</span>
                            ) : (
                              <input type="number" value={m.nps || 0} onChange={e => {
                                const newData = [...monthlyData];
                                newData[idx].nps = parseInt(e.target.value) || 0;
                                setMonthlyData(newData);
                              }} className="w-16 text-right bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none" />
                            )}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {isStatementConfirmed ? (
                              <span>{formatCurrency(m.tds)}</span>
                            ) : (
                              <input type="number" value={m.tds || 0} onChange={e => {
                                const newData = [...monthlyData];
                                newData[idx].tds = parseInt(e.target.value) || 0;
                                setMonthlyData(newData);
                              }} className="w-16 text-right bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
                      <td className="px-3 py-3">TOTAL</td>
                      <td className="px-3 py-3 text-right">{formatCurrency(totals.basicPay)}</td>
                      <td className="px-3 py-3 text-right">-</td>
                      <td className="px-3 py-3 text-right">{formatCurrency(totals.da)}</td>
                      <td className="px-3 py-3 text-right">{formatCurrency(totals.hra)}</td>
                      <td className="px-3 py-3 text-right text-blue-700">{formatCurrency(totals.total)}</td>
                      <td className="px-3 py-3 text-right">{formatCurrency(totals.pf)}</td>
                      <td className="px-3 py-3 text-right">{formatCurrency(totals.gis)}</td>
                      <td className="px-3 py-3 text-right">{formatCurrency(totals.sli)}</td>
                      <td className="px-3 py-3 text-right">{formatCurrency(totals.lic)}</td>
                      <td className="px-3 py-3 text-right">{formatCurrency(totals.medisep)}</td>
                      <td className="px-3 py-3 text-right">{formatCurrency(totals.gpais)}</td>
                      <td className="px-3 py-3 text-right">{formatCurrency(totals.nps)}</td>
                      <td className="px-3 py-3 text-right">{formatCurrency(totals.tds)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:hidden">
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
                        {isStatementConfirmed ? (
                          <span className="font-bold">{formatCurrency(festivalAllowance)}</span>
                        ) : (
                          <input type="number" value={festivalAllowance || 0} onChange={e => setFestivalAllowance(parseInt(e.target.value) || 0)} className="w-24 text-right border-b border-gray-200 outline-none focus:border-blue-500" />
                        )}
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">DA Arrear</span>
                        {isStatementConfirmed ? (
                          <span className="font-bold">{formatCurrency(daArrear)}</span>
                        ) : (
                          <input type="number" value={daArrear || 0} onChange={e => setDaArrear(parseInt(e.target.value) || 0)} className="w-24 text-right border-b border-gray-200 outline-none focus:border-blue-500" />
                        )}
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Pay Revision Arrear</span>
                        {isStatementConfirmed ? (
                          <span className="font-bold">{formatCurrency(payRevisionArrear)}</span>
                        ) : (
                          <input type="number" value={payRevisionArrear || 0} onChange={e => setPayRevisionArrear(parseInt(e.target.value) || 0)} className="w-24 text-right border-b border-gray-200 outline-none focus:border-blue-500" />
                        )}
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Leave Surrender</span>
                        {isStatementConfirmed ? (
                          <span className="font-bold">{formatCurrency(leaveSurrender)}</span>
                        ) : (
                          <input type="number" value={leaveSurrender || 0} onChange={e => setLeaveSurrender(parseInt(e.target.value) || 0)} className="w-24 text-right border-b border-gray-200 outline-none focus:border-blue-500" />
                        )}
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Other Income</span>
                        {isStatementConfirmed ? (
                          <span className="font-bold">{formatCurrency(otherIncome)}</span>
                        ) : (
                          <input type="number" value={otherIncome || 0} onChange={e => setOtherIncome(parseInt(e.target.value) || 0)} className="w-24 text-right border-b border-gray-200 outline-none focus:border-blue-500" />
                        )}
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

                          <div className="pt-2 border-t border-gray-100">
                            <h5 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Section 80C (Limit: {formatCurrency(activeFY.deductionLimits?.section80C || 150000)})</h5>
                            <div className="space-y-1 pl-2">
                              <div className="flex justify-between items-center text-xs text-gray-500">
                                <span>PF / GIS / SLI / LIC / NPS / GPAIS</span>
                                <span>{formatCurrency(n(totals.pf) + n(totals.gis) + n(totals.sli) + n(totals.lic) + n(totals.nps) + n(totals.gpais))}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-600">HBA Principal</span>
                                {isStatementConfirmed ? (
                                  <span className="font-bold">{formatCurrency(hbaPrincipal)}</span>
                                ) : (
                                  <input type="number" value={hbaPrincipal || 0} onChange={e => setHbaPrincipal(parseInt(e.target.value) || 0)} className="w-24 text-right border-b border-gray-200 outline-none focus:border-blue-500" />
                                )}
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-600">Tuition Fees</span>
                                {isStatementConfirmed ? (
                                  <span className="font-bold">{formatCurrency(tuitionFees)}</span>
                                ) : (
                                  <input type="number" value={tuitionFees || 0} onChange={e => setTuitionFees(parseInt(e.target.value) || 0)} className="w-24 text-right border-b border-gray-200 outline-none focus:border-blue-500" />
                                )}
                              </div>
                              <div className="flex justify-between items-center text-sm font-medium text-red-600 pt-1">
                                <span>Total 80C (Limited)</span>
                                <span>- {formatCurrency(taxCalc?.section80C || 0)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-gray-100">
                            <h5 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Section 80D / Others</h5>
                            <div className="space-y-1 pl-2">
                              <div className="flex justify-between items-center text-xs text-red-600">
                                <span>Medisep (80D)</span>
                                <span>- {formatCurrency(taxCalc?.section80D || 0)}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-600">80G (Donations)</span>
                                {isStatementConfirmed ? (
                                  <span className="font-bold">{formatCurrency(section80G)}</span>
                                ) : (
                                  <input type="number" value={section80G || 0} onChange={e => setSection80G(parseInt(e.target.value) || 0)} className="w-24 text-right border-b border-gray-200 outline-none focus:border-blue-500" />
                                )}
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-600">80E (Edu Loan)</span>
                                {isStatementConfirmed ? (
                                  <span className="font-bold">{formatCurrency(section80E)}</span>
                                ) : (
                                  <input type="number" value={section80E || 0} onChange={e => setSection80E(parseInt(e.target.value) || 0)} className="w-24 text-right border-b border-gray-200 outline-none focus:border-blue-500" />
                                )}
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-600">HBA Interest (Section 24)</span>
                                {isStatementConfirmed ? (
                                  <span className="font-bold">{formatCurrency(hbaInterest)}</span>
                                ) : (
                                  <input type="number" value={hbaInterest || 0} onChange={e => setHbaInterest(parseInt(e.target.value) || 0)} className="w-24 text-right border-b border-gray-200 outline-none focus:border-blue-500" />
                                )}
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-600">Any Other Deductions</span>
                                {isStatementConfirmed ? (
                                  <span className="font-bold">{formatCurrency(anyOtherDeductions)}</span>
                                ) : (
                                  <input type="number" value={anyOtherDeductions || 0} onChange={e => setAnyOtherDeductions(parseInt(e.target.value) || 0)} className="w-24 text-right border-b border-gray-200 outline-none focus:border-blue-500" />
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between items-center text-sm text-red-600">
                          <span>Standard Deduction</span>
                          <span>- {formatCurrency(taxCalc?.standardDeduction || activeFY.standardDeduction)}</span>
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
                    <span className="font-bold text-gray-900">{formatCurrency(taxDeducted > 0 ? taxDeducted : totals.tds)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xl pt-4 border-t font-black">
                    <span className="text-gray-900">Balance Tax Due</span>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setShow3DVisualizer(true)}
                        className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                        title="Visualize in 3D/AR"
                      >
                        <Box className="h-5 w-5" />
                      </button>
                      <span className={cn("px-4 py-1 rounded-lg", (taxCalc?.balance || 0) > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
                        {formatCurrency(taxCalc?.balance || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-8 bg-blue-50 p-6 rounded-2xl border border-blue-100 print:hidden">
              <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                Smart Tax Optimization Tips
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-bold text-blue-800 text-sm uppercase tracking-wider">New Regime</h4>
                  <ul className="text-sm text-blue-700 space-y-2 list-disc pl-4">
                    <li><strong>Marginal Relief:</strong> If your income is between ₹12,00,001 and ₹12,75,000, you get marginal relief.</li>
                    <li><strong>Standard Deduction:</strong> ₹75,000 is automatically deducted.</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-bold text-blue-800 text-sm uppercase tracking-wider">Old Regime Optimization</h4>
                  <ul className="text-sm text-blue-700 space-y-2 list-disc pl-4">
                    <li><strong>Section 80C:</strong> Maximize ₹1.5 Lakh limit with PF, LIC, SLI, GIS, GPAIS, and Housing Loan Principal.</li>
                    <li><strong>Section 80D:</strong> Medisep premium is deductible.</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
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

      </div>

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

      <AnimatePresence>
        {show3DVisualizer && (
          <Tax3DVisualizer
            data={{
              grossSalary: taxCalc.grossSalary,
              taxableIncome: taxCalc.taxableIncome,
              totalTax: taxCalc.totalTax,
              deductions: taxCalc.deductions,
              standardDeduction: taxCalc.standardDeduction,
              section80C: taxCalc.section80C,
              section80D: taxCalc.section80D
            }}
            activeFY={activeFY}
            regime={regime}
            monthlyData={monthlyData}
            onClose={() => setShow3DVisualizer(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
