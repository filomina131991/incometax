import mongoose from 'mongoose';

const KstaMemberSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  financialYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinancialYear', required: true },
  membershipFee: { type: Number, default: 0 },
  yearlyFee: { type: Number, default: 0 },
  diaryIssued: { type: Boolean, default: false },
  specialFundPaid: { type: Boolean, default: false },
  specialFundName: { type: String, default: 'Special Fund' },
  specialFundAmount: { type: Number, default: 0 },
  isNewspaperSubscriber: { type: Boolean, default: false }
}, { timestamps: true });

// Ensure a teacher is only added once per financial year
KstaMemberSchema.index({ teacherId: 1, financialYearId: 1 }, { unique: true });

export default mongoose.model('KstaMember', KstaMemberSchema);
