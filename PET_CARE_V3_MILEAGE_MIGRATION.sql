-- Run this once if you already created the V1/V2 pet-care database schema.
-- It adds pet-level default mileage.
-- Service-level mileage fields may remain in the database, but V3 no longer uses them in the app.

alter table if exists pet_pets
add column if not exists default_mileage numeric not null default 0;
