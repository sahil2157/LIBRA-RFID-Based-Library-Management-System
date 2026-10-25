import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownToLine, ArrowLeftRight, BookOpen, Check, ChevronDown,
  Clock3, LayoutDashboard, LogOut, Moon, Plus, Search, ShieldCheck, Sun,
  Users, RefreshCw, Pencil, Trash2, LibraryBig, CircleAlert, Wifi, Menu, X,
  TrendingUp, BookCheck, CircleCheck, UserRound, CalendarDays, LockKeyhole
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "./api.js";

const navigation = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
  { id: "students", label: "Students", icon: Users },
  { id: "books", label: "Books", icon: BookOpen },
  { id: "reports", label: "Reports", icon: Activity }
];

const prettyDate = value => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};
const initials = value => String(value || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase();
const errText = e => e?.message || "Something went wrong.";

function Login({ onLogin, busy, error }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  return <div className="login-screen">
    <div className="login-art">
      <div className="login-brand"><div className="brand-icon"><LibraryBig size={26}/></div><span>Libra<span className="brand-dot">.</span></span></div>
      <div className="art-copy"><span className="kicker">SMART LIBRARY SYSTEM</span><h1>Your library,<br/><em>in sync.</em></h1><p>Track books, manage students, and see every RFID transaction from one simple dashboard.</p></div>
      <div className="art-bottom"><span><ShieldCheck size={17}/> Private admin workspace</span><span>RFID · Inventory · Insights</span></div>
      <div className="decor-ring ring-one"></div><div className="decor-ring ring-two"></div>
    </div>
    <div className="login-panel">
      <form className="login-form" onSubmit={e => { e.preventDefault(); onLogin(username, password); }}>
        <div className="mobile-brand"><div className="brand-icon"><LibraryBig size={24}/></div><strong>Libra<span className="brand-dot">.</span></strong></div>
        <div className="login-heading"><span className="kicker">ADMIN PORTAL</span><h2>Welcome back</h2><p>Enter your admin credentials to continue.</p></div>
        <label htmlFor="username">Username</label><div className="field-with-icon"><UserRound size={18}/><input id="username" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required/></div>
        <label htmlFor="password">Password</label><div className="field-with-icon"><LockKeyhole size={18}/><input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" required/></div>
        {error && <div className="error-banner"><CircleAlert size={17}/>{error}</div>}
        <button className="button primary full" disabled={busy}>{busy ? "Signing in…" : "Sign in to dashboard"} <span>→</span></button>
        <div className="secure-note"><ShieldCheck size={16}/> Secure access for authorized administrators</div>
      </form>
      <div className="login-footer">RFID Library Management System <span>© {new Date().getFullYear()}</span></div>
    </div>
  </div>;
}

function StatCard({ label, value, foot, icon: Icon, tint }) {
  return <div className="stat-card"><div className={`stat-icon ${tint}`}><Icon size={19}/></div><div className="stat-label">{label}</div><div className="stat-value">{value ?? "—"}</div><div className="stat-foot">{foot}</div></div>;
}
function Status({ action }) {
  const issue = String(action).toUpperCase() === "ISSUE";
  return <span className={`status-pill ${issue ? "issued" : "returned"}`}><span className="status-dot"/>{issue ? "Issued" : "Returned"}</span>;
}
function Empty({ title = "Nothing here yet", detail = "Records will appear here when your library activity starts." }) {
  return <div className="empty-state"><div className="empty-icon"><LibraryBig size={25}/></div><strong>{title}</strong><p>{detail}</p></div>;
}
function SectionTitle({ eyebrow, title, detail, action }) {
  return <div className="section-title"><div><div className="kicker">{eyebrow}</div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{action}</div>;
}
function TableShell({ children }) { return <div className="table-scroll"><table>{children}</table></div>; }
function Modal({ title, onClose, children }) {
  useEffect(() => { const onKey = e => e.key === "Escape" && onClose(); window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className="modal"><div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={19}/></button></div>{children}</div></div>;
}
function StudentForm({ item, onSave, onClose, saving }) {
  const [form, setForm] = useState({ name: item?.name || "", uid: item?.uid || "", moodleId: item?.moodleId || "", email: item?.email || "", department: item?.department || item?.course || "Information Technology", division: item?.division || "", id: item?._id || undefined });
  const update = (key, value) => setForm(p => ({ ...p, [key]: value }));
  return <form className="modal-form student-registration-form" onSubmit={e => { e.preventDefault(); if (!/^[^\s@]+@apsit\.edu\.in$/i.test(form.email.trim())) { alert("Please use a valid @apsit.edu.in email address."); return; } onSave(form); }}>
    <div className="form-intro"><strong>Student profile</strong><span>All fields are compulsory. Email must use the APSIT domain.</span></div>
    <label>Full name *<input value={form.name} onChange={e => update("name", e.target.value)} required placeholder="e.g. Sahil Salunkhe" autoComplete="name"/></label>
    <label>RFID UID *<input value={form.uid} onChange={e => update("uid", e.target.value.toUpperCase())} required placeholder="e.g. ED5F4D07"/></label>
    <label>Moodle ID *<input value={form.moodleId} onChange={e => update("moodleId", e.target.value.trim())} required placeholder="Enter college Moodle ID"/></label>
    <label>APSIT email *<input type="email" value={form.email} onChange={e => update("email", e.target.value.toLowerCase())} pattern="[^\s@]+@apsit\.edu\.in" title="Use your @apsit.edu.in email address" required placeholder="name@apsit.edu.in"/></label>
    <label>Department *<select value={form.department} onChange={e => update("department", e.target.value)} required><option value="">Select department</option><option>Information Technology</option><option>Computer Engineering</option><option>Computer Science and Engineering</option><option>Electronics and Telecommunication</option><option>Mechanical Engineering</option><option>Artificial Intelligence and Data Science</option><option>Other</option></select></label>
    <label>Division *<select value={form.division} onChange={e => update("division", e.target.value)} required><option value="">Select division</option>{["A","B","C","D","E","F"].map(d => <option key={d} value={d}>Division {d}</option>)}</select></label>
    <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving}>{saving ? "Saving…" : "Save student"}</button></div>
  </form>;
}
function StudentAnalytics({ student, onLoad }) {
  const [data, setData] = useState(null); const [error, setError] = useState("");
  useEffect(() => { let live = true; onLoad(student._id).then(value => { if (live) setData(value); }).catch(e => { if (live) setError(e.message); }); return () => { live = false; }; }, [student._id, onLoad]);
  if (error) return <div className="modal-form"><div className="error-banner">{error}</div></div>;
  if (!data) return <div className="modal-form">Loading student analytics…</div>;
  const chartData = [{ name: "Books issued", count: data.counts.ISSUE }, { name: "Books returned", count: data.counts.RETURN }, { name: "Currently borrowed", count: data.counts.currentlyBorrowed }];
  return <div className="student-analytics">
    <div className="analytics-profile"><div className="analytics-avatar">{initials(data.student.name)}</div><div><h3>{data.student.name}</h3><p>{data.student.department || data.student.course} · Division {data.student.division || "—"}</p><span>{data.student.email} · Moodle ID: {data.student.moodleId || "—"}</span></div><span className={`status-pill ${data.student.active ? "returned" : "inactive"}`}>{data.student.active ? "Active" : "Inactive"}</span></div>
    <div className="analytics-kpis"><div><span>Total issue events</span><strong>{data.counts.ISSUE}</strong></div><div><span>Total return events</span><strong>{data.counts.RETURN}</strong></div><div><span>Currently held</span><strong>{data.counts.currentlyBorrowed}</strong></div><div><span>Total transactions</span><strong>{data.counts.total}</strong></div></div>
    <section className="panel analytics-chart-panel"><div className="panel-heading"><div><h3>Individual borrowing overview</h3><p>Lifetime issue, return and current-loan counts</p></div></div><div className="chart-wrap analytics-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 12, right: 15, left: -15, bottom: 3 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)"/><XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false}/><Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, color: "var(--text)" }}/><Bar dataKey="count" name="Books" fill="#3978f6" radius={[7,7,0,0]}/></BarChart></ResponsiveContainer></div></section>
    <section className="panel analytics-current"><div className="panel-heading"><div><h3>Current borrowing status</h3><p>Books this student has not yet returned</p></div></div>{data.currentBooks.length ? data.currentBooks.map(book => <div className="current-book-row" key={book._id}><span className="book-cover"><BookOpen size={18}/></span><div><strong>{book.title}</strong><small>{book.bookId} · RFID {book.uid}</small></div><span className="status-pill issued">Currently issued</span></div>) : <div className="no-current-books"><CircleCheck size={19}/><span>No books currently borrowed</span></div>}</section>
    <section className="panel analytics-history"><div className="panel-heading"><div><h3>Recent activity</h3><p>Latest issue and return events</p></div></div>{data.recent.length ? <TableShell><thead><tr><th>BOOK</th><th>DATE & TIME</th><th>ACTION</th></tr></thead><tbody>{data.recent.slice(0, 12).map(row => <tr key={row._id}><td><strong>{row.bookName}</strong><small className="history-book-id">{row.bookId}</small></td><td className="date-cell">{prettyDate(row.timestamp)}</td><td><Status action={row.action}/></td></tr>)}</tbody></TableShell> : <Empty title="No activity yet" detail="Transactions will appear after this student scans a book."/>}</section>
  </div>;
}
function BookForm({ item, onSave, onClose, saving }) {
  const [form, setForm] = useState({ bookId: item?.bookId || "", title: item?.title || "", uid: item?.uid || "", author: item?.author || "", category: item?.category || "Technology", id: item?._id || undefined });
  const update = (key, value) => setForm(p => ({ ...p, [key]: value }));
  return <form className="modal-form" onSubmit={e => { e.preventDefault(); onSave(form); }}>
    <label>Book ID<input value={form.bookId} onChange={e => update("bookId", e.target.value.toUpperCase())} required placeholder="e.g. B001"/></label>
    <label>Book title<input value={form.title} onChange={e => update("title", e.target.value)} required placeholder="e.g. Data Science"/></label>
    <label>RFID UID<input value={form.uid} onChange={e => update("uid", e.target.value.toUpperCase())} required placeholder="e.g. 030A63F7"/></label>
    <label>Author (optional)<input value={form.author} onChange={e => update("author", e.target.value)} placeholder="Author name"/></label>
    <label>Category<input value={form.category} onChange={e => update("category", e.target.value)} placeholder="Technology"/></label>
    <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving}>{saving ? "Saving…" : "Save book"}</button></div>
  </form>;
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("rfid_admin_token") || "");
  const [page, setPage] = useState("dashboard");
  const [dark, setDark] = useState(() => localStorage.getItem("rfid_theme") === "dark");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [toast, setToast] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [students, setStudents] = useState([]);
  const [books, setBooks] = useState([]);
  const [reports, setReports] = useState(null);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const notify = useCallback(message => { setToast(message); window.setTimeout(() => setToast(""), 3200); }, []);
  const logout = useCallback(() => { api.logout(); setToken(""); setDashboard(null); setTransactions([]); setStudents([]); setBooks([]); setReports(null); }, []);

  useEffect(() => {
    const expired = () => { logout(); setLoginError("Your session expired. Please sign in again."); };
    window.addEventListener("rfid-session-expired", expired);
    return () => window.removeEventListener("rfid-session-expired", expired);
  }, [logout]);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("rfid_theme", dark ? "dark" : "light");
  }, [dark]);

  const loadPage = useCallback(async (selected = page, quiet = false) => {
    if (!token) return;
    if (!quiet) setLoading(true);
    setPageError("");
    try {
      if (selected === "dashboard") setDashboard(await api.dashboard());
      if (selected === "transactions") setTransactions(await api.transactions(search, actionFilter));
      if (selected === "students") setStudents(await api.students());
      if (selected === "books") setBooks(await api.books());
      if (selected === "reports") setReports(await api.reports());
    } catch (e) { setPageError(errText(e)); }
    finally { if (!quiet) setLoading(false); }
  }, [token, page, search, actionFilter]);

  useEffect(() => { if (token) loadPage(page); }, [token, page, loadPage]);
  useEffect(() => {
    if (!token) return;
    const timer = window.setInterval(() => loadPage(page, true), 8000);
    return () => window.clearInterval(timer);
  }, [token, page, loadPage]);

  async function handleLogin(username, password) {
    setLoginBusy(true); setLoginError("");
    try {
      const result = await api.login(username, password);
      localStorage.setItem("rfid_admin_token", result.token);
      setToken(result.token);
      setPage("dashboard");
    } catch (e) { setLoginError(errText(e)); }
    finally { setLoginBusy(false); }
  }

  async function saveStudent(form) {
    setSaving(true);
    try { await api.saveStudent(form); setModal(null); await loadPage("students"); notify("Student saved successfully."); }
    catch (e) { notify(errText(e)); }
    finally { setSaving(false); }
  }
  async function saveBook(form) {
    setSaving(true);
    try { await api.saveBook(form); setModal(null); await loadPage("books"); notify("Book saved successfully."); }
    catch (e) { notify(errText(e)); }
    finally { setSaving(false); }
  }
  async function deactivate(kind, item) {
    const noun = kind === "student" ? "student" : "book";
    if (!window.confirm(`Deactivate ${noun} "${kind === "student" ? item.name : item.title}"? Historical transactions will remain.`)) return;
    try {
      if (kind === "student") await api.deactivateStudent(item._id);
      else await api.deactivateBook(item._id);
      await loadPage(page);
      notify(`${noun[0].toUpperCase() + noun.slice(1)} deactivated.`);
    } catch (e) { notify(errText(e)); }
  }

  async function exportCSV() {
    try {
      const response = await fetch(api.exportUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Could not export transactions.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "rfid-library-transactions.csv"; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { notify(errText(e)); }
  }

  const fetchStudentAnalytics = useCallback((id) => api.studentAnalytics(id), []);
  const filteredStudents = useMemo(() => students, [students]);
  const activeNav = navigation.find(n => n.id === page);
  const activeCount = dashboard?.stats?.activeBooks ?? 0;

  if (!token) return <Login onLogin={handleLogin} busy={loginBusy} error={loginError}/>;

  return <div className="app-shell">
    {sidebarOpen && <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />}
    <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
      <div className="sidebar-brand"><div className="brand-icon"><LibraryBig size={23}/></div><span>Libra<span className="brand-dot">.</span></span><button className="icon-btn mobile-close" onClick={() => setSidebarOpen(false)}><X size={19}/></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="side-nav">{navigation.map(item => <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => { setPage(item.id); setSidebarOpen(false); }}><item.icon size={19}/><span>{item.label}</span>{item.id === "transactions" && <span className="nav-arrow">›</span>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="connection-card"><div className="connection-icon"><Wifi size={17}/></div><div><strong>System connected</strong><span>Dashboard auto-refreshes</span></div><span className="live-dot"/></div>
        <button className="nav-item" onClick={() => setDark(v => !v)}>{dark ? <Sun size={19}/> : <Moon size={19}/>}<span>{dark ? "Light appearance" : "Dark appearance"}</span></button>
        <button className="nav-item logout-item" onClick={logout}><LogOut size={19}/><span>Sign out</span></button>
        <div className="profile-row"><div className="avatar admin-avatar">A</div><div className="profile-meta"><strong>Administrator</strong><span>Library manager</span></div><ShieldCheck size={17} className="profile-shield"/></div>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="topbar-left"><button className="icon-btn menu-toggle" onClick={() => setSidebarOpen(true)}><Menu size={21}/></button><div className="breadcrumb">Workspace <span>/</span> <strong>{activeNav?.label || "Overview"}</strong></div></div>
        <div className="topbar-right"><div className="live-status"><span className="live-dot"/> Live updates</div><button className="icon-btn" title="Refresh current page" onClick={() => loadPage(page)}><RefreshCw size={18}/></button><button className="top-avatar" title="Administrator">A</button></div>
      </header>

      <div className="content">
        {pageError && <div className="error-banner page-error"><CircleAlert size={17}/>{pageError}<button className="icon-btn" onClick={() => setPageError("")}><X size={16}/></button></div>}
        {loading && <div className="loading-line"><span/> Loading library data…</div>}

        {page === "dashboard" && <>
          <SectionTitle eyebrow="LIBRARY OVERVIEW" title="Good to see you, Admin" detail="Here’s what’s happening in your library today." action={<button className="button secondary" onClick={() => loadPage("dashboard")}><RefreshCw size={16}/> Refresh data</button>}/>
          <div className="stats-grid">
            <StatCard label="Registered students" value={dashboard?.stats?.activeStudents ?? "—"} foot={`${dashboard?.stats?.students ?? 0} total records`} icon={Users} tint="blue"/>
            <StatCard label="Books in catalogue" value={activeCount || 0} foot={`${dashboard?.stats?.books ?? 0} total records`} icon={BookOpen} tint="violet"/>
            <StatCard label="Currently issued" value={dashboard?.stats?.issuedBooks ?? "—"} foot="Books with a student" icon={BookCheck} tint="orange"/>
            <StatCard label="Available books" value={dashboard?.stats?.availableBooks ?? "—"} foot="Ready to borrow" icon={CircleCheck} tint="green"/>
          </div>
          <div className="dashboard-grid">
            <section className="panel activity-panel"><div className="panel-heading"><div><h3>Library activity</h3><p>RFID transactions over the last 7 days</p></div><span className="mini-tag"><TrendingUp size={14}/> Weekly</span></div>
              <div className="chart-wrap">{dashboard?.activity?.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={dashboard.activity} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}><defs><linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3978f6" stopOpacity={0.24}/><stop offset="100%" stopColor="#3978f6" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)"/><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }}/><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }}/><Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, color: "var(--text)" }}/><Area type="monotone" dataKey="transactions" name="Transactions" stroke="#3978f6" strokeWidth={2.5} fill="url(#activityFill)" activeDot={{ r: 5 }}/></AreaChart></ResponsiveContainer> : <Empty title="No activity yet"/>}</div>
            </section>
            <section className="panel quick-panel"><div className="panel-heading"><div><h3>Quick actions</h3><p>Manage your library in a few clicks</p></div></div>
              <button className="quick-action" onClick={() => { setModal({ type: "student" }); }}><span className="quick-icon blue"><Users size={18}/></span><span><strong>Add a student</strong><small>Register a student RFID card</small></span><span className="quick-chevron">›</span></button>
              <button className="quick-action" onClick={() => { setModal({ type: "book" }); }}><span className="quick-icon violet"><BookOpen size={18}/></span><span><strong>Add a book</strong><small>Register a new RFID book tag</small></span><span className="quick-chevron">›</span></button>
              <button className="quick-action" onClick={() => setPage("transactions")}><span className="quick-icon orange"><ArrowLeftRight size={18}/></span><span><strong>View transactions</strong><small>Search issue and return history</small></span><span className="quick-chevron">›</span></button>
              <button className="quick-action" onClick={exportCSV}><span className="quick-icon green"><ArrowDownToLine size={18}/></span><span><strong>Export report</strong><small>Download transaction CSV</small></span><span className="quick-chevron">›</span></button>
            </section>
          </div>
          <section className="panel recent-panel"><div className="panel-heading"><div><h3>Recent transactions</h3><p>Latest activity from your RFID reader</p></div><button className="text-button" onClick={() => setPage("transactions")}>View all <span>→</span></button></div>
            {dashboard?.recent?.length ? <TableShell><thead><tr><th>STUDENT</th><th>BOOK</th><th>DATE & TIME</th><th>ACTION</th></tr></thead><tbody>{dashboard.recent.map(row => <tr key={row._id}><td><div className="person-cell"><div className="avatar">{initials(row.studentName)}</div><div><strong>{row.studentName}</strong><small>{row.studentUID}</small></div></div></td><td><div className="book-cell"><strong>{row.bookName}</strong><small>{row.bookId}</small></div></td><td className="date-cell">{prettyDate(row.timestamp)}</td><td><Status action={row.action}/></td></tr>)}</tbody></TableShell> : <Empty title="No transactions yet" detail="Scan a student card and book tag to see activity here."/>}
          </section>
        </>}

        {page === "transactions" && <>
          <SectionTitle eyebrow="ACTIVITY LOG" title="Transactions" detail="Every book issue and return recorded by your RFID system." action={<button className="button secondary" onClick={exportCSV}><ArrowDownToLine size={16}/> Export CSV</button>}/>
          <section className="panel table-panel"><div className="table-toolbar"><div className="search-box"><Search size={17}/><input placeholder="Search student, book or RFID UID…" value={search} onChange={e => setSearch(e.target.value)}/>{search && <button className="icon-btn" onClick={() => setSearch("")}><X size={15}/></button>}</div><div className="filter-select"><CalendarDays size={16}/><select value={actionFilter} onChange={e => setActionFilter(e.target.value)}><option value="ALL">All actions</option><option value="ISSUE">Issued</option><option value="RETURN">Returned</option></select><ChevronDown size={14}/></div></div>
            {transactions.length ? <TableShell><thead><tr><th>STUDENT</th><th>BOOK</th><th>STUDENT UID</th><th>DATE & TIME</th><th>ACTION</th></tr></thead><tbody>{transactions.map(row => <tr key={row._id}><td><div className="person-cell"><div className="avatar">{initials(row.studentName)}</div><strong>{row.studentName}</strong></div></td><td><div className="book-cell"><strong>{row.bookName}</strong><small>{row.bookId} · {row.bookUID}</small></div></td><td className="mono">{row.studentUID}</td><td className="date-cell">{prettyDate(row.timestamp)}</td><td><Status action={row.action}/></td></tr>)}</tbody></TableShell> : <Empty title="No matching transactions" detail="Try a different search, or scan an RFID card and book tag."/>}
            <div className="table-footer"><span>Showing {transactions.length} record{transactions.length === 1 ? "" : "s"} (maximum 500)</span><span><span className="live-dot"/> Updates every 8 seconds</span></div>
          </section>
        </>}

        {page === "students" && <>
          <SectionTitle eyebrow="PEOPLE DIRECTORY" title="Students" detail="Register student details and link each student to an RFID card." action={<button className="button primary" onClick={() => setModal({ type: "student" })}><Plus size={17}/> Add student</button>}/>
          <div className="mini-stats"><div><Users size={18}/><span><strong>{students.length}</strong> total records</span></div><div><CircleCheck size={18}/><span><strong>{students.filter(s => s.active).length}</strong> active students</span></div></div>
          <section className="panel table-panel">{filteredStudents.length ? <TableShell><thead><tr><th>STUDENT</th><th>MOODLE ID</th><th>DEPARTMENT / DIVISION</th><th>RFID UID</th><th>STATUS</th><th className="align-right">ACTIONS</th></tr></thead><tbody>{filteredStudents.map(s => <tr key={s._id}><td><div className="person-cell"><div className="avatar">{initials(s.name)}</div><div><strong>{s.name}</strong><small>{s.email || "No email added"}</small></div></div></td><td className="mono">{s.moodleId || "—"}</td><td>{s.department || s.course || "—"} <small className="division-tag">Div. {s.division || "—"}</small></td><td className="mono">{s.uid}</td><td><span className={`status-pill ${s.active ? "returned" : "inactive"}`}><span className="status-dot"/>{s.active ? "Active" : "Inactive"}</span></td><td><div className="row-actions"><button className="icon-btn" title="View individual analytics" onClick={() => setModal({ type: "analytics", item: s })}><TrendingUp size={16}/></button><button className="icon-btn" title="Edit student" onClick={() => setModal({ type: "student", item: s })}><Pencil size={16}/></button>{s.active && <button className="icon-btn danger-hover" title="Deactivate student" onClick={() => deactivate("student", s)}><Trash2 size={16}/></button>}</div></td></tr>)}</tbody></TableShell> : <Empty title="No students yet" detail="Add students and assign their RFID card UIDs."/>}</section>
        </>}

        {page === "books" && <>
          <SectionTitle eyebrow="COLLECTION MANAGEMENT" title="Books" detail="Maintain the catalogue and monitor book availability." action={<button className="button primary" onClick={() => setModal({ type: "book" })}><Plus size={17}/> Add book</button>}/>
          <div className="mini-stats"><div><BookOpen size={18}/><span><strong>{books.length}</strong> total records</span></div><div><CircleCheck size={18}/><span><strong>{books.filter(b => b.active && !b.currentHolder).length}</strong> available now</span></div><div><BookCheck size={18}/><span><strong>{books.filter(b => b.currentHolder).length}</strong> currently issued</span></div></div>
          <section className="panel table-panel">{books.length ? <TableShell><thead><tr><th>BOOK</th><th>BOOK ID</th><th>RFID UID</th><th>AVAILABILITY</th><th className="align-right">ACTIONS</th></tr></thead><tbody>{books.map(b => <tr key={b._id}><td><div className="book-title-cell"><div className="book-cover"><BookOpen size={18}/></div><div><strong>{b.title}</strong><small>{[b.author, b.category].filter(Boolean).join(" · ") || "No details added"}</small></div></div></td><td className="mono">{b.bookId}</td><td className="mono">{b.uid}</td><td>{!b.active ? <span className="status-pill inactive"><span className="status-dot"/>Inactive</span> : b.currentHolder ? <div className="availability-cell"><span className="status-pill issued"><span className="status-dot"/>Issued</span><small>To {b.currentHolder.name}</small></div> : <span className="status-pill returned"><span className="status-dot"/>Available</span>}</td><td><div className="row-actions"><button className="icon-btn" title="Edit book" onClick={() => setModal({ type: "book", item: b })}><Pencil size={16}/></button>{b.active && <button className="icon-btn danger-hover" title="Deactivate book" onClick={() => deactivate("book", b)}><Trash2 size={16}/></button>}</div></td></tr>)}</tbody></TableShell> : <Empty title="No books yet" detail="Add books and assign their RFID tags."/>}</section>
        </>}

        {page === "reports" && <>
          <SectionTitle eyebrow="LIBRARY INSIGHTS" title="Reports & analytics" detail="A summary of borrowing activity stored in MongoDB." action={<button className="button secondary" onClick={exportCSV}><ArrowDownToLine size={16}/> Export all CSV</button>}/>
          <div className="stats-grid reports-stats"><StatCard label="Total transactions" value={dashboard?.stats?.totalTransactions ?? "—"} foot="All recorded activity" icon={Activity} tint="blue"/><StatCard label="Books issued" value={reports?.actions?.ISSUE ?? "—"} foot="Issue events" icon={BookOpen} tint="orange"/><StatCard label="Books returned" value={reports?.actions?.RETURN ?? "—"} foot="Return events" icon={BookCheck} tint="green"/><StatCard label="Current inventory" value={dashboard?.stats?.activeBooks ?? "—"} foot="Active catalogue books" icon={LibraryBig} tint="violet"/></div>
          <div className="reports-grid"><section className="panel"><div className="panel-heading"><div><h3>Most active students</h3><p>Ranked by transaction count</p></div></div>{reports?.topStudents?.length ? reports.topStudents.map((s, i) => <div className="ranking-row" key={s._id}><span className="rank">{String(i+1).padStart(2,"0")}</span><div className="avatar">{initials(s.studentName)}</div><div className="ranking-meta"><strong>{s.studentName}</strong><small>{s._id}</small></div><b>{s.transactions}</b></div>) : <Empty title="No student activity yet"/>}</section><section className="panel"><div className="panel-heading"><div><h3>Most borrowed books</h3><p>Ranked by transaction count</p></div></div>{reports?.topBooks?.length ? reports.topBooks.map((b, i) => <div className="ranking-row" key={b._id}><span className="rank">{String(i+1).padStart(2,"0")}</span><div className="book-cover"><BookOpen size={17}/></div><div className="ranking-meta"><strong>{b.bookName}</strong><small>{b._id}</small></div><b>{b.transactions}</b></div>) : <Empty title="No book activity yet"/>}</section></div>
        </>}
        <footer className="app-footer"><span>Libra Library Management</span><span><span className="live-dot"/> MongoDB connected through API</span></footer>
      </div>
    </main>

    {modal?.type === "student" && <Modal title={modal.item ? "Edit student" : "Add student"} onClose={() => setModal(null)}><StudentForm item={modal.item} onSave={saveStudent} onClose={() => setModal(null)} saving={saving}/></Modal>}
    {modal?.type === "analytics" && <Modal title="Student analytics" onClose={() => setModal(null)}><StudentAnalytics student={modal.item} onLoad={fetchStudentAnalytics}/></Modal>}
    {modal?.type === "book" && <Modal title={modal.item ? "Edit book" : "Add book"} onClose={() => setModal(null)}><BookForm item={modal.item} onSave={saveBook} onClose={() => setModal(null)} saving={saving}/></Modal>}
    {toast && <div className="toast"><Check size={17}/>{toast}</div>}
  </div>;
}
