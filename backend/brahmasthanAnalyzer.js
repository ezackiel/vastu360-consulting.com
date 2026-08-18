// brahmasthanAnalyzer.js
//
// Brahmasthan calculation, built primarily from the direction-question
// answers every customer already provides (booking + scoring.roomResults)
// — no extra step required. The optional room-layout grid, when a
// customer does use it, upgrades this to a precise "here's exactly what's
// at your centre" reading; without it, this gives a personalised
// checklist grounded in the customer's own reported rooms rather than
// generic boilerplate.
//
// Why not just use direction answers to name the exact centre occupant:
// compass direction (North, South-East, etc.) only ever describes one of
// the 8 outer zones. "Centre" isn't a compass direction, so no direction
// answer can ever indicate a room sits there — that's a genuine geometric
// limit of direction-only data, not a gap in this implementation. Only
// the layout grid (which records each room's actual grid position) can
// answer "what's at the centre" directly.
//
// Classical principle (widely stated across Vastu literature, not
// specific to any one source): the Brahmasthan — the centre of the plot
// — should stay open, light, and free of heavy structure. A toilet,
// staircase, or kitchen there is a commonly cited defect (dosha); an
// open courtyard, hall, or living space is favourable.

const ROOM_LABELS_FALLBACK = {
  entrance: "Entrance", kitchen: "Kitchen", bedroom: "Master Bedroom", room2: "Bedroom",
  childrenRoom: "Children's Room", homeOffice: "Home Office", poojaRoom: "Pooja Room",
  livingRoom: "Living Room", bathroom: "Washroom", bathroom2: "Washroom 2", bathroom3: "Washroom 3",
  storeroom: "Storeroom", staircase: "Staircase", waterSource: "Water Source"
};

// How each room type is classically read when it sits at (or crowds) the
// centre. Used both for the precise grid-based reading and to decide
// which of the customer's reported rooms are worth flagging by name in
// the direction-only checklist.
const CENTRE_CLASSIFICATION = {
  bathroom:     { rating: "dosha", severity: "High",   note: "A washroom at the centre is one of the most consistently cited Brahmasthan defects — it places waste and water at the plot's core." },
  bathroom2:    { rating: "dosha", severity: "High",   note: "A washroom at the centre is one of the most consistently cited Brahmasthan defects — it places waste and water at the plot's core." },
  bathroom3:    { rating: "dosha", severity: "High",   note: "A washroom at the centre is one of the most consistently cited Brahmasthan defects — it places waste and water at the plot's core." },
  staircase:    { rating: "dosha", severity: "High",   note: "A staircase at the centre adds heavy, load-bearing structure exactly where classical guidance calls for open space." },
  kitchen:      { rating: "dosha", severity: "Medium", note: "The kitchen's fire element at the centre is traditionally read as disruptive to the balance the Brahmasthan is meant to hold." },
  storeroom:    { rating: "dosha", severity: "Medium", note: "A storeroom at the centre tends to accumulate clutter and stagnant energy in the area meant to stay open." },
  waterSource:  { rating: "dosha", severity: "Medium", note: "A heavy water installation at the centre is generally advised against, similar to a washroom in this position." },
  bedroom:      { rating: "caution", severity: "Low",  note: "A bedroom isn't a classical taboo at the centre, but it does mean the core of the home is enclosed rather than open — not ideal, not severe." },
  room2:        { rating: "caution", severity: "Low",  note: "A bedroom isn't a classical taboo at the centre, but it does mean the core of the home is enclosed rather than open — not ideal, not severe." },
  childrenRoom: { rating: "caution", severity: "Low",  note: "A bedroom isn't a classical taboo at the centre, but it does mean the core of the home is enclosed rather than open — not ideal, not severe." },
  homeOffice:   { rating: "caution", severity: "Low",  note: "A working room at the centre is workable but keeps the core enclosed rather than open." },
  livingRoom:   { rating: "favourable", severity: null, note: "An open living or hall space at the centre is consistent with classical guidance — this is a favourable placement." },
  poojaRoom:    { rating: "neutral", severity: null,    note: "A pooja room at the centre is a sacred use rather than a defect, though the strictest classical reading still prefers a fully open core." },
  entrance:     { rating: "neutral", severity: null,    note: "An entrance opening onto the centre keeps the core relatively open, even though it isn't a courtyard." }
};

// Room types worth calling out by name in the direction-only checklist —
// the ones classical guidance is strictest about keeping away from centre.
const HEAVY_ELEMENT_IDS = ["bathroom", "bathroom2", "bathroom3", "staircase", "kitchen", "storeroom", "waterSource"];

