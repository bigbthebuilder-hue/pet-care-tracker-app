create extension if not exists "pgcrypto";

create table if not exists pet_owners (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  name text not null default '',
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  invoice_email text not null default '',
  emergency_contact_name text not null default '',
  emergency_contact_phone text not null default '',
  access_instructions text not null default '',
  house_instructions text not null default '',
  payment_notes text not null default '',
  billing_notes text not null default '',
  default_mileage numeric not null default 0,
  notes text not null default '',
  is_active boolean not null default true
);

create table if not exists pet_pets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  owner_id uuid references pet_owners(id) on delete cascade,
  name text not null default '',
  species text not null default '',
  breed text not null default '',
  color_description text not null default '',
  birthdate date,
  age_text text not null default '',
  weight text not null default '',
  sex text not null default '',
  spayed_neutered text not null default '',
  photo_url text not null default '',
  feeding_instructions text not null default '',
  medication_instructions text not null default '',
  medical_conditions text not null default '',
  allergies text not null default '',
  vet_name text not null default '',
  vet_phone text not null default '',
  emergency_vet text not null default '',
  emergency_instructions text not null default '',
  behavior_notes text not null default '',
  leash_harness_notes text not null default '',
  favorite_things text not null default '',
  hide_spots text not null default '',
  care_notes text not null default '',
  default_mileage numeric not null default 0,
  is_active boolean not null default true
);

create table if not exists pet_services (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  name text not null default '',
  category text not null default '',
  default_duration_minutes integer not null default 30,
  base_price numeric not null default 0,
  extra_pet_price numeric not null default 0,
  taxable boolean not null default false,
  description text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists pet_service_checklist_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  service_id uuid references pet_services(id) on delete cascade,
  label text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table if not exists pet_pet_checklist_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  pet_id uuid references pet_pets(id) on delete cascade,
  label text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table if not exists pet_saved_service_options (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  owner_id uuid references pet_owners(id) on delete cascade,
  pet_id uuid references pet_pets(id) on delete cascade,
  service_id uuid references pet_services(id) on delete set null,
  option_name text not null default '',
  default_duration_minutes integer not null default 30,
  default_price numeric not null default 0,
  default_checklist_notes text not null default '',
  default_visit_notes text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists pet_visits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  owner_id uuid references pet_owners(id) on delete set null,
  primary_pet_id uuid references pet_pets(id) on delete set null,
  service_id uuid references pet_services(id) on delete set null,
  saved_option_id uuid references pet_saved_service_options(id) on delete set null,
  visit_date date not null,
  scheduled_start_time time,
  scheduled_end_time time,
  actual_start_time timestamptz,
  actual_end_time timestamptz,
  duration_minutes integer not null default 30,
  status text not null default 'Scheduled',
  base_price numeric not null default 0,
  extra_pet_fees numeric not null default 0,
  travel_fee numeric not null default 0,
  add_on_fees numeric not null default 0,
  gst_amount numeric not null default 0,
  total_amount numeric not null default 0,
  mileage numeric not null default 0,
  is_paid boolean not null default false,
  paid_at timestamptz,
  payment_method text not null default '',
  payment_notes text not null default '',
  completion_notes text not null default '',
  internal_notes text not null default '',
  incident_notes text not null default '',
  owner_update_sent boolean not null default false,
  medication_given boolean not null default false,
  feeding_completed boolean not null default false,
  water_refreshed boolean not null default false,
  door_locked boolean not null default false,
  completed_at timestamptz,
  cancelled_at timestamptz
);

create table if not exists pet_visit_pets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  visit_id uuid references pet_visits(id) on delete cascade,
  pet_id uuid references pet_pets(id) on delete cascade
);

create table if not exists pet_visit_checklist_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  visit_id uuid references pet_visits(id) on delete cascade,
  label text not null default '',
  is_done boolean not null default false,
  sort_order integer not null default 0
);

