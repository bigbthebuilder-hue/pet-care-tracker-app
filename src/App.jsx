import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const VERSION = "PET_CARE_V32_BUSINESS_DOCUMENT_SETTINGS";
const TABS = ["Today", "Schedule", "Owners", "Office"];
const OFFICE_TABS = ["Reports", "Services", "Vets", "Travel", "Settings", "Deleted"];
const STATUSES = ["Scheduled", "In Progress", "Completed", "Cancelled", "Missed"];

const ICON_IMAGES = {
  tabHome: "/icons/tab-home.png",
  tabSchedule: "/icons/tab-schedule.png",
  tabOwners: "/icons/tab-owners.png",
  tabOffice: "/icons/tab-office.png",
  scheduleUpcoming: "/icons/schedule-upcoming.png",
  scheduleActive: "/icons/schedule-active.png",
  scheduleCompleted: "/icons/schedule-completed.png",
  ownerDetails: "/icons/owner-details.png",
  ownerPets: "/icons/owner-pets.png",
  ownerDocs: "/icons/owner-docs.png",
  ownerScheduleVisit: "/icons/schedule-visit.png",
  ownerVisits: "/icons/visits.png",
  ownerBilling: "/icons/billing.png",
  officeReports: "/icons/reports.png",
  officeServices: "/icons/services.png",
  officeVets: "/icons/vets.png",
  officeTravel: "/icons/travel.png",
  officeSettings: "/icons/settings.png",
  officeDeleted: "/icons/deleted.png",
};
const TAB_IMAGE_ICONS = { Today: ICON_IMAGES.tabHome, Schedule: ICON_IMAGES.tabSchedule, Owners: ICON_IMAGES.tabOwners, Office: ICON_IMAGES.tabOffice };
const OWNER_TAB_IMAGE_ICONS = { "Owner Info": ICON_IMAGES.ownerDetails, Pets: ICON_IMAGES.ownerPets, Documents: ICON_IMAGES.ownerDocs, "Schedule Visit": ICON_IMAGES.ownerScheduleVisit, Visits: ICON_IMAGES.ownerVisits, Billing: ICON_IMAGES.ownerBilling };
const OFFICE_TAB_IMAGE_ICONS = { Reports: ICON_IMAGES.officeReports, Services: ICON_IMAGES.officeServices, Vets: ICON_IMAGES.officeVets, Travel: ICON_IMAGES.officeTravel, Settings: ICON_IMAGES.officeSettings, Deleted: ICON_IMAGES.officeDeleted };
const PET_TAB_ICONS = { Profile: "paw", Care: "heartPulse", Emergency: "alertTriangle", Checklist: "squareCheck", History: "history" };
const OFFICE_TAB_ICONS = { Reports: "barChart", Services: "bone", Vets: "cross", Travel: "car", Settings: "settings", Deleted: "trash" };
const SCHEDULE_FILTERS = ["Calendar", "Upcoming", "Active", "Completed"];
const DEFAULT_SERVICE_COLORS = ["#0f62fe", "#10b981", "#8b5cf6", "#f97316", "#e11d48", "#06b6d4", "#f59e0b", "#ec4899"];

const DOCUMENT_TEMPLATES = [
  { id: "client_household_intake", title: "Client / Household Intake", fileName: "01_Client_Household_Intake_Form.docx", group: "Core intake" },
  { id: "individual_pet_profile", title: "Individual Pet Profile", fileName: "02_Individual_Pet_Profile_Form.docx", group: "Core intake", petSpecific: true },
  { id: "service_agreement", title: "Pet Care Service Agreement", fileName: "03_Pet_Care_Service_Agreement.docx", group: "Core intake" },
  { id: "vet_authorization", title: "Emergency Veterinary Authorization", fileName: "04_Emergency_Veterinary_Authorization.docx", group: "Core intake", petSpecific: true },
  { id: "home_access", title: "Home Access / Key Security Release", fileName: "05_Home_Access_Key_Security_Release.docx", group: "Core intake" },
  { id: "policies_pricing", title: "Client Policies / Pricing Acknowledgement", fileName: "09_Client_Policies_Pricing_Acknowledgement.docx", group: "Core intake" },
  { id: "medication_auth", title: "Medication Administration Authorization", fileName: "06_Medication_Administration_Authorization.docx", group: "Optional forms", petSpecific: true },
  { id: "dog_walking", title: "Dog Walking Consent / Rules", fileName: "12_Dog_Walking_Consent_Rules.docx", group: "Optional forms", petSpecific: true },
  { id: "overnight", title: "Overnight / In-Home Sitting Add-On", fileName: "13_Overnight_In_Home_Sitting_Add_On.docx", group: "Optional forms" },
  { id: "photo_consent", title: "Photo / Marketing Consent", fileName: "14_Photo_Marketing_Consent.docx", group: "Optional forms" },
  { id: "medication_log", title: "Medication Administration Log", fileName: "07_Medication_Administration_Log.docx", group: "Operational forms", petSpecific: true },
  { id: "visit_notes", title: "Visit Checklist / Completion Notes", fileName: "08_Visit_Checklist_Completion_Notes.docx", group: "Operational forms" },
  { id: "meet_greet", title: "Meet & Greet Safety Checklist", fileName: "11_Meet_Greet_Safety_Checklist.docx", group: "Operational forms" },
  { id: "incident_report", title: "Incident Report", fileName: "15_Incident_Report_Form.docx", group: "Operational forms", petSpecific: true },
  { id: "incident_follow_up", title: "Incident Follow-Up Checklist", fileName: "16_Incident_Follow_Up_Checklist.docx", group: "Operational forms", petSpecific: true },
];
const CORE_DOCUMENT_IDS = ["client_household_intake", "individual_pet_profile", "service_agreement", "vet_authorization", "home_access", "policies_pricing"];
const DOCUMENT_TYPES = DOCUMENT_TEMPLATES.map(d => d.title).concat(["Signed full intake package", "Other"]);


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
  taxable: false, service_color: "#0f62fe", description: "", is_active: true, sort_order: 0,
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

function isoFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDaysIso(iso, days) {
  const d = parseDateOnly(iso) || new Date();
  d.setDate(d.getDate() + days);
  return isoFromDate(d);
}
function monthKeyFromIso(iso) {
  return String(iso || todayISO()).slice(0, 7);
}
function monthLabel(monthKey) {
  const [y,m] = String(monthKey || monthKeyFromIso(todayISO())).split("-").map(Number);
  return new Date(y || new Date().getFullYear(), (m || 1) - 1, 1).toLocaleDateString(undefined, { month:"long", year:"numeric" });
}
function shiftMonthKey(monthKey, offset) {
  const [y,m] = String(monthKey || monthKeyFromIso(todayISO())).split("-").map(Number);
  return isoFromDate(new Date(y || new Date().getFullYear(), (m || 1) - 1 + offset, 1)).slice(0,7);
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
function visitBaseCharge(v) { return num(v?.base_price) + num(v?.extra_pet_fees) + num(v?.add_on_fees); }
function visitMileageCharge(v) { return num(v?.travel_fee); }
function visitTaxCharge(v) { return num(v?.gst_amount); }
function visitChargeTotal(v) {
  const componentTotal = visitBaseCharge(v) + visitMileageCharge(v) + visitTaxCharge(v);
  return Math.max(num(v?.total_amount), componentTotal);
}
function visitChargeBreakdown(v) {
  const base = visitBaseCharge(v);
  const mileage = visitMileageCharge(v);
  const tax = visitTaxCharge(v);
  const total = visitChargeTotal(v);
  return { base, mileage, tax, total };
}
function visitMoneyDetails(v) {
  const parts = [];
  const b = visitChargeBreakdown(v);
  if (b.base) parts.push(`Service ${money(b.base)}`);
  if (b.mileage) parts.push(`Mileage ${money(b.mileage)}${num(v?.mileage) ? ` (${num(v.mileage)} km)` : ""}`);
  if (b.tax) parts.push(`GST ${money(b.tax)}`);
  parts.push(`Total ${money(b.total)}`);
  return parts.join(" · ");
}
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

function AppImageIcon({ src, size = 56, style }) {
  return <img src={src} alt="" aria-hidden="true" style={{ width:size, height:size, objectFit:"contain", display:"block", filter:"drop-shadow(0 8px 14px rgba(8,21,58,.16))", ...style }} />;
}

function IconTileCard({ src, label, zoom = 1, labelStyle }) {
  return <>
    <span style={S.iconTileFill}>
      <img src={src} alt="" aria-hidden="true" style={{ ...S.iconTileImage, transform: `scale(${zoom})` }} />
      <span style={S.iconTileShine} />
      <span style={S.iconTileScrim} />
    </span>
    <span style={{ ...S.iconTileLabel, ...labelStyle }}>{label}</span>
  </>;
}

function Icon({ name, size = 24, strokeWidth = 2.25, style }) {
  const common = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth };
  const paths = {
    home: <><path {...common} d="M3 10.5 12 3l9 7.5"/><path {...common} d="M5 10v10h14V10"/><path {...common} d="M9.5 20v-6h5v6"/></>,
    calendarCheck: <><rect {...common} x="4" y="5" width="16" height="15" rx="3"/><path {...common} d="M8 3v4M16 3v4M4 10h16"/><path {...common} d="m8.5 15 2.2 2.2 4.8-5"/></>,
    paw: <><circle cx="12" cy="14" r="4.2" fill="currentColor"/><circle cx="6.7" cy="9.2" r="2.1" fill="currentColor"/><circle cx="10" cy="6.4" r="2.1" fill="currentColor"/><circle cx="14" cy="6.4" r="2.1" fill="currentColor"/><circle cx="17.3" cy="9.2" r="2.1" fill="currentColor"/></>,
    briefcase: <><rect {...common} x="3.5" y="7" width="17" height="12.5" rx="3"/><path {...common} d="M9 7V5.5A2.5 2.5 0 0 1 11.5 3h1A2.5 2.5 0 0 1 15 5.5V7"/><path {...common} d="M3.5 12h17"/></>,
    user: <><circle {...common} cx="12" cy="8" r="4"/><path {...common} d="M4.5 20c1.6-4.2 13.4-4.2 15 0"/></>,
    folder: <><path {...common} d="M3.5 6.5h6l2 2h8.5v9a2.5 2.5 0 0 1-2.5 2.5H6a2.5 2.5 0 0 1-2.5-2.5z"/><path {...common} d="M3.5 10h17"/></>,
    star: <path {...common} d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2 7.5 14 3 9.6l6.2-.9z"/>,
    receipt: <><path {...common} d="M6 3h12v18l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2L6 21z"/><path {...common} d="M9 8h6M9 12h6M9 16h4"/></>,
    heartPulse: <><path {...common} d="M20.5 9.5c0 5.2-8.5 10.5-8.5 10.5S3.5 14.7 3.5 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8.5 2.5Z"/><path {...common} d="M7 13h2.1l1.2-2.8 2.1 5.3 1.5-3H17"/></>,
    alertTriangle: <><path {...common} d="M12 3 22 20H2z"/><path {...common} d="M12 9v5M12 17h.01"/></>,
    squareCheck: <><rect {...common} x="4" y="4" width="16" height="16" rx="3"/><path {...common} d="m8 12 2.5 2.5L16.5 9"/></>,
    history: <><path {...common} d="M4 12a8 8 0 1 0 2.4-5.7"/><path {...common} d="M4 4v5h5"/><path {...common} d="M12 8v5l3 2"/></>,
    barChart: <><path {...common} d="M4 20h16"/><rect {...common} x="6" y="11" width="3" height="7" rx="1"/><rect {...common} x="11" y="7" width="3" height="11" rx="1"/><rect {...common} x="16" y="4" width="3" height="14" rx="1"/></>,
    bone: <path {...common} d="M8.2 8.2 15.8 15.8M6.7 11.3a3 3 0 1 1-3.9-3.9 3 3 0 1 1 3.9 3.9Zm10.6 1.4a3 3 0 1 1 3.9 3.9 3 3 0 1 1-3.9-3.9Z"/>,
    cross: <><path {...common} d="M12 4v16M4 12h16"/><rect {...common} x="7" y="3.5" width="10" height="17" rx="3" transform="rotate(90 12 12)"/></>,
    car: <><path {...common} d="M4 14h16l-1.7-5.1A3 3 0 0 0 15.5 7h-7a3 3 0 0 0-2.8 1.9L4 14Z"/><path {...common} d="M5 14v4h2M17 18h2v-4M8 10h8"/><circle cx="8" cy="17" r="1.7" fill="currentColor"/><circle cx="16" cy="17" r="1.7" fill="currentColor"/></>,
    settings: <><circle {...common} cx="12" cy="12" r="3"/><path {...common} d="M19.4 15a8 8 0 0 0 .1-6l-2.1-.6-.9-2-2 .8a8 8 0 0 0-5 0l-2-.8-.9 2-2.1.6a8 8 0 0 0 .1 6l2 .6.9 2 2-.8a8 8 0 0 0 5 0l2 .8.9-2z"/></>,
    trash: <><path {...common} d="M4 7h16M9 7V5h6v2M7 7l1 14h8l1-14"/><path {...common} d="M10 11v6M14 11v6"/></>,
    playCircle: <><circle {...common} cx="12" cy="12" r="9"/><path fill="currentColor" d="M10 8.5v7l6-3.5z"/></>,
    checkCircle: <><circle {...common} cx="12" cy="12" r="9"/><path {...common} d="m8 12 2.5 2.5L16.5 9"/></>,
    moreHorizontal: <><circle cx="6" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="18" cy="12" r="1.6" fill="currentColor"/></>,
    calendarClock: <><rect {...common} x="4" y="5" width="16" height="15" rx="3"/><path {...common} d="M8 3v4M16 3v4M4 10h16"/><path {...common} d="M12 13v3l2 1"/></>,
    pencil: <><path {...common} d="M4 20h4l11-11a2.4 2.4 0 0 0-4-4L4 16z"/><path {...common} d="m13.5 6.5 4 4"/></>,
    fileText: <><path {...common} d="M7 3h7l4 4v14H7z"/><path {...common} d="M14 3v5h5M9.5 12h5M9.5 16h5"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} style={{display:"block",...style}}>{paths[name] || paths.fileText}</svg>;
}

