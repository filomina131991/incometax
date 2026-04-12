import React from 'react';
import { FinancialYear, Teacher } from '../types';
import { formatCurrency } from '../lib/utils';
import { Printer, X } from 'lucide-react';

interface ConsolidatedReportPrintProps {
  statements: any[];
  fy: FinancialYear;
  onClose: () => void;
}

export default function ConsolidatedReportPrint({ statements, fy, onClose }: ConsolidatedReportPrintProps) {
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handlePrint = () => {
    if (isProcessing) return;
    setIsProcessing(true);

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

  return (
    <div className="bg-white flex flex-col overflow-hidden relative print:shadow-none print:max-h-none print:rounded-none print:w-full print:m-0 print:p-0 print:block rounded-xl shadow-2xl w-full max-w-6xl h-[95vh] mx-auto z-[200]">
      <div id="preview-header" className="flex items-center justify-between p-4 border-b bg-white print:hidden">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Printer className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 leading-tight">Consolidated TDS Report</h3>
            <p className="text-xs text-gray-500">Preview</p>
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

      <div id="printable-report" className="flex-1 overflow-auto p-4 md:p-8 bg-gray-100 print:bg-white print:p-0 print:overflow-visible print:block">
        <div className="p-4 px-6 text-black bg-white shadow-lg mx-auto print:shadow-none print:m-0 print:w-full print:block tamil-font-container" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
          <div className="text-center mb-4">
            <h1 className="text-lg font-bold uppercase underline leading-tight">CONSOLIDATED STATEMENT OF INCOME TAX</h1>
            <h2 className="text-md font-bold leading-tight mt-1">Financial Year: {fy.year}</h2>
            <h3 className="text-sm font-bold leading-tight mt-1 tamil-text">{fy.schoolName}</h3>
          </div>

          <table className="w-full border-collapse border border-black text-[10px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-1">Sl. No.</th>
                <th className="border border-black p-1">PEN</th>
                <th className="border border-black p-1">Name</th>
                <th className="border border-black p-1">Designation</th>
                <th className="border border-black p-1">Tax Regime</th>
                <th className="border border-black p-1 text-right">Gross Salary</th>
                <th className="border border-black p-1 text-right">Taxable Income</th>
                <th className="border border-black p-1 text-right">Total Tax Payable</th>
                <th className="border border-black p-1 text-center">Months</th>
                <th className="border border-black p-1 text-right">Monthly TDS</th>
                <th className="border border-black p-1 text-center">Signature</th>
              </tr>
            </thead>
            <tbody>
              {statements.map((s, index) => {
                const teacher = s.teacher;
                if (!teacher) return null;
                const monthlyTds = n(s.taxCalc.balance) > 0 ? Math.ceil(n(s.taxCalc.balance) / 11) : 0;
                
                return (
                  <tr key={index}>
                    <td className="border border-black p-1 text-center">{index + 1}</td>
                    <td className="border border-black p-1 text-center font-bold uppercase">{teacher.penNumber}</td>
                    <td className="border border-black p-1 font-bold tamil-text">{teacher.name}</td>
                    <td className="border border-black p-1 tamil-text">{teacher.designation}</td>
                    <td className="border border-black p-1 text-center font-bold uppercase">{teacher.taxRegime || s.mode}</td>
                    <td className="border border-black p-1 text-right">{f(s.taxCalc.grossSalary)}</td>
                    <td className="border border-black p-1 text-right">{f(s.taxCalc.taxableIncome)}</td>
                    <td className="border border-black p-1 text-right">{f(s.taxCalc.totalTax)}</td>
                    <td className="border border-black p-1 text-center">{monthlyTds > 0 ? "11" : "-"}</td>
                    <td className="border border-black p-1 text-right font-bold">{f(monthlyTds)}</td>
                    <td className="border border-black p-1 w-16"></td>
                  </tr>
                );
              })}
              {statements.length === 0 && (
                <tr>
                  <td colSpan={11} className="border border-black p-4 text-center">No data available</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-8 flex justify-between items-end">
            <div>
              <p><span className="font-bold">Place:</span> ............................................</p>
              <p className="mt-1"><span className="font-bold">Date:</span> {new Date().toLocaleDateString()}</p>
            </div>
            <div className="text-center">
              <p className="font-bold mb-8">Signature of the Head of Institution</p>
              <p className="tamil-text font-bold">{fy.hmName || '................................................'}</p>
              <p className="text-xs tamil-text">{fy.schoolName}</p>
            </div>
          </div>
        </div>
      </div>

      <div id="action-footer" className="p-4 border-t bg-gray-50 flex items-center justify-between print:hidden">
        <div>
          <p className="text-xs text-gray-500 font-medium">Consolidated Report for Office TDS Deduction</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-all"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            disabled={isProcessing}
            className="px-8 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex items-center shadow-lg shadow-blue-100 transition-all"
          >
            <Printer className="w-4 h-4 mr-2" />
            {isProcessing ? 'Printing...' : 'Print Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
