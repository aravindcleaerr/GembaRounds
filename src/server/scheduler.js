const cron = require('node-cron');

// In-memory scheduled recurring walks
const recurringWalks = [];
let walkCreator = null; // Will be set by server

function setWalkCreator(fn) {
  walkCreator = fn;
}

function addRecurring(config) {
  const { title, walker, frequency, description } = config;
  const id = 'recurring_' + Date.now();

  // Map frequency to cron expression
  let cronExpr;
  switch (frequency) {
    case 'daily': cronExpr = '0 8 * * 1-6'; break;       // 8 AM Mon-Sat
    case 'weekly': cronExpr = '0 8 * * 1'; break;         // 8 AM Monday
    case 'bimonthly': cronExpr = '0 8 1,15 * *'; break;   // 8 AM 1st and 15th
    case 'monthly': cronExpr = '0 8 1 * *'; break;        // 8 AM 1st of month
    default: return null;
  }

  const task = cron.schedule(cronExpr, async () => {
    console.log(`[Scheduler] Auto-creating walk: ${title}`);
    if (walkCreator) {
      await walkCreator({ title: title || 'Scheduled Gemba Walk', walker, frequency, description });
    }
  }, { timezone: 'Asia/Kolkata' });

  const entry = { id, title, walker, frequency, cronExpr, description, active: true, task, createdAt: new Date().toISOString() };
  recurringWalks.push(entry);
  return { id, title, walker, frequency, cronExpr, active: true, createdAt: entry.createdAt };
}

function removeRecurring(id) {
  const idx = recurringWalks.findIndex(r => r.id === id);
  if (idx === -1) return false;
  recurringWalks[idx].task.stop();
  recurringWalks.splice(idx, 1);
  return true;
}

function listRecurring() {
  return recurringWalks.map(({ id, title, walker, frequency, cronExpr, active, createdAt }) =>
    ({ id, title, walker, frequency, cronExpr, active, createdAt })
  );
}

module.exports = { setWalkCreator, addRecurring, removeRecurring, listRecurring };
