// vastuRemedies.js
// Practical "what to actually do about it" content for the PDF report:
// a quick, non-structural fix and a renovation-level suggestion for every
// room + direction combination the booking form can produce. Used by every
// package tier (Bronze/Silver/Gold) — the report simply covers however many
// rooms that tier's question set collected.

const IDEAL_DIRECTIONS = {
  entrance: "North, North-East, or East",
  kitchen: "South-East (the Agni / fire corner)",
  bedroom: "South-West",
  room2: "South-West or West",
  childrenRoom: "West or North-West",
  homeOffice: "North-East or North",
  poojaRoom: "North-East",
  bathroom: "North-West or West",
  bathroom2: "North-West or West",
  bathroom3: "North-West or West",
  storeroom: "South-West or North-West",
  staircase: "South, West, or South-West",
  staircase2: "South, West, or South-West",
  waterSource: "North-East",
  plotShape: "Square or Rectangular"
};

// Elemental character of each compass direction — used as a fallback so a
// remedy is always generated even for a room/direction pairing not covered
// by a specific entry below.
const ELEMENT_NOTE = {
  "North": "the North is ruled by Kubera, the direction of wealth and water",
  "North-East": "the North-East (Ishaan corner) is the most sacred direction, governed by water and cosmic energy",
  "East": "the East is ruled by the rising sun — vitality and health",
  "South-East": "the South-East (Agni corner) is governed by fire",
  "South": "the South is ruled by Yama — rest and discipline",
  "South-West": "the South-West (Nairutya corner) is governed by earth — stability and strength",
  "West": "the West is ruled by Varuna — savings and gains",
  "North-West": "the North-West (Vayu corner) is governed by air — movement and support"
};

const NO_CHANGE_TEXT = "No structural change needed — this placement already works well.";

