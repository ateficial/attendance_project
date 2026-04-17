import { useEffect, useMemo, useState } from "react";
import pb from "../../lib/pb";
import {
  createAdminTA,
  deleteAdminTA,
  getAdminStudents,
  getAdminTAs,
  updateAdminStudent,
  updateAdminTA,
} from "../../lib/apiClient";
import Skeleton from "../../components/ui/Skeleton";

const USER_TABS = [
  { key: "students", label: "Students" },
  { key: "professors", label: "Professors" },
  { key: "tas", label: "Teaching Assistants" },
];

const LEVEL_OPTIONS = ["1", "2", "3", "4"];
const STUDENT_STATUS_OPTIONS = ["active", "suspended", "graduated"];

function normalizeLevel(value) {
  return String(value || "").trim();
}

function isSubjectForLevel(subject, level) {
  const subjectLevel = normalizeLevel(subject?.level || subject?.level_semester);
  const targetLevel = normalizeLevel(level);
  return !subjectLevel || !targetLevel || subjectLevel === targetLevel;
}

function formatPct(value) {
  const pct = Number(value || 0);
  if (!Number.isFinite(pct)) return "0%";
  return `${Math.max(0, Math.round(pct))}%`;
}

function parseSubjectIds(record) {
  if (!record) return [];
  if (Array.isArray(record.enrolled_subjects)) return record.enrolled_subjects;
  if (Array.isArray(record.registered_courses)) return record.registered_courses;
  if (Array.isArray(record.assigned_subjects)) return record.assigned_subjects;
  return [];
}

