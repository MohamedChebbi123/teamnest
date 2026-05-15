# TeamNest — Sprint Gantt Chart

A 12-week timeline of the six TeamNest sprints, broken down by the epics delivered in each. Each sprint runs for two weeks; epics inside the same sprint run in parallel.

```mermaid
gantt
    title TeamNest — 12-Week Sprint Roadmap
    dateFormat  YYYY-MM-DD
    axisFormat  %d %b

    section Sprint 1 — Identity Foundation
    EP-01 Authentication & Onboarding   :s1a, 2025-02-03, 14d
    EP-02 Profile & Preferences         :s1b, 2025-02-03, 14d
    Sprint 1 review                     :milestone, m1, 2025-02-16, 0d

    section Sprint 2 — Workspace Setup
    EP-06 Organization Management       :s2a, after s1a, 14d
    EP-11 Team Management               :s2b, after s1a, 14d
    Sprint 2 review                     :milestone, m2, 2025-03-02, 0d

    section Sprint 3 — Live Collaboration
    EP-07 Channels & Messaging          :s3a, after s2a, 14d
    Sprint 3 review                     :milestone, m3, 2025-03-16, 0d

    section Sprint 4 — Personal Network
    EP-03 Direct Messaging              :s4a, after s3a, 14d
    EP-04 Friends & Connections         :s4b, after s3a, 14d
    EP-05 Group Chats                   :s4c, after s3a, 14d
    Sprint 4 review                     :milestone, m4, 2025-03-30, 0d

    section Sprint 5 — Work Tracking
    EP-12 Task Management               :s5a, after s4a, 14d
    EP-08 Notifications                 :s5b, after s4a, 14d
    Sprint 5 review                     :milestone, m5, 2025-04-13, 0d

    section Sprint 6 — Platform Reach
    EP-09 AI Assistant                  :s6a, after s5a, 14d
    EP-10 Global Search                 :s6b, after s5a, 14d
    EP-06 Billing & Audit (US-12.2–12.5):s6c, after s5a, 14d
    Final release                       :milestone, m6, 2025-04-27, 0d
```

## Sprint legend

| Sprint   | Title                                                                          | Window                  | Story points | User stories |
| -------- | ------------------------------------------------------------------------------ | ----------------------- | :----------: | :----------: |
| Sprint 1 | Identity Foundation — Authentication, Sessions & Profile                       | 2025-02-03 → 2025-02-16 | 37           | 12           |
| Sprint 2 | Workspace Setup — Organizations, Memberships & Team Structure                  | 2025-02-17 → 2025-03-02 | 41           | 14           |
| Sprint 3 | Live Collaboration — Channels, Real-time Messaging & File Sharing              | 2025-03-03 → 2025-03-16 | 45           | 12           |
| Sprint 4 | Personal Network — Direct Messages, Group Chats & Friends                      | 2025-03-17 → 2025-03-30 | 35           | 11           |
| Sprint 5 | Work Tracking — Tasks, Subtasks, Approvals & Real-time Notifications           | 2025-03-31 → 2025-04-13 | 30           | 9            |
| Sprint 6 | Platform Reach — AI Assistant, Global Search, Audit Log & Stripe Billing       | 2025-04-14 → 2025-04-27 | 39           | 8            |
