PET CARE TRACKER V4 - PAYMENT TRACKING

This version adds payment controls to completed visits.

New behavior:
- Completed visits can be marked Paid or Unpaid.
- Paid visits store paid_at, payment_method, and payment_notes.
- Owner > Billing now shows unpaid visits, paid visits, totals, and bulk mark-selected-paid.
- Office > Reports > Unpaid Completed Visits includes Mark Paid buttons.
- Visit cards show Paid/Unpaid status and quick Mark Paid/Mark Unpaid actions.
- Completing a visit can also mark it paid immediately.

Required database step if you already ran V3:
1. Open Supabase SQL Editor.
2. Run PET_CARE_V4_PAYMENT_TRACKING_MIGRATION.sql once.

Install/update steps:
1. Replace the app files with this package.
2. Keep your existing .env.local.
3. Run:
   npm install
   npm run dev

Build check completed successfully before packaging.
