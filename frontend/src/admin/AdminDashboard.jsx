import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { BACKEND_URL } from "../config.js";
import "./admin.css";

// ---------- small helpers ----------
const currency = (n) => `RM ${Number(n || 0).toLocaleString()}`;
const dateFmt = (iso) => (iso ? new Date(iso).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const dateTimeFmt = (iso) => (iso ? new Date(iso).toLocaleString("en-MY", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

const STATUS_LABEL = { paid: "Paid", pending_payment: "Pending payment", cancelled: "Cancelled" };

function useAdminApi(token) {
  return useCallback(async (path, options = {}) => {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Request failed.");
    return result;
  }, [token]);
}

// Admin-only files (receipts, floor plans) require a Bearer token, which a
// plain <a href> can't send — so fetch with the token, then open the
// resulting blob in a new tab instead.
function useAdminFile(token) {
  return useCallback(async (path) => {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.message || "Could not open file.");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }, [token]);
}

// ================= Root =================
export default function AdminDashboard() {
  const { user, token, loading, login, logout } = useAuth();

  if (loading) {
    return <div className="admin-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "var(--slate)" }}>Loading…</div>;
  }
  if (!token || !user) return <AdminLogin login={login} />;
  if (user.role !== "admin") {
    return (
      <div className="admin-login">
        <div className="admin-login-card admin-denied">
          <div className="admin-login-logo">Vastu<span>360</span> Admin</div>
          <p style={{ margin: "18px 0" }}>The account <strong>{user.email}</strong> doesn't have admin access.</p>
          <button className="link" onClick={logout}>Log out and try a different account</button>
        </div>
      </div>
    );
  }
  return <AdminShell user={user} token={token} logout={logout} />;
}

// ================= Login =================
function AdminLogin({ login }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login({ email, password });
    } catch (err) {
      setError(err.message || "Could not log in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <div className="admin-login-logo">Vastu<span>360</span> Admin</div>
        <div className="admin-login-sub">Team dashboard</div>
        {error && <div className="admin-login-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="admin-field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="admin-field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="admin-login-btn" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </form>
      </div>
    </div>
  );
}

// ================= Shell =================
const NAV_ITEMS = [
  { key: "overview", label: "Overview", icon: "◆" },
  { key: "bookings", label: "Bookings", icon: "▤" },
  { key: "reviews", label: "Reviews", icon: "★" },
  { key: "customers", label: "Customers", icon: "◎" }
];

function AdminShell({ user, token, logout }) {
  const api = useAdminApi(token);
  const openFile = useAdminFile(token);
  const [view, setView] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [toast, setToast] = useState("");
  const [bookingsRefreshKey, setBookingsRefreshKey] = useState(0);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  }, []);

  const loadStats = useCallback(() => {
    api("/admin/stats").then(setStats).catch(() => {});
  }, [api]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const refreshBookings = () => setBookingsRefreshKey((k) => k + 1);

  return (
    <div className="admin-root">
      <div className="admin-shell">
        <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="admin-sidebar-brand">
            <div className="logo logo-with-mark">
              <img src="/vastu360-logo.png" alt="Vastu360 logo" className="logo-mark" />
              Vastu<span>360</span>
            </div>
            <span className="tag">Admin dashboard</span>
          </div>
          <nav className="admin-nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                className={`admin-nav-item ${view === item.key ? "active" : ""}`}
                onClick={() => { setView(item.key); setSidebarOpen(false); }}
              >
                <span className="ico">{item.icon}</span>
                {item.label}
                {item.key === "bookings" && stats?.totals?.pendingFloorPlanReviews > 0 && (
                  <span className="admin-nav-badge">{stats.totals.pendingFloorPlanReviews}</span>
                )}
                {item.key === "reviews" && stats?.totals?.pendingCustomerReviews > 0 && (
                  <span className="admin-nav-badge">{stats.totals.pendingCustomerReviews}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="admin-sidebar-foot">
            <div className="admin-sidebar-user">
              {user.name}
              <small>{user.email}</small>
            </div>
            <button className="admin-logout" onClick={logout}>Log out</button>
          </div>
        </aside>

        <main className="admin-main">
          <div className="admin-topbar">
            <div>
              <h1>{NAV_ITEMS.find((n) => n.key === view)?.label}</h1>
              <div className="sub">Vastu360 admin</div>
            </div>
            <button className="admin-nav-item" style={{ display: "none" }} />
          </div>

          <div className="admin-content">
            {view === "overview" && <OverviewView stats={stats} onOpenBookings={() => setView("bookings")} />}
            {view === "bookings" && (
              <BookingsView
                api={api}
                refreshKey={bookingsRefreshKey}
                onSelect={setSelectedOrderId}
              />
            )}
            {view === "customers" && <CustomersView api={api} />}
            {view === "reviews" && <ReviewsView api={api} onChanged={loadStats} showToast={showToast} />}
          </div>
        </main>
      </div>

      {selectedOrderId && (
        <BookingDrawer
          orderId={selectedOrderId}
          api={api}
          openFile={openFile}
          onClose={() => setSelectedOrderId(null)}
          onChanged={() => { refreshBookings(); loadStats(); showToast("Saved."); }}
        />
      )}

      {toast && <div className="admin-toast">{toast}</div>}
    </div>
  );
}

// ================= Overview =================
function OverviewView({ stats, onOpenBookings }) {
  if (!stats) return <div className="admin-loading">Loading dashboard…</div>;
  const { totals, byPackage, trend } = stats;
  const maxTrend = Math.max(1, ...trend.map((d) => d.count));
  const packageTotal = Math.max(1, byPackage.bronze + byPackage.silver + byPackage.gold);

  return (
    <>
      <div className="admin-stats-grid">
        <StatCard label="Total bookings" value={totals.bookings} foot="All-time submissions" onClick={onOpenBookings} />
        <StatCard label="Paid orders" value={totals.paid} foot="Successfully completed" accent="ink" />
        <StatCard label="Awaiting payment" value={totals.pendingPayment} foot="Not yet converted" accent="sindoor" />
        <StatCard label="Revenue" value={currency(totals.revenue)} foot="From paid orders" />
        <StatCard label="Customers" value={totals.customers} foot="Registered accounts" />
        <StatCard label="Floor plans to review" value={totals.pendingFloorPlanReviews} foot="Pending team review" accent="sindoor" />
      </div>

      <div className="admin-panels-row">
        <div className="admin-panel">
          <div className="admin-panel-head"><h2>Bookings — last 14 days</h2></div>
          <div className="admin-trend">
            {trend.map((d) => (
              <div key={d.date} className="admin-trend-bar" style={{ height: `${Math.max(4, (d.count / maxTrend) * 100)}%` }}>
                <span className="tip">{d.count} · {d.date.slice(5)}</span>
              </div>
            ))}
          </div>
          <div className="admin-trend-labels">
            <span>{trend[0]?.date.slice(5)}</span>
            <span>{trend[trend.length - 1]?.date.slice(5)}</span>
          </div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel-head"><h2>Package mix (paid)</h2></div>
          {["bronze", "silver", "gold"].map((pkg) => (
            <div className="admin-breakdown-row" key={pkg}>
              <div className="admin-breakdown-top">
                <span className="name">{pkg}</span>
                <span className="count">{byPackage[pkg]}</span>
              </div>
              <div className="admin-breakdown-track">
                <div className={`admin-breakdown-fill ${pkg}`} style={{ width: `${(byPackage[pkg] / packageTotal) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, foot, accent, onClick }) {
  return (
    <div className={`admin-stat-card ${accent ? `accent-${accent}` : ""}`} onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}>
      <div className="admin-stat-label">{label}</div>
      <div className="admin-stat-value">{value}</div>
      <div className="admin-stat-foot">{foot}</div>
    </div>
  );
}

// ================= Bookings =================
function BookingsView({ api, refreshKey, onSelect }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [pkg, setPkg] = useState("");
  const [loadingRows, setLoadingRows] = useState(true);
  const pageSize = 15;

  useEffect(() => {
    setLoadingRows(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (pkg) params.set("package", pkg);

    const timeout = setTimeout(() => {
      api(`/admin/bookings?${params.toString()}`)
        .then((res) => { setRows(res.bookings); setTotal(res.total); })
        .catch(() => {})
        .finally(() => setLoadingRows(false));
    }, search ? 300 : 0);

    return () => clearTimeout(timeout);
  }, [api, page, search, status, pkg, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="admin-panel">
      <div className="admin-panel-head">
        <h2>All bookings ({total})</h2>
      </div>
      <div className="admin-toolbar" style={{ marginBottom: 16 }}>
        <input
          className="admin-search"
          placeholder="Search order ID, name, email, phone…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select className="admin-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending_payment">Pending payment</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="admin-select" value={pkg} onChange={(e) => { setPkg(e.target.value); setPage(1); }}>
          <option value="">All packages</option>
          <option value="bronze">Bronze</option>
          <option value="silver">Silver</option>
          <option value="gold">Gold</option>
        </select>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Package</th>
              <th>Type</th>
              <th>Status</th>
              <th>Floor plans</th>
              <th>Chat</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.orderId} onClick={() => onSelect(b.orderId)}>
                <td className="admin-order-id">{b.orderId}</td>
                <td>
                  <span className="admin-cell-name">{b.name || "—"}</span>
                  <span className="admin-cell-sub">{b.email || "no email"}</span>
                </td>
                <td>{b.package ? <span className="badge badge-package">{b.package}</span> : <span className="badge badge-muted">—</span>}</td>
                <td style={{ textTransform: "capitalize" }}>{b.propertyType || "—"}</td>
                <td><span className={`badge badge-${b.status}`}>{STATUS_LABEL[b.status] || b.status}</span></td>
                <td>{b.floorPlanCount > 0 ? `${b.floorPlanCount} file${b.floorPlanCount > 1 ? "s" : ""}${b.floorPlanPending ? ` · ${b.floorPlanPending} pending` : ""}` : "—"}</td>
                <td>{b.chatMessageCount || "—"}</td>
                <td>{dateFmt(b.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loadingRows && rows.length === 0 && <div className="admin-empty">No bookings match these filters.</div>}
        {loadingRows && <div className="admin-loading">Loading bookings…</div>}
      </div>

      <div className="admin-pagination">
        <span>Page {page} of {totalPages}</span>
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </div>
  );
}

// ================= Booking detail drawer =================
function BookingDrawer({ orderId, api, openFile, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusChoice, setStatusChoice] = useState("");

  const load = useCallback(() => {
    api(`/admin/bookings/${orderId}`)
      .then((res) => { setData(res); setStatusChoice(res.booking.status); })
      .catch((err) => setError(err.message));
  }, [api, orderId]);

  useEffect(() => { load(); }, [load]);

  async function saveStatus() {
    setSavingStatus(true);
    try {
      await api(`/admin/bookings/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status: statusChoice }) });
      load();
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingStatus(false);
    }
  }

  async function toggleReview(fileId, current) {
    const next = current === "reviewed" ? "pending" : "reviewed";
    try {
      await api(`/admin/floor-plan/${orderId}/${fileId}`, { method: "PATCH", body: JSON.stringify({ reviewStatus: next }) });
      load();
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="admin-drawer-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="admin-drawer">
        <div className="admin-drawer-head">
          <div>
            <h2>{orderId}</h2>
            <div className="meta">{data ? STATUS_LABEL[data.booking.status] || data.booking.status : "Loading…"}</div>
          </div>
          <button className="admin-drawer-close" onClick={onClose}>✕</button>
        </div>

        <div className="admin-drawer-body">
          {error && <div className="admin-login-error" style={{ marginBottom: 18 }}>{error}</div>}
          {!data ? (
            <div className="admin-loading">Loading order…</div>
          ) : (
            <>
              <div className="admin-drawer-section">
                <h3>Customer</h3>
                <div className="admin-kv-grid">
                  <div className="admin-kv"><label>Name</label><span>{data.booking.name || "—"}</span></div>
                  <div className="admin-kv"><label>Email</label><span>{data.booking.email || "—"}</span></div>
                  <div className="admin-kv"><label>Phone</label><span>{data.booking.phone || "—"}</span></div>
                  <div className="admin-kv"><label>Property type</label><span style={{ textTransform: "capitalize" }}>{data.booking.propertyType || "—"}</span></div>
                  {data.booking.unitFloorNumber && (
                    <div className="admin-kv"><label>Unit floor</label><span>{data.booking.unitFloorNumber}</span></div>
                  )}
                  <div className="admin-kv"><label>Package</label><span style={{ textTransform: "capitalize" }}>{data.booking.package || "—"}</span></div>
                  <div className="admin-kv"><label>Submitted</label><span>{dateTimeFmt(data.booking.createdAt)}</span></div>
                  <div className="admin-kv"><label>Paid at</label><span>{dateTimeFmt(data.booking.paidAt)}</span></div>
                  <div className="admin-kv"><label>Account</label><span>{data.booking.userId ? "Registered" : "Guest checkout"}</span></div>
                </div>
              </div>

              <div className="admin-drawer-section">
                <h3>Order status</h3>
                <div className="admin-status-row">
                  <select className="admin-select" value={statusChoice} onChange={(e) => setStatusChoice(e.target.value)}>
                    <option value="pending_payment">Pending payment</option>
                    <option value="paid">Paid</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button className="admin-btn primary" disabled={savingStatus || statusChoice === data.booking.status} onClick={saveStatus}>
                    {savingStatus ? "Saving…" : "Update status"}
                  </button>
                </div>
              </div>

              <div className="admin-drawer-section">
                <h3>Payment receipts ({(data.paymentReceipts || []).length})</h3>
                {(!data.paymentReceipts || data.paymentReceipts.length === 0) && (
                  <div className="admin-empty" style={{ padding: "12px 0" }}>No receipt uploaded.</div>
                )}
                {(data.paymentReceipts || []).map((r) => (
                  <div className="admin-file-row" key={r.id}>
                    <div className="name">
                      {r.originalName}
                      <small>{dateTimeFmt(r.uploadedAt)}</small>
                    </div>
                    <div className="admin-file-actions">
                      <button className="admin-btn" onClick={() => openFile(`/admin/receipt/${orderId}/${r.id}/file`).catch((err) => alert(err.message))}>View</button>
                    </div>
                  </div>
                ))}
              </div>

              {data.scoring && (
                <div className="admin-drawer-section">
                  <h3>Vastu score</h3>
                  <div className="admin-score-band">
                    <div className="admin-score-number">{data.scoring.score ?? "—"}</div>
                    <div className="admin-score-rating">{data.scoring.rating || ""}</div>
                  </div>
                  {Array.isArray(data.scoring.roomResults) && data.scoring.roomResults.map((r) => (
                    <div className="admin-room-row" key={r.id}>
                      <span>{r.label} <span style={{ color: "var(--slate)" }}>· {r.value}</span></span>
                      <span className="badge badge-muted">{r.status}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="admin-drawer-section">
                <h3>Floor plans ({data.floorPlans.length})</h3>
                {data.floorPlans.length === 0 && <div className="admin-empty" style={{ padding: "12px 0" }}>No files uploaded.</div>}
                {data.floorPlans.map((f) => (
                  <div className="admin-file-row" key={f.id}>
                    <div className="name">
                      {f.originalName}
                      <small>{dateTimeFmt(f.uploadedAt)}</small>
                    </div>
                    <div className="admin-file-actions">
                      <span className={`badge badge-${f.reviewStatus}`}>{f.reviewStatus}</span>
                      <button className="admin-btn" onClick={() => openFile(`/admin/floor-plan/${orderId}/${f.id}/file`).catch((err) => alert(err.message))}>View</button>
                      <button className="admin-btn" onClick={() => toggleReview(f.id, f.reviewStatus)}>
                        Mark {f.reviewStatus === "reviewed" ? "pending" : "reviewed"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="admin-drawer-section">
                <h3>Chat transcript ({data.chat.length})</h3>
                {data.chat.length === 0 ? (
                  <div className="admin-empty" style={{ padding: "12px 0" }}>No messages yet.</div>
                ) : (
                  <div className="admin-chat-log">
                    {data.chat.map((m, i) => (
                      <div className={`admin-chat-bubble ${m.role}`} key={i}>
                        {m.content}
                        <time>{dateTimeFmt(m.timestamp)}</time>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ================= Customers =================
function CustomersView({ api }) {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/admin/users").then((res) => setUsers(res.users)).catch((err) => setError(err.message));
  }, [api]);

  return (
    <div className="admin-panel">
      <div className="admin-panel-head"><h2>Registered customers {users ? `(${users.length})` : ""}</h2></div>
      {error && <div className="admin-login-error">{error}</div>}
      {!users ? (
        <div className="admin-loading">Loading customers…</div>
      ) : users.length === 0 ? (
        <div className="admin-empty">No registered accounts yet — guest checkouts don't appear here.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Orders</th>
                <th>Paid orders</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ cursor: "default" }}>
                  <td className="admin-cell-name">{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.orderCount}</td>
                  <td>{u.paidOrderCount}</td>
                  <td>{dateFmt(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReviewsView({ api, onChanged, showToast }) {
  const [reviews, setReviews] = useState(null);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [actingId, setActingId] = useState(null);

  const load = useCallback(() => {
    const query = statusFilter ? `?status=${statusFilter}` : "";
    api(`/admin/reviews${query}`).then((res) => setReviews(res.reviews)).catch((err) => setError(err.message));
  }, [api, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(reviewId, status) {
    setActingId(reviewId);
    try {
      await api(`/admin/reviews/${reviewId}`, { method: "PATCH", body: JSON.stringify({ status }) });
      showToast(status === "approved" ? "Review approved — now live on the site" : "Review rejected");
      load();
      onChanged?.();
    } catch (err) {
      showToast(err.message || "Could not update review");
    } finally {
      setActingId(null);
    }
  }

  async function remove(reviewId) {
    if (!window.confirm("Delete this review permanently?")) return;
    setActingId(reviewId);
    try {
      await api(`/admin/reviews/${reviewId}`, { method: "DELETE" });
      showToast("Review deleted");
      load();
      onChanged?.();
    } catch (err) {
      showToast(err.message || "Could not delete review");
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-head">
        <h2>Customer reviews {reviews ? `(${reviews.length})` : ""}</h2>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="admin-select">
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </select>
      </div>
      {error && <div className="admin-login-error">{error}</div>}
      {!reviews ? (
        <div className="admin-loading">Loading reviews…</div>
      ) : reviews.length === 0 ? (
        <div className="admin-empty">No {statusFilter || ""} reviews right now.</div>
      ) : (
        <div className="admin-review-list">
          {reviews.map((r) => (
            <div className="admin-review-card" key={r.id}>
              <div className="admin-review-card-head">
                <div>
                  <strong>{r.name}</strong>
                  <span className="admin-review-stars">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                </div>
                <span className={`badge badge-${r.status}`}>{r.status}</span>
              </div>
              <p className="admin-review-comment">{r.comment}</p>
              <div className="admin-review-meta">
                {r.package ? `${r.package} package` : ""}{r.propertyType ? ` · ${r.propertyType}` : ""} · order {r.orderId} · {dateFmt(r.createdAt)}
              </div>
              <div className="admin-review-actions">
                {r.status !== "approved" && (
                  <button className="admin-btn" disabled={actingId === r.id} onClick={() => setStatus(r.id, "approved")}>Approve</button>
                )}
                {r.status !== "rejected" && (
                  <button className="admin-btn" disabled={actingId === r.id} onClick={() => setStatus(r.id, "rejected")}>Reject</button>
                )}
                <button className="admin-btn" disabled={actingId === r.id} onClick={() => remove(r.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
