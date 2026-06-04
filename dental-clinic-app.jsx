import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "dr_aditya_patients";

const initialPatients = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};

const CLINICS = { kolkata: "Kolkata", howrah: "Howrah" };

const TEETH_MAP = [
  [18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28],
  [48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38]
];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(iso) {
  if (!iso) return null;
  const diff = new Date(iso) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function buildWALink(phone, message) {
  const num = phone.replace(/\D/g, "");
  const full = num.startsWith("91") ? num : "91" + num;
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
}

// ── Top-level App ──────────────────────────────────────────────
export default function App() {
  const [patients, setPatients] = useState(initialPatients);
  const [view, setView] = useState("home"); // home | add | detail | edit
  const [selected, setSelected] = useState(null);
  const [addVisitFor, setAddVisitFor] = useState(null);
  const [search, setSearch] = useState("");
  const [clinicFilter, setClinicFilter] = useState("all");
  const [reminderView, setReminderView] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
  }, [patients]);

  const save = (list) => setPatients(list);

  const addPatient = (p) => {
    const updated = [...patients, { ...p, id: generateId(), visits: [] }];
    save(updated);
    setView("home");
  };

  const updatePatient = (p) => {
    save(patients.map(x => x.id === p.id ? p : x));
    setSelected(p);
    setView("detail");
  };

  const addVisit = (patientId, visit) => {
    const updated = patients.map(p =>
      p.id === patientId ? { ...p, visits: [...(p.visits || []), { ...visit, id: generateId() }] } : p
    );
    save(updated);
    setSelected(updated.find(p => p.id === patientId));
    setAddVisitFor(null);
  };

  const deletePatient = (id) => {
    save(patients.filter(p => p.id !== id));
    setView("home");
    setSelected(null);
  };

  const filtered = patients.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name?.toLowerCase().includes(q) || p.phone?.includes(q);
    const matchClinic = clinicFilter === "all" || p.clinic === clinicFilter;
    return matchSearch && matchClinic;
  });

  const reminders = patients.filter(p => {
    const last = p.visits?.[p.visits.length - 1];
    if (!last?.nextAppointment) return false;
    const d = daysUntil(last.nextAppointment);
    return d !== null && d <= 3 && d >= 0;
  });

  if (reminderView) return (
    <ReminderPanel
      patients={reminders}
      allPatients={patients}
      onBack={() => setReminderView(false)}
    />
  );

  if (view === "add") return (
    <PatientForm onSave={addPatient} onBack={() => setView("home")} />
  );

  if (view === "detail" && selected) return (
    <PatientDetail
      patient={selected}
      onBack={() => { setView("home"); setSelected(null); }}
      onEdit={() => setView("edit")}
      onDelete={() => deletePatient(selected.id)}
      onAddVisit={() => setAddVisitFor(selected.id)}
      addVisitFor={addVisitFor}
      onSaveVisit={(v) => addVisit(selected.id, v)}
      onCancelVisit={() => setAddVisitFor(null)}
    />
  );

  if (view === "edit" && selected) return (
    <PatientForm
      initial={selected}
      onSave={updatePatient}
      onBack={() => setView("detail")}
    />
  );

  return (
    <HomeScreen
      patients={filtered}
      allPatients={patients}
      search={search}
      setSearch={setSearch}
      clinicFilter={clinicFilter}
      setClinicFilter={setClinicFilter}
      onAdd={() => setView("add")}
      onSelect={(p) => { setSelected(p); setView("detail"); }}
      reminderCount={reminders.length}
      onReminders={() => setReminderView(true)}
    />
  );
}

