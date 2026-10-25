const getToken = () => localStorage.getItem("rfid_admin_token") || "";
async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(path, { ...options, headers, cache: "no-store" });
  if (response.status === 401) {
    localStorage.removeItem("rfid_admin_token");
    if (!path.includes("/auth/login")) window.dispatchEvent(new Event("rfid-session-expired"));
  }
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) throw new Error(data?.error || data?.message || `Request failed (${response.status})`);
  return data;
}
export const api = {
  login: (username, password) => request("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  me: () => request("/api/auth/me"),
  dashboard: () => request("/api/dashboard"),
  transactions: (search = "", action = "ALL") => request(`/api/transactions?${new URLSearchParams({ search, action })}`),
  students: () => request("/api/students"),
  studentAnalytics: (id) => request(`/api/students/${id}/analytics`),
  saveStudent: (data) => request("/api/students", { method: "POST", body: JSON.stringify(data) }),
  deactivateStudent: (id) => request(`/api/students/${id}`, { method: "DELETE" }),
  books: () => request("/api/books"),
  saveBook: (data) => request("/api/books", { method: "POST", body: JSON.stringify(data) }),
  deactivateBook: (id) => request(`/api/books/${id}`, { method: "DELETE" }),
  reports: () => request("/api/reports"),
  exportUrl: "/api/export/transactions",
  logout: () => { localStorage.removeItem("rfid_admin_token"); }
};
