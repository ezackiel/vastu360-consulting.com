// questionSets.js (backend)
// Mirrors the room ids asked per package tier in
// frontend/src/data/questionSets.js — kept as ids only (no labels/options,
// those stay in the frontend) so the scoring engine knows which rooms a
// given tier *should* have answers for, to detect missing zones.
// If you add/remove a question in the frontend file, update this list too.

const EXPECTED_ROOM_IDS = {
  bronze: ["entrance", "kitchen", "bedroom", "room2", "bathroom", "poojaRoom", "storeroom"],
  silver: ["entrance", "bedroom", "room2", "kitchen", "childrenRoom", "homeOffice", "poojaRoom", "bathroom", "storeroom"],
  gold: ["entrance", "bedroom", "room2", "kitchen", "childrenRoom", "homeOffice", "poojaRoom", "bathroom", "storeroom", "staircase", "waterSource", "plotShape"]
};

module.exports = { EXPECTED_ROOM_IDS };
