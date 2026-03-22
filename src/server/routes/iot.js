const express = require('express');
const router = express.Router();

// Simulated plant floor layout with machines
const MACHINES = [
  { id: 'CNC-01', name: 'CNC Machine 1', area: 'CNC Bay', type: 'CNC' },
  { id: 'CNC-02', name: 'CNC Machine 2', area: 'CNC Bay', type: 'CNC' },
  { id: 'PRESS-01', name: 'Press Machine 1', area: 'Press Shop', type: 'Press' },
  { id: 'PRESS-02', name: 'Press Machine 2', area: 'Press Shop', type: 'Press' },
  { id: 'ASSY-01', name: 'Assembly Station 1', area: 'Assembly Line', type: 'Assembly' },
  { id: 'ASSY-02', name: 'Assembly Station 2', area: 'Assembly Line', type: 'Assembly' },
  { id: 'INSP-01', name: 'Inspection Station', area: 'Quality', type: 'Inspection' },
  { id: 'PACK-01', name: 'Packaging Line', area: 'Packaging', type: 'Packaging' }
];

function randomBetween(min, max) { return Math.round((Math.random() * (max - min) + min) * 100) / 100; }

function generateMachineData(machine) {
  const statuses = ['running', 'running', 'running', 'idle', 'maintenance', 'error'];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const isRunning = status === 'running';

  const alerts = [];
  const temp = randomBetween(55, 85);
  const vibration = randomBetween(0.01, 0.08);
  if (temp > 78) alerts.push({ level: 'warning', message: `High temperature: ${temp}°C` });
  if (vibration > 0.06) alerts.push({ level: 'critical', message: `High vibration: ${vibration} mm/s` });
  if (status === 'error') alerts.push({ level: 'critical', message: 'Machine error - needs attention' });

  return {
    ...machine,
    status,
    timestamp: new Date().toISOString(),
    metrics: {
      temperature: temp,
      vibration,
      power: isRunning ? randomBetween(1200, 1800) : randomBetween(50, 200),
      oee: isRunning ? randomBetween(75, 98) : 0,
      cycleTime: isRunning ? randomBetween(25, 45) : 0,
      partsProduced: isRunning ? Math.floor(randomBetween(50, 200)) : 0,
      defectRate: isRunning ? randomBetween(0, 5) : 0
    },
    alerts
  };
}

// Get all machines overview
router.get('/floor', (req, res) => {
  const floorData = MACHINES.map(generateMachineData);
  const running = floorData.filter(m => m.status === 'running').length;
  const idle = floorData.filter(m => m.status === 'idle').length;
  const error = floorData.filter(m => m.status === 'error' || m.status === 'maintenance').length;
  const avgOEE = floorData.filter(m => m.status === 'running').reduce((sum, m) => sum + m.metrics.oee, 0) / (running || 1);

  res.json({
    timestamp: new Date().toISOString(),
    machines: floorData,
    summary: { total: MACHINES.length, running, idle, error, avgOEE: Math.round(avgOEE * 10) / 10 },
    alerts: floorData.flatMap(m => m.alerts.map(a => ({ ...a, machine: m.name, machineId: m.id })))
  });
});

// Get single machine data
router.get('/machine/:id', (req, res) => {
  const machine = MACHINES.find(m => m.id === req.params.id);
  if (!machine) return res.status(404).json({ error: 'Machine not found' });
  res.json(generateMachineData(machine));
});

// Legacy endpoint
router.get('/sensor-data', (req, res) => {
  const data = generateMachineData(MACHINES[0]);
  res.json({
    timestamp: data.timestamp,
    machineStatus: data.status,
    temperature: data.metrics.temperature,
    vibration: data.metrics.vibration,
    powerConsumption: data.metrics.power,
    oee: data.metrics.oee
  });
});

module.exports = router;
