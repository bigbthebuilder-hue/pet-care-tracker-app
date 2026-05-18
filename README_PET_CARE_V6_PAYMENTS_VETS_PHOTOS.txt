PET CARE V6 - PAYMENTS, VETS, PHOTOS, AND SAFER DELETES

Before replacing files, run this SQL file once in Supabase:

PET_CARE_V6_VETS_PHOTOS_PAYMENTS_MIGRATION.sql

What changed:

1. Repeat recent service is only part of the Schedule workflow.
   - It was removed from Owners/Pet info cards.
   - In Schedule, choose an owner and use recent owner visits as templates.

2. Pet photos can now be added from camera/gallery.
   - Pet form has an Add photo from camera/gallery button.
   - The image is saved into the photo_url field as a data URL for this version.
   - Later this can be upgraded to Supabase Storage if needed.

3. Vet clinics are now entered once and reused.
   - New Office > Vets tab.
   - Pet profile has a Vet Clinic dropdown.
   - Pet profile also has quick-add vet clinic fields.
   - Current-service emergency pet info shows clinic phone, address, and emergency/after-hours phone.

4. Pet birthdate was removed from the UI.
   - Age remains as the useful field.
   - The database birthdate column is not removed, but the app no longer asks for it.

5. Delete buttons now use an in-app confirmation modal.
   - Owners and pets require typing the exact name.
   - This avoids accidental deletion and avoids browser prompt issues in VS Code/browser previews.

6. Mark Paid now uses an in-app payment modal instead of browser prompts.
   - Works from Today, Schedule, Owner Billing, and Office Reports.
   - Completed visits in Schedule now show in a Recently Completed Visits section so they can be marked paid there.

Keep your existing .env.local file.

After replacing files:

Ctrl + C
npm install
npm run dev
