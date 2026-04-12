import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dbService, authService } from '../api';
import { FinancialYear, TaxStatement } from '../types';
import { Printer, Calculator, FileText, CheckCircle, AlertCircle, Calendar, Eye } from 'lucide-react';
import TaxStatementPrint from './TaxStatementPrint';
import { formatCurrency } from '../lib/utils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function UserDashboard() {
  const [fys, setFys] = useState<FinancialYear[]>([]);
  const [statements, setStatements] = useState<TaxStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [printData, setPrintData] = useState<any | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const userProfile = await authService.getProfile();
        setProfile(userProfile);

        const allFys = await dbService.getFinancialYears();
        // Sort: Active first, then descending order
        allFys.sort((a, b) => {
          if (a.isActive && !b.isActive) return -1;
          if (!a.isActive && b.isActive) return 1;
          return parseInt(b.year.split('-')[0]) - parseInt(a.year.split('-')[0]);
        });
        setFys(allFys);

        if (userProfile?.teacher?.id) {
          const userStatements = await dbService.getTaxStatements({ teacherId: userProfile.teacher.id });
          setStatements(userStatements);
        }
      } catch (error) {
        console.error("Error fetching user dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handlePrint = (fy: FinancialYear, statement: TaxStatement, mode: 'Anticipatory' | 'Final' | '12BB' | 'Form16') => {
    if (!profile?.teacher) return;
    const teacher = profile.teacher;

    const totals = {
      total: (statement.monthlyData || []).reduce((acc: number, m: any) => acc + (m.basicPay + m.da + m.hra + m.ca + m.otherAllowance), 0),
      totalDeductions: (statement.monthlyData || []).reduce((acc: number, m: any) => acc + (m.pf + m.gis + m.sli + m.lic + m.medisep + m.gpais + m.nps), 0)
    };
    
    const grossSalary = totals.total + (statement.festivalAllowance || 0) + (statement.daArrear || 0) + (statement.payRevisionArrear || 0) + (statement.otherIncome || 0);
    const stdDeduction = statement.regime === 'New' ? fy.standardDeduction : fy.standardDeductionOld;
    // Simple mock deduction, precise enough for what UI displays as summary
    const deductions = statement.regime === 'New' 
      ? stdDeduction 
      : (stdDeduction + (statement.section80C || 0) + (statement.section80D || 0) + (statement.section80G || 0) + (statement.section80E || 0) + (statement.hbaInterest || 0) + (statement.anyOtherDeductions || 0));
    
    const taxableIncome = Math.max(0, grossSalary - deductions);

    setPrintData({
      mode,
      teacher,
      fy,
      monthlyData: statement.monthlyData,
      taxCalc: {
        grossSalary,
        taxableIncome,
        taxOnTotal: statement.taxOnTotalIncome,
        cess: statement.cess,
        totalTax: statement.totalTax,
        balance: statement.balanceTax,
        deductions,
        standardDeduction: stdDeduction,
        incomeChargeableSalaries: Math.max(0, grossSalary - stdDeduction),
        marginalRelief: statement.taxRebate || 0,
        section80C: statement.section80C || 0,
        section80D: statement.section80D || 0,
        section80G: statement.section80G || 0,
        section80E: statement.section80E || 0,
        hbaInterest: statement.hbaInterest || 0,
        anyOtherDeductions: statement.anyOtherDeductions || 0,
        festivalAllowance: statement.festivalAllowance || 0,
        daArrear: statement.daArrear || 0,
        payRevisionArrear: statement.payRevisionArrear || 0,
        otherIncome: statement.otherIncome || 0,
        leaveSurrender: statement.leaveSurrender || 0,
        hbaPrincipal: statement.hbaPrincipal || 0,
        tuitionFees: statement.tuitionFees || 0,
        taxDeducted: statement.taxDeducted || 0
      }
    });

    const filename = `${teacher.name}_${mode}_Statement_${fy.year}.pdf`;
    document.title = filename;
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
        <p className="text-gray-600">Manage your income tax statements efficiently.</p>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {fys.map((fy) => {
          // Find statement for this FY
          // Because FY ID can be object or string
          const statement = statements.find(s => {
            const statementFyId = typeof s.financialYearId === 'object' ? (s.financialYearId as any).id || (s.financialYearId as any)._id : s.financialYearId;
            return statementFyId === fy.id;
          });

          return (
            <div key={fy.id} className={`bg-white p-6 rounded-2xl shadow-sm border ${fy.isActive ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-200'}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-xl ${fy.isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-xl font-bold text-gray-900">{fy.year}</h3>
                      {fy.isActive && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wider">Active</span>}
                    </div>
                    {statement ? (
                      <div className="flex items-center space-x-2 mt-1">
                        {statement.isConfirmed ? (
                          <span className="flex items-center text-sm text-green-600 font-medium"><CheckCircle className="h-4 w-4 mr-1" /> Confirmed</span>
                        ) : (
                          <span className="flex items-center text-sm text-amber-600 font-medium"><AlertCircle className="h-4 w-4 mr-1" /> Draft</span>
                        )}
                        <span className="text-gray-400">&bull;</span>
                        <span className="text-sm text-gray-600">Regime: {statement.regime}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 mt-1">No statement created yet.</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-row flex-wrap gap-2">
                  {/* Actions for Active FY */}
                  {fy.isActive ? (
                    <>
                      {/* Only allow edit/calculate if it's not confirmed */}
                      {!statement?.isConfirmed ? (
                        <button
                          onClick={() => navigate(`/calculate/${profile?.teacher?.id}`)}
                          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition flex items-center shadow-sm"
                        >
                          <Calculator className="h-4 w-4 mr-2" />
                          Calculate / Edit
                        </button>
                      ) : (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handlePrint(fy, statement!, 'Anticipatory')}
                            className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition flex items-center border border-gray-300"
                          >
                            <Printer className="h-4 w-4 mr-2" /> Anticipatory
                          </button>
                          <button
                            onClick={() => handlePrint(fy, statement!, 'Final')}
                            className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition flex items-center border border-gray-300"
                          >
                            <Printer className="h-4 w-4 mr-2" /> Final
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Actions for Past FYs */
                    <>
                      {statement && statement.isConfirmed && (
                         <div className="flex space-x-2">
                           <button
                             onClick={() => handlePrint(fy, statement!, 'Anticipatory')}
                             className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition flex items-center border border-gray-300 text-sm"
                           >
                             <Printer className="h-4 w-4 mr-2 text-gray-500" /> Anticipatory
                           </button>
                           <button
                             onClick={() => handlePrint(fy, statement!, 'Final')}
                             className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition flex items-center border border-gray-300 text-sm"
                           >
                             <Printer className="h-4 w-4 mr-2 text-gray-500" /> Final
                           </button>
                         </div>
                      )}
                      {statement && !statement.isConfirmed && (
                          <span className="text-sm text-gray-500 italic mt-2">Draft, Cannot be edited</span>
                      )}
                      {!statement && (
                          <span className="text-sm text-gray-400 italic mt-2">No Statement Available</span>
                      )}
                    </>
                  )}
                </div>

              </div>
            </div>
          );
        })}
        {fys.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">No Financial Years Yet</h2>
            <p className="text-gray-600 mt-2">Please wait for the administrator to set up a financial year.</p>
          </div>
        )}
      </div>

      {printData && (
        <div className="fixed inset-0 bg-white z-[100] overflow-y-auto p-4 sm:p-8 print:p-0">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6 print:hidden">
              <h2 className="text-xl font-bold text-gray-900">{printData.mode} Statement Preview</h2>
              <div className="space-x-3">
                <button 
                  onClick={() => {
                    document.title = 'School Income Tax Manager';
                    setPrintData(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button 
                  onClick={() => window.print()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
                >
                  Print
                </button>
              </div>
            </div>
            <TaxStatementPrint 
              mode={printData.mode}
              teacher={printData.teacher}
              fy={printData.fy}
              monthlyData={printData.monthlyData}
              taxCalc={printData.taxCalc}
              onClose={() => {
                document.title = 'School Income Tax Manager';
                setPrintData(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
