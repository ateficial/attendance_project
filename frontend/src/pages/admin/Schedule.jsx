import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import pb from "../../lib/pb";
import {
  getAdminSchedule,
  publishScheduleVersion,
  saveAdminSchedule,
} from "../../lib/apiClient";
import Skeleton from "../../components/ui/Skeleton";

const DAY_OPTIONS = [
  { value: "sunday", label: "Sunday" },
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
];

const SLOT_OPTIONS = [
  { value: "1", label: "09:00 - 10:00", start: "09:00", end: "10:00" },
  { value: "2", label: "10:00 - 11:00", start: "10:00", end: "11:00" },
  { value: "3", label: "11:00 - 12:00", start: "11:00", end: "12:00" },
  { value: "4", label: "12:00 - 13:00", start: "12:00", end: "13:00" },
  { value: "5", label: "13:00 - 14:00", start: "13:00", end: "14:00" },
  { value: "6", label: "14:00 - 15:00", start: "14:00", end: "15:00" },
  { value: "7", label: "15:00 - 16:00", start: "15:00", end: "16:00" },
  { value: "8", label: "16:00 - 16:30", start: "16:00", end: "16:30" },
];

const SEMESTER_OPTIONS = [
  { value: "first", label: "First" },
  { value: "second", label: "Second" },
  { value: "summer", label: "Summer" },
];

function currentSemester() {
  const month = new Date().getMonth() + 1;
  return month >= 2 && month <= 8 ? "second" : "first";
}

function currentAcademicYear() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const startYear = month >= 9 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

function parseCsvLine(line) {
  const values = [];
  let buffer = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (quoted && next === '"') {
        buffer += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (ch === "," && !quoted) {
      values.push(buffer.trim());
      buffer = "";
      continue;
    }
    buffer += ch;
  }

  values.push(buffer.trim());
  return values;
}

function normalizeLookupValue(value) {
  return String(value || "").trim().toLowerCase();
}

function getSubjectLevel(subject) {
  return String(subject?.level || subject?.level_semester || "").trim();
}

function subjectMatchesLevel(subject, level) {
  const subjectLevel = getSubjectLevel(subject);
  const targetLevel = String(level || "").trim();
  return !subjectLevel || !targetLevel || subjectLevel === targetLevel;
}

