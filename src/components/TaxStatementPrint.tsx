import React, { useRef } from 'react';
import { FinancialYear, Teacher, TaxStatement, MonthlyData } from '../types';
import { formatCurrency } from '../lib/utils';
import { X, Printer, Loader2 } from 'lucide-react';

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
    section80G?: number;
    section80E?: number;
    hbaInterest?: number;
    anyOtherDeductions?: number;
    festivalAllowance?: number;
    daArrear?: number;
    payRevisionArrear?: number;
    otherIncome?: number;
    leaveSurrender?: number;
    hbaPrincipal?: number;
    tuitionFees?: number;
    taxDeducted?: number;
  };
  onClose: () => void;
  isBulk?: boolean;
}

export default function TaxStatementPrint({ mode, teacher, fy, monthlyData, taxCalc, onClose, isBulk }: TaxStatementPrintProps) {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (isProcessing) return;
    setIsProcessing(true);

    // Give React time to render the loading overlay first
    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        console.error("Print failed", e);
      } finally {
        setIsProcessing(false);
      }
    }, 300);
  };

  const n = (val: any) => {
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  const f = (val: any) => formatCurrency(n(val));

  const totals = monthlyData.reduce((acc, current) => ({
    pf: acc.pf + n(current.pf),
    gis: acc.gis + n(current.gis),
    sli: acc.sli + n(current.sli),
    lic: acc.lic + n(current.lic),
    medisep: acc.medisep + n(current.medisep),
    gpais: acc.gpais + n(current.gpais),
    nps: acc.nps + n(current.nps),
    tds: acc.tds + n(current.tds),
  }), { pf: 0, gis: 0, sli: 0, lic: 0, medisep: 0, gpais: 0, nps: 0, tds: 0 });

  const renderAnticipatoryOrFinal = () => {
    const isAnticipatory = mode === 'Anticipatory';
    const months = ['March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February'];
    const startYear = parseInt(fy.year.split('-')[0]) || 2025;
    const endYear = startYear + 1;
    const firstHalf = months.slice(0, 6); // March - August
    const secondHalf = months.slice(6); // September - February

    return (
      <div className="p-1 px-3 text-black bg-white tamil-font-container" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
        <div className="text-center mb-1">
          <h1 className="text-[12px] font-bold uppercase underline whitespace-nowrap overflow-hidden text-ellipsis block w-full px-2 leading-tight mb-3">
            {isAnticipatory ? 'Anticipatory Income Tax Statement for the Financial Year' : 'Income Tax Statement for the Financial Year'} {fy.year}
          </h1>

          <p className="text-[11px] font-bold leading-none mt-1">(Assessment Year {startYear + 1}-{String(endYear + 1).slice(-2)})</p>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[9.5px] items-center mt-2 mb-2">
          <div className="flex items-center">
            <span className="font-bold w-24">Employee Name:</span>
            <span className="border-b border-black flex-1 tamil-text leading-none py-0.5">{teacher.name}</span>
          </div>
          <div className="flex items-center">
            <span className="font-bold w-12">PAN:</span>
            <span className="border-b border-black flex-1 uppercase font-bold py-0.5">{teacher.panNumber}</span>
          </div>
          <div className="flex items-center">
            <span className="font-bold w-24">Designation:</span>
            <span className="border-b border-black flex-1 tamil-text leading-none py-0.5">{teacher.designation}</span>
          </div>
          <div className="flex items-center">
            <span className="font-bold w-12">Office:</span>
            <span className="border-b border-black flex-1 tamil-text leading-none py-0.5">{fy.schoolName}</span>
          </div>
          <div className="flex items-center">
            <span className="font-bold w-24">Category / Slab:</span>
            <span className="border-b border-black flex-1 py-0.5">Individual (Age: {teacher.category || 'below 60'}) • <b>{teacher.taxRegime || 'NEW'} Regime</b></span>
          </div>
        </div>

        <table className="w-full border-collapse border border-black text-[9.5px] mt-2">
          <tbody>
            <tr>
              <td className="border border-black p-1 w-8 text-center font-bold align-top" rowSpan={5}>1</td>
              <td className="border border-black p-1 w-6 text-center font-bold align-top">a</td>
              <td className="border border-black p-0.5 font-bold" colSpan={2}>
                Gross Salary / Pension for the month : (includes Basic Pay, DA, HRA, CCA, Interim Relief, OT Allowance,
                Deputation Allowance, Medical Allowance, etc.)
              </td>
            </tr>
            <tr>
              <td className="border border-black p-0" colSpan={3}>
                <div className="grid grid-cols-2">
                  <div className="border-r border-black">
                    {firstHalf.map(month => {
                      const data = monthlyData.find(m => m.month === month);
                      const gross = n(data?.basicPay) + n(data?.da) + n(data?.hra) + n(data?.ca) + n(data?.otherAllowance);
                      return (
                        <div key={month} className="flex justify-between border-b border-black last:border-b-0 px-2 py-0.5">
                          <span className="font-bold">{month} {startYear} :</span>
                          <span>{gross || ''}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    {secondHalf.map((month, idx) => {
                      const data = monthlyData.find(m => m.month === month);
                      const gross = n(data?.basicPay) + n(data?.da) + n(data?.hra) + n(data?.ca) + n(data?.otherAllowance);
                      return (
                        <div key={month} className="flex justify-between border-b border-black last:border-b-0 px-2 py-0.5">
                          <span className="font-bold">{month} {idx < 4 ? startYear : endYear} :</span>
                          <span>{gross || ''}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td className="border border-black p-0.5 w-6 text-center font-bold align-top">b</td>
              <td className="border border-black p-0.5">
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between"><span>Leave Surrender</span><span>{f(taxCalc.leaveSurrender) || ''}</span></div>
                  <div className="flex justify-between"><span>Festival Allowance / Bonus / Ex-gratia and Incentive</span><span>{n(taxCalc.festivalAllowance) || ''}</span></div>
                  <div className="flex justify-between"><span>Pay Revision Arrears, DA Arrears, Other Arrears</span><span>{n(taxCalc.daArrear) + n(taxCalc.payRevisionArrear) || ''}</span></div>
                  <div className="flex justify-between"><span>Other Salary Income</span><span>{n(taxCalc.otherIncome) || ''}</span></div>
                </div>
              </td>
              <td className="border border-black p-0.5 w-32 text-right align-bottom">
                {n(taxCalc.leaveSurrender) + n(taxCalc.festivalAllowance) + n(taxCalc.daArrear) + n(taxCalc.payRevisionArrear) + n(taxCalc.otherIncome) || ''}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-0.5 w-6 text-center font-bold align-top">c</td>
              <td className="border border-black p-0.5">Excess Pay drawn, Dies non, etc.</td>
              <td className="border border-black p-0.5 w-32 text-right"></td>
            </tr>
            <tr className="font-bold bg-gray-50">
              <td className="border border-black p-0.5 w-4 text-center align-top">d</td>
              <td className="border border-black p-0.5">Total Gross Salary ( a + b )</td>
              <td className="border border-black p-0.5 w-24 text-right font-mono">{f(n(taxCalc.grossSalary))}</td>
            </tr>
            <tr>
              <td className="border border-black p-0.5 text-center font-bold">2</td>
              <td className="border border-black p-0.5 font-bold" colSpan={2}>Gross Total Income (1)</td>
              <td className="border border-black p-0.5 text-right font-bold">{f(n(taxCalc.grossSalary))}</td>
            </tr>
            <tr>
              <td className="border border-black p-0.5 text-center font-bold" rowSpan={3}>3</td>
              <td className="border border-black p-0.5" colSpan={2}>Less: Deduction u/s 16 (Standard Deduction / Professional Tax)</td>
              <td className="border border-black p-0.5 text-right">{f(n(taxCalc.standardDeduction || 50000))}</td>
            </tr>
            <tr>
              <td className="border border-black p-0.5" colSpan={2}>Less: Deduction u/s 10 (HRA Exemption / Others)</td>
              <td className="border border-black p-0.5 text-right"></td>
            </tr>
            <tr className="font-bold border-b-2 border-black">
              <td className="border border-black p-0.5" colSpan={2}>Income Chargeable under head Salaries ( 2 - 3 )</td>
              <td className="border border-black p-0.5 text-right font-mono">{f(n(taxCalc.incomeChargeableSalaries))}</td>
            </tr>
            <tr>
              <td className="border border-black p-0.5 text-center font-bold">4</td>
              <td className="border border-black p-0.5" colSpan={2}>Any other income reported by the employee / HBA Interest</td>
              <td className="border border-black p-0.5 text-right font-mono">({f(n(taxCalc.hbaInterest))})</td>
            </tr>
            <tr className="font-bold bg-blue-50/50">
              <td className="border border-black p-0.5 text-center">5</td>
              <td className="border border-black p-0.5" colSpan={2}>Gross Total Income ( 3 - 4 )</td>
              <td className="border border-black p-0.5 text-right font-mono">
                {f(n(taxCalc.incomeChargeableSalaries) - n(taxCalc.hbaInterest))}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-0.5 text-center font-bold" rowSpan={3}>6</td>
              <td className="border border-black p-0.5 font-bold" colSpan={2}>Deductions under chapter VIA</td>
              <td className="border border-black p-0.5 text-right"></td>
            </tr>
            <tr>
              <td className="border border-black p-0.5 pl-4" colSpan={2}>a) Deductions u/s 80C, 80CCC & 80CCD (Max 1.5 Lakhs)</td>
              <td className="border border-black p-0.5 text-right font-mono">{f(n(taxCalc.section80C))}</td>
            </tr>
            <tr>
              <td className="border border-black p-0.5 pl-4" colSpan={2}>b) Other Deductions (80D, 80E, 80G, etc.)</td>
              <td className="border border-black p-0.5 text-right font-mono">
                {f(n(taxCalc.section80D) + n(taxCalc.section80G) + n(taxCalc.section80E) + n(taxCalc.anyOtherDeductions))}
              </td>
            </tr>
            <tr className="font-bold bg-green-50/50 border-t-2 border-black">
              <td className="border border-black p-0.5 text-center">7</td>
              <td className="border border-black p-0.5 font-bold" colSpan={2}>Total Taxable Income ( 5 - 6 )</td>
              <td className="border border-black p-0.5 text-right font-mono">{f(n(taxCalc.taxableIncome))}</td>
            </tr>
            <tr>
              <td className="border border-black p-0.5 text-center font-bold">8</td>
              <td className="border border-black p-0.5" colSpan={2}>Tax on Total Income (as per {teacher.taxRegime} Slab)</td>
              <td className="border border-black p-0.5 text-right font-mono">{f(n(taxCalc.taxOnTotal))}</td>
            </tr>
            <tr>
              <td className="border border-black p-0.5 text-center font-bold">9</td>
              <td className="border border-black p-0.5" colSpan={2}>Health and Education Cess [ @ 4% ]</td>
              <td className="border border-black p-0.5 text-right font-mono">{f(n(taxCalc.cess))}</td>
            </tr>
            <tr className="font-bold bg-yellow-50/50 border-t-2 border-black">
              <td className="border border-black p-0.5 text-center">10</td>
              <td className="border border-black p-0.5" colSpan={2}>Total Tax Payable ( 8 + 9 )</td>
              <td className="border border-black p-0.5 text-right font-mono">{f(n(taxCalc.totalTax))}</td>
            </tr>
            <tr>
              <td className="border border-black p-0.5 text-center font-bold">11</td>
              <td className="border border-black p-0.5" colSpan={2}>Less: Relief for arrears of salary u/s. 89(1)</td>
              <td className="border border-black p-0.5 text-right font-mono"></td>
            </tr>
            <tr className="font-bold bg-gray-50 border-t border-black">
              <td className="border border-black p-0.5 text-center">12</td>
              <td className="border border-black p-0.5" colSpan={2}>Balance Tax Payable ( 10 - 11 )</td>
              <td className="border border-black p-0.5 text-right font-mono font-bold leading-none">{f(n(taxCalc.totalTax))}</td>
            </tr>
            <tr>
              <td className="border border-black p-0.5 text-center font-bold">13</td>
              <td className="border border-black p-1" colSpan={2}>Income tax already deducted from salary</td>
              <td className="border border-black p-0.5 text-right font-mono">{f(n(taxCalc.taxDeducted))}</td>
            </tr>
            <tr className="font-bold bg-red-50/50 text-[10px] border-t-2 border-black">
              <td className="border border-black p-0.5 text-center">14</td>
              <td className="border border-black p-0.5 uppercase" colSpan={2}>Final Balance Income Tax to be paid</td>
              <td className="border border-black p-0.5 text-right font-mono text-red-700 bg-red-50/20">{f(n(taxCalc.balance))}</td>
            </tr>
            {isAnticipatory && (
              <tr className="font-bold bg-blue-100/30">
                <td className="border border-black p-0.5 text-center font-bold">15</td>
                <td className="border border-black p-0.5" colSpan={2}>Monthly Installment (11 months approx)</td>
                <td className="border border-black p-0.5 text-right font-mono text-blue-800">
                  {n(taxCalc.balance) > 0 ? f(Math.ceil(n(taxCalc.balance) / 11)) : f(0)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="mt-4 grid grid-cols-2 text-[8.5px]">
          <div className="space-y-0.5">
            <p className="leading-none"><span className="font-bold">Place:</span> ............................................</p>
            <p className="leading-none"><span className="font-bold">Date:</span> {new Date().toLocaleDateString()}</p>
          </div>
          <div className="text-right flex flex-col items-end">
            <p className="font-bold mr-16 border-b border-dotted border-black w-32 pb-0.5">Signature:</p>
            {teacher.signatureUrl && (
              <img src={teacher.signatureUrl} alt="Signature" className="h-6 mr-12 mt-0" referrerPolicy="no-referrer" />
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderForm12BB = () => (
    <div className="p-2 px-8 text-black bg-white tamil-font-container" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
      <div className="text-center mb-2">
        <h1 className="text-[12px] font-bold uppercase underline leading-tight mb-2">FORM NO. 12BB</h1>
        <p className="text-[9px] font-bold leading-none">(See rule 26C)</p>
        <p className="text-[11px] mt-1 font-bold leading-tight uppercase">Statement showing particulars of claims by an employee for deduction of tax under section 192</p>
      </div>

      <div className="space-y-2 text-[10px] border border-black p-2 px-4 rounded-sm bg-gray-50/50 mb-4">
        <div className="flex">
          <span className="font-bold w-4">1.</span>
          <span className="font-bold w-48 text-left">Name and Address:</span>
          <span className="border-b border-black flex-1 tamil-text leading-tight uppercase font-bold text-[10px]">{teacher.name}, {teacher.address || '................................................'}</span>
        </div>
        <div className="flex">
          <span className="font-bold w-4">2.</span>
          <span className="font-bold w-48 text-left">PAN:</span>
          <span className="border-b border-black flex-1 uppercase font-bold text-[10px]">{teacher.panNumber}</span>
        </div>
        <div className="flex">
          <span className="font-bold w-4">3.</span>
          <span className="font-bold w-48 text-left">Financial Year:</span>
          <span className="border-b border-black flex-1 font-bold text-[10px]">{fy.year}</span>
        </div>
      </div>

      <table className="w-full border-collapse border border-black text-[11px] mb-4 mt-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-0.5 font-bold w-10">Sl No.</th>
            <th className="border border-black p-0.5 font-bold">Nature of Claim</th>
            <th className="border border-black p-0.5 font-bold w-28">Amount (Rs)</th>
            <th className="border border-black p-0.5 font-bold w-20">Evidence (4)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black p-1 text-center font-bold align-top">1.</td>
            <td className="border border-black p-1">
              <p className="font-bold">House Rent Allowance:</p>
              <div className="pl-4 space-y-0.5">
                <p>(i) Rent Paid to the Landlord: ............................................</p>
                <p>(ii) Name of the landlord: ............................................</p>
                <p>(iii) Address of the landlord: ............................................</p>
                <p>(iv) PAN of the landlord: ............................................</p>
                <p className="text-[9px] font-bold italic">Note: Permanent Account Number shall be furnished if the aggregate rent paid during the previous year exceeds one lakh rupees</p>
              </div>
            </td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1"></td>
          </tr>
          <tr>
            <td className="border border-black p-1 text-center font-bold align-top">2.</td>
            <td className="border border-black p-1 font-bold">Leave travel concessions or assistance</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1"></td>
          </tr>
          <tr>
            <td className="border border-black p-1 text-center font-bold align-top">3.</td>
            <td className="border border-black p-1">
              <p className="font-bold">Deduction of interest on borrowing</p>
              <div className="pl-4 space-y-0.5">
                <p>(i) Interest payable/paid to the lender: .............................</p>
                <p>(ii) Name of the lender: .............................</p>
                <p>(iii) Address of the lender: .............................</p>
                <p>(iv) PAN of the lender (Financial Institution/Employer/Others)-If available: .............................</p>
              </div>
            </td>
            <td className="border border-black p-1 text-right align-bottom">{f(taxCalc.hbaInterest || 0)}</td>
            <td className="border border-black p-1"></td>
          </tr>
          <tr>
            <td className="border border-black p-0.5 text-center font-bold align-top">4.</td>
            <td className="border border-black p-0.5">
              <p className="font-bold">Deduction under Chapter VI-A</p>
              <p className="font-bold">(A) Section 80C, 80CCC and 80CCD</p>
              <div className="pl-4 space-y-0.5">
                <div className="pl-4 grid grid-cols-2 gap-x-8 text-[8px] mt-0.5">
                  <p>a) LIC, PLI etc: {f(totals.lic)}</p>
                  <p>b) Purchase of NSC VIII issue: -</p>
                  <p>c) Contribution to GPF: {f(totals.pf)}</p>
                  <p>d) SLI / GIS / GPAIS: {f(totals.sli + totals.gis + totals.gpais)}</p>
                  <p>e) Term deposit / Mutual Fund: -</p>
                  <p>f) NPS Subscription: {f(totals.nps)}</p>
                  <p>g) Tution fees: {f(taxCalc.tuitionFees)}</p>
                  <p>h) Housing Loan Principal: {f(taxCalc.hbaPrincipal)}</p>
                </div>
              </div>
              <p className="font-bold mt-1">(i) 80CCC Contribution to Pension Fund</p>
              <p className="font-bold">(ii) Contribution to NPS</p>
            </td>
            <td className="border border-black p-0.5 text-right align-middle font-bold text-[10px]">
              {f(taxCalc.section80C || 0)}
            </td>
            <td className="border border-black p-0.5"></td>
          </tr>
          <tr>
            <td className="border border-black p-0.5 text-center font-bold align-top"></td>
            <td className="border border-black p-0.5">
              <p className="font-bold">(B) Other sections (e.g. 80E, 80G, 80TTA, etc.) under Chapter VI-A</p>
              <div className="pl-4 grid grid-cols-2 gap-x-4 text-[8px]">
                <p>Medisep: {f(totals.medisep)}</p>
                <p>Section 80D - Health Insurance</p>
                <p>Section 80E - Education Loan</p>
                <p>Section 80G - Donations</p>
                <p>Section 80U - Disability</p>
                <p>Other Deductions: {f(taxCalc.anyOtherDeductions)}</p>
              </div>
            </td>
            <td className="border border-black p-0.5 text-right align-bottom">
              {f(n(taxCalc.section80D) + n(taxCalc.section80E) + n(taxCalc.section80G) + n(taxCalc.anyOtherDeductions))}
            </td>
            <td className="border border-black p-0.5"></td>
          </tr>
        </tbody>
      </table>

      <div className="mt-1">
        <p className="font-bold text-center underline mb-0.5 text-[10px]">Verification</p>
        <p className="text-justify leading-tight text-[11px]">
          I, <span className="font-bold border-b border-dotted border-black px-2">{teacher.name}</span>, son/daughter of <span className="font-bold border-b border-dotted border-black px-2">{teacher.fatherName || '................................................'}</span> do hereby certify that the information given above is complete and correct.
        </p>
        <div className="mt-4 grid grid-cols-2 text-[11px]">
          <div className="space-y-0.5">
            <p><span className="font-bold">Place:</span> ............................................</p>
            <p><span className="font-bold">Date:</span> {new Date().toLocaleDateString()}</p>
          </div>
          <div className="text-right flex flex-col items-end">
            <p className="font-bold mr-24">Signature:</p>
            {teacher.signatureUrl && (
              <img src={teacher.signatureUrl} alt="Signature" className="h-8 mr-12 mt-0.5" referrerPolicy="no-referrer" />
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderForm16 = () => (
    <div className="p-1 px-3 text-black bg-white tamil-font-container" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
      <div className="text-center mb-2">
        <h1 className="text-[13px] font-bold uppercase underline leading-tight mb-2">FORM NO. 16</h1>
        <p className="text-[9px] font-bold leading-none">[See rule 31(1)(a)]</p>
        <p className="text-[11px] font-bold mt-1 uppercase">PART B (Annexure)</p>
      </div>

      <table className="w-full border-collapse border border-black text-[8px] mb-1">
        <tbody>
          <tr>
            <td className="border border-black p-1 w-1/2">
              <p className="font-bold">Name and Address of the Employer</p>
              <p className="mt-1 tamil-text leading-tight">{fy.schoolName}</p>
            </td>
            <td className="border border-black p-1 w-1/2">
              <p className="font-bold">Name and Address of the Employee</p>
              <p className="mt-1 tamil-text leading-tight font-bold">{teacher.name} / {teacher.designation}</p>
              <p className="text-[8px] font-normal">{teacher.address || '................................................'}</p>
            </td>
          </tr>
          <tr>
            <td className="border border-black p-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="font-bold">PAN of the Deductor</p>
                  <p className="mt-0.5">{fy.hmPan || '........................'}</p>
                </div>
                <div>
                  <p className="font-bold">TAN of the Deductor</p>
                  <p className="mt-0.5">{fy.hmTan || '........................'}</p>
                </div>
              </div>
            </td>
            <td className="border border-black p-1">
              <p className="font-bold">PAN of the Employee</p>
              <p className="mt-0.5">{teacher.panNumber}</p>
            </td>
          </tr>
          <tr>
            <td className="border border-black p-1">
              <p className="font-bold">CIT (TDS)</p>
              <p className="mt-0.5">................................................</p>
            </td>
            <td className="border border-black p-1">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="font-bold">Assessment Year</p>
                  <p className="mt-0.5">2026 - 27</p>
                </div>
                <div className="col-span-2">
                  <p className="font-bold text-center">Period</p>
                  <div className="grid grid-cols-2 text-center mt-0.5">
                    <div>
                      <p className="font-bold">From</p>
                      <p>April-2025</p>
                    </div>
                    <div>
                      <p className="font-bold">To</p>
                      <p>March-2026</p>
                    </div>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <h3 className="font-bold mb-0.5 underline text-[9px]">Details of Salary paid and any other income and tax deducted</h3>
      <table className="w-full border-collapse border border-black text-[9px] mb-2">
        <tbody>
          <tr>
            <td className="border border-black p-1 font-bold" colSpan={2}>1. Gross Salary Rs.</td>
            <td className="border border-black p-1 w-24"></td>
            <td className="border border-black p-1 w-24"></td>
          </tr>
          <tr>
            <td className="border border-black p-1 pl-4" colSpan={2}>(a) Salary as per provisions contained in sec.17(1)</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right"></td>
          </tr>
          <tr>
            <td className="border border-black p-1 pl-4" colSpan={2}>(b) Value of perquisites u/s 17(2) (as per Form No.12BA)</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right"></td>
          </tr>
          <tr>
            <td className="border border-black p-1 pl-4" colSpan={2}>(c) Profits in lieu of salary under section 17(3) (as per Form No.12BA)</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right"></td>
          </tr>
          <tr className="font-bold">
            <td className="border border-black p-1 pl-8" colSpan={2}>Total Rs.</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right">{f(taxCalc.grossSalary)}</td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-bold" colSpan={2}>2. Allowance to the extent exempt u/s 10</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right"></td>
          </tr>
          <tr>
            <td className="border border-black p-1 pl-4" colSpan={2}>a) House Rent Allowance</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right"></td>
          </tr>
          <tr>
            <td className="border border-black p-1 pl-4" colSpan={2}>b) Other Allowances</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right"></td>
          </tr>
          <tr className="font-bold">
            <td className="border border-black p-1 font-bold" colSpan={2}>3. Balance ( 1- 2)</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right">{f(taxCalc.grossSalary)}</td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-bold" colSpan={2}>4. Deductions</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right"></td>
          </tr>
          <tr>
            <td className="border border-black p-1 pl-4" colSpan={2}>a) Standard Deduction</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right">{f(taxCalc.standardDeduction)}</td>
          </tr>
          <tr>
            <td className="border border-black p-1 pl-4" colSpan={2}>b) Conveyance Allowance</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right"></td>
          </tr>
          <tr>
            <td className="border border-black p-1 pl-4" colSpan={2}>c) Prof. Tax on Employment</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right"></td>
          </tr>
          <tr className="font-bold">
            <td className="border border-black p-1 font-bold" colSpan={2}>5. Aggregate of 4(a), (b) and (c) Rs.</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right">{f(taxCalc.standardDeduction)}</td>
          </tr>
          <tr className="font-bold">
            <td className="border border-black p-1 font-bold" colSpan={2}>6. Income chargeable under the head Salaries (3-5)</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right">{f(taxCalc.incomeChargeableSalaries)}</td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-bold" colSpan={2}>7. Deduct: interest on HBA</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right">{f(taxCalc.hbaInterest)}</td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-bold" colSpan={2}>8. Add: Any other income reported by the employee</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right"></td>
          </tr>
          <tr>
            <td className="border border-black p-1 pl-4" colSpan={2}>a) Leave Surrender</td>
            <td className="border border-black p-1 text-right">{f(taxCalc.leaveSurrender)}</td>
            <td className="border border-black p-1 text-right"></td>
          </tr>
          <tr>
            <td className="border border-black p-1 pl-4" colSpan={2}>b) Other Income</td>
            <td className="border border-black p-1 text-right">{f(taxCalc.otherIncome)}</td>
            <td className="border border-black p-1 text-right"></td>
          </tr>
          <tr className="font-bold">
            <td className="border border-black p-1 font-bold" colSpan={2}>9. Gross total income (6-7+8)</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right">{f(n(taxCalc.incomeChargeableSalaries) - n(taxCalc.hbaInterest))}</td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-bold" colSpan={2}>10. Deductions under Chapter VIA</td>
            <td className="border border-black p-1 text-center font-bold">Gross Amount</td>
            <td className="border border-black p-1 text-center font-bold">Deductible Amount</td>
          </tr>
          <tr>
            <td className="border border-black p-1" colSpan={2}>
              <p className="font-bold">(A) Sections 80C, 80CCC and 80CCD</p>
              <div className="pl-4 grid grid-cols-2 gap-x-4 text-[8px]">
                <p>Life Insurance (LIC): {f(totals.lic)}</p>
                <p>GPF/NPS Subscription: {f(totals.pf + totals.nps)}</p>
                <p>SLI / GIS / GPAIS: {f(totals.sli + totals.gis + totals.gpais)}</p>
                <p>HBA Principal: {f(taxCalc.hbaPrincipal)}</p>
                <p>Tuition Fees: {f(taxCalc.tuitionFees)}</p>
                <p>Other 80C Items: {f(0)}</p>
              </div>
            </td>
            <td className="border border-black p-1 text-right align-bottom">{f(n(totals.lic) + n(totals.pf) + n(totals.nps) + n(totals.sli) + n(totals.gis) + n(totals.gpais) + n(taxCalc.hbaPrincipal) + n(taxCalc.tuitionFees))}</td>
            <td className="border border-black p-1 text-right align-bottom">{f(taxCalc.section80C || 0)}</td>
          </tr>
          <tr className="font-bold">
            <td className="border border-black p-1" colSpan={2}>Total amount u/s 80C, 80CCC and 80 CCD is Rs.</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right">{f(taxCalc.section80C || 0)}</td>
          </tr>
          <tr>
            <td className="border border-black p-1" colSpan={2}>
              <p className="font-bold">(B) Other sections (e.g. 80E, 80G etc.) under Chapter VI-A</p>
              <div className="pl-4 space-y-0 text-[8px]">
                <p>Health Insurance - Mediclaim</p>
                <p>Expense on treatment of mentally or physically handicapped dependents</p>
                <p>Expenditure on medical treatment of the employee for specified deceases</p>
                <p>Interest on Educational Loan for higher education</p>
                <p>Donation to various charitable and other funds [FLOOD]</p>
                <p>Deduction for person with disability</p>
                <p>Interest paid for Electric Vehicle Loan</p>
                <p>Interest income for SB, Fixed deposit, ...</p>
                <p>Remaining Contribution to NPS (Max Rs.50,000)</p>
                <p>NPS - Employer's Contribution</p>
              </div>
            </td>
            <td className="border border-black p-1 text-right align-bottom">{f(n(taxCalc.section80D) + n(taxCalc.section80E) + n(taxCalc.section80G))}</td>
            <td className="border border-black p-1 text-right align-bottom">{f(n(taxCalc.section80D) + n(taxCalc.section80E) + n(taxCalc.section80G))}</td>
          </tr>
          <tr className="font-bold">
            <td className="border border-black p-1 text-center" colSpan={2}>TOTAL</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right">{f((taxCalc.section80C || 0) + (taxCalc.section80D || 0) + (taxCalc.section80E || 0) + (taxCalc.section80G || 0))}</td>
          </tr>
          <tr className="font-bold">
            <td className="border border-black p-1" colSpan={2}>11. Aggregate of deductible amount (10A + 10B)</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right">{f((taxCalc.section80C || 0) + (taxCalc.section80D || 0) + (taxCalc.section80E || 0) + (taxCalc.section80G || 0))}</td>
          </tr>
          <tr className="font-bold">
            <td className="border border-black p-1" colSpan={2}>12. Total Income rounded off to nearest multiple of ten rupees ( 9 - 11 )</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right">{f(taxCalc.taxableIncome)}</td>
          </tr>
          <tr>
            <td className="border border-black p-1" colSpan={2}>13. Tax on Total Income</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right">{f(taxCalc.taxOnTotal)}</td>
          </tr>
          <tr>
            <td className="border border-black p-1" colSpan={2}>14. Less: Rebate for the Income upto 12 Lakhs u/s 87 A</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right">{f(taxCalc.marginalRelief || 0)}</td>
          </tr>
          <tr className="font-bold">
            <td className="border border-black p-1" colSpan={2}>15. Income tax after Rebate ( 13 - 14 )</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right">{f(Math.max(0, n(taxCalc.taxOnTotal) - n(taxCalc.marginalRelief)))}</td>
          </tr>
          <tr>
            <td className="border border-black p-1" colSpan={2}>16. Health and Education Cess [ @ 4% of (15) ]</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right">{f(taxCalc.cess)}</td>
          </tr>
          <tr className="font-bold">
            <td className="border border-black p-1" colSpan={2}>17. Total Tax Payable ( 15 + 16 )</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right">{f(taxCalc.totalTax)}</td>
          </tr>
          <tr>
            <td className="border border-black p-1" colSpan={2}>18. Less: Relief for arrears of salary u/s. 89(1)</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right"></td>
          </tr>
          <tr className="font-bold bg-gray-50">
            <td className="border border-black p-1" colSpan={2}>19. Total Income Tax for the Year (17-18)</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right">{f(taxCalc.totalTax)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-1">
        <p className="font-bold text-center underline mb-0.5 text-[9px]">Verification</p>
        <p className="text-justify leading-tight text-[8.5px]">
          I, <span className="font-bold border-b border-dotted border-black px-2">{teacher.name}</span>, son/daughter of <span className="font-bold border-b border-dotted border-black px-2">{teacher.fatherName || '................................................'}</span> working in the capacity of <span className="font-bold border-b border-dotted border-black px-2">{teacher.designation}</span> (designation) do hereby certify that the information given above is true, complete and correct and is based on the books of account, documents, TDS statements, and other available records.
        </p>
        <div className="mt-2 grid grid-cols-2 text-[8.5px]">
          <div className="space-y-1">
            <p><span className="font-bold">Place:</span> ............................................</p>
            <p><span className="font-bold">Date:</span> {new Date().toLocaleDateString()}</p>
          </div>
          <div className="text-center">
            <div className="border-t border-black w-56 pt-1 ml-auto">
              <p className="font-bold text-[8.5px]">Signature of person responsible for deduction of tax</p>
              <p className="text-[8px] mt-0.5">Full Name: {fy.hmName || '................................................'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const innerContent = (
    <div className={`bg-white flex flex-col overflow-hidden relative print:shadow-none print:max-h-none print:rounded-none print:w-full print:m-0 print:p-0 print:block ${isBulk ? 'w-full' : 'rounded-xl shadow-2xl w-full max-w-5xl h-full md:h-[95vh]'}`}>

        {/* Preview Header - Hidden on Print */}
        {!isBulk && (
        <div id="preview-header" className="flex items-center justify-between p-4 border-b bg-white print:hidden">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 leading-tight">Income Tax Report</h3>
              <p className="text-xs text-gray-500">{mode} Preview • {teacher.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 hover:bg-gray-100 rounded-full transition-all group disabled:opacity-50"
            title="Close Preview"
          >
            <X className="w-6 h-6 text-gray-400 group-hover:text-gray-600" />
          </button>
        </div>
        )}

        {/* Processing Overlay - HIDDEN ON PRINT */}
        {isProcessing && !isBulk && (
          <div className="absolute inset-0 z-[100] bg-white/70 backdrop-blur-[2px] flex items-center justify-center rounded-2xl flex-col print:hidden">
            <div className="bg-white p-6 rounded-3xl shadow-2xl border-2 border-blue-50 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              <div className="text-center">
                <h3 className="font-bold text-gray-900 text-lg">Report Ready</h3>
                <p className="text-sm text-gray-500">Wait a moment for PDF generation...</p>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Report Area */}
        <div id="printable-report" className="flex-1 overflow-auto p-4 md:p-8 bg-gray-100 print:bg-white print:p-0 print:overflow-visible print:block">
          <div
            id="printable-area-actual"
            ref={printRef}
            className={`printable-area bg-white shadow-lg mx-auto print:shadow-none print:m-0 print:w-full print:block ${(mode === 'Anticipatory' || mode === 'Final') ? 'anticipatory-final-mode' :
              mode === '12BB' ? 'form-12bb-mode' : ''
              }`}
          >
            {mode === '12BB' ? renderForm12BB() : mode === 'Form16' ? renderForm16() : renderAnticipatoryOrFinal()}
          </div>
        </div>

        {/* Action Footer - Hidden on Print */}
        {!isBulk && (
        <div id="action-footer" className="p-4 border-t bg-gray-50 flex items-center justify-between print:hidden">
          <div className="hidden md:block">
            <p className="text-xs text-gray-500 font-medium">KSTA Tax System • {mode} Mode</p>
            <p className="text-[10px] text-gray-400">Optimized for A4 Printing & Global Compliance</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-6 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-all active:scale-95 disabled:opacity-50"
            >
              Close
            </button>
            <div className="flex items-center gap-3">

              <button
                type="button"
                onClick={handlePrint}
                disabled={isProcessing}
                className="px-8 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex items-center shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:opacity-70"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Now
              </button>
            </div>
          </div>
        </div>
        )}

        <style dangerouslySetInnerHTML={{
          __html: `
          @media print {
            @page { 
              size: A4 portrait; 
              margin: 5mm; 
            }
            
            /* Hide UI elements and overlays */
            #preview-header, #action-footer, .print-hidden, 
            #stuck-overlays, [class*="html2pdf"] {
              display: none !important;
              visibility: hidden !important;
            }
            
            body, html {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            .print-root {
              display: block !important;
              visibility: visible !important;
              position: static !important;
              width: 100% !important;
            }

            #printable-report { 
              padding: 0 !important; 
              margin: 0 !important; 
              overflow: visible !important; 
            }
            
            .printable-area { 
              width: 100% !important; 
              height: auto !important;
              min-height: 0 !important;
              max-height: none !important;
              box-shadow: none !important; 
              border: none !important; 
              margin: 0 !important; 
              padding: 0 !important;
              display: block !important;
              visibility: visible !important;
              opacity: 1 !important;
            }

            .tamil-font-container { 
              font-family: inherit !important;
            }

            * { 
               border-color: black !important;
            }
            
            .fixed, .sticky {
              position: static !important;
            }

            tr {
              page-break-inside: avoid !important;
            }

            td {
              page-break-inside: avoid !important;
            }
          }
          
          /* Custom font definition for TAU-Pallai */
          @font-face {
            font-family: 'TAU-Pallai';
            src: local('TAU-Pallai');
          }

          .tamil-text {
             font-family: 'TAU-Pallai', serif;
             font-size: 14px !important;
             line-height: 1.6 !important;
          }

          /* Default table cell styles */
          .printable-area table td {
            line-height: 1.5 !important;
            padding-top: 5px !important;
            padding-bottom: 5px !important;
          }

          /* Special spacing for Anticipatory/Final mode as requested */
          .anticipatory-final-mode table td {
            line-height: 1.65 !important;
            padding-top: 6px !important;
            padding-bottom: 6px !important;
          }

          /* Special spacing and margins for Form 12BB */
          .form-12bb-mode table td {
            line-height: 2 !important;
            padding-top: 10px !important;
            padding-bottom: 10px !important;
          }
          
          .form-12bb-mode {
            padding: 8mm !important;
          }

          /* Specifically for Anticipatory/Final to make sure it fits if spacing is added */
          .printable-area {
            max-width: 210mm;
            min-height: 297mm;
          }
        `}} />
    </div>
  );

  if (isBulk) {
    return innerContent;
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm print:static print:block print:bg-white print:p-0 print-root print-overlay">
      {innerContent}
    </div>
  );
}
