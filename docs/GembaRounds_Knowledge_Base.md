# GembaRounds Knowledge Base
### Internal Reference Document — Not for in-app display
**Version 1.0 | April 2026**

---

## 1. What is Gemba Walk?

Gemba (現場) is Japanese for "the actual place." In manufacturing, it means the shop floor — where value is created.

A Gemba Walk is a management practice where leaders go to the actual workplace to observe processes, engage with workers, and identify opportunities for improvement.

**It is NOT an audit or inspection** — it is about understanding reality, connecting with people, and building continuous improvement.

> "Go see, ask why, show respect." — Taiichi Ohno, Toyota Production System

### Why Gemba Walks Matter

Current problems in most factories:
- Observations are random and unstructured
- Insights and observations not documented — lost after a day
- No systematic tracking or closure of actions
- Accountability for action closure not clear
- Same issues repeat month after month

Gemba Walks solve these by making observations systematic, documented, and actionable.

---

## 2. COACH Framework (PSS Methodology)

Developed by PS Satish Sir:

| Step | Action | Details |
|------|--------|---------|
| **C** - Connect | Meet operating people | Go to the floor, greet workers, ask how they're doing |
| **O** - Observe | See the actual process | Don't rely on reports. Look at 5S, safety, material flow |
| **A** - Appreciate | Acknowledge good work | Positive reinforcement builds trust and motivation |
| **C** - Conform | Check standards | Are SOPs displayed? Data being recorded? Gauges calibrated? |
| **H** - Honing | Highlight improvements | Tag responsible persons, set due dates, follow up |

---

## 3. 15 PSS Observation Areas

1. House Keeping (5S) — Workplace organization
2. Safety — Hazards, guards, PPE
3. Discipline — Following rules and timing
4. Productivity — Output, efficiency, utilization
5. Wastes (Muda) — 7 wastes of lean
6. Ambience — Lighting, temperature, noise
7. Environment Impact — Emissions, waste disposal
8. Material Handling — Storage, movement, damage
9. Data Recording — Log sheets, checklists
10. Adherence to Standards — SOPs, work instructions
11. Machine Condition — Maintenance, leaks, vibration
12. Gauges and Fixture — Calibration, condition
13. Inventory — FIFO, Kanban, stock levels
14. Review Meeting — Action follow-up, MIS
15. Others — Anything noteworthy

---

## 4. 7 Wastes (Muda) — TIMWOOD

| Waste | Description | What to look for |
|-------|-------------|-----------------|
| **T**ransport | Unnecessary material movement | Materials traveling long distances between stations |
| **I**nventory | Excess stock, WIP buildup | Piles of WIP, overflowing bins, unused raw material |
| **M**otion | Unnecessary worker movement | Operators walking far for tools, bending, reaching |
| **W**aiting | Idle time, material delays | Workers standing idle, machines waiting for material |
| **O**verproduction | Making more than demand | Producing ahead of schedule, excess finished goods |
| **O**verprocessing | More work than required | Extra inspections, unnecessary precision, rework |
| **D**efects | Rework, scrap, quality rejects | Rejection bins, rework stations, customer complaints |

---

## 5. Walk Frequency (PSS Recommendation)

| Level | Who | Frequency | Duration |
|-------|-----|-----------|----------|
| Floor | Supervisors | Daily | 15-20 min |
| Department | Managers | Weekly | 30-45 min |
| Plant | Plant Head, VPs | Bimonthly | 1 hour |
| Leadership | MD, CEO | Monthly | 1-2 hours |

**Key:** Consistency is more important than duration. A 15-minute daily walk is better than a 2-hour monthly walk.

---

## 6. Tips for Effective Walks

### DO
- Go with an open mind — observe, don't judge
- Talk to operators — ask "what problems do you face?"
- Appreciate good work publicly
- Take notes/photos immediately
- Follow up on previous observations
- Vary your route — don't always go to the same areas

### DON'T
- Don't treat it as an audit or inspection
- Don't go only when there's a problem
- Don't skip the appreciation step
- Don't make promises you can't keep
- Don't spend all time in one area — cover the full floor

---

## 7. Weekly Review Meeting Process

1. Review all observations from the week
2. Categorize by area and priority
3. Identify patterns — are same issues repeating?
4. Check action status — what's been closed?
5. Recognize contributions — who found issues, who fixed them?
6. Plan next week's focus areas
7. Share the summary with stakeholders

---

## 8. Where GembaRounds Can Be Used

