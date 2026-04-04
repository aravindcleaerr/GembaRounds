const express = require('express');
const cors = require('cors');
const connectDB = require('./_lib/db');
const { Walk, Observation, RecurringWalkConfig, User } = require('./_lib/models');
const rateLimit = require('./_lib/ratelimit');

const app = express();
app.use(cors());
app.use(express.json());

// Rate limiting: 60 requests per minute
app.use(rateLimit(60));

// Connect DB before each request
app.use(async (req, res, next) => { await connectDB(); next(); });

// ===== RECURRING =====
app.post('/api/walks/recurring', async (req, res) => {
  const { title, walker, frequency, description } = req.body;
  if (!frequency || frequency === 'adhoc') return res.status(400).json({ error: 'Frequency must be daily, weekly, bimonthly, or monthly' });
  const cronMap = { daily: '0 8 * * 1-6', weekly: '0 8 * * 1', bimonthly: '0 8 1,15 * *', monthly: '0 8 1 * *' };
  const cronExpr = cronMap[frequency];
  if (!cronExpr) return res.status(400).json({ error: 'Invalid frequency' });
  const doc = await RecurringWalkConfig.create({ title, walker, frequency, cronExpr, description });
  res.json({ recurring: { id: doc._id, title: doc.title, walker: doc.walker, frequency: doc.frequency, cronExpr: doc.cronExpr, active: true, createdAt: doc.createdAt }, message: 'Recurring walk scheduled' });
});

app.get('/api/walks/recurring', async (req, res) => {
  const docs = await RecurringWalkConfig.find({ active: true }).lean();
  res.json({ recurring: docs.map(d => ({ id: d._id, title: d.title, walker: d.walker, frequency: d.frequency, cronExpr: d.cronExpr, active: d.active, createdAt: d.createdAt })) });
});

app.delete('/api/walks/recurring/:id', async (req, res) => {
  const doc = await RecurringWalkConfig.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Removed' });
});

