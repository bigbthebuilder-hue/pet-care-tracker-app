import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

const VERSION = "PET_CARE_V15_PHONE_FIRST_VISUAL_REBUILD";
const TABS = ["Today", "Schedule", "Owners", "Office"];
const OFFICE_TABS = ["Reports", "Services", "Vets", "Travel", "Settings", "Deleted"];
const STATUSES = ["Scheduled", "In Progress", "Completed", "Cancelled", "Missed"];

const blankOwner = {
  name: "", address: "", phone: "", email: "", invoice_email: "",
  emergency_contact_name: "", emergency_contact_phone: "", access_instructions: "",
  house_instructions: "", payment_notes: "", billing_notes: "",
  notes: "", is_active: true,
};
const blankPet = {
  owner_id: "", name: "", species: "Dog", breed: "", color_description: "", vet_clinic_id: "",
  age_text: "", weight: "", sex: "", spayed_neutered: "", photo_url: "",
  feeding_instructions: "", medication_instructions: "", medical_conditions: "", allergies: "",
  vet_name: "", vet_phone: "", emergency_vet: "", emergency_instructions: "",
  behavior_notes: "", leash_harness_notes: "", favorite_things: "", hide_spots: "", care_notes: "",
  is_active: true,
};
const blankService = {
  name: "", category: "Dog Walk", default_duration_minutes: 30, base_price: 0, extra_pet_price: 0,
  taxable: false, description: "", is_active: true, sort_order: 0,
};
const blankOption = {
  owner_id: "", pet_id: "", service_id: "", option_name: "", default_duration_minutes: 30,
  default_price: 0, default_checklist_notes: "", default_visit_notes: "",
  is_active: true, sort_order: 0,
};
const blankVisit = {
  owner_id: "", primary_pet_id: "", service_id: "", saved_option_id: "", visit_date: todayISO(),
  scheduled_start_time: "09:00", duration_minutes: 30, status: "Scheduled", base_price: 0,
  extra_pet_fees: 0, travel_fee: 0, add_on_fees: 0, gst_amount: 0, total_amount: 0,
  mileage: 0, is_paid: false, paid_at: null, payment_method: "", payment_notes: "", completion_notes: "", internal_notes: "", incident_notes: "",
  owner_update_sent: false, medication_given: false, feeding_completed: false, water_refreshed: false, door_locked: false,
};

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addMinutes(time, minutes) {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  const d = new Date(2000, 0, 1, h || 0, m || 0);
  d.setMinutes(d.getMinutes() + Number(minutes || 0));
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function money(n) { return `$${Number(n || 0).toFixed(2)}`; }
function num(n) { const x = Number(n || 0); return Number.isFinite(x) ? x : 0; }
function niceDate(iso) { if (!iso) return ""; const [y,m,d] = iso.split("-"); return `${m}/${d}/${y}`; }
function timeLabel(value) {
  if (!value) return "";
  const [hRaw, mRaw] = String(value).split(":");
  let h = Number(hRaw || 0);
  const m = Number(mRaw || 0);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2,"0")} ${suffix}`;
}
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  const value = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
  return { value, label: timeLabel(value) };
});
function nowIso() { return new Date().toISOString(); }
function byName(a, b) { return (a.name || "").localeCompare(b.name || ""); }
function visitSort(a,b) { return `${a.visit_date || ""} ${a.scheduled_start_time || ""}`.localeCompare(`${b.visit_date || ""} ${b.scheduled_start_time || ""}`); }
function splitLines(text) { return String(text || "").split(/\r?\n/).map(x => x.trim()).filter(Boolean); }
function tableError(err) { return err?.message || String(err || "Unknown error"); }

function defaultMileageForPetIds(petIds, pets, owner) {
  const petMiles = (petIds || [])
    .map(id => pets.find(p => p.id === id))
    .filter(Boolean)
    .map(p => num(p.default_mileage))
    .filter(m => m > 0);
  if (petMiles.length) return Math.max(...petMiles);
  return num(owner?.default_mileage);
}


export default function App() {
  const [tab, setTab] = useState("Today");
  const [officeTab, setOfficeTab] = useState("Reports");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const [owners, setOwners] = useState([]);
  const [pets, setPets] = useState([]);
  const [services, setServices] = useState([]);
  const [serviceChecklist, setServiceChecklist] = useState([]);
  const [petChecklist, setPetChecklist] = useState([]);
  const [options, setOptions] = useState([]);
  const [visits, setVisits] = useState([]);
  const [visitPets, setVisitPets] = useState([]);
  const [visitChecklist, setVisitChecklist] = useState([]);
  const [travel, setTravel] = useState([]);
  const [vetClinics, setVetClinics] = useState([]);
  const [settings, setSettings] = useState(null);
  const [deleted, setDeleted] = useState([]);

  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [selectedPetId, setSelectedPetId] = useState("");
  const [petInfoId, setPetInfoId] = useState("");
  const [completeVisitId, setCompleteVisitId] = useState("");
  const [paymentVisitId, setPaymentVisitId] = useState("");
  const [deleteRequest, setDeleteRequest] = useState(null);

  const selectedOwner = owners.find(o => o.id === selectedOwnerId) || null;
  const selectedPet = pets.find(p => p.id === selectedPetId) || null;
  const infoPet = pets.find(p => p.id === petInfoId) || null;
  const completingVisit = visits.find(v => v.id === completeVisitId) || null;
  const paymentVisit = visits.find(v => v.id === paymentVisitId) || null;

  const ownerMap = useMemo(() => Object.fromEntries(owners.map(o => [o.id, o])), [owners]);
  const petMap = useMemo(() => Object.fromEntries(pets.map(p => [p.id, p])), [pets]);
  const serviceMap = useMemo(() => Object.fromEntries(services.map(s => [s.id, s])), [services]);

  useEffect(() => { loadAll(); }, []);

  function scrollToTopNow() {
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  function changeMainTab(nextTab) {
    setTab(nextTab);
    scrollToTopNow();
  }

  async function loadAll() {
    setLoading(true); setError("");
    try {
      const calls = await Promise.all([
        supabase.from("pet_owners").select("*").order("name"),
        supabase.from("pet_pets").select("*").order("name"),
        supabase.from("pet_services").select("*").order("sort_order", { ascending: true }).order("name"),
        supabase.from("pet_service_checklist_items").select("*").order("sort_order"),
        supabase.from("pet_pet_checklist_items").select("*").order("sort_order"),
        supabase.from("pet_saved_service_options").select("*").order("sort_order"),
        supabase.from("pet_visits").select("*").order("visit_date", { ascending: true }).order("scheduled_start_time", { ascending: true }),
        supabase.from("pet_visit_pets").select("*"),
        supabase.from("pet_visit_checklist_items").select("*").order("sort_order"),
        supabase.from("pet_travel").select("*").order("travel_date", { ascending: false }),
        supabase.from("pet_vet_clinics").select("*").order("clinic_name"),
        supabase.from("pet_business_settings").select("*").limit(1),
        supabase.from("pet_deleted_items").select("*").order("deleted_at", { ascending: false }).limit(100),
      ]);
      const bad = calls.find(x => x.error);
      if (bad) throw bad.error;
      setOwners(calls[0].data || []); setPets(calls[1].data || []); setServices(calls[2].data || []);
      setServiceChecklist(calls[3].data || []); setPetChecklist(calls[4].data || []); setOptions(calls[5].data || []);
      setVisits(calls[6].data || []); setVisitPets(calls[7].data || []); setVisitChecklist(calls[8].data || []);
      setTravel(calls[9].data || []); setVetClinics(calls[10].data || []); setSettings((calls[11].data || [])[0] || null); setDeleted(calls[12].data || []);
      if (!selectedOwnerId && calls[0].data?.[0]) setSelectedOwnerId(calls[0].data[0].id);
    } catch (e) { setError(tableError(e)); }
    setLoading(false);
  }
  async function saveRow(table, row, label = "Saved") {
    setSaving(true); setError("");
    try {
      const noUpdatedAtTables = new Set(["pet_service_checklist_items", "pet_pet_checklist_items", "pet_visit_checklist_items", "pet_travel"]);
      const clean = noUpdatedAtTables.has(table) ? { ...row } : { ...row, updated_at: nowIso() };
      Object.keys(clean).forEach(k => clean[k] === "" && ["birthdate", "service_id", "saved_option_id", "primary_pet_id", "vet_clinic_id", "owner_id", "visit_id"].includes(k) ? clean[k] = null : null);
      const q = clean.id ? supabase.from(table).update(clean).eq("id", clean.id).select().single() : supabase.from(table).insert(clean).select().single();
      const { error: err } = await q;
      if (err) throw err;
      setToast(label); await loadAll();
    } catch (e) { setError(tableError(e)); }
    setSaving(false);
  }

  async function saveServiceWithChecklist(service, draftItems = []) {
    setSaving(true); setError("");
    try {
      const cleanService = { ...service, updated_at: nowIso() };
      const serviceQuery = cleanService.id
        ? supabase.from("pet_services").update(cleanService).eq("id", cleanService.id).select().single()
        : supabase.from("pet_services").insert(cleanService).select().single();
      const { data: savedService, error: serviceErr } = await serviceQuery;
      if (serviceErr) throw serviceErr;
      const serviceId = savedService?.id || cleanService.id;
      if (serviceId) {
        const cleanedItems = (draftItems || [])
          .map((item, idx) => ({ service_id: serviceId, label: String(item.label || "").trim(), sort_order: (idx + 1) * 10, is_active: item.is_active !== false }))
          .filter(item => item.label);
        const { error: delErr } = await supabase.from("pet_service_checklist_items").delete().eq("service_id", serviceId);
        if (delErr) throw delErr;
        if (cleanedItems.length) {
          const { error: insertErr } = await supabase.from("pet_service_checklist_items").insert(cleanedItems);
          if (insertErr) throw insertErr;
        }
      }
      setToast("Service saved"); await loadAll();
    } catch (e) { setError(tableError(e)); }
    setSaving(false);
  }

  function requestDelete(table, row, type, label) {
    if (!row?.id) return;
    setDeleteRequest({ table, row, type, label: label || row.name || type || "item", typed: "" });
  }
  async function deleteSoft(table, row, type, label) {
    if (!row?.id) return;
    const safeLabel = label || type || "item";
    setSaving(true);
    try {
      await supabase.from("pet_deleted_items").insert({ item_type: type, original_id: row.id, item_label: safeLabel, payload: row });
      const { error: err } = await supabase.from(table).delete().eq("id", row.id);
      if (err) throw err;
      setDeleteRequest(null);
      setToast("Deleted"); await loadAll();
    } catch (e) { setError(tableError(e)); }
    setSaving(false);
  }
  async function hardDeleteDeleted(id) {
    if (!confirm("Remove this deleted record from the deleted list?")) return;
    await supabase.from("pet_deleted_items").delete().eq("id", id); await loadAll();
  }

  async function createChecklistForVisit(visitId, petIds, serviceId, optionId) {
    const items = [];
    serviceChecklist.filter(i => i.service_id === serviceId && i.is_active).forEach(i => items.push(i.label));
    petIds.forEach(pid => petChecklist.filter(i => i.pet_id === pid && i.is_active).forEach(i => items.push(i.label)));
    const opt = options.find(o => o.id === optionId);
    splitLines(opt?.default_checklist_notes).forEach(x => items.push(x));
    const unique = [...new Set(items.map(x => x.trim()).filter(Boolean))];
    if (unique.length) await supabase.from("pet_visit_checklist_items").insert(unique.map((label, idx) => ({ visit_id: visitId, label, sort_order: (idx + 1) * 10 })));
  }

  async function addVisitFromForm(form, selectedPetIds) {
    setSaving(true); setError("");
    try {
      const service = services.find(s => s.id === form.service_id);
      const option = options.find(o => o.id === form.saved_option_id);
      const owner = owners.find(o => o.id === form.owner_id);
      const duration = num(form.duration_minutes || option?.default_duration_minutes || service?.default_duration_minutes || 30);
      const base = num(form.base_price || option?.default_price || service?.base_price);
      const extra = Math.max(0, selectedPetIds.length - 1) * num(service?.extra_pet_price);
      const mileage = form.mileage === "" || form.mileage === null || form.mileage === undefined ? defaultMileageForPetIds(selectedPetIds, pets, owner) : num(form.mileage);
      const gst = settings?.charge_gst ? (base + extra + num(form.travel_fee) + num(form.add_on_fees)) * num(settings.gst_rate) / 100 : 0;
      const total = base + extra + num(form.travel_fee) + num(form.add_on_fees) + gst;
      const row = {
        owner_id: form.owner_id, primary_pet_id: selectedPetIds[0] || null, service_id: form.service_id || null,
        saved_option_id: form.saved_option_id || null, visit_date: form.visit_date || todayISO(),
        scheduled_start_time: form.scheduled_start_time || null, scheduled_end_time: addMinutes(form.scheduled_start_time, duration),
        duration_minutes: duration, status: "Scheduled", base_price: base, extra_pet_fees: extra,
        travel_fee: num(form.travel_fee), add_on_fees: num(form.add_on_fees), gst_amount: gst, total_amount: total,
        mileage, is_paid: false, internal_notes: form.internal_notes || option?.default_visit_notes || "", completion_notes: "", incident_notes: "",
      };
      const { data, error: err } = await supabase.from("pet_visits").insert(row).select().single();
      if (err) throw err;
      if (selectedPetIds.length) await supabase.from("pet_visit_pets").insert(selectedPetIds.map(pet_id => ({ visit_id: data.id, pet_id })));
      await createChecklistForVisit(data.id, selectedPetIds, form.service_id, form.saved_option_id);
      setToast("Visit scheduled"); await loadAll();
    } catch (e) { setError(tableError(e)); }
    setSaving(false);
  }

  async function updateVisitFromForm(visitId, form, selectedPetIds) {
    if (!visitId) return;
    setSaving(true); setError("");
    try {
      const service = services.find(s => s.id === form.service_id);
      const option = options.find(o => o.id === form.saved_option_id);
      const duration = num(form.duration_minutes || option?.default_duration_minutes || service?.default_duration_minutes || 30);
      const base = num(form.base_price || option?.default_price || service?.base_price);
      const extra = Math.max(0, selectedPetIds.length - 1) * num(service?.extra_pet_price);
      const gst = settings?.charge_gst ? (base + extra + num(form.travel_fee) + num(form.add_on_fees)) * num(settings.gst_rate) / 100 : 0;
      const total = base + extra + num(form.travel_fee) + num(form.add_on_fees) + gst;
      const row = {
        owner_id: form.owner_id, primary_pet_id: selectedPetIds[0] || null, service_id: form.service_id || null,
        saved_option_id: form.saved_option_id || null, visit_date: form.visit_date || todayISO(),
        scheduled_start_time: form.scheduled_start_time || null, scheduled_end_time: addMinutes(form.scheduled_start_time, duration),
        duration_minutes: duration, base_price: base, extra_pet_fees: extra, travel_fee: num(form.travel_fee),
        add_on_fees: num(form.add_on_fees), gst_amount: gst, total_amount: total, mileage: num(form.mileage),
        internal_notes: form.internal_notes || option?.default_visit_notes || "", updated_at: nowIso(),
      };
      const { error: err } = await supabase.from("pet_visits").update(row).eq("id", visitId);
      if (err) throw err;
      await supabase.from("pet_visit_pets").delete().eq("visit_id", visitId);
      if (selectedPetIds.length) await supabase.from("pet_visit_pets").insert(selectedPetIds.map(pet_id => ({ visit_id: visitId, pet_id })));
      await supabase.from("pet_visit_checklist_items").delete().eq("visit_id", visitId);
      await createChecklistForVisit(visitId, selectedPetIds, form.service_id, form.saved_option_id);
      setToast("Visit rescheduled"); await loadAll();
    } catch (e) { setError(tableError(e)); }
    setSaving(false);
  }

  async function repeatLastVisit(petId) {
    const last = visits
      .filter(v => visitPets.some(vp => vp.visit_id === v.id && vp.pet_id === petId) || v.primary_pet_id === petId)
      .filter(v => v.status === "Completed" || v.status === "Scheduled")
      .sort((a,b) => `${b.visit_date} ${b.scheduled_start_time || ""}`.localeCompare(`${a.visit_date} ${a.scheduled_start_time || ""}`))[0];
    if (!last) { setError("No previous service found for this pet."); return; }
    const petIds = visitPets.filter(vp => vp.visit_id === last.id).map(vp => vp.pet_id);
    await addVisitFromForm({
      owner_id: last.owner_id, service_id: last.service_id, saved_option_id: last.saved_option_id,
      visit_date: todayISO(), scheduled_start_time: "09:00", duration_minutes: last.duration_minutes,
      base_price: last.base_price, mileage: last.mileage, travel_fee: last.travel_fee, add_on_fees: last.add_on_fees,
      internal_notes: last.internal_notes,
    }, petIds.length ? petIds : [petId]);
  }

  async function repeatVisitTemplate(visitId) {
    const last = visits.find(v => v.id === visitId);
    if (!last) { setError("Previous visit not found."); return; }
    const petIds = visitPets.filter(vp => vp.visit_id === last.id).map(vp => vp.pet_id);
    await addVisitFromForm({
      owner_id: last.owner_id, service_id: last.service_id, saved_option_id: last.saved_option_id,
      visit_date: todayISO(), scheduled_start_time: last.scheduled_start_time || "09:00", duration_minutes: last.duration_minutes,
      base_price: last.base_price, mileage: last.mileage, travel_fee: last.travel_fee, add_on_fees: last.add_on_fees,
      internal_notes: last.internal_notes,
    }, petIds.length ? petIds : (last.primary_pet_id ? [last.primary_pet_id] : []));
  }

  async function startVisit(id) {
    await saveVisitPatch(id, { status: "In Progress", actual_start_time: nowIso() }, "Visit started");
  }
  async function markCancelled(id) {
    await saveVisitPatch(id, { status: "Cancelled", cancelled_at: nowIso() }, "Visit cancelled");
  }
  function markVisitPaid(id) {
    setPaymentVisitId(id);
  }
  async function savePayment(id, method, notes) {
    await saveVisitPatch(id, { is_paid: true, paid_at: nowIso(), payment_method: method || "E-transfer", payment_notes: notes || "" }, "Visit marked paid");
    setPaymentVisitId("");
  }
  async function markVisitUnpaid(id) {
    if (!confirm("Mark this visit unpaid?")) return;
    await saveVisitPatch(id, { is_paid: false, paid_at: null, payment_method: "", payment_notes: "" }, "Visit marked unpaid");
  }
  async function markManyVisitsPaid(ids) {
    const selected = (ids || []).filter(Boolean);
    if (!selected.length) { setError("No visits selected."); return; }
    setSaving(true); setError("");
    try {
      const { error: err } = await supabase.from("pet_visits").update({ is_paid: true, paid_at: nowIso(), payment_method: "E-transfer", payment_notes: "Bulk marked paid", updated_at: nowIso() }).in("id", selected);
      if (err) throw err;
      setToast("Selected visits marked paid"); await loadAll();
    } catch (e) { setError(tableError(e)); }
    setSaving(false);
  }
  async function saveVisitPatch(id, patch, label) {
    setSaving(true); setError("");
    try {
      const { error: err } = await supabase.from("pet_visits").update({ ...patch, updated_at: nowIso() }).eq("id", id);
      if (err) throw err;
      setToast(label); await loadAll();
    } catch (e) { setError(tableError(e)); }
    setSaving(false);
  }
  async function completeVisit(id, patch) {
    const v = visits.find(x => x.id === id);
    const actualEnd = nowIso();
    const final = { ...patch, status: "Completed", actual_end_time: actualEnd, completed_at: actualEnd };
    if (final.is_paid && !final.paid_at) final.paid_at = actualEnd;
    if (!final.is_paid) { final.paid_at = null; final.payment_method = ""; final.payment_notes = ""; }
    await saveVisitPatch(id, final, "Visit completed");
    setCompleteVisitId("");
  }
  async function toggleChecklist(item) {
    await supabase.from("pet_visit_checklist_items").update({ is_done: !item.is_done }).eq("id", item.id);
    await loadAll();
  }

  const today = todayISO();
  const todayVisits = visits.filter(v => v.visit_date === today).sort(visitSort);
  const activeVisits = visits.filter(v => v.status === "In Progress").sort(visitSort);
  const upcomingVisits = visits.filter(v => ["Scheduled", "In Progress"].includes(v.status)).sort(visitSort);
  const overdueVisits = visits.filter(v => v.status === "Scheduled" && v.visit_date < today).sort(visitSort);
  const ownerPets = selectedOwnerId ? pets.filter(p => p.owner_id === selectedOwnerId).sort(byName) : [];

  return <div style={S.app}>
    <header style={S.header}>
      <div>
        <div style={S.kicker}>{VERSION}</div>
        <h1 style={S.title}>{settings?.business_name || "Pet Care"}</h1>
      </div>
      <button style={S.refreshBtn} onClick={loadAll} aria-label="Refresh data">↻</button>
    </header>

    {error && <div style={S.error}>{error}</div>}
    {toast && <div style={S.toast} onAnimationEnd={() => setToast("")}>{toast}</div>}
    {loading ? <div style={S.card}>Loading pet care data...</div> : <main key={`${tab}-${officeTab}`} style={S.main} className="page-transition">
      {tab === "Today" && <TodayPage visits={todayVisits} activeVisits={activeVisits} overdueVisits={overdueVisits} owners={ownerMap} pets={petMap} services={serviceMap} visitPets={visitPets} onStart={startVisit} onComplete={setCompleteVisitId} onPetInfo={setPetInfoId} onCancel={markCancelled} onMarkPaid={markVisitPaid} onMarkUnpaid={markVisitUnpaid} onDeleteVisit={(v)=>requestDelete("pet_visits", v, "visit", `${niceDate(v.visit_date)} ${serviceMap[v.service_id]?.name || "visit"}`)} />}
      {tab === "Schedule" && <SchedulePage owners={owners} pets={pets} services={services} options={options} visits={visits} visitPets={visitPets} ownerMap={ownerMap} petMap={petMap} serviceMap={serviceMap} onAdd={addVisitFromForm} onUpdate={updateVisitFromForm} onRepeatLast={repeatLastVisit} onRepeatVisit={repeatVisitTemplate} onStart={startVisit} onComplete={setCompleteVisitId} onPetInfo={setPetInfoId} onMarkPaid={markVisitPaid} onMarkUnpaid={markVisitUnpaid} onDeleteVisit={(v)=>requestDelete("pet_visits", v, "visit", `${niceDate(v.visit_date)} ${serviceMap[v.service_id]?.name || "visit"}`)} />}
      {tab === "Owners" && <OwnersPage owners={owners} pets={pets} services={services} options={options} petChecklist={petChecklist} visits={visits} visitPets={visitPets} selectedOwnerId={selectedOwnerId} selectedPetId={selectedPetId} setSelectedOwnerId={setSelectedOwnerId} setSelectedPetId={setSelectedPetId} ownerMap={ownerMap} petMap={petMap} serviceMap={serviceMap} onSaveOwner={(o)=>saveRow("pet_owners", o, "Owner saved")} onSavePet={(p)=>saveRow("pet_pets", p, "Pet saved")} onSaveOption={(o)=>saveRow("pet_saved_service_options", o, "Saved service option saved")} onAddPetChecklist={(row)=>saveRow("pet_pet_checklist_items", row, "Pet checklist saved")} onDeleteOwner={(o)=>requestDelete("pet_owners", o, "owner", o.name)} onDeletePet={(p)=>requestDelete("pet_pets", p, "pet", p.name)} onDeleteOption={(o)=>requestDelete("pet_saved_service_options", o, "saved_service_option", o.option_name)} vetClinics={vetClinics} onSaveVetClinic={(v)=>saveRow("pet_vet_clinics", v, "Vet clinic saved")} onPetInfo={setPetInfoId} onMarkPaid={markVisitPaid} onMarkUnpaid={markVisitUnpaid} onMarkManyPaid={markManyVisitsPaid} onDeleteVisit={(v)=>requestDelete("pet_visits", v, "visit", `${niceDate(v.visit_date)} ${serviceMap[v.service_id]?.name || "visit"}`)} />}
      {tab === "Office" && <OfficePage officeTab={officeTab} setOfficeTab={setOfficeTab} owners={owners} pets={pets} services={services} serviceChecklist={serviceChecklist} visits={visits} visitPets={visitPets} travel={travel} vetClinics={vetClinics} settings={settings} deleted={deleted} ownerMap={ownerMap} petMap={petMap} serviceMap={serviceMap} onSaveService={(s)=>saveRow("pet_services", s, "Service saved")} onSaveServiceWithChecklist={saveServiceWithChecklist} onAddServiceChecklist={(row)=>saveRow("pet_service_checklist_items", row, "Checklist item saved")} onDeleteServiceChecklist={(item)=>requestDelete("pet_service_checklist_items", item, "service_checklist_item", item.label)} onDeleteService={(s)=>requestDelete("pet_services", s, "service", s.name)} onSaveSettings={(s)=>saveRow("pet_business_settings", s, "Settings saved")} onSaveVetClinic={(v)=>saveRow("pet_vet_clinics", v, "Vet clinic saved")} onDeleteVetClinic={(v)=>requestDelete("pet_vet_clinics", v, "vet_clinic", v.clinic_name)} onSaveTravel={(t)=>saveRow("pet_travel", t, "Travel saved")} onDeleteTravel={(t)=>requestDelete("pet_travel", t, "travel", `${niceDate(t.travel_date)} ${t.mileage || 0} km`)} onHardDeleteDeleted={hardDeleteDeleted} onMarkPaid={markVisitPaid} onMarkUnpaid={markVisitUnpaid} onMarkManyPaid={markManyVisitsPaid} onDeleteVisit={(v)=>requestDelete("pet_visits", v, "visit", `${niceDate(v.visit_date)} ${serviceMap[v.service_id]?.name || "visit"}`)} />}
    </main>}

    <nav style={S.bottomNav}>{TABS.map(t => <button key={t} onClick={() => changeMainTab(t)} style={tab === t ? S.navActive : S.navBtn}>{t}</button>)}</nav>

    {infoPet && <PetInfoModal pet={infoPet} owner={ownerMap[infoPet.owner_id]} vetClinic={vetClinics.find(v=>v.id===infoPet.vet_clinic_id)} onClose={() => setPetInfoId("")} />}
    {paymentVisit && <PaymentModal visit={paymentVisit} owner={ownerMap[paymentVisit.owner_id]} service={serviceMap[paymentVisit.service_id]} onClose={() => setPaymentVisitId("")} onSave={savePayment} />}
    {deleteRequest && <DeleteConfirmModal request={deleteRequest} setRequest={setDeleteRequest} onClose={() => setDeleteRequest(null)} onConfirm={() => deleteSoft(deleteRequest.table, deleteRequest.row, deleteRequest.type, deleteRequest.label)} />}
    {completingVisit && <CompleteModal visit={completingVisit} checklist={visitChecklist.filter(i => i.visit_id === completingVisit.id).sort((a,b)=>a.sort_order-b.sort_order)} service={serviceMap[completingVisit.service_id]} owner={ownerMap[completingVisit.owner_id]} pets={(visitPets.filter(vp=>vp.visit_id===completingVisit.id).map(vp=>petMap[vp.pet_id]).filter(Boolean))} onToggleChecklist={toggleChecklist} onClose={() => setCompleteVisitId("")} onSave={completeVisit} />}
    {saving && <div style={S.saving}>Saving...</div>}
  </div>;
}

function TodayPage({ visits, activeVisits, overdueVisits, owners, pets, services, visitPets, onStart, onComplete, onPetInfo, onCancel, onMarkPaid, onMarkUnpaid, onDeleteVisit }) {
  const todayRevenue = visits.filter(v=>v.status === "Completed").reduce((s,v)=>s+num(v.total_amount),0);
  return <section style={S.stack}>
    <div style={S.compactHeaderStats}>
      <span><b>{visits.length}</b> visits</span>
      <span>·</span>
      <span><b>{activeVisits.length}</b> active</span>
      <span>·</span>
      <span><b>{money(todayRevenue)}</b> today</span>
    </div>
    {activeVisits.length > 0 && <Panel title="In Progress Now">{activeVisits.map(v => <VisitCard key={v.id} visit={v} owner={owners[v.owner_id]} service={services[v.service_id]} pets={visitPetsFor(v, visitPets, pets)} onStart={onStart} onComplete={onComplete} onPetInfo={onPetInfo} onCancel={onCancel} onMarkPaid={onMarkPaid} onMarkUnpaid={onMarkUnpaid} onDeleteVisit={onDeleteVisit} />)}</Panel>}
    {overdueVisits.length > 0 && <Panel title="Overdue Scheduled Services">{overdueVisits.map(v => <VisitCard key={v.id} visit={v} owner={owners[v.owner_id]} service={services[v.service_id]} pets={visitPetsFor(v, visitPets, pets)} onStart={onStart} onComplete={onComplete} onPetInfo={onPetInfo} onCancel={onCancel} onMarkPaid={onMarkPaid} onMarkUnpaid={onMarkUnpaid} onDeleteVisit={onDeleteVisit} />)}</Panel>}
    <Panel title="Today’s Schedule">{visits.length ? visits.map(v => <VisitCard key={v.id} visit={v} owner={owners[v.owner_id]} service={services[v.service_id]} pets={visitPetsFor(v, visitPets, pets)} onStart={onStart} onComplete={onComplete} onPetInfo={onPetInfo} onCancel={onCancel} onMarkPaid={onMarkPaid} onMarkUnpaid={onMarkUnpaid} onDeleteVisit={onDeleteVisit} />) : <Empty text="No services scheduled for today." />}</Panel>
  </section>;
}
function SchedulePage({ owners, pets, services, options, visits, visitPets, ownerMap, petMap, serviceMap, onAdd, onUpdate, onRepeatLast, onRepeatVisit, onStart, onComplete, onPetInfo, onMarkPaid, onMarkUnpaid, onDeleteVisit }) {
  const [form, setForm] = useState(blankVisit);
  const [petIds, setPetIds] = useState([]);
  const [editingVisitId, setEditingVisitId] = useState("");
  const [showAdvancedVisitDetails, setShowAdvancedVisitDetails] = useState(false);
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const ownerPets = pets.filter(p => p.owner_id === form.owner_id && p.is_active).sort(byName);
  const petOptions = options.filter(o => petIds.includes(o.pet_id) && o.is_active);
  const visibleVisits = visits.filter(v => ["Scheduled", "In Progress"].includes(v.status)).sort(visitSort);
  const completedVisits = visits.filter(v=>v.status==="Completed").sort((a,b)=>`${b.visit_date || ""} ${b.scheduled_start_time || ""}`.localeCompare(`${a.visit_date || ""} ${a.scheduled_start_time || ""}`));
  const ownerRecentVisits = visits.filter(v => v.owner_id === form.owner_id).sort((a,b)=>`${b.visit_date || ""} ${b.scheduled_start_time || ""}`.localeCompare(`${a.visit_date || ""} ${a.scheduled_start_time || ""}`)).slice(0, 4);
  function visitMileageFor(nextPetIds, ownerId = form.owner_id) {
    return defaultMileageForPetIds(nextPetIds, pets, ownerMap[ownerId]);
  }
  function pickOwner(id) {
    const activePets = pets.filter(p => p.owner_id === id && p.is_active).sort(byName);
    const autoPetIds = activePets.length === 1 ? [activePets[0].id] : [];
    setPetIds(autoPetIds);
    setForm({...form, owner_id:id, primary_pet_id:autoPetIds[0] || "", saved_option_id:"", mileage:defaultMileageForPetIds(autoPetIds, pets, ownerMap[id])});
  }
  function togglePet(id) {
    setPetIds(prev => {
      const next = prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id];
      setForm(f => ({ ...f, mileage: visitMileageFor(next, f.owner_id) }));
      return next;
    });
  }
  function applyService(id) {
    const s = services.find(x=>x.id===id); if (!s) return;
    setForm({...form, service_id:id, saved_option_id:"", duration_minutes:s.default_duration_minutes, base_price:s.base_price, mileage:visitMileageFor(petIds)});
  }
  function applyOption(id) {
    const o = options.find(x=>x.id===id); if (!o) return;
    setForm({...form, saved_option_id:id, service_id:o.service_id || "", duration_minutes:o.default_duration_minutes, base_price:o.default_price, mileage:visitMileageFor(petIds), internal_notes:o.default_visit_notes || ""});
  }
  function loadVisitForEdit(v) {
    const linkedPets = visitPets.filter(vp => vp.visit_id === v.id).map(vp => vp.pet_id);
    const nextPetIds = linkedPets.length ? linkedPets : (v.primary_pet_id ? [v.primary_pet_id] : []);
    setEditingVisitId(v.id);
    setForm({ ...blankVisit, ...v, scheduled_start_time: v.scheduled_start_time || "09:00" });
    setPetIds(nextPetIds);
    setShowAdvancedVisitDetails(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  return <section style={S.stack}>
    <Panel title="Add Scheduled Visit">
      <div style={S.formGrid}>
        <Field label="Owner"><select value={form.owner_id} onChange={e=>pickOwner(e.target.value)}><option value="">Select owner</option>{owners.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
        <Field label="Service"><select value={form.service_id || ""} onChange={e=>applyService(e.target.value)}><option value="">Select service</option>{services.filter(s=>s.is_active).map(s=><option key={s.id} value={s.id}>{s.name} — {money(s.base_price)}</option>)}</select></Field>
        
        <Field label="Date"><input type="date" value={form.visit_date} onClick={e=>e.currentTarget.showPicker?.()} onFocus={e=>e.currentTarget.showPicker?.()} onChange={e=>setForm({...form, visit_date:e.target.value})} /></Field>
        <Field label="Start time"><select value={form.scheduled_start_time || ""} onChange={e=>setForm({...form, scheduled_start_time:e.target.value})}>{TIME_OPTIONS.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
      </div>
      {form.owner_id && <div style={S.selectedPetNotice}>Booking for: {petIds.length ? petIds.map(id=>petMap[id]?.name).filter(Boolean).join(", ") : "Select at least one pet"}</div>}
      <div style={S.petPickWrap}>{ownerPets.map(p=>{ const active = petIds.includes(p.id); return <button key={p.id} type="button" style={petButtonStyle(p, active)} onClick={()=>togglePet(p.id)}><span>{petFace(p)}</span><span>{p.name}</span>{active && <b>✓</b>}</button>; })}</div>
      <details style={S.collapse} open={showAdvancedVisitDetails} onToggle={e=>setShowAdvancedVisitDetails(e.currentTarget.open)}>
        <summary style={S.collapseSummary}>More visit details</summary>
        <div style={S.formGridPadded}>
          <Field label="Duration minutes"><input type="number" value={form.duration_minutes} onChange={e=>setForm({...form, duration_minutes:e.target.value})} /></Field>
          <Field label="Base price"><input type="number" value={form.base_price} onChange={e=>setForm({...form, base_price:e.target.value})} /></Field>
          <Field label="Add-on fees"><input type="number" value={form.add_on_fees} onChange={e=>setForm({...form, add_on_fees:e.target.value})} /></Field>
          <Field label="Visit notes"><textarea value={form.internal_notes || ""} onChange={e=>setForm({...form, internal_notes:e.target.value})} /></Field>
        </div>
      </details>
      <div style={S.row}>
        <button style={S.primaryBtn} onClick={()=>{ editingVisitId ? onUpdate(editingVisitId, form, petIds).then(()=>{ setEditingVisitId(""); setForm(blankVisit); setPetIds([]); }) : onAdd(form, petIds); }} disabled={!form.owner_id || !form.service_id || petIds.length === 0}>{editingVisitId ? "Save Rescheduled Visit" : "Schedule Visit"}</button>
        {editingVisitId && <button style={S.secondaryBtn} onClick={()=>{ setEditingVisitId(""); setForm(blankVisit); setPetIds([]); }}>Cancel Edit</button>}
      </div>
      {form.owner_id && <div style={S.detailBox}>
        <b>Recent visits for this owner</b>
        {ownerRecentVisits.length ? ownerRecentVisits.map(v => <div key={v.id} style={S.recentVisitRow}>
          <span>{niceDate(v.visit_date)} · {v.scheduled_start_time || ""}</span>
          <span>{visitPetsFor(v, visitPets, petMap).map(p=>p.name).join(", ") || "No pet"}</span>
          <span>{serviceMap[v.service_id]?.name || "Service"}</span>
          <button style={S.secondaryMini} onClick={()=>onRepeatVisit(v.id)}>Use as Template</button>
        </div>) : <Empty text="No recent visits for this owner yet." />}
      </div>}
    </Panel>
    <Panel title="Upcoming / Active Visits">{visibleVisits.length ? visibleVisits.map(v => <VisitCard key={v.id} visit={v} owner={ownerMap[v.owner_id]} service={serviceMap[v.service_id]} pets={visitPetsFor(v, visitPets, petMap)} onStart={onStart} onComplete={onComplete} onPetInfo={onPetInfo} onMarkPaid={onMarkPaid} onMarkUnpaid={onMarkUnpaid} onDeleteVisit={onDeleteVisit} onReschedule={loadVisitForEdit} />) : <Empty text="No upcoming visits yet." />}</Panel>
    <Panel title="Recently Completed Visits">
      {completedVisits.length ? completedVisits.slice(0, showAllCompleted ? 25 : 3).map(v => <VisitCard key={v.id} visit={v} owner={ownerMap[v.owner_id]} service={serviceMap[v.service_id]} pets={visitPetsFor(v, visitPets, petMap)} onStart={onStart} onComplete={onComplete} onPetInfo={onPetInfo} onMarkPaid={onMarkPaid} onMarkUnpaid={onMarkUnpaid} onDeleteVisit={onDeleteVisit} />) : <Empty text="No completed visits yet." />}
      {completedVisits.length > 3 && <button style={S.secondaryBtn} onClick={()=>setShowAllCompleted(!showAllCompleted)}>{showAllCompleted ? "Show fewer completed visits" : "View all completed visits"}</button>}
    </Panel>

  </section>;
}
function OwnersPage({ owners, pets, services, options, petChecklist, visits, visitPets, selectedOwnerId, selectedPetId, setSelectedOwnerId, setSelectedPetId, ownerMap, petMap, serviceMap, onSaveOwner, onSavePet, onSaveOption, onAddPetChecklist, onDeleteOwner, onDeletePet, onDeleteOption, vetClinics, onSaveVetClinic, onPetInfo, onMarkPaid, onMarkUnpaid, onMarkManyPaid, onDeleteVisit }) {
  const OWNER_TABS = ["Owner Info", "Pets", "Saved Services", "Visits", "Billing"];
  const PET_TABS = ["Profile", "Care", "Emergency", "Checklist", "History"];
  const [ownerTab, setOwnerTab] = useState("Owner Info");
  const [petTab, setPetTab] = useState("Profile");
  const [ownerEditMode, setOwnerEditMode] = useState(false);
  const [petEditMode, setPetEditMode] = useState(false);
  const [optionEditMode, setOptionEditMode] = useState(false);
  const [ownerForm, setOwnerForm] = useState(blankOwner);
  const [petForm, setPetForm] = useState(blankPet);
  const [optionForm, setOptionForm] = useState(blankOption);
  const [checkText, setCheckText] = useState("");

  const selectedOwner = owners.find(o=>o.id===selectedOwnerId);
  const selectedPet = pets.find(p=>p.id===selectedPetId);
  const ownerPets = pets.filter(p=>p.owner_id===selectedOwnerId).sort(byName);
  const ownerVisits = visits.filter(v=>v.owner_id===selectedOwnerId).sort((a,b)=>`${b.visit_date || ""} ${b.scheduled_start_time || ""}`.localeCompare(`${a.visit_date || ""} ${a.scheduled_start_time || ""}`));
  const petVisits = selectedPetId ? ownerVisits.filter(v => v.primary_pet_id === selectedPetId || visitPets.some(vp => vp.visit_id === v.id && vp.pet_id === selectedPetId)) : [];

  useEffect(()=>{
    setOwnerForm(selectedOwner || blankOwner);
    setOwnerEditMode(!selectedOwnerId);
    if (!selectedOwnerId) setOwnerTab("Owner Info");
  }, [selectedOwnerId]);

  useEffect(()=>{
    setPetForm(selectedPet || { ...blankPet, owner_id:selectedOwnerId || "" });
    setOptionForm({ ...blankOption, owner_id:selectedOwnerId || "", pet_id:selectedPetId || "" });
    setPetEditMode(!selectedPetId && ownerTab === "Pets");
    setOptionEditMode(false);
  }, [selectedPetId, selectedOwnerId, ownerTab]);

  function newOwner() {
    setSelectedOwnerId(""); setSelectedPetId(""); setOwnerForm(blankOwner); setOwnerEditMode(true); setOwnerTab("Owner Info");
  }
  function newPet() {
    setSelectedPetId(""); setPetForm({...blankPet, owner_id:selectedOwnerId}); setPetEditMode(true); setPetTab("Profile"); setOwnerTab("Pets");
  }
  function newOption(petId = selectedPetId) {
    setOptionForm({...blankOption, owner_id:selectedOwnerId, pet_id:petId || ""}); setOptionEditMode(true); setOwnerTab("Saved Services");
  }

  return <section style={S.stack}>
    <div style={S.twoColBalanced}>
      <Panel title="Pet Owners">
        <button style={S.primaryBtn} onClick={newOwner}>New Owner</button>
        <div style={S.list}>{owners.map(o=><button key={o.id} style={selectedOwnerId===o.id?S.listActive:S.listBtn} onClick={()=>{setSelectedOwnerId(o.id); setSelectedPetId(""); setOwnerEditMode(false); setOwnerTab("Owner Info"); window.scrollTo({top:0,behavior:"smooth"});}}>{o.name || "Unnamed owner"}<small>{o.phone || o.email || "No contact info"}</small></button>)}</div>
      </Panel>

      {!selectedOwnerId && ownerEditMode && <Panel title="New Owner">
        <OwnerForm value={ownerForm} onChange={setOwnerForm} />
        <div style={S.row}><button style={S.primaryBtn} onClick={()=>onSaveOwner(ownerForm)}>Save Owner</button></div>
      </Panel>}

      {selectedOwnerId && <Panel title="">
        <OwnerHero owner={selectedOwner} onEdit={()=>{setOwnerTab("Owner Info"); setOwnerEditMode(true);}} />
        <div style={S.subTabs}>{OWNER_TABS.map(t=><button key={t} style={ownerTab===t?S.subTabActive:S.subTab} onClick={()=>{setOwnerTab(t); setOwnerEditMode(false); setPetEditMode(false); setOptionEditMode(false); window.scrollTo({top:0,behavior:"smooth"});}}>{t}</button>)}</div>

        {ownerTab === "Owner Info" && <div style={S.stack}>
          {!ownerEditMode ? <OwnerSummary owner={selectedOwner} /> : <OwnerForm value={ownerForm} onChange={setOwnerForm} />}
          <div style={S.splitRow}>{!ownerEditMode ? <button style={S.secondaryBtn} onClick={()=>setOwnerEditMode(true)}>Edit Owner Info</button> : <button style={S.primaryBtn} onClick={()=>{onSaveOwner(ownerForm); setOwnerEditMode(false);}}>Save Owner</button>}<div>{selectedOwner?.id && <button style={S.dangerMini} onClick={()=>onDeleteOwner(selectedOwner)}>Delete Owner</button>}</div></div>
        </div>}

        {ownerTab === "Pets" && <div style={S.stack}>
          <div style={S.row}><button style={S.primaryBtn} onClick={newPet}>Add Pet</button><span style={S.muted}>Each pet has its own profile, care notes, emergency info, checklist, and history.</span></div>
          <div style={S.petCards}>{ownerPets.map(p=><PetMini key={p.id} pet={p} active={selectedPetId===p.id} onClick={()=>{setSelectedPetId(p.id); setPetEditMode(false);}} onInfo={()=>onPetInfo(p.id)} />)}</div>
          {(selectedPet || petEditMode) && <div style={S.detailBox}>
            <div style={S.subTabs}>{PET_TABS.map(t=><button key={t} style={petTab===t?S.subTabActive:S.subTab} onClick={()=>{setPetTab(t); setPetEditMode(false); window.scrollTo({top:0,behavior:"smooth"});}}>{t}</button>)}</div>
            {!petEditMode ? <PetReadOnly pet={selectedPet} petTab={petTab} visits={petVisits} serviceMap={serviceMap} visitPets={visitPets} petMap={petMap} petChecklist={petChecklist} vetClinics={vetClinics} /> : <PetForm value={petForm} onChange={setPetForm} vetClinics={vetClinics} onSaveVetClinic={onSaveVetClinic} />}
            <div style={S.row}>{!petEditMode ? <button style={S.secondaryBtn} onClick={()=>setPetEditMode(true)}>Edit Pet</button> : <button style={S.primaryBtn} onClick={()=>{onSavePet({...petForm, owner_id:selectedOwnerId}); setPetEditMode(false);}}>Save Pet</button>}{selectedPet?.id && <><button style={S.secondaryBtn} onClick={()=>onPetInfo(selectedPet.id)}>Emergency Info</button></>}</div>
            {selectedPet?.id && <div style={S.dangerZone}><b>Danger zone</b><small>Deleting a pet requires typing the exact pet name.</small><button style={S.dangerMini} onClick={()=>onDeletePet(selectedPet)}>Delete Pet</button></div>}
          </div>}
        </div>}

        {ownerTab === "Saved Services" && <div style={S.stack}>
          <div style={S.row}><button style={S.primaryBtn} onClick={()=>newOption()}>Add Saved Service Option</button><span style={S.muted}>Saved options are quick templates. They do not auto-schedule visits.</span></div>
          {optionEditMode && <div style={S.detailBox}><OptionForm value={optionForm} onChange={setOptionForm} services={services} pets={ownerPets} /><button style={S.primaryBtn} onClick={()=>{onSaveOption({...optionForm, owner_id:selectedOwnerId}); setOptionEditMode(false);}}>Save Service Option</button></div>}
          <div style={S.cards}>{options.filter(o=>o.owner_id===selectedOwnerId).map(o=><div key={o.id} style={S.smallCard}><b>{o.option_name}</b><span>{petMap[o.pet_id]?.name || "Owner option"}</span><span>{serviceMap[o.service_id]?.name || "Custom service"}</span><span>{money(o.default_price)} / {o.default_duration_minutes} min</span><div style={S.row}><button style={S.secondaryMini} onClick={()=>{setOptionForm(o); setOptionEditMode(true);}}>Edit</button><button style={S.dangerMini} onClick={()=>onDeleteOption(o)}>Delete</button></div></div>)}</div>
        </div>}

        {ownerTab === "Visits" && <div style={S.stack}>
          <div style={S.grid3}><Metric title="Upcoming" value={ownerVisits.filter(v=>["Scheduled","In Progress"].includes(v.status)).length} sub="scheduled/active" /><Metric title="Completed" value={ownerVisits.filter(v=>v.status==="Completed").length} sub="visit history" /><Metric title="Unpaid" value={money(ownerVisits.filter(v=>v.status==="Completed"&&!v.is_paid).reduce((s,v)=>s+num(v.total_amount),0))} sub="completed visits" /></div>
          {ownerVisits.length ? ownerVisits.map(v=><VisitHistoryRow key={v.id} visit={v} service={serviceMap[v.service_id]} pets={visitPetsFor(v, visitPets, petMap)} onDeleteVisit={onDeleteVisit} />) : <Empty text="No visits yet for this owner." />}
        </div>}

        {ownerTab === "Billing" && <div style={S.stack}>
          <OwnerBillingSummary owner={selectedOwner} visits={ownerVisits} visitPets={visitPets} petMap={petMap} serviceMap={serviceMap} onMarkPaid={onMarkPaid} onMarkUnpaid={onMarkUnpaid} onMarkManyPaid={onMarkManyPaid} />
        </div>}
      </Panel>}
    </div>
  </section>;
}

function OfficePage(props) {
  const { officeTab, setOfficeTab } = props;
  return <section style={S.stack}>
    <div style={S.officeNav}>{OFFICE_TABS.map(t=><button key={t} style={officeTab===t?S.officeActive:S.officeBtn} onClick={()=>{setOfficeTab(t); window.scrollTo({top:0,behavior:"smooth"});}}>{t}</button>)}</div>
    {officeTab === "Reports" && <Reports {...props} />}
    {officeTab === "Services" && <ServicesAdmin {...props} />}
    {officeTab === "Vets" && <VetClinicsAdmin {...props} />}
    {officeTab === "Travel" && <TravelAdmin {...props} />}
    {officeTab === "Settings" && <SettingsAdmin {...props} />}
    {officeTab === "Deleted" && <DeletedAdmin {...props} />}
  </section>;
}

function parseDateOnly(value) {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  return new Date(y || 2000, (m || 1) - 1, d || 1);
}
function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function getPetReportRange(type, month, year) {
  const now = new Date();
  const y = Number(year || now.getFullYear());
  const m = Number(month || now.getMonth() + 1) - 1;
  if (type === "mtd") return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay(now), label: "Month to date" };
  if (type === "ytd") return { start: new Date(now.getFullYear(), 0, 1), end: endOfDay(now), label: "Year to date" };
  if (type === "year") return { start: new Date(y, 0, 1), end: endOfDay(new Date(y, 11, 31)), label: String(y) };
  return { start: new Date(y, m, 1), end: endOfDay(new Date(y, m + 1, 0)), label: `${y}-${String(m + 1).padStart(2, "0")}` };
}
function dateInRange(iso, range) {
  const d = parseDateOnly(iso);
  return d && d >= range.start && d <= range.end;
}
function visitPetsForNames(visit, visitPets, petMap) {
  const pets = visitPetsFor(visit, visitPets, petMap);
  return pets.map(p => p.name).filter(Boolean).join(", ") || "No pet listed";
}
function petReportText(preview) {
  const lines = [];
  lines.push(`${preview.title || "Pet Care Report"}`);
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push(`Scope: ${preview.scopeLabel}`);
  lines.push(`Period: ${niceDate(preview.range.start.toISOString().slice(0,10))} to ${niceDate(preview.range.end.toISOString().slice(0,10))}`);
  lines.push("");
  lines.push(`Completed visits: ${preview.totals.completedCount}`);
  lines.push(`Revenue: ${money(preview.totals.revenue)}`);
  lines.push(`Paid: ${money(preview.totals.paid)}`);
  lines.push(`Unpaid: ${money(preview.totals.unpaid)}`);
  lines.push(`Cancelled/Missed: ${preview.totals.cancelledMissed}`);
  lines.push("");
  lines.push(`Owner rankings sorted by ${preview.rankLabel}`);
  preview.ownerRows.forEach((r, i) => {
    lines.push(`${i + 1}. ${r.owner.name} | ${r.completedCount} visits | Total ${money(r.total)} | Paid ${money(r.paid)} | Unpaid ${money(r.unpaid)} | Avg/visit ${money(r.avgVisit)}`);
    r.petRows.forEach(pr => lines.push(`   - ${pr.pet.name}: ${pr.count} visits, ${money(pr.total)}`));
  });
  if (!preview.ownerRows.length) lines.push("No visits in this report range.");
  lines.push("");
  lines.push("Service totals");
  preview.serviceRows.forEach(r => lines.push(`- ${r.name}: ${r.count} visits, ${money(r.total)}`));
  lines.push("");
  lines.push("Visit details");
  preview.rows.forEach(v => lines.push(`${niceDate(v.visit_date)} ${v.scheduled_start_time || ""} | ${preview.ownerMap[v.owner_id]?.name || "Unknown"} | ${preview.serviceMap[v.service_id]?.name || "Service"} | ${visitPetsForNames(v, preview.visitPets, preview.petMap)} | ${money(v.total_amount)} | ${v.is_paid ? "Paid" : "Unpaid"}`));
  return lines.join("\n");
}
function PrintPreviewOverlay({ title, onClose, onEmail, children }) {
  return <div className="print-preview-screen" style={S.printOverlay}>
    <style>{`@media print{body *{visibility:hidden!important}.print-preview-screen,.print-preview-screen *{visibility:visible!important}.print-preview-screen{position:absolute!important;inset:0!important;background:white!important;overflow:visible!important;padding:0!important}.print-preview-toolbar{display:none!important}.print-preview-paper{box-shadow:none!important;border:none!important;margin:0!important;max-width:none!important;width:100%!important}}`}</style>
    <div className="print-preview-toolbar" style={S.printToolbar}>
      <b>{title}</b>
      <div style={S.row}>{onEmail && <button style={S.primaryBtn} onClick={onEmail}>Email Report</button>}<button style={S.primaryBtn} onClick={()=>window.print()}>Print / Save PDF</button><button style={S.secondaryBtn} onClick={onClose}>Close Preview</button></div>
    </div>
    <div className="print-preview-paper" style={S.printPaper}>{children}</div>
  </div>;
}
function PetReportDocument({ preview, settings }) {
  return <div style={S.docPaper}>
    <div style={S.docHeader}>
      <div><h1>{settings?.business_name || "Pet Care by Kiri"}</h1><div>{settings?.business_phone || ""}</div><div>{settings?.business_email || ""}</div></div>
      <div style={{textAlign:"right"}}><h2>REPORT</h2><div>{preview.scopeLabel}</div><div>{niceDate(preview.range.start.toISOString().slice(0,10))} to {niceDate(preview.range.end.toISOString().slice(0,10))}</div></div>
    </div>
    <div style={S.docSection}><h3>Summary</h3><div style={S.grid3}><Metric title="Completed" value={preview.totals.completedCount} sub="visits"/><Metric title="Revenue" value={money(preview.totals.revenue)} sub="completed"/><Metric title="Unpaid" value={money(preview.totals.unpaid)} sub={`${preview.totals.unpaidCount} visits`}/></div></div>
    <div style={S.docSection}><h3>Owner Rankings</h3><p style={S.muted}>Sorted by {preview.rankLabel}</p>{preview.ownerRows.map((r,i)=><div key={r.owner.id} style={S.reportRow}><b>{i+1}. {r.owner.name}</b><span>{r.completedCount} visits</span><span>{money(r.total)}</span><small>Paid {money(r.paid)} · Unpaid {money(r.unpaid)} · Avg {money(r.avgVisit)}</small>{r.petRows.length ? <div style={S.subList}>{r.petRows.map(pr=><span key={pr.pet.id}>{pr.pet.name}: {pr.count}</span>)}</div> : null}</div>)}</div>
    <div style={S.docSection}><h3>Service Totals</h3>{preview.serviceRows.map(r=><div key={r.name} style={S.reportRow}><b>{r.name}</b><span>{r.count} visits</span><span>{money(r.total)}</span></div>)}</div>
    <div style={S.docSection}><h3>Visit Details</h3>{preview.rows.map(v=><div key={v.id} style={S.reportRow}><b>{niceDate(v.visit_date)} {timeLabel(v.scheduled_start_time)}</b><span>{preview.ownerMap[v.owner_id]?.name || "Unknown"}</span><span>{preview.serviceMap[v.service_id]?.name || "Service"}</span><small>{visitPetsForNames(v, preview.visitPets, preview.petMap)} · {money(v.total_amount)} · {v.is_paid ? "Paid" : "Unpaid"}</small></div>)}</div>
  </div>;
}
function buildReportText({ title, owners = [], pets = [], visits = [], visitPets = [], ownerMap = {}, petMap = {}, serviceMap = {}, filter = null }) {
  const rows = filter ? visits.filter(filter) : visits;
  const lines = [];
  lines.push(title);
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push("");
  const grouped = owners.map(owner => ({ owner, rows: rows.filter(v => v.owner_id === owner.id) })).filter(x => x.rows.length);
  grouped.forEach(group => {
    const total = group.rows.reduce((s, v) => s + num(v.total_amount), 0);
    lines.push(`${group.owner.name} — ${group.rows.length} visit(s) — ${money(total)}`);
    group.rows.forEach(v => {
      const petNames = visitPetsFor(v, visitPets, petMap).map(p => p.name).join(", ");
      lines.push(`  ${niceDate(v.visit_date)} ${v.scheduled_start_time || ""} — ${serviceMap[v.service_id]?.name || "Service"} — ${petNames} — ${money(v.total_amount)} — ${v.is_paid ? "Paid" : "Unpaid"}`);
    });
    lines.push("");
  });
  if (!grouped.length) lines.push("No matching visits.");
  return lines.join("\n");
}
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[c]));
}
function printHtmlDocument(title, bodyHtml) {
  const safeTitle = escapeHtml(title || "Pet Care Document");
  const root = document.createElement("div");
  root.className = "v13-print-root";
  root.innerHTML = `
    <style id="v13-print-style">
      @page { size: letter; margin: 0.55in; }
      @media screen {
        .v13-print-root { position: fixed; inset: 0; z-index: 99999; background: rgba(255,255,255,.98); overflow: auto; padding: 20px; }
        .v13-print-toolbar { position: sticky; top: 0; display: flex; justify-content: space-between; gap: 12px; align-items: center; background: white; border: 1px solid #eadfd6; border-radius: 16px; padding: 10px 12px; margin: 0 auto 12px; max-width: 820px; box-shadow: 0 12px 30px rgba(70,50,35,.12); font-family: system-ui, Segoe UI, sans-serif; }
        .v13-print-toolbar button { border: 1px solid #d9c7b8; background: #fff; border-radius: 12px; padding: 10px 12px; font-weight: 800; }
        .v13-print-toolbar .primary { background: #d9783f; border-color: #d9783f; color: #fff; }
        .v13-print-paper { background: white; max-width: 820px; margin: 0 auto; padding: 34px; border: 1px solid #eadfd6; border-radius: 18px; box-shadow: 0 20px 60px rgba(70,50,35,.14); }
      }
      @media print {
        body > *:not(.v13-print-root) { display: none !important; }
        .v13-print-root { display: block !important; position: static !important; inset: auto !important; padding: 0 !important; background: white !important; }
        .v13-print-toolbar { display: none !important; }
        .v13-print-paper { display: block !important; box-shadow: none !important; border: 0 !important; border-radius: 0 !important; margin: 0 !important; padding: 0 !important; max-width: none !important; width: 100% !important; }
      }
      .v13-doc { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color: #171717; line-height: 1.35; font-size: 13px; }
      .v13-doc h1 { font-size: 26px; margin: 0; }
      .v13-doc h2 { font-size: 22px; margin: 0; letter-spacing: .04em; }
      .v13-doc h3 { font-size: 15px; margin: 18px 0 8px; }
      .v13-doc .doc-head { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #222; padding-bottom: 18px; margin-bottom: 18px; }
      .v13-doc .muted { color: #666; }
      .v13-doc .bill-to { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 16px 0; }
      .v13-doc .box { border: 1px solid #ddd; border-radius: 10px; padding: 12px; }
      .v13-doc table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      .v13-doc th { text-align: left; border-bottom: 2px solid #222; padding: 8px 6px; font-size: 12px; }
      .v13-doc td { border-bottom: 1px solid #e5e5e5; padding: 8px 6px; vertical-align: top; }
      .v13-doc .num { text-align: right; white-space: nowrap; }
      .v13-doc .total-row td { border-bottom: 0; font-size: 16px; font-weight: 850; padding-top: 14px; }
      .v13-doc .footer { margin-top: 24px; border-top: 1px solid #ddd; padding-top: 12px; color: #666; font-size: 12px; }
      @media print { .v13-doc { font-size: 12px; } .v13-doc .box { break-inside: avoid; } .v13-doc tr { break-inside: avoid; } }
    </style>
    <div class="v13-print-toolbar"><strong>${safeTitle}</strong><div><button class="primary" data-print>Print / Save PDF</button><button data-close>Close</button></div></div>
    <div class="v13-print-paper"><div class="v13-doc">${bodyHtml || ""}</div></div>
  `;
  document.body.appendChild(root);
  root.querySelector('[data-close]')?.addEventListener('click', () => root.remove());
  root.querySelector('[data-print]')?.addEventListener('click', () => window.print());
  setTimeout(() => {
    try { window.print(); } catch (_) {}
  }, 150);
  setTimeout(() => {
    if (root.parentNode) root.remove();
  }, 12000);
}
function printTextDocument(title, text) {
  printHtmlDocument(title, `<h2>${escapeHtml(title || "Pet Care Document")}</h2><pre style="white-space:pre-wrap;font:inherit;margin-top:16px">${escapeHtml(text || "")}</pre>`);
}
function emailTextDocument(subject, text, to = "") {
  const href = `mailto:${encodeURIComponent(to || "")}?subject=${encodeURIComponent(subject || "Pet Care")}&body=${encodeURIComponent(text || "")}`;
  try {
    const a = document.createElement("a");
    a.href = href;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 500);
  } catch (err) {
    try { navigator.clipboard?.writeText(text || ""); } catch (_) {}
    window.alert("Email app did not open. The invoice/report text was copied if clipboard access was available.");
  }
}
function singleVisitBillingText(owner, visit, visitPets, petMap, serviceMap, title = "Invoice") {
  const pets = visitPetsFor(visit, visitPets, petMap).map(p => p.name).join(", ");
  const lines = [];
  lines.push(title);
  lines.push(owner?.name || "Owner");
  if (owner?.address) lines.push(owner.address);
  if (owner?.invoice_email || owner?.email) lines.push(owner.invoice_email || owner.email);
  lines.push("");
  lines.push(`${niceDate(visit.visit_date)} ${timeLabel(visit.scheduled_start_time)} — ${serviceMap[visit.service_id]?.name || "Service"}`);
  if (pets) lines.push(`Pet(s): ${pets}`);
  lines.push(`Duration: ${visit.duration_minutes || 0} minutes`);
  lines.push(`Amount: ${money(visit.total_amount)}`);
  lines.push(`Status: ${visit.is_paid ? "Paid" : "Unpaid"}`);
  if (visit.payment_method) lines.push(`Payment method: ${visit.payment_method}`);
  if (visit.completion_notes) lines.push(`Notes: ${visit.completion_notes}`);
  lines.push("");
  lines.push(`Total due: ${visit.is_paid ? money(0) : money(visit.total_amount)}`);
  return lines.join("\n");
}
function visitBillingRowsHtml(rows, visitPets, petMap, serviceMap) {
  return rows.map(v => {
    const pets = visitPetsFor(v, visitPets, petMap).map(p => p.name).join(", ");
    const service = serviceMap[v.service_id]?.name || "Service";
    return `<tr>
      <td>${escapeHtml(niceDate(v.visit_date))}<br/><span class="muted">${escapeHtml(timeLabel(v.scheduled_start_time))}</span></td>
      <td><strong>${escapeHtml(service)}</strong>${pets ? `<br/><span class="muted">${escapeHtml(pets)}</span>` : ""}</td>
      <td class="num">${escapeHtml(String(v.duration_minutes || 0))} min</td>
      <td>${escapeHtml(v.is_paid ? "Paid" : "Unpaid")}</td>
      <td class="num">${escapeHtml(money(v.total_amount))}</td>
    </tr>`;
  }).join("");
}
function billingDocumentHtml({ title, owner, rows, visitPets, petMap, serviceMap }) {
  const list = Array.isArray(rows) ? rows : [];
  const subtotal = list.reduce((s, v) => s + num(v.total_amount), 0);
  const unpaid = list.filter(v => !v.is_paid).reduce((s, v) => s + num(v.total_amount), 0);
  const paid = subtotal - unpaid;
  const docDate = new Date().toLocaleDateString();
  return `<div>
    <div class="doc-head">
      <div><h1>Pet Care by Kiri</h1><div class="muted">Pet care services</div></div>
      <div style="text-align:right"><h2>${escapeHtml(title || "INVOICE")}</h2><div>Date: ${escapeHtml(docDate)}</div></div>
    </div>
    <div class="bill-to">
      <div class="box"><strong>Bill to</strong><br/>${escapeHtml(owner?.name || "Owner")}<br/>${owner?.address ? escapeHtml(owner.address) + "<br/>" : ""}${owner?.phone ? escapeHtml(owner.phone) + "<br/>" : ""}${owner?.invoice_email || owner?.email ? escapeHtml(owner.invoice_email || owner.email) : ""}</div>
      <div class="box"><strong>Summary</strong><br/>Visits: ${list.length}<br/>Subtotal: ${escapeHtml(money(subtotal))}<br/>Paid: ${escapeHtml(money(paid))}<br/><strong>Total due: ${escapeHtml(money(unpaid))}</strong></div>
    </div>
    <h3>Services</h3>
    <table><thead><tr><th>Date</th><th>Service / Pets</th><th class="num">Duration</th><th>Status</th><th class="num">Amount</th></tr></thead><tbody>${visitBillingRowsHtml(list, visitPets, petMap, serviceMap)}<tr class="total-row"><td colspan="4" class="num">Total due</td><td class="num">${escapeHtml(money(unpaid))}</td></tr></tbody></table>
    <div class="footer">Generated from Pet Care by Kiri. Please contact us with any questions about this invoice or statement.</div>
  </div>`;
}
function printBillingDocument(title, owner, rows, visitPets, petMap, serviceMap) {
  printHtmlDocument(title, billingDocumentHtml({ title, owner, rows, visitPets, petMap, serviceMap }));
}
function Reports({ owners, pets, visits, visitPets, ownerMap, petMap, serviceMap, onMarkPaid, settings }) {
  const [scope, setScope] = useState("all");
  const [ownerId, setOwnerId] = useState("");
  const [reportType, setReportType] = useState("month");
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [rankBy, setRankBy] = useState("total");
  const [preview, setPreview] = useState(null);
  const range = useMemo(()=>getPetReportRange(reportType, month, year), [reportType, month, year]);
  const selectedOwner = owners.find(o=>o.id===ownerId) || null;
  const rows = visits.filter(v => dateInRange(v.visit_date, range)).filter(v => scope !== "owner" || !ownerId || v.owner_id === ownerId);
  const completed = rows.filter(v=>v.status === "Completed");
  const unpaid = completed.filter(v=>!v.is_paid);
  const paid = completed.filter(v=>v.is_paid);
  const cancelledMissed = rows.filter(v=>v.status === "Cancelled" || v.status === "Missed").length;
  const totals = {
    completedCount: completed.length,
    revenue: completed.reduce((s,v)=>s+num(v.total_amount),0),
    paid: paid.reduce((s,v)=>s+num(v.total_amount),0),
    unpaid: unpaid.reduce((s,v)=>s+num(v.total_amount),0),
    unpaidCount: unpaid.length,
    cancelledMissed,
  };
  const ownerRows = owners.map(owner => {
    const ownerVisits = completed.filter(v=>v.owner_id === owner.id);
    const paidRows = ownerVisits.filter(v=>v.is_paid);
    const unpaidRows = ownerVisits.filter(v=>!v.is_paid);
    const petRows = pets.filter(p=>p.owner_id===owner.id).map(p=>{
      const petVisits = ownerVisits.filter(v=>v.primary_pet_id===p.id || visitPets.some(vp=>vp.visit_id===v.id && vp.pet_id===p.id));
      return { pet:p, count:petVisits.length, total:petVisits.reduce((s,v)=>s+num(v.total_amount),0) };
    }).filter(x=>x.count);
    const total = ownerVisits.reduce((s,v)=>s+num(v.total_amount),0);
    return { owner, completedCount: ownerVisits.length, total, paid: paidRows.reduce((s,v)=>s+num(v.total_amount),0), unpaid: unpaidRows.reduce((s,v)=>s+num(v.total_amount),0), unpaidCount: unpaidRows.length, avgVisit: ownerVisits.length ? total / ownerVisits.length : 0, petRows };
  }).filter(x=>x.completedCount || x.total || x.unpaid).sort((a,b)=>{
    const key = rankBy === "visits" ? "completedCount" : rankBy === "unpaid" ? "unpaid" : rankBy === "avg" ? "avgVisit" : "total";
    const diff = num(b[key])-num(a[key]);
    return diff || (a.owner.name || "").localeCompare(b.owner.name || "");
  });
  const serviceRows = Object.values(completed.reduce((acc,v)=>{ const key=v.service_id || "custom"; acc[key] ||= { name: serviceMap[v.service_id]?.name || "Custom/Unknown", count:0, total:0, unpaid:0 }; acc[key].count++; acc[key].total+=num(v.total_amount); if(!v.is_paid) acc[key].unpaid+=num(v.total_amount); return acc; },{})).sort((a,b)=>b.total-a.total);
  const rankLabels = { total:"Total $", visits:"Visit Count", unpaid:"Unpaid $", avg:"Average $ / Visit" };
  const reportData = { title:"Pet Care Report", scopeLabel: scope === "owner" ? selectedOwner?.name || "Selected Owner" : "All Pet Owners", range, rows, completed, unpaid, paid, totals, ownerRows, serviceRows, rankBy, rankLabel: rankLabels[rankBy], ownerMap, petMap, serviceMap, visitPets };
  const reportText = petReportText(reportData);
  function emailReport(){ emailTextDocument(`${settings?.business_name || "Pet Care"} report - ${reportData.scopeLabel}`, reportText, settings?.default_email || settings?.business_email || ""); }
  return <div style={S.stack}>
    <Panel title="Reports" subtitle="Live report view. Filters update the preview automatically.">
      <div style={S.formGrid}>
        <Field label="Scope"><select value={scope} onChange={e=>setScope(e.target.value)}><option value="all">All pet owners</option><option value="owner">Single owner</option></select></Field>
        {scope === "owner" && <Field label="Pet owner"><select value={ownerId} onChange={e=>setOwnerId(e.target.value)}><option value="">Choose owner</option>{owners.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>}
        <Field label="Period"><select value={reportType} onChange={e=>setReportType(e.target.value)}><option value="month">Selected month</option><option value="mtd">Month to date</option><option value="ytd">Year to date</option><option value="year">Selected year</option></select></Field>
        {reportType === "month" && <Field label="Month"><select value={month} onChange={e=>setMonth(e.target.value)}>{Array.from({length:12},(_,i)=><option key={i+1} value={String(i+1)}>{i+1}</option>)}</select></Field>}
        <Field label="Year"><input type="number" value={year} onChange={e=>setYear(e.target.value)} /></Field>
      </div>
      <div style={S.row}><button style={S.primaryBtn} onClick={()=>setPreview(reportData)}>Print / Save PDF</button><button style={S.secondaryBtn} onClick={emailReport}>Email Report</button></div>
    </Panel>
    <Panel title="Report Preview" subtitle={`${reportData.scopeLabel} · ${niceDate(range.start.toISOString().slice(0,10))} to ${niceDate(range.end.toISOString().slice(0,10))}`}>
      <div style={S.grid3}><Metric title="Completed" value={totals.completedCount} sub="visits" /><Metric title="Revenue" value={money(totals.revenue)} sub="completed" /><Metric title="Unpaid" value={money(totals.unpaid)} sub={`${totals.unpaidCount} visits`} /></div>
      <div style={S.grid3}><Metric title="Paid" value={money(totals.paid)} sub="received" /><Metric title="Avg / Visit" value={money(totals.completedCount ? totals.revenue/totals.completedCount : 0)} sub="completed" /><Metric title="Cancelled/Missed" value={totals.cancelledMissed} sub="visits" /></div>
    </Panel>
    <Panel title="Rank pet owners by"><div style={S.row}>{Object.entries(rankLabels).map(([k,label])=><button key={k} style={rankBy===k?S.primaryMini:S.secondaryMini} onClick={()=>setRankBy(k)}>{label}</button>)}</div><p style={S.muted}>Sorted by {rankLabels[rankBy]} high to low.</p></Panel>
    <Panel title="Pet Owner Rankings">{ownerRows.length ? ownerRows.map((x,idx)=><div key={x.owner.id} style={S.reportRow}><b>{idx+1}. {x.owner.name}</b><span>{x.completedCount} visits</span><span>{money(x.total)}</span><small>Paid {money(x.paid)} · Unpaid {money(x.unpaid)} · Avg {money(x.avgVisit)}</small><div style={S.subList}>{x.petRows.map(pr=><span key={pr.pet.id}>{pr.pet.name}: {pr.count} visits</span>)}</div></div>) : <Empty text="No completed visits in this report range." />}</Panel>
    <Panel title="Revenue by Service Type">{serviceRows.length ? serviceRows.map(s=><div key={s.name} style={S.reportRow}><b>{s.name}</b><span>{s.count} visits</span><span>{money(s.total)}</span>{s.unpaid ? <small>Unpaid {money(s.unpaid)}</small> : null}</div>) : <Empty text="No service revenue in this report range." />}</Panel>
    <Panel title="Unpaid Completed Visits">{unpaid.length ? unpaid.map(v=><div key={v.id} style={S.reportRow}><b>{ownerMap[v.owner_id]?.name || "Unknown"}</b><span>{niceDate(v.visit_date)}</span><span>{serviceMap[v.service_id]?.name || "Service"}</span><small>{visitPetsForNames(v, visitPets, petMap)} · {money(v.total_amount)}</small><button style={S.primaryMini} onClick={()=>onMarkPaid(v.id)}>Mark Paid</button></div>) : <Empty text="No unpaid completed visits in this report range." />}</Panel>
    {preview && <PrintPreviewOverlay title="Report Print Preview" onClose={()=>setPreview(null)} onEmail={emailReport}><PetReportDocument preview={reportData} settings={settings} /></PrintPreviewOverlay>}
  </div>;
}
function ServicesAdmin({ services, serviceChecklist, onSaveService, onSaveServiceWithChecklist, onDeleteService }) {
  const [form, setForm] = useState(blankService);
  const [item, setItem] = useState("");
  const [draftItems, setDraftItems] = useState([]);
  const selectedSavedItems = form.id ? serviceChecklist.filter(i=>i.service_id===form.id).sort((a,b)=>num(a.sort_order)-num(b.sort_order)) : [];
  useEffect(() => {
    setDraftItems(selectedSavedItems.map(i => ({ ...i })));
    setItem("");
  }, [form.id, serviceChecklist.length]);
  function chooseService(service) {
    setForm(service);
    setDraftItems(serviceChecklist.filter(i=>i.service_id===service.id).sort((a,b)=>num(a.sort_order)-num(b.sort_order)).map(i => ({ ...i })));
    setItem("");
  }
  function addDraftItem() {
    const label = item.trim();
    if (!label) return;
    setDraftItems(prev => [...prev, { temp_id:`tmp-${Date.now()}`, label, sort_order:(prev.length + 1) * 10, is_active:true }]);
    setItem("");
  }
  function removeDraftItem(idx) {
    setDraftItems(prev => prev.filter((_, i) => i !== idx));
  }
  function updateDraftItem(idx, label) {
    setDraftItems(prev => prev.map((x, i) => i === idx ? { ...x, label } : x));
  }
  async function saveAll() {
    if (onSaveServiceWithChecklist) return onSaveServiceWithChecklist(form, draftItems);
    return onSaveService(form);
  }
  return <Panel title="Services & Pricing">
    <p style={S.muted}>Sort order is hidden now. It only controls the display order of service cards.</p>
    <ServiceForm value={form} onChange={setForm} />
    {form.id && <div style={S.detailBox}>
      <b>Checklist for {form.name}</b>
      <small style={S.muted}>Make all checklist changes here, then tap Save Service once. The editor will not auto-close after each item.</small>
      {draftItems.length ? draftItems.map((i, idx)=><div key={i.id || i.temp_id || idx} style={S.checklistRow}>
        <input value={i.label || ""} onChange={e=>updateDraftItem(idx, e.target.value)} />
        <button style={S.dangerMini} onClick={()=>removeDraftItem(idx)}>Remove</button>
      </div>) : <Empty text="No checklist items for this service yet." />}
      <div style={S.row}><input placeholder="New checklist item" value={item} onChange={e=>setItem(e.target.value)} onKeyDown={e=>{ if(e.key === "Enter") addDraftItem(); }} /><button style={S.secondaryBtn} onClick={addDraftItem}>Add Checklist Item</button></div>
    </div>}
    <div style={S.row}><button style={S.primaryBtn} onClick={saveAll}>Save Service</button><button style={S.secondaryBtn} onClick={()=>{ setForm(blankService); setDraftItems([]); setItem(""); }}>New</button>{form.id&&<button style={S.dangerBtn} onClick={()=>onDeleteService(form)}>Delete</button>}</div>
    <div style={S.cards}>{services.map(s=><div key={s.id} style={S.smallCard} onClick={()=>chooseService(s)}><b>{s.name}</b><span>{s.category}</span><span>{s.default_duration_minutes} min — {money(s.base_price)} — extra pet {money(s.extra_pet_price)}</span><ul>{serviceChecklist.filter(i=>i.service_id===s.id).map(i=><li key={i.id}>{i.label}</li>)}</ul></div>)}</div>
  </Panel>;
}
function VetClinicsAdmin({ vetClinics = [], onSaveVetClinic, onDeleteVetClinic }) {
  const blankVet = { clinic_name:"", phone:"", emergency_phone:"", email:"", address:"", notes:"", is_active:true };
  const [form, setForm] = useState(blankVet);
  return <Panel title="Vet Clinics">
    <p style={S.muted}>Enter each clinic once. Pet profiles can then choose the clinic from a dropdown, and the clinic phone/address will show in emergency pet info.</p>
    <div style={S.formGrid}>
      <Field label="Clinic name"><input value={form.clinic_name || ""} onChange={e=>setForm({...form,clinic_name:e.target.value})}/></Field>
      <Field label="Phone"><input value={form.phone || ""} onChange={e=>setForm({...form,phone:e.target.value})}/></Field>
      <Field label="Emergency / after-hours phone"><input value={form.emergency_phone || ""} onChange={e=>setForm({...form,emergency_phone:e.target.value})}/></Field>
      <Field label="Email"><input value={form.email || ""} onChange={e=>setForm({...form,email:e.target.value})}/></Field>
      <Field label="Address"><input value={form.address || ""} onChange={e=>setForm({...form,address:e.target.value})}/></Field>
      <Field label="Notes"><textarea value={form.notes || ""} onChange={e=>setForm({...form,notes:e.target.value})}/></Field>
    </div>
    <div style={S.row}><button style={S.primaryBtn} onClick={()=>onSaveVetClinic(form)}>Save Vet Clinic</button><button style={S.secondaryBtn} onClick={()=>setForm(blankVet)}>New</button>{form.id && <button style={S.dangerMini} onClick={()=>onDeleteVetClinic(form)}>Delete</button>}</div>
    <div style={S.cards}>{vetClinics.map(v=><div key={v.id} style={S.smallCard} onClick={()=>setForm(v)}><b>{v.clinic_name}</b><span>{v.phone}</span><span>{v.emergency_phone}</span><small>{v.address}</small></div>)}</div>
  </Panel>;
}
function PaymentModal({ visit, owner, service, onClose, onSave }) {
  const [method, setMethod] = useState(visit.payment_method || "E-transfer");
  const [notes, setNotes] = useState(visit.payment_notes || "");
  return <Modal onClose={onClose} title="Mark Visit Paid"><div style={S.stack}>
    <b>{owner?.name || "Owner"}</b>
    <span>{niceDate(visit.visit_date)} · {service?.name || "Service"} · {money(visit.total_amount)}</span>
    <Field label="Payment method"><select value={method} onChange={e=>setMethod(e.target.value)}><option>Cash</option><option>E-transfer</option><option>Cheque</option><option>Card</option><option>Other</option></select></Field>
    <Field label="Payment notes"><textarea value={notes} onChange={e=>setNotes(e.target.value)} /></Field>
    <button style={S.primaryBtn} onClick={()=>onSave(visit.id, method, notes)}>Mark Paid</button>
  </div></Modal>;
}
function DeleteConfirmModal({ request, setRequest, onClose, onConfirm }) {
  const needsExact = ["pet", "owner"].includes(request.type);
  const ok = !needsExact || request.typed === request.label;
  return <Modal onClose={onClose} title={`Delete ${request.label}`}><div style={S.stack}>
    <p>This will delete this {request.type}. Deleted records are stored in Office &gt; Deleted.</p>
    {needsExact ? <Field label={`Type exact name to confirm: ${request.label}`}><input value={request.typed || ""} onChange={e=>setRequest({...request,typed:e.target.value})}/></Field> : <p style={S.muted}>Confirm deletion.</p>}
    <div style={S.row}><button style={S.secondaryBtn} onClick={onClose}>Cancel</button><button style={S.dangerBtn} disabled={!ok} onClick={onConfirm}>Delete</button></div>
  </div></Modal>;
}
function splitMileageNotes(notes = "") {
  const raw = String(notes || "");
  const known = ["Business", "Owner visit", "Supplies", "Car wash", "Vet / emergency"];
  const found = known.find(k => raw.startsWith(`${k}:`));
  if (!found) return { mileage_type:"Business", notes: raw };
  return { mileage_type: found, notes: raw.slice(found.length + 1).trim() };
}
function TravelAdmin({ travel, visits, ownerMap, serviceMap, onSaveTravel, onDeleteTravel }) {
  const blankTravel = { travel_date: todayISO(), owner_id:"", visit_id:"", mileage:0, mileage_type:"Business", notes:"" };
  const [form, setForm] = useState(blankTravel);
  const manualTravel = travel.filter(t => !t.visit_id);
  const actualTotal = manualTravel.reduce((s,t)=>s+num(t.mileage),0);
  const assignedTotal = visits.filter(v=>v.status==='Completed').reduce((s,v)=>s+num(v.mileage),0);
  const difference = actualTotal - assignedTotal;
  const todayActual = manualTravel.filter(t=>t.travel_date===todayISO()).reduce((s,t)=>s+num(t.mileage),0);
  const todayAssigned = visits.filter(v=>v.status==='Completed' && v.visit_date===todayISO()).reduce((s,v)=>s+num(v.mileage),0);
  function editTravel(t) {
    const parsed = splitMileageNotes(t.notes);
    setForm({ id:t.id, travel_date:t.travel_date || todayISO(), owner_id:t.owner_id || "", visit_id:t.visit_id || "", mileage:t.mileage || 0, mileage_type:parsed.mileage_type, notes:parsed.notes });
  }
  function saveTravel() {
    onSaveTravel({ id:form.id, travel_date: form.travel_date, visit_id:null, owner_id: form.owner_id || null, mileage: num(form.mileage), notes: [form.mileage_type, form.notes].filter(Boolean).join(": ") });
    setForm(blankTravel);
  }
  return <Panel title="Travel / Mileage">
    <div style={S.grid3}>
      <Metric title="Actual mileage" value={`${actualTotal} km`} sub="daily travel entries" />
      <Metric title="Assigned mileage" value={`${assignedTotal} km`} sub="completed visit defaults" />
      <Metric title="Difference" value={`${difference} km`} sub="actual minus assigned" />
    </div>
    <div style={S.grid3}>
      <Metric title="Today actual" value={`${todayActual} km`} sub="manual daily entry" />
      <Metric title="Today assigned" value={`${todayAssigned} km`} sub="completed visits" />
      <Metric title="Today difference" value={`${todayActual - todayAssigned} km`} sub="daily comparison" />
    </div>
    <h3>{form.id ? "Edit mileage entry" : "Add daily actual mileage"}</h3>
    <div style={S.formGrid}><Field label="Date"><input type="date" value={form.travel_date} onChange={e=>setForm({...form,travel_date:e.target.value})}/></Field><Field label="Mileage type"><select value={form.mileage_type} onChange={e=>setForm({...form,mileage_type:e.target.value})}><option>Business</option><option>Owner visit</option><option>Supplies</option><option>Car wash</option><option>Vet / emergency</option></select></Field><Field label="Owner / optional"><select value={form.owner_id} onChange={e=>setForm({...form,owner_id:e.target.value})}><option value="">None / general business</option>{Object.values(ownerMap).map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></Field><Field label="Actual mileage"><input type="number" value={form.mileage} onChange={e=>setForm({...form,mileage:e.target.value})}/></Field></div>
    <Field label="Notes"><textarea placeholder="Examples: supplies run, car wash, meeting, owner visit, emergency trip" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></Field>
    <div style={S.row}><button style={S.primaryBtn} onClick={saveTravel}>{form.id ? "Update Mileage Entry" : "Save Daily Mileage Entry"}</button>{form.id && <button style={S.secondaryBtn} onClick={()=>setForm(blankTravel)}>Cancel Edit</button>}</div>
    <h3>Recent daily travel</h3>{manualTravel.length ? manualTravel.map(t=><div key={t.id} style={S.reportRow}><b>{niceDate(t.travel_date)}</b><span>{ownerMap[t.owner_id]?.name || "Manual"}</span><span>{t.mileage} km</span><small>{t.notes}</small><div style={S.row}><button style={S.secondaryMini} onClick={()=>editTravel(t)}>Edit</button><button style={S.dangerMini} onClick={()=>onDeleteTravel?.(t)}>Delete</button></div></div>) : <Empty text="No mileage entries yet." />}
    <h3>Assigned visit mileage</h3>{visits.filter(v=>v.status==='Completed' && num(v.mileage)>0).slice(0,50).map(v=><div key={v.id} style={S.reportRow}><b>{niceDate(v.visit_date)}</b><span>{ownerMap[v.owner_id]?.name || "Unknown"}</span><span>{v.mileage} km</span><small>{serviceMap[v.service_id]?.name || "Visit"}</small></div>)}
  </Panel>;
}
function SettingsAdmin({ settings, onSaveSettings }) {
  const [form, setForm] = useState(settings || { business_name:"Pet Care", business_phone:"", business_email:"", default_email:"", tax_number:"", business_notes:"", charge_gst:false, gst_rate:5 });
  useEffect(()=>setForm(settings || form), [settings?.id]);
  return <Panel title="Business Settings"><div style={S.formGrid}><Field label="Business name"><input value={form.business_name||""} onChange={e=>setForm({...form,business_name:e.target.value})}/></Field><Field label="Phone"><input value={form.business_phone||""} onChange={e=>setForm({...form,business_phone:e.target.value})}/></Field><Field label="Email"><input value={form.business_email||""} onChange={e=>setForm({...form,business_email:e.target.value})}/></Field><Field label="Default report email"><input value={form.default_email||""} onChange={e=>setForm({...form,default_email:e.target.value})}/></Field><Field label="Tax number"><input value={form.tax_number||""} onChange={e=>setForm({...form,tax_number:e.target.value})}/></Field><Field label="GST rate"><input type="number" value={form.gst_rate||0} onChange={e=>setForm({...form,gst_rate:e.target.value})}/></Field></div><label style={S.checkCompact}><input style={S.checkboxSmall} type="checkbox" checked={!!form.charge_gst} onChange={e=>setForm({...form,charge_gst:e.target.checked})}/> <span>Charge GST</span></label><Field label="Business notes"><textarea value={form.business_notes||""} onChange={e=>setForm({...form,business_notes:e.target.value})}/></Field><button style={S.primaryBtn} onClick={()=>onSaveSettings(form)}>Save Settings</button></Panel>;
}
function DeletedAdmin({ deleted, onHardDeleteDeleted }) {
  return <Panel title="Deleted Items"><p style={S.muted}>Deleted items are logged here for reference. Restore can be added after the new data model is fully stable.</p>{deleted.map(d=><div key={d.id} style={S.reportRow}><b>{d.item_type}</b><span>{d.item_label}</span><span>{new Date(d.deleted_at).toLocaleString()}</span><button style={S.dangerMini} onClick={()=>onHardDeleteDeleted(d.id)}>Remove log</button></div>)}</Panel>;
}
function VisitCard({ visit, owner, pets = [], service, onStart, onComplete, onPetInfo, onCancel, onMarkPaid, onMarkUnpaid, onDeleteVisit, onReschedule }) {
  const safePets = (pets || []).filter(Boolean);
  const canPetInfo = typeof onPetInfo === "function";
  const hasActions = !!(onCancel || onDeleteVisit || onReschedule);
  return <div style={S.visitCard}>
    <div>
      <b>{niceDate(visit.visit_date)} {timeLabel(visit.scheduled_start_time)}</b>
      <div>{owner?.name || "Unknown owner"} — {service?.name || "Service"}</div>
      <div style={S.petLine}>
        {safePets.length ? safePets.map(p => (
          <button key={p.id} style={S.petChip} disabled={!canPetInfo} onClick={() => canPetInfo && onPetInfo(p.id)}>{p.name} Info</button>
        )) : <small style={S.muted}>No pet attached</small>}
      </div>
      <small style={S.muted}>{visit.status} · {visit.duration_minutes} min · {money(visit.total_amount)} · {visit.is_paid ? `Paid${visit.paid_at ? " " + niceDate(String(visit.paid_at).slice(0,10)) : ""}` : "Unpaid"}</small>
    </div>
    <div style={S.cardActionsCompact}>
      {visit.status === "Scheduled" && onStart && <button style={S.secondaryMini} onClick={() => onStart(visit.id)}>Start</button>}
      {["Scheduled","In Progress"].includes(visit.status) && onComplete && <button style={S.primaryMini} onClick={() => onComplete(visit.id)}>Complete</button>}
      {visit.status === "Completed" && !visit.is_paid && onMarkPaid && <button style={S.primaryMini} onClick={() => onMarkPaid(visit.id)}>Mark Paid</button>}
      {visit.status === "Completed" && visit.is_paid && onMarkUnpaid && <button style={S.secondaryMini} onClick={() => onMarkUnpaid(visit.id)}>Mark Unpaid</button>}
      {hasActions && <details style={S.actionsMenu}>
        <summary style={S.actionsSummary}>Actions</summary>
        <div style={S.actionsBody}>
          {visit.status !== "Completed" && onReschedule && <button style={S.secondaryMini} onClick={() => onReschedule(visit)}>Reschedule</button>}
          {visit.status === "Scheduled" && onCancel && <button style={S.dangerMini} onClick={() => onCancel(visit.id)}>Cancel</button>}
          {onDeleteVisit && <button style={S.dangerMini} onClick={() => onDeleteVisit(visit)}>Delete</button>}
        </div>
      </details>}
    </div>
  </div>;
}
function CompleteModal({ visit, checklist, owner, pets, service, onToggleChecklist, onClose, onSave }) {
  const [form, setForm] = useState({ completion_notes: visit.completion_notes || "", incident_notes: visit.incident_notes || "", is_paid: !!visit.is_paid, payment_method: visit.payment_method || "", payment_notes: visit.payment_notes || "" });
  const visibleChecklist = [];
  const seenChecklist = new Set();
  (checklist || []).forEach(i => {
    const label = String(i.label || "").trim();
    const key = label.toLowerCase();
    if (!label || key === "is paid" || seenChecklist.has(key)) return;
    seenChecklist.add(key);
    visibleChecklist.push(i);
  });
  return <Modal onClose={onClose} title="Complete Visit"><div style={S.stack}>
    <b>{service?.name}</b>
    <span>{owner?.name} — {pets.map(p=>p.name).join(", ")}</span>
    <p style={S.muted}>Service-rate based. Complete the visit without starting a timer.</p>
    <Panel title="Checklist">
      <div style={S.compactChecklist}>{visibleChecklist.length ? visibleChecklist.map(i=><label key={i.id} style={S.checkCompact}><input style={S.checkboxSmall} type="checkbox" checked={!!i.is_done} onChange={()=>onToggleChecklist(i)} /> <span>{i.label}</span></label>) : <Empty text="No checklist items for this visit." />}</div>
    </Panel>
    <label style={S.checkCompact}><input style={S.checkboxSmall} type="checkbox" checked={!!form.is_paid} onChange={e=>setForm({...form,is_paid:e.target.checked})}/> <span>Mark as paid</span></label>
    {form.is_paid && <><Field label="Payment method"><select value={form.payment_method || ""} onChange={e=>setForm({...form,payment_method:e.target.value})}><option value="">Select method</option><option>Cash</option><option>E-transfer</option><option>Cheque</option><option>Card</option><option>Other</option></select></Field><Field label="Payment notes"><textarea value={form.payment_notes || ""} onChange={e=>setForm({...form,payment_notes:e.target.value})}/></Field></>}
    <Field label="Completion notes"><textarea value={form.completion_notes} onChange={e=>setForm({...form,completion_notes:e.target.value})}/></Field>
    <Field label="Incident / issue notes"><textarea value={form.incident_notes} onChange={e=>setForm({...form,incident_notes:e.target.value})}/></Field>
    <button style={S.primaryBtn} onClick={()=>onSave(visit.id, form)}>Mark Completed</button>
  </div></Modal>;
}

function cleanPhoneHref(phone) {
  const raw = String(phone || "").trim();
  if (!raw) return "";
  const cleaned = raw.replace(/[^0-9+]/g, "");
  return cleaned ? `tel:${cleaned}` : "";
}
function PhoneAction({ label = "Call", phone }) {
  const href = cleanPhoneHref(phone);
  if (!href) return null;
  return <a style={S.callBtn} href={href}>{label}</a>;
}
function PhoneInfoLine({ label, name, phone, danger=false }) {
  const hasName = !!String(name || "").trim();
  const hasPhone = !!String(phone || "").trim();
  if (!hasName && !hasPhone) return null;
  return <div style={danger?S.infoDanger:S.info}>
    <b>{label}</b>
    {hasName && <div>{name}</div>}
    {hasPhone && <div style={S.phoneRow}><a style={S.phoneLink} href={cleanPhoneHref(phone)}>{phone}</a><PhoneAction label="Call" phone={phone} /></div>}
  </div>;
}

function PetInfoModal({ pet, owner, vetClinic, onClose }) {
  if (!pet) {
    return <Modal onClose={onClose} title="Pet Info"><Empty text="Pet information is not available for this visit." /></Modal>;
  }
  const ownerContact = owner?.name || "";
  const ownerPhone = owner?.phone || "";
  const ownerEmergencyName = owner?.emergency_contact_name || "";
  const ownerEmergencyPhone = owner?.emergency_contact_phone || "";
  const vetName = vetClinic?.clinic_name || pet.vet_name || pet.emergency_vet;
  const vetPhone = vetClinic?.phone || pet.vet_phone;
  const vetEmergency = vetClinic?.emergency_phone || pet.emergency_vet;
  return <Modal onClose={onClose} title={`${pet.name || "Pet"} — Emergency & Care Info`}>
    <div style={S.petInfo}>
      <PetHero pet={pet} />
      <p style={S.muted}>{[pet.species, pet.breed, pet.color_description].filter(Boolean).join(" · ")}</p>
      <div style={S.infoGrid}>
        <PhoneInfoLine label="Owner" name={ownerContact} phone={ownerPhone} />
        <PhoneInfoLine label="Owner emergency contact" name={ownerEmergencyName} phone={ownerEmergencyPhone} danger />
        <InfoLine label="Access instructions" value={owner?.access_instructions} danger />
        <InfoLine label="House instructions" value={owner?.house_instructions} />
        <InfoLine label="Vet clinic" value={vetName} danger />
        <PhoneInfoLine label="Vet phone" phone={vetPhone} danger />
        <InfoLine label="Vet address" value={vetClinic?.address} />
        <PhoneInfoLine label="Emergency / after-hours vet" phone={vetEmergency} danger />
        <InfoLine label="Medical conditions" value={pet.medical_conditions} danger />
        <InfoLine label="Allergies" value={pet.allergies} danger />
        <InfoLine label="Emergency instructions" value={pet.emergency_instructions} danger />
        <InfoLine label="Medication" value={pet.medication_instructions} />
        <InfoLine label="Feeding" value={pet.feeding_instructions} />
        <InfoLine label="Behavior warnings" value={pet.behavior_notes} danger />
        <InfoLine label="Leash / harness" value={pet.leash_harness_notes} />
        <InfoLine label="Favorite things" value={pet.favorite_things} />
        <InfoLine label="Hide spots" value={pet.hide_spots} />
        <InfoLine label="Care notes" value={pet.care_notes} />
      </div>
    </div>
  </Modal>;
}

function Modal({ title, children, onClose }) { return <div style={S.modalShade}><div style={S.modal}><div style={S.modalHead}><h2>{title}</h2><button style={S.ghostBtn} onClick={onClose}>Close</button></div>{children}</div></div>; }
function Panel({ title, children }) { return <div style={S.card}>{title ? <h2>{title}</h2> : null}{children}</div>; }
function Metric({ title, value, sub }) { return <div style={S.metric}><span>{title}</span><b>{value}</b><small>{sub}</small></div>; }
function Empty({ text }) { return <p style={S.muted}>{text}</p>; }
function Field({ label, children }) { return <label style={S.field}><span>{label}</span>{children}</label>; }
function visitPetsFor(visit, visitPets, petMapOrPets) { const map = Array.isArray(petMapOrPets) ? Object.fromEntries(petMapOrPets.map(p=>[p.id,p])) : petMapOrPets; const rows = visitPets.filter(vp=>vp.visit_id===visit.id).map(vp=>map[vp.pet_id]).filter(Boolean); if(rows.length) return rows; return visit.primary_pet_id && map[visit.primary_pet_id] ? [map[visit.primary_pet_id]] : []; }
function InfoLine({ label, value, danger=false }) { if (!value && value !== 0) return null; return <div style={danger?S.infoDanger:S.info}><b>{label}</b><div>{String(value)}</div></div>; }
function OwnerHero({ owner, onEdit }) {
  if (!owner) return null;
  return <div style={S.ownerHero}>
    <div style={S.ownerAvatar}>🐾</div>
    <div style={S.ownerHeroText}>
      <b>{owner.name || "Selected owner"}</b>
      <span>{owner.phone || owner.email || "No contact info"}</span>
      {owner.address ? <small>{owner.address}</small> : null}
    </div>
    <button style={S.heroEditBtn} onClick={onEdit}>Edit</button>
  </div>;
}
function OwnerSummary({ owner }) {
  if (!owner) return <Empty text="Choose an owner or create a new one." />;
  return <div style={S.infoGrid}>
    <PhoneInfoLine label="Phone" phone={owner.phone} />
    <InfoLine label="Email" value={owner.email} />
    <InfoLine label="Invoice email" value={owner.invoice_email} />
    <InfoLine label="Address" value={owner.address} />
    <PhoneInfoLine label="Emergency contact" name={owner.emergency_contact_name} phone={owner.emergency_contact_phone} danger />
        <InfoLine label="Access instructions" value={owner.access_instructions} danger />
    <InfoLine label="House instructions" value={owner.house_instructions} />
    <InfoLine label="Billing notes" value={owner.billing_notes} />
    <InfoLine label="Notes" value={owner.notes} />
  </div>;
}
function PetHero({ pet }) {
  if (!pet) return null;
  const bg = pet.photo_url ? { backgroundImage: `linear-gradient(180deg, rgba(8,21,58,0.05) 0%, rgba(8,21,58,0.32) 45%, rgba(8,21,58,0.88) 100%), url(${pet.photo_url})` } : {};
  return <div style={{...S.petHero, ...bg}}>
    {!pet.photo_url && <div style={S.photoBlank}>No pet photo yet</div>}
    <div style={S.petHeroText}>
      <b>{petFace(pet)} {pet.name || "Pet"}</b>
      <span>{[pet.species, pet.breed, pet.age_text].filter(Boolean).join(" · ") || "Pet profile"}</span>
    </div>
  </div>;
}
function PetReadOnly({ pet, petTab, visits, serviceMap, visitPets, petMap, petChecklist, vetClinics = [] }) {
  if (!pet) return <Empty text="Choose a pet or add a new pet." />;
  const vetClinic = vetClinics.find(v => v.id === pet.vet_clinic_id);
  if (petTab === "Profile") return <div style={S.infoGrid}>
    <PetHero pet={pet} />
    <InfoLine label="Species" value={pet.species} />
    <InfoLine label="Breed" value={pet.breed} />
    <InfoLine label="Color / description" value={pet.color_description} />
    <InfoLine label="Age" value={pet.age_text} />
    <InfoLine label="Weight" value={pet.weight} />
    <InfoLine label="Sex" value={pet.sex} />
    <InfoLine label="Spayed / neutered" value={pet.spayed_neutered} />
  </div>;
  if (petTab === "Care") return <div style={S.infoGrid}><InfoLine label="Feeding instructions" value={pet.feeding_instructions} /><InfoLine label="Medication instructions" value={pet.medication_instructions} danger /><InfoLine label="Behavior notes" value={pet.behavior_notes} /><InfoLine label="Leash / harness notes" value={pet.leash_harness_notes} /><InfoLine label="Favorite things" value={pet.favorite_things} /><InfoLine label="Hide spots" value={pet.hide_spots} /><InfoLine label="Care notes" value={pet.care_notes} /></div>;
  if (petTab === "Emergency") return <div style={S.infoGrid}><InfoLine label="Medical conditions" value={pet.medical_conditions} danger /><InfoLine label="Allergies" value={pet.allergies} danger /><InfoLine label="Vet clinic" value={vetClinic?.clinic_name || pet.vet_name} /><PhoneInfoLine label="Vet phone" phone={vetClinic?.phone || pet.vet_phone} danger /><InfoLine label="Vet address" value={vetClinic?.address} /><PhoneInfoLine label="Emergency / after-hours vet" phone={vetClinic?.emergency_phone || pet.emergency_vet} danger /><InfoLine label="Emergency instructions" value={pet.emergency_instructions} danger /></div>;
  if (petTab === "Checklist") return <div style={S.stack}>{petChecklist.filter(i=>i.pet_id===pet.id).length ? <ul>{petChecklist.filter(i=>i.pet_id===pet.id).map(i=><li key={i.id}>{i.label}</li>)}</ul> : <Empty text="No pet-specific checklist items yet." />}</div>;
  return <div style={S.stack}>{visits.length ? visits.map(v=><VisitHistoryRow key={v.id} visit={v} service={serviceMap[v.service_id]} pets={visitPetsFor(v, visitPets, petMap)} />) : <Empty text="No visit history for this pet yet." />}</div>;
}
function VisitHistoryRow({ visit, service, pets, onDeleteVisit }) { return <div style={S.visitHistory}><div><b>{niceDate(visit.visit_date)} {timeLabel(visit.scheduled_start_time)}</b><div style={S.muted}>{service?.name || "Service"} · {pets.map(p=>p.name).join(", ")}</div></div><div style={S.status}>{visit.status}</div><div><b>{money(visit.total_amount)}</b></div>{onDeleteVisit && <button style={S.dangerMini} onClick={()=>onDeleteVisit(visit)}>Delete</button>}</div>; }
function OwnerBillingSummary({ owner, visits, visitPets, petMap, serviceMap, onMarkPaid, onMarkUnpaid, onMarkManyPaid }) {
  const completed = visits.filter(v=>v.status==="Completed");
  const [billingFilter, setBillingFilter] = useState("unpaid");
  const [billingRange, setBillingRange] = useState("all");
  const today = todayISO();
  const monthPrefix = today.slice(0,7);
  const yearPrefix = today.slice(0,4);
  const ranged = completed.filter(v => billingRange === "month" ? String(v.visit_date || "").startsWith(monthPrefix) : billingRange === "year" ? String(v.visit_date || "").startsWith(yearPrefix) : true);
  const unpaid = ranged.filter(v=>!v.is_paid);
  const paid = ranged.filter(v=>v.is_paid);
  const previewRows = billingFilter === "paid" ? paid : billingFilter === "all" ? ranged : unpaid;
  const [selected, setSelected] = useState([]);
  function toggle(id) { setSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]); }
  function ownerStatementText(rows, title) {
    const lines = [title, owner?.name || "Owner", owner?.address || "", owner?.invoice_email || owner?.email || "", ""];
    rows.forEach(v => {
      lines.push(`${niceDate(v.visit_date)} ${v.scheduled_start_time || ""} — ${serviceMap[v.service_id]?.name || "Service"} — ${visitPetsFor(v, visitPets, petMap).map(p=>p.name).join(", ")} — ${money(v.total_amount)} — ${v.is_paid ? "Paid" : "Unpaid"}`);
    });
    lines.push("");
    lines.push(`Total: ${money(rows.reduce((s,v)=>s+num(v.total_amount),0))}`);
    return lines.join("\n");
  }
  const unpaidText = ownerStatementText(unpaid, "Invoice / Unpaid Statement");
  const statementText = ownerStatementText(completed, "Owner Statement");
  return <div style={S.stack}>
    <Panel title="Billing Preview"><div style={S.formGrid}>
      <Field label="Date range"><select value={billingRange} onChange={e=>setBillingRange(e.target.value)}><option value="all">All time</option><option value="month">This month</option><option value="year">This year</option></select></Field>
      <Field label="Show"><select value={billingFilter} onChange={e=>setBillingFilter(e.target.value)}><option value="unpaid">Unpaid only</option><option value="paid">Paid only</option><option value="all">All completed</option></select></Field>
    </div><div style={S.stack}>{previewRows.length ? previewRows.slice(0,20).map(v=>{
      const oneText = singleVisitBillingText(owner, v, visitPets, petMap, serviceMap, "Individual Invoice");
      return <div key={v.id} style={S.billingRowCompact}>
        <div><b>{niceDate(v.visit_date)} {timeLabel(v.scheduled_start_time)}</b><div style={S.muted}>{serviceMap[v.service_id]?.name || "Service"} · {visitPetsFor(v, visitPets, petMap).map(p=>p.name).join(", ")}</div></div>
        <b>{money(v.total_amount)}</b><small>{v.is_paid ? "Paid" : "Unpaid"}</small>
        <div style={S.row}><button style={S.secondaryMini} onClick={()=>printBillingDocument(`${owner?.name || "Owner"} Individual Invoice`, owner, [v], visitPets, petMap, serviceMap)}>Print This Invoice</button><button style={S.secondaryMini} onClick={()=>emailTextDocument(`${owner?.name || "Owner"} Individual Invoice`, oneText, owner?.invoice_email || owner?.email)}>Email This Invoice</button></div>
      </div>;
    }) : <Empty text="No visits match this preview." />}</div></Panel>
    <div style={S.row}><button style={S.primaryBtn} onClick={()=>printBillingDocument(`${owner?.name || "Owner"} Unpaid Invoice`, owner, unpaid, visitPets, petMap, serviceMap)}>Print All Unpaid</button><button style={S.secondaryBtn} onClick={()=>emailTextDocument(`${owner?.name || "Owner"} Unpaid Invoice`, unpaidText, owner?.invoice_email || owner?.email)}>Email All Unpaid</button><button style={S.secondaryBtn} onClick={()=>printBillingDocument(`${owner?.name || "Owner"} Statement`, owner, completed, visitPets, petMap, serviceMap)}>Print Statement</button><button style={S.secondaryBtn} onClick={()=>emailTextDocument(`${owner?.name || "Owner"} Statement`, statementText, owner?.invoice_email || owner?.email)}>Email Statement</button></div>
    <div style={S.infoGrid}>
      <InfoLine label="Owner" value={owner?.name} />
      <InfoLine label="Completed visits" value={completed.length} />
      <InfoLine label="Completed revenue" value={money(completed.reduce((s,v)=>s+num(v.total_amount),0))} />
      <InfoLine label="Unpaid total" value={money(unpaid.reduce((s,v)=>s+num(v.total_amount),0))} danger={unpaid.length>0} />
      <InfoLine label="Paid total" value={money(paid.reduce((s,v)=>s+num(v.total_amount),0))} />
      <InfoLine label="Billing notes" value={owner?.billing_notes} />
      <InfoLine label="Payment notes" value={owner?.payment_notes} />
    </div>
    <Panel title="Unpaid Completed Visits">
      {unpaid.length ? <div style={S.stack}>
        <div style={S.row}><button style={S.primaryBtn} onClick={()=>onMarkManyPaid(selected)}>Mark Selected Paid</button><button style={S.secondaryBtn} onClick={()=>setSelected(unpaid.map(v=>v.id))}>Select All</button><button style={S.secondaryBtn} onClick={()=>setSelected([])}>Clear</button></div>
        {unpaid.map(v=><div key={v.id} style={S.billingRow}><label style={S.checkCompact}><input style={S.checkboxSmall} type="checkbox" checked={selected.includes(v.id)} onChange={()=>toggle(v.id)} /> <span>Select</span></label><div><b>{niceDate(v.visit_date)} {timeLabel(v.scheduled_start_time)}</b><div style={S.muted}>{serviceMap[v.service_id]?.name || "Service"} · {visitPetsFor(v, visitPets, petMap).map(p=>p.name).join(", ")}</div></div><b>{money(v.total_amount)}</b><button style={S.primaryMini} onClick={()=>onMarkPaid(v.id)}>Mark Paid</button></div>)}
      </div> : <Empty text="No unpaid completed visits for this owner." />}
    </Panel>
    <Panel title="Paid Visits">
      {paid.length ? paid.slice(0,25).map(v=><div key={v.id} style={S.billingRowCompact}><div><b>{niceDate(v.visit_date)} {timeLabel(v.scheduled_start_time)}</b><div style={S.muted}>{serviceMap[v.service_id]?.name || "Service"} · {visitPetsFor(v, visitPets, petMap).map(p=>p.name).join(", ")} · {v.payment_method || "No method"}</div></div><b>{money(v.total_amount)}</b><small>{v.paid_at ? niceDate(String(v.paid_at).slice(0,10)) : "Paid"}</small><button style={S.secondaryMini} onClick={()=>onMarkUnpaid(v.id)}>Mark Unpaid</button></div>) : <Empty text="No paid visits yet." />}
    </Panel>
  </div>;
}
function OwnerForm({ value, onChange }) {
  return <div style={S.stack}>
    <div style={S.formGrid}>
      {[
        ["name", "Owner name"], ["phone", "Phone"], ["email", "Email"], ["address", "Address"]
      ].map(([k,label])=><Field key={k} label={label}><input type={k.includes("mileage")?"number":"text"} value={value[k]||""} onChange={e=>onChange({...value,[k]:e.target.value})}/></Field>)}
      <Field label="Access instructions"><textarea value={value.access_instructions||""} onChange={e=>onChange({...value,access_instructions:e.target.value})}/></Field>
    </div>
    <details style={S.collapse}><summary style={S.collapseSummary}>Billing and invoice details</summary><div style={S.formGrid}>
      <Field label="Invoice email"><input value={value.invoice_email||""} onChange={e=>onChange({...value,invoice_email:e.target.value})}/></Field>
      <Field label="Billing notes"><textarea value={value.billing_notes||""} onChange={e=>onChange({...value,billing_notes:e.target.value})}/></Field>
      <Field label="Payment notes"><textarea value={value.payment_notes||""} onChange={e=>onChange({...value,payment_notes:e.target.value})}/></Field>
    </div></details>
    <details style={S.collapse}><summary style={S.collapseSummary}>Emergency and house notes</summary><div style={S.formGrid}>
      <Field label="Emergency contact name"><input value={value.emergency_contact_name||""} onChange={e=>onChange({...value,emergency_contact_name:e.target.value})}/></Field>
      <Field label="Emergency contact phone"><input value={value.emergency_contact_phone||""} onChange={e=>onChange({...value,emergency_contact_phone:e.target.value})}/></Field>
      <Field label="House instructions"><textarea value={value.house_instructions||""} onChange={e=>onChange({...value,house_instructions:e.target.value})}/></Field>
      <Field label="General notes"><textarea value={value.notes||""} onChange={e=>onChange({...value,notes:e.target.value})}/></Field>
    </div></details>
  </div>;
}
function PetForm({ value, onChange, vetClinics = [], onSaveVetClinic }) {
  const [newVet, setNewVet] = useState({ clinic_name:"", phone:"", emergency_phone:"", address:"", notes:"" });
  function handlePhotoFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ ...value, photo_url: reader.result });
    reader.readAsDataURL(file);
  }
  return <div style={S.stack}>
    <div style={S.photoPickerBox}>
      {value.photo_url ? <img src={value.photo_url} style={S.petPhotoBig} /> : <div style={S.photoBlank}>No pet photo yet</div>}
      <div style={S.row}>
        <label style={S.secondaryBtn}>Add photo<input style={{display:"none"}} type="file" accept="image/*" capture="environment" onChange={e=>handlePhotoFile(e.target.files?.[0])}/></label>
        {value.photo_url && <button style={S.dangerMini} onClick={()=>onChange({...value,photo_url:""})}>Remove</button>}
      </div>
    </div>

    <div style={S.formGrid}>
      {[["name","Pet name"],["species","Species"],["breed","Breed"],["age_text","Age"]].map(([k,label])=><Field key={k} label={label}><input type={k.includes("mileage")?"number":"text"} value={value[k]||""} onChange={e=>onChange({...value,[k]:e.target.value})}/></Field>)}
      <Field label="Vet clinic"><select value={value.vet_clinic_id || ""} onChange={e=>onChange({...value,vet_clinic_id:e.target.value})}><option value="">Select vet clinic</option>{vetClinics.map(v=><option key={v.id} value={v.id}>{v.clinic_name}</option>)}</select></Field>
      <Field label="Emergency instructions"><textarea value={value.emergency_instructions||""} onChange={e=>onChange({...value,emergency_instructions:e.target.value})}/></Field>
    </div>

    <details style={S.collapse}><summary style={S.collapseSummary}>Care instructions</summary><div style={S.formGrid}>
      {["feeding_instructions","medication_instructions","leash_harness_notes","favorite_things","hide_spots","care_notes"].map(k=><Field key={k} label={k.replaceAll("_"," ")}><textarea value={value[k]||""} onChange={e=>onChange({...value,[k]:e.target.value})}/></Field>)}
    </div></details>

    <details style={S.collapse}><summary style={S.collapseSummary}>Medical and behavior details</summary><div style={S.formGrid}>
      {["medical_conditions","allergies","behavior_notes"].map(k=><Field key={k} label={k.replaceAll("_"," ")}><textarea value={value[k]||""} onChange={e=>onChange({...value,[k]:e.target.value})}/></Field>)}
      {["color_description","weight","sex","spayed_neutered"].map(k=><Field key={k} label={k.replaceAll("_"," ")}><input value={value[k]||""} onChange={e=>onChange({...value,[k]:e.target.value})}/></Field>)}
    </div></details>

    <details style={S.collapse}><summary style={S.collapseSummary}>Vet overrides and quick add clinic</summary><div style={S.formGrid}>
      <Field label="Vet name override"><input value={value.vet_name||""} onChange={e=>onChange({...value,vet_name:e.target.value})}/></Field>
      <Field label="Vet phone override"><input value={value.vet_phone||""} onChange={e=>onChange({...value,vet_phone:e.target.value})}/></Field>
      <Field label="Emergency vet override"><input value={value.emergency_vet||""} onChange={e=>onChange({...value,emergency_vet:e.target.value})}/></Field>
      <Field label="Clinic name"><input value={newVet.clinic_name} onChange={e=>setNewVet({...newVet,clinic_name:e.target.value})}/></Field>
      <Field label="Phone"><input value={newVet.phone} onChange={e=>setNewVet({...newVet,phone:e.target.value})}/></Field>
      <Field label="Emergency / after-hours phone"><input value={newVet.emergency_phone} onChange={e=>setNewVet({...newVet,emergency_phone:e.target.value})}/></Field>
      <Field label="Address"><input value={newVet.address} onChange={e=>setNewVet({...newVet,address:e.target.value})}/></Field>
    </div><button style={S.secondaryBtn} onClick={()=>{ if(newVet.clinic_name.trim()){ onSaveVetClinic(newVet); setNewVet({ clinic_name:"", phone:"", emergency_phone:"", address:"", notes:"" }); }}}>Save Vet Clinic</button></details>
  </div>;
}
function ServiceForm({ value, onChange }) { return <div style={S.formGrid}>{["name","category","default_duration_minutes","base_price","extra_pet_price"].map(k=><Field key={k} label={k.replaceAll("_"," ")}><input type={["default_duration_minutes","base_price","extra_pet_price"].includes(k)?"number":"text"} value={value[k]||""} onChange={e=>onChange({...value,[k]:e.target.value})}/></Field>)}<label style={S.checkCompact}><input style={S.checkboxSmall} type="checkbox" checked={!!value.taxable} onChange={e=>onChange({...value,taxable:e.target.checked})}/> <span>Taxable</span></label><Field label="Description"><textarea value={value.description||""} onChange={e=>onChange({...value,description:e.target.value})}/></Field></div>; }
function OptionForm({ value, onChange, services, pets=[] }) { return <div style={S.formGrid}>
  <Field label="Option name"><input value={value.option_name||""} onChange={e=>onChange({...value,option_name:e.target.value})}/></Field>
  {pets.length > 0 && <Field label="Pet"><select value={value.pet_id||""} onChange={e=>onChange({...value,pet_id:e.target.value})}><option value="">Select pet</option>{pets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>}
  <Field label="Service"><select value={value.service_id||""} onChange={e=>{const s=services.find(x=>x.id===e.target.value); onChange({...value,service_id:e.target.value,default_duration_minutes:s?.default_duration_minutes||value.default_duration_minutes,default_price:s?.base_price||value.default_price});}}><option value="">Select</option>{services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
  <Field label="Duration"><input type="number" value={value.default_duration_minutes||0} onChange={e=>onChange({...value,default_duration_minutes:e.target.value})}/></Field>
  <Field label="Service rate"><input type="number" value={value.default_price||0} onChange={e=>onChange({...value,default_price:e.target.value})}/></Field>
  <Field label="Extra checklist items, one per line"><textarea value={value.default_checklist_notes||""} onChange={e=>onChange({...value,default_checklist_notes:e.target.value})}/></Field>
  <Field label="Default visit notes"><textarea value={value.default_visit_notes||""} onChange={e=>onChange({...value,default_visit_notes:e.target.value})}/></Field>
</div>; }
function petFace(pet) {
  const species = String(pet?.species || "").toLowerCase();
  if (species.includes("dog")) return "🐶";
  if (species.includes("cat")) return "🐱";
  return "🐾";
}
function petButtonStyle(pet, active) {
  const species = String(pet?.species || "").toLowerCase();
  if (species.includes("dog")) return active ? S.petPickDogActive : S.petPickDog;
  if (species.includes("cat")) return active ? S.petPickCatActive : S.petPickCat;
  return active ? S.petPickOtherActive : S.petPickOther;
}
function PetMini({ pet, active, onClick, onInfo }) {
  const hasPhoto = !!pet.photo_url;
  const bg = hasPhoto ? { backgroundImage: `linear-gradient(180deg, rgba(8,21,58,0.12) 0%, rgba(8,21,58,0.35) 45%, rgba(8,21,58,0.86) 100%), url(${pet.photo_url})` } : {};
  return <button type="button" style={{...(active?S.petPhotoCardActive:S.petPhotoCard), ...bg}} onClick={onClick}>
    {!hasPhoto && <div style={S.photoSmall}>{petFace(pet)}</div>}
    <div style={S.petPhotoOverlay}>
      <b>{petFace(pet)} {pet.name || "Pet"}</b>
      <small>{[pet.species, pet.breed].filter(Boolean).join(" · ") || "Pet profile"}</small>
      <span style={S.petPhotoCardHint}>{active ? "Selected" : "Tap to select"}</span>
    </div>
    <span style={S.petCardInfoBtn} onClick={(e)=>{e.stopPropagation(); onInfo();}}>Info</span>
  </button>;
}

const S = {
  app:{minHeight:"100svh",background:"radial-gradient(circle at top left,rgba(15,98,254,.10),transparent 280px),radial-gradient(circle at 80% 20%,rgba(255,51,102,.08),transparent 240px),linear-gradient(180deg,#fffaf2 0%,#ffffff 46%,#f5fbff 100%)",color:"#08153a",paddingBottom:94,fontFamily:"system-ui,Segoe UI,Roboto,sans-serif"},
  header:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,padding:"18px 14px 8px",maxWidth:430,margin:"0 auto"},
  kicker:{display:"none"},
  title:{fontSize:26,margin:0,fontWeight:950,color:"#071746",lineHeight:1.02,letterSpacing:"-1.1px"},
  main:{maxWidth:430,margin:"0 auto",padding:"8px 10px 36px",overflowX:"hidden"},
  stack:{display:"grid",gap:14},
  grid3:{display:"grid",gridTemplateColumns:"1fr",gap:12},
  compactHeaderStats:{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",justifyContent:"flex-start",padding:"10px 12px",border:"1px solid rgba(191,219,254,.95)",borderRadius:18,background:"rgba(255,255,255,.88)",boxShadow:"0 10px 24px rgba(8,21,58,.06)",fontWeight:800,color:"#334155"},
  compactHeaderStatsSpan:{display:"inline-flex"},
  twoCol:{display:"grid",gridTemplateColumns:"1fr",gap:12},
  twoColBalanced:{display:"grid",gridTemplateColumns:"1fr",gap:12},
  card:{background:"rgba(255,255,255,.96)",border:"1px solid rgba(191,219,254,.85)",borderRadius:26,padding:16,boxShadow:"0 18px 48px rgba(8,21,58,.08)",textAlign:"left",overflow:"hidden"},
  metric:{background:"linear-gradient(145deg,#ffffff,#f8fbff)",border:"1px solid rgba(191,219,254,.95)",borderRadius:24,padding:17,textAlign:"left",boxShadow:"0 14px 34px rgba(8,21,58,.075)",display:"grid",gap:4},
  muted:{color:"#64748b"},
  error:{maxWidth:430,margin:"8px auto",padding:12,borderRadius:16,background:"#fff1f2",color:"#9f1239",textAlign:"left"},
  toast:{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:50,background:"#071746",color:"#fff",padding:"10px 18px",borderRadius:999,animation:"successPop 1.4s ease"},
  saving:{position:"fixed",right:16,bottom:95,background:"#071746",color:"#fff",padding:"10px 14px",borderRadius:16,zIndex:60},
  bottomNav:{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"min(100%,430px)",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,padding:"8px 8px calc(8px + env(safe-area-inset-bottom))",background:"rgba(255,255,255,.94)",borderTop:"1px solid rgba(191,219,254,.9)",borderLeft:"1px solid rgba(191,219,254,.55)",borderRight:"1px solid rgba(191,219,254,.55)",borderRadius:"24px 24px 0 0",backdropFilter:"blur(16px)",zIndex:40,boxShadow:"0 -18px 42px rgba(8,21,58,.12)"},
  navBtn:{border:"1px solid rgba(191,219,254,.95)",background:"#fff",borderRadius:19,padding:"13px 4px",fontWeight:900,color:"#334155",fontSize:14,boxShadow:"0 5px 12px rgba(8,21,58,.04)"},
  navActive:{border:"1px solid #0f62fe",background:"linear-gradient(180deg,#eff6ff,#ffffff)",borderRadius:19,padding:"13px 4px",fontWeight:950,color:"#0f62fe",fontSize:14,boxShadow:"0 12px 28px rgba(15,98,254,.22)"},
  primaryBtn:{border:0,background:"linear-gradient(135deg,#0f62fe 0%,#19b7ff 45%,#2dd4bf 100%)",color:"#fff",borderRadius:18,padding:"13px 18px",fontWeight:950,boxShadow:"0 14px 28px rgba(15,98,254,.25)",minHeight:48},
  secondaryBtn:{border:"1px solid #bfdbfe",background:"#fff",color:"#071746",borderRadius:18,padding:"12px 15px",fontWeight:900,minHeight:46},
  ghostBtn:{border:"1px solid #dbeafe",background:"rgba(255,255,255,.72)",borderRadius:16,padding:"10px 13px",fontWeight:900},
  refreshBtn:{border:"1px solid #dbeafe",background:"rgba(255,255,255,.80)",borderRadius:999,padding:"8px 11px",fontWeight:950,fontSize:18,minWidth:44,boxShadow:"0 12px 24px rgba(8,21,58,.08)"},
  dangerBtn:{border:0,background:"#e11d48",color:"#fff",borderRadius:18,padding:"12px 15px",fontWeight:900},
  primaryMini:{border:0,background:"linear-gradient(135deg,#0f62fe,#2dd4bf)",color:"#fff",borderRadius:14,padding:"9px 11px",fontWeight:900,boxShadow:"0 9px 16px rgba(15,98,254,.18)"},
  secondaryMini:{border:"1px solid #bfdbfe",background:"#fff",borderRadius:14,padding:"9px 11px",fontWeight:900},
  dangerMini:{border:0,background:"#ffe4e6",color:"#be123c",borderRadius:14,padding:"9px 11px",fontWeight:900},
  cardActionsCompact:{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginTop:8},
  actionsMenu:{position:"relative",display:"inline-block"},
  actionsSummary:{listStyle:"none",cursor:"pointer",border:"1px solid #bfdbfe",background:"#fff",borderRadius:14,padding:"9px 11px",fontWeight:900,fontSize:14},
  actionsBody:{position:"absolute",right:0,top:"calc(100% + 6px)",zIndex:30,display:"grid",gap:6,minWidth:140,padding:8,border:"1px solid #dbeafe",borderRadius:14,background:"#fff",boxShadow:"0 16px 34px rgba(8,21,58,.18)"},
  formGrid:{display:"grid",gridTemplateColumns:"1fr",gap:12},
  formGridPadded:{display:"grid",gridTemplateColumns:"1fr",gap:12,padding:"0 14px 14px"},
  field:{display:"grid",gap:6,fontWeight:900,color:"#4b3529"},
  check:{display:"flex",gap:8,alignItems:"center",fontWeight:800},
  compactChecklist:{display:"grid",gap:8},
  checkCompact:{display:"grid",gridTemplateColumns:"18px minmax(0,1fr)",gap:9,alignItems:"center",fontWeight:850,textAlign:"left"},
  checkboxSmall:{width:16,height:16,minHeight:16,margin:0,padding:0,accentColor:"#0f62fe"},
  row:{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"},
  splitRow:{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap"},
  list:{display:"grid",gap:9,maxHeight:260,overflow:"auto"},
  listBtn:{textAlign:"left",border:"1px solid #dbeafe",background:"#fff",borderRadius:18,padding:13,display:"grid",gap:3},
  listActive:{textAlign:"left",border:"1px solid #0f62fe",background:"linear-gradient(145deg,#eff6ff,#fff7ed)",borderRadius:18,padding:13,display:"grid",gap:3,boxShadow:"0 10px 24px rgba(15,98,254,.13)"},
  subTabs:{display:"flex",gap:8,flexWrap:"nowrap",overflowX:"auto",margin:"10px -4px 14px",padding:"2px 4px 8px",scrollbarWidth:"none"},
  subTab:{border:"1px solid #dbeafe",background:"#fff",borderRadius:999,padding:"10px 13px",fontWeight:900,whiteSpace:"nowrap"},
  subTabActive:{border:"1px solid #0f62fe",background:"#eff6ff",borderRadius:999,padding:"10px 13px",fontWeight:950,color:"#0f62fe",whiteSpace:"nowrap",boxShadow:"0 8px 18px rgba(15,98,254,.18)"},
  detailBox:{border:"1px solid #dbeafe",borderRadius:24,padding:14,background:"#fff",display:"grid",gap:12,boxShadow:"0 12px 30px rgba(8,21,58,.055)"},
  infoGrid:{display:"grid",gridTemplateColumns:"1fr",gap:9},
  info:{border:"1px solid #e5e7eb",borderRadius:17,padding:13,background:"#fff"},
  infoDanger:{border:"1px solid #fecaca",borderRadius:17,padding:13,background:"#fff1f2"},
  ownerHero:{display:"grid",gridTemplateColumns:"58px 1fr auto",gap:12,alignItems:"center",margin:"-4px 0 12px",padding:14,borderRadius:24,background:"linear-gradient(135deg,#0f62fe,#0047d9)",color:"#fff",boxShadow:"0 18px 38px rgba(15,98,254,.24)"},
  ownerAvatar:{width:58,height:58,borderRadius:20,background:"rgba(255,255,255,.22)",display:"grid",placeItems:"center",fontSize:29},
  ownerHeroText:{display:"grid",gap:2,minWidth:0},
  heroEditBtn:{border:0,borderRadius:999,background:"linear-gradient(135deg,#ff4f5f,#ff2f85)",color:"#fff",fontWeight:950,padding:"9px 12px",boxShadow:"0 10px 20px rgba(255,47,133,.24)"},
  petCards:{display:"grid",gridTemplateColumns:"1fr",gap:12},
  petPhotoCard:{position:"relative",minHeight:190,border:"1px solid #dbeafe",borderRadius:24,padding:0,overflow:"hidden",display:"grid",alignItems:"end",background:"linear-gradient(135deg,#eff6ff,#fff7ed)",backgroundSize:"cover",backgroundPosition:"center",boxShadow:"0 14px 34px rgba(8,21,58,.08)",textAlign:"left"},
  petPhotoCardActive:{position:"relative",minHeight:190,border:"2px solid #0f62fe",borderRadius:24,padding:0,overflow:"hidden",display:"grid",alignItems:"end",background:"linear-gradient(135deg,#eff6ff,#fff7ed)",backgroundSize:"cover",backgroundPosition:"center",boxShadow:"0 18px 42px rgba(15,98,254,.20)",textAlign:"left"},
  petPhotoOverlay:{display:"grid",gap:3,width:"100%",padding:14,color:"#fff",background:"linear-gradient(180deg,transparent,rgba(8,21,58,.78))",textShadow:"0 2px 6px rgba(0,0,0,.4)"},
  petPhotoCardHint:{fontSize:12,fontWeight:900,color:"#dbeafe"},
  petCardInfoBtn:{position:"absolute",right:12,top:12,background:"rgba(255,255,255,.92)",color:"#071746",borderRadius:999,padding:"8px 11px",fontWeight:950,boxShadow:"0 8px 18px rgba(0,0,0,.16)"},
  petCard:{border:"1px solid #dbeafe",background:"#fff",borderRadius:20,padding:12,display:"grid",gap:7},
  petCardActive:{border:"2px solid #0f62fe",background:"#eff6ff",borderRadius:20,padding:12,display:"grid",gap:7},
  petPhoto:{width:72,height:72,borderRadius:20,objectFit:"cover"},
  petPhotoBig:{width:"100%",maxHeight:260,borderRadius:24,objectFit:"cover"},
  photoSmall:{width:62,height:62,borderRadius:18,background:"#f2e2d2",display:"grid",placeItems:"center",fontWeight:950,fontSize:26,margin:12},
  photoBlank:{height:140,borderRadius:20,background:"#f2e2d2",display:"grid",placeItems:"center",fontWeight:950,color:"#071746"},
  petHero:{minHeight:250,borderRadius:28,background:"linear-gradient(135deg,#eff6ff,#f2e2d2)",backgroundSize:"cover",backgroundPosition:"center",display:"grid",alignItems:"end",overflow:"hidden",boxShadow:"0 18px 44px rgba(8,21,58,.14)",border:"1px solid rgba(191,219,254,.9)"},
  petHeroText:{padding:18,color:"#fff",background:"linear-gradient(180deg,transparent,rgba(8,21,58,.86))",display:"grid",gap:4,textShadow:"0 2px 8px rgba(0,0,0,.48)"},
  petInfo:{display:"grid",gap:10},
  photoPickerBox:{border:"1px solid #dbeafe",borderRadius:22,padding:12,background:"#fff",display:"grid",gap:10},
  selectedPetNotice:{border:"1px solid #dbeafe",background:"#f8fbff",borderRadius:16,padding:"11px 13px",fontWeight:900,color:"#0f172a",textAlign:"left"},
  petPickWrap:{display:"flex",gap:8,flexWrap:"wrap",margin:"10px 0"},
  petPickDog:{border:"1px solid #dbeafe",background:"#fff",borderRadius:999,padding:"10px 13px",fontWeight:900,display:"inline-flex",gap:6,alignItems:"center"},
  petPickDogActive:{border:"2px solid #0f62fe",background:"#eff6ff",color:"#0f62fe",borderRadius:999,padding:"9px 12px",fontWeight:950,display:"inline-flex",gap:6,alignItems:"center",boxShadow:"0 8px 18px rgba(15,98,254,.18)"},
  petPickCat:{border:"1px solid #dbeafe",background:"#fff",borderRadius:999,padding:"10px 13px",fontWeight:900,display:"inline-flex",gap:6,alignItems:"center"},
  petPickCatActive:{border:"2px solid #8b5cf6",background:"#f5f3ff",color:"#4c1d95",borderRadius:999,padding:"9px 12px",fontWeight:950,display:"inline-flex",gap:6,alignItems:"center",boxShadow:"0 8px 18px rgba(139,92,246,.15)"},
  petPickOther:{border:"1px solid #dbeafe",background:"#fff",borderRadius:999,padding:"10px 13px",fontWeight:900,display:"inline-flex",gap:6,alignItems:"center"},
  petPickOtherActive:{border:"2px solid #059669",background:"#ecfdf5",color:"#065f46",borderRadius:999,padding:"9px 12px",fontWeight:950,display:"inline-flex",gap:6,alignItems:"center",boxShadow:"0 8px 18px rgba(5,150,105,.14)"},
  pickBtn:{border:"1px solid #dbeafe",background:"#fff",borderRadius:999,padding:"10px 13px",fontWeight:900},
  pickActive:{border:"1px solid #0f62fe",background:"#eff6ff",color:"#0f62fe",borderRadius:999,padding:"10px 13px",fontWeight:950},
  cards:{display:"grid",gridTemplateColumns:"1fr",gap:10,marginTop:10},
  smallCard:{border:"1px solid #dbeafe",background:"#fff",borderRadius:19,padding:13,display:"grid",gap:5},
  visitCard:{border:"1px solid #dbeafe",borderRadius:24,padding:15,display:"grid",gridTemplateColumns:"1fr",gap:11,alignItems:"start",marginTop:10,background:"#fff",boxShadow:"0 15px 32px rgba(8,21,58,.08)",borderLeft:"6px solid #0f62fe"},
  cardActions:{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8,alignItems:"stretch",width:"100%"},
  moreActions:{border:"1px solid #dbeafe",borderRadius:16,background:"#f8fbff",padding:0},
  moreSummary:{listStyle:"none",cursor:"pointer",padding:"11px 13px",fontWeight:950,color:"#071746"},
  moreActionBody:{display:"grid",gridTemplateColumns:"1fr",gap:8,padding:"0 10px 10px"},
  petLine:{display:"flex",gap:6,flexWrap:"wrap",marginTop:7},
  petChip:{border:0,background:"#dcfce7",borderRadius:999,padding:"7px 10px",fontWeight:900,color:"#14532d"},
  status:{fontSize:12,fontWeight:950,color:"#64748b"},
  officeNav:{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8},
  officeBtn:{border:"1px solid #dbeafe",background:"#fff",borderRadius:999,padding:"11px 13px",fontWeight:900},
  officeActive:{border:"1px solid #0f62fe",background:"#eff6ff",borderRadius:999,padding:"11px 13px",fontWeight:950,color:"#0f62fe"},
  reportRow:{display:"grid",gridTemplateColumns:"1fr",gap:6,alignItems:"center",borderBottom:"1px solid #eff6ff",padding:"11px 0"},
  billingRow:{display:"grid",gridTemplateColumns:"1fr",gap:8,alignItems:"start",border:"1px solid #dbeafe",borderRadius:17,padding:12,background:"#fff"},
  billingRowCompact:{display:"grid",gridTemplateColumns:"1fr",gap:8,alignItems:"start",border:"1px solid #dbeafe",borderRadius:17,padding:12,background:"#fff"},
  checklistRow:{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:10,alignItems:"center",border:"1px solid #dbeafe",borderRadius:14,padding:11,background:"#fff"},
  subList:{gridColumn:"1/-1",display:"flex",gap:6,flexWrap:"wrap",color:"#64748b"},
  modalShade:{position:"fixed",inset:0,background:"rgba(8,21,58,.42)",zIndex:80,display:"grid",placeItems:"center",padding:12},
  modal:{width:"min(430px,100%)",maxHeight:"90svh",overflow:"auto",background:"#fff",borderRadius:28,padding:16,boxShadow:"0 30px 90px rgba(0,0,0,.28)",textAlign:"left"},
  modalHead:{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",borderBottom:"1px solid #eff6ff",paddingBottom:10,marginBottom:12},
  collapse:{border:"1px solid #dbeafe",borderRadius:18,padding:0,background:"#fff"},
  collapseSummary:{listStyle:"none",cursor:"pointer",padding:"14px 15px",fontWeight:950,color:"#071746"},
  phoneRow:{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginTop:4},
  phoneLink:{color:"#0f766e",fontWeight:950,textDecoration:"none"},
  callBtn:{display:"inline-flex",alignItems:"center",justifyContent:"center",minHeight:36,padding:"8px 13px",borderRadius:999,background:"#0f62fe",color:"#fff",fontWeight:950,textDecoration:"none",boxShadow:"0 8px 16px rgba(15,98,254,.18)"},
  dangerZone:{border:"1px solid #fecaca",borderRadius:18,padding:12,background:"#fff1f2",display:"grid",gap:6},
  visitHistory:{display:"grid",gridTemplateColumns:"1fr",gap:8,alignItems:"start",border:"1px solid #dbeafe",borderRadius:16,padding:11,background:"#fff"},
  recentVisitRow:{display:"grid",gridTemplateColumns:"1fr",gap:6,borderTop:"1px solid #eff6ff",paddingTop:9},
  printOverlay:{position:"fixed",inset:0,zIndex:100,background:"#fff",overflow:"auto",padding:16},
  printToolbar:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"},
  printPaper:{maxWidth:820,margin:"0 auto",background:"#fff",padding:20,border:"1px solid #e5e7eb",borderRadius:16},
  docPaper:{background:"#fff",color:"#111827",fontFamily:"system-ui,Segoe UI,sans-serif"},
  docHeader:{display:"flex",justifyContent:"space-between",gap:20,borderBottom:"2px solid #111827",paddingBottom:16,marginBottom:16},
  docSection:{marginTop:16},
};
