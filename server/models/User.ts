import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'teacher'], default: 'teacher' },
  password: { type: String }, // Optional, maybe for non-Google login
  googleId: { type: String },
  schoolName: String
}, { timestamps: true });

export default mongoose.model('User', UserSchema);