function normalizeEntry(entry, fallbackFilters) {
  const slot = String(entry.lecture_slot || "");
  const slotInfo = SLOT_OPTIONS.find((item) => item.value === slot);

  return {
    id: String(entry.id || `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    day_of_week: String(entry.day_of_week || "").toLowerCase(),
    lecture_slot: slot,
    level: String(entry.level || fallbackFilters.level || ""),
    semester: String(entry.semester || fallbackFilters.semester || "").toLowerCase(),
    academic_year: String(entry.academic_year || fallbackFilters.academic_year || ""),
    subject_id: String(entry.subject_id || ""),
    session_type: String(entry.session_type || "lecture").toLowerCase(),
    professor_id: String(entry.professor_id || ""),
    ta_id: String(entry.ta_id || ""),
    room_id: String(entry.room_id || ""),
    group_id: String(entry.group_id || ""),
    section_number: String(entry.section_number || ""),
    start_time: String(entry.start_time || slotInfo?.start || ""),
    end_time: String(entry.end_time || slotInfo?.end || ""),
  };
}

export default function AdminSchedule() {
  const fileInputRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState(() => ({
    level: searchParams.get("level") || "1",
    semester: searchParams.get("semester") || currentSemester(),
    academic_year: searchParams.get("academic_year") || currentAcademicYear(),
  }));

  const [subjects, setSubjects] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [groups, setGroups] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [tas, setTAs] = useState([]);

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [draftVersionId, setDraftVersionId] = useState("");
  const [publishedVersionId, setPublishedVersionId] = useState("");
  const [dirty, setDirty] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [modal, setModal] = useState({
    open: false,
    mode: "create",
    errors: [],
    form: null,
  });

  const subjectById = useMemo(() => {
    const map = {};
    for (const row of subjects) map[row.id] = row;
    return map;
  }, [subjects]);

  const subjectByCode = useMemo(() => {
    const map = {};
    for (const row of subjects) {
      const code = normalizeLookupValue(row.subject_code || row.code);
      if (code) map[code] = row;
    }
    return map;
  }, [subjects]);

  const roomById = useMemo(() => {
    const map = {};
    for (const row of rooms) map[row.id] = row;
    return map;
  }, [rooms]);

  const groupById = useMemo(() => {
    const map = {};
    for (const row of groups) map[row.id] = row;
    return map;
  }, [groups]);

  const professorById = useMemo(() => {
    const map = {};
    for (const row of professors) map[row.id] = row;
    return map;
  }, [professors]);

  const professorByEmail = useMemo(() => {
    const map = {};
    for (const row of professors) {
      const email = normalizeLookupValue(row.email);
      if (email) map[email] = row;
    }
    return map;
  }, [professors]);

  const taById = useMemo(() => {
    const map = {};
    for (const row of tas) map[row.id] = row;
    return map;
  }, [tas]);

  const taByEmail = useMemo(() => {
    const map = {};
    for (const row of tas) {
      const email = normalizeLookupValue(row.email);
      if (email) map[email] = row;
    }
    return map;
  }, [tas]);

  const roomByName = useMemo(() => {
    const map = {};
    for (const row of rooms) {
      const candidates = [row.room_code, row.name, row.room_name, row.building].filter(Boolean);
      for (const value of candidates) {
        const key = normalizeLookupValue(value);
        if (key && !map[key]) map[key] = row;
      }
    }
    return map;
  }, [rooms]);

  const groupByName = useMemo(() => {
    const map = {};
    for (const row of groups) {
      const key = normalizeLookupValue(row.group_name);
      if (key) map[key] = row;
    }
    return map;
  }, [groups]);

  const modalSubjects = useMemo(() => {
    const level = String(modal.form?.level || "").trim();
    return subjects.filter((subject) => subjectMatchesLevel(subject, level));
  }, [subjects, modal.form?.level]);

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    const next = new URLSearchParams();
    next.set("level", filters.level);
    next.set("semester", filters.semester);
    next.set("academic_year", filters.academic_year);

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [filters.level, filters.semester, filters.academic_year, searchParams, setSearchParams]);

  useEffect(() => {
    loadSchedule({ clearVersion: true });
  }, [filters.level, filters.semester, filters.academic_year]);

  async function loadLookups() {
    setLoadingMeta(true);
    setError("");

    try {
      const [subjectRes, roomRes, groupRes, professorRes, taRes] = await Promise.all([
        pb.collection("subjects").getList(1, 500, { sort: "code" }),
        pb.collection("rooms").getList(1, 300, { sort: "room_code" }),
        pb.collection("groups").getList(1, 500, { sort: "group_name", expand: "subject_id" }),
        pb.collection("professors").getList(1, 400, { sort: "name_en" }),
        pb.collection("teaching_assistants").getList(1, 400, { sort: "name" }),
      ]);

      setSubjects(subjectRes.items || []);
      setRooms(roomRes.items || []);
      setGroups(groupRes.items || []);
      setProfessors(professorRes.items || []);
      setTAs(taRes.items || []);
    } catch (loadError) {
      setError("Failed to load schedule metadata.");
      console.error(loadError);
    } finally {
      setLoadingMeta(false);
    }
  }

  async function loadSchedule({ clearVersion }) {
    setLoading(true);
    setError("");

    try {
      const data = await getAdminSchedule(filters.level, filters.semester, filters.academic_year);
      const next = (data.entries || []).map((item) => normalizeEntry(item, filters));
      setEntries(next);
      setDirty(false);
      if (clearVersion) {
        setDraftVersionId("");
        setPublishedVersionId("");
      }
    } catch (loadError) {
      setError("Failed to load schedule for selected term.");
      console.error(loadError);
    } finally {
      setLoading(false);
    }
  }

  function newFormForCell(day, slot) {
    const slotInfo = SLOT_OPTIONS.find((item) => item.value === slot);
    return {
      id: "",
      day_of_week: day,
      lecture_slot: slot,
      level: filters.level,
      semester: filters.semester,
      academic_year: filters.academic_year,
      subject_id: "",
      session_type: "lecture",
      professor_id: "",
      ta_id: "",
      room_id: "",
      group_id: "",
      section_number: "",
      start_time: slotInfo?.start || "",
      end_time: slotInfo?.end || "",
    };
  }

  function openCreateModal(day, slot) {
    setModal({
      open: true,
      mode: "create",
      errors: [],
      form: newFormForCell(day, slot),
    });
  }

  function openEditModal(entry) {
    setModal({
      open: true,
      mode: "edit",
      errors: [],
      form: { ...entry },
    });
  }

  function closeModal() {
    setModal({ open: false, mode: "create", errors: [], form: null });
  }

  function detectConflicts(candidate, allEntries, excludeId) {
    const issues = [];

    for (const row of allEntries) {
      if (excludeId && row.id === excludeId) continue;
      if (row.day_of_week !== candidate.day_of_week) continue;
      if (row.lecture_slot !== candidate.lecture_slot) continue;

      if (candidate.room_id && row.room_id === candidate.room_id) {
        issues.push("Room already booked for this day/slot.");
      }
      if (candidate.professor_id && row.professor_id === candidate.professor_id) {
        issues.push("Professor already booked for this day/slot.");
      }
      if (candidate.ta_id && row.ta_id === candidate.ta_id) {
        issues.push("Teaching assistant already booked for this day/slot.");
      }
      if (candidate.group_id && row.group_id === candidate.group_id) {
        issues.push("Group already booked for this day/slot.");
      }
    }

    return Array.from(new Set(issues));
  }

  function validateEntryForm(form, excludeId) {
    const issues = [];
    const sessionType = String(form.session_type || "lecture").toLowerCase();

    if (!form.subject_id) issues.push("Subject is required.");
    if (!form.room_id) issues.push("Room is required.");
    if (sessionType !== "lecture" && sessionType !== "section") {
      issues.push("Session type must be lecture or section.");
    }
    if (sessionType === "lecture" && !form.professor_id) {
      issues.push("Professor is required for lecture sessions.");
    }
    if (sessionType === "section" && !form.ta_id) {
      issues.push("Teaching assistant is required for section sessions.");
    }
    if (!form.group_id) issues.push("Group is required.");
    if (!form.day_of_week) issues.push("Day is required.");
    if (!form.lecture_slot) issues.push("Slot is required.");
    if (!form.level) issues.push("Level is required.");
    if (!form.semester) issues.push("Semester is required.");
    if (!form.academic_year) issues.push("Academic year is required.");

    const subject = subjectById[form.subject_id];
    if (subject && !subjectMatchesLevel(subject, form.level)) {
      issues.push("Selected subject does not match selected level.");
    }

    const conflicts = detectConflicts(form, entries, excludeId);
    return [...issues, ...conflicts];
  }

  function saveModalEntry() {
    if (!modal.form) return;

    let normalized = normalizeEntry(modal.form, filters);
    if (normalized.session_type === "lecture") {
      normalized = { ...normalized, ta_id: "" };
    }
    if (normalized.session_type === "section") {
      normalized = { ...normalized, professor_id: "" };
    }

    const excludeId = modal.mode === "edit" ? normalized.id : "";
    const issues = validateEntryForm(normalized, excludeId);

    if (issues.length > 0) {
      setModal((prev) => ({ ...prev, errors: issues }));
      return;
    }

    if (modal.mode === "create") {
      const withId = {
        ...normalized,
        id: `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      };
      setEntries((prev) => [...prev, withId]);
      setMessage("Draft slot added.");
    } else {
      setEntries((prev) => prev.map((row) => (row.id === normalized.id ? normalized : row)));
      setMessage("Draft slot updated.");
    }

    setError("");
    setDirty(true);
    closeModal();
  }

  function removeEntry(entryId) {
    setEntries((prev) => prev.filter((row) => row.id !== entryId));
    setMessage("Draft slot removed.");
    setError("");
    setDirty(true);
  }

  function exportCsvTemplate() {
    const lines = [
      [
        "day_of_week",
        "lecture_slot",
        "subject_code",
        "session_type",
        "professor_email",
        "ta_email",
        "room_name",
        "group_name",
        "section_number",
      ].join(","),
      [
        "sunday",
        "1",
        "CS101",
        "lecture",
        "professor@university.edu",
        "",
        "A101",
        "Group 1",
        "",
      ].join(","),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `schedule-template-${filters.level}-${filters.semester}-${filters.academic_year}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importFromCsv(file) {
    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      throw new Error("CSV is empty.");
    }

    const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
    const requiredHeaders = [
      "day_of_week",
      "lecture_slot",
      "subject_code",
      "session_type",
      "professor_email",
      "ta_email",
      "room_name",
      "group_name",
      "section_number",
    ];
    const missing = requiredHeaders.filter((h) => !headers.includes(h));
    if (missing.length > 0) {
      throw new Error(`Missing headers: ${missing.join(", ")}`);
    }

    const parsed = [];
    const validationErrors = [];

    for (let i = 1; i < lines.length; i += 1) {
      const values = parseCsvLine(lines[i]);
      const row = {};
      for (let j = 0; j < headers.length; j += 1) {
        row[headers[j]] = values[j] || "";
      }

      const slot = String(row.lecture_slot || "").trim();
      const sessionType = normalizeLookupValue(row.session_type) === "section" ? "section" : "lecture";
      const subject = subjectByCode[normalizeLookupValue(row.subject_code)];
      const professor = professorByEmail[normalizeLookupValue(row.professor_email)];
      const ta = taByEmail[normalizeLookupValue(row.ta_email)];
      const room = roomByName[normalizeLookupValue(row.room_name)];
      const group = groupByName[normalizeLookupValue(row.group_name)];
      const slotInfo = SLOT_OPTIONS.find((item) => item.value === slot);

      const rowIssues = [];
      if (!subject) rowIssues.push(`Unknown subject_code: ${row.subject_code || "(empty)"}`);
      if (!slotInfo) rowIssues.push(`Invalid lecture_slot: ${slot || "(empty)"}`);
      if (!room) rowIssues.push(`Unknown room_name: ${row.room_name || "(empty)"}`);
      if (!group) rowIssues.push(`Unknown group_name: ${row.group_name || "(empty)"}`);

      if (sessionType === "lecture") {
        if (!normalizeLookupValue(row.professor_email)) rowIssues.push("professor_email is required for lecture rows.");
        if (normalizeLookupValue(row.professor_email) && !professor) {
          rowIssues.push(`Unknown professor_email: ${row.professor_email}`);
        }
      }

      if (sessionType === "section") {
        if (!normalizeLookupValue(row.ta_email)) rowIssues.push("ta_email is required for section rows.");
        if (normalizeLookupValue(row.ta_email) && !ta) {
          rowIssues.push(`Unknown ta_email: ${row.ta_email}`);
        }
      }

      if (subject && !subjectMatchesLevel(subject, filters.level)) {
        rowIssues.push(`Subject ${row.subject_code} does not match selected level ${filters.level}.`);
      }

      if (rowIssues.length > 0) {
        validationErrors.push(`line ${i + 1}: ${rowIssues[0]}`);
        continue;
      }

      const normalized = normalizeEntry(
        {
          day_of_week: String(row.day_of_week || "").toLowerCase(),
          lecture_slot: slot,
          subject_id: subject?.id || "",
          session_type: sessionType,
          professor_id: sessionType === "lecture" ? String(professor?.id || "") : "",
          ta_id: sessionType === "section" ? String(ta?.id || "") : "",
          room_id: room?.id || "",
          group_id: group?.id || "",
          section_number: row.section_number || "",
          level: String(filters.level || ""),
          semester: String(filters.semester || ""),
          academic_year: String(filters.academic_year || ""),
          start_time: slotInfo?.start || "",
          end_time: slotInfo?.end || "",
          id: `draft-import-${Date.now()}-${i}`,
        },
        filters
      );

      parsed.push(normalized);
    }

    for (const row of parsed) {
      const rowErrors = validateEntryForm(row, row.id).filter((item) => !item.includes("already booked"));
      if (rowErrors.length > 0) {
        validationErrors.push(`${row.day_of_week}-${row.lecture_slot}: ${rowErrors[0]}`);
      }

      const conflicts = detectConflicts(row, parsed, row.id);
      if (conflicts.length > 0) {
        validationErrors.push(`${row.day_of_week}-${row.lecture_slot}: ${conflicts[0]}`);
      }
    }

    if (validationErrors.length > 0) {
      throw new Error(`CSV validation failed: ${validationErrors.slice(0, 4).join(" | ")}`);
    }

    setEntries(parsed);
    setDirty(true);
    setMessage(`Imported ${parsed.length} schedule entries from CSV.`);
    setError("");
  }

  async function handleCsvFilePicked(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      await importFromCsv(file);
    } catch (importError) {
      setError(importError.message || "Failed to import CSV.");
      setMessage("");
    }
  }

  function toSavePayload() {
    return entries.map((row) => ({
      subject_id: row.subject_id,
      professor_id: row.session_type === "lecture" ? row.professor_id || "" : "",
      ta_id: row.session_type === "section" ? row.ta_id || "" : "",
      room_id: row.room_id,
      group_id: row.group_id,
      day_of_week: row.day_of_week,
      lecture_slot: row.lecture_slot,
      session_type: row.session_type === "section" ? "section" : "lecture",
      level: row.level,
      semester: row.semester,
      academic_year: row.academic_year,
      start_time: row.start_time,
      end_time: row.end_time,
      section_number: row.section_number || "",
    }));
  }

  function validateBeforeSave() {
    const issues = [];
    for (const row of entries) {
      const requiredErrors = validateEntryForm(row, row.id).filter((item) => !item.includes("already booked"));
      if (requiredErrors.length > 0) {
        issues.push(`${row.day_of_week}-${row.lecture_slot}: ${requiredErrors[0]}`);
      }

      const conflicts = detectConflicts(row, entries, row.id);
      if (conflicts.length > 0) {
        issues.push(`${row.day_of_week}-${row.lecture_slot}: ${conflicts[0]}`);
      }
    }

    return issues;
  }

  async function handleSaveDraft() {
    setMessage("");
    setError("");

    if (entries.length === 0) {
      setError("Add at least one schedule entry before saving.");
      return;
    }

    const issues = validateBeforeSave();
    if (issues.length > 0) {
      setError(`Cannot save draft. ${issues.slice(0, 3).join(" | ")}`);
      return;
    }

    setSavingDraft(true);
    try {
      const response = await saveAdminSchedule(toSavePayload());
      const nextVersionId = String(response.version_id || "");
      setDraftVersionId(nextVersionId);
      await loadSchedule({ clearVersion: false });
      setDraftVersionId(nextVersionId);
      setDirty(false);

      if (nextVersionId) {
        setMessage(`Draft saved (${response.created_count || entries.length} entries). Version ready for publish.`);
      } else {
        setMessage("Draft saved, but publish version is unavailable (schedule_versions collection not configured).");
      }
    } catch (saveError) {
      setError(saveError.message || "Failed to save draft.");
    } finally {
      setSavingDraft(false);
    }
  }

  async function handlePublish() {
    setMessage("");
    setError("");

    if (!draftVersionId) {
      setError("Save draft first to generate a publishable version.");
      return;
    }

    setPublishing(true);
    try {
      const publishedId = draftVersionId;
      await publishScheduleVersion(draftVersionId);
      setPublishedVersionId(publishedId);
      setMessage("Schedule published successfully.");
      await loadSchedule({ clearVersion: false });
      setDraftVersionId("");
      setDirty(false);
    } catch (publishError) {
      setError(publishError.message || "Failed to publish schedule.");
    } finally {
      setPublishing(false);
    }
  }

  function getCellEntries(day, slot) {
    return entries.filter((row) => row.day_of_week === day && row.lecture_slot === slot);
  }

  function resetTermFilters() {
    setFilters({
      level: "1",
      semester: currentSemester(),
      academic_year: currentAcademicYear(),
    });
  }

  function hasCellConflicts(day, slot) {
    const cellRows = getCellEntries(day, slot);
    return cellRows.some((row) => detectConflicts(row, entries, row.id).length > 0);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h2 className="text-[var(--text-3xl)] font-bold text-[var(--color-text-primary)]">Schedule Builder</h2>
          <p className="mt-1 text-[var(--text-base)] text-[var(--color-text-secondary)]">Build draft timetables by level, semester, and academic year.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportCsvTemplate}
            aria-label="Download schedule CSV template"
            className="px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] text-xs font-mono uppercase tracking-wider hover:bg-[var(--color-surface-3)]"
          >
            CSV Template
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Import schedule from CSV"
            className="px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] text-xs font-mono uppercase tracking-wider hover:bg-[var(--color-surface-3)]"
          >
            Import CSV
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft || loading}
            aria-label="Save schedule draft"
            className="px-4 py-2 rounded bg-[var(--role-primary)] text-white text-xs font-mono uppercase tracking-wider hover:bg-[var(--role-primary-strong)] disabled:opacity-60"
          >
            {savingDraft ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing || !draftVersionId}
            aria-label="Publish saved schedule draft"
            className="px-4 py-2 rounded bg-[var(--color-danger)] text-white text-xs font-mono uppercase tracking-wider hover:opacity-90 disabled:opacity-50"
          >
            {publishing ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        aria-label="Pick schedule CSV file"
        className="hidden"
        onChange={handleCsvFilePicked}
      />

      {(message || error) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            error
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="grid md:grid-cols-3 xl:grid-cols-6 gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4">
        <label className="space-y-1">
          <span className="text-[11px] text-[var(--color-text-secondary)] font-mono uppercase tracking-widest">Level</span>
          <select
            value={filters.level}
            onChange={(event) => setFilters((prev) => ({ ...prev, level: event.target.value }))}
            aria-label="Filter schedule by level"
            className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] outline-none focus:border-[var(--role-primary)] text-sm"
          >
            <option value="1">Level 1</option>
            <option value="2">Level 2</option>
            <option value="3">Level 3</option>
            <option value="4">Level 4</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[11px] text-[var(--color-text-secondary)] font-mono uppercase tracking-widest">Semester</span>
          <select
            value={filters.semester}
            onChange={(event) => setFilters((prev) => ({ ...prev, semester: event.target.value }))}
            aria-label="Filter schedule by semester"
            className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] outline-none focus:border-[var(--role-primary)] text-sm"
          >
            {SEMESTER_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[11px] text-[var(--color-text-secondary)] font-mono uppercase tracking-widest">Academic Year</span>
          <input
            value={filters.academic_year}
            onChange={(event) => setFilters((prev) => ({ ...prev, academic_year: event.target.value }))}
            aria-label="Filter schedule by academic year"
            className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] outline-none focus:border-[var(--role-primary)] text-sm"
          />
        </label>

        <div className="md:col-span-3 xl:col-span-6 flex items-center justify-start">
          <button
            type="button"
            onClick={resetTermFilters}
            aria-label="Reset schedule term filters"
            className="px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] text-xs font-mono uppercase tracking-wider hover:bg-[var(--color-surface-3)]"
          >
            Reset Filters
          </button>
        </div>

        <div className="md:col-span-3 xl:col-span-3 flex items-center justify-between bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded px-4 py-2">
          <div className="text-xs text-[var(--color-text-secondary)]">
            <div className="font-mono uppercase tracking-widest">Draft Status</div>
            <div className="mt-1 text-[var(--color-text-primary)]">
              {dirty ? "Unsaved changes" : "Synced with backend"}
              {draftVersionId ? ` | Version: ${draftVersionId.slice(0, 8)}...` : ""}
              {publishedVersionId ? " | Published" : ""}
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadSchedule({ clearVersion: true })}
            aria-label="Refresh schedule grid"
            className="px-3 py-2 rounded border border-[var(--color-border)] text-xs font-mono uppercase tracking-wider hover:bg-[var(--color-surface-2)]"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-1)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-border)] text-xs font-mono uppercase tracking-widest text-[var(--color-text-secondary)] flex justify-between items-center">
          <span>Schedule Grid</span>
          <span>{entries.length} slots</span>
        </div>

        {loading || loadingMeta ? (
          <div className="p-6">
            <Skeleton className="h-5" count={4} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-4 py-3 w-40">Slot</th>
                  {DAY_OPTIONS.map((day) => (
                    <th key={day.value} className="px-4 py-3">
                      {day.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {SLOT_OPTIONS.map((slot) => (
                  <tr key={slot.value}>
                    <td className="px-4 py-3 align-top">
                      <div className="font-semibold text-[var(--color-text-primary)]">Slot {slot.value}</div>
                      <div className="text-xs text-[var(--color-text-secondary)]">{slot.label}</div>
                    </td>

                    {DAY_OPTIONS.map((day) => {
                      const cellRows = getCellEntries(day.value, slot.value);
                      const conflicted = hasCellConflicts(day.value, slot.value);

                      return (
                        <td key={`${day.value}-${slot.value}`} className="px-3 py-3 align-top">
                          <div
                            className={`rounded-lg border p-2 min-h-24 space-y-2 ${
                              conflicted ? "border-rose-300 bg-rose-50" : "border-[var(--color-border)] bg-[var(--color-surface-2)]"
                            }`}
                          >
                            {cellRows.map((row) => {
                              const subject = subjectById[row.subject_id];
                              const professor = professorById[row.professor_id];
                              const ta = taById[row.ta_id];
                              const room = roomById[row.room_id];
                              const group = groupById[row.group_id];
                              const isSection = String(row.session_type || "").toLowerCase() === "section";

                              return (
                                <div
                                  key={row.id}
                                  className="rounded border border-[var(--color-border)] bg-[var(--color-surface-1)] p-2 cursor-pointer hover:border-[var(--role-primary)]"
                                  onClick={() => openEditModal(row)}
                                >
                                  <div className="font-semibold text-[12px] text-[var(--color-text-primary)] truncate">
                                    {subject?.code || subject?.subject_code || "Unknown Subject"}
                                  </div>
                                  <div className="text-[11px] text-[var(--color-text-secondary)] truncate">
                                    {room?.room_code || "-"} | {group?.group_name || "-"}
                                  </div>
                                  <div className="text-[11px] text-[var(--color-text-secondary)] truncate">
                                    {isSection
                                      ? `TA: ${ta?.name || ta?.name_en || ta?.name_ar || "Unassigned"}`
                                      : (professor?.name_en || professor?.name_ar || "No Professor")}
                                  </div>

                                  <div className="mt-2 flex justify-end">
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        removeEntry(row.id);
                                      }}
                                      aria-label="Remove schedule slot"
                                      className="text-[10px] px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              );
                            })}

                            <button
                              type="button"
                              onClick={() => openCreateModal(day.value, slot.value)}
                              aria-label={`Add schedule slot for ${day.label} ${slot.label}`}
                              className="w-full py-1.5 rounded border border-dashed border-[var(--color-border)] text-[11px] font-mono uppercase tracking-widest text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--role-primary)]"
                            >
                              + Add Slot
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal.open && modal.form && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-4xl mx-auto mt-10 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-1)] shadow-2xl">
            <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                {modal.mode === "create" ? "Add Schedule Slot" : "Edit Schedule Slot"}
              </h3>
              <button onClick={closeModal} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                Close
              </button>
            </div>

            <div className="p-5 grid md:grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Subject</span>
                <select
                  value={modal.form.subject_id}
                  onChange={(event) =>
                    setModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, subject_id: event.target.value },
                    }))
                  }
                  aria-label="Select subject"
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                >
                  <option value="">Select subject</option>
                  {modalSubjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {(subject.code || subject.subject_code || "-") + " - " + (subject.name_en || subject.name_ar || "-")}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Session Type</span>
                <select
                  value={modal.form.session_type}
                  onChange={(event) =>
                    setModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, session_type: event.target.value },
                    }))
                  }
                  aria-label="Select session type"
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                >
                  <option value="lecture">Lecture</option>
                  <option value="section">Section</option>
                </select>
              </label>

              {modal.form.session_type === "section" ? (
                <label className="space-y-1">
                  <span className="text-xs text-[var(--color-text-secondary)]">Teaching Assistant</span>
                  <select
                    value={modal.form.ta_id}
                    onChange={(event) =>
                      setModal((prev) => ({
                        ...prev,
                        form: { ...prev.form, ta_id: event.target.value, professor_id: "" },
                      }))
                    }
                    aria-label="Select teaching assistant"
                    className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                  >
                    <option value="">Select TA</option>
                    {tas.map((ta) => (
                      <option key={ta.id} value={ta.id}>
                        {ta.name || ta.name_en || ta.name_ar || ta.email}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="space-y-1">
                  <span className="text-xs text-[var(--color-text-secondary)]">Professor</span>
                  <select
                    value={modal.form.professor_id}
                    onChange={(event) =>
                      setModal((prev) => ({
                        ...prev,
                        form: { ...prev.form, professor_id: event.target.value, ta_id: "" },
                      }))
                    }
                    aria-label="Select professor"
                    className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                  >
                    <option value="">Select professor</option>
                    {professors.map((professor) => (
                      <option key={professor.id} value={professor.id}>
                        {professor.name_en || professor.name_ar || professor.email}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Group</span>
                <select
                  value={modal.form.group_id}
                  onChange={(event) =>
                    setModal((prev) => ({
                      ...prev,
                      form: {
                        ...prev.form,
                        group_id: event.target.value,
                        section_number: groupById[event.target.value]?.section_number
                          ? String(groupById[event.target.value].section_number)
                          : prev.form.section_number,
                      },
                    }))
                  }
                  aria-label="Select group"
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                >
                  <option value="">Select group</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.group_name} {group.section_number ? `(S${group.section_number})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Room</span>
                <select
                  value={modal.form.room_id}
                  onChange={(event) =>
                    setModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, room_id: event.target.value },
                    }))
                  }
                  aria-label="Select room"
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                >
                  <option value="">Select room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.room_code} ({room.building})
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Day</span>
                <select
                  value={modal.form.day_of_week}
                  onChange={(event) =>
                    setModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, day_of_week: event.target.value },
                    }))
                  }
                  aria-label="Select day"
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                >
                  {DAY_OPTIONS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Slot</span>
                <select
                  value={modal.form.lecture_slot}
                  onChange={(event) => {
                    const slotInfo = SLOT_OPTIONS.find((item) => item.value === event.target.value);
                    setModal((prev) => ({
                      ...prev,
                      form: {
                        ...prev.form,
                        lecture_slot: event.target.value,
                        start_time: slotInfo?.start || prev.form.start_time,
                        end_time: slotInfo?.end || prev.form.end_time,
                      },
                    }));
                  }}
                  aria-label="Select lecture slot"
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                >
                  {SLOT_OPTIONS.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {`Slot ${slot.value} (${slot.label})`}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Start Time</span>
                <input
                  value={modal.form.start_time}
                  onChange={(event) =>
                    setModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, start_time: event.target.value },
                    }))
                  }
                  aria-label="Set start time"
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">End Time</span>
                <input
                  value={modal.form.end_time}
                  onChange={(event) =>
                    setModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, end_time: event.target.value },
                    }))
                  }
                  aria-label="Set end time"
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Section Number</span>
                <input
                  value={modal.form.section_number}
                  onChange={(event) =>
                    setModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, section_number: event.target.value },
                    }))
                  }
                  aria-label="Set section number"
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Level</span>
                <input
                  value={modal.form.level}
                  onChange={(event) =>
                    setModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, level: event.target.value },
                    }))
                  }
                  aria-label="Set level"
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Semester</span>
                <select
                  value={modal.form.semester}
                  onChange={(event) =>
                    setModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, semester: event.target.value },
                    }))
                  }
                  aria-label="Set semester"
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                >
                  {SEMESTER_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Academic Year</span>
                <input
                  value={modal.form.academic_year}
                  onChange={(event) =>
                    setModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, academic_year: event.target.value },
                    }))
                  }
                  aria-label="Set academic year"
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                />
              </label>
            </div>

            {modal.errors.length > 0 && (
              <div className="px-5 pb-2 text-sm text-rose-700">
                {modal.errors.map((issue) => (
                  <div key={issue}>- {issue}</div>
                ))}
              </div>
            )}

            <div className="px-5 py-4 border-t border-[var(--color-border)] flex items-center justify-end gap-2">
              {modal.mode === "edit" ? (
                <button
                  type="button"
                  onClick={() => {
                    removeEntry(modal.form.id);
                    closeModal();
                  }}
                  className="px-4 py-2 rounded border border-red-300 text-red-700 text-sm hover:bg-red-50"
                >
                  Delete
                </button>
              ) : null}
              <button type="button" onClick={closeModal} className="px-4 py-2 rounded border border-[var(--color-border)] text-sm">
                Cancel
              </button>
              <button type="button" onClick={saveModalEntry} className="px-4 py-2 rounded bg-[var(--role-primary)] text-white text-sm font-medium">
                Save Slot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
