import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dbService } from '../api';
import { FinancialYear, Teacher, TaxStatement } from '../types';
import { Users, Settings, Calculator, PlusCircle, AlertCircle, Download, FileText, Printer, Clock } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import TaxStatementPrint from './TaxStatementPrint';
import ConsolidatedReportPrint from './ConsolidatedReportPrint';
import RecentActivity from './RecentActivity';

export default function AdminDashboard({ isAdmin }: { isAdmin: boolean }) {
  const [activeFY, setActiveFY] = useState<FinancialYear | null>(null);
  const [teacherCount, setTeacherCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recentStatements, setRecentStatements] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState<'Anticipatory' | 'Final' | '12BB' | 'Form16' | 'Consolidated'>('Anticipatory');
  const [bulkPrintData, setBulkPrintData] = useState<{ mode: 'Anticipatory' | 'Final' | '12BB' | 'Form16' | 'Consolidated', statements: any[] } | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const fy = await dbService.getActiveFY();
        setActiveFY(fy);

        const teachers = await dbService.getAllTeachers();
        setTeacherCount(teachers.length);

        const recentStmts = await dbService.getTaxStatements({ limit: 5, sortBy: 'updatedAt' });
        setRecentStatements(recentStmts);
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
      const statements = await dbService.getTaxStatements({ fyId: activeFY.id, isConfirmed: 'true' });

      if (statements.length === 0) {
        alert("No confirmed statements found for this financial year.");
        return;
      }

      const teachers = await dbService.getAllTeachers();
      const teachersMap = new Map(teachers.map((t: Teacher) => [t.id, t]));

      // Prepare data for bulk print
      const bulkData = statements.map(s => {
        const teacher = typeof s.teacherId === 'object' ? s.teacherId : teachersMap.get(s.teacherId);
        if (!teacher) return null;

        // Mock taxCalc result for print component
        // In a real app, you'd re-calculate or store the full result
        const totals = {
          total: (s.monthlyData || []).reduce((acc: number, m: any) => acc + (m.basicPay + m.da + m.hra + m.ca + m.otherAllowance), 0),
          totalDeductions: (s.monthlyData || []).reduce((acc: number, m: any) => acc + (m.pf + m.gis + m.sli + m.lic + m.medisep + m.gpais + m.nps), 0)
        };

        const grossSalary = totals.total + (s.festivalAllowance || 0) + (s.daArrear || 0) + (s.payRevisionArrear || 0) + (s.otherIncome || 0);
        const deductions = s.regime === 'New' ? activeFY.standardDeduction : (activeFY.standardDeductionOld + Math.min(150000, (s.monthlyData || []).reduce((acc: number, m: any) => acc + (m.pf + m.nps + m.gis + m.sli + m.lic), 0)) + (s.monthlyData || []).reduce((acc: number, m: any) => acc + m.medisep, 0));
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
            balance: s.balanceTax,
            deductions: s.regime === 'New' ? activeFY.standardDeduction : (activeFY.standardDeductionOld + (s.section80C || 0) + (s.section80D || 0) + (s.section80G || 0) + (s.section80E || 0) + (s.hbaInterest || 0) + (s.anyOtherDeductions || 0)),
            standardDeduction: s.regime === 'New' ? activeFY.standardDeduction : activeFY.standardDeductionOld,
            incomeChargeableSalaries: Math.max(0, grossSalary - (s.regime === 'New' ? activeFY.standardDeduction : activeFY.standardDeductionOld)),
            marginalRelief: s.taxRebate || 0,
            section80C: s.section80C || 0,
            section80D: s.section80D || 0,
            section80G: s.section80G || 0,
            section80E: s.section80E || 0,
            hbaInterest: s.hbaInterest || 0,
            anyOtherDeductions: s.anyOtherDeductions || 0,
            festivalAllowance: s.festivalAllowance || 0,
            daArrear: s.daArrear || 0,
            payRevisionArrear: s.payRevisionArrear || 0,
            otherIncome: s.otherIncome || 0,
            leaveSurrender: s.leaveSurrender || 0,
            hbaPrincipal: s.hbaPrincipal || 0,
            tuitionFees: s.tuitionFees || 0,
            taxDeducted: s.taxDeducted || 0
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
              <Printer className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Reports</h3>
          <div className="mt-4 space-y-3">
            <select
              value={exportType}
              onChange={e => setExportType(e.target.value as any)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="Consolidated">Consolidated TDS</option>
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
              <span>{exporting ? 'Preparing...' : 'Print Report'}</span>
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
          <div className="mt-4 space-y-3">
            <Link to="/calculate" className="flex items-center text-sm font-medium text-gray-700 hover:text-green-600">
              <PlusCircle className="h-4 w-4 mr-2" /> New Calculation
            </Link>
            {isAdmin && (
              <Link to="/admin/teachers" className="flex items-center text-sm font-medium text-gray-700 hover:text-purple-600">
                <Users className="h-4 w-4 mr-2" /> Add Teacher
              </Link>
            )}
            <button
              onClick={() => {
                setExportType('Consolidated');
                // Use setTimeout to ensure state updates before handling
                setTimeout(() => handleBulkExport(), 0);
              }}
              disabled={!activeFY || exporting}
              className="flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 w-full text-left disabled:opacity-50"
            >
              <FileText className="h-4 w-4 mr-2" />
              Consolidate Office Report
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <div className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                <h2 className="text-lg font-bold text-gray-900">Recent Statements</h2>
              </div>
              <Link to="/calculate" className="text-sm text-blue-600 font-bold hover:underline">New Statement</Link>
            </div>

            {recentStatements.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {recentStatements.map((stmt, idx) => (
                  <div key={idx} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-start space-x-4">
                      <div className={`p-2 rounded-lg mt-1 flex-shrink-0 ${stmt.isConfirmed ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">
                          {stmt.teacherId?.name || 'Unknown Teacher'}
                          <span className="ml-2 text-xs font-normal text-gray-500">PEN: {stmt.teacherId?.penNumber}</span>
                        </h4>
                        <div className="flex items-center space-x-3 mt-1.5">
                          <span className="text-xs text-gray-500 font-medium px-2 py-0.5 bg-gray-100 rounded-md border border-gray-200">
                            {stmt.financialYearId?.year}
                          </span>
                          <span className="text-xs text-gray-500">
                            Regime: <span className="font-medium text-gray-700">{stmt.regime}</span>
                          </span>
                          <span className="text-xs text-gray-500">
                            Type: <span className="font-medium text-gray-700">{stmt.type}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {formatCurrency(stmt.totalTax || 0)}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${stmt.isConfirmed ? 'text-green-600' : 'text-amber-600'}`}>
                        {stmt.isConfirmed ? 'Confirmed' : 'Draft'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <FileText className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium text-sm">No recent tax statements found.</p>
                <p className="text-gray-400 text-xs mt-1">Calculations saved will appear here.</p>
              </div>
            )}
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
        bulkPrintData.mode === 'Consolidated' && activeFY ? (
          <div className="fixed inset-0 bg-white z-[100] overflow-y-auto p-4 md:p-8 print:p-0">
            <ConsolidatedReportPrint
              statements={bulkPrintData.statements}
              fy={activeFY}
              onClose={() => setBulkPrintData(null)}
            />
          </div>
        ) : (
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
              <div className="space-y-8 print:space-y-0 print:block">
                {bulkPrintData.statements.map((s, idx) => (
                  <div key={idx} className={idx < bulkPrintData.statements.length - 1 ? "print:border-0 print:m-0 print:p-0" : "print:border-0 print:m-0 print:p-0"} style={idx < bulkPrintData.statements.length - 1 ? { pageBreakAfter: 'always' } : {}}>
                    <TaxStatementPrint
                      mode={s.mode as any}
                      teacher={s.teacher}
                      fy={s.fy}
                      monthlyData={s.monthlyData}
                      taxCalc={s.taxCalc}
                      onClose={() => { }} // No-op for bulk print
                      isBulk={true}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