| Industry | Use Case |
|----------|----------|
| Manufacturing | Shop floor, assembly lines, CNC bays |
| Projects/EPC | Construction sites, project audits |
| Hospitals | Ward rounds, safety audits |
| Warehouses | Storage, logistics, inventory |
| Retail | Store audits, customer experience |
| Offices | Workspace audits, process checks |

---

## 9. Competitor Comparison

| Feature | GembaRounds | iAuditor (SafetyCulture) | Tulip |
|---------|-------------|--------------------------|-------|
| PSS COACH Framework | Built-in | Not available | Not available |
| 15 Observation Areas | Pre-configured | Generic checklists | Generic |
| AI Auto-categorization | Yes | Limited/No | No |
| Voice Dictation | Built-in | Some paid plans | No |
| Kaizen Points | Yes | No | No |
| Pricing | Free / Low cost | $19-33/user/month | $40/user/month |
| Indian Manufacturing Focus | Yes | Western-centric | Western-centric |
| SME-focused | Yes | Enterprise-focused | Enterprise-focused |

---

## 10. Investment & Costs

### Current (Beta)
- **Price:** FREE
- **Hosting:** Vercel free tier + MongoDB Atlas free (M0)
- **Limits:** 100 connections, 512 MB storage

### Production Deployment
- MongoDB Atlas M10: ~$57/month
- Vercel Pro: ~$20/month
- Domain + SSL: ~$2/month
- Email service (SendGrid): ~$15/month
- **Total: ~$95/month (~Rs 8,000)**

### Mobile App Stores
- Google Play: $25 one-time
- Apple App Store: $99/year
- Note: PWA (Progressive Web App) works free without app store

---

## 11. Deployment Options

### Cloud (Current)
- MongoDB Atlas + Vercel serverless
- Data accessible anywhere
- Zero maintenance

### On-Premise (Local)
1. Install Node.js (v18+) and MongoDB Community Server
2. `git clone https://github.com/aravindcleaerr/GembaRounds.git && npm install`
3. Set `MONGO_URI=mongodb://localhost:27017/gembarounds` in `.env`
4. Run `node src/server/index.js` → Open http://localhost:3000

### Hybrid
- Local server for daily operations
- Cloud backup for disaster recovery

---

## 12. Adoption Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| Resistance to change from paper | Start with one team, show quick wins, then expand |
| Managers too busy to use | Voice dictation makes it faster than writing. < 2 min per observation |
| Operators afraid of being reported | Emphasis on appreciation (COACH-A). Positive observations build trust |
| Data entry fatigue | AI auto-categorization, voice input, photo capture reduce manual entry |
| IT infrastructure concerns | Works on any phone browser. No app install needed (PWA) |

---

## 13. Technology Stack

- **Frontend:** React 18 (CDN), Chart.js, Material Icons, Inter font
- **Backend:** Node.js, Express, Vercel Serverless Functions
- **Database:** MongoDB Atlas
- **Auth:** JWT + bcrypt (7-day expiry)
- **Hosting:** Vercel
- **AI:** Rule-based categorization engine
- **PWA:** Service Worker v3, manifest.json

---

## 14. All Features (40+)

### Walk Management
- Start/Complete walks with title, frequency
- COACH interactive progress tracker
- 15 PSS observation areas
- Photo & video upload
- Voice dictation (Speech-to-Text)
- AI auto-categorization

### Analytics & Reports
- Dashboard charts (doughnut, bar)
- Spaghetti diagram (location heatmap)
- Week-over-week trend analysis
- CSV export & bulk import
- Walk summary report (printable)
- Data backup/restore (JSON)

### Team & Accountability
- 5 user roles (Admin, Leader, Manager, Supervisor, Operator)
- Action tracking (Open/In Progress/Closed)
- Employee suggestion box
- Kaizen points leaderboard
- Notifications & alerts
- Admin dashboard with audit trail

### Platform
- Dark mode with system detection
- Hindi language (~170 translations)
- PWA (installable, offline-capable)
- Mobile responsive (bottom nav + sidebar)
- WhatsApp & Email sharing
- Multi-factory support
- Print-friendly CSS
- Rate limiting & XSS protection

---

## 15. Credits

- **Methodology:** PS Satish Sir (COACH Framework)
- **Development:** Aravind & Team with AI assistance
- **License:** MIT License
- **Copyright:** 2026 GembaRounds

---

*This document is for internal reference, presentations, and stakeholder discussions. The in-app Help section contains only user-facing guidance.*
