import React from 'react';
import { FinancialYear, Teacher, TaxStatement, MonthlyData } from '../types';
import { formatCurrency } from '../lib/utils';

interface TaxStatementPrintProps {
  mode: 'Anticipatory' | 'Final' | '12BB' | 'Form16';
  teacher: Teacher;
  fy: FinancialYear;
  monthlyData: MonthlyData[];
  taxCalc: {
    grossSalary: number;
    taxableIncome: number;
    taxOnTotal: number;
    cess: number;
    totalTax: number;
    balance: number;
    deductions: number;
    standardDeduction: number;
    incomeChargeableSalaries: number;
    marginalRelief?: number;
    section80C?: number;
    section80D?: number;
    festivalAllowance?: number;
    daArrear?: number;
    payRevisionArrear?: number;
    otherIncome?: number;
    taxDeducted?: number;
  };
  onClose: () => void;
}

export default function TaxStatementPrint({ mode, teacher, fy, monthlyData, taxCalc, onClose }: TaxStatementPrintProps) {
  const handlePrint = () => {
    window.print();
  };

  const n = (val: any) => {
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  const f = (val: any) => formatCurrency(n(val));

  const renderAnticipatoryOrFinal = () => (
    <div className="border-2 border-black p-8 text-black font-serif">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold uppercase underline mb-2">
          {mode === 'Anticipatory' ? 'Anticipatory Income Tax Statement' : 'Final Income Tax Statement'}
        </h1>
        <h2 className="text-xl font-bold">{fy.year}</h2>
        <p className="text-lg font-bold mt-2">{fy.schoolName}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8 border-b-2 border-black pb-4">
        <div>
          <p><span className="font-bold">Name:</span> {teacher.name}</p>
          <p><span className="font-bold">Designation:</span> {teacher.designation}</p>
          <p><span className="font-bold">PEN:</span> {teacher.penNumber}</p>
        </div>
        <div>
          <p><span className="font-bold">PAN:</span> {teacher.panNumber}</p>
          <p><span className="font-bold">Aadhaar:</span> {teacher.aadhaarNumber}</p>
          <p><span className="font-bold">Regime:</span> {teacher.taxRegime || 'New'}</p>
        </div>
      </div>

      <table className="w-full border-collapse border border-black mb-8 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black px-2 py-1">Month</th>
            <th className="border border-black px-2 py-1">Basic Pay</th>
            <th className="border border-black px-2 py-1">DA</th>
            <th className="border border-black px-2 py-1">HRA</th>
            <th className="border border-black px-2 py-1">Other</th>
            <th className="border border-black px-2 py-1">Gross</th>
            <th className="border border-black px-2 py-1">PF/NPS</th>
            <th className="border border-black px-2 py-1">GIS/SLI</th>
            <th className="border border-black px-2 py-1">Other Ded</th>
            <th className="border border-black px-2 py-1">TDS</th>
            <th className="border border-black px-2 py-1">Total Ded</th>
            <th className="border border-black px-2 py-1">Net</th>
          </tr>
        </thead>
        <tbody>
          {monthlyData.map((m) => {
            const gross = n(m.basicPay) + n(m.da) + n(m.hra) + n(m.ca) + n(m.otherAllowance);
            const totalDed = n(m.pf) + n(m.gis) + n(m.sli) + n(m.lic) + n(m.medisep) + n(m.gpais) + n(m.nps) + n(m.tds);
            return (
              <tr key={m.month}>
                <td className="border border-black px-2 py-1 font-bold">{m.month}</td>
                <td className="border border-black px-2 py-1 text-right">{n(m.basicPay)}</td>
                <td className="border border-black px-2 py-1 text-right">{n(m.da)}</td>
                <td className="border border-black px-2 py-1 text-right">{n(m.hra)}</td>
                <td className="border border-black px-2 py-1 text-right">{n(m.ca) + n(m.otherAllowance)}</td>
                <td className="border border-black px-2 py-1 text-right font-bold">{gross}</td>
                <td className="border border-black px-2 py-1 text-right">{n(m.pf) + n(m.nps)}</td>
                <td className="border border-black px-2 py-1 text-right">{n(m.gis) + n(m.sli)}</td>
                <td className="border border-black px-2 py-1 text-right">{n(m.lic) + n(m.medisep) + n(m.gpais)}</td>
                <td className="border border-black px-2 py-1 text-right">{n(m.tds)}</td>
                <td className="border border-black px-2 py-1 text-right">{totalDed}</td>
                <td className="border border-black px-2 py-1 text-right font-bold">{gross - totalDed}</td>
              </tr>
            );
          })}
          {(n(taxCalc.festivalAllowance) > 0 || n(taxCalc.daArrear) > 0 || n(taxCalc.payRevisionArrear) > 0 || n(taxCalc.otherIncome) > 0) && (
            <tr>
              <td className="border border-black px-2 py-1 font-bold">Other Incomes</td>
              <td className="border border-black px-2 py-1 text-right">-</td>
              <td className="border border-black px-2 py-1 text-right">-</td>
              <td className="border border-black px-2 py-1 text-right">-</td>
              <td className="border border-black px-2 py-1 text-right">
                {n(taxCalc.festivalAllowance) + n(taxCalc.daArrear) + n(taxCalc.payRevisionArrear) + n(taxCalc.otherIncome)}
              </td>
              <td className="border border-black px-2 py-1 text-right font-bold">
                {n(taxCalc.festivalAllowance) + n(taxCalc.daArrear) + n(taxCalc.payRevisionArrear) + n(taxCalc.otherIncome)}
              </td>
              <td className="border border-black px-2 py-1 text-right">-</td>
              <td className="border border-black px-2 py-1 text-right">-</td>
              <td className="border border-black px-2 py-1 text-right">-</td>
              <td className="border border-black px-2 py-1 text-right">-</td>
              <td className="border border-black px-2 py-1 text-right">-</td>
              <td className="border border-black px-2 py-1 text-right font-bold">
                {n(taxCalc.festivalAllowance) + n(taxCalc.daArrear) + n(taxCalc.payRevisionArrear) + n(taxCalc.otherIncome)}
              </td>
            </tr>
          )}
          <tr className="bg-gray-50 font-bold">
            <td className="border border-black px-2 py-1">TOTAL</td>
            <td className="border border-black px-2 py-1 text-right">{monthlyData.reduce((acc, m) => acc + n(m.basicPay), 0)}</td>
            <td className="border border-black px-2 py-1 text-right">{monthlyData.reduce((acc, m) => acc + n(m.da), 0)}</td>
            <td className="border border-black px-2 py-1 text-right">{monthlyData.reduce((acc, m) => acc + n(m.hra), 0)}</td>
            <td className="border border-black px-2 py-1 text-right">{monthlyData.reduce((acc, m) => acc + (n(m.ca) + n(m.otherAllowance)), 0) + (n(taxCalc.festivalAllowance) + n(taxCalc.daArrear) + n(taxCalc.payRevisionArrear) + n(taxCalc.otherIncome))}</td>
            <td className="border border-black px-2 py-1 text-right">{n(taxCalc.grossSalary)}</td>
            <td className="border border-black px-2 py-1 text-right">{monthlyData.reduce((acc, m) => acc + (n(m.pf) + n(m.nps)), 0)}</td>
            <td className="border border-black px-2 py-1 text-right">{monthlyData.reduce((acc, m) => acc + (n(m.gis) + n(m.sli)), 0)}</td>
            <td className="border border-black px-2 py-1 text-right">{monthlyData.reduce((acc, m) => acc + (n(m.lic) + n(m.medisep) + n(m.gpais)), 0)}</td>
            <td className="border border-black px-2 py-1 text-right">{monthlyData.reduce((acc, m) => acc + n(m.tds), 0)}</td>
            <td className="border border-black px-2 py-1 text-right">{monthlyData.reduce((acc, m) => acc + (n(m.pf) + n(m.gis) + n(m.sli) + n(m.lic) + n(m.medisep) + n(m.gpais) + n(m.nps) + n(m.tds)), 0)}</td>
            <td className="border border-black px-2 py-1 text-right">{n(taxCalc.grossSalary) - monthlyData.reduce((acc, m) => acc + (n(m.pf) + n(m.gis) + n(m.sli) + n(m.lic) + n(m.medisep) + n(m.gpais) + n(m.nps) + n(m.tds)), 0)}</td>
          </tr>
        </tbody>
      </table>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="space-y-2">
          <h3 className="font-bold underline">Tax Calculation Summary</h3>
          <div className="flex justify-between"><span>Gross Salary:</span> <span>{f(taxCalc.grossSalary)}</span></div>
          <div className="flex justify-between"><span>Standard Deduction:</span> <span>{f(taxCalc.standardDeduction)}</span></div>
          <div className="flex justify-between font-bold border-t border-black pt-1"><span>Taxable Income:</span> <span>{f(taxCalc.taxableIncome)}</span></div>
          <div className="flex justify-between"><span>Tax on Total Income:</span> <span>{f(taxCalc.taxOnTotal)}</span></div>
          {n(taxCalc.marginalRelief) > 0 && (
            <div className="flex justify-between text-sm italic"><span>Less: Marginal Relief u/s 87A:</span> <span>- {f(taxCalc.marginalRelief)}</span></div>
          )}
          <div className="flex justify-between"><span>Health & Education Cess (4%):</span> <span>{f(taxCalc.cess)}</span></div>
          <div className="flex justify-between font-bold border-t border-black pt-1"><span>Total Tax Payable:</span> <span>{f(taxCalc.totalTax)}</span></div>
          <div className="flex justify-between"><span>Tax Already Deducted:</span> <span>{f(taxCalc.taxDeducted)}</span></div>
          <div className="flex justify-between font-bold border-t-2 border-black pt-1 text-lg"><span>Balance Tax to be Paid:</span> <span>{f(taxCalc.balance)}</span></div>
        </div>
        <div className="flex flex-col justify-end items-center">
          <div className="border-t border-black w-48 text-center pt-2">
            <p className="font-bold">Signature of Teacher</p>
            <p className="text-xs mt-1">Date: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center border-t-2 border-black pt-4">
        <p className="font-bold uppercase">Certificate</p>
        <p className="text-sm italic mt-2">
          Certified that the above information is correct to the best of my knowledge and belief.
        </p>
        <div className="mt-12 flex justify-end">
          <div className="border-t border-black w-64 text-center pt-2">
            <p className="font-bold uppercase">Head of Institution</p>
            <p className="text-xs mt-1">(Office Seal)</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderForm12BB = () => (
    <div className="border-2 border-black p-8 text-black font-serif">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold uppercase mb-2">FORM NO. 12BB</h1>
        <p className="text-sm">(See rule 26C)</p>
        <p className="text-sm mt-2 font-bold">Statement showing particulars of claims by an employee for deduction of tax under section 192</p>
      </div>

      <div className="space-y-4 mb-8">
        <p><span className="font-bold">1. Name and address of the employee:</span> {teacher.name}, {fy.schoolName}</p>
        <p><span className="font-bold">2. Permanent Account Number (PAN):</span> {teacher.panNumber}</p>
        <p><span className="font-bold">3. Financial Year:</span> {fy.year}</p>
      </div>

      <table className="w-full border-collapse border border-black text-sm mb-8">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black px-2 py-2 w-12">Sl.No.</th>
            <th className="border border-black px-2 py-2">Nature of claim</th>
            <th className="border border-black px-2 py-2 w-32">Amount (Rs.)</th>
            <th className="border border-black px-2 py-2">Evidence / Particulars</th>
          </tr>
          <tr className="bg-gray-50 text-xs">
            <th className="border border-black px-2 py-1">(1)</th>
            <th className="border border-black px-2 py-1">(2)</th>
            <th className="border border-black px-2 py-1">(3)</th>
            <th className="border border-black px-2 py-1">(4)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black px-2 py-2 text-center">1.</td>
            <td className="border border-black px-2 py-2">
              <p className="font-bold">House Rent Allowance:</p>
              <p>(i) Rent Paid to the Landlord</p>
              <p>(ii) Name of the landlord</p>
              <p>(iii) Address of the landlord</p>
              <p>(iv) PAN of the landlord</p>
            </td>
            <td className="border border-black px-2 py-2 text-right"></td>
            <td className="border border-black px-2 py-2"></td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-2 text-center">2.</td>
            <td className="border border-black px-2 py-2 font-bold">Leave travel concessions or assistance</td>
            <td className="border border-black px-2 py-2 text-right"></td>
            <td className="border border-black px-2 py-2"></td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-2 text-center">3.</td>
            <td className="border border-black px-2 py-2">
              <p className="font-bold">Deduction of interest on borrowing:</p>
              <p>(i) Interest payable/paid to the lender</p>
              <p>(ii) Name of the lender</p>
              <p>(iii) Address of the lender</p>
              <p>(iv) PAN of the lender</p>
            </td>
            <td className="border border-black px-2 py-2 text-right"></td>
            <td className="border border-black px-2 py-2"></td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-2 text-center">4.</td>
            <td className="border border-black px-2 py-2">
              <p className="font-bold">Deduction under Chapter VI-A:</p>
              <p>(A) Section 80C, 80CCC and 80CCD</p>
              <p className="pl-4">i) Section 80C (LIC, GPF, SLI, GIS, etc.)</p>
              <p className="pl-4">ii) 80CCC Contribution to Pension Fund</p>
              <p className="pl-4">iii) Contribution to NPS</p>
              <p>(B) Other sections (80E, 80G, 80TTA, etc.)</p>
              <p className="pl-4">i) 80D Mediclaim</p>
              <p className="pl-4">ii) 80E Interest on Education Loan</p>
            </td>
            <td className="border border-black px-2 py-2 text-right">
              <br/><br/><br/>
              <p>{f(taxCalc.section80C || 0)}</p>
              <br/><br/>
              <p>{f(taxCalc.section80D || 0)}</p>
            </td>
            <td className="border border-black px-2 py-2"></td>
          </tr>
        </tbody>
      </table>

      <div className="mt-12">
        <p className="font-bold text-center underline mb-8">Verification</p>
        <p className="text-justify leading-relaxed">
          I, <span className="font-bold">{teacher.name}</span>, son/daughter of ........................................................................ do hereby certify that the information given above is complete and correct.
        </p>
        <div className="mt-12 flex justify-between items-end">
          <div className="space-y-2">
            <p><span className="font-bold">Place:</span> .........................</p>
            <p><span className="font-bold">Date:</span> {new Date().toLocaleDateString()}</p>
          </div>
          <div className="text-center">
            <div className="border-t border-black w-48 pt-2">
              <p className="font-bold">Signature</p>
              <p className="text-xs">Full Name: {teacher.name}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderForm16 = () => (
    <div className="border-2 border-black p-8 text-black font-serif">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold uppercase mb-2">FORM NO. 16</h1>
        <p className="text-sm">[See rule 31(1)(a)]</p>
        <p className="text-lg font-bold mt-2">PART B (Annexure)</p>
      </div>

      <table className="w-full border-collapse border border-black text-sm mb-8">
        <tbody>
          <tr>
            <td className="border border-black px-4 py-2 w-1/2">
              <p className="font-bold">Name and address of the Employer</p>
              <p className="mt-2">{fy.schoolName}</p>
            </td>
            <td className="border border-black px-4 py-2 w-1/2">
              <p className="font-bold">Name and Designation of the Employee</p>
              <p className="mt-2">{teacher.name}</p>
              <p>{teacher.designation}</p>
            </td>
          </tr>
          <tr>
            <td className="border border-black px-4 py-2">
              <p className="font-bold">PAN of the Deductor</p>
              <p className="mt-1">{fy.hmPan || '........................'}</p>
            </td>
            <td className="border border-black px-4 py-2">
              <p className="font-bold">TAN of the Deductor</p>
              <p className="mt-1">{fy.hmTan || '........................'}</p>
            </td>
          </tr>
          <tr>
            <td className="border border-black px-4 py-2">
              <p className="font-bold">PAN of the Employee</p>
              <p className="mt-1">{teacher.panNumber}</p>
            </td>
            <td className="border border-black px-4 py-2">
              <div className="flex justify-between">
                <div>
                  <p className="font-bold">Assessment Year</p>
                  <p className="mt-1">2026 - 27</p>
                </div>
                <div>
                  <p className="font-bold">Period</p>
                  <p className="mt-1">April-2025 to March-2026</p>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <h3 className="font-bold mb-4 underline">Details of Salary paid and any other income and tax deducted</h3>
      <table className="w-full border-collapse border border-black text-xs mb-8">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black px-2 py-2 text-left">Particulars</th>
            <th className="border border-black px-2 py-2 w-32">Amount (Rs.)</th>
            <th className="border border-black px-2 py-2 w-32">Total (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black px-2 py-2">1. Gross Salary</td>
            <td className="border border-black px-2 py-2 text-right"></td>
            <td className="border border-black px-2 py-2 text-right font-bold">{f(taxCalc.grossSalary)}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-2">2. Allowance to the extent exempt u/s 10</td>
            <td className="border border-black px-2 py-2 text-right"></td>
            <td className="border border-black px-2 py-2 text-right">0.00</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-2">3. Balance (1 - 2)</td>
            <td className="border border-black px-2 py-2 text-right"></td>
            <td className="border border-black px-2 py-2 text-right font-bold">{f(taxCalc.grossSalary)}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-2">4. Deductions (Standard Deduction, etc.)</td>
            <td className="border border-black px-2 py-2 text-right"></td>
            <td className="border border-black px-2 py-2 text-right font-bold">{f(taxCalc.standardDeduction)}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-2">5. Income chargeable under the head Salaries (3-4)</td>
            <td className="border border-black px-2 py-2 text-right"></td>
            <td className="border border-black px-2 py-2 text-right font-bold">{f(taxCalc.incomeChargeableSalaries)}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-2">6. Any other income reported by the employee</td>
            <td className="border border-black px-2 py-2 text-right"></td>
            <td className="border border-black px-2 py-2 text-right">0.00</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-2">7. Gross total income (5+6)</td>
            <td className="border border-black px-2 py-2 text-right"></td>
            <td className="border border-black px-2 py-2 text-right font-bold">{f(taxCalc.incomeChargeableSalaries)}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-2">8. Deductions under Chapter VIA</td>
            <td className="border border-black px-2 py-2 text-right"></td>
            <td className="border border-black px-2 py-2 text-right font-bold">{f((taxCalc.section80C || 0) + (taxCalc.section80D || 0))}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-2">9. Total Income (7 - 8)</td>
            <td className="border border-black px-2 py-2 text-right"></td>
            <td className="border border-black px-2 py-2 text-right font-bold">{f(taxCalc.taxableIncome)}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-2">10. Tax on Total Income</td>
            <td className="border border-black px-2 py-2 text-right"></td>
            <td className="border border-black px-2 py-2 text-right font-bold">{f(taxCalc.taxOnTotal)}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-2">11. Health and Education Cess @ 4%</td>
            <td className="border border-black px-2 py-2 text-right"></td>
            <td className="border border-black px-2 py-2 text-right font-bold">{f(taxCalc.cess)}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-2">12. Total Tax Payable (10 + 11)</td>
            <td className="border border-black px-2 py-2 text-right"></td>
            <td className="border border-black px-2 py-2 text-right font-bold">{f(taxCalc.totalTax)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-12">
        <p className="font-bold text-center underline mb-8">Verification</p>
        <p className="text-justify leading-relaxed text-sm">
          I, ........................................................................, son/daughter of ........................................................................ working in the capacity of ........................................................................ (designation) do hereby certify that the information given above is true, complete and correct and is based on the books of account, documents, TDS statements, and other available records.
        </p>
        <div className="mt-12 flex justify-between items-end">
          <div className="space-y-2 text-sm">
            <p><span className="font-bold">Place:</span> {fy.place || '.........................'}</p>
            <p><span className="font-bold">Date:</span> {new Date().toLocaleDateString()}</p>
          </div>
          <div className="text-center">
            <div className="border-t border-black w-64 pt-2">
              <p className="font-bold text-xs">Signature of person responsible for deduction of tax</p>
              <p className="text-xs mt-1">Full Name: {fy.hmName || '........................................................'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-white z-[100] overflow-y-auto p-8 print:p-0">
      <div className="max-w-4xl mx-auto bg-white print:shadow-none">
        <div className="flex justify-between items-center mb-8 print:hidden">
          <h2 className="text-xl font-bold text-gray-900">
            {mode === '12BB' ? 'Form 12BB' : mode === 'Form16' ? 'Form 16 Part B' : `${mode} Statement`} Preview
          </h2>
          <div className="space-x-4">
            <button 
              type="button"
              onClick={() => onClose()}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              Close
            </button>
            <button 
              type="button"
              onClick={handlePrint}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold cursor-pointer"
            >
              Print / Save PDF
            </button>
          </div>
        </div>

        {mode === '12BB' ? renderForm12BB() : mode === 'Form16' ? renderForm16() : renderAnticipatoryOrFinal()}
      </div>
    </div>
  );
}
