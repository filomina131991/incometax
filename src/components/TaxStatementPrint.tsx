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

  const renderAnticipatoryOrFinal = () => {
    const isAnticipatory = mode === 'Anticipatory';
    const months = ['March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February'];
    const firstHalf = months.slice(0, 6);
    const secondHalf = months.slice(6);

    return (
      <div className="p-8 text-black bg-white" style={{ fontFamily: "'Times New Roman', Times, serif" }} id="printable-area">
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold uppercase underline">
            {isAnticipatory ? 'Anticipatory Income Tax Statement for the Financial Year' : 'Income Tax Statement for the Financial Year'} {fy.year}
          </h1>
          <p className="text-sm font-bold">(Assessment Year 2026-2027)</p>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-2 text-[13px]">
          <div className="flex">
            <span className="font-bold w-36">Name of Employee:</span>
            <span className="border-b border-black flex-1">{teacher.name}</span>
          </div>
          <div className="flex">
            <span className="font-bold w-12">PAN:</span>
            <span className="border-b border-black flex-1">{teacher.panNumber}</span>
          </div>
          <div className="flex">
            <span className="font-bold w-36">Designation:</span>
            <span className="border-b border-black flex-1">{teacher.designation}</span>
          </div>
          <div className="flex">
            <span className="font-bold w-12">Office:</span>
            <span className="border-b border-black flex-1">{fy.schoolName}</span>
          </div>
          <div className="flex">
            <span className="font-bold w-36">Category:</span>
            <span className="border-b border-black flex-1">Individual (Age: {teacher.category || 'below 60 years'})</span>
          </div>
          <div className="flex">
            <span className="font-bold w-32">Income Tax Slab:</span>
            <span className="border-b border-black flex-1">{teacher.taxRegime || 'NEW'} Regime</span>
          </div>
        </div>

        <p className="text-[11px] mb-2">to be furnished by the employees / officers whose income exceeds Rs. 2,50,000/-</p>

        <table className="w-full border-collapse border border-black text-[12px]">
          <tbody>
            {/* Row 1 */}
            <tr>
              <td className="border border-black p-1 w-8 text-center font-bold align-top" rowSpan={5}>1</td>
              <td className="border border-black p-1 w-6 text-center font-bold align-top">a</td>
              <td className="border border-black p-1 font-bold" colSpan={2}>
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
                        <div key={month} className="flex justify-between border-b border-black last:border-b-0 px-4 py-0.5">
                          <span className="font-bold">{month} 2025 :</span>
                          <span>{gross || ''}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    {secondHalf.map((month, idx) => {
                      const year = idx < 4 ? '2025' : '2026';
                      const data = monthlyData.find(m => m.month === month);
                      const gross = n(data?.basicPay) + n(data?.da) + n(data?.hra) + n(data?.ca) + n(data?.otherAllowance);
                      return (
                        <div key={month} className="flex justify-between border-b border-black last:border-b-0 px-4 py-0.5">
                          <span className="font-bold">{month} {year} :</span>
                          <span>{gross || ''}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1 w-6 text-center font-bold align-top">b</td>
              <td className="border border-black p-1">
                <div className="space-y-0.5">
                  <div className="flex justify-between"><span>Leave Surrender</span><span></span></div>
                  <div className="flex justify-between"><span>Festival Allowance / Bonus / Ex-gratia and Incentive</span><span>{n(taxCalc.festivalAllowance) || ''}</span></div>
                  <div className="flex justify-between"><span>Pay Revision Arrears, DA Arrears, Other Arrears</span><span>{n(taxCalc.daArrear) + n(taxCalc.payRevisionArrear) || ''}</span></div>
                  <div className="flex justify-between"><span>Other Salary Income</span><span>{n(taxCalc.otherIncome) || ''}</span></div>
                </div>
              </td>
              <td className="border border-black p-1 w-32 text-right align-bottom">
                {n(taxCalc.festivalAllowance) + n(taxCalc.daArrear) + n(taxCalc.payRevisionArrear) + n(taxCalc.otherIncome) || ''}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1 w-6 text-center font-bold align-top">c</td>
              <td className="border border-black p-1">Excess Pay drawn, Dies non, etc.</td>
              <td className="border border-black p-1 w-32 text-right"></td>
            </tr>
            <tr className="font-bold bg-gray-50">
              <td className="border border-black p-1" colSpan={2}>Total Salary Income (a+b-c)</td>
              <td className="border border-black p-1 text-right">{n(taxCalc.grossSalary)}</td>
            </tr>

            {/* Row 2 */}
            <tr>
              <td className="border border-black p-1 text-center font-bold align-top" rowSpan={7}>2</td>
              <td className="border border-black p-1 font-bold" colSpan={2}>Deduct:</td>
              <td className="border border-black p-1"></td>
            </tr>
            <tr>
              <td className="border border-black p-1 text-center font-bold">a</td>
              <td className="border border-black p-1">Standard Deduction (Rs. {fy.standardDeduction || 75000}/-)</td>
              <td className="border border-black p-1 text-right">{n(taxCalc.standardDeduction)}</td>
            </tr>
            <tr>
              <td className="border border-black p-1 text-center font-bold">b</td>
              <td className="border border-black p-1">Conveyance Allowance</td>
              <td className="border border-black p-1 text-right"></td>
            </tr>
            <tr>
              <td className="border border-black p-1 text-center font-bold">c</td>
              <td className="border border-black p-1">NPS - Employer's Contribution</td>
              <td className="border border-black p-1 text-right"></td>
            </tr>
            <tr>
              <td className="border border-black p-1 text-center font-bold">d</td>
              <td className="border border-black p-1"></td>
              <td className="border border-black p-1 text-right"></td>
            </tr>
            <tr>
              <td className="border border-black p-1 text-center font-bold">e</td>
              <td className="border border-black p-1"></td>
              <td className="border border-black p-1 text-right"></td>
            </tr>
            <tr>
              <td className="border border-black p-1 text-center font-bold">f</td>
              <td className="border border-black p-1"></td>
              <td className="border border-black p-1 text-right"></td>
            </tr>

            {/* Row 3-15 */}
            <tr>
              <td className="border border-black p-1 text-center font-bold">3</td>
              <td className="border border-black p-1" colSpan={2}>Any other income (Business, Capital Gains or Other Sources)</td>
              <td className="border border-black p-1 text-right"></td>
            </tr>
            <tr className="font-bold bg-gray-50">
              <td className="border border-black p-1 text-center">4</td>
              <td className="border border-black p-1" colSpan={2}>Total Income rounded off to nearest multiple of ten rupees ( 1 - 2 + 3 )</td>
              <td className="border border-black p-1 text-right">{n(taxCalc.taxableIncome)}</td>
            </tr>
            <tr>
              <td className="border border-black p-1 text-center font-bold">5</td>
              <td className="border border-black p-1" colSpan={2}>Tax on Total Income</td>
              <td className="border border-black p-1 text-right">{n(taxCalc.taxOnTotal)}</td>
            </tr>
            <tr>
              <td className="border border-black p-1 text-center font-bold">6</td>
              <td className="border border-black p-1" colSpan={2}>Less: Rebate for the Income upto 12 Lakhs u/s 87 A (Max: Rs. 60,000/-)</td>
              <td className="border border-black p-1 text-right">{n(taxCalc.marginalRelief)}</td>
            </tr>
            <tr className="font-bold bg-gray-50">
              <td className="border border-black p-1 text-center">7</td>
              <td className="border border-black p-1" colSpan={2}>Income tax after Rebate ( 5 - 6 )</td>
              <td className="border border-black p-1 text-right">{Math.max(0, n(taxCalc.taxOnTotal) - n(taxCalc.marginalRelief))}</td>
            </tr>
            <tr>
              <td className="border border-black p-1 text-center font-bold">8</td>
              <td className="border border-black p-1" colSpan={2}>Surcharge [ 10% of (7) if (4) &gt; 50 lakh; 15% if &gt; 1 crore; 25% if &gt; 2 crore ]</td>
              <td className="border border-black p-1 text-right"></td>
            </tr>
            <tr>
              <td className="border border-black p-1 text-center font-bold">9</td>
              <td className="border border-black p-1" colSpan={2}>Health and Education Cess [ @ 4% of (7+8) ]</td>
              <td className="border border-black p-1 text-right">{n(taxCalc.cess)}</td>
            </tr>
            <tr className="font-bold bg-gray-50">
              <td className="border border-black p-1 text-center">10</td>
              <td className="border border-black p-1" colSpan={2}>Total Tax Payable ( 7 + 8 + 9 )</td>
              <td className="border border-black p-1 text-right">{n(taxCalc.totalTax)}</td>
            </tr>
            <tr>
              <td className="border border-black p-1 text-center font-bold">11</td>
              <td className="border border-black p-1" colSpan={2}>Less: Relief for arrears of salary u/s. 89(1)</td>
              <td className="border border-black p-1 text-right"></td>
            </tr>
            <tr className="font-bold bg-gray-50">
              <td className="border border-black p-1 text-center">12</td>
              <td className="border border-black p-1" colSpan={2}>Balance Tax Payable ( 10 - 11 )</td>
              <td className="border border-black p-1 text-right">{n(taxCalc.totalTax)}</td>
            </tr>
            <tr>
              <td className="border border-black p-1 text-center font-bold">13</td>
              <td className="border border-black p-1" colSpan={2}>Income tax deducted from salary, Advance tax paid</td>
              <td className="border border-black p-1 text-right">{n(taxCalc.taxDeducted)}</td>
            </tr>
            <tr className="font-bold bg-gray-50">
              <td className="border border-black p-1 text-center">14</td>
              <td className="border border-black p-1" colSpan={2}>Balance Income Tax to be paid</td>
              <td className="border border-black p-1 text-right">{n(taxCalc.balance)}</td>
            </tr>
            {isAnticipatory && (
              <tr>
                <td className="border border-black p-1 text-center font-bold">15</td>
                <td className="border border-black p-1" colSpan={2}>Income Tax to be deducted monthly - 11 installments (Rounded up to 100)</td>
                <td className="border border-black p-1 text-right">
                  {n(taxCalc.balance) > 0 ? Math.ceil(n(taxCalc.balance) / 11) : 0}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-12 grid grid-cols-2 text-sm">
          <div className="space-y-4">
            <p><span className="font-bold">Place:</span> Parisakkal</p>
            <p><span className="font-bold">Date:</span> {new Date().toLocaleDateString()}</p>
          </div>
          <div className="text-right flex flex-col items-end">
            <p className="font-bold mr-24">Signature:</p>
            {teacher.signatureUrl && (
              <img src={teacher.signatureUrl} alt="Signature" className="h-12 mr-12 mt-2" referrerPolicy="no-referrer" />
            )}
          </div>
        </div>

        <div className="mt-16 text-[9px] text-gray-400">
          -ecostatt.com-
        </div>
      </div>
    );
  };

  const renderForm12BB = () => (
    <div className="p-8 text-black bg-white" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold uppercase underline">FORM NO. 12BB</h1>
        <p className="text-sm font-bold">(See rule 26C)</p>
        <p className="text-[13px] mt-2 font-bold">Statement showing particulars of claims by an employee for deduction of tax under section 192</p>
      </div>

      <div className="space-y-4 mb-6 text-[14px]">
        <div className="flex">
          <span className="font-bold w-8">1</span>
          <span className="font-bold w-64 text-left">Name and address of the employee</span>
          <span className="font-bold w-4">:</span>
          <span className="flex-1 border-b border-black">{teacher.name}, {fy.schoolName}</span>
        </div>
        <div className="flex">
          <span className="font-bold w-8">2</span>
          <span className="font-bold w-64 text-left">Permanent account number</span>
          <span className="font-bold w-4">:</span>
          <span className="flex-1 border-b border-black">{teacher.panNumber}</span>
        </div>
        <div className="flex">
          <span className="font-bold w-8">3</span>
          <span className="font-bold w-64 text-left">Financial year</span>
          <span className="font-bold w-4">:</span>
          <span className="flex-1 border-b border-black">{fy.year}</span>
        </div>
      </div>

      <table className="w-full border-collapse border border-black text-[12px] mb-6">
        <thead>
          <tr>
            <th className="border border-black p-1 text-center font-bold" colSpan={4}>Details of claims and evidence thereof</th>
          </tr>
          <tr className="bg-gray-50">
            <th className="border border-black p-1 w-12 font-bold">Sl.No.</th>
            <th className="border border-black p-1 font-bold">Nature of claim</th>
            <th className="border border-black p-1 w-32 font-bold">Amount (Rs.)</th>
            <th className="border border-black p-1 w-48 font-bold">Evidence /Particulars</th>
          </tr>
          <tr className="bg-gray-50 text-[10px]">
            <th className="border border-black p-0.5 font-bold">(1)</th>
            <th className="border border-black p-0.5 font-bold">(2)</th>
            <th className="border border-black p-0.5 font-bold">(3)</th>
            <th className="border border-black p-0.5 font-bold">(4)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black p-1 text-center font-bold align-top">1.</td>
            <td className="border border-black p-1">
              <p className="font-bold">House Rent Allowance:</p>
              <div className="pl-4 space-y-0.5">
                <p>(i) Rent Paid to the Landlord:</p>
                <p>(ii) Name of the landlord:</p>
                <p>(iii) Address of the landlord:</p>
                <br/>
                <p>(iv) PAN of the landlord:</p>
                <p className="text-[10px] font-bold italic">Note: Permanent Account Number shall be furnished if the aggregate rent paid during the previous year exceeds onelakh rupees</p>
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
                <p>(i) Interest payable/paid to the lender</p>
                <p>(ii) Name of the lender</p>
                <p>(iii) Address of the lender</p>
                <br/>
                <p>(iv) PAN of the lender (Financial Institution/Employer/Others)-If available</p>
              </div>
            </td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1"></td>
          </tr>
          <tr>
            <td className="border border-black p-1 text-center font-bold align-top">4.</td>
            <td className="border border-black p-1">
              <p className="font-bold">Deduction under Chapter VI-A</p>
              <p className="font-bold">(B) Other sections (e.g. 80E, 80G, 80TTA, etc.) under Chapter VI-A,</p>
              <div className="pl-4 space-y-0.5">
                <p>Housing Loan Interest</p>
                <p>Mediclaim Policies</p>
                <p>Medical treatment of dependent</p>
                <p>Medical treatment of Self</p>
                <p>Interest paid for Educational Loan</p>
                <p>Donation to various charitable funds</p>
                <p>Deduction for person with disability</p>
                <p>Interest paid for Electric Vehicle Loan</p>
                <p>Interest income for SB, Fixed deposit, ...</p>
                <p>Remaining Contribution to NPS</p>
                <p>NPS - Employer's Contribution</p>
              </div>
            </td>
            <td className="border border-black p-1 text-right align-bottom">
              {f(taxCalc.section80D || 0)}
            </td>
            <td className="border border-black p-1"></td>
          </tr>
          <tr>
            <td className="border border-black p-1" colSpan={2}>
              <p className="font-bold">(A) Section 80C, 80CCC and 80CCD</p>
              <p className="font-bold">(i) Section 80C</p>
              <div className="pl-4 space-y-0.5">
                <p>a) LIC, PLI etc</p>
                <p>b) Purchase of NSC VIII issue</p>
                <p>c) Contribution to GPF</p>
                <p>d) Contribution to SLI, GIS, FBS, GPAIS</p>
                <p>e) Term deposit with Scheduled Bank</p>
                <p>f) Mutual Fund or UTI</p>
                <p>g) Tution fees</p>
                <p>h) Housing Loan Repayment (Principal)</p>
                <p>i) Contribution to PPF</p>
                <p>j) Five year Time Deposit in Post Office</p>
                <p>k)</p>
                <p>l)</p>
                <p>m)</p>
                <p>n)</p>
              </div>
              <p className="font-bold mt-2">(ii) 80CCC Contribution to Pension Fund</p>
              <p className="font-bold">(iii) Contribution to NPS</p>
            </td>
            <td className="border border-black p-1 text-right align-middle">
              {f(taxCalc.section80C || 0)}
            </td>
            <td className="border border-black p-1"></td>
          </tr>
        </tbody>
      </table>

      <div className="mt-8">
        <p className="font-bold text-center underline mb-6">Verification</p>
        <p className="text-justify leading-relaxed text-[13px]">
          I, <span className="font-bold border-b border-dotted border-black px-4">{teacher.name}</span>, son/daughter of <span className="font-bold border-b border-dotted border-black px-4">{teacher.fatherName || '........................................................................'}</span> do hereby certify that the information given above is complete and correct.
        </p>
        <div className="mt-10 grid grid-cols-2 text-[13px]">
          <div className="space-y-4">
            <p><span className="font-bold">Place:</span> Parisakkal</p>
            <p><span className="font-bold">Date:</span> {new Date().toLocaleDateString()}</p>
          </div>
          <div className="text-right flex flex-col items-end">
            <p className="font-bold mr-24">Signature:</p>
            {teacher.signatureUrl && (
              <img src={teacher.signatureUrl} alt="Signature" className="h-12 mr-12 mt-2" referrerPolicy="no-referrer" />
            )}
          </div>
        </div>
      </div>
      <div className="mt-12 text-[9px] text-gray-400">
        -ecostatt.com-
      </div>
    </div>
  );

  const renderForm16 = () => (
    <div className="p-8 text-black bg-white" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold uppercase underline">FORM NO. 16</h1>
        <p className="text-sm font-bold">[See rule 31(1)(a)]</p>
        <p className="text-lg font-bold mt-2">PART B (Annexure)</p>
      </div>

      <table className="w-full border-collapse border border-black text-[12px] mb-6">
        <tbody>
          <tr>
            <td className="border border-black p-2 w-1/2">
              <p className="font-bold">Name and address of the Employer</p>
              <p className="mt-1 h-12">{fy.schoolName}</p>
            </td>
            <td className="border border-black p-2 w-1/2">
              <p className="font-bold">Name and Designation of the Employee</p>
              <p className="mt-1">{teacher.name}</p>
              <p>{teacher.designation}</p>
            </td>
          </tr>
          <tr>
            <td className="border border-black p-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="font-bold">PAN of the Deductor</p>
                  <p className="mt-1">{fy.hmPan || '........................'}</p>
                </div>
                <div>
                  <p className="font-bold">TAN of the Deductor</p>
                  <p className="mt-1">{fy.hmTan || '........................'}</p>
                </div>
              </div>
            </td>
            <td className="border border-black p-2">
              <p className="font-bold">PAN of the Employee</p>
              <p className="mt-1">{teacher.panNumber}</p>
            </td>
          </tr>
          <tr>
            <td className="border border-black p-2">
              <p className="font-bold">CIT (TDS)</p>
              <p className="mt-1">................................................</p>
            </td>
            <td className="border border-black p-2">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="font-bold">Assessment Year</p>
                  <p className="mt-1">2026 - 27</p>
                </div>
                <div className="col-span-2">
                  <p className="font-bold text-center">Period</p>
                  <div className="grid grid-cols-2 text-center mt-1">
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

      <h3 className="font-bold mb-2 underline text-[13px]">Details of Salary paid and any other income and tax deducted</h3>
      <table className="w-full border-collapse border border-black text-[11px] mb-6">
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
            <td className="border border-black p-1 text-right"></td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-bold" colSpan={2}>8. Add: Any other income reported by the employee</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right"></td>
          </tr>
          <tr className="font-bold">
            <td className="border border-black p-1 font-bold" colSpan={2}>9. Gross total income (6-7+8)</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right">{f(taxCalc.incomeChargeableSalaries)}</td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-bold" colSpan={2}>10. Deductions under Chapter VIA</td>
            <td className="border border-black p-1 text-center font-bold">Gross Amount</td>
            <td className="border border-black p-1 text-center font-bold">Deductible Amount</td>
          </tr>
          <tr>
            <td className="border border-black p-1" colSpan={2}>
              <p className="font-bold">(A) Sections 80C, 80CCC and 80CCD</p>
              <div className="pl-4 space-y-0.5 text-[10px]">
                <p>Life Insurance premia of self, spouse or children</p>
                <p>Purchase of NSC VIII issue</p>
                <p>Contribution to GPF (Subscription, DA Arrear, Pay Revision Arrear, etc)</p>
                <p>Contribution to SLI, GIS, FBS, GPAIS, etc (Total)</p>
                <p>Term deposit with Scheduled Bank for a fixed period</p>
                <p>Purchase of tax saving units of Mutual Fund or UTI</p>
                <p>Tution fees for full-time education to any 2 children</p>
                <p>Housing Loan Repayment (Principal)</p>
                <p>Contribution to PPF account of Self, Spouse or Children</p>
                <p>Five year Time Deposit in Post Office</p>
                <p>Contribution to NPS (Max 10% of Basic+DA)</p>
                <p>Payment to Annuity Plan of Pension fund like LIC</p>
              </div>
            </td>
            <td className="border border-black p-1 text-right align-bottom"></td>
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
              <div className="pl-4 space-y-0.5 text-[10px]">
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
            <td className="border border-black p-1 text-right align-bottom"></td>
            <td className="border border-black p-1 text-right align-bottom">{f(taxCalc.section80D || 0)}</td>
          </tr>
          <tr className="font-bold">
            <td className="border border-black p-1 text-center" colSpan={2}>TOTAL</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right">{f((taxCalc.section80C || 0) + (taxCalc.section80D || 0))}</td>
          </tr>
          <tr className="font-bold">
            <td className="border border-black p-1" colSpan={2}>11. Aggregate of deductible amount (10A + 10B)</td>
            <td className="border border-black p-1 text-right"></td>
            <td className="border border-black p-1 text-right">{f((taxCalc.section80C || 0) + (taxCalc.section80D || 0))}</td>
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

      <div className="mt-8">
        <p className="font-bold text-center underline mb-6">Verification</p>
        <p className="text-justify leading-relaxed text-[11px]">
          I, <span className="font-bold border-b border-dotted border-black px-2">{teacher.name}</span>, son/daughter of <span className="font-bold border-b border-dotted border-black px-2">{teacher.fatherName || '........................................................................'}</span> working in the capacity of <span className="font-bold border-b border-dotted border-black px-2">{teacher.designation}</span> (designation) do hereby certify that the information given above is true, complete and correct and is based on the books of account, documents, TDS statements, and other available records.
        </p>
        <div className="mt-10 grid grid-cols-2 text-[12px]">
          <div className="space-y-4">
            <p><span className="font-bold">Place:</span> Parisakkal</p>
            <p><span className="font-bold">Date:</span> {new Date().toLocaleDateString()}</p>
          </div>
          <div className="text-center">
            <div className="border-t border-black w-64 pt-2 ml-auto">
              <p className="font-bold text-[10px]">Signature of person responsible for deduction of tax</p>
              <p className="text-[10px] mt-1">Full Name: {fy.hmName || '........................................................'}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-12 text-[9px] text-gray-400">
        -ecostatt.com-
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
