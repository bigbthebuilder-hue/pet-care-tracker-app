-- PET_CARE_V4_PAYMENT_TRACKING_MIGRATION.sql
-- Run once in Supabase SQL Editor after V3.
-- Adds payment tracking fields to pet_visits.

alter table if exists pet_visits
  add column if not exists paid_at timestamptz,
  add column if not exists payment_method text not null default '',
  add column if not exists payment_notes text not null default '';

create index if not exists idx_pet_visits_is_paid on pet_visits(is_paid);
create index if not exists idx_pet_visits_paid_at on pet_visits(paid_at);