// ── Home Screen ────────────────────────────────────────────────
function HomeScreen({ patients, allPatients, search, setSearch, clinicFilter, setClinicFilter, onAdd, onSelect, reminderCount, onReminders }) {
  return (
    <div style={styles.shell}>
      <div style={styles.header}>
        <div>
          <div style={styles.headerName}>Dr S Aditya</div>
          <div style={styles.headerSub}>BDS (WBUHS)</div>
        </div>
        <button style={styles.reminderBtn} onClick={onReminders}>
          🔔
          {reminderCount > 0 && <span style={styles.badge}>{reminderCount}</span>}
        </button>
      </div>

      <div style={styles.statsRow}>
        <StatBox label="Total Patients" value={allPatients.length} />
        <StatBox label="Kolkata" value={allPatients.filter(p => p.clinic === "kolkata").length} color="#38bdf8" />
        <StatBox label="Howrah" value={allPatients.filter(p => p.clinic === "howrah").length} color="#fb923c" />
      </div>

      <div style={styles.searchRow}>
        <input
          style={styles.searchInput}
          placeholder="🔍  Search name or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div style={styles.filterRow}>
        {["all","kolkata","howrah"].map(c => (
          <button
            key={c}
            style={{ ...styles.filterBtn, ...(clinicFilter === c ? styles.filterBtnActive : {}) }}
            onClick={() => setClinicFilter(c)}
          >
            {c === "all" ? "All" : CLINICS[c]}
          </button>
        ))}
      </div>

      <div style={styles.list}>
        {patients.length === 0 && (
          <div style={styles.empty}>No patients found</div>
        )}
        {patients.map(p => (
          <PatientCard key={p.id} patient={p} onClick={() => onSelect(p)} />
        ))}
      </div>

      <button style={styles.fab} onClick={onAdd}>＋</button>
    </div>
  );
}

