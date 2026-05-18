import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";

const VERSION = "";
const TABS = ["Today", "Schedule", "Owners", "Office"];
const OFFICE_TABS = ["Reports", "Services", "Vets", "Travel", "Settings", "Deleted"];
const STATUSES = ["Scheduled", "In Progress", "Completed", "Cancelled", "Missed"];

const blankOwner = {
  name: "", address: "", phone: "", email: "", invoice_email: "",
  emergency_contact_name: "", emergency_contact_phone: "", access_instructions: "",
  house_instructions: "", payment_notes: "", billing_notes: "", default_mileage: 0,
  notes: "", is_active: true,
};
const blankPet = {
  owner_id: "", name: "", species: "Dog", breed: "", color_description: "", vet_clinic_id: "",
  age_text: "", weight: "", sex: "", spayed_neutered: "", photo_url: "",
  feeding_instructions: "", medication_instructions: "", medical_conditions: "", allergies: "",
  vet_name: "", vet_phone: "", emergency_vet: "", emergency_instructions: "",
  behavior_notes: "", leash_harness_notes: "", favorite_things: "", hide_spots: "", care_notes: "",
  default_mileage: 0, is_active: true,
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
      const clean = { ...row, updated_at: nowIso() };
      Object.keys(clean).forEach(k => clean[k] === "" && ["birthdate", "service_id", "saved_option_id", "primary_pet_id", "vet_clinic_id", "owner_id", "visit_id"].includes(k) ? clean[k] = null : null);
      const q = clean.id ? supabase.from(table).update(clean).eq("id", clean.id).select().single() : supabase.from(table).insert(clean).select().single();
      const { error: err } = await q;
      if (err) throw err;
      setToast(label); await loadAll();
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
      <button style={S.ghostBtn} onClick={loadAll}>Refresh</button>
    </header>

    {error && <div style={S.error}>{error}</div>}
    {toast && <div style={S.toast} onAnimationEnd={() => setToast("")}>{toast}</div>}
    {loading ? <div style={S.card}>Loading pet care data...</div> : <main style={S.main} className="page-transition">
      {tab === "Today" && <TodayPage visits={todayVisits} activeVisits={activeVisits} overdueVisits={overdueVisits} owners={ownerMap} pets={petMap} services={serviceMap} visitPets={visitPets} onStart={startVisit} onComplete={setCompleteVisitId} onPetInfo={setPetInfoId} onCancel={markCancelled} onMarkPaid={markVisitPaid} onMarkUnpaid={markVisitUnpaid} onDeleteVisit={(v)=>requestDelete("pet_visits", v, "visit", `${niceDate(v.visit_date)} ${serviceMap[v.service_id]?.name || "visit"}`)} />}
      {tab === "Schedule" && <SchedulePage owners={owners} pets={pets} services={services} options={options} visits={visits} visitPets={visitPets} ownerMap={ownerMap} petMap={petMap} serviceMap={serviceMap} onAdd={addVisitFromForm} onRepeatLast={repeatLastVisit} onRepeatVisit={repeatVisitTemplate} onStart={startVisit} onComplete={setCompleteVisitId} onPetInfo={setPetInfoId} onMarkPaid={markVisitPaid} onMarkUnpaid={markVisitUnpaid} onDeleteVisit={(v)=>requestDelete("pet_visits", v, "visit", `${niceDate(v.visit_date)} ${serviceMap[v.service_id]?.name || "visit"}`)} />}
      {tab === "Owners" && <OwnersPage owners={owners} pets={pets} services={services} options={options} petChecklist={petChecklist} visits={visits} visitPets={visitPets} selectedOwnerId={selectedOwnerId} selectedPetId={selectedPetId} setSelectedOwnerId={setSelectedOwnerId} setSelectedPetId={setSelectedPetId} ownerMap={ownerMap} petMap={petMap} serviceMap={serviceMap} onSaveOwner={(o)=>saveRow("pet_owners", o, "Owner saved")} onSavePet={(p)=>saveRow("pet_pets", p, "Pet saved")} onSaveOption={(o)=>saveRow("pet_saved_service_options", o, "Saved service option saved")} onAddPetChecklist={(row)=>saveRow("pet_pet_checklist_items", row, "Pet checklist saved")} onDeleteOwner={(o)=>requestDelete("pet_owners", o, "owner", o.name)} onDeletePet={(p)=>requestDelete("pet_pets", p, "pet", p.name)} onDeleteOption={(o)=>requestDelete("pet_saved_service_options", o, "saved_service_option", o.option_name)} vetClinics={vetClinics} onSaveVetClinic={(v)=>saveRow("pet_vet_clinics", v, "Vet clinic saved")} onPetInfo={setPetInfoId} onMarkPaid={markVisitPaid} onMarkUnpaid={markVisitUnpaid} onMarkManyPaid={markManyVisitsPaid} onDeleteVisit={(v)=>requestDelete("pet_visits", v, "visit", `${niceDate(v.visit_date)} ${serviceMap[v.service_id]?.name || "visit"}`)} />}
      {tab === "Office" && <OfficePage officeTab={officeTab} setOfficeTab={setOfficeTab} owners={owners} pets={pets} services={services} serviceChecklist={serviceChecklist} visits={visits} visitPets={visitPets} travel={travel} vetClinics={vetClinics} settings={settings} deleted={deleted} ownerMap={ownerMap} petMap={petMap} serviceMap={serviceMap} onSaveService={(s)=>saveRow("pet_services", s, "Service saved")} onAddServiceChecklist={(row)=>saveRow("pet_service_checklist_items", row, "Checklist item saved")} onDeleteServiceChecklist={(item)=>requestDelete("pet_service_checklist_items", item, "service_checklist_item", item.label)} onDeleteService={(s)=>requestDelete("pet_services", s, "service", s.name)} onSaveSettings={(s)=>saveRow("pet_business_settings", s, "Settings saved")} onSaveVetClinic={(v)=>saveRow("pet_vet_clinics", v, "Vet clinic saved")} onDeleteVetClinic={(v)=>requestDelete("pet_vet_clinics", v, "vet_clinic", v.clinic_name)} onSaveTravel={(t)=>saveRow("pet_travel", t, "Travel saved")} onHardDeleteDeleted={hardDeleteDeleted} onMarkPaid={markVisitPaid} onMarkUnpaid={markVisitUnpaid} onMarkManyPaid={markManyVisitsPaid} onDeleteVisit={(v)=>requestDelete("pet_visits", v, "visit", `${niceDate(v.visit_date)} ${serviceMap[v.service_id]?.name || "visit"}`)} />}
    </main>}

    <nav style={S.bottomNav}>{TABS.map(t => <button key={t} onClick={() => setTab(t)} style={tab === t ? S.navActive : S.navBtn}>{t}</button>)}</nav>

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
    <div style={S.grid3}>
      <Metric title="Today" value={`${visits.length} visits`} sub={`${visits.filter(v=>v.status==='Scheduled').length} scheduled`} />
      <Metric title="Active" value={`${activeVisits.length}`} sub="services in progress" />
      <Metric title="Completed $" value={money(todayRevenue)} sub="today" />
    </div>
    {activeVisits.length > 0 && <Panel title="In Progress Now">{activeVisits.map(v => <VisitCard key={v.id} visit={v} owner={owners[v.owner_id]} service={services[v.service_id]} pets={visitPetsFor(v, visitPets, pets)} onStart={onStart} onComplete={onComplete} onPetInfo={onPetInfo} onCancel={onCancel} onMarkPaid={onMarkPaid} onMarkUnpaid={onMarkUnpaid} onDeleteVisit={onDeleteVisit} />)}</Panel>}
    {overdueVisits.length > 0 && <Panel title="Overdue Scheduled Services">{overdueVisits.map(v => <VisitCard key={v.id} visit={v} owner={owners[v.owner_id]} service={services[v.service_id]} pets={visitPetsFor(v, visitPets, pets)} onStart={onStart} onComplete={onComplete} onPetInfo={onPetInfo} onCancel={onCancel} onMarkPaid={onMarkPaid} onMarkUnpaid={onMarkUnpaid} onDeleteVisit={onDeleteVisit} />)}</Panel>}
    <Panel title="Today’s Schedule">{visits.length ? visits.map(v => <VisitCard key={v.id} visit={v} owner={owners[v.owner_id]} service={services[v.service_id]} pets={visitPetsFor(v, visitPets, pets)} onStart={onStart} onComplete={onComplete} onPetInfo={onPetInfo} onCancel={onCancel} onMarkPaid={onMarkPaid} onMarkUnpaid={onMarkUnpaid} onDeleteVisit={onDeleteVisit} />) : <Empty text="No services scheduled for today." />}</Panel>
  </section>;
}
function SchedulePage({ owners, pets, services, options, visits, visitPets, ownerMap, petMap, serviceMap, onAdd, onRepeatLast, onRepeatVisit, onStart, onComplete, onPetInfo, onMarkPaid, onMarkUnpaid, onDeleteVisit }) {
  const [form, setForm] = useState(blankVisit);
  const [petIds, setPetIds] = useState([]);
  const ownerPets = pets.filter(p => p.owner_id === form.owner_id && p.is_active).sort(byName);
  const petOptions = options.filter(o => petIds.includes(o.pet_id) && o.is_active);
  const visibleVisits = visits.filter(v => ["Scheduled", "In Progress"].includes(v.status)).sort(visitSort);
  const ownerRecentVisits = visits.filter(v => v.owner_id === form.owner_id).sort((a,b)=>`${b.visit_date || ""} ${b.scheduled_start_time || ""}`.localeCompare(`${a.visit_date || ""} ${a.scheduled_start_time || ""}`)).slice(0, 5);
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
  return <section style={S.stack}>
    <Panel title="Add Scheduled Visit">
      <div style={S.formGrid}>
        <Field label="Owner"><select value={form.owner_id} onChange={e=>pickOwner(e.target.value)}><option value="">Select owner</option>{owners.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
        <Field label="Service"><select value={form.service_id || ""} onChange={e=>applyService(e.target.value)}><option value="">Select service</option>{services.filter(s=>s.is_active).map(s=><option key={s.id} value={s.id}>{s.name} — {money(s.base_price)}</option>)}</select></Field>
        <Field label="Saved pet option"><select value={form.saved_option_id || ""} onChange={e=>applyOption(e.target.value)}><option value="">Optional</option>{petOptions.map(o=><option key={o.id} value={o.id}>{o.option_name} — {money(o.default_price)}</option>)}</select></Field>
        <Field label="Date"><input type="date" value={form.visit_date} onChange={e=>setForm({...form, visit_date:e.target.value})} /></Field>
        <Field label="Start time"><input type="time" value={form.scheduled_start_time || ""} onChange={e=>setForm({...form, scheduled_start_time:e.target.value})} /></Field>
        <Field label="Duration minutes"><input type="number" value={form.duration_minutes} onChange={e=>setForm({...form, duration_minutes:e.target.value})} /></Field>
        <Field label="Base price"><input type="number" value={form.base_price} onChange={e=>setForm({...form, base_price:e.target.value})} /></Field>
        <Field label="Mileage"><input type="number" value={form.mileage} onChange={e=>setForm({...form, mileage:e.target.value})} /></Field>
        <Field label="Travel fee"><input type="number" value={form.travel_fee} onChange={e=>setForm({...form, travel_fee:e.target.value})} /></Field>
      </div>
      <div style={S.petPickWrap}>{ownerPets.map(p=><button key={p.id} style={petButtonStyle(p, petIds.includes(p.id))} onClick={()=>togglePet(p.id)}><span>{petFace(p)}</span>{p.name}</button>)}</div>
      {form.owner_id && <div style={S.detailBox}>
        <b>Recent visits for this owner</b>
        {ownerRecentVisits.length ? ownerRecentVisits.map(v => <div key={v.id} style={S.recentVisitRow}>
          <span>{niceDate(v.visit_date)} · {v.scheduled_start_time || ""}</span>
          <span>{visitPetsFor(v, visitPets, petMap).map(p=>p.name).join(", ") || "No pet"}</span>
          <span>{serviceMap[v.service_id]?.name || "Service"}</span>
          <button style={S.secondaryMini} onClick={()=>onRepeatVisit(v.id)}>Use as Template</button>
        </div>) : <Empty text="No recent visits for this owner yet." />}
      </div>}
      <Field label="Visit notes"><textarea value={form.internal_notes || ""} onChange={e=>setForm({...form, internal_notes:e.target.value})} /></Field>
      <button style={S.primaryBtn} onClick={()=>onAdd(form, petIds)} disabled={!form.owner_id || !form.service_id || petIds.length === 0}>Schedule Visit</button>
    </Panel>
    <Panel title="Upcoming / Active Visits">{visibleVisits.length ? visibleVisits.map(v => <VisitCard key={v.id} visit={v} owner={ownerMap[v.owner_id]} service={serviceMap[v.service_id]} pets={visitPetsFor(v, visitPets, petMap)} onStart={onStart} onComplete={onComplete} onPetInfo={onPetInfo} onMarkPaid={onMarkPaid} onMarkUnpaid={onMarkUnpaid} onDeleteVisit={onDeleteVisit} />) : <Empty text="No upcoming visits yet." />}</Panel>
    <Panel title="Recently Completed Visits">{visits.filter(v=>v.status==="Completed").sort((a,b)=>`${b.visit_date || ""} ${b.scheduled_start_time || ""}`.localeCompare(`${a.visit_date || ""} ${a.scheduled_start_time || ""}`)).slice(0,12).map(v => <VisitCard key={v.id} visit={v} owner={ownerMap[v.owner_id]} service={serviceMap[v.service_id]} pets={visitPetsFor(v, visitPets, petMap)} onStart={onStart} onComplete={onComplete} onPetInfo={onPetInfo} onMarkPaid={onMarkPaid} onMarkUnpaid={onMarkUnpaid} onDeleteVisit={onDeleteVisit} />)}</Panel>

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
        <div style={S.list}>{owners.map(o=><button key={o.id} style={selectedOwnerId===o.id?S.listActive:S.listBtn} onClick={()=>{setSelectedOwnerId(o.id); setSelectedPetId(""); setOwnerEditMode(false); setOwnerTab("Owner Info");}}>{o.name || "Unnamed owner"}<small>{o.phone || o.email || "No contact info"}</small></button>)}</div>
      </Panel>

      {!selectedOwnerId && ownerEditMode && <Panel title="New Owner">
        <OwnerForm value={ownerForm} onChange={setOwnerForm} />
        <div style={S.row}><button style={S.primaryBtn} onClick={()=>onSaveOwner(ownerForm)}>Save Owner</button></div>
      </Panel>}

      {selectedOwnerId && <Panel title={selectedOwner?.name || "Selected Owner"}>
        <div style={S.subTabs}>{OWNER_TABS.map(t=><button key={t} style={ownerTab===t?S.subTabActive:S.subTab} onClick={()=>{setOwnerTab(t); setOwnerEditMode(false); setPetEditMode(false); setOptionEditMode(false);}}>{t}</button>)}</div>

        {ownerTab === "Owner Info" && <div style={S.stack}>
          {!ownerEditMode ? <OwnerSummary owner={selectedOwner} /> : <OwnerForm value={ownerForm} onChange={setOwnerForm} />}
          <div style={S.splitRow}>{!ownerEditMode ? <button style={S.secondaryBtn} onClick={()=>setOwnerEditMode(true)}>Edit Owner Info</button> : <button style={S.primaryBtn} onClick={()=>{onSaveOwner(ownerForm); setOwnerEditMode(false);}}>Save Owner</button>}<div>{selectedOwner?.id && <button style={S.dangerMini} onClick={()=>onDeleteOwner(selectedOwner)}>Delete Owner</button>}</div></div>
        </div>}

        {ownerTab === "Pets" && <div style={S.stack}>
          <div style={S.row}><button style={S.primaryBtn} onClick={newPet}>Add Pet</button><span style={S.muted}>Each pet has its own profile, care notes, emergency info, checklist, and history.</span></div>
          <div style={S.petCards}>{ownerPets.map(p=><PetMini key={p.id} pet={p} active={selectedPetId===p.id} onClick={()=>{setSelectedPetId(p.id); setPetEditMode(false);}} onInfo={()=>onPetInfo(p.id)} />)}</div>
          {(selectedPet || petEditMode) && <div style={S.detailBox}>
            <div style={S.subTabs}>{PET_TABS.map(t=><button key={t} style={petTab===t?S.subTabActive:S.subTab} onClick={()=>{setPetTab(t); setPetEditMode(false);}}>{t}</button>)}</div>
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
    <div style={S.officeNav}>{OFFICE_TABS.map(t=><button key={t} style={officeTab===t?S.officeActive:S.officeBtn} onClick={()=>setOfficeTab(t)}>{t}</button>)}</div>
    {officeTab === "Reports" && <Reports {...props} />}
    {officeTab === "Services" && <ServicesAdmin {...props} />}
    {officeTab === "Vets" && <VetClinicsAdmin {...props} />}
    {officeTab === "Travel" && <TravelAdmin {...props} />}
    {officeTab === "Settings" && <SettingsAdmin {...props} />}
    {officeTab === "Deleted" && <DeletedAdmin {...props} />}
  </section>;
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
  return String(value).replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;" }[c]));
}
function printTextDocument(title, text) {
  // Use a hidden iframe instead of window.open().
  // VS Code Simple Browser and some mobile browsers can replace the app with about:blank when window.open is used.
  const safeTitle = escapeHtml(title || "Pet Care Report");
  const safeText = escapeHtml(text || "");
  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${safeTitle}</title><style>
    body{font-family:system-ui,Segoe UI,Roboto,sans-serif;padding:24px;line-height:1.4;color:#111;}
    h1{font-size:24px;margin:0 0 16px;}
    pre{white-space:pre-wrap;font:inherit;margin:0;}
    @page{margin:0.5in;}
  </style></head><body><h1>${safeTitle}</h1><pre>${safeText}</pre></body></html>`;
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1000);
    }
  }, 250);
}
function emailTextDocument(subject, text, to = "") {
  const href = `mailto:${encodeURIComponent(to || "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  window.location.href = href;
}
function Reports({ owners, pets, visits, visitPets, ownerMap, petMap, serviceMap, onMarkPaid, settings }) {
  const completed = visits.filter(v=>v.status === "Completed");
  const unpaid = visits.filter(v=>!v.is_paid && v.status === "Completed");
  const byOwner = owners.map(o => {
    const rows = completed.filter(v=>v.owner_id === o.id);
    return { owner:o, count:rows.length, total:rows.reduce((s,v)=>s+num(v.total_amount),0), mileage:rows.reduce((s,v)=>s+num(v.mileage),0) };
  }).filter(x=>x.count || x.total).sort((a,b)=>b.total-a.total);
  const byService = Object.values(completed.reduce((acc,v)=>{ const key=v.service_id || "custom"; acc[key] ||= { name: serviceMap[v.service_id]?.name || "Custom/Unknown", count:0, total:0 }; acc[key].count++; acc[key].total+=num(v.total_amount); return acc; },{})).sort((a,b)=>b.total-a.total);
  const completedText = buildReportText({ title:"Completed Visits Report", owners, pets, visits, visitPets, ownerMap, petMap, serviceMap, filter:v=>v.status==="Completed" });
  const unpaidText = buildReportText({ title:"Unpaid Completed Visits Report", owners, pets, visits, visitPets, ownerMap, petMap, serviceMap, filter:v=>v.status==="Completed" && !v.is_paid });
  return <div style={S.stack}>
    <div style={S.row}><button style={S.secondaryBtn} onClick={()=>printTextDocument("Completed Visits Report", completedText)}>Print Completed Report</button><button style={S.secondaryBtn} onClick={()=>emailTextDocument("Completed Visits Report", completedText, settings?.default_email)}>Email Completed Report</button><button style={S.primaryBtn} onClick={()=>printTextDocument("Unpaid Visits Report", unpaidText)}>Print Unpaid Report</button><button style={S.secondaryBtn} onClick={()=>emailTextDocument("Unpaid Visits Report", unpaidText, settings?.default_email)}>Email Unpaid Report</button></div>
    <div style={S.grid3}><Metric title="Completed visits" value={completed.length} sub="all time" /><Metric title="Unpaid" value={money(unpaid.reduce((s,v)=>s+num(v.total_amount),0))} sub={`${unpaid.length} visits`} /><Metric title="Revenue" value={money(completed.reduce((s,v)=>s+num(v.total_amount),0))} sub="completed" /></div>
    <Panel title="Revenue by Pet Owner">{byOwner.length ? byOwner.map(x=><div key={x.owner.id} style={S.reportRow}><b>{x.owner.name}</b><span>{x.count} visits</span><span>{money(x.total)}</span><small>{x.mileage} km</small><div style={S.subList}>{pets.filter(p=>p.owner_id===x.owner.id).map(p=><span key={p.id}>{p.name}</span>)}</div></div>) : <Empty text="No completed revenue yet." />}</Panel>
    <Panel title="Revenue by Service Type">{byService.map(s=><div key={s.name} style={S.reportRow}><b>{s.name}</b><span>{s.count} visits</span><span>{money(s.total)}</span></div>)}</Panel>
    <Panel title="Unpaid Completed Visits">{unpaid.length ? unpaid.map(v=><div key={v.id} style={S.reportRow}><b>{ownerMap[v.owner_id]?.name || "Unknown"}</b><span>{niceDate(v.visit_date)}</span><span>{serviceMap[v.service_id]?.name}</span><span>{money(v.total_amount)}</span><small>{visitPetsFor(v, visitPets, petMap).map(p=>p.name).join(", ")}</small><button style={S.primaryMini} onClick={()=>onMarkPaid(v.id)}>Mark Paid</button></div>) : <Empty text="No unpaid completed visits." />}</Panel>
  </div>;
}
function ServicesAdmin({ services, serviceChecklist, onSaveService, onAddServiceChecklist, onDeleteServiceChecklist, onDeleteService }) {
  const [form, setForm] = useState(blankService);
  const [item, setItem] = useState("");
  const selectedItems = form.id ? serviceChecklist.filter(i=>i.service_id===form.id).sort((a,b)=>num(a.sort_order)-num(b.sort_order)) : [];
  return <Panel title="Services & Pricing">
    <p style={S.muted}>Sort order is hidden now. It only controls the display order of service cards.</p>
    <ServiceForm value={form} onChange={setForm} />
    <div style={S.row}><button style={S.primaryBtn} onClick={()=>onSaveService(form)}>Save Service</button><button style={S.secondaryBtn} onClick={()=>setForm(blankService)}>New</button>{form.id&&<button style={S.dangerBtn} onClick={()=>onDeleteService(form)}>Delete</button>}</div>
    {form.id && <div style={S.detailBox}>
      <b>Checklist for {form.name}</b>
      <small style={S.muted}>These items are copied into each visit when this service is scheduled. Add/remove items here before scheduling future visits.</small>
      {selectedItems.length ? selectedItems.map(i=><div key={i.id} style={S.checklistRow}><span>{i.label}</span><button style={S.dangerMini} onClick={()=>onDeleteServiceChecklist(i)}>Remove</button></div>) : <Empty text="No checklist items for this service yet." />}
      <div style={S.row}><input placeholder="New checklist item" value={item} onChange={e=>setItem(e.target.value)} /><button style={S.secondaryBtn} onClick={()=>{ if(item.trim()){ onAddServiceChecklist({service_id:form.id,label:item.trim(),sort_order:selectedItems.length*10,is_active:true}); setItem(""); }}}>Add Checklist Item</button></div>
    </div>}
    <div style={S.cards}>{services.map(s=><div key={s.id} style={S.smallCard} onClick={()=>setForm(s)}><b>{s.name}</b><span>{s.category}</span><span>{s.default_duration_minutes} min — {money(s.base_price)} — extra pet {money(s.extra_pet_price)}</span><ul>{serviceChecklist.filter(i=>i.service_id===s.id).map(i=><li key={i.id}>{i.label}</li>)}</ul></div>)}</div>
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
function TravelAdmin({ travel, visits, ownerMap, serviceMap, onSaveTravel }) {
  const [form, setForm] = useState({ travel_date: todayISO(), owner_id:"", visit_id:"", mileage:0, travel_purpose:"Business", notes:"" });
  const manualTravel = travel.filter(t => !t.visit_id);
  const actualTotal = manualTravel.reduce((s,t)=>s+num(t.mileage),0);
  const assignedTotal = visits.filter(v=>v.status==='Completed').reduce((s,v)=>s+num(v.mileage),0);
  const difference = actualTotal - assignedTotal;
  const todayActual = manualTravel.filter(t=>t.travel_date===todayISO()).reduce((s,t)=>s+num(t.mileage),0);
  const todayAssigned = visits.filter(v=>v.status==='Completed' && v.visit_date===todayISO()).reduce((s,v)=>s+num(v.mileage),0);
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
    <h3>Add daily actual mileage</h3>
    <div style={S.formGrid}><Field label="Date"><input type="date" value={form.travel_date} onChange={e=>setForm({...form,travel_date:e.target.value})}/></Field><Field label="Mileage type"><select value={form.travel_purpose} onChange={e=>setForm({...form,travel_purpose:e.target.value})}><option>Business</option><option>Owner visit</option><option>Supplies</option><option>Car wash</option><option>Vet / emergency</option><option>Other</option></select></Field><Field label="Owner / optional"><select value={form.owner_id} onChange={e=>setForm({...form,owner_id:e.target.value})}><option value="">None / general business</option>{Object.values(ownerMap).map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></Field><Field label="Actual mileage"><input type="number" value={form.mileage} onChange={e=>setForm({...form,mileage:e.target.value})}/></Field></div>
    <Field label="Notes"><textarea placeholder="Examples: supplies run, car wash, meeting, owner visit, emergency trip" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></Field><button style={S.primaryBtn} onClick={()=>onSaveTravel({...form, visit_id:null, owner_id: form.owner_id || null, notes: [form.travel_purpose, form.notes].filter(Boolean).join(": ")})}>Save Daily Mileage Entry</button>
    <h3>Recent daily travel</h3>{manualTravel.map(t=><div key={t.id} style={S.reportRow}><b>{niceDate(t.travel_date)}</b><span>{ownerMap[t.owner_id]?.name || "Manual"}</span><span>{t.mileage} km</span><small>{t.notes}</small></div>)}
    <h3>Assigned visit mileage</h3>{visits.filter(v=>v.status==='Completed' && num(v.mileage)>0).slice(0,50).map(v=><div key={v.id} style={S.reportRow}><b>{niceDate(v.visit_date)}</b><span>{ownerMap[v.owner_id]?.name || "Unknown"}</span><span>{v.mileage} km</span><small>{serviceMap[v.service_id]?.name || "Visit"}</small></div>)}
  </Panel>;
}
function SettingsAdmin({ settings, onSaveSettings }) {
  const [form, setForm] = useState(settings || { business_name:"Pet Care", business_phone:"", business_email:"", default_email:"", tax_number:"", business_notes:"", charge_gst:false, gst_rate:5 });
  useEffect(()=>setForm(settings || form), [settings?.id]);
  return <Panel title="Business Settings"><div style={S.formGrid}><Field label="Business name"><input value={form.business_name||""} onChange={e=>setForm({...form,business_name:e.target.value})}/></Field><Field label="Phone"><input value={form.business_phone||""} onChange={e=>setForm({...form,business_phone:e.target.value})}/></Field><Field label="Email"><input value={form.business_email||""} onChange={e=>setForm({...form,business_email:e.target.value})}/></Field><Field label="Default report email"><input value={form.default_email||""} onChange={e=>setForm({...form,default_email:e.target.value})}/></Field><Field label="Tax number"><input value={form.tax_number||""} onChange={e=>setForm({...form,tax_number:e.target.value})}/></Field><Field label="GST rate"><input type="number" value={form.gst_rate||0} onChange={e=>setForm({...form,gst_rate:e.target.value})}/></Field></div><label style={S.check}><input type="checkbox" checked={!!form.charge_gst} onChange={e=>setForm({...form,charge_gst:e.target.checked})}/> Charge GST</label><Field label="Business notes"><textarea value={form.business_notes||""} onChange={e=>setForm({...form,business_notes:e.target.value})}/></Field><button style={S.primaryBtn} onClick={()=>onSaveSettings(form)}>Save Settings</button></Panel>;
}
function DeletedAdmin({ deleted, onHardDeleteDeleted }) {
  return <Panel title="Deleted Items"><p style={S.muted}>Deleted items are logged here for reference. Restore can be added after the new data model is fully stable.</p>{deleted.map(d=><div key={d.id} style={S.reportRow}><b>{d.item_type}</b><span>{d.item_label}</span><span>{new Date(d.deleted_at).toLocaleString()}</span><button style={S.dangerMini} onClick={()=>onHardDeleteDeleted(d.id)}>Remove log</button></div>)}</Panel>;
}
function VisitCard({ visit, owner, pets, service, onStart, onComplete, onPetInfo, onCancel, onMarkPaid, onMarkUnpaid, onDeleteVisit }) {
  const petNames = pets.map(p=>p.name).join(", ") || "No pet selected";
  return <div style={S.visitCard}>
    <div><b>{niceDate(visit.visit_date)} {visit.scheduled_start_time || ""}</b><div>{owner?.name || "Unknown owner"} — {service?.name || "Service"}</div><div style={S.petLine}>{pets.map(p=><button key={p.id} style={S.petChip} onClick={()=>onPetInfo(p.id)}>{p.name} Info</button>)}</div><small style={S.muted}>{visit.status} · {visit.duration_minutes} min · {num(visit.mileage)} km · {money(visit.total_amount)} · {visit.is_paid ? `Paid${visit.paid_at ? " " + niceDate(String(visit.paid_at).slice(0,10)) : ""}` : "Unpaid"}</small></div>
    <div style={S.cardActions}>{visit.status === "Scheduled" && <button style={S.secondaryMini} onClick={()=>onStart(visit.id)}>Optional Start</button>}{["Scheduled","In Progress"].includes(visit.status) && <button style={S.primaryMini} onClick={()=>onComplete(visit.id)}>Complete</button>}{visit.status === "Completed" && !visit.is_paid && <button style={S.primaryMini} onClick={()=>onMarkPaid(visit.id)}>Mark Paid</button>}{visit.status === "Completed" && visit.is_paid && <button style={S.secondaryMini} onClick={()=>onMarkUnpaid(visit.id)}>Mark Unpaid</button>}{visit.status === "Scheduled" && onCancel && <button style={S.dangerMini} onClick={()=>onCancel(visit.id)}>Cancel</button>}{onDeleteVisit && visit.status !== "Completed" && <button style={S.dangerMini} onClick={()=>onDeleteVisit(visit)}>Delete</button>}</div>
  </div>;
}
function CompleteModal({ visit, checklist, owner, pets, service, onToggleChecklist, onClose, onSave }) {
  const [form, setForm] = useState({ completion_notes: visit.completion_notes || "", incident_notes: visit.incident_notes || "", is_paid: !!visit.is_paid, payment_method: visit.payment_method || "", payment_notes: visit.payment_notes || "", owner_update_sent: !!visit.owner_update_sent, medication_given: !!visit.medication_given, feeding_completed: !!visit.feeding_completed, water_refreshed: !!visit.water_refreshed, door_locked: !!visit.door_locked });
  return <Modal onClose={onClose} title="Complete Visit"><div style={S.stack}><b>{service?.name}</b><span>{owner?.name} — {pets.map(p=>p.name).join(", ")}</span><p style={S.muted}>This is service-rate based. You can complete the visit without starting a timer. Actual start/end time does not change the price.</p><Panel title="Checklist">{checklist.map(i=><label key={i.id} style={S.check}><input type="checkbox" checked={!!i.is_done} onChange={()=>onToggleChecklist(i)} /> {i.label}</label>)}</Panel><div style={S.formGrid}>{["feeding_completed","water_refreshed","medication_given","door_locked","owner_update_sent","is_paid"].map(k=><label key={k} style={S.check}><input type="checkbox" checked={!!form[k]} onChange={e=>setForm({...form,[k]:e.target.checked})}/> {k.replaceAll("_"," ")}</label>)}</div>{form.is_paid && <><Field label="Payment method"><select value={form.payment_method || ""} onChange={e=>setForm({...form,payment_method:e.target.value})}><option value="">Select method</option><option>Cash</option><option>E-transfer</option><option>Cheque</option><option>Card</option><option>Other</option></select></Field><Field label="Payment notes"><textarea value={form.payment_notes || ""} onChange={e=>setForm({...form,payment_notes:e.target.value})}/></Field></>}<Field label="Completion notes"><textarea value={form.completion_notes} onChange={e=>setForm({...form,completion_notes:e.target.value})}/></Field><Field label="Incident / issue notes"><textarea value={form.incident_notes} onChange={e=>setForm({...form,incident_notes:e.target.value})}/></Field><button style={S.primaryBtn} onClick={()=>onSave(visit.id, form)}>Mark Completed</button></div></Modal>;
}
function PetInfoModal({ pet, owner, vetClinic, onClose }) { return <Modal onClose={onClose} title={`${pet.name} — Emergency & Care Info`}><div style={S.petInfo}>{pet.photo_url ? <img src={pet.photo_url} style={S.petPhotoBig} /> : <div style={S.photoBlank}>No Photo</div>}<h2>{pet.name}</h2><p>{pet.species} · {pet.breed} · {pet.color_description}</p><Info label="Owner" value={`${owner?.name || ""} ${owner?.phone || ""}`} /><Info label="Owner emergency contact" value={`${owner?.emergency_contact_name || ""} ${owner?.emergency_contact_phone || ""}`} /><Info label="Vet clinic" value={vetClinic ? `${vetClinic.clinic_name || ""} ${vetClinic.phone || ""}` : `${pet.vet_name || ""} ${pet.vet_phone || ""}`} danger /><Info label="Vet address" value={vetClinic?.address || ""} /><Info label="After-hours / emergency vet" value={vetClinic?.emergency_phone || pet.emergency_vet} danger /><Info label="Medical conditions" value={pet.medical_conditions} danger /><Info label="Allergies" value={pet.allergies} danger /><Info label="Medication" value={pet.medication_instructions} /><Info label="Feeding" value={pet.feeding_instructions} /><Info label="Emergency instructions" value={pet.emergency_instructions} danger /><Info label="Behavior warnings" value={pet.behavior_notes} danger /><Info label="Leash / harness" value={pet.leash_harness_notes} /><Info label="Access instructions" value={owner?.access_instructions} /><Info label="Care notes" value={pet.care_notes} /></div></Modal>; }
function Info({label,value,danger}) { if(!value) return null; return <div style={danger?S.infoDanger:S.info}><b>{label}</b><p>{value}</p></div>; }
function Modal({ title, children, onClose }) { return <div style={S.modalShade}><div style={S.modal}><div style={S.modalHead}><h2>{title}</h2><button style={S.ghostBtn} onClick={onClose}>Close</button></div>{children}</div></div>; }
function Panel({ title, children }) { return <div style={S.card}><h2>{title}</h2>{children}</div>; }
function Metric({ title, value, sub }) { return <div style={S.metric}><span>{title}</span><b>{value}</b><small>{sub}</small></div>; }
function Empty({ text }) { return <p style={S.muted}>{text}</p>; }
function Field({ label, children }) { return <label style={S.field}><span>{label}</span>{children}</label>; }
function visitPetsFor(visit, visitPets, petMapOrPets) { const map = Array.isArray(petMapOrPets) ? Object.fromEntries(petMapOrPets.map(p=>[p.id,p])) : petMapOrPets; const rows = visitPets.filter(vp=>vp.visit_id===visit.id).map(vp=>map[vp.pet_id]).filter(Boolean); if(rows.length) return rows; return visit.primary_pet_id && map[visit.primary_pet_id] ? [map[visit.primary_pet_id]] : []; }
function InfoLine({ label, value, danger=false }) { if (!value && value !== 0) return null; return <div style={danger?S.infoDanger:S.info}><b>{label}</b><div>{String(value)}</div></div>; }
function OwnerSummary({ owner }) {
  if (!owner) return <Empty text="Choose an owner or create a new one." />;
  return <div style={S.infoGrid}>
    <InfoLine label="Phone" value={owner.phone} />
    <InfoLine label="Email" value={owner.email} />
    <InfoLine label="Invoice email" value={owner.invoice_email} />
    <InfoLine label="Address" value={owner.address} />
    <InfoLine label="Emergency contact" value={[owner.emergency_contact_name, owner.emergency_contact_phone].filter(Boolean).join(" — ")} danger />
    <InfoLine label="Default mileage" value={`${num(owner.default_mileage)} km`} />
    <InfoLine label="Access instructions" value={owner.access_instructions} danger />
    <InfoLine label="House instructions" value={owner.house_instructions} />
    <InfoLine label="Billing notes" value={owner.billing_notes} />
    <InfoLine label="Notes" value={owner.notes} />
  </div>;
}
function PetReadOnly({ pet, petTab, visits, serviceMap, visitPets, petMap, petChecklist, vetClinics = [] }) {
  if (!pet) return <Empty text="Choose a pet or add a new pet." />;
  if (petTab === "Profile") return <div style={S.infoGrid}>{pet.photo_url ? <img src={pet.photo_url} style={S.petPhotoBig} /> : <div style={S.photoBlank}>No photo</div>}<InfoLine label="Name" value={pet.name} /><InfoLine label="Species" value={pet.species} /><InfoLine label="Breed" value={pet.breed} /><InfoLine label="Color / description" value={pet.color_description} /><InfoLine label="Age" value={pet.age_text} /><InfoLine label="Weight" value={pet.weight} /><InfoLine label="Sex" value={pet.sex} /><InfoLine label="Spayed / neutered" value={pet.spayed_neutered} /><InfoLine label="Default mileage" value={`${num(pet.default_mileage)} km`} /></div>;
  if (petTab === "Care") return <div style={S.infoGrid}><InfoLine label="Feeding instructions" value={pet.feeding_instructions} /><InfoLine label="Medication instructions" value={pet.medication_instructions} danger /><InfoLine label="Behavior notes" value={pet.behavior_notes} /><InfoLine label="Leash / harness notes" value={pet.leash_harness_notes} /><InfoLine label="Favorite things" value={pet.favorite_things} /><InfoLine label="Hide spots" value={pet.hide_spots} /><InfoLine label="Care notes" value={pet.care_notes} /></div>;
  if (petTab === "Emergency") return <div style={S.infoGrid}><InfoLine label="Medical conditions" value={pet.medical_conditions} danger /><InfoLine label="Allergies" value={pet.allergies} danger /><InfoLine label="Vet clinic" value={vetClinic?.clinic_name || pet.vet_name} /><InfoLine label="Vet phone" value={vetClinic?.phone || pet.vet_phone} danger /><InfoLine label="Vet address" value={vetClinic?.address} /><InfoLine label="Emergency / after-hours vet" value={vetClinic?.emergency_phone || pet.emergency_vet} danger /><InfoLine label="Emergency instructions" value={pet.emergency_instructions} danger /></div>;
  if (petTab === "Checklist") return <div style={S.stack}>{petChecklist.filter(i=>i.pet_id===pet.id).length ? <ul>{petChecklist.filter(i=>i.pet_id===pet.id).map(i=><li key={i.id}>{i.label}</li>)}</ul> : <Empty text="No pet-specific checklist items yet." />}</div>;
  return <div style={S.stack}>{visits.length ? visits.map(v=><VisitHistoryRow key={v.id} visit={v} service={serviceMap[v.service_id]} pets={visitPetsFor(v, visitPets, petMap)} />) : <Empty text="No visit history for this pet yet." />}</div>;
}
function VisitHistoryRow({ visit, service, pets, onDeleteVisit }) { return <div style={S.visitHistory}><div><b>{niceDate(visit.visit_date)} {visit.scheduled_start_time || ""}</b><div style={S.muted}>{service?.name || "Service"} · {pets.map(p=>p.name).join(", ")}</div></div><div style={S.status}>{visit.status}</div><div><b>{money(visit.total_amount)}</b></div>{onDeleteVisit && <button style={S.dangerMini} onClick={()=>onDeleteVisit(visit)}>Delete</button>}</div>; }
function OwnerBillingSummary({ owner, visits, visitPets, petMap, serviceMap, onMarkPaid, onMarkUnpaid, onMarkManyPaid }) {
  const completed = visits.filter(v=>v.status==="Completed");
  const unpaid = completed.filter(v=>!v.is_paid);
  const paid = completed.filter(v=>v.is_paid);
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
    <div style={S.row}><button style={S.primaryBtn} onClick={()=>printTextDocument(`${owner?.name || "Owner"} Invoice`, unpaidText)}>Print Invoice</button><button style={S.secondaryBtn} onClick={()=>emailTextDocument(`${owner?.name || "Owner"} Invoice`, unpaidText, owner?.invoice_email || owner?.email)}>Email Invoice</button><button style={S.secondaryBtn} onClick={()=>printTextDocument(`${owner?.name || "Owner"} Statement`, statementText)}>Print Statement</button><button style={S.secondaryBtn} onClick={()=>emailTextDocument(`${owner?.name || "Owner"} Statement`, statementText, owner?.invoice_email || owner?.email)}>Email Statement</button></div>
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
        {unpaid.map(v=><div key={v.id} style={S.billingRow}><label style={S.check}><input type="checkbox" checked={selected.includes(v.id)} onChange={()=>toggle(v.id)} /> Select</label><div><b>{niceDate(v.visit_date)} {v.scheduled_start_time || ""}</b><div style={S.muted}>{serviceMap[v.service_id]?.name || "Service"} · {visitPetsFor(v, visitPets, petMap).map(p=>p.name).join(", ")}</div></div><b>{money(v.total_amount)}</b><button style={S.primaryMini} onClick={()=>onMarkPaid(v.id)}>Mark Paid</button></div>)}
      </div> : <Empty text="No unpaid completed visits for this owner." />}
    </Panel>
    <Panel title="Paid Visits">
      {paid.length ? paid.slice(0,25).map(v=><div key={v.id} style={S.billingRowCompact}><div><b>{niceDate(v.visit_date)} {v.scheduled_start_time || ""}</b><div style={S.muted}>{serviceMap[v.service_id]?.name || "Service"} · {visitPetsFor(v, visitPets, petMap).map(p=>p.name).join(", ")} · {v.payment_method || "No method"}</div></div><b>{money(v.total_amount)}</b><small>{v.paid_at ? niceDate(String(v.paid_at).slice(0,10)) : "Paid"}</small><button style={S.secondaryMini} onClick={()=>onMarkUnpaid(v.id)}>Mark Unpaid</button></div>) : <Empty text="No paid visits yet." />}
    </Panel>
  </div>;
}
function OwnerForm({ value, onChange }) {
  return <div style={S.stack}>
    <div style={S.formGrid}>
      {[
        ["name", "Owner name"], ["phone", "Phone"], ["email", "Email"], ["address", "Address"], ["default_mileage", "Default mileage"]
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
      {[["name","Pet name"],["species","Species"],["breed","Breed"],["age_text","Age"],["default_mileage","Default mileage"]].map(([k,label])=><Field key={k} label={label}><input type={k.includes("mileage")?"number":"text"} value={value[k]||""} onChange={e=>onChange({...value,[k]:e.target.value})}/></Field>)}
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
function ServiceForm({ value, onChange }) { return <div style={S.formGrid}>{["name","category","default_duration_minutes","base_price","extra_pet_price"].map(k=><Field key={k} label={k.replaceAll("_"," ")}><input type={["default_duration_minutes","base_price","extra_pet_price"].includes(k)?"number":"text"} value={value[k]||""} onChange={e=>onChange({...value,[k]:e.target.value})}/></Field>)}<label style={S.check}><input type="checkbox" checked={!!value.taxable} onChange={e=>onChange({...value,taxable:e.target.checked})}/> Taxable</label><Field label="Description"><textarea value={value.description||""} onChange={e=>onChange({...value,description:e.target.value})}/></Field></div>; }
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
function PetMini({ pet, active, onClick, onInfo }) { return <div style={active?S.petCardActive:S.petCard} onClick={onClick}>{pet.photo_url ? <img src={pet.photo_url} style={S.petPhoto} /> : <div style={S.photoSmall}>{petFace(pet)}</div>}<b>{petFace(pet)} {pet.name}</b><small>{pet.species} · {pet.breed}</small><div style={S.row}><button style={S.secondaryMini} onClick={(e)=>{e.stopPropagation(); onInfo();}}>Info</button></div></div>; }

const S = {
  app:{minHeight:"100svh",background:"linear-gradient(180deg,#fffaf6,#f7fbff)",color:"#1f2937",paddingBottom:92,fontFamily:"system-ui,Segoe UI,Roboto,sans-serif"},
  header:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,padding:"10px 12px 4px",maxWidth:720,margin:"0 auto"}, kicker:{display:"none"}, title:{fontSize:26,margin:0,fontWeight:850,color:"#211816",lineHeight:1.05}, main:{maxWidth:720,margin:"0 auto",padding:"8px 10px 30px",overflowX:"hidden"}, stack:{display:"grid",gap:14}, grid3:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}, twoCol:{display:"grid",gridTemplateColumns:"1fr",gap:12}, twoColBalanced:{display:"grid",gridTemplateColumns:"1fr",gap:12}, subTabs:{display:"flex",gap:8,flexWrap:"wrap",margin:"8px 0 14px"}, subTab:{border:"1px solid #e1d2c5",background:"#fff",borderRadius:999,padding:"9px 12px",fontWeight:800}, subTabActive:{border:"1px solid #d9783f",background:"#fff2e8",borderRadius:999,padding:"9px 12px",fontWeight:900,color:"#763b15"}, detailBox:{border:"1px solid #eadfd6",borderRadius:20,padding:14,background:"#fffdfb",display:"grid",gap:12}, infoGrid:{display:"grid",gridTemplateColumns:"1fr",gap:8}, visitHistory:{display:"grid",gridTemplateColumns:"1fr",gap:8,alignItems:"start",border:"1px solid #f0e4da",borderRadius:14,padding:10,background:"#fff"}, card:{background:"rgba(255,255,255,.92)",border:"1px solid #eadfd6",borderRadius:22,padding:16,boxShadow:"0 12px 30px rgba(70,50,35,.08)",textAlign:"left"}, metric:{background:"#fff",border:"1px solid #eadfd6",borderRadius:20,padding:16,textAlign:"left",boxShadow:"0 10px 22px rgba(70,50,35,.06)",display:"grid",gap:3}, muted:{color:"#6b7280"}, error:{maxWidth:1180,margin:"8px auto",padding:12,borderRadius:14,background:"#fff1f2",color:"#9f1239",textAlign:"left"}, toast:{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:50,background:"#15251d",color:"#fff",padding:"10px 18px",borderRadius:999,animation:"successPop 1.4s ease"}, saving:{position:"fixed",right:16,bottom:95,background:"#111827",color:"#fff",padding:"10px 14px",borderRadius:14,zIndex:60}, bottomNav:{position:"fixed",bottom:0,left:0,right:0,display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,padding:"8px 8px calc(8px + env(safe-area-inset-bottom))",background:"rgba(255,255,255,.95)",borderTop:"1px solid #eadfd6",backdropFilter:"blur(12px)",zIndex:40}, navBtn:{border:"1px solid #e7d8ca",background:"#fff",borderRadius:16,padding:"12px 4px",fontWeight:850,color:"#6b5b50",fontSize:14}, navActive:{border:"1px solid #d99058",background:"#fff2e8",borderRadius:16,padding:"12px 4px",fontWeight:900,color:"#763b15",fontSize:14,boxShadow:"0 8px 16px rgba(217,144,88,.2)"}, primaryBtn:{border:0,background:"#d9783f",color:"#fff",borderRadius:16,padding:"12px 16px",fontWeight:900}, secondaryBtn:{border:"1px solid #d9c7b8",background:"#fff",color:"#53392a",borderRadius:16,padding:"11px 14px",fontWeight:800}, ghostBtn:{border:"1px solid #e4d6c9",background:"rgba(255,255,255,.65)",borderRadius:14,padding:"10px 12px",fontWeight:800}, dangerBtn:{border:0,background:"#b91c1c",color:"#fff",borderRadius:16,padding:"11px 14px",fontWeight:800}, primaryMini:{border:0,background:"#d9783f",color:"#fff",borderRadius:12,padding:"8px 10px",fontWeight:800}, secondaryMini:{border:"1px solid #d9c7b8",background:"#fff",borderRadius:12,padding:"8px 10px",fontWeight:800}, dangerMini:{border:0,background:"#fee2e2",color:"#991b1b",borderRadius:12,padding:"8px 10px",fontWeight:800}, formGrid:{display:"grid",gridTemplateColumns:"1fr",gap:10}, field:{display:"grid",gap:5,fontWeight:800,color:"#544236"}, check:{display:"flex",gap:8,alignItems:"center",fontWeight:750}, row:{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}, list:{display:"grid",gap:8,maxHeight:420,overflow:"auto"}, listBtn:{textAlign:"left",border:"1px solid #eadfd6",background:"#fff",borderRadius:15,padding:12,display:"grid",gap:3}, listActive:{textAlign:"left",border:"1px solid #d99058",background:"#fff2e8",borderRadius:15,padding:12,display:"grid",gap:3}, petCards:{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}, petCard:{border:"1px solid #eadfd6",background:"#fff",borderRadius:18,padding:12,display:"grid",gap:7}, petCardActive:{border:"2px solid #d9783f",background:"#fff7ef",borderRadius:18,padding:12,display:"grid",gap:7}, petPhoto:{width:62,height:62,borderRadius:18,objectFit:"cover"}, petPhotoBig:{width:"100%",maxHeight:260,borderRadius:22,objectFit:"cover"}, photoSmall:{width:62,height:62,borderRadius:18,background:"#f2e2d2",display:"grid",placeItems:"center",fontWeight:900,fontSize:26}, photoBlank:{height:140,borderRadius:20,background:"#f2e2d2",display:"grid",placeItems:"center",fontWeight:900}, petPickWrap:{display:"flex",gap:8,flexWrap:"wrap",margin:"10px 0"}, pickBtn:{border:"1px solid #e1d2c5",background:"#fff",borderRadius:999,padding:"10px 13px",fontWeight:800}, pickActive:{border:"1px solid #d9783f",background:"#fff2e8",color:"#763b15",borderRadius:999,padding:"10px 13px",fontWeight:900}, cards:{display:"grid",gridTemplateColumns:"1fr",gap:10,marginTop:10}, smallCard:{border:"1px solid #eadfd6",background:"#fff",borderRadius:17,padding:12,display:"grid",gap:5}, visitCard:{border:"1px solid #eadfd6",borderRadius:18,padding:13,display:"grid",gridTemplateColumns:"1fr",gap:10,alignItems:"start",marginTop:10}, cardActions:{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8,alignItems:"stretch",width:"100%"}, petLine:{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}, petChip:{border:0,background:"#e9f7ef",borderRadius:999,padding:"6px 9px",fontWeight:800,color:"#14532d"}, status:{fontSize:12,fontWeight:900,color:"#6b7280"}, officeNav:{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}, officeBtn:{border:"1px solid #e1d2c5",background:"#fff",borderRadius:999,padding:"10px 13px",fontWeight:800}, officeActive:{border:"1px solid #d9783f",background:"#fff2e8",borderRadius:999,padding:"10px 13px",fontWeight:900}, reportRow:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,alignItems:"center",borderBottom:"1px solid #f0e4da",padding:"10px 0"}, billingRow:{display:"grid",gridTemplateColumns:"1fr",gap:8,alignItems:"start",border:"1px solid #f0e4da",borderRadius:14,padding:10,background:"#fff"}, billingRowCompact:{display:"grid",gridTemplateColumns:"1fr",gap:8,alignItems:"start",border:"1px solid #f0e4da",borderRadius:14,padding:10,background:"#fff"}, checklistRow:{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:10,alignItems:"center",border:"1px solid #f0e4da",borderRadius:12,padding:10,background:"#fff"}, subList:{gridColumn:"1/-1",display:"flex",gap:6,flexWrap:"wrap",color:"#6b7280"}, modalShade:{position:"fixed",inset:0,background:"rgba(30,20,10,.38)",zIndex:80,display:"grid",placeItems:"center",padding:14}, modal:{width:"min(900px,100%)",maxHeight:"88svh",overflow:"auto",background:"#fff",borderRadius:24,padding:16,boxShadow:"0 30px 80px rgba(0,0,0,.25)",textAlign:"left"}, modalHead:{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",borderBottom:"1px solid #eee",paddingBottom:10,marginBottom:12}, photoPickerBox:{border:"1px solid #eadfd6",borderRadius:20,padding:12,background:"#fff",display:"grid",gap:10}, petInfo:{display:"grid",gap:10}, info:{border:"1px solid #e5e7eb",borderRadius:14,padding:12,background:"#fff"}, infoDanger:{border:"1px solid #fecaca",borderRadius:14,padding:12,background:"#fff1f2"}, collapse:{border:"1px solid #eadfd6",borderRadius:16,padding:0,background:"#fff"}, collapseSummary:{listStyle:"none",cursor:"pointer",padding:"13px 14px",fontWeight:900,color:"#53392a"},
};
