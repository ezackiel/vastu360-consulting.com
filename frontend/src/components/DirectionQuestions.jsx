import { useState } from "react";
import { QUESTION_SETS, LANDED_FLOOR_OPTIONS, STAIRCASE_QUESTIONS } from "../data/questionSets.js";
import CompassWidget from "./CompassWidget.jsx";

export default function DirectionQuestions({ selectedPackage, isLanded, answers, onChange }) {
  const [compassFor, setCompassFor] = useState(null); // { fieldId, label } | null
  const baseQuestions = QUESTION_SETS[selectedPackage];

  if (!baseQuestions) {
    return <p className="no-package-msg">Select a package above to see the relevant questions.</p>;
  }

  // Landed (multi-floor) properties always have a staircase, and often a
  // second one — inject whichever of the two staircase questions the
  // selected package doesn't already ask about (Gold already asks about
  // the main staircase; Bronze/Silver don't ask about either by default).
  let questions = baseQuestions;
  if (isLanded) {
    const missing = STAIRCASE_QUESTIONS.filter(sq => !baseQuestions.some(q => q.id === sq.id));
    if (missing.length > 0) questions = [...baseQuestions, ...missing];
  }

  return (
    <>
      {questions.map(q => {
        const isEntrance = q.id === "entrance";
        const isMeasurementOnly = !!q.measurementOnly;
        const isOptional = !!q.optional;

        return (
          <div className="room-block" key={q.id}>
            {!isMeasurementOnly && (
              <div className="field">
                <label htmlFor={`q_${q.id}`}>
                  {q.label}{isOptional && <span className="optional-tag"> (optional)</span>}
                </label>
                <div className="direction-input-row">
                  <select
                    id={`q_${q.id}`}
                    required={!isOptional}
                    value={answers[`q_${q.id}`] || ""}
                    onChange={e => onChange(`q_${q.id}`, e.target.value)}
                  >
                    <option value="" disabled>{isOptional ? "Select direction (or leave blank)" : "Select direction"}</option>
                    {q.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  {q.id !== "plotShape" && (
                    <button
                      type="button"
                      className="compass-launch-btn"
                      onClick={() => setCompassFor({ fieldId: `q_${q.id}`, label: q.label })}
                    >
                      🧭 Use compass
                    </button>
                  )}
                </div>
              </div>
            )}

            {isMeasurementOnly && (
              <div className="field">
                <label>{q.label} — measurements only</label>
                <p className="field-hint">No direction needed for this room, just its size.</p>
              </div>
            )}

            {q.hasToFloor && (
              <div className="field">
                <label htmlFor={`q_${q.id}_toFloor`}>
                  {q.toFloorLabel}{isOptional && <span className="optional-tag"> (optional)</span>}
                </label>
                <select
                  id={`q_${q.id}_toFloor`}
                  required={!isOptional}
                  value={answers[`q_${q.id}_toFloor`] || ""}
                  onChange={e => onChange(`q_${q.id}_toFloor`, e.target.value)}
                >
                  <option value="" disabled>{isOptional ? "Select floor (or leave blank)" : "Select floor"}</option>
                  {LANDED_FLOOR_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            )}

            {!isEntrance && (
              <div className="dim-row">
                <div className="field">
                  <label htmlFor={`q_${q.id}_width`}>
                    Width (ft){isOptional && <span className="optional-tag"> (optional)</span>}
                  </label>
                  <input
                    type="number" min="1" step="0.1" placeholder="e.g. 10" required={!isOptional}
                    id={`q_${q.id}_width`}
                    value={answers[`q_${q.id}_width`] || ""}
                    onChange={e => onChange(`q_${q.id}_width`, e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor={`q_${q.id}_length`}>
                    Length (ft){isOptional && <span className="optional-tag"> (optional)</span>}
                  </label>
                  <input
                    type="number" min="1" step="0.1" placeholder="e.g. 12" required={!isOptional}
                    id={`q_${q.id}_length`}
                    value={answers[`q_${q.id}_length`] || ""}
                    onChange={e => onChange(`q_${q.id}_length`, e.target.value)}
                  />
                </div>
              </div>
            )}

            {isLanded && !isEntrance && (
              <div className="field" style={{ marginTop: 12 }}>
                <label htmlFor={`q_${q.id}_floor`}>
                  Floor level{isOptional && <span className="optional-tag"> (optional)</span>}
                </label>
                <select
                  id={`q_${q.id}_floor`} required={!isOptional}
                  value={answers[`q_${q.id}_floor`] || ""}
                  onChange={e => onChange(`q_${q.id}_floor`, e.target.value)}
                >
                  <option value="" disabled>Select floor</option>
                  {LANDED_FLOOR_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            )}
          </div>
        );
      })}

      {compassFor && (
        <CompassWidget
          fieldLabel={compassFor.label}
          onClose={() => setCompassFor(null)}
          onSelect={(direction) => {
            onChange(compassFor.fieldId, direction);
            setCompassFor(null);
          }}
        />
      )}
    </>
  );
}
