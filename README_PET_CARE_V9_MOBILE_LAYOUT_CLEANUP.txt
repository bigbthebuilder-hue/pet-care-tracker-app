PET CARE TRACKER V9 - MOBILE LAYOUT CLEANUP

Purpose:
This update focuses on phone usability only. No database migration is needed.

Changes:
- Removes the visible development version label from the live app header.
- Narrows and centers the app for phone-first use.
- Removes side-by-side Owners layout on mobile-sized screens.
- Prevents horizontal overflow on owner/detail panels.
- Makes owner, pet, billing, and visit rows stack instead of squeezing into columns.
- Simplifies Add/Edit Owner into quick fields plus collapsed advanced sections.
- Simplifies Add/Edit Pet into quick fields plus collapsed Care, Medical/Behavior, and Vet sections.
- Makes bottom navigation smaller and more phone-friendly.
- Makes Office sub-tabs a two-column grid on phone.
- Forces inputs/selects/textareas to full width so forms do not spill sideways.

No Supabase SQL migration required.
Keep your existing .env.local.
