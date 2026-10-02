import { useState, useEffect } from "react";
import { BACKEND_URL } from "../config.js";
import { useAuth } from "../context/AuthContext.jsx";

// Optional floor plan / blueprint upload, shown once an order exists.
// On upload, the backend automatically runs AI analysis and applies every
// detected room straight into the booking — no separate "analyze" or
// "apply" click needed. If AI analysis fails for a given file (e.g. the
// plan is unclear, or AI isn't configured server-side), that file falls
// back to manual review by the Vastu360 team.
export default function FloorPlanUpload({ orderId }) {
  const { token } = useAuth();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadFiles() {
      try {
        const response = await fetch(`${BACKEND_URL}/order/${orderId}/floor-plan`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await response.json();
        if (response.ok && !cancelled) setFiles(data.files || []);
      } catch {
        // silent — upload list is a nice-to-have, not critical path
      }
    }
    if (orderId) loadFiles();
    return () => { cancelled = true; };
  }, [orderId, token]);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);

    const formData = new FormData();
    formData.append("floorPlan", file);

    try {
      const response = await fetch(`${BACKEND_URL}/order/${orderId}/floor-plan`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Upload failed.");
      setFiles(f => [...f, { ...data.file, analysisError: data.analysisError || null }]);
    } catch (err) {
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = ""; // allow re-selecting the same file
    }
  }

  return (
    <div className="floor-plan-upload" style={{ marginTop: 18 }}>
      <h4 style={{ marginBottom: 6 }}>Have a floor plan or blueprint?</h4>
      <p className="account-note" style={{ marginTop: 0 }}>
        Optional — upload it and we'll automatically read the room layout and directions into your report.
        Accepted: PDF, PNG, JPEG, WEBP (max 15MB).
      </p>

      <label className="btn-secondary" style={{ display: "inline-block", cursor: "pointer" }}>
        {uploading ? "Uploading & reading layout… (can take up to 30s)" : "Choose file"}
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: "none" }}
        />
      </label>

      {error && <p className="chat-error" style={{ display: "block", marginTop: 8 }}>{error}</p>}

      {files.length > 0 && (
        <ul className="floor-plan-list" style={{ marginTop: 12, paddingLeft: 18 }}>
          {files.map(f => (
            <li key={f.id} className="account-note" style={{ marginBottom: 14 }}>
              {f.originalName} —{" "}
              {f.autoApplied
                ? `Read automatically, ${f.roomsApplied} room${f.roomsApplied === 1 ? "" : "s"} applied to your report ✓`
                : f.analysisError
                ? `Couldn't read this automatically (${f.analysisError}) — queued for manual review`
                : "Pending review"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
