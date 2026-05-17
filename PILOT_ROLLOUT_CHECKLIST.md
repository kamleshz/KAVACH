# Limited Pilot Rollout Checklist

Use this checklist after staging/UAT sign-off and before full production rollout.

Supporting template:

- `PILOT_ISSUE_TRACKER_TEMPLATE.md`

## Pilot Scope

Recommended scope for this project:

- 1 to 3 internal admins
- 2 to 5 trusted client accounts
- limited report volume
- no schema or business-rule changes during the pilot window unless critical

## Before Pilot Starts

- confirm `STAGING_UAT_CHECKLIST.md` is fully completed
- confirm production env variables are set
- confirm MongoDB backup is healthy
- confirm report worker is running in production
- confirm Sentry and log monitoring are active
- confirm rollback owner and escalation contacts are assigned

## Pilot Data Rules

- onboard only approved pilot clients
- document every imported or manually entered pilot record
- take a backup before first pilot client onboarding
- avoid bulk data imports unless specifically approved

## Daily Pilot Monitoring

Review at least once per day:

- `/api/health`
- Sentry issues
- backend error logs
- PDF worker errors
- report queue failures
- repeated `401`, `403`, `409`, and `429` responses

Record all pilot defects in:

- `PILOT_ISSUE_TRACKER_TEMPLATE.md`

## Daily Functional Checks

Each pilot day, confirm:

- login works
- client list loads
- one client edit/save works
- one Client Connect flow works
- one Plant Process save works
- one report queues and downloads successfully

## Incident Severity

- `Sev-1`: login outage, data-loss, permission leak, reports fully broken
- `Sev-2`: repeated save failures, broken assignment flow, wrong summary/report numbers
- `Sev-3`: isolated UI issue, non-blocking layout issue, low-risk cosmetic defect

## Pilot Stop Conditions

Pause pilot immediately if any of these happen:

- unauthorized access to another client’s data
- data corruption or missing saved records
- repeated report ownership or download issues
- failed restore test or backup uncertainty
- sustained production instability

## Pilot Success Metrics

- zero `Sev-1` incidents
- no unresolved permission leaks
- no unresolved data integrity issues
- report success rate acceptable for pilot usage
- business users confirm daily workflows are usable

## Pilot Exit Decision

Pilot may proceed to full go-live only if:

- all `Sev-1` and `Sev-2` issues are resolved
- pilot users approve core workflows
- backup and restore readiness is confirmed
- monitoring coverage remains healthy
- business owner approves next-step expansion
