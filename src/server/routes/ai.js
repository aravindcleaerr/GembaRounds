const express = require('express');
const router = express.Router();

// Keywords mapped to PSS observation areas
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
  'Adherence to Standards': ['standard', 'adherence', 'deviation', 'specification', 'tolerance', 'calibration', 'iso', 'sop', 'benchmark'],
  'Machine Condition': ['machine', 'equipment', 'breakdown', 'maintenance', 'repair', 'vibration', 'oil', 'worn', 'malfunction', 'condition'],
  'Gauges and Fixture': ['gauge', 'fixture', 'jig', 'tool', 'instrument', 'measurement', 'calibrat', 'dial', 'meter', 'clamp'],
  'Inventory': ['inventory', 'stock', 'wip', 'fifo', 'kanban', 'buffer', 'shortage', 'excess stock', 'supply'],
  'Review Meeting': ['review', 'meeting', 'discussion', 'huddle', 'debrief', 'standup', 'agenda', 'minutes']
};

// Simulate AI-powered observation categorization
router.post('/analyze', (req, res) => {
  const { description } = req.body;
  let category = 'Other';
  let observationArea = 'Others';
  const lowerDesc = description.toLowerCase();

  // Detect waste category
  if (lowerDesc.includes('wait') || lowerDesc.includes('delay') || lowerDesc.includes('idle')) {
    category = 'Muda';
  } else if (lowerDesc.includes('motion') || lowerDesc.includes('walk') || lowerDesc.includes('extra steps') || lowerDesc.includes('movement')) {
    category = 'Muda';
  } else if (lowerDesc.includes('overproduction') || lowerDesc.includes('excess') || lowerDesc.includes('too many') || lowerDesc.includes('overstock')) {
    category = 'Muda';
  } else if (lowerDesc.includes('defect') || lowerDesc.includes('rework') || lowerDesc.includes('scrap') || lowerDesc.includes('reject')) {
    category = 'Quality';
  } else if (lowerDesc.includes('uneven') || lowerDesc.includes('inconsistent') || lowerDesc.includes('variation') || lowerDesc.includes('fluctuat')) {
    category = 'Mura';
  } else if (lowerDesc.includes('overburden') || lowerDesc.includes('strain') || lowerDesc.includes('stress') || lowerDesc.includes('fatigue') || lowerDesc.includes('overtime')) {
    category = 'Muri';
  } else if (lowerDesc.includes('safety') || lowerDesc.includes('hazard') || lowerDesc.includes('danger') || lowerDesc.includes('injury') || lowerDesc.includes('ppe')) {
    category = 'Safety';
  } else if (lowerDesc.includes('error') || lowerDesc.includes('quality') || lowerDesc.includes('inspection')) {
    category = 'Quality';
  }

  // Detect PSS observation area
  let bestArea = 'Others';
  let bestScore = 0;
  for (const [area, keywords] of Object.entries(areaKeywords)) {
    let score = 0;
    for (const kw of keywords) {
      if (lowerDesc.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestArea = area;
    }
  }
  observationArea = bestArea;

  // Detect if positive or negative observation
  const positiveWords = ['good', 'great', 'excellent', 'well done', 'impressive', 'clean', 'organized', 'improved', 'appreciate', 'commend', 'best practice', 'kudos', 'proper', 'perfect'];
  const negativeWords = ['problem', 'issue', 'fail', 'broken', 'missing', 'dirty', 'unsafe', 'violation', 'delay', 'waste', 'defect', 'poor', 'bad', 'wrong', 'not working'];

  let posScore = positiveWords.filter(w => lowerDesc.includes(w)).length;
  let negScore = negativeWords.filter(w => lowerDesc.includes(w)).length;
  const observationType = posScore > negScore ? 'positive' : 'negative';

  res.json({
    category,
    observationArea,
    observationType,
    aiAnalysis: `AI analysis: Categorized as ${category} in area "${observationArea}" (${observationType})`
  });
});

module.exports = router;
