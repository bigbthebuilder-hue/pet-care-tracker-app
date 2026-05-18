PET CARE TRACKER - BIG CONVERSION V1

This build uses the new pet-care data model:

pet_owners
pet_pets
pet_services
pet_service_checklist_items
pet_pet_checklist_items
pet_saved_service_options
pet_visits
pet_visit_pets
pet_visit_checklist_items
pet_travel
pet_business_settings
pet_deleted_items

Main tabs:
Today
Schedule
Owners
Office

Office tabs:
Reports
Services
Travel
Settings
Deleted

Before replacing App.jsx, run PET_CARE_DATABASE_SCHEMA.sql in Supabase SQL Editor.
Keep your existing .env.local in the root of the app folder.
Then replace src/App.jsx with this App.jsx.

This version does not use the original cleaning tables.
