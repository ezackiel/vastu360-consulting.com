import { useState, useEffect } from "react";
import { BACKEND_URL } from "../config.js";
import { useAuth } from "../context/AuthContext.jsx";
import FloorPlanAIReview from "./FloorPlanAIReview.jsx";

// Optional floor plan / blueprint upload, shown once an order exists.
// Files are always queued for manual review by the Vastu360 team; the
// customer can additionally trigger AI analysis per file (see
// FloorPlanAIReview.jsx) as a faster starting point, always reviewed and
// confirmed by the customer before anything is applied to their report.
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
      setFiles(f => [...f, data.file]);
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
        Optional — upload it and our team will factor it into your report. Accepted: PDF, PNG, JPEG, WEBP (max 15MB).
        Plans are reviewed manually by a consultant, not scanned automatically.
      </p>

      <label className="btn-secondary" style={{ display: "inline-block", cursor: "pointer" }}>
        {uploading ? "Uploading…" : "Choose file"}
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
              {f.originalName} — {f.reviewStatus === "reviewed" ? "Reviewed ✓" : "Pending review"}
              <FloorPlanAIReview orderId={orderId} fileId={f.id} fileName={f.originalName} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
