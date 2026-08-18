import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { BACKEND_URL } from "../config.js";
import ReviewForm from "./ReviewForm.jsx";

const PACKAGE_LABELS = { bronze: "Bronze", silver: "Silver", gold: "Gold" };

function AuthForms() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "signup") await signup(form);
      else await login({ email: form.email, password: form.password });
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="account-tabs">
        <button
          type="button"
          className={mode === "login" ? "active" : ""}
          onClick={() => { setMode("login"); setError(""); }}
        >
          Log In
        </button>
        <button
          type="button"
          className={mode === "signup" ? "active" : ""}
          onClick={() => { setMode("signup"); setError(""); }}
        >
          Create Account
        </button>
      </div>

      <form className="booking-form" onSubmit={handleSubmit} style={{ marginTop: 20 }}>
        {mode === "signup" && (
          <div className="field">
            <label htmlFor="acctName">Full name <span className="req">*</span></label>
            <input type="text" id="acctName" required value={form.name} onChange={update("name")} />
          </div>
        )}
        <div className="field">
          <label htmlFor="acctEmail">Email <span className="req">*</span></label>
          <input type="email" id="acctEmail" required value={form.email} onChange={update("email")} />
        </div>
        <div className="field">
          <label htmlFor="acctPassword">Password <span className="req">*</span></label>
          <input
            type="password"
            id="acctPassword"
            required
            minLength={mode === "signup" ? 8 : undefined}
            value={form.password}
            onChange={update("password")}
          />
          {mode === "signup" && <small className="field-hint">At least 8 characters.</small>}
        </div>

        {error && <p className="chat-error" style={{ display: "block" }}>{error}</p>}

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
        </button>
      </form>

      <p className="account-note">
        {mode === "login"
          ? "New to Vastu360? Create an account to save every report you purchase."
          : "Already booked with us? Log in instead — past guest orders aren't linked automatically, but any new purchase while logged in will be saved to this account."}
      </p>
    </div>
  );
}

function DownloadButton({ orderId }) {
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleDownload() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${BACKEND_URL}/report/${orderId}/download-token`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not prepare your download.");
      window.open(`${BACKEND_URL}${result.url}`, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err.message || "Could not prepare your download.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ textAlign: "right" }}>
      <button type="button" className="btn-secondary" onClick={handleDownload} disabled={busy}>
        {busy ? "Preparing…" : "Download PDF"}
      </button>
      {error && <div className="chat-error" style={{ display: "block", marginTop: 6 }}>{error}</div>}
    </div>
  );
}

function Dashboard() {
  const { user, token, logout } = useAuth();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");
  const [expandedReviewOrderId, setExpandedReviewOrderId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadOrders() {
      try {
        const response = await fetch(`${BACKEND_URL}/account/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Could not load your reports.");
        if (!cancelled) setOrders(result.orders);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load your reports.");
      }
    }
    loadOrders();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="account-card">
      <div className="account-dashboard-head">
        <div>
          <div className="eyebrow">My Account</div>
          <h3 style={{ margin: "6px 0 2px" }}>Welcome back, {user.name.split(" ")[0]}</h3>
          <p className="account-note" style={{ margin: 0 }}>{user.email}</p>
        </div>
        <button type="button" className="btn-secondary" onClick={logout}>Log out</button>
      </div>

      <div className="account-orders">
        <h4>Your saved reports</h4>
        {error && <p className="chat-error" style={{ display: "block" }}>{error}</p>}
        {orders === null && !error && <p className="account-note">Loading your reports…</p>}
        {orders && orders.length === 0 && (
          <p className="account-note">
            No paid reports on this account yet. Once you complete a booking while logged in,
            it'll show up here for you to download any time.
          </p>
        )}
        {orders && orders.length > 0 && (
          <ul className="order-list">
            {orders.map(o => (
              <li key={o.orderId} className="order-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong>{PACKAGE_LABELS[o.package] || o.package} package</strong>
                      <span className="status-badge status-badge--done">Completed ✓</span>
                    </div>
                    <div className="account-note">
                      {o.propertyType}{o.residentialType ? ` · ${o.residentialType}` : ""} · paid{" "}
                      {o.paidAt ? new Date(o.paidAt).toLocaleDateString() : ""}
                    </div>
                    <div className="account-note">Order ref: {o.orderId}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                    <DownloadButton orderId={o.orderId} />
                    <a href="#booking" className="btn-secondary" style={{ textAlign: "center" }}>
                      Book Follow-up
                    </a>
                    {!o.review && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setExpandedReviewOrderId(id => id === o.orderId ? null : o.orderId)}
                      >
                        {expandedReviewOrderId === o.orderId ? "Cancel" : "Leave a review"}
                      </button>
                    )}
                  </div>
                </div>
                {(expandedReviewOrderId === o.orderId || o.review) && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #eee" }}>
                    <ReviewForm
                      orderId={o.orderId}
                      existingReview={o.review}
                      onSubmitted={() => setExpandedReviewOrderId(null)}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function Account() {
  const { user, loading } = useAuth();

  return (
    <section className="account-section" id="account">
      <div className="wrap" style={{ maxWidth: 640 }}>
        {!loading && !user && (
          <>
            <div className="eyebrow">Your Reports, Anytime</div>
            <h2 style={{ margin: "12px 0 24px", fontSize: "clamp(1.6rem,2.8vw,2.1rem)" }}>
              Create an account to save every report.
            </h2>
          </>
        )}
        {loading ? (
          <p className="account-note">Loading…</p>
        ) : user ? (
          <Dashboard />
        ) : (
          <AuthForms />
        )}
      </div>
    </section>
  );
}
