// models/Task.js
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description:{type:String,},
  quadrant: { type: String, enum: ['urgent-important', 'urgent-not-important', 'not-urgent-important', 'not-urgent-not-important'],},
  completed: { type: Boolean, default: false },
  dueDate: { type: Date, default:null },
  priority: { type: String, enum: ['haute', 'moyenne', 'basse'], default: 'moyenne' }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
