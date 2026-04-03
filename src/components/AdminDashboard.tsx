import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { FinancialYear, Teacher, TaxStatement } from '../types';
import { Users, Settings, Calculator, PlusCircle, AlertCircle, Download, FileText, Printer, Clock } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import TaxStatementPrint from './TaxStatementPrint';
import RecentActivity from './RecentActivity';

export default function AdminDashboard({ isAdmin }: { isAdmin: boolean }) {
  const [activeFY, setActiveFY] = useState<FinancialYear | null>(null);
  const [teacherCount, setTeacherCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState<'Anticipatory' | 'Final' | '12BB' | 'Form16'>('Anticipatory');
  const [bulkPrintData, setBulkPrintData] = useState<{ mode: 'Anticipatory' | 'Final' | '12BB' | 'Form16', statements: any[] } | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Get active FY
        const fyQuery = query(collection(db, 'financialYears'), where('isActive', '==', true), limit(1));
        const fySnapshot = await getDocs(fyQuery);
        if (!fySnapshot.empty) {
          setActiveFY({ id: fySnapshot.docs[0].id, ...fySnapshot.docs[0].data() } as FinancialYear);
        }

        // Get teacher count
        const teachersSnapshot = await getDocs(collection(db, 'teachers'));
        setTeacherCount(teachersSnapshot.size);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleBulkExport = async () => {
    if (!activeFY) return;
    setExporting(true);
    try {
      const q = query(
        collection(db, 'taxStatements'),
        where('financialYearId', '==', activeFY.id),
        where('isConfirmed', '==', true)
      );
      const snap = await getDocs(q);
      const statements = snap.docs.map(d => ({ id: d.id, ...d.data() } as TaxStatement));
      
      if (statements.length === 0) {
        alert("No confirmed statements found for this financial year.");
        return;
      }

      // Fetch teachers for these statements
      const teacherIds = [...new Set(statements.map(s => s.teacherId))];
      const teachersSnap = await getDocs(collection(db, 'teachers'));
      const teachersMap = new Map(teachersSnap.docs.map(d => [d.id, { id: d.id, ...d.data() } as Teacher]));

      // Prepare data for bulk print
      const bulkData = statements.map(s => {
        const teacher = teachersMap.get(s.teacherId);
        if (!teacher) return null;
        
        // Mock taxCalc result for print component
        // In a real app, you'd re-calculate or store the full result
        const totals = {
          total: (s.monthlyData || []).reduce((acc, m) => acc + (m.basicPay + m.da + m.hra + m.ca + m.otherAllowance), 0),
          totalDeductions: (s.monthlyData || []).reduce((acc, m) => acc + (m.pf + m.gis + m.sli + m.lic + m.medisep + m.gpais + m.nps), 0)
        };
        
        const grossSalary = totals.total + (s.festivalAllowance || 0) + (s.daArrear || 0) + (s.payRevisionArrear || 0) + (s.otherIncome || 0);
        const deductions = s.regime === 'New' ? activeFY.standardDeduction : (activeFY.standardDeductionOld + Math.min(150000, (s.monthlyData || []).reduce((acc, m) => acc + (m.pf + m.nps + m.gis + m.sli + m.lic), 0)) + (s.monthlyData || []).reduce((acc, m) => acc + m.medisep, 0));
        const taxableIncome = Math.max(0, grossSalary - deductions);
        
        return {
          mode: exportType,
          teacher,
          fy: activeFY,
          monthlyData: s.monthlyData,
          taxCalc: {
            grossSalary,
            taxableIncome,
            taxOnTotal: s.taxOnTotalIncome,
            cess: s.cess,
            totalTax: s.totalTax,
            taxDeducted: s.taxDeducted,
            balance: s.balanceTax,
            standardDeduction: deductions,
            totalDeductions: totals.totalDeductions,
            section80C: s.section80C || 0,
            section80D: s.section80D || 0
          }
        };
      }).filter(Boolean);

      setBulkPrintData({ mode: exportType, statements: bulkData });
    } catch (error) {
      console.error("Error bulk exporting:", error);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to the School Income Tax Management System.</p>
      </header>

      {!activeFY && isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-amber-800">No Active Financial Year</h3>
            <p className="text-sm text-amber-700 mt-1">
              Please set up and activate a financial year to start calculations.
            </p>
            <Link to="/admin/fy" className="text-sm font-semibold text-amber-800 underline mt-2 inline-block">
              Manage Financial Years
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Active FY Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Settings className="h-6 w-6 text-blue-600" />
            </div>
            {activeFY && <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-wider">Active</span>}
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Financial Year</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{activeFY ? activeFY.year : 'None'}</p>
          {activeFY && (
            <div className="mt-4 space-y-1">
              <p className="text-xs text-gray-500">School: <span className="font-medium text-gray-700">{activeFY.schoolName}</span></p>
              <p className="text-xs text-gray-500">
                DA: <span className="font-medium text-gray-700">{activeFY.monthlyConfig?.[0]?.daPercent}% - {activeFY.monthlyConfig?.[11]?.daPercent}%</span> | 
                HRA: <span className="font-medium text-gray-700">{activeFY.monthlyConfig?.[0]?.hraPercent}%</span>
              </p>
            </div>
          )}
        </div>

        {/* Teachers Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Total Teachers</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{teacherCount}</p>
          <div className="mt-4">
            <Link to="/admin/teachers" className="text-xs font-semibold text-purple-600 hover:underline">Manage Teachers &rarr;</Link>
          </div>
        </div>

        {/* Bulk Export Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Download className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Bulk Export</h3>
          <div className="mt-4 space-y-3">
            <select 
              value={exportType}
              onChange={e => setExportType(e.target.value as any)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="Anticipatory">Anticipatory</option>
              <option value="Final">Final</option>
              <option value="12BB">Form 12BB</option>
              <option value="Form16">Form 16 Part B</option>
            </select>
            <button 
              onClick={handleBulkExport}
              disabled={!activeFY || exporting}
              className="w-full bg-amber-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <Printer className="h-3 w-3" />
              <span>{exporting ? 'Preparing...' : 'Bulk Print Confirmed'}</span>
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-50 rounded-lg">
              <Calculator className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Quick Actions</h3>
          <div className="mt-4 space-y-2">
            <Link to="/calculate" className="flex items-center text-sm font-medium text-gray-700 hover:text-green-600">
              <PlusCircle className="h-4 w-4 mr-2" /> New Calculation
            </Link>
            {isAdmin && (
              <Link to="/admin/teachers" className="flex items-center text-sm font-medium text-gray-700 hover:text-purple-600">
                <PlusCircle className="h-4 w-4 mr-2" /> Add Teacher
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Recent Statements</h2>
              <Link to="/calculate" className="text-sm text-blue-600 font-bold hover:underline">New Statement</Link>
            </div>
            <div className="p-6 text-center text-gray-500">
              <p>No recent tax statements found.</p>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
            </div>
            <div className="p-4">
              <RecentActivity />
            </div>
          </section>
        </div>
      </div>
      {bulkPrintData && (
        <div className="fixed inset-0 bg-white z-[100] overflow-y-auto p-8 print:p-0">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8 print:hidden">
              <h2 className="text-xl font-bold text-gray-900">Bulk {bulkPrintData.mode} Statements Preview ({bulkPrintData.statements.length})</h2>
              <div className="space-x-4">
                <button 
                  onClick={() => setBulkPrintData(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button 
                  onClick={() => window.print()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
                >
                  Print All
                </button>
              </div>
            </div>
            <div className="space-y-8">
              {bulkPrintData.statements.map((s, idx) => (
                <div key={idx} className="print:break-after-page">
                  <TaxStatementPrint 
                    mode={s.mode}
                    teacher={s.teacher}
                    fy={s.fy}
                    monthlyData={s.monthlyData}
                    taxCalc={s.taxCalc}
                    onClose={() => {}} // No-op for bulk print
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
