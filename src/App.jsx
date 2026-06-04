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
        <button style={styles.imgRemove} onClick={e => { e.stopPropagation(); o