create table if not exists pet_travel (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  travel_date date not null,
  owner_id uuid references pet_owners(id) on delete set null,
  visit_id uuid references pet_visits(id) on delete set null,
  mileage numeric not null default 0,
  notes text not null default ''
);

create table if not exists pet_business_settings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  business_name text not null default 'Pet Care',
  business_phone text not null default '',
  business_email text not null default '',
  default_email text not null default '',
  tax_number text not null default '',
  business_notes text not null default '',
  charge_gst boolean not null default false,
  gst_rate numeric not null default 5
);

create table if not exists pet_deleted_items (
  id uuid primary key default gen_random_uuid(),
  deleted_at timestamptz not null default now(),
  item_type text not null default '',
  original_id uuid,
  item_label text not null default '',
  payload jsonb not null default '{}'::jsonb
);

insert into pet_services (name, category, default_duration_minutes, base_price, extra_pet_price, taxable, sort_order, description)
select * from (values
  ('Dog walk — 30 min', 'Dog Walk', 30, 25, 5, false, 10, 'Standard 30 minute dog walk'),
  ('Dog walk — 60 min', 'Dog Walk', 60, 40, 8, false, 20, 'Longer 60 minute dog walk'),
  ('Drop-in visit — 15 min', 'Drop-in', 15, 18, 3, false, 30, 'Quick check-in visit'),
  ('Drop-in visit — 30 min', 'Drop-in', 30, 25, 5, false, 40, 'Standard drop-in visit'),
  ('Walk + feeding', 'Combo', 45, 35, 5, false, 50, 'Walk plus feeding/check-in'),
  ('Pet sitting — hourly', 'Pet Sitting', 60, 35, 5, false, 60, 'Hourly sitting'),
  ('Overnight sitting', 'Overnight', 720, 90, 10, false, 70, 'Overnight pet sitting'),
  ('Medication visit', 'Medical', 15, 20, 0, false, 80, 'Medication-only visit'),
  ('House check', 'House Check', 15, 18, 0, false, 90, 'Basic house check'),
  ('Custom service', 'Custom', 30, 0, 0, false, 100, 'Manual custom service')
) as seed(name, category, default_duration_minutes, base_price, extra_pet_price, taxable, sort_order, description)
where not exists (select 1 from pet_services);

insert into pet_service_checklist_items (service_id, label, sort_order)
select s.id, x.label, x.sort_order
from pet_services s
join (values
  ('Dog Walk', 'Leash/harness secured', 10),
  ('Dog Walk', 'Walk completed', 20),
  ('Dog Walk', 'Water refreshed', 30),
  ('Dog Walk', 'Paw check', 40),
  ('Dog Walk', 'Door locked', 50),
  ('Drop-in', 'Food/water checked', 10),
  ('Drop-in', 'Litter/accident check', 20),
  ('Drop-in', 'Medication checked if required', 30),
  ('Drop-in', 'Door locked', 40),
  ('Combo', 'Walk completed', 10),
  ('Combo', 'Feeding completed', 20),
  ('Combo', 'Water refreshed', 30),
  ('Combo', 'Door locked', 40),
  ('Medical', 'Medication given', 10),
  ('Medical', 'Pet monitored for issues', 20),
  ('Medical', 'Owner update sent', 30),
  ('Overnight', 'Evening care completed', 10),
  ('Overnight', 'Morning care completed', 20),
  ('Overnight', 'House secured', 30),
  ('House Check', 'House checked', 10),
  ('House Check', 'Door locked', 20)
) x(category, label, sort_order) on s.category = x.category
where not exists (select 1 from pet_service_checklist_items);

insert into pet_business_settings (business_name)
select 'Pet Care'
where not exists (select 1 from pet_business_settings);


-- V3 migration safety: existing V1/V2 databases need this added to pet_pets.
alter table if exists pet_pets add column if not exists default_mileage numeric not null default 0;