function gridSizeCentre(roomLayout) {
  const rows = Math.max(...Object.values(roomLayout).map(p => p.row)) + 1;
  const cols = Math.max(...Object.values(roomLayout).map(p => p.col)) + 1;
  if (rows < 3 || cols < 3) return null; // no meaningfully distinct centre below 3x3
  const centreRows = rows % 2 === 1 ? [Math.floor(rows / 2)] : [rows / 2 - 1, rows / 2];
  const centreCols = cols % 2 === 1 ? [Math.floor(cols / 2)] : [cols / 2 - 1, cols / 2];
  return { centreRows, centreCols };
}

/**
 * @param {Object|null|undefined} roomLayout - { [roomId]: { row, col } }, optional precision upgrade
 * @param {Object} booking - the raw booking, for room dimensions
 * @param {Object} scoring - the calculateScore() output; scoring.roomResults is what every customer
 *                           already provides via the direction questions, and is the primary input here
 * @returns {{ calculated:boolean, precise:boolean, occupant:string|null, occupantLabel:string|null,
 *             rating:string, severity:string|null, note:string, reportedHeavyRooms:Array }}
 */
function analyzeBrahmasthan(roomLayout, booking, scoring) {
  const roomResults = (scoring && scoring.roomResults) || [];
  const reportedIds = new Set(roomResults.map(r => r.id));
  const reportedHeavyRooms = HEAVY_ELEMENT_IDS
    .filter(id => reportedIds.has(id))
    .map(id => {
      const result = roomResults.find(r => r.id === id);
      return { id, label: ROOM_LABELS_FALLBACK[id] || id, direction: result.value, ...CENTRE_CLASSIFICATION[id] };
    });

  // ---------- Precise path: customer used the optional layout grid ----------
  if (roomLayout && Object.keys(roomLayout).length > 0) {
    const centre = gridSizeCentre(roomLayout);
    if (centre) {
      const { centreRows, centreCols } = centre;
      const centreEntry = Object.entries(roomLayout).find(([, pos]) =>
        centreRows.includes(pos.row) && centreCols.includes(pos.col)
      );

      if (!centreEntry) {
        return {
          calculated: true, precise: true, occupant: null, occupantLabel: null,
          rating: "favourable", severity: null,
          note: "No room was placed at the centre of your layout — the Brahmasthan is unobstructed, which is " +
            "the classically preferred state. Keep this area free of heavy furniture or storage in practice too.",
          reportedHeavyRooms
        };
      }

      const [roomId] = centreEntry;
      const classification = CENTRE_CLASSIFICATION[roomId] || {
        rating: "neutral", severity: null,
        note: "This room type isn't heavy structure, but the classical ideal is still a fully open centre."
      };
      const occupantLabel = ROOM_LABELS_FALLBACK[roomId] || roomId;
      return {
        calculated: true, precise: true, occupant: roomId, occupantLabel,
        rating: classification.rating, severity: classification.severity,
        note: `${occupantLabel} sits at the centre of your reported layout. ${classification.note}`,
        reportedHeavyRooms
      };
    }
    // grid too small to have a distinct centre — fall through to the direction-based path below
  }

  // ---------- Direction-only path: what every customer already provides ----------
  // Can't name an exact centre occupant (see file header for why), so this
  // gives a personalised checklist of the customer's own reported
  // heavy-element rooms instead of generic text.
  if (reportedHeavyRooms.length === 0) {
    return {
      calculated: false, precise: false, occupant: null, occupantLabel: null,
      rating: "unknown", severity: null,
      note: "Based on the rooms you reported, none of the classically 'heavy' room types (washroom, kitchen, " +
        "staircase, storeroom) were flagged for centre risk. As a general rule, keep the exact centre of the " +
        "plot open and free of any structure — a quick on-site check confirms this precisely.",
      reportedHeavyRooms
    };
  }

  const list = reportedHeavyRooms.map(r => `${r.label} (${r.direction})`).join(", ");
  const worst = reportedHeavyRooms.reduce((a, b) => {
    const order = { High: 0, Medium: 1, Low: 2 };
    return order[a.severity] <= order[b.severity] ? a : b;
  });

  return {
    calculated: false, precise: false, occupant: null, occupantLabel: null,
    rating: "unknown-caution", severity: worst.severity,
    note: `Direction answers alone can't confirm exactly what sits at your plot's centre — only the 8 compass ` +
      `zones are captured that way. Based on the rooms you reported, keep these away from the exact centre as ` +
      `you finalise your layout: ${list}. ${worst.note} Use the optional floor-plan layout step at booking for ` +
      `a precise, position-based reading instead of this general checklist.`,
    reportedHeavyRooms
  };
}

module.exports = { analyzeBrahmasthan };
