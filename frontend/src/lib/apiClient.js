import { clearAuthSession, readAuthSession, writeAuthSession } from "./authStore";
import pb from "./pb";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const DEFAULT_API_BASE_URL = import.meta.env.DEV
  ? window.location.origin
  : `http://${window.location.hostname}:8090`;
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, status, code, payload) {
    super(message || "Request failed");
    this.name = "ApiError";
    this.status = status || 0;
    this.code = code || "REQUEST_FAILED";
    this.payload = payload;
  }
}

function buildUrl(path, params) {
  const url = new URL(path, API_BASE_URL);
  if (params && typeof params === "object") {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

function getMessage(payload, fallbackMessage) {
  if (!payload || typeof payload !== "object") return fallbackMessage;
  return payload.message || payload.error || fallbackMessage;
}

function getCode(payload, fallbackCode) {
  if (!payload || typeof payload !== "object") return fallbackCode;
  return payload.code || fallbackCode;
}

function getTokenPayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (payload.access_token && payload.refresh_token) return payload;
  if (payload.data && payload.data.access_token && payload.data.refresh_token) return payload.data;
  return null;
}

async function parseResponsePayload(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    return { message: text };
  }
}

function updateSessionTokens(tokenPayload) {
  const session = readAuthSession();
  if (!session) return;

  const now = Date.now();
  const expiresIn = Number(tokenPayload.expires_in || 0);
  const refreshExpiresIn = Number(tokenPayload.refresh_expires_in || 0);

  const nextSession = {
    ...session,
    access_token: tokenPayload.access_token,
    refresh_token: tokenPayload.refresh_token,
    token_type: tokenPayload.token_type || "Bearer",
    expires_in: expiresIn,
    refresh_expires_in: refreshExpiresIn,
    token_expires_at: expiresIn > 0 ? now + expiresIn * 1000 : null,
    refresh_expires_at: refreshExpiresIn > 0 ? now + refreshExpiresIn * 1000 : null,
  };

  writeAuthSession(nextSession);
}

