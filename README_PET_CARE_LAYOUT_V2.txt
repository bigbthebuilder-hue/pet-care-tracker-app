PET CARE LAYOUT V2 - GROUPED TABS / SERVICE-RATE BASED

Replace your current app files with this package, but keep your existing .env.local.

Important changes:
- Owners screen is now grouped into owner sub-tabs:
  Owner Info, Pets, Saved Services, Visits, Billing.
- Pet details are grouped into pet sub-tabs:
  Profile, Care, Emergency, Checklist, History.
- Giant all-fields-at-once owner/pet view has been removed.
- Forms show only when adding or editing.
- Visits are service-rate based, not timer-rate based.
- A visit can be marked Complete without using Start.
- Start is now labelled Optional Start and only changes status to In Progress.
- Actual start/end time does not change visit pricing.
- Saved service options are templates only. They do not auto-schedule visits.

Database:
This uses the same new pet-care table model from V1:
pet_owners, pet_pets, pet_services, pet_service_checklist_items, pet_pet_checklist_items, pet_saved_service_options, pet_visits, pet_visit_pets, pet_visit_checklist_items, pet_travel, pet_business_settings, pet_deleted_items.

If you already ran PET_CARE_DATABASE_SCHEMA.sql from V1, you do not need to run it again.
