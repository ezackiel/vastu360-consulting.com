import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { BACKEND_URL } from "../config.js";

const ROOM_LABELS = {
  entrance: "Main entrance", kitchen: "Kitchen", bedroom: "Master bedroom", room2: "Second bedroom",
  childrenRoom: "Children's room", homeOffice: "Home office / study", poojaRoom: "Pooja / prayer room",
  livingRoom: "Living / drawing room", bathroom: "Washroom", bathroom2: "Washroom 2", bathroom3: "Washroom 3",
  storeroom: "Storeroom", staircase: "Staircase", waterSource: "Water source / overhead tank"
};
const ROOM_IDS = Object.keys(ROOM_LABELS);
const DIRECTIONS = ["North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West"];

// Lets a customer trigger AI analysis of an uploaded floor plan, then
// review and correct every detected room before any of it is written into
// their actual report. The AI's output is never trusted directly — see
// backend/floorPlanVision.js for why this review step is mandatory, not
// optional polish.
export default function FloorPlanAIReview({ orderId, fileId, fileName }) {
  const { token } = useAuth();
  const [analysis, setAnalysis] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState(false);

  async function runAnalysis() {
    setError("");
    setAnalyzing(true);
    try {
      const response = await fetch(`${BACKEND_URL}/order/${orderId}/floor-plan/${fileId}/analyze`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Analysis failed.");
      setAnalysis(data.analysis);
      setRooms(data.analysis.rooms.map(r => ({ ...r })));
    } catch (err) {
      setError(err.message || "Analysis failed. You can still fill in directions manually below.");
    } finally {
      setAnalyzing(false);
    }
  }

  function updateRoom(index, field, value) {
    setRooms(rs => rs.map((r, i) => i === index ? { ...r, [field]: value } : r));
  }

  function removeRoom(index) {
    setRooms(rs => rs.filter((_, i) => i !== index));
  }

  async function applyRooms() {
    setError("");
    setApplying(true);
    try {
      const confirmable = rooms.filter(r => r.roomId && r.direction);
      if (confirmable.length === 0) {
        throw new Error("Assign a room type and direction to at least one detected room before applying.");
      }
      const response = await fetch(`${BACKEND_URL}/order/${orderId}/floor-plan/${fileId}/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ rooms: confirmable })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not apply rooms.");
      setApplied(true);
    } catch (err) {
      setError(err.message || "Could not apply rooms.");
    } finally {
      setApplying(false);
    }
  }

  if (applied) {
    return (
      <div className="ai-review-done">
        <p className="account-note">
          Applied {rooms.filter(r => r.roomId && r.direction).length} room{rooms.length === 1 ? "" : "s"} to your report.
          These will be used the next time your report is generated.
        </p>
      </div>
    );
  }

  return (
    <div className="ai-review">
      {!analysis && (
        <>
          <p className="account-note" style={{ marginTop: 0 }}>
            Have Claude read <strong>{fileName}</strong> and suggest room directions and sizes automatically.
            This is a draft — floor plans vary a lot, so you'll review and fix anything before it's applied.
          </p>
          <button type="button" className="btn-secondary" onClick={runAnalysis} disabled={analyzing}>
            {analyzing ? "Analyzing… (can take up to 30s)" : "Analyze with AI"}
          </button>
        </>
      )}

      {error && <p className="chat-error" style={{ display: "block", marginTop: 8 }}>{error}</p>}

      {analysis && (
        <div style={{ marginTop: 12 }}>
          <p className="account-note" style={{ marginTop: 0 }}>
            {analysis.northArrowNote}{" "}
            {analysis.overallConfidence === "low" && "Confidence on this reading is low — double-check everything below carefully."}
          </p>
          {analysis.warnings.length > 0 && (
            <ul className="ai-review-warnings">
              {analysis.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          )}

          <table className="ai-review-table">
            <thead>
              <tr>
                <th>Detected label</th>
                <th>Room type</th>
                <th>Direction</th>
                <th>Width (ft)</th>
                <th>Length (ft)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r, i) => (
                <tr key={i}>
                  <td>{r.detectedLabel}</td>
                  <td>
                    <select value={r.roomId || ""} onChange={e => updateRoom(i, "roomId", e.target.value || null)}>
                      <option value="">— not this report —</option>
                      {ROOM_IDS.map(id => <option key={id} value={id}>{ROOM_LABELS[id]}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={r.direction || ""} onChange={e => updateRoom(i, "direction", e.target.value || null)}>
                      <option value="">—</option>
                      {DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </td>
                  <td><input type="number" min="0" value={r.widthFeet || ""} onChange={e => updateRoom(i, "widthFeet", e.target.value)} style={{ width: 60 }} /></td>
                  <td><input type="number" min="0" value={r.lengthFeet || ""} onChange={e => updateRoom(i, "lengthFeet", e.target.value)} style={{ width: 60 }} /></td>
                  <td><button type="button" className="ai-review-remove" onClick={() => removeRoom(i)} aria-label="Remove">×</button></td>
                </tr>
              ))}
            </tbody>
          </table>

          <button type="button" className="btn-secondary" onClick={applyRooms} disabled={applying} style={{ marginTop: 12 }}>
            {applying ? "Applying…" : "Apply these rooms to my report"}
          </button>
        </div>
      )}
    </div>
  );
}