function hashString(str) { let h = 0; for (let i = 0; i < String(str || "").length; i++) h = ((h << 5) - h) + String(str).charCodeAt(i); return Math.abs(h); }
function serviceColor(service) {
  const explicit = service?.service_color || service?.color || service?.color_hex;
  if (explicit && String(explicit).startsWith("#")) return explicit;
  const key = `${service?.category || ""} ${service?.name || ""}`.toLowerCase();
  if (key.includes("walk")) return "#0f62fe";
  if (key.includes("drop") || key.includes("check")) return "#10b981";
  if (key.includes("overnight") || key.includes("sitting")) return "#8b5cf6";
  if (key.includes("med")) return "#e11d48";
  if (key.includes("feed")) return "#f97316";
  return DEFAULT_SERVICE_COLORS[hashString(key) % DEFAULT_SERVICE_COLORS.length];
}
function hexToRgba(hex, alpha = 1) {
  const raw = String(hex || "#0f62fe").replace("#", "");
  const full = raw.length === 3 ? raw.split("").map(c => c+c).join("") : raw.padEnd(6,"0").slice(0,6);
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
function visitCardStyle(visit, service) {
  const color = serviceColor(service);
  const base = { ...S.visitCard, borderLeft: "1px solid #dbeafe", borderRight: "1px solid #dbeafe" };
  if (visit?.status === "Completed") return { ...base, borderRight: `6px solid ${color}`, borderLeft: "1px solid #dbeafe" };
  if (visit?.status === "Cancelled" || visit?.status === "Missed") return { ...base, borderLeft: "6px solid #94a3b8", background: "#f8fafc", opacity: .92 };
  return { ...base, borderLeft: `6px solid ${color}` };
}

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
  const [scheduleSeed, setScheduleSeed] = useState(null);
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
  const [ownerDocuments, setOwnerDocuments] = useState([]);

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
  function scrollToElementNow(id) {
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  function scheduleVisitForOwner(ownerId) {
    if (!ownerId) return;
    setScheduleSeed({ ownerId, visitDate: todayISO(), stamp: Date.now() });
    setTab("Schedule");
    scrollToElementNow("schedule-form-panel");
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
      const docsRes = await supabase.from("pet_client_documents").select("*").order("uploaded_at", { ascending: false });
      if (!docsRes.error) setOwnerDocuments(docsRes.data || []); else setOwnerDocuments([]);
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
  async function uploadOwnerDocument({ ownerId, petId = "", documentType, file, notes = "" }) {
    if (!ownerId || !file) { setError("Choose an owner and file first."); return; }
    setSaving(true); setError("");
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
      const path = `${ownerId}/${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage.from("pet-documents").upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (uploadError) throw uploadError;
      const publicUrl = supabase.storage.from("pet-documents").getPublicUrl(path)?.data?.publicUrl || "";
      const row = { owner_id: ownerId, pet_id: petId || null, document_type: documentType || "Other", file_name: file.name, file_path: path, file_url: publicUrl, notes, status: "received", uploaded_at: nowIso() };
      const { error: insertError } = await supabase.from("pet_client_documents").insert(row);
      if (insertError) throw insertError;
      setToast("Document attached");
      await loadAll();
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
      setToast("Visit scheduled"); await loadAll(); return data;
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
      setToast("Visit rescheduled"); await loadAll(); return { id: visitId, visit_date: form.visit_date || todayISO() };
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
    const chargeMileage = !!patch.mileage_chargeable;
    const travelFee = chargeMileage ? num(patch.travel_fee) : 0;
    const base = num(v?.base_price) + num(v?.extra_pet_fees) + num(v?.add_on_fees);
    const gst = settings?.charge_gst ? (base + travelFee) * num(settings.gst_rate) / 100 : num(v?.gst_amount);
    const finalTotal = base + travelFee + gst;
    const final = {
      ...patch,
      travel_fee: travelFee,
      gst_amount: gst,
      total_amount: finalTotal,
      status: "Completed",
      actual_end_time: actualEnd,
      completed_at: actualEnd,
    };
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
      {tab === "Today" && <TodayPage visits={todayVisits} allVisits={visits} activeVisits={activeVisits} overdueVisits={overdueVisits} owners={ownerMap} pets={petMap} services={serviceMap} visitPets={visitPets} onStart={startVisit} onComplete={setCompleteVisitId} onPetInfo={setPetInfoId} onCancel={markCancelled} onMarkPaid={markVisitPaid} onMarkUnpaid={markVisitUnpaid} onDeleteVisit={(v)=>requestDelete("pet_visits", v, "visit", `${niceDate(v.visit_date)} ${serviceMap[v.service_id]?.name || "visit"}`)} />}
      {tab === "Schedule" && <SchedulePage scheduleSeed={scheduleSeed} owners={owners} pets={pets} services={services} options={options} visits={visits} visitPets={visitPets} ownerMap={ownerMap} petMap={petMap} serviceMap={serviceMap} onAdd={addVisitFromForm} onUpdate={updateVisitFromForm} onRepeatLast={repeatLastVisit} onRepeatVisit={repeatVisitTemplate} onStart={startVisit} onComplete={setCompleteVisitId} onPetInfo={setPetInfoId} onMarkPaid={markVisitPaid} onMarkUnpaid={markVisitUnpaid} onDeleteVisit={(v)=>requestDelete("pet_visits", v, "visit", `${niceDate(v.visit_date)} ${serviceMap[v.service_id]?.name || "visit"}`)} />}
      {tab === "Owners" && <OwnersPage owners={owners} pets={pets} services={services} options={options} petChecklist={petChecklist} visits={visits} visitPets={visitPets} selectedOwnerId={selectedOwnerId} selectedPetId={selectedPetId} setSelectedOwnerId={setSelectedOwnerId} setSelectedPetId={setSelectedPetId} ownerMap={ownerMap} petMap={petMap} serviceMap={serviceMap} onSaveOwner={(o)=>saveRow("pet_owners", o, "Owner saved")} onSavePet={(p)=>saveRow("pet_pets", p, "Pet saved")} onSaveOption={(o)=>saveRow("pet_saved_service_options", o, "Saved service option saved")} onAddPetChecklist={(row)=>saveRow("pet_pet_checklist_items", row, "Pet checklist saved")} onDeleteOwner={(o)=>requestDelete("pet_owners", o, "owner", o.name)} onDeletePet={(p)=>requestDelete("pet_pets", p, "pet", p.name)} onDeleteOption={(o)=>requestDelete("pet_saved_service_options", o, "saved_service_option", o.option_name)} vetClinics={vetClinics} onSaveVetClinic={(v)=>saveRow("pet_vet_clinics", v, "Vet clinic saved")} onPetInfo={setPetInfoId} onMarkPaid={markVisitPaid} onMarkUnpaid={markVisitUnpaid} onMarkManyPaid={markManyVisitsPaid} onDeleteVisit={(v)=>requestDelete("pet_visits", v, "visit", `${niceDate(v.visit_date)} ${serviceMap[v.service_id]?.name || "visit"}`)} ownerDocuments={ownerDocuments} onUploadDocument={uploadOwnerDocument} onDeleteDocument={(d)=>requestDelete("pet_client_documents", d, "client_document", d.file_name || d.document_type)} settings={settings} onScheduleVisit={scheduleVisitForOwner} />}
      {tab === "Office" && <OfficePage officeTab={officeTab} setOfficeTab={setOfficeTab} owners={owners} pets={pets} services={services} serviceChecklist={serviceChecklist} visits={visits} visitPets={visitPets} travel={travel} vetClinics={vetClinics} settings={settings} deleted={deleted} ownerMap={ownerMap} petMap={petMap} serviceMap={serviceMap} onSaveService={(s)=>saveRow("pet_services", s, "Service saved")} onSaveServiceWithChecklist={saveServiceWithChecklist} onAddServiceChecklist={(row)=>saveRow("pet_service_checklist_items", row, "Checklist item saved")} onDeleteServiceChecklist={(item)=>requestDelete("pet_service_checklist_items", item, "service_checklist_item", item.label)} onDeleteService={(s)=>requestDelete("pet_services", s, "service", s.name)} onSaveSettings={(s)=>saveRow("pet_business_settings", s, "Settings saved")} onSaveVetClinic={(v)=>saveRow("pet_vet_clinics", v, "Vet clinic saved")} onDeleteVetClinic={(v)=>requestDelete("pet_vet_clinics", v, "vet_clinic", v.clinic_name)} onSaveTravel={(t)=>saveRow("pet_travel", t, "Travel saved")} onDeleteTravel={(t)=>requestDelete("pet_travel", t, "travel", `${niceDate(t.travel_date)} ${t.mileage || 0} km`)} onHardDeleteDeleted={hardDeleteDeleted} onMarkPaid={markVisitPaid} onMarkUnpaid={markVisitUnpaid} onMarkManyPaid={markManyVisitsPaid} onDeleteVisit={(v)=>requestDelete("pet_visits", v, "visit", `${niceDate(v.visit_date)} ${serviceMap[v.service_id]?.name || "visit"}`)} />}
    </main>}

    <nav style={S.bottomNav}>{TABS.map(t => <button key={t} onClick={() => changeMainTab(t)} style={tab === t ? S.navActive : S.navBtn}><IconTileCard src={TAB_IMAGE_ICONS[t]} label={t} zoom={1} labelStyle={S.navTileLabel} /></button>)}</nav>

    {infoPet && <PetInfoModal pet={infoPet} owner={ownerMap[infoPet.owner_id]} vetClinic={vetClinics.find(v=>v.id===infoPet.vet_clinic_id)} onClose={() => setPetInfoId("")} />}
    {paymentVisit && <PaymentModal visit={paymentVisit} owner={ownerMap[paymentVisit.owner_id]} service={serviceMap[paymentVisit.service_id]} onClose={() => setPaymentVisitId("")} onSave={savePayment} />}
    {deleteRequest && <DeleteConfirmModal request={deleteRequest} setRequest={setDeleteRequest} onClose={() => setDeleteRequest(null)} onConfirm={() => deleteSoft(deleteRequest.table, deleteRequest.row, deleteRequest.type, deleteRequest.label)} />}
    {completingVisit && <CompleteModal visit={completingVisit} checklist={visitChecklist.filter(i => i.visit_id === completingVisit.id).sort((a,b)=>a.sort_order-b.sort_order)} service={serviceMap[completingVisit.service_id]} owner={ownerMap[completingVisit.owner_id]} pets={(visitPets.filter(vp=>vp.visit_id===completingVisit.id).map(vp=>petMap[vp.pet_id]).filter(Boolean))} onToggleChecklist={toggleChecklist} onClose={() => setCompleteVisitId("")} onSave={completeVisit} />}
    {saving && <div style={S.saving}>Saving...</div>}
  </div>;
}

function TodayPage({ visits, allVisits = [], activeVisits, overdueVisits, owners, pets, services, visitPets, onStart, onComplete, onPetInfo, onCancel, onMarkPaid, onMarkUnpaid, onDeleteVisit }) {
  const today = todayISO();
  const todayRevenue = visits.filter(v=>v.status === "Completed").reduce((s,v)=>s+visitChargeTotal(v),0);
  const todayRemaining = visits.filter(v=>v.status === "Scheduled").sort(visitSort);
  const nextVisit = allVisits.filter(v=>v.status === "Scheduled" && (v.visit_date || "") >= today).sort(visitSort)[0];
  const recentlyCompleted = allVisits.filter(v=>v.status === "Completed").sort((a,b)=>`${b.visit_date || ""} ${b.scheduled_start_time || ""}`.localeCompare(`${a.visit_date || ""} ${a.scheduled_start_time || ""}`)).slice(0,4);
  const cardProps = { owners, pets, services, visitPets, onStart, onComplete, onPetInfo, onCancel, onMarkPaid, onMarkUnpaid, onDeleteVisit };
  const renderVisit = (v) => <VisitCard key={v.id} visit={v} owner={owners[v.owner_id]} service={services[v.service_id]} pets={visitPetsFor(v, visitPets, pets)} onStart={onStart} onComplete={onComplete} onPetInfo={onPetInfo} onCancel={onCancel} onMarkPaid={onMarkPaid} onMarkUnpaid={onMarkUnpaid} onDeleteVisit={onDeleteVisit} />;
  return <section style={S.stack}>
    <div style={S.compactHeaderStats}>
      <span><b>{visits.length}</b> today</span>
      <span>·</span>
      <span><b>{activeVisits.length}</b> active</span>
      <span>·</span>
      <span><b>{money(todayRevenue)}</b> completed</span>
    </div>
    {activeVisits.length > 0 ? <Panel title="In Progress Now">{activeVisits.map(renderVisit)}</Panel> : nextVisit ? <Panel title="Next Visit">{renderVisit(nextVisit)}</Panel> : null}
    {todayRemaining.length > 0 && <Panel title="Today’s Remaining Visits">{todayRemaining.map(renderVisit)}</Panel>}
    {overdueVisits.length > 0 && <Panel title="Overdue / Needs Attention">{overdueVisits.map(renderVisit)}</Panel>}
    <Panel title="Recently Completed">{recentlyCompleted.length ? recentlyCompleted.map(renderVisit) : <Empty text="No recently completed visits yet." />}</Panel>
  </section>;
}
function SchedulePage({ scheduleSeed, owners, pets, services, options, visits, visitPets, ownerMap, petMap, serviceMap, onAdd, onUpdate, onRepeatLast, onRepeatVisit, onStart, onComplete, onPetInfo, onMarkPaid, onMarkUnpaid, onDeleteVisit }) {
  const [form, setForm] = useState(blankVisit);
  const [petIds, setPetIds] = useState([]);
  const [editingVisitId, setEditingVisitId] = useState("");
  const [showAdvancedVisitDetails, setShowAdvancedVisitDetails] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [scheduleFilter, setScheduleFilter] = useState("Calendar");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [monthKey, setMonthKey] = useState(monthKeyFromIso(todayISO()));
  const [highlightVisitId, setHighlightVisitId] = useState("");
  const ownerPets = pets.filter(p => p.owner_id === form.owner_id && p.is_active).sort(byName);
  const petOptions = options.filter(o => petIds.includes(o.pet_id) && o.is_active);
  const upcomingOnlyVisits = visits.filter(v => v.status === "Scheduled").sort(visitSort);
  const activeOnlyVisits = visits.filter(v => v.status === "In Progress").sort(visitSort);
  const calendarDateVisits = visits.filter(v => v.visit_date === selectedDate).sort(visitSort);
  const visibleVisits = scheduleFilter === "Active" ? activeOnlyVisits : scheduleFilter === "Completed" ? [] : scheduleFilter === "Calendar" ? calendarDateVisits : upcomingOnlyVisits;
  const completedVisits = visits.filter(v=>v.status==="Completed").sort((a,b)=>`${b.visit_date || ""} ${b.scheduled_start_time || ""}`.localeCompare(`${a.visit_date || ""} ${a.scheduled_start_time || ""}`));
  const ownerRecentVisits = visits.filter(v => v.owner_id === form.owner_id).sort((a,b)=>`${b.visit_date || ""} ${b.scheduled_start_time || ""}`.localeCompare(`${a.visit_date || ""} ${a.scheduled_start_time || ""}`)).slice(0, 4);
  function scrollToScheduleForm() { requestAnimationFrame(() => document.getElementById("schedule-form-panel")?.scrollIntoView({ behavior:"smooth", block:"start" })); }
  function scrollToVisits() { requestAnimationFrame(() => document.getElementById("schedule-visits-panel")?.scrollIntoView({ behavior:"smooth", block:"start" })); }
  function visitMileageFor(nextPetIds, ownerId = form.owner_id) {
    return defaultMileageForPetIds(nextPetIds, pets, ownerMap[ownerId]);
  }
  function pickOwner(id) {
    const activePets = pets.filter(p => p.owner_id === id && p.is_active).sort(byName);
    const autoPetIds = activePets.length === 1 ? [activePets[0].id] : [];
    setPetIds(autoPetIds);
    setForm(f => ({...f, owner_id:id, primary_pet_id:autoPetIds[0] || "", saved_option_id:"", visit_date: f.visit_date || selectedDate || todayISO(), mileage:defaultMileageForPetIds(autoPetIds, pets, ownerMap[id])}));
  }
  useEffect(() => {
    if (!scheduleSeed?.ownerId) return;
    const nextDate = scheduleSeed.visitDate || selectedDate || todayISO();
    setSelectedDate(nextDate);
    setMonthKey(monthKeyFromIso(nextDate));
    setForm(f => ({ ...f, visit_date: nextDate }));
    pickOwner(scheduleSeed.ownerId);
    setEditingVisitId("");
    setScheduleFilter("Calendar");
    setShowAdvancedVisitDetails(false);
    setShowScheduleForm(true);
    scrollToScheduleForm();
  }, [scheduleSeed?.stamp]);
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
  function pickCalendarDate(iso) {
    setSelectedDate(iso);
    setMonthKey(monthKeyFromIso(iso));
    setForm(f => ({ ...f, visit_date: iso || todayISO() }));
    setScheduleFilter("Calendar");
  }
  function loadVisitForEdit(v) {
    const linkedPets = visitPets.filter(vp => vp.visit_id === v.id).map(vp => vp.pet_id);
    const nextPetIds = linkedPets.length ? linkedPets : (v.primary_pet_id ? [v.primary_pet_id] : []);
    setEditingVisitId(v.id);
    setForm({ ...blankVisit, ...v, scheduled_start_time: v.scheduled_start_time || "09:00" });
    setPetIds(nextPetIds);
    setSelectedDate(v.visit_date || todayISO());
    setMonthKey(monthKeyFromIso(v.visit_date || todayISO()));
    setScheduleFilter("Calendar");
    setShowAdvancedVisitDetails(true);
    setShowScheduleForm(true);
    scrollToScheduleForm();
  }
  async function saveVisit() {
    if (editingVisitId) {
      const saved = await onUpdate(editingVisitId, form, petIds);
      setHighlightVisitId(editingVisitId);
      setEditingVisitId("");
      setForm(blankVisit);
      setPetIds([]);
      setShowScheduleForm(false);
      if (saved?.visit_date) pickCalendarDate(saved.visit_date);
      setScheduleFilter("Calendar");
      scrollToVisits();
    } else {
      const saved = await onAdd(form, petIds);
      if (saved?.id) setHighlightVisitId(saved.id);
      const savedDate = saved?.visit_date || form.visit_date || selectedDate || todayISO();
      setShowScheduleForm(false);
      pickCalendarDate(savedDate);
      setScheduleFilter("Calendar");
      scrollToVisits();
    }
  }
  return <section style={S.stack}>
    <Panel title="Schedule">
      <ScheduleCalendar monthKey={monthKey} selectedDate={selectedDate} visits={visits} serviceMap={serviceMap} onSelectDate={pickCalendarDate} onPrev={()=>setMonthKey(shiftMonthKey(monthKey,-1))} onNext={()=>setMonthKey(shiftMonthKey(monthKey,1))} onToday={()=>pickCalendarDate(todayISO())} />
      <div style={S.row}>
        <button style={S.primaryBtn} onClick={()=>{ setShowScheduleForm(true); setEditingVisitId(""); setForm(f=>({...f, visit_date:selectedDate || todayISO()})); requestAnimationFrame(scrollToScheduleForm); }}>+ Schedule Visit</button>
        {editingVisitId && <button style={S.secondaryBtn} onClick={()=>setShowScheduleForm(true)}>Continue Editing</button>}
      </div>
    </Panel>

    {showScheduleForm && <div id="schedule-form-panel"><Panel title={editingVisitId ? "Reschedule Visit" : "Add Scheduled Visit"}>
      <div style={S.formGrid}>
        <Field label="Owner"><select value={form.owner_id} onChange={e=>pickOwner(e.target.value)}><option value="">Select owner</option>{owners.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
        <Field label="Service"><select value={form.service_id || ""} onChange={e=>applyService(e.target.value)}><option value="">Select service</option>{services.filter(s=>s.is_active).map(s=><option key={s.id} value={s.id}>{s.name} — {money(s.base_price)}</option>)}</select></Field>
        <Field label="Date"><input type="date" value={form.visit_date || selectedDate} onClick={e=>e.currentTarget.showPicker?.()} onFocus={e=>e.currentTarget.showPicker?.()} onChange={e=>pickCalendarDate(e.target.value)} /></Field>
        <Field label="Start time"><select value={form.scheduled_start_time || ""} onChange={e=>setForm({...form, scheduled_start_time:e.target.value})}>{TIME_OPTIONS.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
      </div>
      {form.owner_id && <div style={S.selectedPetNotice}>Booking for: {petIds.length ? petIds.map(id=>petMap[id]?.name).filter(Boolean).join(", ") : "Select at least one pet"}</div>}
      <div style={S.petPickWrap}>{ownerPets.map(p=>{ const active = petIds.includes(p.id); return <button key={p.id} type="button" style={petButtonStyle(p, active)} onClick={()=>togglePet(p.id)}><span>{petFace(p)}</span><span>{p.name}</span>{active && <b>✓</b>}</button>; })}</div>
      <details style={S.collapse} open={showAdvancedVisitDetails} onToggle={e=>setShowAdvancedVisitDetails(e.currentTarget.open)}>
        <summary style={S.collapseSummary}>More visit details</summary>
        <div style={S.formGridPadded}>
          <Field label="Duration minutes"><input type="number" value={form.duration_minutes} onChange={e=>setForm({...form, duration_minutes:e.target.value})} /></Field>
          <Field label="Base price"><input type="number" value={form.base_price} onChange={e=>setForm({...form, base_price:e.target.value})} /></Field>
          <Field label="Mileage"><input type="number" value={form.mileage ?? 0} onChange={e=>setForm({...form, mileage:e.target.value})} /></Field>
          <Field label="Travel / mileage fee"><input type="number" value={form.travel_fee ?? 0} onChange={e=>setForm({...form, travel_fee:e.target.value})} /></Field>
          <Field label="Add-on fees"><input type="number" value={form.add_on_fees} onChange={e=>setForm({...form, add_on_fees:e.target.value})} /></Field>
          <Field label="Visit notes"><textarea value={form.internal_notes || ""} onChange={e=>setForm({...form, internal_notes:e.target.value})} /></Field>
        </div>
      </details>
      <div style={S.row}>
        <button style={S.primaryBtn} onClick={saveVisit} disabled={!form.owner_id || !form.service_id || petIds.length === 0}>{editingVisitId ? "Save Rescheduled Visit" : "Schedule Visit"}</button>
        <button style={S.secondaryBtn} onClick={()=>{ setShowScheduleForm(false); setEditingVisitId(""); setForm(blankVisit); setPetIds([]); }}>Cancel</button>
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
    </Panel></div>}

    <div id="schedule-visits-panel"><Panel title={scheduleFilter === "Calendar" ? `Selected Day — ${niceDate(selectedDate)}` : "Visits"}>
      <div style={S.filterPills}>{SCHEDULE_FILTERS.map(f => <button key={f} style={scheduleFilter===f ? S.filterPillActive : S.filterPill} onClick={()=>{setScheduleFilter(f); scrollToVisits();}}>{f}</button>)}</div>
      {scheduleFilter !== "Completed" && (visibleVisits.length ? visibleVisits.map(v => <VisitCard key={v.id} visit={v} owner={ownerMap[v.owner_id]} service={serviceMap[v.service_id]} pets={visitPetsFor(v, visitPets, petMap)} onStart={onStart} onComplete={onComplete} onPetInfo={onPetInfo} onMarkPaid={onMarkPaid} onMarkUnpaid={onMarkUnpaid} onDeleteVisit={onDeleteVisit} onReschedule={loadVisitForEdit} highlight={highlightVisitId===v.id} />) : <Empty text={scheduleFilter === "Active" ? "No visits in progress." : scheduleFilter === "Calendar" ? `No visits on ${niceDate(selectedDate)}.` : "No upcoming visits yet."} />)}
      {scheduleFilter === "Completed" && <div style={S.stack}>{completedVisits.length ? completedVisits.slice(0, showAllCompleted ? 25 : 6).map(v => <VisitCard key={v.id} visit={v} owner={ownerMap[v.owner_id]} service={serviceMap[v.service_id]} pets={visitPetsFor(v, visitPets, petMap)} onStart={onStart} onComplete={onComplete} onPetInfo={onPetInfo} onMarkPaid={onMarkPaid} onMarkUnpaid={onMarkUnpaid} onDeleteVisit={onDeleteVisit} highlight={highlightVisitId===v.id} />) : <Empty text="No completed visits yet." />}{completedVisits.length > 6 && <button style={S.secondaryBtn} onClick={()=>setShowAllCompleted(!showAllCompleted)}>{showAllCompleted ? "Show fewer completed visits" : "View all completed visits"}</button>}</div>}
    </Panel></div>

  </section>;
}

function ScheduleCalendar({ monthKey, selectedDate, visits, serviceMap, onSelectDate, onPrev, onNext, onToday }) {
  const [y,m] = String(monthKey || monthKeyFromIso(todayISO())).split("-").map(Number);
  const first = new Date(y || new Date().getFullYear(), (m || 1) - 1, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return isoFromDate(d);
  });
  const visitsByDate = visits.reduce((acc,v)=>{ (acc[v.visit_date] ||= []).push(v); return acc; }, {});
  return <div style={S.calendarWrap}>
    <div style={S.calendarHead}><button style={S.secondaryMini} onClick={onPrev}>‹</button><b>{monthLabel(monthKey)}</b><button style={S.secondaryMini} onClick={onNext}>›</button><button style={S.secondaryMini} onClick={onToday}>Today</button></div>
    <div style={S.calendarWeek}>{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><b key={d}>{d}</b>)}</div>
    <div style={S.calendarGrid}>{days.map(iso=>{
      const dayVisits = (visitsByDate[iso] || []).sort(visitSort);
      const isCurrent = iso.slice(0,7) === monthKey;
      const isSelected = iso === selectedDate;
      return <button key={iso} style={isSelected ? S.calendarDaySelected : isCurrent ? S.calendarDay : S.calendarDayMuted} onClick={()=>onSelectDate(iso)}>
        <span style={S.calendarDayNum}>{Number(iso.slice(8,10))}</span>
        <div style={S.calendarDots}>{dayVisits.slice(0,3).map(v=><span key={v.id} title={serviceMap[v.service_id]?.name || "Visit"} style={{...S.calendarDot, background:serviceColor(serviceMap[v.service_id])}} />)}{dayVisits.length>3 && <small style={S.calendarMore}>+{dayVisits.length-3}</small>}</div>
      </button>;
    })}</div>
    <div style={S.selectedDateBar}><b>{niceDate(selectedDate)}</b><span>{(visitsByDate[selectedDate] || []).length} visit(s)</span></div>
  </div>;
}

function OwnersPage({ owners, pets, services, options, petChecklist, visits, visitPets, selectedOwnerId, selectedPetId, setSelectedOwnerId, setSelectedPetId, ownerMap, petMap, serviceMap, onSaveOwner, onSavePet, onSaveOption, onAddPetChecklist, onDeleteOwner, onDeletePet, onDeleteOption, vetClinics, onSaveVetClinic, onPetInfo, onMarkPaid, onMarkUnpaid, onMarkManyPaid, onDeleteVisit, ownerDocuments = [], onUploadDocument, onDeleteDocument, settings, onScheduleVisit }) {
  const OWNER_TABS = ["Owner Info", "Pets", "Documents", "Schedule Visit", "Visits", "Billing"];
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

      {selectedOwnerId && <Panel title="">
        <OwnerHero owner={selectedOwner} onEdit={()=>{setOwnerTab("Owner Info"); setOwnerEditMode(true);}} />
        <div style={S.ownerSubGrid}>{OWNER_TABS.map(t=>{ const label = t === "Owner Info" ? "Details" : t === "Documents" ? "Docs" : t; const isScheduleVisit = t === "Schedule Visit"; return <button key={t} style={ownerTab===t&&!isScheduleVisit?S.subTabActive:S.subTab} onClick={()=>{ if (isScheduleVisit) { onScheduleVisit?.(selectedOwnerId); return; } setOwnerTab(t); setOwnerEditMode(false); setPetEditMode(false); setOptionEditMode(false);}}><IconTileCard src={OWNER_TAB_IMAGE_ICONS[t]} label={label} zoom={1} /></button>; })}</div>

        {ownerTab === "Owner Info" && <div style={S.stack}>
          {!ownerEditMode ? <OwnerSummary owner={selectedOwner} /> : <OwnerForm value={ownerForm} onChange={setOwnerForm} />}
          <div style={S.splitRow}>{!ownerEditMode ? <button style={S.secondaryBtn} onClick={()=>setOwnerEditMode(true)}>Edit Owner Info</button> : <button style={S.primaryBtn} onClick={()=>{onSaveOwner(ownerForm); setOwnerEditMode(false);}}>Save Owner</button>}<div>{selectedOwner?.id && <button style={S.dangerMini} onClick={()=>onDeleteOwner(selectedOwner)}>Delete Owner</button>}</div></div>
        </div>}

        {ownerTab === "Pets" && <div style={S.stack}>
          <div style={S.row}><button style={S.primaryBtn} onClick={newPet}>Add Pet</button><span style={S.muted}>Each pet has its own profile, care notes, emergency info, checklist, and history.</span></div>
          <div style={S.petCards}>{ownerPets.map(p=><PetMini key={p.id} pet={p} active={selectedPetId===p.id} onClick={()=>{setSelectedPetId(p.id); setPetEditMode(false);}} onInfo={()=>onPetInfo(p.id)} />)}</div>
          {(selectedPet || petEditMode) && <div style={S.detailBox}>
            <div style={S.petSubGrid}>{PET_TABS.map(t=><button key={t} style={petTab===t?S.subTabActive:S.subTab} onClick={()=>{setPetTab(t); setPetEditMode(false);}}><span style={S.subTabIcon}><Icon name={PET_TAB_ICONS[t]} size={30}/></span><span>{t}</span></button>)}</div>
            {!petEditMode ? <PetReadOnly pet={selectedPet} petTab={petTab} visits={petVisits} serviceMap={serviceMap} visitPets={visitPets} petMap={petMap} petChecklist={petChecklist} vetClinics={vetClinics} /> : <PetForm value={petForm} onChange={setPetForm} vetClinics={vetClinics} onSaveVetClinic={onSaveVetClinic} />}
            <div style={S.row}>{!petEditMode ? <button style={S.secondaryBtn} onClick={()=>setPetEditMode(true)}>Edit Pet</button> : <button style={S.primaryBtn} onClick={()=>{onSavePet({...petForm, owner_id:selectedOwnerId}); setPetEditMode(false);}}>Save Pet</button>}{selectedPet?.id && <><button style={S.secondaryBtn} onClick={()=>onPetInfo(selectedPet.id)}>Emergency Info</button></>}</div>
            {selectedPet?.id && <div style={S.dangerZone}><b>Danger zone</b><small>Deleting a pet requires typing the exact pet name.</small><button style={S.dangerMini} onClick={()=>onDeletePet(selectedPet)}>Delete Pet</button></div>}
          </div>}
        </div>}

        {ownerTab === "Documents" && <OwnerDocumentsPanel owner={selectedOwner} pets={ownerPets} ownerDocuments={ownerDocuments.filter(d=>d.owner_id===selectedOwnerId)} onUploadDocument={onUploadDocument} onDeleteDocument={onDeleteDocument} settings={settings} />}

        {ownerTab === "Saved Services" && <div style={S.stack}>
          <div style={S.row}><button style={S.primaryBtn} onClick={()=>newOption()}>Add Saved Service Option</button><span style={S.muted}>Saved options are quick templates. They do not auto-schedule visits.</span></div>
          {optionEditMode && <div style={S.detailBox}><OptionForm value={optionForm} onChange={setOptionForm} services={services} pets={ownerPets} /><button style={S.primaryBtn} onClick={()=>{onSaveOption({...optionForm, owner_id:selectedOwnerId}); setOptionEditMode(false);}}>Save Service Option</button></div>}
          <div style={S.cards}>{options.filter(o=>o.owner_id===selectedOwnerId).map(o=><div key={o.id} style={S.smallCard}><b>{o.option_name}</b><span>{petMap[o.pet_id]?.name || "Owner option"}</span><span>{serviceMap[o.service_id]?.name || "Custom service"}</span><span>{money(o.default_price)} / {o.default_duration_minutes} min</span><div style={S.row}><button style={S.secondaryMini} onClick={()=>{setOptionForm(o); setOptionEditMode(true);}}>Edit</button><button style={S.dangerMini} onClick={()=>onDeleteOption(o)}>Delete</button></div></div>)}</div>
        </div>}

        {ownerTab === "Visits" && <div style={S.stack}>
          <div style={S.grid3}><Metric title="Upcoming" value={ownerVisits.filter(v=>["Scheduled","In Progress"].includes(v.status)).length} sub="scheduled/active" /><Metric title="Completed" value={ownerVisits.filter(v=>v.status==="Completed").length} sub="visit history" /><Metric title="Unpaid" value={money(ownerVisits.filter(v=>v.status==="Completed"&&!v.is_paid).reduce((s,v)=>s+visitChargeTotal(v),0))} sub="completed visits" /></div>
          {ownerVisits.length ? ownerVisits.map(v=><VisitHistoryRow key={v.id} visit={v} service={serviceMap[v.service_id]} pets={visitPetsFor(v, visitPets, petMap)} onDeleteVisit={onDeleteVisit} />) : <Empty text="No visits yet for this owner." />}
        </div>}

        {ownerTab === "Billing" && <div style={S.stack}>
          <OwnerBillingSummary owner={selectedOwner} visits={ownerVisits} visitPets={visitPets} petMap={petMap} serviceMap={serviceMap} settings={settings} onMarkPaid={onMarkPaid} onMarkUnpaid={onMarkUnpaid} onMarkManyPaid={onMarkManyPaid} />
        </div>}
      </Panel>}
    </div>
  </section>;
}

function OfficePage(props) {
  const { officeTab, setOfficeTab } = props;
  return <section style={S.stack}>
    <div style={S.officeNav}>{OFFICE_TABS.map(t=><button key={t} style={officeTab===t?S.officeActive:S.officeBtn} onClick={()=>{setOfficeTab(t); window.scrollTo({top:0,behavior:"smooth"});}}><IconTileCard src={OFFICE_TAB_IMAGE_ICONS[t]} label={t} zoom={1} labelStyle={S.officeTileLabel} /></button>)}</div>
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
  lines.push(`Mileage charged: ${money(preview.totals.mileageRevenue || 0)}`);
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
  preview.rows.forEach(v => lines.push(`${niceDate(v.visit_date)} ${v.scheduled_start_time || ""} | ${preview.ownerMap[v.owner_id]?.name || "Unknown"} | ${preview.serviceMap[v.service_id]?.name || "Service"} | ${visitPetsForNames(v, preview.visitPets, preview.petMap)} | ${visitMoneyDetails(v)} | ${v.is_paid ? "Paid" : "Unpaid"}`));
  return lines.join("\n");
}
function PrintPreviewOverlay({ title, onClose, children }) {
  const paperRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const filename = `${safeFileName(title || "pet-care-report")}.pdf`;
  async function handleDownload() {
    try { setBusy(true); downloadBlob(await makePdfBlobFromElement(paperRef.current, filename), filename); }
    catch (err) { console.error(err); window.alert("PDF could not be created. Try again after closing other apps/tabs."); }
    finally { setBusy(false); }
  }
  async function handleShare() {
    try { setBusy(true); await sharePdfBlob(await makePdfBlobFromElement(paperRef.current, filename), filename, title); }
    catch (err) { console.error(err); window.alert("PDF could not be shared. It may have been downloaded instead."); }
    finally { setBusy(false); }
  }
  return <div className="print-preview-screen v30-print-root" style={S.printOverlay}>
    <style>{`${docStyles()} .v30-print-paper{background:#fff;width:816px;max-width:calc(100vw - 28px);margin:0 auto;padding:36px;border:1px solid #dbeafe;border-radius:18px;box-shadow:0 20px 60px rgba(15,98,254,.10)}`}</style>
    <div className="print-preview-toolbar" style={S.printToolbar}>
      <b>{title}</b>
      <div style={S.row}><button style={S.primaryBtn} disabled={busy} onClick={handleDownload}>Download PDF</button><button style={S.secondaryBtn} disabled={busy} onClick={handleShare}>Share PDF</button><button style={S.secondaryBtn} disabled={busy} onClick={onClose}>Close Preview</button></div>
    </div>
    <div ref={paperRef} className="v30-print-paper"><div className="v30-doc">{children}</div></div>
  </div>;
}
function PetReportDocument({ preview, settings }) {
  const serviceRevenue = preview.rows.reduce((s,v)=>s+visitBaseCharge(v),0);
  const taxRevenue = preview.rows.reduce((s,v)=>s+visitTaxCharge(v),0);
  return <div>
    <div className="doc-head">
      <div><h1>{businessName(settings)}</h1><div className="muted">{businessServiceLine(settings)}</div>{businessContactLines(settings).map(line => <div key={line.label} className="muted"><b>{line.label}:</b> {line.value}</div>)}</div>
      <div className="doc-title"><h2>Report</h2><div>{preview.scopeLabel}</div><div>{niceDate(preview.range.start.toISOString().slice(0,10))} to {niceDate(preview.range.end.toISOString().slice(0,10))}</div><div className="muted small">Generated {new Date().toLocaleDateString()}</div></div>
    </div>
    <h3>Summary</h3>
    <div className="summary-grid">
      <div className="summary-card">Completed<b>{preview.totals.completedCount}</b><span className="muted">visits</span></div>
      <div className="summary-card">Revenue<b>{money(preview.totals.revenue)}</b><span className="muted">completed</span></div>
      <div className="summary-card">Service<b>{money(serviceRevenue)}</b><span className="muted">before mileage/tax</span></div>
      <div className="summary-card">Mileage<b>{money(preview.totals.mileageRevenue || 0)}</b><span className="muted">charged</span></div>
      <div className="summary-card">GST/Tax<b>{money(taxRevenue)}</b><span className="muted">included</span></div>
      <div className="summary-card">Paid<b>{money(preview.totals.paid)}</b><span className="muted">received</span></div>
      <div className="summary-card">Unpaid<b>{money(preview.totals.unpaid)}</b><span className="muted">{preview.totals.unpaidCount} visits</span></div>
      <div className="summary-card">Cancelled/Missed<b>{preview.totals.cancelledMissed}</b><span className="muted">records</span></div>
    </div>
    <div className="section"><h3>Owner Rankings</h3><table><thead><tr><th>#</th><th>Owner</th><th className="num">Visits</th><th className="num">Total</th><th className="num">Paid</th><th className="num">Unpaid</th><th className="num">Avg</th></tr></thead><tbody>{preview.ownerRows.map((r,i)=><tr key={r.owner.id}><td>{i+1}</td><td><b>{r.owner.name}</b>{r.petRows.length ? <div className="muted small">{r.petRows.map(pr=>`${pr.pet.name}: ${pr.count}`).join(" · ")}</div> : null}</td><td className="num">{r.completedCount}</td><td className="num">{money(r.total)}</td><td className="num">{money(r.paid)}</td><td className="num">{money(r.unpaid)}</td><td className="num">{money(r.avgVisit)}</td></tr>)}</tbody></table></div>
    <div className="section"><h3>Service Totals</h3><table><thead><tr><th>Service</th><th className="num">Visits</th><th className="num">Total</th><th className="num">Unpaid</th></tr></thead><tbody>{preview.serviceRows.map(r=><tr key={r.name}><td><b>{r.name}</b></td><td className="num">{r.count}</td><td className="num">{money(r.total)}</td><td className="num">{money(r.unpaid || 0)}</td></tr>)}</tbody></table></div>
    <div className="section"><h3>Visit Details</h3><table><thead><tr><th>Date</th><th>Owner</th><th>Service / Pets</th><th className="num">Service</th><th className="num">Mileage</th><th className="num">Tax</th><th className="num">Total</th><th>Status</th></tr></thead><tbody>{preview.rows.map(v=>{ const b=visitChargeBreakdown(v); return <tr key={v.id}><td>{niceDate(v.visit_date)}<br/><span className="muted small">{timeLabel(v.scheduled_start_time)}</span></td><td>{preview.ownerMap[v.owner_id]?.name || "Unknown"}</td><td><b>{preview.serviceMap[v.service_id]?.name || "Service"}</b><br/><span className="muted small">{visitPetsForNames(v, preview.visitPets, preview.petMap)}</span></td><td className="num">{money(b.base)}</td><td className="num">{b.mileage ? money(b.mileage) : "—"}</td><td className="num">{b.tax ? money(b.tax) : "—"}</td><td className="num"><b>{money(b.total)}</b></td><td>{v.is_paid ? "Paid" : "Unpaid"}</td></tr>;})}</tbody></table></div>
    <div className="footer">{displayValue(settings?.invoice_footer_note) || displayValue(settings?.business_notes) || "Generated report values are based on completed visit records in the selected range."}{businessContactLines(settings).length ? <><br/>Contact: {businessContactLines(settings).filter(l => ["Phone", "Email"].includes(l.label)).map(l => l.value).join(" · ")}</> : null}</div>
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
    const total = group.rows.reduce((s, v) => s + visitChargeTotal(v), 0);
    lines.push(`${group.owner.name} — ${group.rows.length} visit(s) — ${money(total)}`);
    group.rows.forEach(v => {
      const petNames = visitPetsFor(v, visitPets, petMap).map(p => p.name).join(", ");
      lines.push(`  ${niceDate(v.visit_date)} ${v.scheduled_start_time || ""} — ${serviceMap[v.service_id]?.name || "Service"} — ${petNames} — ${money(visitChargeTotal(v))} — ${v.is_paid ? "Paid" : "Unpaid"}`);
    });
    lines.push("");
  });
  if (!grouped.length) lines.push("No matching visits.");
  return lines.join("\n");
}
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[c]));
}
function safeFileName(value = "pet-care-document") {
  return String(value || "pet-care-document")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "pet-care-document";
}
function hasText(value) {
  return String(value ?? "").trim().length > 0;
}
function displayValue(value) {
  return String(value ?? "").trim();
}
function businessName(settings) {
  return displayValue(settings?.business_name) || "Pet Care by Kiri";
}
function businessServiceLine(settings) {
  return displayValue(settings?.service_description) || "Pet care services";
}
function businessContactLines(settings = {}) {
  const lines = [];
  if (hasText(settings.business_phone)) lines.push({ label: "Phone", value: displayValue(settings.business_phone) });
  if (hasText(settings.business_email)) lines.push({ label: "Email", value: displayValue(settings.business_email) });
  if (hasText(settings.business_website)) lines.push({ label: "Web", value: displayValue(settings.business_website) });
  if (settings.show_business_address && hasText(settings.business_address)) lines.push({ label: "Address", value: displayValue(settings.business_address) });
  if (settings.show_tax_number_on_documents && hasText(settings.tax_number)) lines.push({ label: "Tax #", value: displayValue(settings.tax_number) });
  return lines;
}
function businessContactHtml(settings = {}) {
  const lines = businessContactLines(settings).map(line => `<div class="muted"><strong>${escapeHtml(line.label)}:</strong> ${escapeHtml(line.value)}</div>`).join("");
  return `<h1>${escapeHtml(businessName(settings))}</h1><div class="muted">${escapeHtml(businessServiceLine(settings))}</div>${lines}`;
}
function paymentInstructionLines(settings = {}) {
  const lines = [];
  if (hasText(settings.invoice_due_terms)) lines.push({ label: "Due terms", value: displayValue(settings.invoice_due_terms) });
  if (hasText(settings.payment_methods)) lines.push({ label: "Accepted payment", value: displayValue(settings.payment_methods) });
  if (settings.show_etransfer && hasText(settings.etransfer_email)) lines.push({ label: "E-transfer", value: displayValue(settings.etransfer_email) });
  if (hasText(settings.default_invoice_note)) lines.push({ label: "Note", value: displayValue(settings.default_invoice_note) });
  return lines;
}
function paymentInstructionsHtml(settings = {}, balanceDue = 0) {
  const lines = paymentInstructionLines(settings);
  if (!lines.length && !(num(balanceDue) > 0)) return "";
  return `<div class="payment-box"><strong>Payment information</strong>${num(balanceDue) > 0 ? `<div><strong>Balance due:</strong> ${escapeHtml(money(balanceDue))}</div>` : ""}${lines.map(line => `<div><strong>${escapeHtml(line.label)}:</strong> ${escapeHtml(line.value)}</div>`).join("")}</div>`;
}
function documentFooterHtml(settings = {}, fallback = "Please contact us with any questions about this invoice or statement.") {
  const parts = [];
  if (hasText(settings.invoice_footer_note)) parts.push(displayValue(settings.invoice_footer_note));
  else if (hasText(settings.business_notes)) parts.push(displayValue(settings.business_notes));
  else parts.push(fallback);
  const contactBits = [];
  if (hasText(settings.business_phone)) contactBits.push(displayValue(settings.business_phone));
  if (hasText(settings.business_email)) contactBits.push(displayValue(settings.business_email));
  if (contactBits.length) parts.push(`Contact: ${contactBits.join(" · ")}`);
  return `<div class="footer">${parts.map(escapeHtml).join("<br/>")}</div>`;
}
function docStyles() {
  return `
    .v30-doc { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color: #111827; line-height: 1.28; font-size: 11px; }
    .v30-doc h1 { font-size: 28px; line-height: 1.05; margin: 0; letter-spacing: .01em; }
    .v30-doc h2 { font-size: 18px; margin: 0; letter-spacing: .08em; text-transform: uppercase; }
    .v30-doc h3 { font-size: 13px; margin: 15px 0 7px; letter-spacing: .02em; }
    .v30-doc .doc-head { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #111827; padding-bottom: 14px; margin-bottom: 14px; }
    .v30-doc .doc-title { text-align: right; min-width: 190px; }
    .v30-doc .muted { color: #6b7280; }
    .v30-doc .small { font-size: 10px; }
    .v30-doc .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0; }
    .v30-doc .summary-card { border: 1px solid #dbeafe; border-radius: 10px; padding: 9px 10px; background: #f8fbff; min-height: 52px; }
    .v30-doc .summary-card b { display: block; font-size: 15px; margin-top: 2px; }
    .v30-doc .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0; }
    .v30-doc .box { border: 1px solid #d1d5db; border-radius: 10px; padding: 10px 11px; min-height: 76px; }
    .v30-doc .payment-box { border: 1px solid #bfdbfe; border-radius: 10px; padding: 10px 11px; background: #f8fbff; margin: 12px 0; }
    .v30-doc .payment-box div { margin-top: 3px; }
    .v30-doc table { width: 100%; border-collapse: collapse; margin-top: 8px; page-break-inside: auto; }
    .v30-doc th { text-align: left; border-bottom: 2px solid #111827; padding: 6px 5px; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
    .v30-doc td { border-bottom: 1px solid #e5e7eb; padding: 6px 5px; vertical-align: top; }
    .v30-doc tr { break-inside: avoid; page-break-inside: avoid; }
    .v30-doc .num { text-align: right; white-space: nowrap; }
    .v30-doc .center { text-align: center; }
    .v30-doc .total-row td { border-bottom: 0; font-size: 13px; font-weight: 850; padding-top: 10px; }
    .v30-doc .totals { margin-left: auto; width: 280px; margin-top: 12px; }
    .v30-doc .totals td { border-bottom: 0; padding: 3px 5px; }
    .v30-doc .totals .grand td { border-top: 2px solid #111827; padding-top: 7px; font-size: 14px; font-weight: 900; }
    .v30-doc .section { margin-top: 12px; }
    .v30-doc .footer { margin-top: 20px; border-top: 1px solid #d1d5db; padding-top: 10px; color: #6b7280; font-size: 10px; }
    .v30-doc .form-table td:first-child { width: 34%; background: #f3f4f6; font-weight: 700; }
    .v30-doc .line-box { border: 1px solid #d1d5db; min-height: 42px; padding: 8px; margin: 5px 0 10px; }
    .v30-doc .signature-grid { display: grid; grid-template-columns: 1.5fr .8fr 1.5fr .8fr; gap: 0; margin-top: 16px; border: 1px solid #111827; }
    .v30-doc .signature-grid div { border-right: 1px solid #111827; min-height: 38px; padding: 4px; }
    .v30-doc .signature-grid div:last-child { border-right: 0; }
    @media (max-width: 720px) { .v30-doc .summary-grid { grid-template-columns: repeat(2, 1fr); } .v30-doc .two-col { grid-template-columns: 1fr; } }
  `;
}
async function makePdfBlobFromElement(element, filename = "pet-care-document.pdf") {
  const canvas = await html2canvas(element, {
    scale: Math.min(2.4, Math.max(1.8, window.devicePixelRatio || 2)),
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    windowWidth: element.scrollWidth,
  });
  const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "letter", compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 36;
  const contentW = pageW - margin * 2;
  const contentH = pageH - margin * 2;
  const slicePxH = Math.floor(canvas.width * (contentH / contentW));
  let y = 0;
  let page = 0;
  while (y < canvas.height) {
    const h = Math.min(slicePxH, canvas.height - y);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = h;
    const ctx = pageCanvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    const imgData = pageCanvas.toDataURL("image/jpeg", 0.96);
    if (page > 0) pdf.addPage();
    const renderedH = h * (contentW / canvas.width);
    pdf.addImage(imgData, "JPEG", margin, margin, contentW, renderedH, undefined, "FAST");
    y += h;
    page += 1;
  }
  return pdf.output("blob");
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 800);
}
async function sharePdfBlob(blob, filename, title) {
  const file = new File([blob], filename, { type: "application/pdf" });
  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    await navigator.share({ files: [file], title: title || filename, text: title || filename });
    return true;
  }
  downloadBlob(blob, filename);
  window.alert("PDF sharing is not available in this browser, so the PDF was downloaded instead.");
  return false;
}
function printHtmlDocument(title, bodyHtml, options = {}) {
  const safeTitle = escapeHtml(title || "Pet Care Document");
  const filename = options.filename || `${safeFileName(title || "pet-care-document")}.pdf`;
  const root = document.createElement("div");
  root.className = "v30-print-root";
  root.innerHTML = `
    <style id="v30-print-style">
      .v30-print-root { position: fixed; inset: 0; z-index: 99999; background: rgba(255,255,255,.985); overflow: auto; padding: 14px; }
      .v30-print-toolbar { position: sticky; top: 0; display: flex; justify-content: space-between; gap: 10px; align-items: center; background: white; border: 1px solid #dbeafe; border-radius: 16px; padding: 10px 12px; margin: 0 auto 12px; max-width: 850px; box-shadow: 0 12px 30px rgba(15,98,254,.12); font-family: system-ui, Segoe UI, sans-serif; }
      .v30-print-toolbar button { border: 1px solid #bfdbfe; background: #fff; color:#08153a; border-radius: 999px; padding: 10px 13px; font-weight: 850; }
      .v30-print-toolbar .primary { background: linear-gradient(135deg,#0f62fe,#23d3c6); border-color: transparent; color: #fff; }
      .v30-print-paper { background: white; width: 816px; max-width: calc(100vw - 28px); margin: 0 auto; padding: 36px; border: 1px solid #dbeafe; border-radius: 18px; box-shadow: 0 20px 60px rgba(15,98,254,.10); }
      ${docStyles()}
    </style>
    <div class="v30-print-toolbar"><strong>${safeTitle}</strong><div><button class="primary" data-pdf>Download PDF</button><button data-share>Share PDF</button><button data-close>Close</button></div></div>
    <div class="v30-print-paper"><div class="v30-doc">${bodyHtml || ""}</div></div>
  `;
  document.body.appendChild(root);
  const paper = root.querySelector(".v30-print-paper");
  const setBusy = (busy) => root.querySelectorAll("button").forEach(b => b.disabled = !!busy);
  root.querySelector("[data-close]")?.addEventListener("click", () => root.remove());
  root.querySelector("[data-pdf]")?.addEventListener("click", async () => {
    try { setBusy(true); downloadBlob(await makePdfBlobFromElement(paper, filename), filename); }
    catch (err) { console.error(err); window.alert("PDF could not be created. Try again after closing other apps/tabs."); }
    finally { setBusy(false); }
  });
  root.querySelector("[data-share]")?.addEventListener("click", async () => {
    try { setBusy(true); await sharePdfBlob(await makePdfBlobFromElement(paper, filename), filename, title); }
    catch (err) { console.error(err); window.alert("PDF could not be shared. It may have been downloaded instead."); }
    finally { setBusy(false); }
  });
}
function printTextDocument(title, text) {
  printHtmlDocument(title, `<h2>${escapeHtml(title || "Pet Care Document")}</h2><pre style="white-space:pre-wrap;font:inherit;margin-top:16px">${escapeHtml(text || "")}</pre>`);
}
function emailTextDocument(subject, text, to = "") {
  const bodyHtml = `<h2>${escapeHtml(subject || "Pet Care Document")}</h2><pre style="white-space:pre-wrap;font:inherit;margin-top:16px">${escapeHtml(text || "")}</pre>`;
  printHtmlDocument(subject || "Pet Care Document", bodyHtml, { filename: `${safeFileName(subject || "pet-care-document")}.pdf` });
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
  const breakdown = visitChargeBreakdown(visit);
  lines.push(`Service/add-ons: ${money(breakdown.base)}`);
  if (breakdown.mileage) lines.push(`Mileage charge: ${money(breakdown.mileage)}${num(visit.mileage) ? ` (${num(visit.mileage)} km)` : ""}`);
  if (breakdown.tax) lines.push(`GST: ${money(breakdown.tax)}`);
  lines.push(`Amount: ${money(breakdown.total)}`);
  lines.push(`Status: ${visit.is_paid ? "Paid" : "Unpaid"}`);
  if (visit.payment_method) lines.push(`Payment method: ${visit.payment_method}`);
  if (visit.completion_notes) lines.push(`Notes: ${visit.completion_notes}`);
  lines.push("");
  lines.push(`Total due: ${visit.is_paid ? money(0) : money(visitChargeTotal(visit))}`);
  return lines.join("\n");
}
function visitBillingRowsHtml(rows, visitPets, petMap, serviceMap) {
  return rows.map(v => {
    const pets = visitPetsFor(v, visitPets, petMap).map(p => p.name).join(", ");
    const service = serviceMap[v.service_id]?.name || "Service";
    const b = visitChargeBreakdown(v);
    return `<tr>
      <td>${escapeHtml(niceDate(v.visit_date))}<br/><span class="muted small">${escapeHtml(timeLabel(v.scheduled_start_time))}</span></td>
      <td><strong>${escapeHtml(service)}</strong>${pets ? `<br/><span class="muted small">${escapeHtml(pets)}</span>` : ""}${v.completion_notes ? `<br/><span class="muted small">${escapeHtml(v.completion_notes)}</span>` : ""}</td>
      <td class="num">${escapeHtml(String(v.duration_minutes || 0))} min</td>
      <td>${escapeHtml(v.is_paid ? "Paid" : "Unpaid")}</td>
      <td class="num">${escapeHtml(money(b.base))}</td>
      <td class="num">${b.mileage ? `${escapeHtml(money(b.mileage))}${num(v.mileage) ? `<br/><span class="muted small">${escapeHtml(String(num(v.mileage)))} km</span>` : ""}` : "—"}</td>
      <td class="num">${b.tax ? escapeHtml(money(b.tax)) : "—"}</td>
      <td class="num"><strong>${escapeHtml(money(b.total))}</strong></td>
    </tr>`;
  }).join("");
}
function billingDocumentHtml({ title, owner, rows, visitPets, petMap, serviceMap, settings }) {
  const list = Array.isArray(rows) ? rows : [];
  const serviceSubtotal = list.reduce((s, v) => s + visitBaseCharge(v), 0);
  const mileageSubtotal = list.reduce((s, v) => s + visitMileageCharge(v), 0);
  const taxSubtotal = list.reduce((s, v) => s + visitTaxCharge(v), 0);
  const subtotal = list.reduce((s, v) => s + visitChargeTotal(v), 0);
  const unpaid = list.filter(v => !v.is_paid).reduce((s, v) => s + visitChargeTotal(v), 0);
  const paid = subtotal - unpaid;
  const docDate = new Date().toLocaleDateString();
  const docType = title?.toLowerCase().includes("statement") ? "Statement" : "Invoice";
  return `<div>
    <div class="doc-head">
      <div>${businessContactHtml(settings)}</div>
      <div class="doc-title"><h2>${escapeHtml(docType)}</h2><div><strong>${escapeHtml(title || "Invoice")}</strong></div><div>Date: ${escapeHtml(docDate)}</div></div>
    </div>
    <div class="two-col">
      <div class="box"><strong>Bill to</strong><br/>${escapeHtml(owner?.name || "Owner")}<br/>${owner?.address ? escapeHtml(owner.address) + "<br/>" : ""}${owner?.phone ? escapeHtml(owner.phone) + "<br/>" : ""}${owner?.invoice_email || owner?.email ? escapeHtml(owner.invoice_email || owner.email) : ""}</div>
      <div class="box"><strong>Summary</strong><br/>Visits: ${list.length}<br/>Service: ${escapeHtml(money(serviceSubtotal))}<br/>Mileage: ${escapeHtml(money(mileageSubtotal))}<br/>Tax/GST: ${escapeHtml(money(taxSubtotal))}<br/>Paid: ${escapeHtml(money(paid))}<br/><strong>Balance due: ${escapeHtml(money(unpaid))}</strong></div>
    </div>
    <h3>Services</h3>
    <table><thead><tr><th>Date</th><th>Service / Pets</th><th class="num">Duration</th><th>Status</th><th class="num">Service</th><th class="num">Mileage</th><th class="num">Tax</th><th class="num">Total</th></tr></thead><tbody>${visitBillingRowsHtml(list, visitPets, petMap, serviceMap)}</tbody></table>
    <table class="totals"><tbody>
      <tr><td>Service subtotal</td><td class="num">${escapeHtml(money(serviceSubtotal))}</td></tr>
      <tr><td>Mileage</td><td class="num">${escapeHtml(money(mileageSubtotal))}</td></tr>
      <tr><td>GST / tax</td><td class="num">${escapeHtml(money(taxSubtotal))}</td></tr>
      <tr><td>Paid</td><td class="num">${escapeHtml(money(paid))}</td></tr>
      <tr class="grand"><td>Balance due</td><td class="num">${escapeHtml(money(unpaid))}</td></tr>
    </tbody></table>
    ${paymentInstructionsHtml(settings, unpaid)}
    ${documentFooterHtml(settings)}
  </div>`;
}
function printBillingDocument(title, owner, rows, visitPets, petMap, serviceMap, settings) {
  printHtmlDocument(title, billingDocumentHtml({ title, owner, rows, visitPets, petMap, serviceMap, settings }), { filename: `${safeFileName(title || "invoice")}.pdf` });
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
    revenue: completed.reduce((s,v)=>s+visitChargeTotal(v),0),
    mileageRevenue: completed.reduce((s,v)=>s+visitMileageCharge(v),0),
    paid: paid.reduce((s,v)=>s+visitChargeTotal(v),0),
    unpaid: unpaid.reduce((s,v)=>s+visitChargeTotal(v),0),
    unpaidCount: unpaid.length,
    cancelledMissed,
  };
  const ownerRows = owners.map(owner => {
    const ownerVisits = completed.filter(v=>v.owner_id === owner.id);
    const paidRows = ownerVisits.filter(v=>v.is_paid);
    const unpaidRows = ownerVisits.filter(v=>!v.is_paid);
    const petRows = pets.filter(p=>p.owner_id===owner.id).map(p=>{
      const petVisits = ownerVisits.filter(v=>v.primary_pet_id===p.id || visitPets.some(vp=>vp.visit_id===v.id && vp.pet_id===p.id));
      return { pet:p, count:petVisits.length, total:petVisits.reduce((s,v)=>s+visitChargeTotal(v),0) };
    }).filter(x=>x.count);
    const total = ownerVisits.reduce((s,v)=>s+visitChargeTotal(v),0);
    return { owner, completedCount: ownerVisits.length, total, paid: paidRows.reduce((s,v)=>s+visitChargeTotal(v),0), unpaid: unpaidRows.reduce((s,v)=>s+visitChargeTotal(v),0), unpaidCount: unpaidRows.length, avgVisit: ownerVisits.length ? total / ownerVisits.length : 0, petRows };
  }).filter(x=>x.completedCount || x.total || x.unpaid).sort((a,b)=>{
    const key = rankBy === "visits" ? "completedCount" : rankBy === "unpaid" ? "unpaid" : rankBy === "avg" ? "avgVisit" : "total";
    const diff = num(b[key])-num(a[key]);
    return diff || (a.owner.name || "").localeCompare(b.owner.name || "");
  });
  const serviceRows = Object.values(completed.reduce((acc,v)=>{ const key=v.service_id || "custom"; acc[key] ||= { name: serviceMap[v.service_id]?.name || "Custom/Unknown", count:0, total:0, unpaid:0 }; acc[key].count++; acc[key].total+=visitChargeTotal(v); if(!v.is_paid) acc[key].unpaid+=visitChargeTotal(v); return acc; },{})).sort((a,b)=>b.total-a.total);
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
      <div style={S.row}><button style={S.primaryBtn} onClick={()=>setPreview(reportData)}>Download / Share Report PDF</button></div>
    </Panel>
    <Panel title="Report Preview" subtitle={`${reportData.scopeLabel} · ${niceDate(range.start.toISOString().slice(0,10))} to ${niceDate(range.end.toISOString().slice(0,10))}`}>
      <div style={S.grid3}><Metric title="Completed" value={totals.completedCount} sub="visits" /><Metric title="Revenue" value={money(totals.revenue)} sub="completed" /><Metric title="Unpaid" value={money(totals.unpaid)} sub={`${totals.unpaidCount} visits`} /></div>
      <div style={S.grid3}><Metric title="Paid" value={money(totals.paid)} sub="received" /><Metric title="Mileage" value={money(totals.mileageRevenue)} sub="charged" /><Metric title="Avg / Visit" value={money(totals.completedCount ? totals.revenue/totals.completedCount : 0)} sub="completed" /><Metric title="Cancelled/Missed" value={totals.cancelledMissed} sub="visits" /></div>
    </Panel>
    <Panel title="Rank pet owners by"><div style={S.row}>{Object.entries(rankLabels).map(([k,label])=><button key={k} style={rankBy===k?S.primaryMini:S.secondaryMini} onClick={()=>setRankBy(k)}>{label}</button>)}</div><p style={S.muted}>Sorted by {rankLabels[rankBy]} high to low.</p></Panel>
    <Panel title="Pet Owner Rankings">{ownerRows.length ? ownerRows.map((x,idx)=><div key={x.owner.id} style={S.reportRow}><b>{idx+1}. {x.owner.name}</b><span>{x.completedCount} visits</span><span>{money(x.total)}</span><small>Paid {money(x.paid)} · Unpaid {money(x.unpaid)} · Avg {money(x.avgVisit)}</small><div style={S.subList}>{x.petRows.map(pr=><span key={pr.pet.id}>{pr.pet.name}: {pr.count} visits</span>)}</div></div>) : <Empty text="No completed visits in this report range." />}</Panel>
    <Panel title="Revenue by Service Type">{serviceRows.length ? serviceRows.map(s=><div key={s.name} style={S.reportRow}><b>{s.name}</b><span>{s.count} visits</span><span>{money(s.total)}</span>{s.unpaid ? <small>Unpaid {money(s.unpaid)}</small> : null}</div>) : <Empty text="No service revenue in this report range." />}</Panel>
    <Panel title="Unpaid Completed Visits">{unpaid.length ? unpaid.map(v=><div key={v.id} style={S.reportRow}><b>{ownerMap[v.owner_id]?.name || "Unknown"}</b><span>{niceDate(v.visit_date)}</span><span>{serviceMap[v.service_id]?.name || "Service"}</span><small>{visitPetsForNames(v, visitPets, petMap)} · {money(visitChargeTotal(v))}</small><button style={S.primaryMini} onClick={()=>onMarkPaid(v.id)}>Mark Paid</button></div>) : <Empty text="No unpaid completed visits in this report range." />}</Panel>
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
    <div style={S.cards}>{services.map(s=><div key={s.id} style={{...S.smallCard,borderLeft:`6px solid ${serviceColor(s)}`}} onClick={()=>chooseService(s)}><b>{s.name}</b><span>{s.category}</span><span>{s.default_duration_minutes} min — {money(s.base_price)} — extra pet {money(s.extra_pet_price)}</span><ul>{serviceChecklist.filter(i=>i.service_id===s.id).map(i=><li key={i.id}>{i.label}</li>)}</ul></div>)}</div>
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
    <span>{niceDate(visit.visit_date)} · {service?.name || "Service"} · {money(visitChargeTotal(visit))}</span>
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
  const defaultSettings = {
    business_name:"Pet Care by Kiri",
    service_description:"Pet care services",
    business_phone:"",
    business_email:"",
    default_email:"",
    business_website:"",
    business_address:"",
    show_business_address:false,
    tax_number:"",
    show_tax_number_on_documents:false,
    charge_gst:false,
    gst_rate:5,
    payment_methods:"",
    etransfer_email:"",
    show_etransfer:false,
    invoice_due_terms:"",
    default_invoice_note:"",
    invoice_footer_note:"",
    business_notes:""
  };
  const [form, setForm] = useState({ ...defaultSettings, ...(settings || {}) });
  useEffect(()=>setForm({ ...defaultSettings, ...(settings || {}) }), [settings?.id]);
  return <Panel title="Business Settings">
    <h3>Business contact</h3>
    <p style={S.muted}>Only filled-in fields are shown on PDFs. Address, tax number, and e-transfer also need their show checkbox turned on.</p>
    <div style={S.formGrid}>
      <Field label="Business display name"><input value={form.business_name||""} onChange={e=>setForm({...form,business_name:e.target.value})}/></Field>
      <Field label="Service description / tagline"><input value={form.service_description||""} onChange={e=>setForm({...form,service_description:e.target.value})}/></Field>
      <Field label="Business phone"><input value={form.business_phone||""} onChange={e=>setForm({...form,business_phone:e.target.value})}/></Field>
      <Field label="Business email"><input value={form.business_email||""} onChange={e=>setForm({...form,business_email:e.target.value})}/></Field>
      <Field label="Default report email"><input value={form.default_email||""} onChange={e=>setForm({...form,default_email:e.target.value})}/></Field>
      <Field label="Website / social link"><input value={form.business_website||""} onChange={e=>setForm({...form,business_website:e.target.value})}/></Field>
    </div>
    <Field label="Business address / service area"><textarea value={form.business_address||""} onChange={e=>setForm({...form,business_address:e.target.value})}/></Field>
    <label style={S.checkCompact}><input style={S.checkboxSmall} type="checkbox" checked={!!form.show_business_address} onChange={e=>setForm({...form,show_business_address:e.target.checked})}/> <span>Show business address on invoices, statements, reports, and forms</span></label>

    <h3>Tax</h3>
    <div style={S.formGrid}>
      <Field label="Tax number"><input value={form.tax_number||""} onChange={e=>setForm({...form,tax_number:e.target.value})}/></Field>
      <Field label="GST rate"><input type="number" value={form.gst_rate||0} onChange={e=>setForm({...form,gst_rate:e.target.value})}/></Field>
    </div>
    <label style={S.checkCompact}><input style={S.checkboxSmall} type="checkbox" checked={!!form.charge_gst} onChange={e=>setForm({...form,charge_gst:e.target.checked})}/> <span>Charge GST</span></label>
    <label style={S.checkCompact}><input style={S.checkboxSmall} type="checkbox" checked={!!form.show_tax_number_on_documents} onChange={e=>setForm({...form,show_tax_number_on_documents:e.target.checked})}/> <span>Show tax number on documents</span></label>

    <h3>Payment instructions</h3>
    <div style={S.formGrid}>
      <Field label="Accepted payment methods"><input placeholder="E-transfer, cash, cheque" value={form.payment_methods||""} onChange={e=>setForm({...form,payment_methods:e.target.value})}/></Field>
      <Field label="E-transfer email"><input value={form.etransfer_email||""} onChange={e=>setForm({...form,etransfer_email:e.target.value})}/></Field>
      <Field label="Invoice due terms"><input placeholder="Due on receipt / Due in 7 days" value={form.invoice_due_terms||""} onChange={e=>setForm({...form,invoice_due_terms:e.target.value})}/></Field>
      <Field label="Default invoice note"><input placeholder="Thank you for your business" value={form.default_invoice_note||""} onChange={e=>setForm({...form,default_invoice_note:e.target.value})}/></Field>
    </div>
    <label style={S.checkCompact}><input style={S.checkboxSmall} type="checkbox" checked={!!form.show_etransfer} onChange={e=>setForm({...form,show_etransfer:e.target.checked})}/> <span>Show e-transfer instructions on invoices/statements</span></label>
    <Field label="Invoice / document footer message"><textarea value={form.invoice_footer_note||""} onChange={e=>setForm({...form,invoice_footer_note:e.target.value})}/></Field>
    <Field label="Internal business notes"><textarea value={form.business_notes||""} onChange={e=>setForm({...form,business_notes:e.target.value})}/></Field>
    <button style={S.primaryBtn} onClick={()=>onSaveSettings(form)}>Save Settings</button>
  </Panel>;
}
function DeletedAdmin({ deleted, onHardDeleteDeleted }) {
  return <Panel title="Deleted Items"><p style={S.muted}>Deleted items are logged here for reference. Restore can be added after the new data model is fully stable.</p>{deleted.map(d=><div key={d.id} style={S.reportRow}><b>{d.item_type}</b><span>{d.item_label}</span><span>{new Date(d.deleted_at).toLocaleString()}</span><button style={S.dangerMini} onClick={()=>onHardDeleteDeleted(d.id)}>Remove log</button></div>)}</Panel>;
}
function VisitCard({ visit, owner, pets = [], service, onStart, onComplete, onPetInfo, onCancel, onMarkPaid, onMarkUnpaid, onDeleteVisit, onReschedule, highlight = false }) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const safePets = (pets || []).filter(Boolean);
  const canPetInfo = typeof onPetInfo === "function";
  const hasActions = !!(onCancel || onDeleteVisit || onReschedule);
  const color = serviceColor(service);
  return <div style={{...visitCardStyle(visit, service), ...(highlight ? S.highlightCard : {})}}>
    <div>
      <b>{niceDate(visit.visit_date)} {timeLabel(visit.scheduled_start_time)}</b>
      <div>{owner?.name || "Unknown owner"} — {service?.name || "Service"}</div>
      <div style={S.petLine}>
        {safePets.length ? safePets.map(p => (
          <button key={p.id} style={{...S.petChip, background: hexToRgba(color,.12), color: color}} disabled={!canPetInfo} onClick={() => canPetInfo && onPetInfo(p.id)}>{p.name} Info</button>
        )) : <small style={S.muted}>No pet attached</small>}
      </div>
      <small style={S.muted}>{visit.status} · {visit.duration_minutes} min · {money(visitChargeTotal(visit))} · {num(visit.mileage) ? `${num(visit.mileage)} km · ` : ""}{visit.is_paid ? `Paid${visit.paid_at ? " " + niceDate(String(visit.paid_at).slice(0,10)) : ""}` : "Unpaid"}</small>
    </div>
    <div style={S.cardActionsCompact}>
      {visit.status === "Scheduled" && onStart && <button style={S.secondaryMini} onClick={() => onStart(visit.id)}>Start</button>}
      {["Scheduled","In Progress"].includes(visit.status) && onComplete && <button style={S.primaryMini} onClick={() => onComplete(visit.id)}>Complete</button>}
      {visit.status === "Completed" && !visit.is_paid && onMarkPaid && <button style={S.primaryMini} onClick={() => onMarkPaid(visit.id)}>Mark Paid</button>}
      {visit.status === "Completed" && visit.is_paid && onMarkUnpaid && <button style={S.secondaryMini} onClick={() => onMarkUnpaid(visit.id)}>Mark Unpaid</button>}
      {hasActions && <button style={S.secondaryMini} onClick={() => setActionsOpen(true)}>Actions</button>}
    </div>
    {actionsOpen && <div style={S.sheetShade} onClick={()=>setActionsOpen(false)}>
      <div style={S.actionSheet} onClick={e=>e.stopPropagation()}>
        <div style={S.sheetHandle}></div>
        <div style={S.sheetHead}><b>Visit Actions</b><button style={S.secondaryMini} onClick={()=>setActionsOpen(false)}>Close</button></div>
        <div style={S.sheetMeta}>{niceDate(visit.visit_date)} · {service?.name || "Service"}</div>
        <div style={S.sheetActions}>
          {visit.status !== "Completed" && onReschedule && <button style={S.secondaryBtn} onClick={() => { setActionsOpen(false); onReschedule(visit); }}>Reschedule</button>}
          {visit.status === "Completed" && onComplete && <button style={S.secondaryBtn} onClick={() => { setActionsOpen(false); onComplete(visit.id); }}>Edit Mileage / Notes</button>}
          {visit.status === "Scheduled" && onCancel && <button style={S.dangerMini} onClick={() => { setActionsOpen(false); onCancel(visit.id); }}>Cancel Visit</button>}
          {onDeleteVisit && <button style={S.dangerBtn} onClick={() => { setActionsOpen(false); onDeleteVisit(visit); }}>Delete Visit</button>}
        </div>
      </div>
    </div>}
  </div>;
}
function CompleteModal({ visit, checklist, owner, pets, service, onToggleChecklist, onClose, onSave }) {
  const [form, setForm] = useState({ completion_notes: visit.completion_notes || "", incident_notes: visit.incident_notes || "", is_paid: !!visit.is_paid, payment_method: visit.payment_method || "", payment_notes: visit.payment_notes || "", mileage: visit.mileage ?? 0, travel_fee: visit.travel_fee ?? 0, mileage_chargeable: num(visit.travel_fee) > 0 });
  const [tripDraft, setTripDraft] = useState({ date: visit.visit_date || todayISO(), reason:"", mileage:"", notes:"" });
  const [trips, setTrips] = useState([]);
  const tripMileageTotal = trips.reduce((s,t)=>s+num(t.mileage),0);
  function addTrip() {
    if (!num(tripDraft.mileage) && !String(tripDraft.reason || "").trim()) return;
    const next = [...trips, { ...tripDraft, id: `${Date.now()}-${Math.random()}` }];
    setTrips(next);
    const total = next.reduce((s,t)=>s+num(t.mileage),0);
    if (total > 0) setForm(f => ({ ...f, mileage: total }));
    setTripDraft({ date: addDaysIso(tripDraft.date || visit.visit_date || todayISO(), 1), reason:"", mileage:"", notes:"" });
  }
  function removeTrip(id) {
    const next = trips.filter(t=>t.id!==id);
    setTrips(next);
    const total = next.reduce((s,t)=>s+num(t.mileage),0);
    if (total > 0) setForm(f => ({ ...f, mileage: total }));
  }
  function saveCompletion() {
    const tripLines = trips.length ? "\n\nMileage / trip details:\n" + trips.map((t,i)=>`${i+1}. ${niceDate(t.date)} — ${t.reason || "Trip"} — ${num(t.mileage)} km${t.notes ? ` — ${t.notes}` : ""}`).join("\n") : "";
    const cleanNotes = `${form.completion_notes || ""}${tripLines}`.trim();
    onSave(visit.id, { ...form, completion_notes: cleanNotes, mileage: num(form.mileage), travel_fee: form.mileage_chargeable ? num(form.travel_fee) : 0 });
  }
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
    <Panel title="Mileage / Travel">
      <div style={S.formGrid}>
        <Field label="Total mileage for this job"><input type="number" value={form.mileage} onChange={e=>setForm({...form,mileage:e.target.value})} /></Field>
        <label style={S.checkCompact}><input style={S.checkboxSmall} type="checkbox" checked={!!form.mileage_chargeable} onChange={e=>setForm({...form,mileage_chargeable:e.target.checked})}/> <span>Charge mileage to client</span></label>
        {form.mileage_chargeable && <Field label="Travel / mileage fee"><input type="number" value={form.travel_fee} onChange={e=>setForm({...form,travel_fee:e.target.value})} /></Field>}
      </div>
      <details style={S.collapse}>
        <summary style={S.collapseSummary}>Optional trip breakdown</summary>
        <div style={S.formGridPadded}>
          <Field label="Trip date"><input type="date" value={tripDraft.date} onChange={e=>setTripDraft({...tripDraft,date:e.target.value})} /></Field>
          <Field label="Reason"><input placeholder="Arrival, supplies, vet, final return" value={tripDraft.reason} onChange={e=>setTripDraft({...tripDraft,reason:e.target.value})} /></Field>
          <Field label="Mileage"><input type="number" value={tripDraft.mileage} onChange={e=>setTripDraft({...tripDraft,mileage:e.target.value})} /></Field>
          <Field label="Trip notes"><textarea value={tripDraft.notes} onChange={e=>setTripDraft({...tripDraft,notes:e.target.value})} /></Field>
          <button style={S.secondaryBtn} onClick={addTrip}>Add Trip</button>
          {trips.length > 0 && <div style={S.detailBox}><b>Trip total: {tripMileageTotal} km</b>{trips.map(t=><div key={t.id} style={S.tripRow}><span>{niceDate(t.date)} · {t.reason || "Trip"}</span><b>{num(t.mileage)} km</b><button style={S.dangerMini} onClick={()=>removeTrip(t.id)}>Remove</button>{t.notes && <small>{t.notes}</small>}</div>)}</div>}
        </div>
      </details>
    </Panel>
    <label style={S.checkCompact}><input style={S.checkboxSmall} type="checkbox" checked={!!form.is_paid} onChange={e=>setForm({...form,is_paid:e.target.checked})}/> <span>Mark as paid</span></label>
    {form.is_paid && <><Field label="Payment method"><select value={form.payment_method || ""} onChange={e=>setForm({...form,payment_method:e.target.value})}><option value="">Select method</option><option>Cash</option><option>E-transfer</option><option>Cheque</option><option>Card</option><option>Other</option></select></Field><Field label="Payment notes"><textarea value={form.payment_notes || ""} onChange={e=>setForm({...form,payment_notes:e.target.value})}/></Field></>}
    <Field label="Completion notes"><textarea value={form.completion_notes} onChange={e=>setForm({...form,completion_notes:e.target.value})}/></Field>
    <Field label="Incident / issue notes"><textarea value={form.incident_notes} onChange={e=>setForm({...form,incident_notes:e.target.value})}/></Field>
    <button style={S.primaryBtn} onClick={saveCompletion}>{visit.status === "Completed" ? "Save Completion / Mileage" : "Mark Completed"}</button>
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
function VisitHistoryRow({ visit, service, pets, onDeleteVisit }) { return <div style={S.visitHistory}><div><b>{niceDate(visit.visit_date)} {timeLabel(visit.scheduled_start_time)}</b><div style={S.muted}>{service?.name || "Service"} · {pets.map(p=>p.name).join(", ")}</div></div><div style={S.status}>{visit.status}</div><div><b>{money(visitChargeTotal(visit))}</b></div>{onDeleteVisit && <button style={S.dangerMini} onClick={()=>onDeleteVisit(visit)}>Delete</button>}</div>; }
function formFileUrl(fileName) {
  return `${window.location.origin}/forms/${encodeURIComponent(fileName)}`;
}
function selectedDocsFromIds(ids) {
  return DOCUMENT_TEMPLATES.filter(d => ids.includes(d.id));
}
function buildDocumentEmailText(owner, pets, docs, settings) {
  const business = settings?.business_name || "Pet Care by Kiri";
  const lines = [];
  lines.push(`Hi ${owner?.name || "there"},`);
  lines.push("");
  lines.push(`Attached/linked below are the pet care forms for ${business}.`);
  lines.push("Please review, complete, sign where needed, and email the finished copies back before the first visit.");
  lines.push("");
  if (pets?.length) lines.push(`Pets on file: ${pets.map(p => p.name).join(", ")}`);
  lines.push("");
  lines.push("Selected forms:");
  docs.forEach((d, idx) => lines.push(`${idx + 1}. ${d.title}: ${formFileUrl(d.fileName)}`));
  lines.push("");
  lines.push("Full package PDF:");
  lines.push(formFileUrl("Pet_Care_Business_Forms_Combined_v3.pdf"));
  lines.push("");
  lines.push("Thank you,");
  lines.push(business);
  if (settings?.business_phone) lines.push(settings.business_phone);
  if (settings?.business_email) lines.push(settings.business_email);
  return lines.join("\n");
}
function documentPackageHtml(owner, pets, docs, settings) {
  const ownerBlock = `<div class="box"><b>Client / Owner</b><br>${escapeHtml(owner?.name || "")}<br>${escapeHtml(owner?.phone || "")}<br>${escapeHtml(owner?.email || "")}<br>${escapeHtml(owner?.address || "")}</div>`;
  const petBlock = `<div class="box"><b>Pets</b><br>${pets?.length ? pets.map(p => `${escapeHtml(p.name || "Pet")} — ${escapeHtml([p.species, p.breed, p.age_text].filter(Boolean).join(" · "))}`).join("<br>") : "No pets selected yet."}</div>`;
  const forms = docs.map(d => `<section style="break-inside:avoid;page-break-inside:avoid;margin-top:18px;border-top:1px solid #ddd;padding-top:14px"><h2>${escapeHtml(d.title)}</h2><p class="muted">Original file: ${escapeHtml(d.fileName)}</p>${prefillFormBody(d, owner, pets)}<div style="margin-top:26px;display:grid;grid-template-columns:1fr 1fr;gap:18px"><div>Client signature: ______________________________</div><div>Date: __________________</div></div></section>`).join("");
  return `<div class="doc-head"><div>${businessContactHtml(settings)}</div><div style="text-align:right"><h2>INTAKE DOCUMENTS</h2><div>${escapeHtml(owner?.name || "Selected owner")}</div><div>${new Date().toLocaleDateString()}</div></div></div><div class="bill-to">${ownerBlock}${petBlock}</div>${forms}${documentFooterHtml(settings, "Please complete, sign, and return these documents before service begins.")}`;
}
function formTextarea(label, height = 70) { return `<div style="margin-top:10px"><b>${escapeHtml(label)}</b><div style="min-height:${height}px;border:1px solid #ddd;border-radius:8px;padding:10px;margin-top:5px"></div></div>`; }
function signatureBlock(label = "Client signature") { return `<div style="margin-top:22px;display:grid;grid-template-columns:1fr 1fr;gap:18px"><div>${escapeHtml(label)}: ______________________________</div><div>Date: __________________</div></div>`; }
function prefillFormBody(doc, owner, pets) {
  const petRows = (pets || []).map(p => `<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.species)}</td><td>${escapeHtml(p.breed)}</td><td>${escapeHtml(p.age_text)}</td><td>${escapeHtml(p.medical_conditions || p.allergies || "")}</td></tr>`).join("");
  const petCareRows = (pets || []).map(p => `<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.feeding_instructions || "")}</td><td>${escapeHtml(p.medication_instructions || "")}</td><td>${escapeHtml(p.care_notes || "")}</td></tr>`).join("");
  if (doc.id === "client_household_intake") return `<h3>Client Contact Details</h3><table><tbody><tr><td>Owner name</td><td>${escapeHtml(owner?.name || "")}</td></tr><tr><td>Phone</td><td>${escapeHtml(owner?.phone || "")}</td></tr><tr><td>Email</td><td>${escapeHtml(owner?.email || "")}</td></tr><tr><td>Invoice email</td><td>${escapeHtml(owner?.invoice_email || "")}</td></tr><tr><td>Address</td><td>${escapeHtml(owner?.address || "")}</td></tr><tr><td>Emergency contact</td><td>${escapeHtml([owner?.emergency_contact_name, owner?.emergency_contact_phone].filter(Boolean).join(" — "))}</td></tr></tbody></table>${formTextarea("Home access instructions", 55)}${formTextarea("House instructions / client notes", 70)}`;
  if (doc.id === "individual_pet_profile") return `<h3>Pet Profile Details</h3><table><thead><tr><th>Pet</th><th>Species</th><th>Breed</th><th>Age</th><th>Medical / allergy notes</th></tr></thead><tbody>${petRows || `<tr><td colspan="5">Add pet details here.</td></tr>`}</tbody></table>${formTextarea("Daily routine / temperament / comfort notes", 80)}`;
  if (doc.id === "vet_authorization") return `<h3>Veterinary Authorization</h3><p>I authorize Pet Care by Kiri to seek veterinary care for my pet(s) if urgent care is needed and I cannot be reached.</p><table><thead><tr><th>Pet</th><th>Vet / clinic</th><th>Medical notes</th><th>Allergies</th></tr></thead><tbody>${(pets||[]).map(p=>`<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.vet_name || "")}</td><td>${escapeHtml(p.medical_conditions || "")}</td><td>${escapeHtml(p.allergies || "")}</td></tr>`).join("") || `<tr><td colspan="4">Pet / clinic details</td></tr>`}</tbody></table>${formTextarea("Emergency limits / approved treatment instructions", 70)}`;
  if (doc.id === "home_access") return `<h3>Home Access / Key Security</h3><table><tbody><tr><td>Access address</td><td>${escapeHtml(owner?.address || "")}</td></tr><tr><td>Access instructions</td><td>${escapeHtml(owner?.access_instructions || "")}</td></tr><tr><td>Emergency contact</td><td>${escapeHtml([owner?.emergency_contact_name, owner?.emergency_contact_phone].filter(Boolean).join(" — "))}</td></tr></tbody></table>${formTextarea("Key / lockbox / alarm instructions", 85)}${formTextarea("Client initials / key return notes", 45)}`;
  if (doc.id === "service_agreement") return `<h3>Service Agreement</h3><p>This agreement confirms the client understands the scheduled pet care services, payment expectations, cancellation expectations, and care limitations.</p><table><tbody><tr><td>Client</td><td>${escapeHtml(owner?.name || "")}</td></tr><tr><td>Pets</td><td>${escapeHtml((pets||[]).map(p=>p.name).join(", "))}</td></tr></tbody></table>${formTextarea("Services requested / special terms", 80)}${formTextarea("Client initials", 35)}`;
  if (doc.id === "policies_pricing") return `<h3>Policies / Pricing Acknowledgement</h3><p>Client confirms they have reviewed service pricing, payment timing, cancellation policies, and any travel or extra-pet fees that may apply.</p><table><tbody><tr><td>Client</td><td>${escapeHtml(owner?.name || "")}</td></tr><tr><td>Billing notes</td><td>${escapeHtml(owner?.billing_notes || owner?.payment_notes || "")}</td></tr></tbody></table>${formTextarea("Policy notes / client initials", 70)}`;
  if (doc.id === "medication_auth") return `<h3>Medication Authorization</h3><table><thead><tr><th>Pet</th><th>Medication instructions</th><th>Medical conditions</th><th>Allergies</th></tr></thead><tbody>${(pets||[]).map(p=>`<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.medication_instructions || "")}</td><td>${escapeHtml(p.medical_conditions || "")}</td><td>${escapeHtml(p.allergies || "")}</td></tr>`).join("") || `<tr><td colspan="4">Medication details</td></tr>`}</tbody></table>${formTextarea("Medication name / dose / timing / permission notes", 90)}`;
  if (doc.id === "medication_log") return `<h3>Medication Administration Log</h3><table><thead><tr><th>Date</th><th>Time</th><th>Pet</th><th>Medication</th><th>Dose</th><th>Given by</th></tr></thead><tbody>${Array.from({length:8},()=>`<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>`).join("")}</tbody></table>`;
  if (doc.id === "dog_walking") return `<h3>Dog Walking Consent / Rules</h3><p>Client confirms leash, harness, handling, and safety instructions for dog walking services.</p><table><thead><tr><th>Pet</th><th>Leash / harness notes</th><th>Behavior notes</th><th>Emergency notes</th></tr></thead><tbody>${(pets||[]).filter(p=>String(p.species||"").toLowerCase().includes("dog")).map(p=>`<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.leash_harness_notes || "")}</td><td>${escapeHtml(p.behavior_notes || "")}</td><td>${escapeHtml(p.emergency_instructions || "")}</td></tr>`).join("") || `<tr><td colspan="4">Dog walking details</td></tr>`}</tbody></table>${formTextarea("Walking rules / approved routes / off-leash restrictions", 70)}`;
  if (doc.id === "overnight") return `<h3>Overnight / In-Home Sitting Add-On</h3><table><tbody><tr><td>Home address</td><td>${escapeHtml(owner?.address || "")}</td></tr><tr><td>House instructions</td><td>${escapeHtml(owner?.house_instructions || "")}</td></tr></tbody></table>${formTextarea("Overnight routine / sleeping arrangements / home rules", 90)}${formTextarea("Emergency home instructions", 60)}`;
  if (doc.id === "photo_consent") return `<h3>Photo / Marketing Consent</h3><p>Client may choose whether pet photos may be used for updates, social media, marketing, or private client communication only.</p><table><tbody><tr><td>Client</td><td>${escapeHtml(owner?.name || "")}</td></tr><tr><td>Pets</td><td>${escapeHtml((pets||[]).map(p=>p.name).join(", "))}</td></tr></tbody></table><p>Consent choice: ☐ Yes, public marketing use &nbsp;&nbsp; ☐ Updates only &nbsp;&nbsp; ☐ No public use</p>`;
  if (doc.id === "visit_notes") return `<h3>Visit Checklist / Completion Notes</h3><table><thead><tr><th>Pet</th><th>Feeding</th><th>Medication</th><th>Care notes</th></tr></thead><tbody>${petCareRows || `<tr><td colspan="4">Visit care details</td></tr>`}</tbody></table>${formTextarea("Visit completion notes", 90)}`;
  if (doc.id === "meet_greet") return `<h3>Meet & Greet Safety Checklist</h3><p>Review access, emergency contacts, pet handling, feeding, medication, and home safety before the first service.</p><p>☐ Keys/access confirmed &nbsp; ☐ Vet info confirmed &nbsp; ☐ Feeding confirmed &nbsp; ☐ Medication confirmed &nbsp; ☐ Behavior risks reviewed</p>${formTextarea("Safety observations / follow-up items", 90)}`;
  if (doc.id === "incident_report") return `<h3>Incident Report</h3><table><tbody><tr><td>Date/time</td><td></td></tr><tr><td>Owner</td><td>${escapeHtml(owner?.name || "")}</td></tr><tr><td>Pet(s)</td><td>${escapeHtml((pets||[]).map(p=>p.name).join(", "))}</td></tr><tr><td>Type of incident</td><td>☐ Health ☐ Injury ☐ Behavior ☐ Home/access ☐ Other</td></tr></tbody></table>${formTextarea("What happened?", 110)}${formTextarea("Action taken / owner notified / vet contacted", 90)}`;
  if (doc.id === "incident_follow_up") return `<h3>Incident Follow-Up Checklist</h3><p>☐ Owner contacted &nbsp; ☐ Vet contacted if needed &nbsp; ☐ Photos attached &nbsp; ☐ Next visit instructions updated &nbsp; ☐ Follow-up completed</p>${formTextarea("Follow-up notes", 100)}`;
  return `<p>This form is part of the ${escapeHtml(doc.group)} package for ${escapeHtml(owner?.name || "the client")}.</p>${formTextarea("Notes / terms / client initials", 80)}`;
}
function OwnerDocumentsPanel({ owner, pets, ownerDocuments, onUploadDocument, onDeleteDocument, settings }) {
  const [selectedIds, setSelectedIds] = useState(CORE_DOCUMENT_IDS);
  const [uploadType, setUploadType] = useState("Signed full intake package");
  const [uploadPetId, setUploadPetId] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const docs = selectedDocsFromIds(selectedIds);
  function toggleDoc(id) { setSelectedIds(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]); }
  const grouped = DOCUMENT_TEMPLATES.reduce((acc,d)=>{ (acc[d.group] ||= []).push(d); return acc; }, {});
  return <div style={S.stack}>
    <Panel title="Send Forms">
      <div style={S.row}><button style={S.primaryBtn} onClick={()=>setSelectedIds(CORE_DOCUMENT_IDS)}>Core Intake Package</button><button style={S.secondaryBtn} onClick={()=>setSelectedIds(DOCUMENT_TEMPLATES.map(d=>d.id))}>Select All</button><button style={S.secondaryBtn} onClick={()=>setSelectedIds([])}>Clear</button></div>
      {Object.entries(grouped).map(([group, list]) => <div key={group} style={S.detailBox}><b>{group}</b>{list.map(d => <label key={d.id} style={S.checkCompact}><input style={S.checkboxSmall} type="checkbox" checked={selectedIds.includes(d.id)} onChange={()=>toggleDoc(d.id)} /><span>{d.title}</span></label>)}</div>)}
      <div style={S.row}><button style={S.primaryBtn} disabled={!docs.length} onClick={()=>printHtmlDocument(`${owner?.name || "Owner"} Intake Forms`, documentPackageHtml(owner, pets, docs, settings))}>Download / Share Selected Forms PDF</button></div>
      <div style={S.detailBox}><b>Download original files</b><a style={S.phoneLink} href="/forms/Pet_Care_Business_Forms_Combined_v3.pdf" target="_blank" rel="noreferrer">Open full combined PDF</a><a style={S.phoneLink} href="/forms/Pet_Care_Business_Forms_Combined.docx" target="_blank" rel="noreferrer">Open editable combined DOCX</a></div>
    </Panel>
    <Panel title="Upload Signed / Returned Document">
      <div style={S.formGrid}>
        <Field label="Document type"><select value={uploadType} onChange={e=>setUploadType(e.target.value)}>{DOCUMENT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></Field>
        <Field label="Applies to pet (optional)"><select value={uploadPetId} onChange={e=>setUploadPetId(e.target.value)}><option value="">Owner / household</option>{pets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Signed file"><input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic,image/*,application/pdf" onChange={e=>setUploadFile(e.target.files?.[0] || null)} /></Field>
        <Field label="Notes"><textarea value={uploadNotes} onChange={e=>setUploadNotes(e.target.value)} /></Field>
      </div>
      <button style={S.primaryBtn} disabled={!uploadFile} onClick={async()=>{ await onUploadDocument?.({ ownerId: owner?.id, petId: uploadPetId, documentType: uploadType, file: uploadFile, notes: uploadNotes }); setUploadFile(null); setUploadNotes(""); }}>Attach Document to Owner</button>
    </Panel>
    <Panel title="Attached Documents">
      {ownerDocuments.length ? ownerDocuments.map(d => <div key={d.id} style={S.billingRowCompact}><div><b>{d.document_type || "Document"}</b><div style={S.muted}>{d.file_name || "File"}</div><small>{d.pet_id ? `Pet: ${pets.find(p=>p.id===d.pet_id)?.name || "Pet"} · ` : "Owner / household · "}{d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString() : ""}</small>{d.notes ? <div>{d.notes}</div> : null}</div><div style={S.row}>{d.file_url && <a style={S.secondaryMini} href={d.file_url} target="_blank" rel="noreferrer">Open</a>}<button style={S.dangerMini} onClick={()=>onDeleteDocument?.(d)}>Delete</button></div></div>) : <Empty text="No signed documents attached yet." />}
    </Panel>
  </div>;
}

function OwnerBillingSummary({ owner, visits, visitPets, petMap, serviceMap, settings, onMarkPaid, onMarkUnpaid, onMarkManyPaid }) {
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
      lines.push(`${niceDate(v.visit_date)} ${v.scheduled_start_time || ""} — ${serviceMap[v.service_id]?.name || "Service"} — ${visitPetsFor(v, visitPets, petMap).map(p=>p.name).join(", ")} — ${visitMoneyDetails(v)} — ${v.is_paid ? "Paid" : "Unpaid"}`);
    });
    lines.push("");
    lines.push(`Total: ${money(rows.reduce((s,v)=>s+visitChargeTotal(v),0))}`);
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
        <b>{money(visitChargeTotal(v))}</b><small>{v.is_paid ? "Paid" : "Unpaid"}</small>
        <div style={S.row}><button style={S.secondaryMini} onClick={()=>printBillingDocument(`${owner?.name || "Owner"} Individual Invoice`, owner, [v], visitPets, petMap, serviceMap, settings)}>Download / Share Invoice PDF</button></div>
      </div>;
    }) : <Empty text="No visits match this preview." />}</div></Panel>
    <div style={S.row}><button style={S.primaryBtn} onClick={()=>printBillingDocument(`${owner?.name || "Owner"} Unpaid Invoice`, owner, unpaid, visitPets, petMap, serviceMap, settings)}>Download / Share Unpaid PDF</button><button style={S.secondaryBtn} onClick={()=>printBillingDocument(`${owner?.name || "Owner"} Statement`, owner, completed, visitPets, petMap, serviceMap, settings)}>Download / Share Statement PDF</button></div>
    <div style={S.infoGrid}>
      <InfoLine label="Owner" value={owner?.name} />
      <InfoLine label="Completed visits" value={completed.length} />
      <InfoLine label="Completed revenue" value={money(completed.reduce((s,v)=>s+visitChargeTotal(v),0))} />
      <InfoLine label="Unpaid total" value={money(unpaid.reduce((s,v)=>s+visitChargeTotal(v),0))} danger={unpaid.length>0} />
      <InfoLine label="Paid total" value={money(paid.reduce((s,v)=>s+visitChargeTotal(v),0))} />
      <InfoLine label="Billing notes" value={owner?.billing_notes} />
      <InfoLine label="Payment notes" value={owner?.payment_notes} />
    </div>
    <Panel title="Unpaid Completed Visits">
      {unpaid.length ? <div style={S.stack}>
        <div style={S.row}><button style={S.primaryBtn} onClick={()=>onMarkManyPaid(selected)}>Mark Selected Paid</button><button style={S.secondaryBtn} onClick={()=>setSelected(unpaid.map(v=>v.id))}>Select All</button><button style={S.secondaryBtn} onClick={()=>setSelected([])}>Clear</button></div>
        {unpaid.map(v=><div key={v.id} style={S.billingRow}><label style={S.checkCompact}><input style={S.checkboxSmall} type="checkbox" checked={selected.includes(v.id)} onChange={()=>toggle(v.id)} /> <span>Select</span></label><div><b>{niceDate(v.visit_date)} {timeLabel(v.scheduled_start_time)}</b><div style={S.muted}>{serviceMap[v.service_id]?.name || "Service"} · {visitPetsFor(v, visitPets, petMap).map(p=>p.name).join(", ")}</div></div><b>{money(visitChargeTotal(v))}</b><button style={S.primaryMini} onClick={()=>onMarkPaid(v.id)}>Mark Paid</button></div>)}
      </div> : <Empty text="No unpaid completed visits for this owner." />}
    </Panel>
    <Panel title="Paid Visits">
      {paid.length ? paid.slice(0,25).map(v=><div key={v.id} style={S.billingRowCompact}><div><b>{niceDate(v.visit_date)} {timeLabel(v.scheduled_start_time)}</b><div style={S.muted}>{serviceMap[v.service_id]?.name || "Service"} · {visitPetsFor(v, visitPets, petMap).map(p=>p.name).join(", ")} · {v.payment_method || "No method"}</div></div><b>{money(visitChargeTotal(v))}</b><small>{v.paid_at ? niceDate(String(v.paid_at).slice(0,10)) : "Paid"}</small><button style={S.secondaryMini} onClick={()=>onMarkUnpaid(v.id)}>Mark Unpaid</button></div>) : <Empty text="No paid visits yet." />}
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
function ServiceForm({ value, onChange }) { return <div style={S.formGrid}>{["name","category","default_duration_minutes","base_price","extra_pet_price"].map(k=><Field key={k} label={k.replaceAll("_"," ")}><input type={["default_duration_minutes","base_price","extra_pet_price"].includes(k)?"number":"text"} value={value[k]||""} onChange={e=>onChange({...value,[k]:e.target.value})}/></Field>)}<Field label="service color"><div style={S.colorPickRow}>{DEFAULT_SERVICE_COLORS.map(c=><button key={c} type="button" title={c} onClick={()=>onChange({...value,service_color:c})} style={{...S.colorDot, background:c, outline:(value.service_color||serviceColor(value))===c?"3px solid #071746":"1px solid #dbeafe"}} />)}<input type="color" value={value.service_color || serviceColor(value)} onChange={e=>onChange({...value,service_color:e.target.value})}/></div></Field><label style={S.checkCompact}><input style={S.checkboxSmall} type="checkbox" checked={!!value.taxable} onChange={e=>onChange({...value,taxable:e.target.checked})}/> <span>Taxable</span></label><Field label="Description"><textarea value={value.description||""} onChange={e=>onChange({...value,description:e.target.value})}/></Field></div>; }
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
  app:{minHeight:"100svh",background:"radial-gradient(circle at top left,rgba(15,98,254,.10),transparent 280px),radial-gradient(circle at 80% 20%,rgba(255,51,102,.08),transparent 240px),linear-gradient(180deg,#fffaf2 0%,#ffffff 46%,#f5fbff 100%)",color:"#08153a",paddingBottom:108,fontFamily:"system-ui,Segoe UI,Roboto,sans-serif"},
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
  bottomNav:{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"min(100%,430px)",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7,padding:"10px 10px calc(10px + env(safe-area-inset-bottom))",background:"rgba(255,255,255,.94)",borderTop:"1px solid rgba(191,219,254,.9)",borderLeft:"1px solid rgba(191,219,254,.55)",borderRight:"1px solid rgba(191,219,254,.55)",borderRadius:"24px 24px 0 0",backdropFilter:"blur(16px)",zIndex:40,boxShadow:"0 -18px 42px rgba(8,21,58,.12)"},
  navBtn:{border:"0",background:"transparent",borderRadius:18,padding:0,fontWeight:850,color:"#334155",fontSize:13,display:"grid",placeItems:"stretch",position:"relative",minHeight:64,overflow:"visible",boxShadow:"none",aspectRatio:"1/1"},
  navActive:{border:"0",outline:"3px solid #0f62fe",outlineOffset:0,background:"transparent",borderRadius:18,padding:0,fontWeight:950,color:"#0f62fe",fontSize:13,display:"grid",placeItems:"stretch",position:"relative",boxShadow:"0 14px 30px rgba(8,21,58,.16)",minHeight:68,overflow:"visible",aspectRatio:"1/1"},
  navIcon:{lineHeight:1,display:"grid",placeItems:"center",color:"currentColor"},
  primaryBtn:{border:0,background:"linear-gradient(135deg,#0f62fe 0%,#19b7ff 45%,#2dd4bf 100%)",color:"#fff",borderRadius:999,padding:"12px 18px",fontWeight:950,boxShadow:"0 14px 28px rgba(15,98,254,.22)",minHeight:46},
  secondaryBtn:{border:"1px solid #bfdbfe",background:"rgba(255,255,255,.96)",color:"#071746",borderRadius:999,padding:"11px 16px",fontWeight:900,minHeight:44,boxShadow:"0 8px 18px rgba(8,21,58,.055)"},
  ghostBtn:{border:"1px solid #dbeafe",background:"rgba(255,255,255,.82)",borderRadius:999,padding:"10px 14px",fontWeight:900},
  refreshBtn:{border:"1px solid #dbeafe",background:"rgba(255,255,255,.80)",borderRadius:999,padding:"8px 11px",fontWeight:950,fontSize:18,minWidth:44,boxShadow:"0 12px 24px rgba(8,21,58,.08)"},
  dangerBtn:{border:0,background:"linear-gradient(135deg,#e11d48,#fb7185)",color:"#fff",borderRadius:999,padding:"12px 16px",fontWeight:950,boxShadow:"0 12px 24px rgba(225,29,72,.20)"},
  primaryMini:{border:0,background:"linear-gradient(135deg,#0f62fe,#2dd4bf)",color:"#fff",borderRadius:14,padding:"9px 11px",fontWeight:900,boxShadow:"0 9px 16px rgba(15,98,254,.18)"},
  secondaryMini:{border:"1px solid #bfdbfe",background:"#fff",borderRadius:14,padding:"9px 11px",fontWeight:900},
  dangerMini:{border:0,background:"#ffe4e6",color:"#be123c",borderRadius:14,padding:"9px 11px",fontWeight:900},
  cardActionsCompact:{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginTop:8},
  sheetShade:{position:"fixed",inset:0,background:"rgba(8,21,58,.40)",zIndex:95,display:"grid",alignItems:"end",padding:"16px 12px calc(16px + env(safe-area-inset-bottom))"},
  actionSheet:{width:"min(430px,100%)",margin:"0 auto",background:"#fff",borderRadius:"26px 26px 20px 20px",padding:16,boxShadow:"0 -26px 80px rgba(8,21,58,.30)",border:"1px solid #dbeafe",display:"grid",gap:12},
  sheetHandle:{width:48,height:5,borderRadius:999,background:"#cbd5e1",justifySelf:"center"},
  sheetHead:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10},
  sheetMeta:{color:"#64748b",fontWeight:800},
  sheetActions:{display:"grid",gap:10},
  actionsMenu:{position:"relative",display:"inline-block"},
  actionsSummary:{listStyle:"none",cursor:"pointer",border:"1px solid #bfdbfe",background:"#fff",borderRadius:14,padding:"9px 11px",fontWeight:900,fontSize:14},
  actionsBody:{position:"absolute",right:0,top:"calc(100% + 6px)",zIndex:30,display:"grid",gap:6,minWidth:140,padding:8,border:"1px solid #dbeafe",borderRadius:14,background:"#fff",boxShadow:"0 16px 34px rgba(8,21,58,.18)"},
  colorPickRow:{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"},
  colorDot:{width:32,height:32,borderRadius:999,border:0,boxShadow:"0 8px 18px rgba(8,21,58,.16)"},
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
  subTabs:{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:10,margin:"10px 0 14px"},
  ownerSubGrid:{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:10,margin:"10px 0 14px"},
  petSubGrid:{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:10,margin:"10px 0 14px"},
  subTab:{border:"0",background:"transparent",borderRadius:22,padding:0,fontWeight:850,whiteSpace:"normal",display:"grid",placeItems:"stretch",minWidth:0,color:"#334155",minHeight:0,aspectRatio:"1/1",textAlign:"center",overflow:"visible",position:"relative",boxShadow:"none"},
  subTabActive:{border:"0",outline:"3px solid #0f62fe",outlineOffset:0,background:"transparent",borderRadius:22,padding:0,fontWeight:950,color:"#0f62fe",whiteSpace:"normal",display:"grid",placeItems:"stretch",minWidth:0,minHeight:0,aspectRatio:"1/1",textAlign:"center",boxShadow:"0 14px 30px rgba(15,98,254,.16)",overflow:"visible",position:"relative"},
  subTabIcon:{lineHeight:1,display:"grid",placeItems:"center",color:"currentColor"},
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
  officeNav:{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:10,margin:"4px 0 12px"},
  officeIcon:{display:"grid",placeItems:"center",color:"currentColor"},
  officeBtn:{border:"0",background:"transparent",borderRadius:22,padding:0,fontWeight:900,display:"grid",placeItems:"stretch",color:"#334155",minHeight:0,aspectRatio:"1/1",boxShadow:"none",position:"relative",overflow:"visible"},
  officeActive:{border:"0",outline:"3px solid #0f62fe",outlineOffset:0,background:"transparent",borderRadius:22,padding:0,fontWeight:950,color:"#0f62fe",display:"grid",placeItems:"stretch",minHeight:0,aspectRatio:"1/1",boxShadow:"0 14px 30px rgba(15,98,254,.16)",position:"relative",overflow:"visible"},
  scheduleFilters:{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:10,margin:"0 0 12px"},
  scheduleFilter:{border:"0",background:"transparent",borderRadius:22,padding:0,fontWeight:900,display:"grid",placeItems:"stretch",color:"#334155",minHeight:0,aspectRatio:"1/1",position:"relative",overflow:"visible",boxShadow:"none"},
  scheduleFilterActive:{border:"0",outline:"3px solid #0f62fe",outlineOffset:0,background:"transparent",borderRadius:22,padding:0,fontWeight:950,display:"grid",placeItems:"stretch",color:"#0f62fe",minHeight:0,aspectRatio:"1/1",boxShadow:"0 14px 30px rgba(15,98,254,.16)",position:"relative",overflow:"visible"},
  filterPills:{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:8,margin:"0 0 12px"},
  filterPill:{border:"1px solid #dbeafe",background:"#fff",borderRadius:999,padding:"10px 8px",fontWeight:900,color:"#334155",boxShadow:"0 8px 16px rgba(8,21,58,.055)"},
  filterPillActive:{border:"1px solid #0f62fe",background:"linear-gradient(145deg,#eff6ff,#ffffff)",borderRadius:999,padding:"10px 8px",fontWeight:950,color:"#0f62fe",boxShadow:"0 10px 22px rgba(15,98,254,.14)"},
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
  callBtn:{display:"inline-flex",alignItems:"center",justifyContent:"center",minHeight:38,padding:"8px 14px",borderRadius:999,background:"#fff",border:"1px solid #bfdbfe",color:"#071746",fontWeight:950,textDecoration:"none",boxShadow:"0 8px 16px rgba(8,21,58,.08)"},
  dangerZone:{border:"1px solid #fecaca",borderRadius:18,padding:12,background:"#fff1f2",display:"grid",gap:6},
  visitHistory:{display:"grid",gridTemplateColumns:"1fr",gap:8,alignItems:"start",border:"1px solid #dbeafe",borderRadius:16,padding:11,background:"#fff"},
  recentVisitRow:{display:"grid",gridTemplateColumns:"1fr",gap:6,borderTop:"1px solid #eff6ff",paddingTop:9},
  printOverlay:{position:"fixed",inset:0,zIndex:100,background:"#fff",overflow:"auto",padding:16},
  printToolbar:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"},
  printPaper:{maxWidth:820,margin:"0 auto",background:"#fff",padding:20,border:"1px solid #e5e7eb",borderRadius:16},
  docPaper:{background:"#fff",color:"#111827",fontFamily:"system-ui,Segoe UI,sans-serif"},
  docHeader:{display:"flex",justifyContent:"space-between",gap:20,borderBottom:"2px solid #111827",paddingBottom:16,marginBottom:16},
  docSection:{marginTop:16},
  iconTileFill:{position:"absolute",inset:0,borderRadius:"inherit",overflow:"hidden",background:"transparent",display:"block",boxShadow:"0 10px 22px rgba(8,21,58,.12)"},
  iconTileImage:{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"contain",display:"block",transformOrigin:"center"},
  iconTileShine:{position:"absolute",inset:0,background:"transparent",pointerEvents:"none"},
  iconTileScrim:{position:"absolute",left:0,right:0,bottom:0,height:"42%",borderRadius:"0 0 inherit inherit",background:"linear-gradient(180deg,rgba(8,21,58,0),rgba(8,21,58,.42))",pointerEvents:"none"},
  iconTileLabel:{position:"relative",zIndex:2,alignSelf:"end",justifySelf:"center",textAlign:"center",color:"#fff",fontWeight:950,fontSize:14,lineHeight:1.06,textShadow:"0 2px 8px rgba(8,21,58,.72)",padding:"0 6px 10px",letterSpacing:".1px"},
  navTileLabel:{fontSize:10,padding:"0 4px 8px",lineHeight:1.05},
  officeTileLabel:{fontSize:13,padding:"0 5px 9px"},

  highlightCard:{outline:"3px solid rgba(15,98,254,.45)",boxShadow:"0 0 0 6px rgba(15,98,254,.10),0 18px 42px rgba(15,98,254,.22)"},
  calendarWrap:{display:"grid",gap:10,border:"1px solid #dbeafe",borderRadius:22,padding:12,background:"linear-gradient(145deg,#ffffff,#f8fbff)",boxShadow:"0 12px 26px rgba(8,21,58,.06)",marginBottom:12},
  calendarHead:{display:"grid",gridTemplateColumns:"auto 1fr auto auto",gap:8,alignItems:"center"},
  calendarWeek:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:5,textAlign:"center",fontSize:11,color:"#64748b"},
  calendarGrid:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:5},
  calendarDay:{border:"1px solid #dbeafe",background:"#fff",borderRadius:12,minHeight:55,padding:5,textAlign:"left",display:"grid",alignContent:"space-between"},
  calendarDayMuted:{border:"1px solid #eef2ff",background:"#f8fafc",color:"#94a3b8",borderRadius:12,minHeight:55,padding:5,textAlign:"left",display:"grid",alignContent:"space-between",opacity:.72},
  calendarDaySelected:{border:"2px solid #0f62fe",background:"linear-gradient(145deg,#eff6ff,#ffffff)",borderRadius:12,minHeight:55,padding:4,textAlign:"left",display:"grid",alignContent:"space-between",boxShadow:"0 10px 20px rgba(15,98,254,.16)"},
  calendarDayNum:{fontSize:12,fontWeight:950},
  calendarDots:{display:"flex",gap:3,alignItems:"center",flexWrap:"wrap",minHeight:12},
  calendarDot:{width:7,height:7,borderRadius:999,display:"inline-block",boxShadow:"0 2px 5px rgba(8,21,58,.18)"},
  calendarMore:{fontSize:9,fontWeight:950,color:"#475569"},
  selectedDateBar:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,padding:"9px 10px",borderRadius:14,background:"#eff6ff",fontWeight:900,color:"#071746"},
  tripRow:{display:"grid",gridTemplateColumns:"1fr auto auto",gap:8,alignItems:"center",borderTop:"1px solid #eff6ff",paddingTop:8},
};
