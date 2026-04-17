const AUTH_STORAGE_KEY = "smart_attendance_auth_v1";

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

export function readAuthSession() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  const parsed = safeParse(raw);
  return parsed && typeof parsed === "object" ? parsed : null;
}

export function writeAuthSession(session) {
  if (!session || typeof session !== "object") return;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getAuthStorageKey() {
  return AUTH_STORAGE_KEY;
}