export default function AdminUsers() {
  const [activeTab, setActiveTab] = useState("students");
  const [subjects, setSubjects] = useState([]);
  const [groups, setGroups] = useState([]);

  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentFilters, setStudentFilters] = useState({
    level: "",
    group_id: "",
    status: "",
    search: "",
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [professors, setProfessors] = useState([]);
  const [professorsLoading, setProfessorsLoading] = useState(true);

  const [tas, setTAs] = useState([]);
  const [tasLoading, setTAsLoading] = useState(true);

  const [studentModal, setStudentModal] = useState({ open: false, form: null, error: "", saving: false });
  const [professorModal, setProfessorModal] = useState({ open: false, form: null, error: "", saving: false });
  const [taModal, setTAModal] = useState({ open: false, mode: "create", form: null, error: "", saving: false });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(studentFilters.search.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [studentFilters.search]);

  useEffect(() => {
    loadLookups();
    loadProfessors();
    loadTAs();
  }, []);

  useEffect(() => {
    loadStudents();
  }, [studentFilters.level, studentFilters.group_id, studentFilters.status, debouncedSearch]);

  async function loadLookups() {
    try {
      const [subjectRes, groupRes] = await Promise.all([
        pb.collection("subjects").getList(1, 500, { sort: "code" }),
        pb.collection("groups").getList(1, 500, { sort: "group_name" }),
      ]);
      setSubjects(subjectRes.items || []);
      setGroups(groupRes.items || []);
    } catch (loadError) {
      console.error(loadError);
      setError("Failed to load subject/group lookups.");
    }
  }

  async function loadStudents() {
    setStudentsLoading(true);
    setError("");
    try {
      const payload = await getAdminStudents({
        level: studentFilters.level || undefined,
        group_id: studentFilters.group_id || undefined,
        status: studentFilters.status || undefined,
        search: debouncedSearch || undefined,
        page: 1,
        per_page: 300,
      });
      setStudents(payload.items || []);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError.message || "Failed to load students.");
    } finally {
      setStudentsLoading(false);
    }
  }

  async function loadProfessors() {
    setProfessorsLoading(true);
    try {
      const rows = await pb.collection("professors").getFullList({
        sort: "name_en",
        expand: "assigned_subjects",
      });
      setProfessors(rows || []);
    } catch (loadError) {
      console.error(loadError);
      setError("Failed to load professors.");
    } finally {
      setProfessorsLoading(false);
    }
  }

  async function loadTAs() {
    setTAsLoading(true);
    try {
      const rows = await getAdminTAs();
      setTAs(rows || []);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError.message || "Failed to load teaching assistants.");
    } finally {
      setTAsLoading(false);
    }
  }

  function resetNotices() {
    setMessage("");
    setError("");
  }

  function openStudentModal(student) {
    const expandedSubjects = student.expand?.enrolled_subjects || [];
    const subjectIds = expandedSubjects.map((item) => item.id);

    setStudentModal({
      open: true,
      saving: false,
      error: "",
      form: {
        id: student.id,
        level: normalizeLevel(student.level),
        enrolled_subjects: subjectIds,
        group_id: student.group_id || "",
        status: String(student.status || "active").toLowerCase(),
        rfid_card_id: student.rfid_card_id || "",
        rfid_status: String(student.rfid_status || "active").toLowerCase(),
      },
    });
  }

  function closeStudentModal() {
    setStudentModal({ open: false, form: null, error: "", saving: false });
  }

  async function saveStudentModal() {
    if (!studentModal.form) return;

    const form = studentModal.form;
    const level = normalizeLevel(form.level);
    const invalidSubject = form.enrolled_subjects.find((subjectId) => {
      const subject = subjects.find((item) => item.id === subjectId);
      return subject && !isSubjectForLevel(subject, level);
    });

    if (invalidSubject) {
      setStudentModal((prev) => ({
        ...prev,
        error: "One or more selected subjects do not match the chosen level.",
      }));
      return;
    }

    setStudentModal((prev) => ({ ...prev, saving: true, error: "" }));
    resetNotices();

    try {
      await updateAdminStudent(form.id, {
        level,
        enrolled_subjects: form.enrolled_subjects,
        group_id: form.group_id || "",
        status: form.status,
        rfid_card_id: form.rfid_card_id,
        rfid_status: form.rfid_status,
      });

      setMessage("Student updated successfully.");
      closeStudentModal();
      await loadStudents();
    } catch (saveError) {
      setStudentModal((prev) => ({
        ...prev,
        saving: false,
        error: saveError.message || "Failed to update student.",
      }));
      return;
    }

    setStudentModal((prev) => ({ ...prev, saving: false }));
  }

  function openProfessorModal(professor) {
    setProfessorModal({
      open: true,
      saving: false,
      error: "",
      form: {
        id: professor.id,
        name_en: professor.name_en || "",
        name_ar: professor.name_ar || "",
        email: professor.email || "",
        employee_id: professor.employee_id || "",
        department: professor.department || "",
        phone: professor.phone || "",
        office_location: professor.office_location || "",
        assigned_subjects: parseSubjectIds(professor),
        session_passcode: professor.session_passcode || "",
        status: String(professor.status || "active").toLowerCase(),
      },
    });
  }

  function closeProfessorModal() {
    setProfessorModal({ open: false, form: null, error: "", saving: false });
  }

  async function saveProfessorModal() {
    if (!professorModal.form) return;
    const form = professorModal.form;

    if (!form.name_en.trim() || !form.email.trim()) {
      setProfessorModal((prev) => ({
        ...prev,
        error: "Name and email are required.",
      }));
      return;
    }

    setProfessorModal((prev) => ({ ...prev, saving: true, error: "" }));
    resetNotices();

    try {
      await pb.collection("professors").update(form.id, {
        name_en: form.name_en,
        name_ar: form.name_ar,
        email: form.email.trim().toLowerCase(),
        employee_id: form.employee_id,
        department: form.department,
        phone: form.phone,
        office_location: form.office_location,
        assigned_subjects: form.assigned_subjects,
        session_passcode: form.session_passcode,
        status: form.status,
      });

      setMessage("Professor updated successfully.");
      closeProfessorModal();
      await loadProfessors();
    } catch (saveError) {
      setProfessorModal((prev) => ({
        ...prev,
        saving: false,
        error: saveError.message || "Failed to update professor.",
      }));
      return;
    }

    setProfessorModal((prev) => ({ ...prev, saving: false }));
  }

  function openCreateTAModal() {
    setTAModal({
      open: true,
      mode: "create",
      saving: false,
      error: "",
      form: {
        id: "",
        name: "",
        name_ar: "",
        email: "",
        password: "",
        employee_id: "",
        department: "",
        assigned_subjects: [],
        assigned_groups: [],
        status: "active",
      },
    });
  }

  function openEditTAModal(ta) {
    setTAModal({
      open: true,
      mode: "edit",
      saving: false,
      error: "",
      form: {
        id: ta.id,
        name: ta.name || "",
        name_ar: ta.name_ar || "",
        email: ta.email || "",
        password: "",
        employee_id: ta.employee_id || "",
        department: ta.department || "",
        assigned_subjects: Array.isArray(ta.assigned_subjects) ? ta.assigned_subjects : [],
        assigned_groups: Array.isArray(ta.assigned_groups) ? ta.assigned_groups : [],
        status: String(ta.status || "active").toLowerCase(),
      },
    });
  }

  function closeTAModal() {
    setTAModal({ open: false, mode: "create", form: null, error: "", saving: false });
  }

  async function saveTAModal() {
    if (!taModal.form) return;

    const form = taModal.form;
    if (!form.name.trim() || !form.email.trim()) {
      setTAModal((prev) => ({ ...prev, error: "Name and email are required." }));
      return;
    }

    if (taModal.mode === "create" && !form.password) {
      setTAModal((prev) => ({ ...prev, error: "Password is required when creating a TA." }));
      return;
    }

    if (form.assigned_subjects.length === 0) {
      setTAModal((prev) => ({ ...prev, error: "Assign at least one subject." }));
      return;
    }

    setTAModal((prev) => ({ ...prev, saving: true, error: "" }));
    resetNotices();

    try {
      const payload = {
        name: form.name,
        name_ar: form.name_ar,
        email: form.email.trim().toLowerCase(),
        employee_id: form.employee_id,
        department: form.department,
        assigned_subjects: form.assigned_subjects,
        assigned_groups: form.assigned_groups,
        status: form.status,
      };

      if (form.password) payload.password = form.password;

      if (taModal.mode === "create") {
        await createAdminTA(payload);
        setMessage("Teaching assistant created successfully.");
      } else {
        await updateAdminTA(form.id, payload);
        setMessage("Teaching assistant updated successfully.");
      }

      closeTAModal();
      await loadTAs();
    } catch (saveError) {
      setTAModal((prev) => ({
        ...prev,
        saving: false,
        error: saveError.message || "Failed to save teaching assistant.",
      }));
      return;
    }

    setTAModal((prev) => ({ ...prev, saving: false }));
  }

  async function removeTA(ta) {
    const confirmed = window.confirm(`Delete TA ${ta.name || ta.email}?`);
    if (!confirmed) return;

    resetNotices();
    try {
      await deleteAdminTA(ta.id);
      setMessage("Teaching assistant deleted.");
      await loadTAs();
    } catch (deleteError) {
      setError(deleteError.message || "Failed to delete teaching assistant.");
    }
  }

  const filteredSubjectsForStudent = useMemo(() => {
    const level = studentModal.form?.level;
    return subjects.filter((subject) => isSubjectForLevel(subject, level));
  }, [subjects, studentModal.form?.level]);

  const filteredSubjectsForProfessor = useMemo(() => {
    return subjects;
  }, [subjects]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[var(--text-3xl)] font-bold text-[var(--color-text-primary)]">User Management</h2>
        <p className="mt-1 text-[var(--text-base)] text-[var(--color-text-secondary)]">Manage students, professors, and teaching assistants.</p>
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
        {USER_TABS.map((tab) => (
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

      {activeTab === "students" && (
        <section className="space-y-4">
          <div className="grid md:grid-cols-4 gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4">
            <label className="space-y-1">
              <span className="text-[11px] text-[var(--color-text-secondary)] font-mono uppercase tracking-widest">Level</span>
              <select
                value={studentFilters.level}
                onChange={(event) => setStudentFilters((prev) => ({ ...prev, level: event.target.value }))}
                aria-label="Filter students by level"
                className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
              >
                <option value="">All levels</option>
                {LEVEL_OPTIONS.map((level) => (
                  <option key={level} value={level}>{`Level ${level}`}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] text-[var(--color-text-secondary)] font-mono uppercase tracking-widest">Group</span>
              <select
                value={studentFilters.group_id}
                onChange={(event) => setStudentFilters((prev) => ({ ...prev, group_id: event.target.value }))}
                aria-label="Filter students by group"
                className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
              >
                <option value="">All groups</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.group_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] text-[var(--color-text-secondary)] font-mono uppercase tracking-widest">Status</span>
              <select
                value={studentFilters.status}
                onChange={(event) => setStudentFilters((prev) => ({ ...prev, status: event.target.value }))}
                aria-label="Filter students by status"
                className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
              >
                <option value="">All statuses</option>
                {STUDENT_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] text-[var(--color-text-secondary)] font-mono uppercase tracking-widest">Search</span>
              <input
                value={studentFilters.search}
                onChange={(event) => setStudentFilters((prev) => ({ ...prev, search: event.target.value }))}
                placeholder="Name, ID, email"
                aria-label="Search students"
                className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
              />
            </label>

            <div className="md:col-span-4">
              <button
                type="button"
                onClick={() =>
                  setStudentFilters({
                    level: "",
                    group_id: "",
                    status: "",
                    search: "",
                  })
                }
                aria-label="Reset student filters"
                className="px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] text-xs font-mono uppercase tracking-wider hover:bg-[var(--color-surface-3)]"
              >
                Reset Filters
              </button>
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-1)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--color-border)] text-xs font-mono uppercase tracking-widest text-[var(--color-text-secondary)]">
              Students ({students.length})
            </div>

            {studentsLoading ? (
              <div className="p-6">
                <Skeleton className="h-5" count={4} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                    <tr>
                      <th className="px-4 py-3">Student ID</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Level</th>
                      <th className="px-4 py-3">Group</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Enrolled Subjects</th>
                      <th className="px-4 py-3">Absence %</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-[var(--color-surface-2)]">
                        <td className="px-4 py-3">{student.student_id_number || "-"}</td>
                        <td className="px-4 py-3">{student.name_en || student.name_ar || "-"}</td>
                        <td className="px-4 py-3">{student.level || "-"}</td>
                        <td className="px-4 py-3">{student.expand?.group_id?.group_name || "-"}</td>
                        <td className="px-4 py-3">{student.status || "-"}</td>
                        <td className="px-4 py-3">{student.expand?.enrolled_subjects?.length || 0}</td>
                        <td className="px-4 py-3">{formatPct(student.absence_percentage)}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => openStudentModal(student)}
                            aria-label={`Edit student ${student.name_en || student.name_ar || student.student_id_number || ''}`}
                            className="px-2 py-1 rounded border border-[var(--color-border)] text-xs hover:bg-[var(--color-surface-2)]"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                    {students.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-6 text-[var(--color-text-secondary)] text-center">
                          No students found.
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

      {activeTab === "professors" && (
        <section className="space-y-4">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-1)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--color-border)] text-xs font-mono uppercase tracking-widest text-[var(--color-text-secondary)]">
              Professors ({professors.length})
            </div>

            {professorsLoading ? (
              <div className="p-6">
                <Skeleton className="h-5" count={4} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead className="bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                    <tr>
                      <th className="px-4 py-3">Employee ID</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Assigned Subjects</th>
                      <th className="px-4 py-3">Session Passcode</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {professors.map((professor) => (
                      <tr key={professor.id} className="hover:bg-[var(--color-surface-2)]">
                        <td className="px-4 py-3">{professor.employee_id || "-"}</td>
                        <td className="px-4 py-3">{professor.name_en || professor.name_ar || "-"}</td>
                        <td className="px-4 py-3">{professor.email || "-"}</td>
                        <td className="px-4 py-3">{professor.department || "-"}</td>
                        <td className="px-4 py-3">{(professor.expand?.assigned_subjects || []).length}</td>
                        <td className="px-4 py-3">••••••</td>
                        <td className="px-4 py-3">{professor.status || "active"}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => openProfessorModal(professor)}
                            aria-label={`Edit professor ${professor.name_en || professor.name_ar || professor.email || ''}`}
                            className="px-2 py-1 rounded border border-[var(--color-border)] text-xs hover:bg-[var(--color-surface-2)]"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                    {professors.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-6 text-[var(--color-text-secondary)] text-center">
                          No professors found.
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

      {activeTab === "tas" && (
        <section className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={openCreateTAModal}
              aria-label="Create teaching assistant"
              className="px-4 py-2 rounded bg-[var(--role-primary)] text-white text-xs font-mono uppercase tracking-wider hover:bg-[var(--role-primary-strong)]"
            >
              Add TA
            </button>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-1)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--color-border)] text-xs font-mono uppercase tracking-widest text-[var(--color-text-secondary)]">
              Teaching Assistants ({tas.length})
            </div>

            {tasLoading ? (
              <div className="p-6">
                <Skeleton className="h-5" count={4} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead className="bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                    <tr>
                      <th className="px-4 py-3">Employee ID</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Assigned Subjects</th>
                      <th className="px-4 py-3">Assigned Groups</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {tas.map((ta) => (
                      <tr key={ta.id} className="hover:bg-[var(--color-surface-2)]">
                        <td className="px-4 py-3">{ta.employee_id || "-"}</td>
                        <td className="px-4 py-3">{ta.name || ta.name_ar || "-"}</td>
                        <td className="px-4 py-3">{ta.email || "-"}</td>
                        <td className="px-4 py-3">{ta.department || "-"}</td>
                        <td className="px-4 py-3">{ta.expand?.assigned_subjects?.length || 0}</td>
                        <td className="px-4 py-3">{ta.expand?.assigned_groups?.length || 0}</td>
                        <td className="px-4 py-3">{ta.status || "active"}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => openEditTAModal(ta)}
                              aria-label={`Edit teaching assistant ${ta.name || ta.name_ar || ta.email || ''}`}
                              className="px-2 py-1 rounded border border-[var(--color-border)] text-xs hover:bg-[var(--color-surface-2)]"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => removeTA(ta)}
                              aria-label={`Delete teaching assistant ${ta.name || ta.name_ar || ta.email || ''}`}
                              className="px-2 py-1 rounded border border-red-300 text-red-700 text-xs hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {tas.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-6 text-[var(--color-text-secondary)] text-center">
                          No teaching assistants found.
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

      {studentModal.open && studentModal.form && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-3xl mx-auto mt-10 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-1)] shadow-2xl">
            <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Edit Student</h3>
              <button onClick={closeStudentModal} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">Close</button>
            </div>

            <div className="p-5 grid md:grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Level</span>
                <select
                  value={studentModal.form.level}
                  onChange={(event) =>
                    setStudentModal((prev) => {
                      const nextLevel = event.target.value;
                      const nextSubjects = (prev.form.enrolled_subjects || []).filter((subjectId) => {
                        const subject = subjects.find((item) => item.id === subjectId);
                        return isSubjectForLevel(subject, nextLevel);
                      });
                      return {
                        ...prev,
                        form: { ...prev.form, level: nextLevel, enrolled_subjects: nextSubjects },
                      };
                    })
                  }
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                >
                  {LEVEL_OPTIONS.map((level) => (
                    <option key={level} value={level}>{`Level ${level}`}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Group</span>
                <select
                  value={studentModal.form.group_id}
                  onChange={(event) =>
                    setStudentModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, group_id: event.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                >
                  <option value="">No group</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.group_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Status</span>
                <select
                  value={studentModal.form.status}
                  onChange={(event) =>
                    setStudentModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, status: event.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                >
                  {STUDENT_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">RFID Status</span>
                <select
                  value={studentModal.form.rfid_status}
                  onChange={(event) =>
                    setStudentModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, rfid_status: event.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="lost">lost</option>
                </select>
              </label>

              <label className="space-y-1 md:col-span-2">
                <span className="text-xs text-[var(--color-text-secondary)]">RFID Card ID</span>
                <input
                  value={studentModal.form.rfid_card_id}
                  onChange={(event) =>
                    setStudentModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, rfid_card_id: event.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                />
              </label>

              <label className="space-y-1 md:col-span-2">
                <span className="text-xs text-[var(--color-text-secondary)]">Enrolled Subjects (filtered by level)</span>
                <select
                  multiple
                  value={studentModal.form.enrolled_subjects}
                  onChange={(event) => {
                    const selected = Array.from(event.target.selectedOptions).map((option) => option.value);
                    setStudentModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, enrolled_subjects: selected },
                    }));
                  }}
                  className="w-full min-h-40 px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                >
                  {filteredSubjectsForStudent.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {(subject.code || subject.subject_code || "-") + " - " + (subject.name_en || subject.name_ar || "-")}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {studentModal.error && <div className="px-5 pb-2 text-sm text-rose-700">{studentModal.error}</div>}

            <div className="px-5 py-4 border-t border-[var(--color-border)] flex justify-end gap-2">
              <button onClick={closeStudentModal} className="px-4 py-2 rounded border border-[var(--color-border)] text-sm">
                Cancel
              </button>
              <button
                onClick={saveStudentModal}
                disabled={studentModal.saving}
                className="px-4 py-2 rounded bg-[var(--role-primary)] text-white text-sm font-medium disabled:opacity-60"
              >
                {studentModal.saving ? "Saving..." : "Save Student"}
              </button>
            </div>
          </div>
        </div>
      )}

      {professorModal.open && professorModal.form && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-3xl mx-auto mt-10 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-1)] shadow-2xl">
            <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Edit Professor</h3>
              <button onClick={closeProfessorModal} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">Close</button>
            </div>

            <div className="p-5 grid md:grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Name</span>
                <input
                  value={professorModal.form.name_en}
                  onChange={(event) =>
                    setProfessorModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, name_en: event.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Arabic Name</span>
                <input
                  value={professorModal.form.name_ar}
                  onChange={(event) =>
                    setProfessorModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, name_ar: event.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Email</span>
                <input
                  value={professorModal.form.email}
                  onChange={(event) =>
                    setProfessorModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, email: event.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Employee ID</span>
                <input
                  value={professorModal.form.employee_id}
                  onChange={(event) =>
                    setProfessorModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, employee_id: event.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Department</span>
                <input
                  value={professorModal.form.department}
                  onChange={(event) =>
                    setProfessorModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, department: event.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Phone</span>
                <input
                  value={professorModal.form.phone}
                  onChange={(event) =>
                    setProfessorModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, phone: event.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Office Location</span>
                <input
                  value={professorModal.form.office_location}
                  onChange={(event) =>
                    setProfessorModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, office_location: event.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Session Passcode</span>
                <input
                  value={professorModal.form.session_passcode}
                  onChange={(event) =>
                    setProfessorModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, session_passcode: event.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Status</span>
                <select
                  value={professorModal.form.status}
                  onChange={(event) =>
                    setProfessorModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, status: event.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </label>

              <label className="space-y-1 md:col-span-2">
                <span className="text-xs text-[var(--color-text-secondary)]">Assigned Subjects</span>
                <select
                  multiple
                  value={professorModal.form.assigned_subjects}
                  onChange={(event) => {
                    const selected = Array.from(event.target.selectedOptions).map((option) => option.value);
                    setProfessorModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, assigned_subjects: selected },
                    }));
                  }}
                  className="w-full min-h-40 px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                >
                  {filteredSubjectsForProfessor.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {(subject.code || subject.subject_code || "-") + " - " + (subject.name_en || subject.name_ar || "-")}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {professorModal.error && <div className="px-5 pb-2 text-sm text-rose-700">{professorModal.error}</div>}

            <div className="px-5 py-4 border-t border-[var(--color-border)] flex justify-end gap-2">
              <button onClick={closeProfessorModal} className="px-4 py-2 rounded border border-[var(--color-border)] text-sm">
                Cancel
              </button>
              <button
                onClick={saveProfessorModal}
                disabled={professorModal.saving}
                className="px-4 py-2 rounded bg-[var(--role-primary)] text-white text-sm font-medium disabled:opacity-60"
              >
                {professorModal.saving ? "Saving..." : "Save Professor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {taModal.open && taModal.form && (
        <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-3xl mx-auto mt-10 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-1)] shadow-2xl">
            <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                {taModal.mode === "create" ? "Create Teaching Assistant" : "Edit Teaching Assistant"}
              </h3>
              <button onClick={closeTAModal} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">Close</button>
            </div>

            <div className="p-5 grid md:grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Name</span>
                <input
                  value={taModal.form.name}
                  onChange={(event) =>
                    setTAModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, name: event.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Arabic Name</span>
                <input
                  value={taModal.form.name_ar}
                  onChange={(event) =>
                    setTAModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, name_ar: event.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Email</span>
                <input
                  value={taModal.form.email}
                  onChange={(event) =>
                    setTAModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, email: event.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Password {taModal.mode === "edit" ? "(optional)" : ""}</span>
                <input
                  type="password"
                  value={taModal.form.password}
                  onChange={(event) =>
                    setTAModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, password: event.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Employee ID</span>
                <input
                  value={taModal.form.employee_id}
                  onChange={(event) =>
                    setTAModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, employee_id: event.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Department</span>
                <input
                  value={taModal.form.department}
                  onChange={(event) =>
                    setTAModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, department: event.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs text-[var(--color-text-secondary)]">Status</span>
                <select
                  value={taModal.form.status}
                  onChange={(event) =>
                    setTAModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, status: event.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </label>

              <label className="space-y-1 md:col-span-2">
                <span className="text-xs text-[var(--color-text-secondary)]">Assigned Subjects</span>
                <select
                  multiple
                  value={taModal.form.assigned_subjects}
                  onChange={(event) => {
                    const selected = Array.from(event.target.selectedOptions).map((option) => option.value);
                    setTAModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, assigned_subjects: selected },
                    }));
                  }}
                  className="w-full min-h-36 px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                >
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {(subject.code || subject.subject_code || "-") + " - " + (subject.name_en || subject.name_ar || "-")}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 md:col-span-2">
                <span className="text-xs text-[var(--color-text-secondary)]">Assigned Groups</span>
                <select
                  multiple
                  value={taModal.form.assigned_groups}
                  onChange={(event) => {
                    const selected = Array.from(event.target.selectedOptions).map((option) => option.value);
                    setTAModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, assigned_groups: selected },
                    }));
                  }}
                  className="w-full min-h-36 px-3 py-2 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.group_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {taModal.error && <div className="px-5 pb-2 text-sm text-rose-700">{taModal.error}</div>}

            <div className="px-5 py-4 border-t border-[var(--color-border)] flex justify-end gap-2">
              <button onClick={closeTAModal} className="px-4 py-2 rounded border border-[var(--color-border)] text-sm">
                Cancel
              </button>
              <button
                onClick={saveTAModal}
                disabled={taModal.saving}
                className="px-4 py-2 rounded bg-[var(--role-primary)] text-white text-sm font-medium disabled:opacity-60"
              >
                {taModal.saving ? "Saving..." : taModal.mode === "create" ? "Create TA" : "Save TA"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
