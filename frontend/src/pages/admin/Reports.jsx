import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import pb from "../../lib/pb";
import {
  exportToExcel,
  exportToPDF,
  getSubjectAttendanceExportData,
} from "../../lib/apiClient";
import Skeleton from "../../components/ui/Skeleton";
import ErrorBanner from "../../components/ui/ErrorBanner";

const REPORT_TABS = [
  { key: "sessions", label: "Session Reports" },
  { key: "warnings", label: "Student Warnings" },
];

function normalizeLevel(value) {
  return String(value || "").trim();
}

function warningFromAttendancePct(attendancePct) {
  if (attendancePct < 50) return "critical";
  if (attendancePct < 60) return "danger";
  if (attendancePct < 75) return "warning";
  return "ok";
}

function warningBadgeClass(level) {
  if (level === "critical") return "bg-rose-100 text-rose-700 border-rose-300";
  if (level === "danger") return "bg-orange-100 text-orange-700 border-orange-300";
  return "bg-amber-100 text-amber-700 border-amber-300";
}

function toDateOnly(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

export default function AdminReports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    REPORT_TABS.some((tab) => tab.key === initialTab) ? initialTab : "sessions"
  );

  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [tas, setTAs] = useState([]);

  const [sessionFilters, setSessionFilters] = useState({
    level: searchParams.get("session_level") || "",
    subject_id: searchParams.get("session_subject") || "",
    date_from: searchParams.get("date_from") || "",
    date_to: searchParams.get("date_to") || "",
    search: (searchParams.get("session_search") || "").trim(),
  });

  const [sessionSearchInput, setSessionSearchInput] = useState(searchParams.get("session_search") || "");

  const [warningFilters, setWarningFilters] = useState({
    level: searchParams.get("warning_level") || "",
    subject_id: searchParams.get("warning_subject") || "",
    threshold: searchParams.get("warning_threshold") || "75",
  });

  const [warningsRows, setWarningsRows] = useState([]);
  const [warningsLoading, setWarningsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const subjectById = useMemo(() => {
    const map = {};
    for (const row of subjects) map[row.id] = row;
    return map;
  }, [subjects]);

  const scheduleById = useMemo(() => {
    const map = {};
    for (const row of schedules) map[row.id] = row;
    return map;
  }, [schedules]);

  const roomById = useMemo(() => {
    const map = {};
    for (const row of rooms) map[row.id] = row;
    return map;
  }, [rooms]);

  const professorById = useMemo(() => {
    const map = {};
    for (const row of professors) map[row.id] = row;
    return map;
  }, [professors]);

  const taById = useMemo(() => {
    const map = {};
    for (const row of tas) map[row.id] = row;
    return map;
  }, [tas]);

  const sessionDateError = useMemo(() => {
    if (!sessionFilters.date_from || !sessionFilters.date_to) return "";
    return sessionFilters.date_from > sessionFilters.date_to
      ? "Date range is invalid: from-date must be earlier than or equal to to-date."
      : "";
  }, [sessionFilters.date_from, sessionFilters.date_to]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSessionFilters((prev) => ({ ...prev, search: sessionSearchInput.trim() }));
    }, 300);

    return () => clearTimeout(timer);
  }, [sessionSearchInput]);

  useEffect(() => {
    const next = new URLSearchParams();
    next.set("tab", activeTab);

    if (sessionFilters.level) next.set("session_level", sessionFilters.level);
    if (sessionFilters.subject_id) next.set("session_subject", sessionFilters.subject_id);
    if (sessionFilters.date_from) next.set("date_from", sessionFilters.date_from);
    if (sessionFilters.date_to) next.set("date_to", sessionFilters.date_to);
    if (sessionSearchInput.trim()) next.set("session_search", sessionSearchInput.trim());

    if (warningFilters.level) next.set("warning_level", warningFilters.level);
    if (warningFilters.subject_id) next.set("warning_subject", warningFilters.subject_id);
    if (warningFilters.threshold && warningFilters.threshold !== "75") {
      next.set("warning_threshold", warningFilters.threshold);
    }

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [
    activeTab,
    sessionFilters.level,
    sessionFilters.subject_id,
    sessionFilters.date_from,
    sessionFilters.date_to,
    sessionSearchInput,
    warningFilters.level,
    warningFilters.subject_id,
    warningFilters.threshold,
    searchParams,
    setSearchParams,
  ]);

  useEffect(() => {
    if (activeTab === "warnings") {
      loadWarnings();
    }
  }, [activeTab, warningFilters.level, warningFilters.subject_id, warningFilters.threshold]);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [subjectRows, sessionRows, roomRows, scheduleRows, professorRows, taRows] = await Promise.all([
        pb.collection("subjects").getFullList({ sort: "code" }),
        pb.collection("sessions").getFullList({ sort: "-start_time" }),
        pb.collection("rooms").getFullList({ sort: "room_code" }),
        pb.collection("schedules").getFullList({ sort: "day_of_week,start_time" }),
        pb.collection("professors").getFullList({ sort: "name_en" }),
        pb.collection("teaching_assistants").getFullList({ sort: "name" }),
      ]);

      setSubjects(subjectRows || []);
      setSessions(sessionRows || []);
      setRooms(roomRows || []);
      setSchedules(scheduleRows || []);
      setProfessors(professorRows || []);
      setTAs(taRows || []);
    } catch (loadError) {
      console.error(loadError);
      setError("Failed to load report data.");
    } finally {
      setLoading(false);
    }
  }

  const sessionRows = useMemo(() => {
    return sessions.map((session) => {
      const schedule = scheduleById[session.schedule_id] || null;
      const subject = schedule ? subjectById[schedule.subject_id] : null;
      const room = schedule ? roomById[schedule.room_id] : null;

      const professor = schedule?.professor_id ? professorById[schedule.professor_id] : null;
      const ta = schedule?.ta_id ? taById[schedule.ta_id] : null;

      const present = Number(session.present_count || 0);
      const absent = Number(session.absent_count || 0);
      const late = Number(session.late_count || 0);
      const total = Number(session.total_students || present + absent + late);
      const attendancePct = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

      return {
        id: session.id,
        date: session.start_time,
        date_only: toDateOnly(session.start_time),
        level: normalizeLevel(subject?.level || schedule?.level),
        subject_id: subject?.id || schedule?.subject_id || "",
        subject_code: subject?.code || subject?.subject_code || "-",
        subject_name: subject?.name_en || subject?.name_ar || "-",
        instructor: ta
          ? ta.name || ta.name_en || ta.name_ar || ta.email
          : professor
            ? professor.name_en || professor.name_ar || professor.email
            : "-",
        room: room?.room_code || room?.name || room?.building || "-",
        total_students: total,
        present,
        absent,
        late,
        attendance_pct: attendancePct,
      };
    });
  }, [sessions, scheduleById, subjectById, roomById, professorById, taById]);

  const filteredSessionRows = useMemo(() => {
    return sessionRows.filter((row) => {
      if (sessionFilters.level && row.level !== sessionFilters.level) return false;
      if (sessionFilters.subject_id && row.subject_id !== sessionFilters.subject_id) return false;

      if (!sessionDateError && sessionFilters.date_from && row.date_only < sessionFilters.date_from) return false;
      if (!sessionDateError && sessionFilters.date_to && row.date_only > sessionFilters.date_to) return false;

      if (sessionFilters.search) {
        const haystack = `${row.subject_code} ${row.subject_name} ${row.instructor} ${row.room} ${row.date_only}`.toLowerCase();
        if (!haystack.includes(sessionFilters.search.toLowerCase())) return false;
      }

      return true;
    });
  }, [sessionRows, sessionFilters, sessionDateError]);

  async function loadWarnings() {
    setWarningsLoading(true);
    setError("");

    try {
      const filteredSubjects = subjects.filter((subject) => {
        const level = normalizeLevel(subject.level || subject.level_semester);
        const levelMatch = !warningFilters.level || level === warningFilters.level;
        const subjectMatch = !warningFilters.subject_id || subject.id === warningFilters.subject_id;
        return levelMatch && subjectMatch;
      });

      const subjectIds = filteredSubjects.map((subject) => subject.id);
      if (subjectIds.length === 0) {
        setWarningsRows([]);
        return;
      }

      const reports = await Promise.all(subjectIds.map((subjectId) => getSubjectAttendanceExportData(subjectId)));

      const byStudentSubject = {};
      for (const report of reports) {
        const subject = report.subject || {};
        const subjectId = subject.id;

        for (const session of report.sessions || []) {
          for (const record of session.records || []) {
            const key = `${subjectId}:${record.student_id}`;
            if (!byStudentSubject[key]) {
              byStudentSubject[key] = {
                student_id: record.student_id,
                student_id_number: record.student_id_number || "",
                student_name: record.student_name || "",
                subject_id: subject.id,
                subject_code: subject.code || "",
                subject_name: subject.name || "",
                level: normalizeLevel(subjectById[subject.id]?.level),
                total: 0,
                attended: 0,
                absent: 0,
              };
            }

            const row = byStudentSubject[key];
            row.total += 1;

            const status = String(record.status || "").toLowerCase();
            if (status === "present" || status === "late") {
              row.attended += 1;
            } else if (status === "absent") {
              row.absent += 1;
            }
          }
        }
      }

      const threshold = Number(warningFilters.threshold || 75);
      const rows = Object.values(byStudentSubject)
        .map((row) => {
          const attendancePct = row.total > 0 ? (row.attended / row.total) * 100 : 0;
          const absencePct = row.total > 0 ? (row.absent / row.total) * 100 : 0;
          const warningLevel = warningFromAttendancePct(attendancePct);

          return {
            student_id: row.student_id,
            student_id_number: row.student_id_number,
            student_name: row.student_name,
            level: row.level || "-",
            subject_id: row.subject_id,
            subject_code: row.subject_code,
            subject_name: row.subject_name,
            attendance_pct: Number(attendancePct.toFixed(2)),
            absence_pct: Number(absencePct.toFixed(2)),
            warning_level: warningLevel,
          };
        })
        .filter((row) => row.attendance_pct < threshold)
        .filter((row) => row.warning_level !== "ok")
        .sort((a, b) => b.absence_pct - a.absence_pct);

      setWarningsRows(rows);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError.message || "Failed to load warnings report.");
    } finally {
      setWarningsLoading(false);
    }
  }

  async function exportSessionReport(format) {
    if (sessionDateError) {
      setError(sessionDateError);
      return;
    }

    if (filteredSessionRows.length === 0) return;

    setExporting(true);
    setMessage("");
    setError("");

    try {
      const rows = [];
      const subjectIds = sessionFilters.subject_id
        ? [sessionFilters.subject_id]
        : [...new Set(filteredSessionRows.map((item) => item.subject_id).filter(Boolean))];

      for (const subjectId of subjectIds) {
        const payload = await getSubjectAttendanceExportData(
          subjectId,
          sessionFilters.date_from || undefined,
          sessionFilters.date_to || undefined
        );

        const subjectName = payload.subject?.name || payload.subject?.code || "";
        const subjectCode = payload.subject?.code || "";

        for (const session of payload.sessions || []) {
          let present = 0;
          let absent = 0;
          let late = 0;

          for (const record of session.records || []) {
            const status = String(record.status || "").toLowerCase();
            if (status === "present") present += 1;
            else if (status === "late") late += 1;
            else if (status === "absent") absent += 1;
          }

          const total = present + absent + late;
          const attendancePct = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

          rows.push({
            session_date: session.date,
            subject: `${subjectCode} ${subjectName}`.trim(),
            instructor: session.instructor || "-",
            total_students: total,
            present,
            absent,
            late,
            attendance_percentage: `${attendancePct}%`,
          });
        }
      }

      const columns = [
        { key: "session_date", label: "Session Date" },
        { key: "subject", label: "Subject" },
        { key: "instructor", label: "Professor/TA" },
        { key: "total_students", label: "Total Students" },
        { key: "present", label: "Present" },
        { key: "absent", label: "Absent" },
        { key: "late", label: "Late" },
        { key: "attendance_percentage", label: "Attendance %" },
      ];

      if (format === "excel") {
        exportToExcel(rows, columns, "admin-session-reports");
      } else {
        exportToPDF(rows, "Admin Session Reports", columns, "admin-session-reports", {
          Level: sessionFilters.level || "All",
          Subject: sessionFilters.subject_id
            ? subjectById[sessionFilters.subject_id]?.name_en || subjectById[sessionFilters.subject_id]?.name_ar || "Selected"
            : "All",
          "Date From": sessionFilters.date_from || "Any",
          "Date To": sessionFilters.date_to || "Any",
        });
      }

      setMessage("Session report exported successfully.");
    } catch (exportError) {
      console.error(exportError);
      setError(exportError.message || "Failed to export session report.");
    } finally {
      setExporting(false);
    }
  }

  function exportWarnings(format) {
    if (warningsRows.length === 0) return;

    const rows = warningsRows.map((row) => ({
      student_id: row.student_id_number || row.student_id,
      student_name: row.student_name,
      level: row.level,
      subject: `${row.subject_code} ${row.subject_name}`.trim(),
      absence_percentage: `${Math.round(row.absence_pct)}%`,
      warning_level: row.warning_level,
    }));

    const columns = [
      { key: "student_id", label: "Student ID" },
      { key: "student_name", label: "Name" },
      { key: "level", label: "Level" },
      { key: "subject", label: "Subject" },
      { key: "absence_percentage", label: "Absence %" },
      { key: "warning_level", label: "Warning Level" },
    ];

    if (format === "excel") {
      exportToExcel(rows, columns, "admin-student-warnings");
    } else {
      exportToPDF(rows, "Admin Student Warnings", columns, "admin-student-warnings", {
        Level: warningFilters.level || "All",
        Subject: warningFilters.subject_id
          ? subjectById[warningFilters.subject_id]?.name_en || subjectById[warningFilters.subject_id]?.name_ar || "Selected"
          : "All",
        Threshold: `< ${warningFilters.threshold}% attendance`,
      });
    }
  }

  function resetSessionFilters() {
    setSessionFilters({
      level: "",
      subject_id: "",
      date_from: "",
      date_to: "",
      search: "",
    });
    setSessionSearchInput("");
  }

  function clearSessionDateRange() {
    setSessionFilters((prev) => ({
      ...prev,
      date_from: "",
      date_to: "",
    }));
  }

  function resetWarningFilters() {
    setWarningFilters({
      level: "",
      subject_id: "",
      threshold: "75",
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[var(--text-3xl)] font-bold text-[var(--color-text-primary)]">Reports</h2>
        <p className="mt-1 text-[var(--text-base)] text-[var(--color-text-secondary)]">Session analytics and student warning reports.</p>
      </div>

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

      <div className="flex flex-wrap gap-2">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            aria-label={`Switch to ${tab.label}`}
            className={`px-4 py-2 rounded text-xs font-mono uppercase tracking-wider border transition ${
              activeTab === tab.key
                ? "bg-[var(--role-primary)] text-white border-[var(--role-primary)]"
                : "bg-[var(--color-surface-2)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:bg-[var(--color-surface-3)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "sessions" && (
        <section className="space-y-4">
          <ErrorBanner message={sessionDateError} />

          <div className="grid md:grid-cols-5 gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4">
            <label className="space-y-1">
              <span className="text-[11px] text-[var(--color-text-secondary)] font-mono uppercase tracking-widest">Level</span>
              <select
                value={sessionFilters.level}
                onChange={(event) => setSessionFilters((prev) => ({ ...prev, level: event.target.value }))}
                aria-label="Filter session reports by level"
                className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
              >
                <option value="">All levels</option>
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
                <option value="3">Level 3</option>
                <option value="4">Level 4</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] text-[var(--color-text-secondary)] font-mono uppercase tracking-widest">Subject</span>
              <select
                value={sessionFilters.subject_id}
                onChange={(event) => setSessionFilters((prev) => ({ ...prev, subject_id: event.target.value }))}
                aria-label="Filter session reports by subject"
                className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
              >
                <option value="">All subjects</option>
                {subjects
                  .filter((subject) => {
                    const level = normalizeLevel(subject.level || subject.level_semester);
                    return !sessionFilters.level || level === sessionFilters.level;
                  })
                  .map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {(subject.code || subject.subject_code || "-") + " - " + (subject.name_en || subject.name_ar || "-")}
                    </option>
                  ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] text-[var(--color-text-secondary)] font-mono uppercase tracking-widest">Date From</span>
              <input
                type="date"
                value={sessionFilters.date_from}
                onChange={(event) => setSessionFilters((prev) => ({ ...prev, date_from: event.target.value }))}
                aria-label="Filter session reports from date"
                className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
              />
            </label>

            <label className="space-y-1">
              <span className="text-[11px] text-[var(--color-text-secondary)] font-mono uppercase tracking-widest">Date To</span>
              <input
                type="date"
                value={sessionFilters.date_to}
                onChange={(event) => setSessionFilters((prev) => ({ ...prev, date_to: event.target.value }))}
                aria-label="Filter session reports to date"
                className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
              />
            </label>

            <label className="space-y-1">
              <span className="text-[11px] text-[var(--color-text-secondary)] font-mono uppercase tracking-widest">Search</span>
              <input
                value={sessionSearchInput}
                onChange={(event) => setSessionSearchInput(event.target.value)}
                placeholder="Subject, room, instructor"
                aria-label="Search session reports"
                className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
              />
            </label>

            <div className="md:col-span-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={clearSessionDateRange}
                aria-label="Clear session date range"
                className="px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] text-xs font-mono uppercase tracking-wider hover:bg-[var(--color-surface-3)]"
              >
                Clear Date Range
              </button>
              <button
                type="button"
                onClick={resetSessionFilters}
                aria-label="Reset all session report filters"
                className="px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] text-xs font-mono uppercase tracking-wider hover:bg-[var(--color-surface-3)]"
              >
                Reset Filters
              </button>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => exportSessionReport("excel")}
              disabled={exporting || filteredSessionRows.length === 0}
              aria-label="Export session reports as Excel"
              className="px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] text-xs font-mono uppercase tracking-wider hover:bg-[var(--color-surface-3)] disabled:opacity-50"
            >
              Export Excel
            </button>
            <button
              type="button"
              onClick={() => exportSessionReport("pdf")}
              disabled={exporting || filteredSessionRows.length === 0}
              aria-label="Export session reports as PDF"
              className="px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] text-xs font-mono uppercase tracking-wider hover:bg-[var(--color-surface-3)] disabled:opacity-50"
            >
              Export PDF
            </button>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-1)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--color-border)] text-xs font-mono uppercase tracking-widest text-[var(--color-text-secondary)]">
              Session Reports ({filteredSessionRows.length})
            </div>

            {loading ? (
              <div className="p-6">
                <Skeleton className="h-5" count={4} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] text-left text-sm">
                  <thead className="bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                    <tr>
                      <th className="px-4 py-3">Session Date</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Professor/TA</th>
                      <th className="px-4 py-3">Room</th>
                      <th className="px-4 py-3">Total Students</th>
                      <th className="px-4 py-3">Present</th>
                      <th className="px-4 py-3">Absent</th>
                      <th className="px-4 py-3">Late</th>
                      <th className="px-4 py-3">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {filteredSessionRows.map((row) => (
                      <tr key={row.id} className="hover:bg-[var(--color-surface-2)]">
                        <td className="px-4 py-3">{new Date(row.date).toLocaleString()}</td>
                        <td className="px-4 py-3">{`${row.subject_code} ${row.subject_name}`}</td>
                        <td className="px-4 py-3">{row.instructor}</td>
                        <td className="px-4 py-3">{row.room}</td>
                        <td className="px-4 py-3">{row.total_students}</td>
                        <td className="px-4 py-3">{row.present}</td>
                        <td className="px-4 py-3">{row.absent}</td>
                        <td className="px-4 py-3">{row.late}</td>
                        <td className="px-4 py-3">{row.attendance_pct}%</td>
                      </tr>
                    ))}
                    {filteredSessionRows.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-6 text-[var(--color-text-secondary)] text-center">
                          No sessions matched the current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === "warnings" && (
        <section className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4">
            <label className="space-y-1">
              <span className="text-[11px] text-[var(--color-text-secondary)] font-mono uppercase tracking-widest">Level</span>
              <select
                value={warningFilters.level}
                onChange={(event) => setWarningFilters((prev) => ({ ...prev, level: event.target.value }))}
                aria-label="Filter warning reports by level"
                className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
              >
                <option value="">All levels</option>
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
                <option value="3">Level 3</option>
                <option value="4">Level 4</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] text-[var(--color-text-secondary)] font-mono uppercase tracking-widest">Subject</span>
              <select
                value={warningFilters.subject_id}
                onChange={(event) => setWarningFilters((prev) => ({ ...prev, subject_id: event.target.value }))}
                aria-label="Filter warning reports by subject"
                className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
              >
                <option value="">All subjects</option>
                {subjects
                  .filter((subject) => {
                    const level = normalizeLevel(subject.level || subject.level_semester);
                    return !warningFilters.level || level === warningFilters.level;
                  })
                  .map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {(subject.code || subject.subject_code || "-") + " - " + (subject.name_en || subject.name_ar || "-")}
                    </option>
                  ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] text-[var(--color-text-secondary)] font-mono uppercase tracking-widest">Threshold</span>
              <select
                value={warningFilters.threshold}
                onChange={(event) => setWarningFilters((prev) => ({ ...prev, threshold: event.target.value }))}
                aria-label="Filter warning reports by threshold"
                className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
              >
                <option value="75">Attendance below 75%</option>
                <option value="60">Attendance below 60%</option>
                <option value="50">Attendance below 50%</option>
              </select>
            </label>

            <div className="md:col-span-3">
              <button
                type="button"
                onClick={resetWarningFilters}
                aria-label="Reset warning report filters"
                className="px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] text-xs font-mono uppercase tracking-wider hover:bg-[var(--color-surface-3)]"
              >
                Reset Filters
              </button>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => exportWarnings("excel")}
              disabled={warningsRows.length === 0}
              aria-label="Export warning reports as Excel"
              className="px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] text-xs font-mono uppercase tracking-wider hover:bg-[var(--color-surface-3)] disabled:opacity-50"
            >
              Export Excel
            </button>
            <button
              type="button"
              onClick={() => exportWarnings("pdf")}
              disabled={warningsRows.length === 0}
              aria-label="Export warning reports as PDF"
              className="px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] text-xs font-mono uppercase tracking-wider hover:bg-[var(--color-surface-3)] disabled:opacity-50"
            >
              Export PDF
            </button>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-1)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--color-border)] text-xs font-mono uppercase tracking-widest text-[var(--color-text-secondary)]">
              Student Warnings ({warningsRows.length})
            </div>

            {warningsLoading ? (
              <div className="p-6">
                <Skeleton className="h-5" count={3} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead className="bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                    <tr>
                      <th className="px-4 py-3">Student ID</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Level</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Absence %</th>
                      <th className="px-4 py-3">Warning Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {warningsRows.map((row) => (
                      <tr key={`${row.subject_id}-${row.student_id}`} className="hover:bg-[var(--color-surface-2)]">
                        <td className="px-4 py-3">{row.student_id_number || row.student_id}</td>
                        <td className="px-4 py-3">{row.student_name || "-"}</td>
                        <td className="px-4 py-3">{row.level || "-"}</td>
                        <td className="px-4 py-3">{`${row.subject_code} ${row.subject_name}`}</td>
                        <td className="px-4 py-3">{Math.round(row.absence_pct)}%</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 rounded border text-xs uppercase ${warningBadgeClass(row.warning_level)}`}>
                            {row.warning_level}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {warningsRows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-[var(--color-text-secondary)] text-center">
                          No warning rows matched the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
