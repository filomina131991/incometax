import mongoose from 'mongoose';

const TeacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  penNumber: { type: String, required: true, unique: true },
  fatherName: String,
  gender: { type: String, enum: ['Male', 'Female'], required: true },
  panNumber: { type: String, required: true },
  aadhaarNumber: String,
  pfNumber: String,
  designation: { type: String, enum: ['LPST', 'UPST', 'HST', 'VHSE'], required: true },
  subject: String,
  mobile: String,
  email: String,
  bankAccountNumber: String,
  branch: String,
  ifscCode: String,
  electionId: String,
  dob: String,
  doj: String,
  dor: String,
  taxRegime: { type: String, enum: ['New', 'Old'], default: 'New' },
  category: { type: String, enum: ['Below 60', 'Above 60', 'Senior Citizen'], default: 'Below 60' },
  password: { type: String }, // For teachers who might log in later
  signatureUrl: String,
  basicPay: { type: Number, required: true },
  incrementMonth: String,
  incrementAmount: Number,
  activeFYs: [String],
  deletedInFY: [String],
  defaultPF: { type: Number, default: 0 },
  defaultGIS: { type: Number, default: 0 },
  defaultSLI: { type: Number, default: 0 },
  defaultLIC: { type: Number, default: 0 },
  defaultMedisep: { type: Number, default: 0 },
  defaultGPAIS: { type: Number, default: 0 },
  defaultNPS: { type: Number, default: 0 },
  defaultTDS: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Teacher', TeacherSchema);
