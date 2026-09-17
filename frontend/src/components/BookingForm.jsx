import { useState } from "react";
import DirectionQuestions from "./DirectionQuestions.jsx";
import FloorPlanUpload from "./FloorPlanUpload.jsx";
import PaymentPage from "./PaymentPage.jsx";
import { PACKAGE_LABELS, PACKAGE_PRICES, PROPERTY_TYPE_LABELS } from "../data/questionSets.js";
import { BACKEND_URL } from "../config.js";
import { useAuth } from "../context/AuthContext.jsx";

const initialFields = {
  name: "",
  phone: "",
  email: "",
  propertyType: "",
  residentialType: "",
  unitFloorNumber: "",
  package: "",
  buildingLengthFeet: "",
  buildingWidthFeet: ""
};

export default function BookingForm() {
  const { token } = useAuth();
  const [fields, setFields] = useState(initialFields);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null); // { requiresPayment, amount, orderId }

  const isResidential = fields.propertyType === "residential";
  const isLanded = fields.residentialType === "landed";
  const isHighrise = fields.residentialType === "highrise";

  function setField(name, value) {
    setFields(f => ({ ...f, [name]: value }));
  }

  function setPropertyType(value) {
    setFields(f => ({
      ...f,
      propertyType: value,
      // reset dependent fields when switching away from residential
      residentialType: value === "residential" ? f.residentialType : "",
      unitFloorNumber: value === "residential" ? f.unitFloorNumber : "",
      package: value === "residential" ? f.package : ""
    }));
    if (value !== "residential") setAnswers({});
  }

  function setAnswer(key, value) {
    setAnswers(a => ({ ...a, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);

    const payload = {
      name: fields.name,
      phone: fields.phone,
      email: fields.email,
      propertyType: fields.propertyType,
      ...(isResidential ? { residentialType: fields.residentialType } : {}),
      ...(isHighrise ? { unitFloorNumber: fields.unitFloorNumber } : {}),
      ...(isResidential ? { package: fields.package } : {}),
      ...(fields.buildingLengthFeet && fields.buildingWidthFeet
        ? { buildingLengthFeet: fields.buildingLengthFeet, buildingWidthFeet: fields.buildingWidthFeet }
        : {}),
      ...answers
    };

    try {
      const response = await fetch(`${BACKEND_URL}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Submission failed");

      setResult(data);
      setSubmitted(true);
    } catch (err) {
      console.error("Booking submission failed:", err);
      setSubmitError("Something went wrong submitting your booking. Please try again or contact us directly.");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  }

  if (submitted) {
    const showPayment = isResidential && fields.package && result?.requiresPayment;
    return (
      <div className="form-success" style={{ display: "block" }}>
        <h4>Thanks, request received.</h4>
        <p>{showPayment
          ? "Review your order below, then pay via DuitNow QR or bank transfer to confirm your booking."
          : "We will follow up with a custom quotation and next steps shortly."}</p>

        {showPayment && (
          <>
            <div className="order-summary" style={{ display: "block" }}>
              <div className="order-row"><span>Name</span><span>{fields.name || "—"}</span></div>
              <div className="order-row"><span>Property type</span><span>{PROPERTY_TYPE_LABELS[fields.propertyType] || "—"}</span></div>
              <div className="order-row"><span>Package</span><span>{PACKAGE_LABELS[fields.package] || "—"}</span></div>
              <div className="order-row order-total"><span>Amount due</span><span>{PACKAGE_PRICES[fields.package] || "—"}</span></div>
            </div>
            <PaymentPage orderId={result.orderId} amount={result.amount} />
          </>
        )}

        {result?.orderId && <FloorPlanUpload orderId={result.orderId} />}
      </div>
    );
  }

  return (
    <form id="vastuForm" noValidate onSubmit={handleSubmit}>
      <fieldset className="form-fieldset">
        <legend>Customer Information</legend>
        <div className="field-row">
          <div className="field">
            <label htmlFor="custName">Name <span className="req">*</span></label>
            <input type="text" id="custName" placeholder="Your full name" required
              value={fields.name} onChange={e => setField("name", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="custPhone">Phone <span className="req">*</span></label>
            <input type="tel" id="custPhone" placeholder="+60 12-345 6789" required
              value={fields.phone} onChange={e => setField("phone", e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="custEmail">Email <span className="req">*</span></label>
          <input type="email" id="custEmail" placeholder="you@example.com" required
            value={fields.email} onChange={e => setField("email", e.target.value)} />
        </div>
      </fieldset>

      <fieldset className="form-fieldset">
        <legend>Property Type</legend>
        <div className="radio-tiles">
          {["residential", "commercial", "industrial"].map(type => (
            <label className="radio-tile" key={type}>
              <input
                type="radio" name="propertyType" value={type} required={type === "residential"}
                checked={fields.propertyType === type}
                onChange={() => setPropertyType(type)}
              />
              <span>{type[0].toUpperCase() + type.slice(1)}</span>
            </label>
          ))}
        </div>

        {isResidential && (
          <div className="field" style={{ marginTop: 16 }}>
            <label htmlFor="residentialType">Residential Property Type <span className="req">*</span></label>
            <select
              id="residentialType" required
              value={fields.residentialType}
              onChange={e => setField("residentialType", e.target.value)}
            >
              <option value="" disabled>Select property type</option>
              <option value="landed">Landed Property</option>
              <option value="highrise">High-Rise Property (apartment / condo)</option>
            </select>
          </div>
        )}

        {isResidential && isHighrise && (
          <div className="field" style={{ marginTop: 16 }}>
            <label htmlFor="unitFloorNumber">Unit Floor Number <span className="req">*</span></label>
            <input
              type="number" id="unitFloorNumber" min="0" step="1" placeholder="e.g. 15" required
              value={fields.unitFloorNumber}
              onChange={e => setField("unitFloorNumber", e.target.value)}
            />
          </div>
        )}
      </fieldset>

      <fieldset className="form-fieldset">
        <legend>Package Selection</legend>
        {isResidential ? (
          <>
            <p className="package-hint">Bronze, Silver, and Gold are residential packages.</p>
            <div className="radio-tiles">
              {["bronze", "silver", "gold"].map(pkg => (
                <label className="radio-tile package-tile" key={pkg}>
                  <input
                    type="radio" name="package" value={pkg} required
                    checked={fields.package === pkg}
                    onChange={() => setField("package", pkg)}
                  />
                  <span>{PACKAGE_LABELS[pkg]}<small>{PACKAGE_PRICES[pkg]}</small></span>
                </label>
              ))}
            </div>
          </>
        ) : (
          <p className="no-package-msg">Bronze, Silver, and Gold packages apply to residential properties only. For commercial and industrial audits, we'll follow up with a custom quotation, no direction questions needed here.</p>
        )}

        {isResidential && fields.package && (
          <div style={{ marginTop: 16 }}>
            <p className="package-hint">
              Every package includes an Ayadi Shadvarga perimeter analysis. Enter the building's outer
              wall-to-wall length and width to include it — leave blank to skip.
            </p>
            <div className="field-row" style={{ display: "flex", gap: 16 }}>
              <div className="field">
                <label htmlFor="buildingLengthFeet">Outer length (feet)</label>
                <input
                  type="number" id="buildingLengthFeet" min="0" step="0.1" placeholder="e.g. 41.9"
                  value={fields.buildingLengthFeet}
                  onChange={e => setField("buildingLengthFeet", e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="buildingWidthFeet">Outer width (feet)</label>
                <input
                  type="number" id="buildingWidthFeet" min="0" step="0.1" placeholder="e.g. 23.4"
                  value={fields.buildingWidthFeet}
                  onChange={e => setField("buildingWidthFeet", e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

      </fieldset>

      {isResidential && (
        <fieldset className="form-fieldset">
          <legend>Direction Questions</legend>
          <div>
            <DirectionQuestions
              selectedPackage={fields.package}
              isLanded={isLanded}
              answers={answers}
              onChange={setAnswer}
            />
          </div>
        </fieldset>
      )}

      <button type="submit" className="form-submit" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit & Continue"}
      </button>
      <p className="form-note">Residential bookings continue straight to Touch 'n Go payment. Commercial and industrial requests go to a custom quotation instead.</p>

      {submitError && (
        <div className="payment-placeholder" style={{ display: "block" }}>{submitError}</div>
      )}
    </form>
  );
}