async function refreshAccessToken() {
  const session = readAuthSession();
  if (!session || !session.refresh_token) return false;

  const refreshResponse = await fetch(buildUrl("/api/custom/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });

  const payload = await parseResponsePayload(refreshResponse);
  if (!refreshResponse.ok) {
    if (session.role !== "admin") {
      clearAuthSession();
    }
    return false;
  }

  const tokenPayload = getTokenPayload(payload);
  if (!tokenPayload) return false;
  updateSessionTokens(tokenPayload);
  return true;
}

async function request(path, options = {}) {
  const {
    method = "GET",
    params,
    body,
    headers = {},
    requiresAuth = true,
    retryOn401 = true,
  } = options;

  const session = readAuthSession();
  const requestHeaders = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (requiresAuth) {
    const bearerToken = session?.access_token || session?.pb_token || pb?.authStore?.token;
    if (bearerToken) {
      requestHeaders.Authorization = `Bearer ${bearerToken}`;
    }
  }

  const response = await fetch(buildUrl(path, params), {
    method,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = await parseResponsePayload(response);

  if (!response.ok) {
    if (response.status === 401 && requiresAuth && retryOn401 && session?.refresh_token) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return request(path, {
          ...options,
          retryOn401: false,
        });
      }
    }

    throw new ApiError(
      getMessage(payload, `Request failed with status ${response.status}`),
      response.status,
      getCode(payload, "REQUEST_FAILED"),
      payload
    );
  }

  return payload;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export async function loginWithCustomAuth(role, email, password) {
  const payload = await request("/api/custom/auth/login", {
    method: "POST",
    requiresAuth: false,
    body: { role, email, password },
  });

  const tokenPayload = getTokenPayload(payload);
  if (!tokenPayload || !payload.user) {
    throw new ApiError("Invalid auth response", 500, "INVALID_AUTH_RESPONSE", payload);
  }

  const now = Date.now();
  const session = {
    role,
    user: payload.user,
    access_token: tokenPayload.access_token,
    refresh_token: tokenPayload.refresh_token,
    token_type: tokenPayload.token_type || "Bearer",
    expires_in: Number(tokenPayload.expires_in || 0),
    refresh_expires_in: Number(tokenPayload.refresh_expires_in || 0),
    token_expires_at: tokenPayload.expires_in ? now + Number(tokenPayload.expires_in) * 1000 : null,
    refresh_expires_at: tokenPayload.refresh_expires_in ? now + Number(tokenPayload.refresh_expires_in) * 1000 : null,
  };

  writeAuthSession(session);
  return session;
}

export async function fetchCurrentUser() {
  const payload = await request("/api/custom/auth/me", {
    method: "GET",
    requiresAuth: true,
  });
  return payload?.data?.user || null;
}

export async function getProfessorCourses(professorId) {
  const payload = await request("/api/custom/professor/courses", {
    method: "GET",
    params: professorId ? { professor_id: professorId } : undefined,
  });
  return payload?.data?.courses || [];
}

export async function getProfessorSessions(subjectId) {
  const payload = await request("/api/custom/professor/sessions", {
    method: "GET",
    params: subjectId ? { subject_id: subjectId } : undefined,
  });
  return payload?.data?.sessions || [];
}

export async function getProfessorRecentAttendance(subjectId, limit = 20) {
  const payload = await request("/api/custom/professor/recent-attendance", {
    method: "GET",
    params: {
      subject_id: subjectId,
      limit,
    },
  });
  return payload?.data?.records || [];
}

export async function getStudentCourses(studentId) {
  const payload = await request("/api/custom/student/courses", {
    method: "GET",
    params: studentId ? { student_id: studentId } : undefined,
  });
  return payload?.data?.courses || [];
}

export async function getStudentHistory(courseId) {
  const payload = await request("/api/custom/student/history", {
    method: "GET",
    params: courseId ? { course_id: courseId } : undefined,
  });
  return payload?.data?.records || [];
}

export async function getStudentWarnings(studentId) {
  const payload = await request("/api/custom/student-warnings", {
    method: "GET",
    params: { student_id: studentId },
  });

  return {
    warnings: payload?.warnings || payload?.data?.warnings || [],
    overall_status: payload?.overall_status || payload?.data?.overall_status || "good",
    student_name: payload?.student_name || null,
    warnings_count: payload?.warnings_count || 0,
  };
}

export async function getAttendanceReport({ sessionId, subjectId, dateFrom, dateTo }) {
  const params = {
    session_id: sessionId,
    subject_id: subjectId,
    date_from: dateFrom,
    date_to: dateTo,
  };
  return request("/api/custom/attendance-report", {
    method: "GET",
    params,
  });
}

export async function bulkMarkAttendance(sessionId, status, studentIds) {
  const payloadBody = {
    session_id: sessionId,
    status,
  };

  if (Array.isArray(studentIds) && studentIds.length > 0) {
    payloadBody.student_ids = studentIds;
  }

  const payload = await request("/api/custom/attendance/bulk-mark", {
    method: "POST",
    body: payloadBody,
  });
  return payload?.data || null;
}

export async function markAttendance(sessionId, studentId, status) {
  const payload = await request("/api/custom/record-attendance", {
    method: "POST",
    body: {
      session_id: sessionId,
      student_id: studentId,
      status,
    },
  });
  return payload?.data || payload;
}

export async function getProfessorSchedule() {
  const payload = await request("/api/custom/professor/schedule", { method: "GET" });
  return payload?.data?.schedule || [];
}

export async function getProfessorDashboardStats() {
  const payload = await request("/api/custom/professor/dashboard-stats", { method: "GET" });
  return payload?.data || {};
}

export async function changePasscode(current_passcode, new_passcode) {
  const payload = await request("/api/custom/session/change-passcode", {
    method: "POST",
    body: { current_passcode, new_passcode },
  });
  return payload?.data || payload;
}

export async function startSessionWithPasscode(passcode) {
  const payload = await request("/api/custom/session/passcode-start", {
    method: "POST",
    body: { passcode },
  });
  return payload?.data || payload;
}

export async function getTASubjects() {
  const payload = await request("/api/custom/ta/subjects", { method: "GET" });
  return payload?.data?.subjects || [];
}

export async function getTASessions(subjectId) {
  const payload = await request("/api/custom/ta/sessions", {
    method: "GET",
    params: subjectId ? { subject_id: subjectId } : undefined,
  });
  return payload?.data?.sessions || [];
}

export async function getTARecentAttendance(limit = 10) {
  const payload = await request("/api/custom/ta/recent-attendance", {
    method: "GET",
    params: { limit },
  });
  return payload?.data?.records || [];
}

export async function getTADashboardStats() {
  const payload = await request("/api/custom/ta/dashboard-stats", { method: "GET" });
  return payload?.data || {};
}

export async function getStudentDashboardStats() {
  const payload = await request("/api/custom/student/dashboard-stats", { method: "GET" });
  return payload?.data || {};
}

export async function getAdminSchedule(level, semester, academic_year) {
  const payload = await request("/api/custom/admin/schedule", {
    method: "GET",
    params: { level, semester, academic_year },
  });
  return payload?.data || { entries: [], grid: {} };
}

export async function saveAdminSchedule(entries) {
  const payload = await request("/api/custom/admin/schedule/save", {
    method: "POST",
    body: { entries },
  });
  return payload?.data || payload;
}

export async function publishScheduleVersion(version_id) {
  const payload = await request("/api/custom/admin/schedule/publish", {
    method: "POST",
    body: { version_id },
  });
  return payload?.data || payload;
}

export async function getAdminStudents(filters = {}) {
  const payload = await request("/api/custom/admin/students", {
    method: "GET",
    params: filters,
  });
  return payload?.data || { items: [], page: 1, per_page: 20, total_items: 0, total_pages: 1 };
}

export async function updateAdminStudent(id, body) {
  const payload = await request(`/api/custom/admin/student/${id}`, {
    method: "PATCH",
    body,
  });
  return payload?.data || payload;
}

export async function getAdminTAs() {
  const payload = await request("/api/custom/admin/teaching-assistants", { method: "GET" });
  return payload?.data?.items || [];
}

export async function createAdminTA(body) {
  const payload = await request("/api/custom/admin/teaching-assistants", {
    method: "POST",
    body,
  });
  return payload?.data || payload;
}

export async function updateAdminTA(id, body) {
  const payload = await request(`/api/custom/admin/teaching-assistants/${id}`, {
    method: "PATCH",
    body,
  });
  return payload?.data || payload;
}

export async function deleteAdminTA(id) {
  return request(`/api/custom/admin/teaching-assistants/${id}`, {
    method: "DELETE",
  });
}

export async function getAttendanceExportData(session_id) {
  const payload = await request("/api/custom/attendance/export", {
    method: "GET",
    params: { session_id },
  });
  return payload?.data || { records: [] };
}

export async function getSubjectAttendanceExportData(subject_id, date_from, date_to) {
  const payload = await request("/api/custom/attendance/subject-export", {
    method: "GET",
    params: { subject_id, date_from, date_to },
  });
  return payload?.data || { sessions: [] };
}

function normalizeColumns(columns, rows) {
  if (Array.isArray(columns) && columns.length > 0) {
    return columns.map((column) => {
      if (typeof column === "string") {
        return { key: column, label: column };
      }
      return {
        key: column.key,
        label: column.label || column.key,
      };
    });
  }

  const first = Array.isArray(rows) && rows.length > 0 ? rows[0] : {};
  return Object.keys(first).map((key) => ({ key, label: key }));
}

function toExportRows(rows, columns) {
  return (rows || []).map((row) => {
    const mapped = {};
    for (const column of columns) {
      mapped[column.label] = row?.[column.key] ?? "";
    }
    return mapped;
  });
}

function exportDateStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function exportToExcel(data, columns, filename = "attendance-export") {
  const normalizedColumns = normalizeColumns(columns, data);
  const exportRows = toExportRows(data, normalizedColumns);

  const worksheet = XLSX.utils.json_to_sheet(exportRows, { skipHeader: false });
  const labels = normalizedColumns.map((column) => column.label);

  for (let index = 0; index < labels.length; index += 1) {
    const address = XLSX.utils.encode_cell({ r: 0, c: index });
    if (!worksheet[address]) continue;
    worksheet[address].s = {
      font: { bold: true },
      alignment: { horizontal: "center" },
    };
  }

  worksheet["!cols"] = labels.map((label) => {
    const maxCellLength = exportRows.reduce((max, row) => {
      const value = String(row[label] ?? "");
      return Math.max(max, value.length);
    }, String(label).length);

    return { wch: Math.min(40, Math.max(12, maxCellLength + 2)) };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  XLSX.writeFile(workbook, `${filename}-${exportDateStamp()}.xlsx`);
}

export function exportToPDF(data, arg2, arg3, arg4, arg5) {
  // Backward compatible argument parser:
  // 1) legacy: exportToPDF(rows, title, columns, filename, meta)
  // 2) spec:   exportToPDF(rows, columns, title, meta, filename)
  let title = "Attendance Report";
  let columns = [];
  let filename = "attendance-export";
  let meta = {};

  if (Array.isArray(arg2) || (arg2 && typeof arg2 === "object" && !Array.isArray(arg2) && "key" in arg2)) {
    columns = Array.isArray(arg2) ? arg2 : [arg2];
    title = typeof arg3 === "string" && arg3.trim() ? arg3 : "Attendance Report";
    meta = arg4 && typeof arg4 === "object" ? arg4 : {};
    filename = typeof arg5 === "string" && arg5.trim() ? arg5 : "attendance-export";
  } else {
    title = typeof arg2 === "string" && arg2.trim() ? arg2 : "Attendance Report";
    columns = Array.isArray(arg3) ? arg3 : [];
    filename = typeof arg4 === "string" && arg4.trim() ? arg4 : "attendance-export";
    meta = arg5 && typeof arg5 === "object" ? arg5 : {};
  }

  const normalizedColumns = normalizeColumns(columns, data);
  const headers = normalizedColumns.map((column) => column.label);
  const body = (data || []).map((row) => normalizedColumns.map((column) => row?.[column.key] ?? ""));

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(14);
  doc.text("Higher Future Institute for Specialized Technological Studies", 40, 44);
  doc.setFontSize(12);
  doc.text(title || "Attendance Report", 40, 66);

  const metaEntries = Object.entries(meta || {}).filter(([, value]) => value !== undefined && value !== null && value !== "");
  let metaY = 84;
  doc.setFontSize(10);
  for (const [key, value] of metaEntries) {
    doc.text(`${key}: ${value}`, 40, metaY);
    metaY += 14;
  }

  autoTable(doc, {
    startY: metaY + 8,
    head: [headers],
    body,
    styles: {
      fontSize: 9,
      cellPadding: 6,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [10, 15, 30],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [246, 248, 252],
    },
    margin: { left: 40, right: 40 },
  });

  const totalPages = doc.internal.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFontSize(9);
    doc.text(`Generated on ${exportDateStamp()}`, 40, 820);
    doc.text(`Page ${page} of ${totalPages}`, pageWidth - 110, 820);
  }

  doc.save(`${filename}-${exportDateStamp()}.pdf`);
}