// ===== LIST ALL =====
app.get('/api/walks/all', async (req, res) => {
  try {
    const walks = await Walk.find().populate('observations').sort({ createdAt: -1 });
    res.json({ walks });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch walks' }); }
});

// ===== START WALK =====
app.post('/api/walks/start-walk', async (req, res) => {
  try {
    const walk = new Walk({ title: req.body.title || 'Gemba Walk', description: req.body.description || '', walker: req.body.walker || '', frequency: req.body.frequency || 'adhoc', scheduledDate: req.body.scheduledDate || null, status: 'in-progress' });
    await walk.save();
    res.json({ walkId: walk._id, message: 'New Gemba walk initiated' });
  } catch (e) { res.status(500).json({ error: 'Failed to start walk' }); }
});

// ===== SCHEDULE =====
app.post('/api/walks/schedule', async (req, res) => {
  try {
    const walk = new Walk({ title: req.body.title || 'Scheduled Walk', description: req.body.description || '', walker: req.body.walker || '', frequency: req.body.frequency || 'weekly', scheduledDate: req.body.scheduledDate, status: 'scheduled' });
    await walk.save();
    res.json({ walkId: walk._id, message: 'Walk scheduled' });
  } catch (e) { res.status(500).json({ error: 'Failed to schedule walk' }); }
});

// ===== SUBMIT OBSERVATION =====
app.post('/api/walks/submit-observation', async (req, res) => {
  try {
    const { walkId, title, description, category, observationArea, observationType, location, personTagged, personMet, attachments, metadata } = req.body;
    const walk = await Walk.findById(walkId);
    if (!walk) return res.status(404).json({ error: 'Walk not found' });
    const obs = new Observation({ walk: walkId, title, description, category, observationArea: observationArea || 'Others', observationType: observationType || 'negative', location: location || '', personTagged: personTagged || '', personMet: personMet || '', attachments: attachments || [], metadata });
    await obs.save();
    walk.observations.push(obs._id);
    await walk.save();
    res.json({ message: 'Observation recorded successfully', observation: obs });
  } catch (e) { res.status(500).json({ error: 'Failed to submit observation' }); }
});

// ===== COMPLETE =====
app.post('/api/walks/complete/:walkId', async (req, res) => {
  try {
    const walk = await Walk.findByIdAndUpdate(req.params.walkId, { status: 'completed' }, { new: true }).populate('observations');
    if (!walk) return res.status(404).json({ error: 'Walk not found' });
    res.json({ walk, message: 'Walk completed' });
  } catch (e) { res.status(500).json({ error: 'Failed to complete walk' }); }
});

// ===== REVIEW =====
app.post('/api/walks/review/:walkId', async (req, res) => {
  try {
    const { reviewNotes, reviewedBy } = req.body;
    const walk = await Walk.findByIdAndUpdate(req.params.walkId, { reviewDate: new Date(), reviewNotes, reviewedBy }, { new: true }).populate('observations');
    if (!walk) return res.status(404).json({ error: 'Walk not found' });
    res.json({ walk, message: 'Review added' });
  } catch (e) { res.status(500).json({ error: 'Failed to add review' }); }
});

// ===== EDIT WALK =====
app.put('/api/walks/:walkId', async (req, res) => {
  try {
    const { title, walker, frequency, description } = req.body;
    const walk = await Walk.findByIdAndUpdate(req.params.walkId, { title, walker, frequency, description }, { new: true }).populate('observations');
    if (!walk) return res.status(404).json({ error: 'Walk not found' });
    res.json({ walk, message: 'Walk updated' });
  } catch (e) { res.status(500).json({ error: 'Failed to update walk' }); }
});

// ===== DELETE WALK =====
app.delete('/api/walks/:walkId', async (req, res) => {
  try {
    const walk = await Walk.findById(req.params.walkId);
    if (!walk) return res.status(404).json({ error: 'Walk not found' });
    // Delete all observations belonging to this walk
    await Observation.deleteMany({ _id: { $in: walk.observations } });
    await Walk.findByIdAndDelete(req.params.walkId);
    res.json({ message: 'Walk and its observations deleted' });
  } catch (e) { res.status(500).json({ error: 'Failed to delete walk' }); }
});

// ===== EDIT OBSERVATION =====
app.put('/api/walks/observation/:obsId', async (req, res) => {
  try {
    const updates = req.body;
    const obs = await Observation.findByIdAndUpdate(req.params.obsId, updates, { new: true });
    if (!obs) return res.status(404).json({ error: 'Observation not found' });
    res.json({ observation: obs, message: 'Observation updated' });
  } catch (e) { res.status(500).json({ error: 'Failed to update observation' }); }
});

// ===== DELETE OBSERVATION =====
app.delete('/api/walks/observation/:obsId', async (req, res) => {
  try {
    const obs = await Observation.findById(req.params.obsId);
    if (!obs) return res.status(404).json({ error: 'Observation not found' });
    // Remove from walk's observations array
    if (obs.walk) {
      await Walk.findByIdAndUpdate(obs.walk, { $pull: { observations: obs._id } });
    }
    await Observation.findByIdAndDelete(req.params.obsId);
    res.json({ message: 'Observation deleted' });
  } catch (e) { res.status(500).json({ error: 'Failed to delete observation' }); }
});

// ===== WALK REPORT =====
app.get('/api/walks/walk-reports/:walkId', async (req, res) => {
  try {
    const walk = await Walk.findById(req.params.walkId).populate('observations');
    if (!walk) return res.status(404).json({ error: 'Walk not found' });
    res.json({ walk, aiAnalysis: walk.aiAnalysis || 'No AI analysis yet', status: walk.status });
  } catch (e) { res.status(500).json({ error: 'Failed to retrieve walk reports' }); }
});

// ===== STATS =====
app.get('/api/walks/stats', async (req, res) => {
  try {
    const allWalks = await Walk.find().populate('observations');
    const allObs = allWalks.flatMap(w => w.observations);
    const byCategory = {}, byArea = {}, byType = { positive: 0, negative: 0 };
    allObs.forEach(o => {
      byCategory[o.category] = (byCategory[o.category] || 0) + 1;
      if (o.observationArea) byArea[o.observationArea] = (byArea[o.observationArea] || 0) + 1;
      if (o.observationType) byType[o.observationType] = (byType[o.observationType] || 0) + 1;
    });
    res.json({ totalWalks: allWalks.length, totalObservations: allObs.length, byCategory, byArea, byType, completedWalks: allWalks.filter(w => w.status === 'completed').length, reviewedWalks: allWalks.filter(w => w.reviewDate).length });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch stats' }); }
});

// ===== EMPLOYEE SUGGESTION =====
app.post('/api/walks/employee-suggestion', async (req, res) => {
  try {
    const { title, description, observationArea, location, submittedBy } = req.body;
    if (!title || !submittedBy) return res.status(400).json({ error: 'Title and name required' });
    const obs = new Observation({ title, description: description || '', category: 'Other', observationArea: observationArea || 'Others', location: location || '', submittedBy, submittedByRole: 'operator', kaizenPoints: 10 });
    await obs.save();
    res.json({ observation: obs, kaizenPoints: 10, message: 'Suggestion recorded! You earned 10 Kaizen points!' });
  } catch (e) { res.status(500).json({ error: 'Failed to submit suggestion' }); }
});

// ===== LEADERBOARD =====
app.get('/api/walks/leaderboard', async (req, res) => {
  try {
    const observations = await Observation.find().lean();
    const points = {};
    observations.forEach(o => {
      if (o.personMet) { if (!points[o.personMet]) points[o.personMet] = { name: o.personMet, totalPoints: 0, contributions: 0 }; points[o.personMet].totalPoints += (o.kaizenPoints || 5); points[o.personMet].contributions++; }
      if (o.submittedBy) { if (!points[o.submittedBy]) points[o.submittedBy] = { name: o.submittedBy, totalPoints: 0, contributions: 0 }; points[o.submittedBy].totalPoints += (o.kaizenPoints || 10); points[o.submittedBy].contributions++; }
    });
    res.json({ leaderboard: Object.values(points).sort((a, b) => b.totalPoints - a.totalPoints) });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch leaderboard' }); }
});

// ===== ACTION STATUS =====
app.post('/api/walks/action/:obsId', async (req, res) => {
  try {
    const { actionStatus, actionNotes, actionDueDate } = req.body;
    const update = {};
    if (actionStatus) update.actionStatus = actionStatus;
    if (actionNotes !== undefined) update.actionNotes = actionNotes;
    if (actionDueDate) update.actionDueDate = actionDueDate;
    const obs = await Observation.findByIdAndUpdate(req.params.obsId, update, { new: true });
    if (!obs) return res.status(404).json({ error: 'Not found' });
    res.json({ observation: obs, message: 'Action updated' });
  } catch (e) { res.status(500).json({ error: 'Failed to update action' }); }
});

// ===== ACTIONS LIST =====
app.get('/api/walks/actions', async (req, res) => {
  try {
    const observations = await Observation.find({ personTagged: { $ne: '' } }).lean();
    const open = observations.filter(o => !o.actionStatus || o.actionStatus === 'open');
    const inProgress = observations.filter(o => o.actionStatus === 'in-progress');
    const closed = observations.filter(o => o.actionStatus === 'closed');
    res.json({ actions: observations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)), summary: { open: open.length, inProgress: inProgress.length, closed: closed.length, total: observations.length } });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch actions' }); }
});

// ===== SEARCH =====
app.get('/api/walks/search', async (req, res) => {
  try {
    const { q, area, category, type, location } = req.query;
    let filter = {};
    if (area) filter.observationArea = area;
    if (category) filter.category = category;
    if (type) filter.observationType = type;
    let results = await Observation.find(filter).lean();
    if (q) {
      const query = q.toLowerCase();
      results = results.filter(o => (o.title && o.title.toLowerCase().includes(query)) || (o.description && o.description.toLowerCase().includes(query)) || (o.location && o.location.toLowerCase().includes(query)) || (o.personMet && o.personMet.toLowerCase().includes(query)) || (o.personTagged && o.personTagged.toLowerCase().includes(query)));
    }
    if (location) { const loc = location.toLowerCase(); results = results.filter(o => o.location && o.location.toLowerCase().includes(loc)); }
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const patterns = {};
    results.forEach(o => { const key = `${o.observationArea}|${o.location || 'unknown'}`; if (!patterns[key]) patterns[key] = { area: o.observationArea, location: o.location || 'Unknown', count: 0, observations: [] }; patterns[key].count++; patterns[key].observations.push({ title: o.title, date: o.timestamp, category: o.category }); });
    res.json({ results, total: results.length, repeatedIssues: Object.values(patterns).filter(p => p.count > 1).sort((a, b) => b.count - a.count) });
  } catch (e) { res.status(500).json({ error: 'Failed to search' }); }
});

// ===== CSV EXPORT =====
app.get('/api/walks/export/csv', async (req, res) => {
  try {
    const obs = await Observation.find().lean();
    const headers = ['Date', 'Title', 'Description', 'Category', 'Area', 'Type', 'Location', 'Person Met', 'Action By', 'Status', 'Notes'];
    const rows = obs.map(o => [new Date(o.timestamp).toLocaleDateString(), `"${(o.title || '').replace(/"/g, '""')}"`, `"${(o.description || '').replace(/"/g, '""')}"`, o.category || '', o.observationArea || '', o.observationType || '', `"${(o.location || '').replace(/"/g, '""')}"`, `"${(o.personMet || '').replace(/"/g, '""')}"`, `"${(o.personTagged || '').replace(/"/g, '""')}"`, o.actionStatus || 'open', `"${(o.actionNotes || '').replace(/"/g, '""')}"`]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=gembarounds.csv');
    res.send([headers.join(','), ...rows.map(r => r.join(','))].join('\n'));
  } catch (e) { res.status(500).json({ error: 'Failed to export' }); }
});

// ===== NOTIFICATIONS =====
app.get('/api/walks/notifications', async (req, res) => {
  try {
    const allObs = await Observation.find().lean();
    const allWalks = await Walk.find().lean();
    const notifications = [];
    const now = new Date();
    allObs.filter(o => o.personTagged && (!o.actionStatus || o.actionStatus === 'open')).forEach(o => {
      const days = Math.floor((now - new Date(o.timestamp)) / 86400000);
      if (days >= 7) notifications.push({ type: 'overdue_action', severity: days >= 14 ? 'critical' : 'warning', message: `"${o.title}" assigned to ${o.personTagged} is ${days} days old`, observationId: o._id, daysOverdue: days });
    });
    allWalks.filter(w => w.status === 'completed' && !w.reviewDate).forEach(w => {
      const days = Math.floor((now - new Date(w.updatedAt || w.createdAt)) / 86400000);
      if (days >= 7) notifications.push({ type: 'pending_review', severity: 'warning', message: `Walk "${w.title}" completed ${days} days ago, not reviewed`, walkId: w._id });
    });
    allWalks.filter(w => w.status === 'scheduled' && w.scheduledDate && new Date(w.scheduledDate) < now).forEach(w => {
      notifications.push({ type: 'overdue_walk', severity: 'warning', message: `Walk "${w.title}" was due ${new Date(w.scheduledDate).toLocaleDateString()}`, walkId: w._id });
    });
    const areas = {};
    allObs.filter(o => o.observationType === 'negative').forEach(o => { areas[o.observationArea || 'Others'] = (areas[o.observationArea || 'Others'] || 0) + 1; });
    Object.entries(areas).filter(([_, c]) => c >= 5).forEach(([a, c]) => { notifications.push({ type: 'hotspot', severity: 'info', message: `${a} has ${c} improvement observations` }); });
    notifications.sort((a, b) => ({ critical: 0, warning: 1, info: 2 }[a.severity] || 3) - ({ critical: 0, warning: 1, info: 2 }[b.severity] || 3));
    res.json({ notifications, count: notifications.length });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch notifications' }); }
});

// ===== SUMMARY REPORT =====
app.get('/api/walks/summary/:walkId', async (req, res) => {
  try {
    const walk = await Walk.findById(req.params.walkId).populate('observations');
    if (!walk) return res.status(404).json({ error: 'Walk not found' });
    const obs = walk.observations;
    const positive = obs.filter(o => o.observationType === 'positive');
    const negative = obs.filter(o => o.observationType === 'negative');
    const byArea = {}, byCategory = {};
    obs.forEach(o => { byArea[o.observationArea || 'Others'] = (byArea[o.observationArea || 'Others'] || 0) + 1; byCategory[o.category] = (byCategory[o.category] || 0) + 1; });
    const actionItems = obs.filter(o => o.personTagged);

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Summary - ${walk.title}</title>
<style>body{font-family:'Segoe UI',sans-serif;padding:2rem;max-width:900px;margin:0 auto;color:#333}h1{color:#1e3c72;border-bottom:3px solid #1e3c72;padding-bottom:0.5rem}h2{color:#2a5298;margin-top:2rem}.meta{background:#f0f2f5;padding:1rem;border-radius:8px;margin-bottom:1.5rem}.meta p{margin:0.3rem 0}.stats{display:flex;gap:1rem;margin:1rem 0}.stat{background:#fff;border:1px solid #ddd;padding:1rem;border-radius:8px;text-align:center;flex:1}.stat-num{font-size:2rem;font-weight:bold}.stat-label{font-size:0.85rem;color:#666}table{width:100%;border-collapse:collapse;margin:1rem 0}th,td{border:1px solid #ddd;padding:0.5rem 0.8rem;text-align:left;font-size:0.9rem}th{background:#1e3c72;color:white}tr:nth-child(even){background:#f8f9fa}.positive{color:#27ae60;font-weight:600}.negative{color:#e74c3c;font-weight:600}.footer{margin-top:2rem;padding-top:1rem;border-top:1px solid #ddd;font-size:0.8rem;color:#888}@media print{body{padding:0}.no-print{display:none}}</style></head><body>
<button class="no-print" onclick="window.print()" style="float:right;padding:0.5rem 1rem;background:#1e3c72;color:white;border:none;border-radius:4px;cursor:pointer">Print/PDF</button>
<h1>GembaRounds Walk Summary</h1>
<div class="meta"><p><strong>Title:</strong> ${walk.title}</p><p><strong>Walker:</strong> ${walk.walker || 'N/A'}</p><p><strong>Date:</strong> ${new Date(walk.createdAt).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p><p><strong>Frequency:</strong> ${walk.frequency || 'Ad-hoc'}</p><p><strong>Status:</strong> ${walk.status}</p>${walk.reviewDate ? `<p><strong>Reviewed:</strong> ${new Date(walk.reviewDate).toLocaleDateString()} by ${walk.reviewedBy || '-'}</p>` : ''}</div>
<div class="stats"><div class="stat"><div class="stat-num">${obs.length}</div><div class="stat-label">Total</div></div><div class="stat"><div class="stat-num positive">${positive.length}</div><div class="stat-label">Good</div></div><div class="stat"><div class="stat-num negative">${negative.length}</div><div class="stat-label">Improve</div></div><div class="stat"><div class="stat-num">${actionItems.length}</div><div class="stat-label">Actions</div></div></div>
<h2>By Area</h2><ul>${Object.entries(byArea).sort((a,b)=>b[1]-a[1]).map(([a,c])=>`<li><strong>${a}:</strong> ${c}</li>`).join('')}</ul>
${positive.length ? `<h2>Good Things</h2><table><tr><th>#</th><th>Title</th><th>Area</th><th>Location</th><th>Person</th><th>Description</th></tr>${positive.map((o,i)=>`<tr><td>${i+1}</td><td>${o.title}</td><td>${o.observationArea||'-'}</td><td>${o.location||'-'}</td><td>${o.personMet||'-'}</td><td>${o.description}</td></tr>`).join('')}</table>` : ''}
${negative.length ? `<h2>Improvements</h2><table><tr><th>#</th><th>Title</th><th>Area</th><th>Category</th><th>Location</th><th>Action By</th><th>Description</th></tr>${negative.map((o,i)=>`<tr><td>${i+1}</td><td>${o.title}</td><td>${o.observationArea||'-'}</td><td>${o.category}</td><td>${o.location||'-'}</td><td>${o.personTagged||'-'}</td><td>${o.description}</td></tr>`).join('')}</table>` : ''}
${actionItems.length ? `<h2>Action Items</h2><table><tr><th>#</th><th>Observation</th><th>Area</th><th>Assigned To</th><th>Location</th></tr>${actionItems.map((o,i)=>`<tr><td>${i+1}</td><td>${o.title}</td><td>${o.observationArea||'-'}</td><td><strong>${o.personTagged}</strong></td><td>${o.location||'-'}</td></tr>`).join('')}</table>` : ''}
${walk.reviewNotes ? `<h2>Review Notes</h2><div class="meta"><p><strong>By:</strong> ${walk.reviewedBy||'-'}</p><p>${walk.reviewNotes}</p></div>` : ''}
<div class="footer"><p>Generated by GembaRounds on ${new Date().toLocaleString('en-IN')}</p><p>PSS Methodology - Connect, Appreciate, Check Standards, Improve</p></div></body></html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (e) { res.status(500).json({ error: 'Failed to generate summary' }); }
});

// ===== BACKUP (export all data as JSON) =====
app.get('/api/walks/backup', async (req, res) => {
  try {
    const walks = await Walk.find().lean();
    const observations = await Observation.find().lean();
    const users = await User.find().select('-password').lean();
    res.json({ exportDate: new Date().toISOString(), walks, observations, users });
  } catch (e) { res.status(500).json({ error: 'Failed to export backup' }); }
});

// ===== RESTORE (import data from JSON backup) =====
app.post('/api/walks/restore', async (req, res) => {
  try {
    const { walks, observations } = req.body;
    if (!walks && !observations) return res.status(400).json({ error: 'No data provided. Send { walks: [...], observations: [...] }' });
    let walksInserted = 0, observationsInserted = 0, skipped = 0;
    if (walks && Array.isArray(walks)) {
      for (const w of walks) {
        try {
          const existing = w._id ? await Walk.findById(w._id) : null;
          if (!existing) { await Walk.create(w); walksInserted++; } else { skipped++; }
        } catch { skipped++; }
      }
    }
    if (observations && Array.isArray(observations)) {
      for (const o of observations) {
        try {
          const existing = o._id ? await Observation.findById(o._id) : null;
          if (!existing) { await Observation.create(o); observationsInserted++; } else { skipped++; }
        } catch { skipped++; }
      }
    }
    res.json({ message: 'Restore complete', walksInserted, observationsInserted, skipped });
  } catch (e) { res.status(500).json({ error: 'Failed to restore backup' }); }
});

// ===== CROSS-WALK TREND ANALYSIS (week-over-week) =====
app.get('/api/walks/trends', async (req, res) => {
  try {
    const weeks = parseInt(req.query.weeks) || 8;
    const allObs = await Observation.find().lean();
    const allWalks = await Walk.find().lean();
    const now = new Date();
    const weekData = [];

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - (i + 1) * 7);
      const weekEnd = new Date(now); weekEnd.setDate(now.getDate() - i * 7);
      const label = weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

      const weekObs = allObs.filter(o => { const d = new Date(o.timestamp); return d >= weekStart && d < weekEnd; });
      const weekWalks = allWalks.filter(w => { const d = new Date(w.createdAt); return d >= weekStart && d < weekEnd; });

      const positive = weekObs.filter(o => o.observationType === 'positive').length;
      const negative = weekObs.filter(o => o.observationType === 'negative').length;
      const actionsOpen = weekObs.filter(o => o.personTagged && (!o.actionStatus || o.actionStatus === 'open')).length;
      const actionsClosed = weekObs.filter(o => o.personTagged && o.actionStatus === 'closed').length;

      const byArea = {};
      weekObs.forEach(o => { byArea[o.observationArea || 'Others'] = (byArea[o.observationArea || 'Others'] || 0) + 1; });

      weekData.push({ label, weekStart: weekStart.toISOString(), weekEnd: weekEnd.toISOString(), walks: weekWalks.length, observations: weekObs.length, positive, negative, actionsOpen, actionsClosed, byArea });
    }

    // Calculate improvement rate (positive ratio trend)
    const improvementTrend = weekData.map(w => {
      const total = w.positive + w.negative;
      return { label: w.label, positiveRate: total > 0 ? Math.round((w.positive / total) * 100) : 0, total };
    });

    // Top recurring areas across all weeks
    const areaTotal = {};
    allObs.forEach(o => { areaTotal[o.observationArea || 'Others'] = (areaTotal[o.observationArea || 'Others'] || 0) + 1; });
    const topAreas = Object.entries(areaTotal).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([area, count]) => ({ area, count }));

    res.json({ weeks: weekData, improvementTrend, topAreas, totalWeeks: weeks });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch trends' }); }
});

// ===== BULK CSV IMPORT =====
app.post('/api/walks/import', async (req, res) => {
  try {
    const { csvData } = req.body;
    if (!csvData) return res.status(400).json({ error: 'No CSV data provided' });

    const lines = csvData.split('\n').filter(l => l.trim());
    if (lines.length < 2) return res.status(400).json({ error: 'CSV must have header + at least 1 row' });

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const results = { imported: 0, errors: [] };

    // Create a walk for the import
    const walk = await Walk.create({ title: `CSV Import ${new Date().toLocaleDateString()}`, walker: 'CSV Import', status: 'completed' });

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim().replace(/^['"]|['"]$/g, ''));
        const row = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

        const obs = await Observation.create({
          walk: walk._id,
          title: row.title || row.observation || `Observation ${i}`,
          description: row.description || row.details || row.notes || '',
          category: row.category || 'Other',
          observationArea: row.area || row['observation area'] || row.observationarea || 'Others',
          observationType: (row.type || row.observationtype || '').toLowerCase().includes('pos') ? 'positive' : 'negative',
          location: row.location || '',
          personMet: row['person met'] || row.personmet || '',
          personTagged: row['person tagged'] || row.persontagged || row.action || '',
          submittedBy: row['submitted by'] || row.submittedby || row.walker || 'CSV Import',
        });
        walk.observations.push(obs._id);
        results.imported++;
      } catch (e) {
        results.errors.push(`Row ${i + 1}: ${e.message}`);
      }
    }

    await walk.save();
    res.json({ message: `Imported ${results.imported} observations`, walkId: walk._id, ...results });
  } catch (e) { res.status(500).json({ error: 'Import failed: ' + e.message }); }
});

// ===== AUDIT TRAIL =====
app.get('/api/walks/audit', async (req, res) => {
  try {
    const walks = await Walk.find().sort({ updatedAt: -1 }).limit(50).lean();
    const observations = await Observation.find().sort({ updatedAt: -1 }).limit(100).lean();

    const trail = [];
    walks.forEach(w => {
      trail.push({ type: 'walk', action: w.status === 'completed' ? 'completed' : 'created', title: w.title, by: w.walker, at: w.updatedAt || w.createdAt });
      if (w.reviewDate) trail.push({ type: 'review', action: 'reviewed', title: w.title, by: w.reviewedBy, at: w.reviewDate });
    });
    observations.forEach(o => {
      trail.push({ type: 'observation', action: o.actionStatus !== 'open' ? 'status_changed' : 'created', title: o.title, by: o.submittedBy || o.personMet, at: o.updatedAt || o.timestamp, status: o.actionStatus });
    });

    trail.sort((a, b) => new Date(b.at) - new Date(a.at));
    res.json({ trail: trail.slice(0, 100) });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch audit trail' }); }
});

module.exports = app;
