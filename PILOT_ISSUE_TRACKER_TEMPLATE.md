# Pilot Issue Tracker Template

Use this tracker during the limited pilot rollout.

## Pilot Info

- Pilot Window Start:
- Pilot Window End:
- Environment:
- Pilot Owner:
- Escalation Contact:

## Issue Tracker

| ID | Date | Client/User | Module | Description | Severity | Correlation ID | Report Job ID | Owner | Status | Target Fix Date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PILOT-001 |  |  |  |  | Sev-3 |  |  |  | Open |  |

## Severity Reference

- `Sev-1`: authentication outage, data-loss, permission leak, reports fully broken
- `Sev-2`: repeated save failure, broken assignment flow, wrong summary/report numbers
- `Sev-3`: isolated UI issue, low-risk cosmetic or non-blocking issue

## Daily Summary

| Date | New Issues | Closed Issues | Sev-1 | Sev-2 | Sev-3 | Decision |
| --- | --- | --- | --- | --- | --- | --- |
|  | 0 | 0 | 0 | 0 | 0 | Continue |

## Stop/Pause Decision Rules

Pause the pilot immediately if any of these are recorded:

- any confirmed permission leak
- any confirmed data corruption
- repeated report ownership/download failure
- sustained authentication outage
- backup uncertainty during active pilot usage

## Pilot Closure Summary

- Total Issues:
- Total Sev-1:
- Total Sev-2:
- Total Sev-3:
- Closed Before Exit:
- Remaining Open:
- Final Recommendation:

## Final Recommendation

Choose one:

- [ ] Proceed to full go-live
- [ ] Extend pilot
- [ ] Pause and fix issues before continuing
