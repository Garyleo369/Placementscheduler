# Placement Scheduler

**Constraint-aware interview scheduling and disruption recovery**

A full-stack university placement scheduling prototype that assigns students, companies, interview panels and rooms to compatible time slots. When a disruption occurs, its surgical replanning workflow attempts to repair only the affected interviews while preserving the rest of the schedule.

**Stack:** React + Vite · Node.js · Express · MongoDB · Mongoose

## Why this project exists

Campus placement drives involve overlapping candidate shortlists, limited rooms, panel availability and company-specific operating windows. Manually revising schedules after a delay or room outage can introduce conflicts and disrupt unrelated interviews.

This project models those constraints and demonstrates localized schedule repair.

## Main capabilities

- Generate a sample placement dataset and an initial interview schedule
- Apply availability and time-window constraints for students, panels and rooms
- View schedule summaries, conflicts and individual interview assignments
- Simulate company delays, panel unavailability, room outages and student withdrawal
- Attempt to reassign affected interviews while keeping unaffected slots fixed
- Inspect before-and-after changes and scheduling outcomes

## Architecture

```text
React dashboard
     |
     v
Express REST API
     |
     +--> Data generation and schedule endpoints
     +--> Greedy initial scheduler
     +--> Disruption impact analysis
     +--> Surgical replanner and change summary
     |
     v
MongoDB via Mongoose
```

## How scheduling works

The initial scheduler prioritizes interview assignments and searches for available slots subject to hard constraints: no student, panel or room should be booked for overlapping interviews, and company operating windows must be respected.

For disruptions, the replanner follows four stages:

1. **Identify affected interviews** based on the disruption.
2. **Preserve unaffected interviews** as fixed commitments.
3. **Search feasible replacement slots** for the affected interviews, using a scoring function that penalizes changes to day, panel, room and time.
4. **Report the changes**, including rescheduled and cancelled interviews.

This is a heuristic repair strategy, not a guarantee of globally optimal scheduling. An interview may remain unscheduled if no valid replacement exists.

## Demo walkthrough

1. Start the backend and frontend.
2. Generate the demonstration dataset.
3. Generate and inspect the initial schedule.
4. Trigger a disruption, such as a room becoming unavailable.
5. Compare the affected interviews before and after replanning.
6. Check that unrelated interview assignments remain unchanged.

> Add real dashboard and before/after screenshots here once captured. Avoid using synthetic screenshots presented as actual application output.

## Run locally

**Prerequisites:** Node.js, npm and a running MongoDB instance.

Backend:

```bash
cd server
npm install
# Configure environment variables using server/.env.example
npm run dev
```

Frontend (second terminal):

```bash
cd client
npm install
npm run dev
```

Refer to [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) for the detailed data model, routes and algorithm discussion. The documentation describes a larger synthetic scenario; verify the current generator settings before quoting specific dataset counts in a demo.

## Technical discussion points

- Why use greedy initial scheduling instead of exhaustive search?
- How are overlapping intervals checked?
- Why lock unaffected interviews during replanning?
- What trade-offs does the penalty function encode?
- What happens when no valid replacement slot exists?

## Scope and limitations

This is a demonstration system using generated placement data. Scheduling quality depends on input constraints and heuristic ordering. Production use would require stronger authorization, concurrency controls, auditability, automated testing and validation against real placement policies.
