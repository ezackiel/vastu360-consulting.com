// vastuLogic.js
// Scores a booking's room-direction answers against an "ideal direction" table.
// Each room maps to a set of directions with points 0-10 (10 = ideal, 0 = avoid).
// Overall score is normalized to 0-100 so it works the same whether the
// customer answered 3 rooms (Bronze) or 11 rooms (Gold).

const DIRECTION_SCORES = {
  entrance:     { "North": 10, "North-East": 10, "East": 8, "North-West": 6, "South-East": 4, "West": 4, "South": 2, "South-West": 0 },
  kitchen:      { "South-East": 10, "North-West": 7, "South": 5, "North": 3, "North-East": 1 },
  bedroom:      { "South-West": 10, "South": 6, "West": 6, "North-East": 1 },
  room2:        { "South-West": 10, "West": 8, "North-West": 7, "South": 6, "North-East": 1 },
  childrenRoom: { "West": 8, "North-West": 8, "East": 6, "South": 5 },
  homeOffice:   { "North-East": 10, "North": 8, "West": 6, "South-East": 4 },
  poojaRoom:    { "North-East": 10, "East": 8, "North": 8, "West": 3 },
  bathroom:     { "North-West": 8, "West": 7, "South": 5, "South-East": 3 },
  bathroom2:    { "North-West": 8, "West": 7, "South": 5, "South-East": 3 },
  bathroom3:    { "North-West": 8, "West": 7, "South": 5, "South-East": 3 },
  storeroom:    { "South-West": 10, "North-West": 8, "West": 6, "South": 5, "North-East": 1 },
  staircase:    { "South": 8, "West": 7, "South-West": 6, "North-West": 5 },
  staircase2:   { "South": 8, "West": 7, "South-West": 6, "North-West": 5 },
  waterSource:  { "North-East": 10, "East": 7, "North": 7, "South-East": 3 },
  plotShape:    { "Square": 10, "Rectangular": 8, "L-shaped": 5, "Irregular": 3 }
};

const ROOM_LABELS = {
  entrance: "Main entrance",
  kitchen: "Kitchen",
  bedroom: "Master bedroom",
  room2: "Second bedroom",
  childrenRoom: "Children's room",
  homeOffice: "Home office / study",
  poojaRoom: "Pooja / prayer room",
  bathroom: "Washroom",
  bathroom2: "Washroom 2",
  bathroom3: "Washroom 3",
  storeroom: "Storeroom",
  staircase: "Staircase",
  staircase2: "Second staircase",
  waterSource: "Water source / overhead tank",
  plotShape: "Plot / building shape"
};

const MAX_POINTS_PER_ROOM = 10;
const NEUTRAL_DEFAULT = 2; // used if a value isn't in the direction table for that room

function statusFor(points) {
  if (points >= 8) return "Excellent";
  if (points >= 5) return "Good";
  if (points >= 3) return "Moderate";
  return "Needs improvement";
}

function ratingFor(normalizedScore) {
  if (normalizedScore >= 90) return "Excellent";
  if (normalizedScore >= 70) return "Good";
  if (normalizedScore >= 50) return "Moderate";
  return "Needs improvement";
}

// Severity bands for the issues list — drives how each flagged room is
// labelled in the report and dashboard ("High" issues surface first).
function severityFor(points) {
  if (points <= 2) return "High";
  if (points <= 5) return "Medium";
  return "Low";
}

// Short, room-specific "why this matters" line used in the issues list.
// Falls back to a generic elemental-balance note if a room isn't listed.
const IMPACT_NOTE = {
  entrance: "Affects how supportive incoming energy is for the household overall.",
  kitchen: "Fire-element placement — affects health and the cook's wellbeing.",
  bedroom: "Affects rest quality and stability for the head of household.",
  room2: "Affects rest quality for this room's occupants.",
  childrenRoom: "Affects focus, growth, and study energy for children.",
  homeOffice: "Affects clarity, decision-making, and career growth.",
  poojaRoom: "Affects the spiritual/energetic centre of the home.",
  bathroom: "Water-element placement — poor placement can drain positive energy nearby.",
  bathroom2: "Water-element placement — poor placement can drain positive energy nearby.",
  bathroom3: "Water-element placement — poor placement can drain positive energy nearby.",
  storeroom: "Affects clutter, stagnancy, and how heavy energy is contained.",
  staircase: "Affects the vertical flow of energy between floors.",
  staircase2: "Affects the vertical flow of energy between floors (second staircase).",
  waterSource: "Water-element placement — affects the wealth/flow association of the home.",
  plotShape: "Structural — affects the balance of all 16 zones at once."
};

/**
 * @param {Object} answers - e.g. { entrance: "North", kitchen: "South-East", ... }
 *                           keys must match the room ids above (no "q_" prefix).
 * @param {string[]} [expectedRoomIds] - full set of room ids this package tier
 *                           asks about, used to detect unanswered/missing zones.
 * @returns {{ score:number, rating:string, roomResults:Array, priorities:string[], issues:Array, missingZones:Array }}
 */
function calculateScore(answers, expectedRoomIds) {
  const roomIds = Object.keys(answers).filter(id => DIRECTION_SCORES[id]);

  let earned = 0;
  let possible = 0;
  const roomResults = [];

  roomIds.forEach(id => {
    const value = answers[id];
    const scoreMap = DIRECTION_SCORES[id];
    const points = scoreMap[value] !== undefined ? scoreMap[value] : NEUTRAL_DEFAULT;

    earned += points;
    possible += MAX_POINTS_PER_ROOM;

    roomResults.push({
      id,
      label: ROOM_LABELS[id] || id,
      value,
      points,
      maxPoints: MAX_POINTS_PER_ROOM,
      status: statusFor(points),
      delta: points - MAX_POINTS_PER_ROOM // negative = below ideal, 0 = ideal
    });
  });

  const normalizedScore = possible > 0 ? Math.round((earned / possible) * 100) : 0;
  const rating = ratingFor(normalizedScore);

  const priorities = roomResults
    .filter(r => r.points < 6)
    .sort((a, b) => a.points - b.points)
    .slice(0, 3)
    .map(r => `Review ${r.label.toLowerCase()} placement — currently facing ${r.value}.`);

  // Structured issue list — every room scoring below "Excellent", ranked by
  // severity, with a plain-language impact note. This is what feeds the
  // dashboard's imbalance/severity view (see server.js /account/orders and
  // the report's Priority Matrix section).
  const issues = roomResults
    .filter(r => r.points < 8)
    .sort((a, b) => a.points - b.points)
    .map(r => ({
      id: r.id,
      room: r.label,
      currentDirection: r.value,
      severity: severityFor(r.points),
      impact: IMPACT_NOTE[r.id] || "Affects the directional balance of this area.",
      pointsLost: r.maxPoints - r.points
    }));

  // Missing zones: rooms this package tier's question set includes but the
  // customer left unanswered (e.g. property doesn't have that room, or the
  // form was submitted partway). Flagged separately from low-scoring rooms
  // since "missing" and "misaligned" call for different advice.
  const missingZones = (expectedRoomIds || [])
    .filter(id => !roomIds.includes(id))
    .map(id => ROOM_LABELS[id] || id);

  return { score: normalizedScore, rating, roomResults, priorities, issues, missingZones };
}

module.exports = { calculateScore, DIRECTION_SCORES, ROOM_LABELS };
