export interface FinancialYear {
  id?: string;
  year: string;
  schoolName: string;
  monthlyConfig: MonthlyConfig[];
  isActive: boolean;
  newRegimeSlabs: TaxSlab[];
  oldRegimeSlabs: TaxSlab[];
  standardDeduction: number;
  standardDeductionOld: number;
  rebateLimit: number;
  rebateAmount: number;
  rebateLimitOld: number;
  rebateAmountOld: number;
  deductionLimits?: {
    section80C: number;
    section80D: number;
    section80G: number;
    other: number;
  };
  hmName?: string;
  hmPan?: string;
  hmTan?: string;
  hmFatherName?: string;
  place?: string;
  hmMobile?: string;
  hmEmail?: string;
  principalName?: string;
  principalFatherName?: string;
  principalPan?: string;
  principalTan?: string;
  principalMobile?: string;
  principalEmail?: string;
  schoolMail?: string;
}

export interface MonthlyConfig {
  month: string;
  daPercent: number;
  hraPercent: number;
}

export interface TaxSlab {
  min: number;
  max: number | null;
  rate: number;
}

export interface Teacher {
  id?: string;
  name: string;
  penNumber: string;
  gender: 'Male' | 'Female';
  panNumber: string;
  aadhaarNumber: string;
  pfNumber: string;
  designation: 'LPST' | 'UPST' | 'HST';
  subject: string;
  bankAccountNumber: string;
  branch: string;
  ifscCode: string;
  electionId: string;
  dob: string;
  doj: string;
  dor: string;
  taxRegime: 'New' | 'Old';
  category: 'Below 60' | 'Above 60' | 'Senior Citizen';
  password?: string;
  basicPay: number;
  incrementMonth?: string;
  incrementAmount?: number;
  activeFYs?: string[];
  deletedInFY?: string[];
}

export interface MonthlyData {
  month: string;
  basicPay: number;
  da: number;
  hra: number;
  ca: number;
  otherAllowance: number;
  pf: number;
  gis: number;
  sli: number;
  lic: number;
  medisep: number;
  gpais: number;
  nps: number;
  tds: number;
}

export interface TaxStatement {
  id?: string;
  teacherId: string;
  financialYearId: string;
  regime: 'New' | 'Old';
  type: 'Anticipatory' | 'Final';
  monthlyData: MonthlyData[];
  festivalAllowance: number;
  daArrear: number;
  payRevisionArrear: number;
  otherIncome: number;
  totalIncome: number;
  taxableIncome: number;
  taxOnTotalIncome: number;
  taxRebate: number;
  surcharge: number;
  cess: number;
  totalTax: number;
  taxDeducted: number;
  balanceTax: number;
  section80C?: number;
  section80D?: number;
  status: 'Draft' | 'Submitted' | 'Approved';
  isConfirmed: boolean;
  isBasicPayUpdated: boolean;
  signedPdfUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id?: string;
  type: string;
  description: string;
  userId: string;
  userName: string;
  timestamp: string;
}
