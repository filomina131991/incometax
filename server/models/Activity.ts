import mongoose from 'mongoose';

const ActivitySchema = new mongoose.Schema({
  type: { type: String, required: true },
  description: { type: String, required: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('Activity', ActivitySchema);