function StatBox({ label, value, color = "#a78bfa" }) {
  return (
    <div style={styles.statBox}>
      <div style={{ ...styles.statValue, color }}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function PatientCard({ patient, onClick }) {
  const last = patient.visits?.[patient.visits.length - 1];
  const days = last?.nextAppointment ? daysUntil(last.nextAppointment) : null;
  const urgent = days !== null && days <= 3 && days >= 0;
  return (
    <div style={{ ...styles.card, ...(urgent ? styles.cardUrgent : {}) }} onClick={onClick}>
      <div style={styles.cardLeft}>
        <div style={styles.avatar}>{patient.name?.[0]?.toUpperCase() || "?"}</div>
      </div>
      <div style={styles.cardBody}>
        <div style={styles.cardName}>{patient.name}</div>
        <div style={styles.cardMeta}>{patient.age} yrs · {patient.gender} · {patient.phone}</div>
        {last?.treatment && <div style={styles.cardTreatment}>🦷 {last.treatment}</div>}
      </div>
      <div style={styles.cardRight}>
        <span style={{ ...styles.clinicPill, background: patient.clinic === "kolkata" ? "#1e3a5f" : "#3b1f0a" }}>
          {CLINICS[patient.clinic]}
        </span>
        {urgent && <div style={styles.urgentDot}>Appt {days === 0 ? "Today" : `in ${days}d`}</div>}
      </div>
    </div>
  );
}

// ── Patient Detail ─────────────────────────────────────────────
function PatientDetail({ patient, onBack, onEdit, onDelete, onAddVisit, addVisitFor, onSaveVisit, onCancelVisit }) {
  const [tab, setTab] = useState("overview");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const last = patient.visits?.[patient.visits.length - 1];

  return (
    <div style={styles.shell}>
      <div style={styles.detailHeader}>
        <button style={styles.backBtn} onClick={onBack}>← Back</button>
        <button style={styles.editBtn} onClick={onEdit}>Edit</button>
      </div>

      <div style={styles.patientHero}>
        <div style={styles.heroAvatar}>{patient.name?.[0]?.toUpperCase()}</div>
        <div>
          <div style={styles.heroName}>{patient.name}</div>
          <div style={styles.heroMeta}>{patient.age} yrs · {patient.gender}</div>
          <div style={styles.heroMeta}>{patient.phone}</div>
          <span style={{ ...styles.clinicPill, background: patient.clinic === "kolkata" ? "#1e3a5f" : "#3b1f0a", marginTop: 6, display: "inline-block" }}>
            {CLINICS[patient.clinic]}
          </span>
        </div>
      </div>

      <div style={styles.tabRow}>
        {["overview","visits","images"].map(t => (
          <button key={t} style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div style={styles.tabContent}>
        {tab === "overview" && <OverviewTab patient={patient} last={last} />}
        {tab === "visits" && (
          <VisitsTab
            patient={patient}
            addVisitFor={addVisitFor}
            onAddVisit={onAddVisit}
            onSaveVisit={onSaveVisit}
            onCancelVisit={onCancelVisit}
          />
        )}
        {tab === "images" && <ImagesTab patient={patient} />}
      </div>

      <div style={styles.detailActions}>
        {last?.nextAppointment && (
          <a
            href={buildWALink(patient.phone, `Hello ${patient.name.split(" ")[0]}, this is a reminder from Dr S Aditya. Your next dental appointment is scheduled on ${formatDate(last.nextAppointment)}. Please confirm your availability. Thank you.`)}
            target="_blank"
            rel="noreferrer"
            style={styles.waBtn}
          >
            📲 Send Appointment Reminder
          </a>
        )}
        <button style={styles.deleteBtn} onClick={() => setConfirmDelete(true)}>🗑 Delete Patient</button>
      </div>

      {confirmDelete && (
        <div style={styles.modal}>
          <div style={styles.modalBox}>
            <div style={styles.modalTitle}>Delete {patient.name}?</div>
            <div style={styles.modalSub}>This cannot be undone.</div>
            <div style={styles.modalBtns}>
              <button style={styles.modalCancel} onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button style={styles.modalConfirm} onClick={onDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewTab({ patient, last }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <InfoSection title="Personal Details">
        <InfoRow label="Blood Group" value={patient.bloodGroup || "—"} />
        <InfoRow label="Address" value={patient.address || "—"} />
        <InfoRow label="Allergies" value={patient.allergies || "None"} />
        <InfoRow label="Medical History" value={patient.medicalHistory || "None"} />
      </InfoSection>
      {last && (
        <InfoSection title="Latest Visit">
          <InfoRow label="Date" value={formatDate(last.date)} />
          <InfoRow label="Treatment" value={last.treatment || "—"} />
          <InfoRow label="Notes" value={last.notes || "—"} />
          <InfoRow label="Next Appointment" value={last.nextAppointment ? formatDate(last.nextAppointment) : "—"} />
          {last.medicines && <InfoRow label="Medicines" value={last.medicines} />}
        </InfoSection>
      )}
      {patient.toothChart && patient.toothChart.length > 0 && (
        <InfoSection title="Affected Teeth">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {patient.toothChart.map(t => (
              <span key={t} style={styles.toothPill}>{t}</span>
            ))}
          </div>
        </InfoSection>
      )}
    </div>
  );
}

function InfoSection({ title, children }) {
  return (
    <div style={styles.infoSection}>
      <div style={styles.infoTitle}>{title}</div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={styles.infoRow}>
      <span style={styles.infoLabel}>{label}</span>
      <span style={styles.infoValue}>{value}</span>
    </div>
  );
}

function VisitsTab({ patient, addVisitFor, onAddVisit, onSaveVisit, onCancelVisit }) {
  return (
    <div>
      <button style={styles.addVisitBtn} onClick={onAddVisit}>＋ Add Visit</button>
      {addVisitFor && <VisitForm onSave={onSaveVisit} onCancel={onCancelVisit} />}
      {[...(patient.visits || [])].reverse().map(v => (
        <div key={v.id} style={styles.visitCard}>
          <div style={styles.visitDate}>{formatDate(v.date)}</div>
          <div style={styles.visitTreatment}>{v.treatment}</div>
          {v.medicines && <div style={styles.visitMeta}>💊 {v.medicines}</div>}
          {v.notes && <div style={styles.visitMeta}>📝 {v.notes}</div>}
          {v.nextAppointment && (
            <div style={styles.visitNext}>
              📅 Next: {formatDate(v.nextAppointment)}
              &nbsp;&nbsp;
              <a
                href={buildWALink(patient.phone, `Hello ${patient.name.split(" ")[0]}, this is a reminder from Dr S Aditya. Your next dental appointment is on ${formatDate(v.nextAppointment)}. Please confirm. Thank you.`)}
                target="_blank"
                rel="noreferrer"
                style={styles.waMini}
              >
                WhatsApp ↗
              </a>
            </div>
          )}
          {v.affectedTeeth?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
              {v.affectedTeeth.map(t => <span key={t} style={styles.toothPill}>{t}</span>)}
            </div>
          )}
        </div>
      ))}
      {(!patient.visits || patient.visits.length === 0) && !addVisitFor && (
        <div style={styles.empty}>No visits recorded yet</div>
      )}
    </div>
  );
}

function VisitForm({ onSave, onCancel }) {
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], treatment: "", medicines: "", notes: "", nextAppointment: "", affectedTeeth: [] });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleTooth = (t) => {
    setForm(f => ({ ...f, affectedTeeth: f.affectedTeeth.includes(t) ? f.affectedTeeth.filter(x => x !== t) : [...f.affectedTeeth, t] }));
  };

  return (
    <div style={styles.visitFormBox}>
      <div style={styles.formTitle}>New Visit</div>
      <label style={styles.label}>Date</label>
      <input style={styles.input} type="date" value={form.date} onChange={e => set("date", e.target.value)} />
      <label style={styles.label}>Treatment Done</label>
      <input style={styles.input} placeholder="e.g. RCT, Scaling, Extraction..." value={form.treatment} onChange={e => set("treatment", e.target.value)} />
      <label style={styles.label}>Medicines Prescribed</label>
      <input style={styles.input} placeholder="e.g. Amoxicillin 500mg, Ibuprofen..." value={form.medicines} onChange={e => set("medicines", e.target.value)} />
      <label style={styles.label}>Notes</label>
      <textarea style={{ ...styles.input, height: 64, resize: "vertical" }} placeholder="Clinical notes..." value={form.notes} onChange={e => set("notes", e.target.value)} />
      <label style={styles.label}>Next Appointment</label>
      <input style={styles.input} type="date" value={form.nextAppointment} onChange={e => set("nextAppointment", e.target.value)} />
      <label style={styles.label}>Affected Teeth (tap to select)</label>
      <ToothSelector selected={form.affectedTeeth} onToggle={toggleTooth} />
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button style={styles.saveBtn} onClick={() => { if (form.treatment) onSave(form); }}>Save Visit</button>
        <button style={styles.cancelBtn} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function ToothSelector({ selected, onToggle }) {
  return (
    <div style={{ background: "#0f172a", borderRadius: 10, padding: 10 }}>
      {TEETH_MAP.map((row, ri) => (
        <div key={ri} style={{ display: "flex", gap: 3, justifyContent: "center", marginBottom: ri === 0 ? 6 : 0 }}>
          {row.map(t => (
            <button
              key={t}
              onClick={() => onToggle(t)}
              style={{
                width: 28, height: 28, borderRadius: 6, border: "none", cursor: "pointer", fontSize: 9, fontWeight: 700,
                background: selected.includes(t) ? "#f97316" : "#1e293b",
                color: selected.includes(t) ? "#fff" : "#94a3b8"
              }}
            >{t}</button>
          ))}
        </div>
      ))}
    </div>
  );
}

function ImagesTab({ patient }) {
  const fileRef = useRef();
  const cameraRef = useRef();
  const [images, setImages] = useState(patient._images || []);

  const handleFile = (e, type) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const newImg = { id: generateId(), src: ev.target.result, type, name: file.name, date: new Date().toISOString() };
        setImages(prev => {
          const updated = [...prev, newImg];
          // persist inline — note: large images may exceed localStorage limits
          try {
            const allP = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
            const idx = allP.findIndex(p => p.id === patient.id);
            if (idx !== -1) { allP[idx]._images = updated; localStorage.setItem(STORAGE_KEY, JSON.stringify(allP)); }
          } catch {}
          return updated;
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImg = (id) => {
    setImages(prev => {
      const updated = prev.filter(i => i.id !== id);
      try {
        const allP = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        const idx = allP.findIndex(p => p.id === patient.id);
        if (idx !== -1) { allP[idx]._images = updated; localStorage.setItem(STORAGE_KEY, JSON.stringify(allP)); }
      } catch {}
      return updated;
    });
  };

  const xrays = images.filter(i => i.type === "xray");
  const camera = images.filter(i => i.type === "camera");

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <label style={styles.imgUploadBtn}>
          📷 Camera / Photo
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple style={{ display: "none" }} onChange={e => handleFile(e, "camera")} />
        </label>
        <label style={styles.imgUploadBtn}>
          🦷 Upload X-Ray
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => handleFile(e, "xray")} />
        </label>
      </div>

      {xrays.length > 0 && (
        <>
          <div style={styles.imgSection}>X-Rays</div>
          <div style={styles.imgGrid}>
            {xrays.map(img => <ImgThumb key={img.id} img={img} onRemove={() => removeImg(img.id)} />)}
          </div>
        </>
      )}
      {camera.length > 0 && (
        <>
          <div style={styles.imgSection}>Clinical Photos</div>
          <div style={styles.imgGrid}>
            {camera.map(img => <ImgThumb key={img.id} img={img} onRemove={() => removeImg(img.id)} />)}
          </div>
        </>
      )}
      {images.length === 0 && <div style={styles.empty}>No images yet</div>}
    </div>
  );
}

function ImgThumb({ img, onRemove }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div style={styles.imgThumb} onClick={() => setOpen(true)}>
        <img src={img.src} alt={img.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} />
        <button style={styles.imgRemove} onClick={e => { e.stopPropagation(); onRemove(); }}>✕</button>
      </div>
      {open && (
        <div style={styles.lightbox} onClick={() => setOpen(false)}>
          <img src={img.src} alt={img.name} style={{ maxWidth: "95vw", maxHeight: "90vh", borderRadius: 10 }} />
          <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 8 }}>{formatDate(img.date)} · {img.name}</div>
        </div>
      )}
    </>
  );
}

// ── Patient Form ───────────────────────────────────────────────
function PatientForm({ initial, onSave, onBack }) {
  const [form, setForm] = useState(initial || { name: "", age: "", gender: "Male", phone: "", bloodGroup: "", address: "", allergies: "", medicalHistory: "", clinic: "kolkata" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={styles.shell}>
      <div style={styles.detailHeader}>
        <button style={styles.backBtn} onClick={onBack}>← Back</button>
        <div style={styles.headerName}>{initial ? "Edit Patient" : "New Patient"}</div>
      </div>
      <div style={styles.formScroll}>
        <label style={styles.label}>Full Name *</label>
        <input style={styles.input} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Patient's full name" />
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Age</label>
            <input style={styles.input} type="number" value={form.age} onChange={e => set("age", e.target.value)} placeholder="Years" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Gender</label>
            <select style={styles.input} value={form.gender} onChange={e => set("gender", e.target.value)}>
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
          </div>
        </div>
        <label style={styles.label}>Phone (WhatsApp) *</label>
        <input style={styles.input} type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="10-digit mobile number" />
        <label style={styles.label}>Blood Group</label>
        <select style={styles.input} value={form.bloodGroup} onChange={e => set("bloodGroup", e.target.value)}>
          <option value="">—</option>
          {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(bg => <option key={bg}>{bg}</option>)}
        </select>
        <label style={styles.label}>Clinic *</label>
        <select style={styles.input} value={form.clinic} onChange={e => set("clinic", e.target.value)}>
          <option value="kolkata">Kolkata</option>
          <option value="howrah">Howrah</option>
        </select>
        <label style={styles.label}>Address</label>
        <input style={styles.input} value={form.address} onChange={e => set("address", e.target.value)} placeholder="Patient's address" />
        <label style={styles.label}>Known Allergies</label>
        <input style={styles.input} value={form.allergies} onChange={e => set("allergies", e.target.value)} placeholder="e.g. Penicillin, NSAIDs..." />
        <label style={styles.label}>Medical History</label>
        <textarea style={{ ...styles.input, height: 80, resize: "vertical" }} value={form.medicalHistory} onChange={e => set("medicalHistory", e.target.value)} placeholder="Diabetes, hypertension, cardiac issues..." />
        <button
          style={{ ...styles.saveBtn, width: "100%", marginTop: 16 }}
          onClick={() => { if (form.name && form.phone) onSave(form); }}
        >
          {initial ? "Save Changes" : "Add Patient"}
        </button>
      </div>
    </div>
  );
}

// ── Reminder Panel ─────────────────────────────────────────────
function ReminderPanel({ patients, allPatients, onBack }) {
  const upcoming = allPatients.filter(p => {
    const last = p.visits?.[p.visits.length - 1];
    if (!last?.nextAppointment) return false;
    const d = daysUntil(last.nextAppointment);
    return d !== null && d >= 1 && d <= 7;
  });

  return (
    <div style={styles.shell}>
      <div style={styles.detailHeader}>
        <button style={styles.backBtn} onClick={onBack}>← Back</button>
        <div style={styles.headerName}>Reminders</div>
      </div>
      <div style={styles.formScroll}>
        {patients.length > 0 && (
          <>
            <div style={styles.reminderSection}>⚠️ Today / Overdue</div>
            {patients.map(p => <ReminderCard key={p.id} patient={p} />)}
          </>
        )}
        {upcoming.length > 0 && (
          <>
            <div style={styles.reminderSection}>📅 Next 7 Days</div>
            {upcoming.map(p => <ReminderCard key={p.id} patient={p} />)}
          </>
        )}
        {patients.length === 0 && upcoming.length === 0 && (
          <div style={styles.empty}>No upcoming reminders 🎉</div>
        )}
      </div>
    </div>
  );
}

function ReminderCard({ patient }) {
  const last = patient.visits?.[patient.visits.length - 1];
  const days = daysUntil(last?.nextAppointment);
  const msg = `Hello ${patient.name.split(" ")[0]}, this is a gentle reminder from Dr S Aditya. Your dental appointment is scheduled on ${formatDate(last?.nextAppointment)}. Please confirm your availability. Thank you.`;
  return (
    <div style={styles.reminderCard}>
      <div style={{ flex: 1 }}>
        <div style={styles.cardName}>{patient.name}</div>
        <div style={styles.cardMeta}>{patient.phone} · {CLINICS[patient.clinic]}</div>
        <div style={styles.visitNext}>
          {days === 0 ? "📍 Today" : days < 0 ? `⚠️ ${Math.abs(days)}d overdue` : `📅 In ${days} day${days !== 1 ? "s" : ""}`} — {formatDate(last?.nextAppointment)}
        </div>
      </div>
      <a href={buildWALink(patient.phone, msg)} target="_blank" rel="noreferrer" style={styles.waSmall}>
        Send
      </a>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const styles = {
  shell: { minHeight: "100vh", background: "#0a0f1e", color: "#e2e8f0", fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto", position: "relative" },
  header: { background: "linear-gradient(135deg, #1e3a5f 0%, #0a0f1e 100%)", padding: "20px 18px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  headerName: { fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: 0.3 },
  headerSub: { fontSize: 12, color: "#7dd3fc", marginTop: 2 },
  reminderBtn: { background: "transparent", border: "none", fontSize: 24, cursor: "pointer", position: "relative" },
  badge: { position: "absolute", top: -2, right: -2, background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "1px 5px" },
  statsRow: { display: "flex", gap: 10, padding: "12px 18px 0" },
  statBox: { flex: 1, background: "#111827", borderRadius: 12, padding: "10px 12px", textAlign: "center" },
  statValue: { fontSize: 22, fontWeight: 800, color: "#a78bfa" },
  statLabel: { fontSize: 10, color: "#64748b", marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  searchRow: { padding: "12px 18px 0" },
  searchInput: { width: "100%", background: "#111827", border: "1px solid #1e293b", borderRadius: 10, padding: "10px 14px", color: "#e2e8f0", fontSize: 14, boxSizing: "border-box", outline: "none" },
  filterRow: { display: "flex", gap: 8, padding: "10px 18px 0" },
  filterBtn: { flex: 1, padding: "7px 0", borderRadius: 8, border: "1px solid #1e293b", background: "#111827", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  filterBtnActive: { background: "#1e3a5f", color: "#7dd3fc", borderColor: "#3b82f6" },
  list: { flex: 1, overflowY: "auto", padding: "10px 18px 80px" },
  empty: { color: "#334155", textAlign: "center", padding: "40px 0", fontSize: 14 },
  card: { background: "#111827", borderRadius: 14, padding: "12px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", border: "1px solid #1e293b" },
  cardUrgent: { borderColor: "#f97316", boxShadow: "0 0 0 1px #f97316" },
  cardLeft: {},
  avatar: { width: 42, height: 42, borderRadius: 99, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff" },
  cardBody: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 15, fontWeight: 700, color: "#f1f5f9" },
  cardMeta: { fontSize: 12, color: "#64748b", marginTop: 2 },
  cardTreatment: { fontSize: 11, color: "#94a3b8", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  cardRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 },
  clinicPill: { fontSize: 10, fontWeight: 700, color: "#7dd3fc", borderRadius: 6, padding: "2px 7px", textTransform: "uppercase", letterSpacing: 0.5 },
  urgentDot: { fontSize: 10, color: "#f97316", fontWeight: 700 },
  fab: { position: "fixed", bottom: 24, right: 24, width: 56, height: 56, borderRadius: 99, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", color: "#fff", fontSize: 28, border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(59,130,246,0.5)", display: "flex", alignItems: "center", justifyContent: "center" },
  detailHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px 8px", background: "#0a0f1e", position: "sticky", top: 0, zIndex: 10 },
  backBtn: { background: "transparent", border: "none", color: "#7dd3fc", fontSize: 15, cursor: "pointer", fontWeight: 600 },
  editBtn: { background: "#1e293b", border: "none", color: "#94a3b8", fontSize: 13, cursor: "pointer", padding: "6px 14px", borderRadius: 8, fontWeight: 600 },
  patientHero: { display: "flex", gap: 16, padding: "10px 18px 14px", background: "#111827", borderBottom: "1px solid #1e293b" },
  heroAvatar: { width: 60, height: 60, borderRadius: 99, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: "#fff", flexShrink: 0 },
  heroName: { fontSize: 18, fontWeight: 800, color: "#f1f5f9" },
  heroMeta: { fontSize: 13, color: "#64748b", marginTop: 3 },
  tabRow: { display: "flex", borderBottom: "1px solid #1e293b", padding: "0 18px" },
  tab: { flex: 1, padding: "12px 0", background: "transparent", border: "none", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer", borderBottom: "2px solid transparent" },
  tabActive: { color: "#7dd3fc", borderBottomColor: "#3b82f6" },
  tabContent: { flex: 1, overflowY: "auto", padding: "14px 18px 100px" },
  infoSection: { background: "#111827", borderRadius: 12, padding: "12px 14px", border: "1px solid #1e293b" },
  infoTitle: { fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700, marginBottom: 10 },
  infoRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 7, gap: 12 },
  infoLabel: { fontSize: 12, color: "#64748b", flexShrink: 0, minWidth: 100 },
  infoValue: { fontSize: 13, color: "#cbd5e1", textAlign: "right", wordBreak: "break-word" },
  addVisitBtn: { background: "#1e3a5f", border: "1px solid #3b82f6", color: "#7dd3fc", borderRadius: 10, padding: "9px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 12, width: "100%" },
  visitCard: { background: "#111827", borderRadius: 12, padding: "12px 14px", marginBottom: 10, border: "1px solid #1e293b" },
  visitDate: { fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  visitTreatment: { fontSize: 15, fontWeight: 700, color: "#f1f5f9" },
  visitMeta: { fontSize: 12, color: "#94a3b8", marginTop: 4 },
  visitNext: { fontSize: 12, color: "#7dd3fc", marginTop: 6, display: "flex", alignItems: "center", gap: 8 },
  waMini: { color: "#25d366", fontSize: 12, fontWeight: 700, textDecoration: "none" },
  visitFormBox: { background: "#111827", borderRadius: 12, padding: "16px 14px", border: "1px solid #3b82f6", marginBottom: 14 },
  formTitle: { fontSize: 15, fontWeight: 700, color: "#7dd3fc", marginBottom: 12 },
  label: { fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, display: "block", marginBottom: 4, marginTop: 10 },
  input: { width: "100%", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 12px", color: "#e2e8f0", fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "inherit" },
  toothPill: { background: "#f97316", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "2px 8px" },
  saveBtn: { background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", color: "#fff", border: "none", borderRadius: 10, padding: "11px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  cancelBtn: { background: "#1e293b", color: "#94a3b8", border: "none", borderRadius: 10, padding: "11px 22px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  detailActions: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#0a0f1e", borderTop: "1px solid #1e293b", padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8, boxSizing: "border-box" },
  waBtn: { background: "#25d366", color: "#fff", border: "none", borderRadius: 10, padding: "12px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "center", textDecoration: "none", display: "block" },
  deleteBtn: { background: "transparent", color: "#ef4444", border: "1px solid #ef4444", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modalBox: { background: "#1e293b", borderRadius: 16, padding: "24px 22px", width: 280, textAlign: "center" },
  modalTitle: { fontSize: 17, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 },
  modalSub: { fontSize: 13, color: "#64748b", marginBottom: 20 },
  modalBtns: { display: "flex", gap: 10 },
  modalCancel: { flex: 1, background: "#0f172a", color: "#94a3b8", border: "none", borderRadius: 8, padding: "10px", fontSize: 14, cursor: "pointer", fontWeight: 600 },
  modalConfirm: { flex: 1, background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 14, cursor: "pointer", fontWeight: 600 },
  imgUploadBtn: { flex: 1, background: "#1e293b", border: "1px dashed #334155", color: "#94a3b8", borderRadius: 10, padding: "12px 8px", fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "center", display: "block" },
  imgSection: { fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 0.7, fontWeight: 700, marginBottom: 8, marginTop: 12 },
  imgGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 8 },
  imgThumb: { position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", cursor: "pointer", background: "#111827" },
  imgRemove: { position: "absolute", top: 3, right: 3, background: "rgba(0,0,0,0.7)", color: "#fff", border: "none", borderRadius: 99, width: 20, height: 20, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  lightbox: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 200, cursor: "pointer" },
  formScroll: { flex: 1, overflowY: "auto", padding: "14px 18px 40px" },
  reminderSection: { fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.7, fontWeight: 700, marginBottom: 8, marginTop: 12 },
  reminderCard: { background: "#111827", borderRadius: 12, padding: "12px 14px", marginBottom: 10, border: "1px solid #1e293b", display: "flex", alignItems: "center", gap: 12 },
  waSmall: { background: "#25d366", color: "#fff", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700, textDecoration: "none", flexShrink: 0 },
};
