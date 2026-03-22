const mongoose = require('mongoose');

const walkSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  // PSS: Who is conducting the walk (Managers / Leadership team)
  walker: {
    type: String,
    default: ''
  },
  // PSS: Frequency - daily, weekly, bimonthly, monthly
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'bimonthly', 'monthly', 'adhoc'],
    default: 'adhoc'
  },
  // PSS: Scheduled date for the walk
  scheduledDate: {
    type: Date
  },
  observations: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Observation'
    }
  ],
  aiAnalysis: {
    type: String
  },
  status: {
    type: String,
    enum: ['scheduled', 'draft', 'in-progress', 'submitted', 'completed'],
    default: 'draft'
  },
  // PSS: Weekly review/discussion tracking
  reviewDate: {
    type: Date
  },
  reviewNotes: {
    type: String,
    default: ''
  },
  reviewedBy: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Walk', walkSchema);