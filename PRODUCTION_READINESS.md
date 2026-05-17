# Production Readiness Runbook

This runbook turns the production-readiness plan into a concrete checklist for this repository.

Supporting checklists:

- `STAGING_UAT_CHECKLIST.md`
- `PILOT_ROLLOUT_CHECKLIST.md`
- `GO_LIVE_CHECKLIST.md`
- `UAT_SIGNOFF_TEMPLATE.md`
- `PILOT_ISSUE_TRACKER_TEMPLATE.md`

## 1. Security/Config Audit

Run these before every production release:

```bash
npm run build
npm run smoke
npm --prefix server run preflight:prod
```

Required checks:

- `NODE_ENV=production`
- `FRONTEND_URL` matches the real frontend domain
- `MONGODB_URI` or `MONGO_URI` points to the production database
- `SECRET_KEY_ACCESS_TOKEN` and `SECRET_KEY_REFRESH_TOKEN` are at least 32 characters
- `MAIL_USER` and `MAIL_PASS` are configured
- `REDIS_URL` is configured for queue/cache in production
- `SENTRY_DSN` is configured for crash monitoring
- `CLOUDINARY_*` variables are configured if file uploads are used
- `server/config/serviceAccountKey.json` is present if Firebase Admin features are used

Manual review items:

- Confirm HTTPS is enabled at the platform/proxy layer
- Confirm cookie behavior works on the real domain
- Confirm CORS only allows known frontend origins
- Confirm admin-only routes cannot be accessed by normal users
- Confirm upload size/type restrictions still match business policy

## 2. Backup And Monitoring Readiness

Backups:

- Enable automated MongoDB backups or snapshots
- Document database restore steps and test one restore on staging
- Confirm Cloudinary asset retention and recovery policy
- Back up Firebase service account credentials securely outside the repo
- Export production env variables into a secure secret manager

Monitoring:

- Enable Sentry with a real DSN
- Monitor `/api/health`
- Alert on:
  - server crash/restart loops
  - MongoDB connectivity failures
  - Redis connectivity failures
  - PDF worker failures
  - mail delivery failures
  - repeated `401`, `403`, and `429` spikes
- Retain backend logs centrally on the hosting platform

Operational checks:

- Start the main API with `npm --prefix server run start`
- Start the PDF worker with `npm --prefix server run worker:pdf`
- Verify both are deployed and supervised in production

## 3. Real-Data Report Verification

Test both report types using staging or masked real-like data:

- Plastic compliance report
- Plastic summary report

Verify:

- index appears on the correct page
- report cache invalidation works after changes
- brand-owner summary sections render correctly
- Supplier CTO table includes the expected suppliers
- PDF download works only for the owning user
- simultaneous report requests do not corrupt results

Failure-mode tests:

- queue unavailable
- Redis unavailable
- report worker down
- missing template asset
- report requested twice by the same user

## 4. Full Business Regression + UAT

Detailed execution checklist:

- `STAGING_UAT_CHECKLIST.md`

Minimum regression flows:

- register, login, refresh token, logout
- forgot password and OTP verification
- create, edit, assign, delete client
- waste-type client portfolio navigation
- client connect summary and drill-down
- plant process data save/update
- Supplier CTO fetch/save/report flow
- summary calculations and category displays
- PDF queue, status polling, download

UAT participants:

- admin
- assigned user/auditor
- one real business operator from each important workflow

UAT exit criteria:

- no blocking defects
- no data corruption
- no permission leaks
- all critical reports verified

## 5. Limited Pilot Rollout

Detailed execution checklist:

- `PILOT_ROLLOUT_CHECKLIST.md`

Recommended pilot scope:

- 1 to 3 internal admins
- 2 to 5 trusted client accounts
- limited number of live reports per day

Pilot rules:

- take a backup before onboarding pilot clients
- review logs daily
- track every error with correlation ID
- freeze schema/business-rule changes during pilot unless critical

Success criteria:

- no Sev-1 incidents
- no unauthorized data exposure
- no broken report/download flows
- acceptable response times for core screens

## 6. Full Production Go-Live

Detailed execution checklist:

- `GO_LIVE_CHECKLIST.md`

Go-live prerequisites:

- all previous sections complete
- deployment rollback plan documented
- verified backup/restore test completed
- monitoring and alert routing confirmed
- business owner sign-off received

Go-live day checklist:

- deploy API
- deploy frontend
- deploy PDF worker
- run `npm --prefix server run preflight:prod` in the production environment
- verify `/api/health`
- test login, client list, one save flow, one report flow
- monitor logs and Sentry for at least the first 2 hours

Post go-live:

- keep daily review of errors for the first week
- avoid non-critical feature releases during the stabilization window
