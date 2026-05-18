PET CARE TRACKER V3 - PET BASED MILEAGE

This version changes mileage logic so it is no longer based on service defaults.

Main changes:
- Service records no longer show or use default mileage.
- Saved service options no longer show or use default mileage.
- Each pet now has a default mileage field.
- Owner default mileage remains as a fallback.
- When scheduling a visit, mileage fills from selected pet default mileage first.
- For multi-pet visits, the app uses the highest selected pet mileage once, not multiplied by pet count.
- If selected pets have no default mileage, the app uses the owner's default mileage.
- The visit mileage can still be manually overridden.
- Completing a visit no longer creates a travel/mileage entry automatically.
- Office > Travel now tracks actual daily mileage separately.
- Office > Travel compares actual daily mileage against assigned completed-visit mileage.

Database note:
If you already ran the V1/V2 schema, run PET_CARE_V3_MILEAGE_MIGRATION.sql once in Supabase.
If this is a brand new install, PET_CARE_DATABASE_SCHEMA.sql already includes pet_pets.default_mileage.

Keep your existing .env.local file. Do not replace it from this zip.

Install/run:
npm install
npm run dev
