# Production Go-Live Checklist

Use this checklist only after UAT and pilot completion.

## Pre Go-Live Approval

- business owner sign-off received
- admin sign-off received
- technical owner sign-off received
- rollback owner assigned

## Deployment Readiness

- production env variables verified against `server/.env.example`
- `npm run build` passed on the release candidate
- `npm run smoke` passed on the release candidate
- `npm --prefix server run preflight:prod` passed in the production environment
- frontend build points to the correct backend URL
- backend `FRONTEND_URL` points to the real frontend domain
- PDF worker deployment is ready

## Backup And Recovery

- MongoDB backup taken before deployment
- restore steps documented
- one recent restore test already completed successfully
- Cloudinary/Firebase credential backups stored securely

## Go-Live Deployment Steps

Perform in this order:

1. deploy backend API
2. deploy PDF worker
3. verify `/api/health`
4. deploy frontend
5. confirm frontend can reach backend
6. run one admin login test
7. run one client list test
8. run one save flow
9. run one report generation and download

## Smoke Verification After Deployment

- admin login works
- client portfolio list loads
- one Client Connect page opens
- one Plant Process save works
- one Supplier CTO save/refresh check works
- one summary screen renders expected values
- one compliance report downloads
- one summary report downloads

## Monitoring Window

For the first 2 hours after release, actively monitor:

- Sentry
- backend logs
- report worker logs
- `/api/health`
- MongoDB/Redis platform health

## Go-Live Stop Conditions

Rollback or stop immediately if:

- authentication is broken
- data cannot be saved reliably
- unauthorized access is detected
- reports fail consistently
- health endpoint indicates degraded state

## First Week Stabilization

- review logs daily
- review user feedback daily
- avoid non-critical feature deployments
- track all issues with correlation IDs where available
- keep backup verification current
