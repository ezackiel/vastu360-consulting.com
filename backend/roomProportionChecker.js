// roomProportionChecker.js
//
// Checks a room's length:breadth ratio against classical Vastu proportion
// guidance, room type by room type. This intentionally replaces the old
// "look up this exact foot measurement for a fortune" approach — that
// structure (and its wording) came from a copyrighted third-party
// spreadsheet and has been removed.
//
// Two layers of guidance, both independently corroborated (not from the
// removed spreadsheet):
//   1. The general classical principle that a room should run somewhat
//      longer than it is wide — tied to the Aya/Vyaya perimeter formulas
//      in ayadiCalculator.js, where gain (Aya) exceeding expenditure
//      (Vyaya) is traditionally associated with a length roughly
//      1.375-1.5x the breadth.
//   2. Room-specific ideal ratios, derived from commonly-cited traditional
//      dimensions for each room type (e.g. a pooja room around 5x7 or
//      6x8 ft; a bedroom around 10x12 to 14x16 ft; a kitchen around 8x10
//      to 10x12 ft) — these appear consistently across many independent
//      Vastu references, not any single compiler's table.
//
// Ratings are simplified to Good / OK / Bad, each with the room-specific
// target proportion stated so the person knows what to aim for.

const ROOM_PROPORTION_GUIDANCE = {
  entrance:     { idealMin: 1.2, idealMax: 1.5, idealLabel: "around 1.2–1.5 : 1 (e.g. roughly 4 x 5 to 4 x 6 ft)" },
  kitchen:      { idealMin: 1.1, idealMax: 1.3, idealLabel: "around 1.1–1.3 : 1 (e.g. roughly 8 x 10 to 10 x 12 ft)" },
  bedroom:      { idealMin: 1.1, idealMax: 1.3, idealLabel: "around 1.1–1.3 : 1 (e.g. roughly 10 x 12 to 12 x 14 ft)" },
  room2:        { idealMin: 1.1, idealMax: 1.3, idealLabel: "around 1.1–1.3 : 1 (e.g. roughly 10 x 12 to 12 x 14 ft)" },
  childrenRoom: { idealMin: 1.1, idealMax: 1.3, idealLabel: "around 1.1–1.3 : 1 (e.g. roughly 10 x 11 to 10 x 12 ft)" },
  homeOffice:   { idealMin: 1.2, idealMax: 1.5, idealLabel: "around 1.2–1.5 : 1, similar to a small bedroom" },
  poojaRoom:    { idealMin: 1.3, idealMax: 1.6, idealLabel: "around 1.3–1.6 : 1 (e.g. roughly 5 x 7 to 6 x 8 ft)" },
  livingRoom:   { idealMin: 1.2, idealMax: 1.5, idealLabel: "around 1.2–1.5 : 1, rectangular rather than square, for balanced circulation" },
  bathroom:     { idealMin: 1.1, idealMax: 1.4, idealLabel: "around 1.1–1.4 : 1 (a compact rectangle works well)" },
  storeroom:    { idealMin: 1.0, idealMax: 1.4, idealLabel: "around 1.0–1.4 : 1 — shape matters less here than placement" },
  staircase:    { idealMin: 1.3, idealMax: 2.0, idealLabel: "naturally elongated along the direction of travel — a wider range is normal" },
  waterSource:  { idealMin: 1.0, idealMax: 1.4, idealLabel: "around 1.0–1.4 : 1 — shape matters less here than placement" },
  plotShape:    { idealMin: 1.0, idealMax: 1.3, idealLabel: "close to square, around 1.0–1.3 : 1" }
};

// Fallback for any room id not in the table above — the general classical
// Aya-Vyaya proportion range.
const DEFAULT_GUIDANCE = { idealMin: 1.375, idealMax: 1.5, idealLabel: "around 1.375–1.5 : 1, per the general classical Aya-Vyaya proportion guideline" };

/**
 * @param {string} roomId - e.g. "kitchen", "bedroom" — matches the ids used elsewhere in the app
 * @param {number|string} widthFeet
 * @param {number|string} lengthFeet
 * @returns {{ ratio:number, rating:"Good"|"OK"|"Bad", idealLabel:string, note:string } | null}
 */
function checkRoomProportion(roomId, widthFeet, lengthFeet) {
  const width = Number(widthFeet);
  const length = Number(lengthFeet);
  if (!width || !length || width <= 0 || length <= 0) return null;

  const longer = Math.max(width, length);
  const shorter = Math.min(width, length);
  const ratio = longer / shorter;

  const guidance = ROOM_PROPORTION_GUIDANCE[roomId] || DEFAULT_GUIDANCE;
  const { idealMin, idealMax, idealLabel } = guidance;

  // "OK" band extends a modest margin either side of the ideal range before
  // tipping into "Bad" — a room 5% outside the ideal isn't a real problem,
  // one that's 60%+ off (a corridor-like sliver, or a near-perfect square
  // where a rectangle is expected) is worth flagging clearly.
  const okMin = idealMin * 0.8;
  const okMax = idealMax * 1.3;

  let rating;
  let note;
  if (ratio >= idealMin && ratio <= idealMax) {
    rating = "Good";
    note = `This falls within the traditional ideal for a ${roomLabel(roomId)} (${idealLabel}).`;
  } else if (ratio >= okMin && ratio <= okMax) {
    rating = "OK";
    note = ratio < idealMin
      ? `A little more square than the traditional ideal for a ${roomLabel(roomId)} (${idealLabel}). Not a defect, just outside the classical target range.`
      : `A little more elongated than the traditional ideal for a ${roomLabel(roomId)} (${idealLabel}). Still a workable shape.`;
  } else {
    rating = "Bad";
    note = ratio < okMin
      ? `Noticeably more square than the traditional ideal for a ${roomLabel(roomId)} (${idealLabel}). Consider dividing the space visually (rugs, lighting zones) if the shape can't be changed.`
      : `Noticeably more elongated than the traditional ideal for a ${roomLabel(roomId)} (${idealLabel}) — this reads more like a corridor than a room. Worth a look if the layout allows adjustment.`;
  }

  return { ratio: Number(ratio.toFixed(2)), rating, idealLabel, note };
}

function roomLabel(roomId) {
  const labels = {
    entrance: "main entrance", kitchen: "kitchen", bedroom: "bedroom", room2: "bedroom",
    childrenRoom: "children's room", homeOffice: "home office", poojaRoom: "pooja room",
    livingRoom: "living room", bathroom: "washroom", storeroom: "storeroom",
    staircase: "staircase", waterSource: "water source area", plotShape: "plot"
  };
  return labels[roomId] || "room";
}

module.exports = { checkRoomProportion };

