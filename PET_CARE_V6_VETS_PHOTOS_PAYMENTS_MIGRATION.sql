-- PET CARE V6 MIGRATION
-- Adds shared vet clinic records and links pets to a clinic.
-- Run this once in Supabase before using V6.

create extension if not exists "pgcrypto";

create table if not exists pet_vet_clinics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  clinic_name text not null default '',
  phone text not null default '',
  emergency_phone text not null default '',
  email text not null default '',
  address text not null default '',
  notes text not null default '',
  is_active boolean not null default true
);

alter table if exists pet_pets
  add column if not exists vet_clinic_id uuid references pet_vet_clinics(id) on delete set null;

-- Birthdate is intentionally no longer used by the app UI.
-- The existing birthdate column is left in place to avoid disrupting existing schemas.
