const express = require('express');
const router = express.Router();

// Try to load Mongoose models (may fail if MongoDB not connected)
let Walk, Observation;
try {
  Walk = require('../models/Walk');
  Observation = require('../models/Observation');
} catch (e) {
  console.warn('Models not loaded:', e.message);
}

// ============ IN-MEMORY FALLBACK STORE ============
const memStore = {
  walks: [],
  observations: [],
  nextId: 1,
  genId() { return 'mem_' + (this.nextId++); }
};

function useMemory(req) {
  return !req.dbConnected;
}

// ============ RECURRING SCHEDULER ============
const scheduler = require('../scheduler');

router.post('/recurring', (req, res) => {
  const { title, walker, frequency, description } = req.body;
  if (!frequency || frequency === 'adhoc') {
    return res.status(400).json({ error: 'Frequency must be daily, weekly, bimonthly, or monthly' });
  }
  const result = scheduler.addRecurring({ title, walker, frequency, description });
  if (!result) return res.status(400).json({ error: 'Invalid frequency' });
  res.json({ recurring: result, message: 'Recurring walk scheduled' });
});

router.get('/recurring', (req, res) => {
  res.json({ recurring: scheduler.listRecurring() });
});

router.delete('/recurring/:id', (req, res) => {
  const removed = scheduler.removeRecurring(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Recurring schedule not found' });
  res.json({ message: 'Recurring schedule removed' });
});

// ============ LIST ALL WALKS ============
router.get('/all', async (req, res) => {
  try {
    if (useMemory(req)) {
      const walks = memStore.walks.map(w => ({
        ...w,
        observations: memStore.observations.filter(o => o.walk === w._id)
      }));
      return res.json({ walks: walks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
    }
    const walks = await Walk.find().populate('observations').sort({ createdAt: -1 });
    res.json({ walks });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch walks' });
  }
});

// ============ START NEW WALK ============
router.post('/start-walk', async (req, res) => {
  try {
    if (useMemory(req)) {
      const walk = {
        _id: memStore.genId(),
        title: req.body.title || 'Gemba Walk',
        description: req.body.description || '',
        walker: req.body.walker || '',
        frequency: req.body.frequency || 'adhoc',
        scheduledDate: req.body.scheduledDate || null,
        status: 'in-progress',
        observations: [],
        reviewDate: null,
        reviewNotes: '',
        reviewedBy: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      memStore.walks.push(walk);
      return res.json({ walkId: walk._id, message: 'New Gemba walk initiated' });
    }
    const walk = new Walk({
      title: req.body.title || 'Gemba Walk',
      description: req.body.description || '',
      walker: req.body.walker || '',
      frequency: req.body.frequency || 'adhoc',
      scheduledDate: req.body.scheduledDate || null,
      status: 'in-progress'
    });
    await walk.save();
    res.json({ walkId: walk._id, message: 'New Gemba walk initiated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start walk' });
  }
});

// ============ SCHEDULE A FUTURE WALK ============
router.post('/schedule', async (req, res) => {
  try {
    if (useMemory(req)) {
      const walk = {
        _id: memStore.genId(),
        title: req.body.title || 'Scheduled Gemba Walk',
        description: req.body.description || '',
        walker: req.body.walker || '',
        frequency: req.body.frequency || 'weekly',
        scheduledDate: req.body.scheduledDate,
        status: 'scheduled',
        observations: [],
        reviewDate: null,
        reviewNotes: '',
        reviewedBy: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      memStore.walks.push(walk);
      return res.json({ walkId: walk._id, message: 'Walk scheduled successfully' });
    }
    const walk = new Walk({
      title: req.body.title || 'Scheduled Gemba Walk',
      description: req.body.description || '',
      walker: req.body.walker || '',
      frequency: req.body.frequency || 'weekly',
      scheduledDate: req.body.scheduledDate,
      status: 'scheduled'
    });
    await walk.save();
    res.json({ walkId: walk._id, message: 'Walk scheduled successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to schedule walk' });
  }
});

// ============ SUBMIT OBSERVATION ============
router.post('/submit-observation', async (req, res) => {
  try {
    const {
      walkId, title, description, category,
      observationArea, observationType,
      location, personTagged, personMet, attachments, metadata
    } = req.body;

    if (useMemory(req)) {
      const walk = memStore.walks.find(w => w._id === walkId);
      if (!walk) return res.status(404).json({ error: 'Walk not found' });

      const observation = {
        _id: memStore.genId(),
        walk: walkId,
        title,
        description,
        category,
        observationArea: observationArea || 'Others',
        observationType: observationType || 'negative',
        location: location || '',
        personTagged: personTagged || '',
        personMet: personMet || '',
        attachments: attachments || [],
        aiCategorized: false,
        timestamp: new Date().toISOString(),
        metadata
      };
      memStore.observations.push(observation);
      walk.observations.push(observation._id);
      return res.json({ message: 'Observation recorded successfully', observation });
    }

    const walk = await Walk.findById(walkId);
    if (!walk) return res.status(404).json({ error: 'Walk not found' });

    const observation = new Observation({
      walk: walkId,
      title,
      description,
      category,
      observationArea: observationArea || 'Others',
      observationType: observationType || 'negative',
      location: location || '',
      personTagged: personTagged || '',
      personMet: personMet || '',
      attachments: attachments || [],
      metadata
    });

    await observation.save();
    walk.observations.push(observation._id);
    await walk.save();

    res.json({ message: 'Observation recorded successfully', observation });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit observation' });
  }
});

// ============ COMPLETE A WALK ============
router.post('/complete/:walkId', async (req, res) => {
  try {
    if (useMemory(req)) {
      const walk = memStore.walks.find(w => w._id === req.params.walkId);
      if (!walk) return res.status(404).json({ error: 'Walk not found' });
      walk.status = 'completed';
      walk.updatedAt = new Date().toISOString();
      walk.observations = memStore.observations.filter(o => o.walk === walk._id);
      return res.json({ walk, message: 'Walk completed' });
    }
    const walk = await Walk.findByIdAndUpdate(
      req.params.walkId,
      { status: 'completed' },
      { new: true }
    ).populate('observations');
    if (!walk) return res.status(404).json({ error: 'Walk not found' });
    res.json({ walk, message: 'Walk completed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete walk' });
  }
});

// ============ ADD REVIEW (PSS: weekly discussion) ============
router.post('/review/:walkId', async (req, res) => {
  try {
    const { reviewNotes, reviewedBy } = req.body;
    if (useMemory(req)) {
      const walk = memStore.walks.find(w => w._id === req.params.walkId);
      if (!walk) return res.status(404).json({ error: 'Walk not found' });
      walk.reviewDate = new Date().toISOString();
      walk.reviewNotes = reviewNotes;
      walk.reviewedBy = reviewedBy;
      walk.observations = memStore.observations.filter(o => o.walk === walk._id);
      return res.json({ walk, message: 'Review added successfully' });
    }
    const walk = await Walk.findByIdAndUpdate(
      req.params.walkId,
      { reviewDate: new Date(), reviewNotes, reviewedBy },
      { new: true }
    ).populate('observations');
    if (!walk) return res.status(404).json({ error: 'Walk not found' });
    res.json({ walk, message: 'Review added successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add review' });
  }
});

// ============ GET WALK REPORT ============
router.get('/walk-reports/:walkId', async (req, res) => {
  try {
    if (useMemory(req)) {
      const walk = memStore.walks.find(w => w._id === req.params.walkId);
      if (!walk) return res.status(404).json({ error: 'Walk not found' });
      const walkWithObs = {
        ...walk,
        observations: memStore.observations.filter(o => o.walk === walk._id)
      };
      return res.json({ walk: walkWithObs, aiAnalysis: 'No AI analysis yet', status: walk.status });
    }
    const walk = await Walk.findById(req.params.walkId).populate('observations');
    if (!walk) return res.status(404).json({ error: 'Walk not found' });
    res.json({ walk, aiAnalysis: walk.aiAnalysis || 'No AI analysis yet', status: walk.status });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve walk reports' });
  }
});

// ============ AGGREGATE STATS ============
router.get('/stats', async (req, res) => {
  try {
    let allWalks, allObservations;

    if (useMemory(req)) {
      allWalks = memStore.walks;
      allObservations = memStore.observations;
    } else {
      allWalks = await Walk.find().populate('observations');
      allObservations = allWalks.flatMap(w => w.observations);
    }

    const byCategory = {};
    const byArea = {};
    const byType = { positive: 0, negative: 0 };

    allObservations.forEach(obs => {
      byCategory[obs.category] = (byCategory[obs.category] || 0) + 1;
      if (obs.observationArea) {
        byArea[obs.observationArea] = (byArea[obs.observationArea] || 0) + 1;
      }
      if (obs.observationType) {
        byType[obs.observationType] = (byType[obs.observationType] || 0) + 1;
      }
    });

    res.json({
      totalWalks: allWalks.length,
      totalObservations: allObservations.length,
      byCategory,
      byArea,
      byType,
      completedWalks: allWalks.filter(w => w.status === 'completed').length,
      reviewedWalks: allWalks.filter(w => w.reviewDate).length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ============ EMPLOYEE / OPERATOR SUGGESTION ============
router.post('/employee-suggestion', async (req, res) => {
  try {
    const { title, description, observationArea, location, submittedBy } = req.body;
    if (!title || !submittedBy) {
      return res.status(400).json({ error: 'Title and your name are required' });
    }

    // Award Kaizen points: 10 for suggestion, 5 bonus for positive
    const kaizenPoints = 10;

    if (!req.dbConnected) {
      const observation = {
        _id: memStore.genId(),
        walk: null,
        title,
        description: description || '',
        category: 'Other',
        observationArea: observationArea || 'Others',
        observationType: 'negative',
        location: location || '',
        personTagged: '',
        personMet: '',
        submittedBy,
        submittedByRole: 'operator',
        kaizenPoints,
        attachments: [],
        actionStatus: 'open',
        aiCategorized: false,
        timestamp: new Date().toISOString()
      };
      memStore.observations.push(observation);
      return res.json({ observation, kaizenPoints, message: `Suggestion recorded! You earned ${kaizenPoints} Kaizen points!` });
    }

    const observation = new Observation({
      title,
      description: description || '',
      category: 'Other',
      observationArea: observationArea || 'Others',
      location: location || '',
      submittedBy,
      submittedByRole: 'operator',
      kaizenPoints
    });
    await observation.save();
    res.json({ observation, kaizenPoints, message: `Suggestion recorded! You earned ${kaizenPoints} Kaizen points!` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit suggestion' });
  }
});

// ============ KAIZEN LEADERBOARD ============
router.get('/leaderboard', async (req, res) => {
  try {
    let observations;
    if (!req.dbConnected) {
      observations = memStore.observations;
    } else {
      observations = await Observation.find().lean();
    }

    // Build leaderboard from all observations (by personMet and submittedBy)
    const points = {};
    observations.forEach(obs => {
      // Points for operators who were met during walks
      if (obs.personMet) {
        if (!points[obs.personMet]) points[obs.personMet] = { name: obs.personMet, totalPoints: 0, contributions: 0 };
        points[obs.personMet].totalPoints += (obs.kaizenPoints || 5);
        points[obs.personMet].contributions++;
      }
      // Points for employees who submitted suggestions
      if (obs.submittedBy) {
        if (!points[obs.submittedBy]) points[obs.submittedBy] = { name: obs.submittedBy, totalPoints: 0, contributions: 0 };
        points[obs.submittedBy].totalPoints += (obs.kaizenPoints || 10);
        points[obs.submittedBy].contributions++;
      }
    });

    const leaderboard = Object.values(points).sort((a, b) => b.totalPoints - a.totalPoints);
    res.json({ leaderboard });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// ============ UPDATE ACTION STATUS ============
router.post('/action/:obsId', async (req, res) => {
  try {
    const { actionStatus, actionNotes, actionDueDate } = req.body;

    if (!req.dbConnected) {
      const obs = memStore.observations.find(o => o._id === req.params.obsId);
      if (!obs) return res.status(404).json({ error: 'Observation not found' });
      if (actionStatus) obs.actionStatus = actionStatus;
      if (actionNotes !== undefined) obs.actionNotes = actionNotes;
      if (actionDueDate) obs.actionDueDate = actionDueDate;
      return res.json({ observation: obs, message: 'Action updated' });
    }

    const update = {};
    if (actionStatus) update.actionStatus = actionStatus;
    if (actionNotes !== undefined) update.actionNotes = actionNotes;
    if (actionDueDate) update.actionDueDate = actionDueDate;

    const obs = await Observation.findByIdAndUpdate(req.params.obsId, update, { new: true });
    if (!obs) return res.status(404).json({ error: 'Observation not found' });
    res.json({ observation: obs, message: 'Action updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update action' });
  }
});

// ============ GET ALL ACTION ITEMS ============
router.get('/actions', async (req, res) => {
  try {
    let observations;
    if (!req.dbConnected) {
      observations = memStore.observations.filter(o => o.personTagged);
    } else {
      observations = await Observation.find({ personTagged: { $ne: '' } }).lean();
    }

    const open = observations.filter(o => !o.actionStatus || o.actionStatus === 'open');
    const inProgress = observations.filter(o => o.actionStatus === 'in-progress');
    const closed = observations.filter(o => o.actionStatus === 'closed');

    res.json({
      actions: observations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
      summary: { open: open.length, inProgress: inProgress.length, closed: closed.length, total: observations.length }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch actions' });
  }
});

// ============ SEARCH OBSERVATIONS (past history for repeated issues) ============
router.get('/search', async (req, res) => {
  try {
    const { q, area, category, type, location } = req.query;
    let allObservations;

    if (!req.dbConnected) {
      allObservations = memStore.observations;
    } else {
      allObservations = await Observation.find().lean();
    }

    let results = allObservations;

    if (q) {
      const query = q.toLowerCase();
      results = results.filter(o =>
        (o.title && o.title.toLowerCase().includes(query)) ||
        (o.description && o.description.toLowerCase().includes(query)) ||
        (o.location && o.location.toLowerCase().includes(query)) ||
        (o.personMet && o.personMet.toLowerCase().includes(query)) ||
        (o.personTagged && o.personTagged.toLowerCase().includes(query))
      );
    }
    if (area) results = results.filter(o => o.observationArea === area);
    if (category) results = results.filter(o => o.category === category);
    if (type) results = results.filter(o => o.observationType === type);
    if (location) {
      const loc = location.toLowerCase();
      results = results.filter(o => o.location && o.location.toLowerCase().includes(loc));
    }

    // Sort by newest first
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Find repeated patterns (same area + location appearing multiple times)
    const patterns = {};
    results.forEach(o => {
      const key = `${o.observationArea}|${o.location || 'unknown'}`;
      if (!patterns[key]) patterns[key] = { area: o.observationArea, location: o.location || 'Unknown', count: 0, observations: [] };
      patterns[key].count++;
      patterns[key].observations.push({ title: o.title, date: o.timestamp, category: o.category });
    });
    const repeatedIssues = Object.values(patterns).filter(p => p.count > 1).sort((a, b) => b.count - a.count);

    res.json({ results, total: results.length, repeatedIssues });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search observations' });
  }
});

// ============ CSV EXPORT ============
router.get('/export/csv', async (req, res) => {
  try {
    let allObservations;
    if (!req.dbConnected) {
      allObservations = memStore.observations;
    } else {
      allObservations = await Observation.find().lean();
    }

    const headers = ['Date', 'Title', 'Description', 'Category', 'Observation Area', 'Type', 'Location', 'Person Met', 'Action By', 'Action Status', 'Action Notes'];
    const rows = allObservations.map(o => [
      new Date(o.timestamp).toLocaleDateString(),
      `"${(o.title || '').replace(/"/g, '""')}"`,
      `"${(o.description || '').replace(/"/g, '""')}"`,
      o.category || '',
      o.observationArea || '',
      o.observationType || '',
      `"${(o.location || '').replace(/"/g, '""')}"`,
      `"${(o.personMet || '').replace(/"/g, '""')}"`,
      `"${(o.personTagged || '').replace(/"/g, '""')}"`,
      o.actionStatus || 'open',
      `"${(o.actionNotes || '').replace(/"/g, '""')}"`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=gembarounds-observations.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// ============ NOTIFICATIONS (overdue actions, reminders) ============
router.get('/notifications', async (req, res) => {
  try {
    let allObservations, allWalks;
    if (!req.dbConnected) {
      allObservations = memStore.observations;
      allWalks = memStore.walks;
    } else {
      allObservations = await Observation.find().lean();
      allWalks = await Walk.find().lean();
    }

    const notifications = [];
    const now = new Date();

    // Overdue actions (open for more than 7 days)
    allObservations.filter(o => o.personTagged && (!o.actionStatus || o.actionStatus === 'open')).forEach(o => {
      const daysSince = Math.floor((now - new Date(o.timestamp)) / (1000 * 60 * 60 * 24));
      if (daysSince >= 7) {
        notifications.push({
          type: 'overdue_action',
          severity: daysSince >= 14 ? 'critical' : 'warning',
          message: `Action "${o.title}" assigned to ${o.personTagged} is ${daysSince} days old`,
          observationId: o._id,
          daysOverdue: daysSince
        });
      }
    });

    // Walks without review (completed more than 7 days ago)
    allWalks.filter(w => w.status === 'completed' && !w.reviewDate).forEach(w => {
      const daysSince = Math.floor((now - new Date(w.updatedAt || w.createdAt)) / (1000 * 60 * 60 * 24));
      if (daysSince >= 7) {
        notifications.push({
          type: 'pending_review',
          severity: 'warning',
          message: `Walk "${w.title}" completed ${daysSince} days ago but not yet reviewed`,
          walkId: w._id
        });
      }
    });

    // Scheduled walks that are overdue
    allWalks.filter(w => w.status === 'scheduled' && w.scheduledDate).forEach(w => {
      if (new Date(w.scheduledDate) < now) {
        notifications.push({
          type: 'overdue_walk',
          severity: 'warning',
          message: `Scheduled walk "${w.title}" was due on ${new Date(w.scheduledDate).toLocaleDateString()} but hasn't started`,
          walkId: w._id
        });
      }
    });

    // High action count areas
    const areaCounts = {};
    allObservations.filter(o => o.observationType === 'negative').forEach(o => {
      const area = o.observationArea || 'Others';
      areaCounts[area] = (areaCounts[area] || 0) + 1;
    });
    Object.entries(areaCounts).filter(([_, count]) => count >= 5).forEach(([area, count]) => {
      notifications.push({
        type: 'hotspot',
        severity: 'info',
        message: `${area} has ${count} improvement observations - consider focused attention`
      });
    });

    notifications.sort((a, b) => {
      const sev = { critical: 0, warning: 1, info: 2 };
      return (sev[a.severity] || 3) - (sev[b.severity] || 3);
    });

    res.json({ notifications, count: notifications.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// ============ WALK SUMMARY REPORT (HTML for print/PDF) ============
router.get('/summary/:walkId', async (req, res) => {
  try {
    let walk, walkObservations;

    if (!req.dbConnected) {
      walk = memStore.walks.find(w => w._id === req.params.walkId);
      if (!walk) return res.status(404).json({ error: 'Walk not found' });
      walkObservations = memStore.observations.filter(o => o.walk === walk._id);
    } else {
      walk = await Walk.findById(req.params.walkId).populate('observations');
      if (!walk) return res.status(404).json({ error: 'Walk not found' });
      walkObservations = walk.observations;
    }

    const positive = walkObservations.filter(o => o.observationType === 'positive');
    const negative = walkObservations.filter(o => o.observationType === 'negative');

    // Count by area
    const byArea = {};
    walkObservations.forEach(o => {
      const area = o.observationArea || 'Others';
      byArea[area] = (byArea[area] || 0) + 1;
    });

    // Count by category
    const byCategory = {};
    walkObservations.forEach(o => {
      byCategory[o.category] = (byCategory[o.category] || 0) + 1;
    });

    // Action items (observations with personTagged)
    const actionItems = walkObservations.filter(o => o.personTagged);

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>GembaRounds Summary - ${walk.title}</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; padding: 2rem; max-width: 900px; margin: 0 auto; color: #333; }
  h1 { color: #1e3c72; border-bottom: 3px solid #1e3c72; padding-bottom: 0.5rem; }
  h2 { color: #2a5298; margin-top: 2rem; }
  .meta { background: #f0f2f5; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; }
  .meta p { margin: 0.3rem 0; }
  .stats { display: flex; gap: 1rem; margin: 1rem 0; }
  .stat { background: #fff; border: 1px solid #ddd; padding: 1rem; border-radius: 8px; text-align: center; flex: 1; }
  .stat-num { font-size: 2rem; font-weight: bold; }
  .stat-label { font-size: 0.85rem; color: #666; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  th, td { border: 1px solid #ddd; padding: 0.5rem 0.8rem; text-align: left; font-size: 0.9rem; }
  th { background: #1e3c72; color: white; }
  tr:nth-child(even) { background: #f8f9fa; }
  .positive { color: #27ae60; font-weight: 600; }
  .negative { color: #e74c3c; font-weight: 600; }
  .footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ddd; font-size: 0.8rem; color: #888; }
  .area-list { columns: 2; margin: 0.5rem 0; }
  .area-list li { margin-bottom: 0.3rem; }
  @media print { body { padding: 0; } .no-print { display: none; } }
</style></head><body>
<button class="no-print" onclick="window.print()" style="float:right;padding:0.5rem 1rem;background:#1e3c72;color:white;border:none;border-radius:4px;cursor:pointer;">Print / Save PDF</button>
<h1>GembaRounds Walk Summary</h1>
<div class="meta">
  <p><strong>Title:</strong> ${walk.title}</p>
  <p><strong>Walker:</strong> ${walk.walker || 'Not specified'}</p>
  <p><strong>Date:</strong> ${new Date(walk.createdAt).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  <p><strong>Frequency:</strong> ${walk.frequency || 'Ad-hoc'}</p>
  <p><strong>Status:</strong> ${walk.status}</p>
  ${walk.reviewDate ? `<p><strong>Reviewed:</strong> ${new Date(walk.reviewDate).toLocaleDateString()} by ${walk.reviewedBy || '-'}</p>` : ''}
</div>

<div class="stats">
  <div class="stat"><div class="stat-num">${walkObservations.length}</div><div class="stat-label">Total Observations</div></div>
  <div class="stat"><div class="stat-num positive">${positive.length}</div><div class="stat-label">Good Things</div></div>
  <div class="stat"><div class="stat-num negative">${negative.length}</div><div class="stat-label">Improvements</div></div>
  <div class="stat"><div class="stat-num">${actionItems.length}</div><div class="stat-label">Action Items</div></div>
</div>

<h2>Observations by Area</h2>
<ul class="area-list">
${Object.entries(byArea).sort((a,b) => b[1]-a[1]).map(([area, count]) => `<li><strong>${area}:</strong> ${count}</li>`).join('\n')}
</ul>

<h2>Observations by Category</h2>
<ul class="area-list">
${Object.entries(byCategory).sort((a,b) => b[1]-a[1]).map(([cat, count]) => `<li><strong>${cat}:</strong> ${count}</li>`).join('\n')}
</ul>

${positive.length > 0 ? `
<h2>Good Things Observed (Appreciate)</h2>
<table>
<tr><th>#</th><th>Title</th><th>Area</th><th>Location</th><th>Person Met</th><th>Description</th><th>Photos</th></tr>
${positive.map((o, i) => `<tr><td>${i+1}</td><td>${o.title}</td><td>${o.observationArea || '-'}</td><td>${o.location || '-'}</td><td>${o.personMet || '-'}</td><td>${o.description}</td><td>${(o.attachments || []).map(a => a.fileType === 'image' ? `<img src="${a.url}" style="width:80px;height:60px;object-fit:cover;border-radius:4px;margin:2px;" />` : `<span style="font-size:0.8rem;">[Video: ${a.originalName || 'clip'}]</span>`).join('') || '-'}</td></tr>`).join('\n')}
</table>` : ''}

${negative.length > 0 ? `
<h2>Improvements Needed</h2>
<table>
<tr><th>#</th><th>Title</th><th>Area</th><th>Category</th><th>Location</th><th>Person Met</th><th>Action By</th><th>Description</th><th>Photos</th></tr>
${negative.map((o, i) => `<tr><td>${i+1}</td><td>${o.title}</td><td>${o.observationArea || '-'}</td><td>${o.category}</td><td>${o.location || '-'}</td><td>${o.personMet || '-'}</td><td>${o.personTagged || '-'}</td><td>${o.description}</td><td>${(o.attachments || []).map(a => a.fileType === 'image' ? `<img src="${a.url}" style="width:80px;height:60px;object-fit:cover;border-radius:4px;margin:2px;" />` : `<span style="font-size:0.8rem;">[Video: ${a.originalName || 'clip'}]</span>`).join('') || '-'}</td></tr>`).join('\n')}
</table>` : ''}

${actionItems.length > 0 ? `
<h2>Action Items</h2>
<table>
<tr><th>#</th><th>Observation</th><th>Area</th><th>Assigned To</th><th>Location</th></tr>
${actionItems.map((o, i) => `<tr><td>${i+1}</td><td>${o.title}</td><td>${o.observationArea || '-'}</td><td><strong>${o.personTagged}</strong></td><td>${o.location || '-'}</td></tr>`).join('\n')}
</table>` : ''}

${walk.reviewNotes ? `
<h2>Review Notes</h2>
<div class="meta">
  <p><strong>Reviewed by:</strong> ${walk.reviewedBy || '-'}</p>
  <p><strong>Date:</strong> ${walk.reviewDate ? new Date(walk.reviewDate).toLocaleDateString() : '-'}</p>
  <p>${walk.reviewNotes}</p>
</div>` : ''}

<div class="footer">
  <p>Generated by GembaRounds on ${new Date().toLocaleString('en-IN')}</p>
  <p>PSS Methodology - Gemba Walk: Connect, Appreciate, Check Standards, Improve</p>
</div>
</body></html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// ============ BACKUP (export all data as JSON) ============
router.get('/backup', async (req, res) => {
  try {
    let walks, observations;
    if (!req.dbConnected) {
      walks = memStore.walks;
      observations = memStore.observations;
    } else {
      walks = await Walk.find().lean();
      observations = await Observation.find().lean();
    }
    res.json({ exportDate: new Date().toISOString(), walks, observations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to export backup' });
  }
});

// ============ RESTORE (import data from JSON backup) ============
router.post('/restore', async (req, res) => {
  try {
    const { walks, observations } = req.body;
    if (!walks && !observations) return res.status(400).json({ error: 'No data provided. Send { walks: [...], observations: [...] }' });
    let walksInserted = 0, observationsInserted = 0, skipped = 0;

    if (!req.dbConnected) {
      // In-memory restore
      if (walks && Array.isArray(walks)) {
        walks.forEach(w => {
          if (!memStore.walks.find(existing => existing._id === w._id)) {
            memStore.walks.push(w);
            walksInserted++;
          } else { skipped++; }
        });
      }
      if (observations && Array.isArray(observations)) {
        observations.forEach(o => {
          if (!memStore.observations.find(existing => existing._id === o._id)) {
            memStore.observations.push(o);
            observationsInserted++;
          } else { skipped++; }
        });
      }
    } else {
      // MongoDB restore
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
    }
    res.json({ message: 'Restore complete', walksInserted, observationsInserted, skipped });
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore backup' });
  }
});

module.exports = router;
