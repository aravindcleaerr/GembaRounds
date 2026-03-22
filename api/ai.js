const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const areaKeywords = {
  'House Keeping (5S)': ['clean', 'dirty', 'clutter', 'organized', 'sort', 'shine', 'sweep', '5s', 'housekeep', 'tidy', 'mess', 'dust'],
  'Safety': ['safety', 'hazard', 'ppe', 'guard', 'fire', 'injury', 'accident', 'slip', 'fall', 'danger', 'protective', 'helmet', 'gloves'],
  'Discipline': ['discipline', 'late', 'absent', 'uniform', 'rule', 'violation', 'compliance', 'follow', 'sop', 'procedure'],
  'Productivity': ['productivity', 'output', 'throughput', 'efficiency', 'speed', 'cycle time', 'target', 'production', 'oee', 'downtime'],
  'Wastes': ['waste', 'muda', 'mura', 'muri', 'scrap', 'rework', 'overproduction', 'excess', 'unnecessary'],
  'Ambience': ['ambience', 'lighting', 'temperature', 'noise', 'ventilation', 'humid', 'comfort', 'smell', 'air quality'],
  'Environment Impact': ['environment', 'emission', 'pollution', 'leak', 'spill', 'chemical', 'disposal', 'effluent', 'carbon', 'green'],
  'Material Handling': ['material', 'handling', 'storage', 'transport', 'forklift', 'crane', 'conveyor', 'movement', 'lifting', 'stacking'],
  'Data Recording': ['data', 'record', 'log', 'document', 'register', 'entry', 'tracking', 'checklist', 'form', 'report'],
  'Adherence to Standards': ['standard', 'adherence', 'deviation', 'specification', 'tolerance', 'calibration', 'iso', 'benchmark'],
  'Machine Condition': ['machine', 'equipment', 'breakdown', 'maintenance', 'repair', 'vibration', 'oil', 'worn', 'malfunction'],
  'Gauges and Fixture': ['gauge', 'fixture', 'jig', 'tool', 'instrument', 'measurement', 'calibrat', 'dial', 'meter', 'clamp'],
  'Inventory': ['inventory', 'stock', 'wip', 'fifo', 'kanban', 'buffer', 'shortage', 'excess stock', 'supply'],
  'Review Meeting': ['review', 'meeting', 'discussion', 'huddle', 'debrief', 'standup', 'agenda', 'minutes']
};

app.post('/api/ai/analyze', (req, res) => {
  const { description } = req.body;
  const d = description.toLowerCase();
  let category = 'Other';
  if (d.match(/wait|delay|idle/)) category = 'Muda';
  else if (d.match(/motion|walk|extra steps|movement/)) category = 'Muda';
  else if (d.match(/overproduction|excess|too many/)) category = 'Muda';
  else if (d.match(/defect|rework|scrap|reject/)) category = 'Quality';
  else if (d.match(/uneven|inconsistent|variation|fluctuat/)) category = 'Mura';
  else if (d.match(/overburden|strain|stress|fatigue|overtime/)) category = 'Muri';
  else if (d.match(/safety|hazard|danger|injury|ppe/)) category = 'Safety';
  else if (d.match(/error|quality|inspection/)) category = 'Quality';

  let bestArea = 'Others', bestScore = 0;
  for (const [area, kws] of Object.entries(areaKeywords)) {
    const score = kws.filter(kw => d.includes(kw)).length;
    if (score > bestScore) { bestScore = score; bestArea = area; }
  }

  const posWords = ['good', 'great', 'excellent', 'well done', 'impressive', 'clean', 'organized', 'improved', 'appreciate', 'commend', 'best practice', 'proper', 'perfect'];
  const negWords = ['problem', 'issue', 'fail', 'broken', 'missing', 'dirty', 'unsafe', 'violation', 'delay', 'waste', 'defect', 'poor', 'bad', 'wrong', 'not working'];
  const observationType = posWords.filter(w => d.includes(w)).length > negWords.filter(w => d.includes(w)).length ? 'positive' : 'negative';

  res.json({ category, observationArea: bestArea, observationType, aiAnalysis: `Categorized as ${category} in "${bestArea}" (${observationType})` });
});

module.exports = app;
