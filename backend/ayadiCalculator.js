// ayadiCalculator.js
//
// Implements the classical Ayadi Shadvarga building-perimeter formulas —
// a centuries-old method documented in Sanskrit architectural texts
// (Samarangana Sutradhara, Brihat Samhita, Manasara) and described
// consistently across many independent modern sources. This is an
// original implementation of the traditional method: the formulas and
// the 8 Yoni names / 27 Nakshatra names are standard, public-domain
// Vastu/Vedic-astronomy terms, not any one party's compiled work.
//
// Core formulas (perimeter in a chosen unit, typically Hasta):
//   Aya    (gain)        = remainder of (perimeter × 8) / 12
//   Vyaya  (expenditure)  = remainder of (perimeter × 9) / 10
//   Yoni   (direction)    = remainder of (perimeter × 3) / 8
//   Vara   (weekday)      = remainder of (perimeter × 9) / 7
//   Nakshatra (star)      = remainder of (perimeter × 8) / 27
//   Vayas  (age, informational) = quotient of (perimeter × 8) / 27
//
// Auspiciousness rules (also widely corroborated, not this app's invention):
//   - Aya should exceed Vyaya (gain outweighs loss)
//   - Yoni remainder should be odd (1,3,5,7 = the four cardinal
//     directions); even remainders (2,4,6,8) fall on the diagonals and
//     are traditionally considered less favourable
//
// One Hasta ≈ 0.4572 m (18 inches) is used here as a commonly cited
// conversion; regional systems vary (some texts use ~0.61m or ~0.72m
// hasta), so treat the exact numeric perimeter-in-Hasta as indicative
// rather than a single universally fixed constant.
const METERS_PER_HASTA = 0.4572;
const METERS_PER_FOOT = 0.3048;

const YONI_NAMES = [
  null, // 1-indexed
  { name: "Dhwaja", direction: "East", auspicious: true },
  { name: "Dhooma", direction: "South-East", auspicious: false },
  { name: "Simha", direction: "South", auspicious: true },
  { name: "Shwana", direction: "South-West", auspicious: false },
  { name: "Vrishabha", direction: "West", auspicious: true },
  { name: "Khara", direction: "North-West", auspicious: false },
  { name: "Gaja", direction: "North", auspicious: true },
  { name: "Dhwanksha", direction: "North-East", auspicious: false }
];
// Remainder 0 traditionally falls back to the 8th position (North-East / Dhwanksha).

const NAKSHATRA_NAMES = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu",
  "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta",
  "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha",
  "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
  "Uttara Bhadrapada", "Revati"
];

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function remainder(value, divisor) {
  const r = value % divisor;
  return r === 0 ? divisor : r; // traditional convention: a zero remainder rolls to the last position, not "none"
}

function quotient(value, divisor) {
  return Math.floor(value / divisor);
}

/**
 * @param {number} lengthFeet - outer wall-to-wall length, in feet
 * @param {number} widthFeet - outer wall-to-wall width, in feet
 * @returns {object} Ayadi Shadvarga breakdown
 */
function calculateAyadi(lengthFeet, widthFeet) {
  const lengthMeters = lengthFeet * METERS_PER_FOOT;
  const widthMeters = widthFeet * METERS_PER_FOOT;
  const perimeterFeet = 2 * (lengthFeet + widthFeet);
  const perimeterMeters = 2 * (lengthMeters + widthMeters);
  const perimeterHasta = perimeterMeters / METERS_PER_HASTA;

  const ayaRemainder = remainder(Math.round(perimeterHasta * 8), 12);
  const vyayaRemainder = remainder(Math.round(perimeterHasta * 9), 10);
  const yoniRemainder = remainder(Math.round(perimeterHasta * 3), 8);
  const varaRemainder = remainder(Math.round(perimeterHasta * 9), 7);
  const nakshatraRemainder = remainder(Math.round(perimeterHasta * 8), 27);
  const vayasYears = quotient(Math.round(perimeterHasta * 8), 27);

  const yoni = YONI_NAMES[yoniRemainder] || YONI_NAMES[8];
  const nakshatra = NAKSHATRA_NAMES[nakshatraRemainder - 1] || NAKSHATRA_NAMES[26];
  const weekday = WEEKDAY_NAMES[varaRemainder - 1] || WEEKDAY_NAMES[6];

  const gainExceedsLoss = ayaRemainder > vyayaRemainder;
  const yoniIsAuspicious = yoni.auspicious;

  let overall;
  let summary;
  if (gainExceedsLoss && yoniIsAuspicious) {
    overall = "Favourable";
    summary = "Both core checks pass: the gain (Aya) figure exceeds the expenditure (Vyaya) figure, and the Yoni " +
      "falls on a cardinal direction. Traditionally, this combination is read as a supportive perimeter for the " +
      "structure as a whole.";
  } else if (gainExceedsLoss || yoniIsAuspicious) {
    overall = "Mixed";
    summary = gainExceedsLoss
      ? "The gain (Aya) figure exceeds expenditure (Vyaya), which is favourable — but the Yoni falls on a diagonal " +
        "direction rather than a cardinal one, which is traditionally read as less supportive. A small adjustment " +
        "to the outer perimeter can sometimes shift the Yoni onto a cardinal direction."
      : "The Yoni falls on a cardinal direction, which is favourable — but the expenditure (Vyaya) figure meets or " +
        "exceeds the gain (Aya) figure, traditionally read as less supportive. Small perimeter adjustments can " +
        "sometimes rebalance this.";
  } else {
    overall = "Needs review";
    summary = "Neither core check is favourable as measured: expenditure (Vyaya) meets or exceeds gain (Aya), and " +
      "the Yoni falls on a diagonal rather than a cardinal direction. This is common on odd-shaped or constrained " +
      "plots — a consultant can advise on practical adjustments, since changing outer perimeter dimensions isn't " +
      "always possible once a structure is built.";
  }

  return {
    inputs: {
      lengthFeet, widthFeet,
      perimeterFeet: Number(perimeterFeet.toFixed(2)),
      perimeterHasta: Number(perimeterHasta.toFixed(2))
    },
    aya: { remainder: ayaRemainder },
    vyaya: { remainder: vyayaRemainder },
    yoni: { remainder: yoniRemainder, name: yoni.name, direction: yoni.direction, auspicious: yoni.auspicious },
    vara: { remainder: varaRemainder, weekday },
    nakshatra: { remainder: nakshatraRemainder, name: nakshatra },
    vayas: { years: vayasYears },
    overall,
    summary
  };
}

module.exports = { calculateAyadi };
