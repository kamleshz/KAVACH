# Staging And UAT Checklist

Use this checklist before any limited pilot or full production rollout.

Supporting template:

- `UAT_SIGNOFF_TEMPLATE.md`

## Environment Setup

- Confirm staging uses a separate MongoDB database
- Confirm staging frontend URL is different from production
- Confirm staging backend has valid `FRONTEND_URL`, `MONGODB_URI`, `MAIL_*`, `SECRET_KEY_*`
- Confirm `REDIS_URL` is configured if report queue behavior must match production
- Confirm `SENTRY_DSN` points to a staging project or environment
- Confirm PDF worker is running in staging

## Pre-UAT Technical Checks

Run:

```bash
npm run build
npm run smoke
npm --prefix server run preflight:prod
```

Expected result:

- build passes
- smoke passes
- preflight passes with staging/production-like values

## Test Users

Prepare these users before UAT:

- 1 admin user
- 1 assigned auditor/user
- 1 business operator for client data entry

Suggested access coverage:

- admin tests assignment, delete, reporting, monitoring access
- auditor tests assigned-client workflows
- operator tests daily data entry and report consumption

## Test Data

Prepare staging data with:

- at least 3 clients in Plastic Waste
- at least 1 client in E-Waste
- at least 1 client in Battery Waste
- optional clients in ELV and Used Oil if those modules are live
- one Brand Owner record with SKU-wise summary data
- one client with Supplier CTO entries
- one client with report-ready plant process data

## UAT Flow 1: Authentication

- register user
- verify OTP
- login
- logout
- refresh protected session
- forgot password
- reset password

Expected:

- cookies work correctly
- OTP errors are handled clearly
- invalid credentials do not expose sensitive details

## UAT Flow 2: Client Management

- create client
- edit client
- assign client to another user
- verify assignee sees the correct client
- verify unauthorized user cannot access another client by URL
- delete a non-critical test client as admin

Expected:

- no save failures
- no duplicate or corrupted records
- permissions are enforced

## UAT Flow 3: Dashboard And Client Portfolios

- open dashboard home
- open KPI dashboard
- open Plastic Waste portfolio
- open E-Waste portfolio
- verify other waste tabs do not appear where they should be filtered out
- verify sidebar highlights the correct section

Expected:

- counts look correct
- navigation state is correct
- filters and pagination work consistently

## UAT Flow 4: Client Connect

- load client connect list
- use search filters
- open client connect detail
- verify summary values are not zero when data exists
- verify drill-down screens load without runtime errors

Expected:

- no blank screens
- no stale or obviously wrong totals
- data aligns with the current client state

## UAT Flow 5: Plant Process And Supplier CTO

- open Plant Process for a test client
- save monthly procurement
- save recycled content values
- save Supplier CTO rows with blank and filled date combinations
- refresh page and confirm all expected supplier rows still appear
- verify date inputs show `yyyy-MM-dd` correctly

Expected:

- no 400 validation errors on valid user input
- all supplier rows remain visible after refresh
- blank CTO dates do not break saves

## UAT Flow 6: Summary And Analytics

- open summary tab
- verify category-wise recycled percentages
- verify tiny values like `0.05%` remain visible in progress bars
- verify labels such as `0.05% / 99.95%`
- verify industry summary and SKU-wise summary render for Brand Owner

Expected:

- calculations match business expectation
- progress bars visually match displayed percentages
- no runtime crashes

## UAT Flow 7: Reports And PDFs

- queue plastic compliance report
- queue plastic summary report
- monitor report status until complete
- download both reports
- verify index page, company info, summary sections, and Supplier CTO table
- verify a different logged-in user cannot access another user’s report job URL

Expected:

- reports complete successfully
- layout is correct
- report ownership is enforced

## UAT Defect Rules

- mark any issue blocking save, login, report generation, or data correctness as `Critical`
- mark any permission leak as `Critical`
- mark any PDF layout defect affecting legal/business output as `High`
- mark cosmetic-only issues as `Low`

## UAT Exit Criteria

- zero open `Critical` defects
- zero known permission leaks
- zero data-loss issues
- all report types verified by business users
- sign-off captured from admin and business owner

After completion:

- fill `UAT_SIGNOFF_TEMPLATE.md`
