import { useEffect, useRef, useState } from "react";
import "./CompassWidget.css";

// Must stay in the same order/spelling as ALL_DIRECTIONS in data/questionSets.js
const POINTS = ["North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West"];

function headingToLabel(heading) {
  const idx = Math.round(heading / 45) % 8;
  return POINTS[idx];
}

/**
 * Reads the phone's real magnetometer/orientation sensor and returns a
 * live compass heading (0 = North, clockwise) plus whatever state the UI
 * needs to render permission prompts / fallbacks.
 */
function useDeviceCompass() {
  const [heading, setHeading] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | needs-permission | denied | active | unsupported
  const listenerRef = useRef(null);

  const handleOrientation = (event) => {
    let deg = null;

    if (typeof event.webkitCompassHeading === "number") {
      // iOS Safari gives true compass heading directly, no math needed.
      deg = event.webkitCompassHeading;
    } else if (event.absolute && event.alpha !== null) {
      // Android/Chrome: alpha is rotation around Z from the device's
      // start orientation; for an absolute event 0 = North already,
      // it just increases counter-clockwise so it needs flipping.
      deg = 360 - event.alpha;
    } else if (event.alpha !== null) {
      deg = 360 - event.alpha;
    }

    if (deg !== null) {
      deg = ((deg % 360) + 360) % 360;
      setHeading(deg);
      setStatus("active");
    }
  };

  const start = async () => {
    if (typeof window === "undefined" || (!("DeviceOrientationEvent" in window) && !("ondeviceorientationabsolute" in window))) {
      setStatus("unsupported");
      return;
    }

    // iOS 13+ requires an explicit user-gesture permission request.
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      try {
        const result = await DeviceOrientationEvent.requestPermission();
        if (result !== "granted") {
          setStatus("denied");
          return;
        }
      } catch {
        setStatus("denied");
        return;
      }
    }

    const eventName = "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation";
    listenerRef.current = handleOrientation;
    window.addEventListener(eventName, handleOrientation, true);
    setStatus("active");

    // If no reading arrives quickly, the sensor is likely missing
    // (most laptops/desktops) rather than just slow to report.
    setTimeout(() => {
      setHeading((current) => {
        if (current === null) setStatus((s) => (s === "active" ? "unsupported" : s));
        return current;
      });
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (listenerRef.current) {
        window.removeEventListener("deviceorientationabsolute", listenerRef.current, true);
        window.removeEventListener("deviceorientation", listenerRef.current, true);
      }
    };
  }, []);

  return { heading, status, start };
}

export default function CompassWidget({ onSelect, onClose, fieldLabel }) {
  const { heading, status, start } = useDeviceCompass();
  const [calibrated, setCalibrated] = useState(false);

  // iOS only grants sensor access when requestPermission() is called
  // directly inside a user click/tap, so the sensor is started from a
  // button press rather than automatically on mount.
  const liveLabel = heading !== null ? headingToLabel(heading) : null;

  return (
    <div className="compass-overlay" role="dialog" aria-modal="true" aria-label="Compass">
      <div className="compass-modal">
        <button className="compass-close" onClick={onClose} aria-label="Close compass">×</button>

        <p className="eyebrow">Live compass</p>
        <h3 className="compass-title">{fieldLabel || "Find the direction"}</h3>

        {status === "active" && heading !== null && (
          <>
            <div className="compass-dial-wrap">
              <div className="compass-dial" style={{ transform: `rotate(${-heading}deg)` }}>
                <span className="c-pt c-n">N</span>
                <span className="c-pt c-ne">NE</span>
                <span className="c-pt c-e">E</span>
                <span className="c-pt c-se">SE</span>
                <span className="c-pt c-s">S</span>
                <span className="c-pt c-sw">SW</span>
                <span className="c-pt c-w">W</span>
                <span className="c-pt c-nw">NW</span>
              </div>
              <div className="compass-needle" aria-hidden="true">
                <span className="needle-n" />
                <span className="needle-s" />
              </div>
              <div className="compass-hub" />
            </div>

            <p className="compass-reading">
              {Math.round(heading)}° — <strong>{liveLabel}</strong>
            </p>
            <p className="field-hint compass-hint">
              Lay the phone flat, face-up, and point the <strong>top edge of the phone</strong> at the
              feature you're measuring (e.g. stand at the plot centre and point it at the entrance).
            </p>

            <div className="compass-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => onSelect(liveLabel)}
              >
                Use "{liveLabel}"
              </button>
            </div>

            {!calibrated && (
              <p className="compass-calibrate-note" onClick={() => setCalibrated(true)}>
                Reading looks off? Wave the phone in a figure-8 a few times to calibrate the sensor, away from metal or magnets.
              </p>
            )}
          </>
        )}

        {status === "active" && heading === null && (
          <p className="field-hint compass-hint">Reading sensor…</p>
        )}

        {status === "idle" && (
          <div className="compass-fallback">
            <p className="field-hint compass-hint">
              We'll use your phone's built-in compass sensor to read a real heading —
              your browser may ask for a motion &amp; orientation permission first.
            </p>
            <button type="button" className="btn-primary" onClick={start}>Start compass</button>
            <p className="compass-manual-toggle">No sensor handy? Pick the direction manually:</p>
            <ManualPicker onSelect={onSelect} />
          </div>
        )}

        {status === "denied" && (
          <div className="compass-fallback">
            <p className="field-hint">
              Compass access was denied. You can turn it on in your browser's site settings (Motion &amp; orientation),
              then reopen this. You can also just select the direction manually below.
            </p>
            <ManualPicker onSelect={onSelect} />
          </div>
        )}

        {status === "unsupported" && (
          <div className="compass-fallback">
            <p className="field-hint">
              We couldn't get a live compass reading — this device/browser may not expose a motion sensor
              (common on laptops), or it's not over a secure connection. Use a phone's browser for a live reading,
              or pick the direction manually below.
            </p>
            <ManualPicker onSelect={onSelect} />
          </div>
        )}
      </div>
    </div>
  );
}

function ManualPicker({ onSelect }) {
  return (
    <div className="compass-manual-grid">
      {POINTS.map((p) => (
        <button key={p} type="button" className="compass-manual-btn" onClick={() => onSelect(p)}>
          {p}
        </button>
      ))}
    </div>
  );
}
