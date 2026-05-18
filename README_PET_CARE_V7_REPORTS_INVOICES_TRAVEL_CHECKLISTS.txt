PET CARE V7 - REPORTS, INVOICES, TRAVEL, CHECKLISTS

No Supabase migration is required for this update.

Changes:
- Fixed Travel / Mileage so owner is optional and blank owner no longer causes UUID errors.
- Added mileage purpose options for general business mileage, supplies, car wash, vet/emergency, owner visit, and other.
- Removed Sort Order from the visible Services form. Sort order still exists in the database only for display ordering.
- Added editable service checklist management. Select a service, then add/remove checklist items for that service.
- Added print/email buttons in Reports.
- Added owner invoice/statement print and email buttons in Owner > Billing.
- Fixed paid visit billing row layout so dates, dollar amounts, and paid dates do not overlap.
- Mark Paid remains available on completed visit cards in Today, Schedule, Owner Billing, and Reports.

Install:
1. Replace app files with this package.
2. Keep your existing .env.local file.
3. Run:
   Ctrl + C
   npm install
   npm run dev