// Room-specific remedy/renovation text for the directions each question set
// can produce. `needsRenovation` drives which items appear in the report's
// "Suggested Renovation Plan" section — keep it in sync with the text.
// Anything not listed here falls back to a generated remedy built from
// ELEMENT_NOTE, based on the numeric score for that room.
const REMEDIES = {
  entrance: {
    "North": { quickFix: "Already a strong placement. Keep the entrance well-lit, uncluttered, and make sure the door opens fully (a shoe rack or furniture blocking the swing restricts how much energy can enter).", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "North-East": { quickFix: "Ideal placement. Use light colours (white, light blue, yellow) on the door and surrounding wall, and keep this corner of the plot open rather than built up.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "East": { quickFix: "A good, workable direction. Add a bright light fixture above the door, and keep the door itself as the largest door in the house — this is meant to be the most prominent entry point.", renovation: "Shifting the door a few feet toward the North-East corner of the East wall gives a small additional boost, if a redesign is already planned.", needsRenovation: false },
    "North-West": { quickFix: "Hang a wind chime near the entrance to keep air (Vayu) energy moving, and avoid heavy, dark-coloured doors. If the entrance directly faces a staircase or lift (common in apartments), a small partition or planter just inside can help.", renovation: "Relocating the main entrance toward North or North-East is the single highest-impact structural change available for this property.", needsRenovation: true },
    "South-East": { quickFix: "Place a bright red or orange mat outside and keep a light source on at the entrance to work with, not against, the fire energy here.", renovation: "Add a small partition wall or planter just inside the door to break the direct fire-line energy from the entrance to the interior.", needsRenovation: true },
    "West": { quickFix: "Add a metal (brass or steel) nameplate or door fitting, and keep the entrance area organised to support the gains/savings energy of this direction.", renovation: "Relocating the entrance toward North-West is the most practical improvement without a full redesign.", needsRenovation: true },
    "South": { quickFix: "Place a mirror at a right angle to the door (never directly facing it, which reflects incoming energy back out) to help soften the entry, and keep the entrance brightly lit.", renovation: "Relocating the main entrance is recommended — South is one of the more challenging entrance directions in Vastu.", needsRenovation: true },
    "South-West": { quickFix: "Keep this entrance minimally used if there is a secondary door elsewhere; add heavy plants or a small earthen (terracotta) feature near the threshold, and consider keeping it closed for extended periods.", renovation: "This is the most challenging entrance direction. Relocating the main entrance to North, North-East, or East should be the top priority in your renovation plan.", needsRenovation: true }
  },
  kitchen: {
    "South-East": { quickFix: "Ideal placement. Keep the stove positioned so the cook faces East while cooking, and keep the sink and water points away from the immediate South-East corner where the stove sits.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "North-West": { quickFix: "A workable alternative. Position the stove in the South-East corner of the kitchen itself if possible, cook facing East, and keep sink/water points on the opposite side of the room.", renovation: "Relocating the kitchen to the South-East corner offers a meaningful improvement, if a full renovation is planned.", needsRenovation: false },
    "South": { quickFix: "Use warm accent colours (orange, red) sparingly on one wall, ensure good ventilation directly above the stove, and always cook facing East rather than South.", renovation: "Shift the stove within the room to the South-East corner of the kitchen itself, even if the room stays put.", needsRenovation: true },
    "North": { quickFix: "Add a small brass or copper item near the stove to reinforce fire energy in a water-associated direction, keep the sink and stove on opposite walls, and avoid the exact North-East corner for the stove.", renovation: "Shifting the kitchen toward South-East, or at minimum North-West, is recommended.", needsRenovation: true },
    "North-East": { quickFix: "This is the most commonly flagged kitchen placement in Vastu. In the short term, keep the space extremely clean, avoid storing water directly under the stove, and position the stove as far from the exact North-East corner as the room allows.", renovation: "Relocating the kitchen out of the North-East corner should be a top renovation priority — this is considered the most unfavourable kitchen direction.", needsRenovation: true },
    "South-West": { quickFix: "Separate the stove and sink with a small divider or counter gap, use earth-tone colours, and keep this kitchen especially organised since South-West is also inauspicious for a kitchen without care.", renovation: "South-East remains the ideal target; South-West is workable but a relocation is still worth planning for.", needsRenovation: true }
  },
  bedroom: {
    "South-West": { quickFix: "Ideal placement. Sleep with your head toward the South or East for best results.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "South": { quickFix: "A solid alternative. Keep the bed away from directly facing the door.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "West": { quickFix: "Use grounding colours (beige, light brown) in the bedding and keep heavy furniture along the West wall.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "North-East": { quickFix: "Avoid heavy furniture in this corner and keep the room particularly clutter-free — North-East is meant to stay light and open.", renovation: "Converting this room to a study, pooja room, or living space and relocating the master bedroom to South-West is the recommended structural change.", needsRenovation: true }
  },
  room2: {
    "South-West": { quickFix: "Ideal placement for a second bedroom. Keep it uncluttered and use grounding, earthy tones.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "West": { quickFix: "Good alternative — supports restful sleep and stability. Keep heavier furniture along the West wall.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "North-West": { quickFix: "Workable, especially for a guest room — this direction supports movement and short stays.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "South": { quickFix: "Acceptable. Keep the bed positioned so the sleeper's head points South or East.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "North-East": { quickFix: "Avoid heavy storage or furniture in this corner — keep it light and minimally used as a bedroom if possible.", renovation: "If renovating, converting this room to a study or storage space and relocating the second bedroom to South-West or West is recommended.", needsRenovation: true }
  },
  childrenRoom: {
    "West": { quickFix: "Good placement for focus and stability. Add a study desk facing East or North.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "North-West": { quickFix: "Supports independence and activity. Keep the room well-ventilated.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "East": { quickFix: "Good for growth-oriented energy. Keep the study area near the East-facing window.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "South": { quickFix: "Workable, though not ideal for restful sleep. Use calming colours (soft blue, green) and keep electronics away from the sleeping area.", renovation: "If a West or North-West room becomes available, moving the children's room there is a worthwhile long-term improvement.", needsRenovation: true }
  },
  homeOffice: {
    "North-East": { quickFix: "Ideal placement for clarity and decision-making. Face North or East while working.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "North": { quickFix: "Good for a wealth/career-oriented office. Keep the desk facing North.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "West": { quickFix: "Workable for long-term, gains-focused work. Add a metal desk organiser or accents.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "South-East": { quickFix: "Fire energy can heighten stress here — keep the space cool, add a small plant, and avoid red or orange decor.", renovation: "Shifting the home office to North-East or North will noticeably improve focus and calm.", needsRenovation: true }
  },
  poojaRoom: {
    "North-East": { quickFix: "Ideal placement. Keep the space clean, uncluttered, and facing East during prayer.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "East": { quickFix: "Very good alternative. Ensure the idols/altar face West so you face East while praying.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "North": { quickFix: "Good placement. Keep this corner free of storage or unrelated furniture.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "West": { quickFix: "Workable if space is limited elsewhere — keep the altar on the East wall of the room so you still face East.", renovation: "Relocating the pooja space to North-East is the ideal long-term change.", needsRenovation: true }
  },
  bathroom: {
    "North-West": { quickFix: "Ideal placement — this is the most commonly recommended toilet/washroom direction across Vastu practice. Keep the exhaust/ventilation strong to keep air energy moving, and keep the seat facing North or South.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "West": { quickFix: "Good alternative. Keep the door closed when not in use, and use light, soothing wall colours (cream, light blue) rather than dark tiling.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "South": { quickFix: "Workable. Avoid placing the toilet seat on the North-South axis if possible, and keep this washroom's door closed when not in use.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "South-East": { quickFix: "Fire and water elements clash here — keep this bathroom strictly for utility, well-ventilated, and avoid red/orange tiling. A bowl of sea salt (changed monthly) in the corner is a commonly used, low-cost balancing remedy.", renovation: "Relocating this bathroom to North-West or West is recommended, especially if it currently shares a wall with the kitchen.", needsRenovation: true }
  },
  staircase: {
    "South": { quickFix: "Ideal placement. Keep the staircase well-lit along its full length, and make sure it doesn't run directly opposite the main entrance.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "West": { quickFix: "Good alternative placement, particularly for stairs that ascend from East to West.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "South-West": { quickFix: "Good, grounding placement for a staircase — one of the most favoured directions for this element.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "North-West": { quickFix: "Workable. Keep the area under the stairs open or used for storage only — never a kitchen, and a bedroom or pooja room should also be avoided in that under-stair space.", renovation: NO_CHANGE_TEXT, needsRenovation: false }
  },
  waterSource: {
    "North-East": { quickFix: "Ideal placement for a water tank, well, or main water point.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "East": { quickFix: "Good alternative placement.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "North": { quickFix: "Good placement, reinforces the wealth association of this direction.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "South-East": { quickFix: "Water and fire elements clash here. If this is an overhead tank, it's low-risk; if it's a well or ground-level source, monitor for any structural dampness issues.", renovation: "If relocating plumbing is feasible, moving the main water source toward North-East or East is the recommended change.", needsRenovation: true }
  },
  storeroom: {
    "South-West": { quickFix: "Ideal placement. This is the classic direction for heavy storage and stability — keep items organised rather than piled.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "North-West": { quickFix: "Good alternative, especially for items that move in and out often (luggage, seasonal goods).", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "West": { quickFix: "Workable. Keep heavier items on the lower shelves along the West wall.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "South": { quickFix: "Acceptable for general storage. Avoid storing flammable items here given the fire-adjacent energy of the South.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "North-East": { quickFix: "This is the least favourable storage direction, and it's one of the most commonly cited Vastu mistakes — North-East should stay light and open. In the short term, keep this area minimally used and decluttered.", renovation: "Relocating the storeroom to South-West or North-West is recommended, freeing the North-East corner for a pooja room, entrance, or open space.", needsRenovation: true }
  },
  plotShape: {
    "Square": { quickFix: "Ideal plot shape — balanced energy distribution across all directions.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "Rectangular": { quickFix: "Very workable shape, close to ideal as long as the length-to-width ratio stays under roughly 2:1.", renovation: NO_CHANGE_TEXT, needsRenovation: false },
    "L-shaped": { quickFix: "Treat the missing corner as an energetic deficiency — avoid placing the kitchen, pooja room, or master bedroom in the extended wing.", renovation: "Consider extending the structure to square off the missing corner, or building a boundary wall along that edge to visually complete the square.", needsRenovation: true },
    "Irregular": { quickFix: "Identify which compass corner is deficient or extended, and avoid placing high-importance rooms (kitchen, pooja room, master bedroom) in the irregular sections.", renovation: "This is the most structurally significant issue in the audit. A renovation that squares off the plot boundary, or a boundary-wall correction, should be the first item in your action plan.", needsRenovation: true }
  }
};

// Washrooms 2 and 3 are the same physical room type as the primary washroom,
// so they share its specific remedy text rather than falling through to the
// generic ELEMENT_NOTE fallback in getRemedy().
REMEDIES.bathroom2 = REMEDIES.bathroom;
REMEDIES.bathroom3 = REMEDIES.bathroom;

/**
 * @param {string} roomId
 * @param {string} value - the direction/shape the customer answered
 * @param {number} points - score out of 10 for this room, from vastuLogic
 * @returns {{ idealDirection: string, quickFix: string, renovation: string, needsRenovation: boolean }}
 */
function getRemedy(roomId, value, points) {
  const idealDirection = IDEAL_DIRECTIONS[roomId] || "an aligned direction for this room type";
  const specific = REMEDIES[roomId]?.[value];

  if (specific) {
    return { idealDirection, quickFix: specific.quickFix, renovation: specific.renovation, needsRenovation: specific.needsRenovation };
  }

  // Fallback: generate a reasonable general remedy from the direction's element.
  const note = ELEMENT_NOTE[value];
  if (note && points >= 8) {
    return {
      idealDirection,
      quickFix: `This is a favourable placement — ${note}. Keep the space clean and well-lit to maintain the benefit.`,
      renovation: NO_CHANGE_TEXT,
      needsRenovation: false
    };
  }
  if (note) {
    return {
      idealDirection,
      quickFix: `${note.charAt(0).toUpperCase()}${note.slice(1)}. Balance this room with colours, lighting, or décor associated with the ideal direction (${idealDirection}) to offset the mismatch.`,
      renovation: `Moving this room toward ${idealDirection} is the structural fix; otherwise the remedies above are the practical alternative.`,
      needsRenovation: true
    };
  }

  return {
    idealDirection,
    quickFix: "Keep this area clean, clutter-free, and well-lit — the simplest and most universally effective Vastu remedy.",
    renovation: `Moving this room toward ${idealDirection} would be the structural improvement to target, if a renovation is already planned.`,
    needsRenovation: points < 5
  };
}

module.exports = { getRemedy, IDEAL_DIRECTIONS };
