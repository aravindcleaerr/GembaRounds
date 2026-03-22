const mongoose = require('mongoose');

const observationSchema = new mongoose.Schema({
  walk: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Walk',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  // Waste category (Muda/Mura/Muri) or issue type
  category: {
    type: String,
    enum: ['Muda', 'Mura', 'Muri', 'Safety', 'Quality', 'Other'],
    required: true
  },
  // PSS: Observation area from the 15 areas defined by PSS
  observationArea: {
    type: String,
    enum: [
      'House Keeping (5S)', 'Safety', 'Discipline', 'Productivity',
      'Wastes', 'Ambience', 'Environment Impact', 'Material Handling',
      'Data Recording', 'Adherence to Standards', 'Machine Condition',
      'Gauges and Fixture', 'Inventory', 'Review Meeting', 'Others'
    ],
    required: true
  },
  // PSS: Positive (appreciate good things) or Negative (improvement needed)
  observationType: {
    type: String,
    enum: ['positive', 'negative'],
    default: 'negative'
  },
  // PSS: Location where observation was made
  location: {
    type: String,
    default: ''
  },
  // PSS: Person to be tagged for action
  personTagged: {
    type: String,
    default: ''
  },
  // PSS: Person met during the observation
  personMet: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  // Action tracking
  actionStatus: {
    type: String,
    enum: ['open', 'in-progress', 'closed'],
    default: 'open'
  },
  actionDueDate: {
    type: Date
  },
  actionNotes: {
    type: String,
    default: ''
  },
  // PSS: Photo/video attachments
  attachments: [{
    url: String,
    filename: String,
    originalName: String,
    fileType: { type: String, enum: ['image', 'video'] }
  }],
  // Employee/Operator who submitted (for employee involvement)
  submittedBy: {
    type: String,
    default: ''
  },
  submittedByRole: {
    type: String,
    enum: ['manager', 'operator', 'employee'],
    default: 'manager'
  },
  // Gamification: Kaizen points
  kaizenPoints: {
    type: Number,
    default: 0
  },
  aiCategorized: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: Object
  }
});

module.exports = mongoose.model('Observation', observationSchema);