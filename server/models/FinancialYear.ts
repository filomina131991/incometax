import mongoose from 'mongoose';

const FinancialYearSchema = new mongoose.Schema({
  year: { type: String, required: true },
  schoolName: { type: String, required: true },
  monthlyConfig: [{
    month: String,
    daPercent: Number,
    hraPercent: Number
  }],
  isActive: { type: Boolean, default: false },
  newRegimeSlabs: [{
    min: Number,
    max: Number,
    rate: Number
  }],
  oldRegimeSlabs: [{
    min: Number,
    max: Number,
    rate: Number
  }],
  standardDeduction: { type: Number, default: 75000 },
  standardDeductionOld: { type: Number, default: 50000 },
  rebateLimit: { type: Number, default: 700000 },
  rebateAmount: { type: Number, default: 25000 },
  rebateLimitOld: { type: Number, default: 500000 },
  rebateAmountOld: { type: Number, default: 12500 },
  deductionLimits: {
    section80C: { type: Number, default: 150000 },
    section80D: { type: Number, default: 25000 },
    section80G: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  hmName: String,
  hmPan: String,
  hmTan: String,
  hmFatherName: String,
  place: String,
  hmMobile: String,
  hmEmail: String,
  principalName: String,
  principalFatherName: String,
  principalPan: String,
  principalTan: String,
  principalMobile: String,
  principalEmail: String,
  schoolMail: String
}, { timestamps: true });

export default mongoose.model('FinancialYear', FinancialYearSchema);
