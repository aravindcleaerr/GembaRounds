const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ===== WALK MODEL =====
const walkSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  walker: { type: String, default: '' },
  frequency: { type: String, enum: ['daily', 'weekly', 'bimonthly', 'monthly', 'adhoc'], default: 'adhoc' },
  scheduledDate: { type: Date },
  observations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Observation' }],
  aiAnalysis: { type: String },
  status: { type: String, enum: ['scheduled', 'draft', 'in-progress', 'submitted', 'completed'], default: 'draft' },
  reviewDate: { type: Date },
  reviewNotes: { type: String, default: '' },
  reviewedBy: { type: String, default: '' }
}, { timestamps: true });

// ===== OBSERVATION MODEL =====
const observationSchema = new mongoose.Schema({
  walk: { type: mongoose.Schema.Types.ObjectId, ref: 'Walk' },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, enum: ['Muda', 'Mura', 'Muri', 'Safety', 'Quality', 'Other'], required: true },
  observationArea: {
    type: String,
    enum: ['House Keeping (5S)', 'Safety', 'Discipline', 'Productivity', 'Wastes', 'Ambience',
      'Environment Impact', 'Material Handling', 'Data Recording', 'Adherence to Standards',
      'Machine Condition', 'Gauges and Fixture', 'Inventory', 'Review Meeting', 'Others'],
    required: true
  },
  observationType: { type: String, enum: ['positive', 'negative'], default: 'negative' },
  location: { type: String, default: '' },
  personTagged: { type: String, default: '' },
  personMet: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
  actionStatus: { type: String, enum: ['open', 'in-progress', 'closed'], default: 'open' },
  actionDueDate: { type: Date },
  actionNotes: { type: String, default: '' },
  attachments: [{ url: String, filename: String, originalName: String, fileType: { type: String, enum: ['image', 'video'] } }],
  submittedBy: { type: String, default: '' },
  submittedByRole: { type: String, enum: ['manager', 'operator', 'employee'], default: 'manager' },
  kaizenPoints: { type: Number, default: 0 },
  aiCategorized: { type: Boolean, default: false },
  metadata: { type: Object }
});

// ===== USER MODEL =====
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'operator'], default: 'operator' },
  department: { type: String, default: '' },
  kaizenPoints: { type: Number, default: 0 }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
userSchema.methods.comparePassword = async function(pwd) { return bcrypt.compare(pwd, this.password); };

// ===== RECURRING WALK CONFIG =====
const recurringSchema = new mongoose.Schema({
  title: { type: String, default: 'Recurring Gemba Walk' },
  walker: { type: String, default: '' },
  frequency: { type: String, enum: ['daily', 'weekly', 'bimonthly', 'monthly'], required: true },
  cronExpr: { type: String },
  description: { type: String, default: '' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

// Use existing models if already registered (avoids OverwriteModelError in serverless)
const Walk = mongoose.models.Walk || mongoose.model('Walk', walkSchema);
const Observation = mongoose.models.Observation || mongoose.model('Observation', observationSchema);
const User = mongoose.models.User || mongoose.model('User', userSchema);
const RecurringWalkConfig = mongoose.models.RecurringWalkConfig || mongoose.model('RecurringWalkConfig', recurringSchema);

module.exports = { Walk, Observation, User, RecurringWalkConfig };
