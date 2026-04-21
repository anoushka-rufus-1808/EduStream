import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // This is where we save their "Activities"
  history: [{
    topic: String,
    filename: String,
    date: { type: Date, default: Date.now }
  }],
  // This is where we save what they should study next
  recommendations: [String]
});

export default mongoose.model('User', UserSchema);