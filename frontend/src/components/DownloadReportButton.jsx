import { useState } from "react";
import { BACKEND_URL } from "../config.js";
import { useAuth } from "../context/AuthContext.jsx";

// Requests a short-lived, single-use download token, then opens the report
// in a new tab. A plain <a href> can't carry an Authorization header, so
// account-linked reports go through this token instead — see
// /report/:orderId/download-token in server.js.
export default function DownloadReportButton({ orderId }) {
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
    <>
      <button
        type="button"
        className="form-submit"
        onClick={handleDownload}
        disabled={busy}
        style={{ display: "block", width: "100%", marginTop: 18 }}
      >
        {busy ? "Preparing…" : "Download Your Report"}
      </button>
      {error && <p className="chat-error" style={{ display: "block" }}>{error}</p>}
    </>
  );
}
