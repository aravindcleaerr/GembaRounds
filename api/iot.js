const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

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

const rand = (min, max) => Math.round((Math.random() * (max - min) + min) * 100) / 100;

function genData(m) {
  const statuses = ['running', 'running', 'running', 'idle', 'maintenance', 'error'];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const on = status === 'running';
  const temp = rand(55, 85), vib = rand(0.01, 0.08);
  const alerts = [];
  if (temp > 78) alerts.push({ level: 'warning', message: `High temp: ${temp}C` });
  if (vib > 0.06) alerts.push({ level: 'critical', message: `High vibration: ${vib} mm/s` });
  if (status === 'error') alerts.push({ level: 'critical', message: 'Machine error' });
  return { ...m, status, timestamp: new Date().toISOString(), metrics: { temperature: temp, vibration: vib, power: on ? rand(1200, 1800) : rand(50, 200), oee: on ? rand(75, 98) : 0, cycleTime: on ? rand(25, 45) : 0, partsProduced: on ? Math.floor(rand(50, 200)) : 0, defectRate: on ? rand(0, 5) : 0 }, alerts };
}

app.get('/api/iot/floor', (req, res) => {
  const data = MACHINES.map(genData);
  const running = data.filter(m => m.status === 'running').length;
  const idle = data.filter(m => m.status === 'idle').length;
  const error = data.filter(m => m.status === 'error' || m.status === 'maintenance').length;
  const avgOEE = data.filter(m => m.status === 'running').reduce((s, m) => s + m.metrics.oee, 0) / (running || 1);
  res.json({ timestamp: new Date().toISOString(), machines: data, summary: { total: MACHINES.length, running, idle, error, avgOEE: Math.round(avgOEE * 10) / 10 }, alerts: data.flatMap(m => m.alerts.map(a => ({ ...a, machine: m.name, machineId: m.id }))) });
});

app.get('/api/iot/machine/:id', (req, res) => {
  const m = MACHINES.find(x => x.id === req.params.id);
  if (!m) return res.status(404).json({ error: 'Not found' });
  res.json(genData(m));
});

module.exports = app;
