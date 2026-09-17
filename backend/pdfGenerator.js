// pdfGenerator.js
// Builds the Vastu360 audit report PDF and pipes it to any writable stream
// (an HTTP response, a file, etc.)
//
// Requires: npm install pdfkit

const PDFDocument = require("pdfkit");
const { getRemedy } = require("./vastuRemedies");
const { calculateAyadi } = require("./ayadiCalculator");
const { checkRoomProportion } = require("./roomProportionChecker");
const { addFloorPlanSection } = require("./floorPlanGenerator");
const { analyzeBrahmasthan } = require("./brahmasthanAnalyzer");

const PACKAGE_LABELS = { bronze: "Bronze", silver: "Silver", gold: "Gold" };
const LANDED_FLOOR_ORDER = ["Ground Floor", "First Floor", "Second Floor", "Third Floor"];
const ORDERED_DIRECTIONS = ["North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West"];

// Elemental character used in the Direction Analysis table — a concise,
// original label per direction (distinct from the longer prose notes in
// vastuRemedies.js's ELEMENT_NOTE, which are used in remedy text instead).
const DIRECTION_ELEMENT = {
  "North": "Water", "North-East": "Water / Space", "East": "Air", "South-East": "Fire",
  "South": "Fire", "South-West": "Earth", "West": "Air", "North-West": "Air"
};

// Simple, original colour guide by direction — general Vastu colour
// associations (element-based), written independently for Vastu360.
// Not tied to any specific room; used in the Silver/Gold colour section.
const DIRECTION_COLOUR_GUIDE = {
  "North": { use: "Green, light blue", avoid: "Dark red" },
  "North-East": { use: "White, light yellow, light blue", avoid: "Black, dark red" },
  "East": { use: "White, light green, light blue", avoid: "Black" },
  "South-East": { use: "Orange, pink, silver", avoid: "Blue, black" },
  "South": { use: "Red, orange, pink", avoid: "Blue, black" },
  "South-West": { use: "Earthy tones — beige, brown, terracotta", avoid: "Bright blue, green" },
  "West": { use: "White, blue, silver", avoid: "Red" },
  "North-West": { use: "White, cream, grey", avoid: "Dark, heavy colours" }
};

/**
 * @param {Object} booking - { name, email, propertyType, package, residentialType, ... }
 * @param {Object} scoring - output of vastuLogic.calculateScore() — includes issues/missingZones
 * @param {WritableStream} outputStream - e.g. an Express `res`, or fs.createWriteStream(...)
 */
function generateReport(booking, scoring, outputStream) {
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(outputStream);

  const tier = booking.package; // "bronze" | "silver" | "gold"
  const isSilverPlus = tier === "silver" || tier === "gold";
  const isGold = tier === "gold";
  const isLanded = booking.residentialType === "landed";

  const buildingLengthFeet = Number(booking.buildingLengthFeet);
  const buildingWidthFeet = Number(booking.buildingWidthFeet);
  const hasAyadi = buildingLengthFeet > 0 && buildingWidthFeet > 0;
  const ayadi = hasAyadi ? calculateAyadi(buildingLengthFeet, buildingWidthFeet) : null;
  const brahmasthan = analyzeBrahmasthan(booking.roomLayout, booking, scoring);

  // ---------- Cover ----------
  doc.fontSize(22).fillColor("#8a5a2b").text("Vastu360 Audit Report", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor("#555")
    .text(`Prepared for: ${booking.name || "—"}`, { align: "center" })
    .text(`Property type: ${cap(booking.propertyType)}${booking.residentialType ? ` (${cap(booking.residentialType)})` : ""}${booking.unitFloorNumber ? ` — Floor ${booking.unitFloorNumber}` : ""}`, { align: "center" })
    .text(`Package: ${PACKAGE_LABELS[tier] || tier}`, { align: "center" })
    .text(`Date: ${new Date().toLocaleDateString("en-MY")}`, { align: "center" });
  doc.moveDown(2);

  // ---------- Property Summary (all tiers) ----------
  section(doc, "Property Summary");
  doc.fontSize(11).fillColor("#000").text(
    `This assessment covers a ${isLanded ? "landed" : "high-rise"} residence` +
    `${booking.q_entrance ? `, ${booking.q_entrance.toLowerCase()}-facing` : ""}. Room-by-room directional placement was ` +
    `mapped from the information you provided, assessed against the classical Vastu Purusha Mandala framework ` +
    `(8 directions and the Brahmasthan)${hasAyadi ? ", combined with a perimeter-based Ayadi Shadvarga analysis of the building footprint" : ""}.`,
    { width: 495 }
  );
  doc.moveDown(0.8);

  const strengths = buildStrengths(scoring);
  if (strengths.length > 0) {
    doc.fontSize(12).fillColor("#4a7a3f").text("Major Strengths");
    strengths.forEach(s => doc.fontSize(10).fillColor("#000").text(`•  ${s}`, { width: 490, indent: 8 }));
    doc.moveDown(0.6);
  }

  const improvements = buildImprovementAreas(scoring, ayadi);
  if (improvements.length > 0) {
    doc.fontSize(12).fillColor("#b23b3b").text("Areas for Improvement");
    improvements.forEach(s => doc.fontSize(10).fillColor("#000").text(`•  ${s}`, { width: 490, indent: 8 }));
    doc.moveDown(0.6);
  }

  doc.fontSize(13).fillColor("#8a5a2b").text(`Overall Vastu Score: ${scoring.score} / 100`, { continued: true })
    .fillColor("#000").text(`   |   ${scoring.rating}`);

  const floorScores = computeFloorScores(scoring, booking, isLanded);
  if (floorScores) {
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor("#555").text(floorScores.map(f => `${f.label}: ${f.score}/100`).join("    |    "));
  }
  doc.moveDown();

  if (scoring.missingZones && scoring.missingZones.length > 0) {
    doc.fontSize(9).fillColor("#a33").text(
      `Not answered / not applicable: ${scoring.missingZones.join(", ")}. These areas were skipped in your ` +
      `submission and aren't reflected in the score above.`,
      { width: 495 }
    );
    doc.moveDown();
  }

  doc.fontSize(9).fillColor("#777").text(
    "Directional guidance and remedies in this report reflect widely-practised Vastu Shastra principles — " +
    "consistent with the classical Vastu Purusha Mandala framework used by established Vastu consultancies. " +
    "Results depend on many factors beyond layout, and this report is not a substitute for professional advice " +
    "on structural, legal, or safety matters.",
    { width: 495 }
  );

  // ---------- Direction Analysis (all tiers) ----------
  doc.addPage();
  section(doc, "Direction Analysis");
  doc.fontSize(10).fillColor("#555").text(
    "Each of the 8 directions, assessed against what is actually reported there" +
    `${isLanded ? " across your floors" : ""}.`,
    { width: 495 }
  );
  doc.moveDown(0.6);
  drawTable(doc, {
    columns: [
      { header: "Direction", width: 75 },
      { header: "Element", width: 70 },
      { header: "Status", width: 90 },
      { header: "Existing Condition", width: 140 },
      { header: "Recommended Usage", width: 120 }
    ],
    rows: buildDirectionRows(scoring, booking, isLanded)
  });

  // ---------- Floor Layout — auto-generated Vastu zone diagram (all tiers).
  // Built from the room directions + width/length already collected above;
  // for landed properties, one grid is drawn per floor level. ----------
  addFloorPlanSection(doc, booking, scoring);

  // ---------- Room Analysis (all tiers) ----------
  doc.addPage();
  section(doc, "Room Analysis");
  doc.fontSize(10).fillColor("#555").text(
    "Every room the booking form collected, with its score, status, and a short note. See Recommendations for full remedy detail.",
    { width: 495 }
  );
  doc.moveDown(0.6);
  drawTable(doc, {
    columns: [
      { header: "Room", width: 110 },
      { header: "Direction", width: 90 },
      { header: "Score", width: 45, align: "center" },
      { header: "Status", width: 95 },
      { header: "Notes", width: 155 }
    ],
    rows: buildRoomAnalysisRows(scoring, booking)
  });

  // ---------- Brahmasthan Analysis (all tiers) ----------
  doc.addPage();
  section(doc, "Brahmasthan Analysis");
  doc.fontSize(10).fillColor("#555").text(
    brahmasthan.precise
      ? "Based on the room positions you placed on the layout grid, checking exactly what occupies the centre of your plot."
      : "Based on the rooms and directions you reported — a personalised checklist rather than an exact centre reading (see note below for why).",
    { width: 495 }
  );
  doc.moveDown(0.5);

  if (brahmasthan.precise && brahmasthan.occupant) {
    const ratingColour = brahmasthan.rating === "dosha" ? "#b23b3b" : brahmasthan.rating === "caution" ? "#b8860b" : "#4a7a3f";
    const ratingLabel = brahmasthan.rating === "dosha" ? "Dosha identified" : brahmasthan.rating === "caution" ? "Not ideal" : brahmasthan.rating === "favourable" ? "Favourable" : "Neutral";
    doc.fontSize(11).fillColor(ratingColour).text(`Centre occupant: ${brahmasthan.occupantLabel} — ${ratingLabel}`, { width: 495 });
    doc.moveDown(0.3);
  } else if (brahmasthan.precise) {
    doc.fontSize(11).fillColor("#4a7a3f").text("Centre is unobstructed — Favourable", { width: 495 });
    doc.moveDown(0.3);
  } else if (brahmasthan.rating === "unknown-caution") {
    const ratingColour = brahmasthan.severity === "High" ? "#b23b3b" : "#b8860b";
    doc.fontSize(11).fillColor(ratingColour).text("Centre risk factors found in your reported rooms", { width: 495 });
    doc.moveDown(0.3);
  }

  doc.fontSize(10).fillColor("#000").text(brahmasthan.note, { width: 495 });
  doc.moveDown();

  // ---------- Ayadi Shadvarga perimeter analysis — all tiers, shown only
  // if the customer's outer building length/width were captured. This is
  // an original implementation of the traditional formula (see
  // ayadiCalculator.js) — separate from the room-by-room direction
  // scoring above. ----------
  if (hasAyadi) {
    doc.addPage();
    section(doc, "Perimeter Analysis — Ayadi Shadvarga");
    doc.fontSize(10).fillColor("#555").text(
      "A traditional six-part calculation based on your building's outer perimeter, separate from the " +
      "room-direction scoring above.",
      { width: 495 }
    );
    doc.moveDown(0.6);
    doc.fontSize(10).fillColor("#000").text(
      `Outer dimensions: ${buildingLengthFeet} ft × ${buildingWidthFeet} ft  |  Perimeter: ${ayadi.inputs.perimeterFeet} ft`,
      { width: 495 }
    );
    doc.moveDown(0.5);

    drawTable(doc, {
      columns: [
        { header: "Factor", width: 110 },
        { header: "Result", width: 140 },
        { header: "Interpretation", width: 245 }
      ],
      rows: [
        ["Aya (Gain)", `Remainder ${ayadi.aya.remainder}`, "Aya should ideally exceed Vyaya."],
        ["Vyaya (Expenditure)", `Remainder ${ayadi.vyaya.remainder}`, ayadi.aya.remainder > ayadi.vyaya.remainder ? "Exceeded by Aya — favourable." : "Currently meets or exceeds Aya — the less favourable of the two core checks."],
        ["Yoni (Direction)", `${ayadi.yoni.name} — ${ayadi.yoni.direction}`, ayadi.yoni.auspicious ? "Favourable: falls on a cardinal direction." : "Falls on a diagonal direction — traditionally less favourable."],
        ["Vara (Weekday)", ayadi.vara.weekday, "Informational — traditionally associated with the foundation's symbolic timing."],
        ["Nakshatra (Star)", ayadi.nakshatra.name, "Informational, per the classical 27-star cycle."],
        ["Vayas (Symbolic Age)", `${ayadi.vayas.years} years`, "Informational figure from the same calculation."]
      ]
    });

    const overallColour = ayadi.overall === "Favourable" ? "#4a7a3f" : ayadi.overall === "Mixed" ? "#b8860b" : "#b23b3b";
    doc.fontSize(12).fillColor(overallColour).text(`Overall Perimeter Classification: ${ayadi.overall}`, 50, doc.y, { width: 495, align: "right" });
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor("#000").text(ayadi.summary, { width: 495 });
    doc.moveDown();
  }

  // ---------- Dosha Analysis (Silver + Gold) ----------
  const hasBrahmasthanConcern = (brahmasthan.precise && brahmasthan.rating === "dosha")
    || brahmasthan.rating === "unknown-caution";
  if (isSilverPlus && ((scoring.issues && scoring.issues.length > 0) || hasBrahmasthanConcern)) {
    doc.addPage();
    section(doc, "Dosha Analysis");
    doc.fontSize(10).fillColor("#555").text(
      "All identified Vastu defects (doshas), ranked by severity, with plain-language impact.",
      { width: 495 }
    );
    doc.moveDown(0.6);
    drawTable(doc, {
      columns: [
        { header: "Dosha (Defect)", width: 150 },
        { header: "Location", width: 105 },
        { header: "Severity", width: 70 },
        { header: "Impact", width: 170 }
      ],
      rows: buildDoshaRows(scoring, booking, isLanded, brahmasthan)
    });
  }

  // ---------- Recommendations (all tiers, depth varies) ----------
  doc.addPage();
  section(doc, "Recommendations");

  doc.fontSize(12).fillColor("#8a5a2b").text("Immediate Actions");
  doc.moveDown(0.2);
  const immediateCount = tier === "bronze" ? 3 : 8;
  const immediateIssues = [...scoring.issues].filter(i => i.severity !== "Low" || tier !== "bronze").slice(0, immediateCount);
  if (hasBrahmasthanConcern) {
    doc.fontSize(10).fillColor("#000").text(
      `•  Brahmasthan (plot centre): ${brahmasthan.note}`,
      { width: 490, indent: 8 }
    );
    doc.moveDown(0.3);
  }
  if (immediateIssues.length === 0 && !hasBrahmasthanConcern) {
    doc.fontSize(10).fillColor("#000").text("No urgent, non-structural corrections identified — maintain the current layout.", { width: 495 });
  } else {
    immediateIssues.forEach(issue => {
      const remedy = getRemedy(issue.id, issue.currentDirection, 10 - issue.pointsLost);
      doc.fontSize(10).fillColor("#000").text(`•  ${issue.room} (${issue.currentDirection}): ${remedy.quickFix}`, { width: 490, indent: 8 });
      doc.moveDown(0.3);
    });
  }
  if (tier === "bronze" && scoring.issues.length > immediateIssues.length) {
    doc.fontSize(9).fillColor("#777").text(
      "This Bronze report covers your top areas for improvement. Upgrade to Silver or Gold for the full Dosha " +
      "Analysis, Priority Matrix, and a structural renovation plan.",
      { width: 495 }
    );
  }
  doc.moveDown(0.6);

  doc.fontSize(12).fillColor("#8a5a2b").text("Recommended Changes");
  doc.moveDown(0.2);
  const renovationCandidates = [...scoring.roomResults]
    .map(r => ({ ...r, remedy: getRemedy(r.id, r.value, r.points) }))
    .filter(r => r.remedy.needsRenovation)
    .sort((a, b) => a.points - b.points);
  if (renovationCandidates.length === 0) {
    doc.fontSize(10).fillColor("#000").text("No structural changes are recommended — all evaluated areas are already well-aligned.", { width: 495 });
  } else if (isGold) {
    renovationCandidates.forEach((r, i) => {
      doc.fontSize(10).fillColor("#000").text(`${i + 1}. ${r.label} (currently facing ${r.value}): ${r.remedy.renovation}`, { width: 495 });
      doc.moveDown(0.3);
    });
  } else if (isSilverPlus) {
    doc.fontSize(10).fillColor("#000").text(
      `A future renovation would most improve: ${renovationCandidates.map(r => r.label).join(", ")}. Upgrade to Gold for a fully detailed, prioritised renovation plan for each.`,
      { width: 495 }
    );
  } else {
    doc.fontSize(9).fillColor("#777").text(
      "Upgrade to Silver or Gold to see which rooms would benefit most from a future renovation.",
      { width: 495 }
    );
  }
  doc.moveDown(0.6);

  if (isSilverPlus) {
    doc.fontSize(12).fillColor("#8a5a2b").text("Colour, Lighting & Natural Elements");
    doc.moveDown(0.2);
    const seenDirections = new Set();
    scoring.roomResults.forEach(r => {
      if (seenDirections.has(r.value)) return;
      const guide = DIRECTION_COLOUR_GUIDE[r.value];
      if (!guide) return;
      seenDirections.add(r.value);
      doc.fontSize(10).fillColor("#000").text(`•  ${r.value}: use ${guide.use}; avoid ${guide.avoid}.`, { width: 490, indent: 8 });
    });
    doc.moveDown(0.6);

    doc.fontSize(12).fillColor("#8a5a2b").text("Mirrors & Water Features");
    doc.moveDown(0.2);
    const worstIssue = scoring.issues[0];
    if (worstIssue) {
      doc.fontSize(10).fillColor("#000").text(`•  Avoid placing mirrors directly facing the ${worstIssue.room.toLowerCase()} door.`, { width: 490, indent: 8 });
    }
    doc.fontSize(10).fillColor("#000").text("•  A small water feature, if desired, is best placed in the North or North-East zone rather than the South-West.", { width: 490, indent: 8 });
    doc.moveDown(0.6);
  }

  const poojaRoom = scoring.roomResults.find(r => r.id === "poojaRoom");
  if (poojaRoom) {
    doc.fontSize(12).fillColor("#8a5a2b").text("Puja Recommendations");
    doc.moveDown(0.2);
    const remedy = getRemedy("poojaRoom", poojaRoom.value, poojaRoom.points);
    doc.fontSize(10).fillColor("#000").text(`•  ${remedy.quickFix}`, { width: 490, indent: 8 });
    doc.moveDown(0.6);
  }

  // ---------- Priority Matrix (Silver + Gold) ----------
  if (isSilverPlus) {
    doc.addPage();
    section(doc, "Priority Matrix");
    const priorityRows = buildPriorityMatrixRows(scoring, renovationCandidates, ayadi, brahmasthan);
    if (priorityRows.length === 0) {
      doc.fontSize(11).fillColor("#000").text("No urgent corrections identified — maintain the current layout.");
    } else {
      drawTable(doc, {
        columns: [
          { header: "Priority", width: 65 },
          { header: "Action", width: 320 },
          { header: "Category", width: 110 }
        ],
        rows: priorityRows
      });
    }
  }

  // ---------- Estimated Improvement Score (Silver + Gold) ----------
  if (isSilverPlus) {
    doc.addPage();
    section(doc, "Estimated Improvement Score");
    const predicted = estimatePredictedScore(scoring);
    doc.fontSize(11).fillColor("#000").text(`Current Score: ${scoring.score}/100`);
    doc.fontSize(11).fillColor("#000").text(`Predicted Score: ${predicted}/100  (+${predicted - scoring.score})`);
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor("#777").text(
      "Predicted score assumes the quick-fix items in the Recommendations section above are addressed. A full " +
      "structural correction of any items in the Recommended Changes section, if undertaken in a future renovation, " +
      "could bring the score higher still.",
      { width: 495 }
    );
    doc.moveDown();
  }

  // ---------- Conclusion (all tiers) ----------
  doc.addPage();
  section(doc, "Conclusion");
  doc.fontSize(11).fillColor("#000").text(buildConclusion(scoring, tier, brahmasthan), { width: 495 });

  doc.end();
}

// ---------- Property Summary helpers ----------

function roomFloor(roomId, booking) {
  if (roomId === "entrance") return LANDED_FLOOR_ORDER[0];
  return booking[`q_${roomId}_floor`];
}

function computeFloorScores(scoring, booking, isLanded) {
  if (!isLanded) return null;
  const used = new Set();
  scoring.roomResults.forEach(r => {
    const f = roomFloor(r.id, booking);
    if (f) used.add(f);
  });
  const floors = LANDED_FLOOR_ORDER.filter(f => used.has(f));
  if (floors.length < 2) return null; // not worth a breakdown if everything's on one floor

  const results = floors.map(floorLabel => {
    const roomsHere = scoring.roomResults.filter(r => roomFloor(r.id, booking) === floorLabel);
    if (roomsHere.length === 0) return null;
    const earned = roomsHere.reduce((s, r) => s + r.points, 0);
    const possible = roomsHere.reduce((s, r) => s + r.maxPoints, 0);
    return { label: floorLabel, score: possible > 0 ? Math.round((earned / possible) * 100) : null };
  }).filter(Boolean);

  return results.length > 0 ? results : null;
}

function buildStrengths(scoring) {
  return [...scoring.roomResults]
    .filter(r => r.points >= 8)
    .sort((a, b) => b.points - a.points)
    .slice(0, 5)
    .map(r => `${r.label} is placed in the ${r.value} zone — ${r.status.toLowerCase()} alignment for this room type.`);
}

function buildImprovementAreas(scoring, ayadi) {
  const bullets = [...scoring.issues]
    .filter(i => i.severity !== "Low")
    .slice(0, 4)
    .map(i => `${i.room} is currently in the ${i.currentDirection} zone (${i.severity.toLowerCase()} priority) — ${i.impact}`);
  if (ayadi && ayadi.overall !== "Favourable") {
    bullets.push(`Perimeter (Ayadi) analysis shows a ${ayadi.overall.toLowerCase()} result — see the Perimeter Analysis section.`);
  }
  return bullets;
}

// ---------- Direction Analysis ----------

function statusLabel(points) {
  if (points >= 8) return "Excellent";
  if (points >= 5) return "Good";
  if (points >= 3) return "Moderate";
  return "Needs Improvement";
}

function truncateSentence(text) {
  if (!text) return "";
  const cut = text.indexOf(". ");
  const firstSentence = cut > -1 ? text.slice(0, cut + 1) : text;
  return firstSentence.length > 110 ? `${firstSentence.slice(0, 107)}...` : firstSentence;
}

function buildDirectionRows(scoring, booking, isLanded) {
  return ORDERED_DIRECTIONS.map(direction => {
    const roomsHere = scoring.roomResults.filter(r => r.value === direction);
    const element = DIRECTION_ELEMENT[direction];
    if (roomsHere.length === 0) {
      return [direction, element, "—", "No room recorded in this zone", "Keep this zone open and well-maintained."];
    }
    const avgPoints = roomsHere.reduce((s, r) => s + r.points, 0) / roomsHere.length;
    const condition = roomsHere
      .map(r => (isLanded && roomFloor(r.id, booking) ? `${r.label} (${roomFloor(r.id, booking)})` : r.label))
      .join("; ");
    const recommended = avgPoints >= 8
      ? "No action needed — maintain as-is."
      : truncateSentence(getRemedy(roomsHere[0].id, roomsHere[0].value, roomsHere[0].points).quickFix);
    return [direction, element, statusLabel(avgPoints), condition, recommended];
  });
}

// ---------- Room Analysis ----------

function buildRoomAnalysisRows(scoring, booking) {
  const rows = scoring.roomResults.map(r => {
    const remedy = getRemedy(r.id, r.value, r.points);
    const proportion = checkRoomProportion(r.id, booking[`q_${r.id}_width`], booking[`q_${r.id}_length`]);
    let notes = r.points >= 8 ? "Ideal placement." : truncateSentence(remedy.quickFix);
    if (proportion && proportion.rating !== "Good") notes += ` Room proportion: ${proportion.rating}.`;
    return [r.label, r.value, `${r.points}/${r.maxPoints}`, statusLabel(r.points), notes];
  });

  // Living room is measurement-only (no direction question), so it isn't in
  // scoring.roomResults — show it directly from the raw booking fields.
  if (booking.q_livingRoom_width || booking.q_livingRoom_length) {
    const proportion = checkRoomProportion("livingRoom", booking.q_livingRoom_width, booking.q_livingRoom_length);
    const notes = proportion ? `Open-plan living space. Proportion: ${proportion.rating}.` : "Open-plan living space — no direction scored.";
    rows.push(["Living / Drawing Room", "— (open space)", "—", "Good", notes]);
  }
  return rows;
}

// ---------- Brahmasthan Analysis ----------

// Brahmasthan text is now computed by brahmasthanAnalyzer.js (see the
// "Brahmasthan Analysis" section above) using the customer's actual room
// layout, rather than the generic boilerplate this function used to return.

// ---------- Dosha Analysis ----------

function severityLabel(sev) {
  if (sev === "High") return "Major";
  if (sev === "Medium") return "Moderate";
  return "Minor";
}

function buildDoshaRows(scoring, booking, isLanded, brahmasthan) {
  const severityOrder = { High: 0, Medium: 1, Low: 2 };
  const rows = [...scoring.issues]
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .slice(0, 7) // trimmed to 7 so the Brahmasthan row (if any) still fits in 8
    .map(issue => {
      const floor = isLanded ? roomFloor(issue.id, booking) : null;
      return [
        `${issue.room} in ${issue.currentDirection}`,
        floor ? `${floor}, ${issue.currentDirection} zone` : `${issue.currentDirection} zone`,
        severityLabel(issue.severity),
        issue.impact
      ];
    });

  if (brahmasthan && ((brahmasthan.precise && brahmasthan.rating === "dosha") || brahmasthan.rating === "unknown-caution")) {
    const doshaRow = brahmasthan.precise
      ? [
          `${brahmasthan.occupantLabel} at Brahmasthan`,
          "Plot centre",
          severityLabel(brahmasthan.severity),
          brahmasthan.note
        ]
      : [
          "Brahmasthan risk (from reported rooms)",
          "Plot centre (unconfirmed — direction data only)",
          severityLabel(brahmasthan.severity),
          brahmasthan.note
        ];
    // Brahmasthan defects are classically treated as significant — lead with
    // it when severity is High, otherwise slot it in with the others.
    if (brahmasthan.severity === "High") {
      rows.unshift(doshaRow);
    } else {
      rows.push(doshaRow);
    }
  }

  return rows;
}

// ---------- Priority Matrix ----------

function buildPriorityMatrixRows(scoring, renovationCandidates, ayadi, brahmasthan) {
  const rows = [];
  const severityOrder = { High: 0, Medium: 1, Low: 2 };
  const sortedIssues = [...scoring.issues].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  if (brahmasthan && ((brahmasthan.precise && brahmasthan.rating === "dosha") || brahmasthan.rating === "unknown-caution")) {
    const priority = brahmasthan.severity === "High" ? "High" : "Medium";
    const action = brahmasthan.precise
      ? `Review the ${brahmasthan.occupantLabel.toLowerCase()} at your plot's centre — the Brahmasthan is best kept open.`
      : "Confirm on-site that none of your heavier rooms (washroom, kitchen, staircase) sit at the plot's exact centre — the Brahmasthan is best kept open.";
    rows.push([priority, action, "Dosha Mitigation"]);
  }

  sortedIssues.slice(0, 3).forEach(issue => {
    const remedy = getRemedy(issue.id, issue.currentDirection, 10 - issue.pointsLost);
    const priority = issue.severity === "High" ? "High" : issue.severity === "Medium" ? "Medium" : "Low";
    const category = remedy.needsRenovation ? "Dosha Mitigation" : "Colour & Lighting";
    rows.push([priority, truncateSentence(remedy.quickFix), category]);
  });

  if (renovationCandidates.length > 0) {
    rows.push(["Medium", `Plan a future renovation to improve ${renovationCandidates[0].label.toLowerCase()} placement.`, "Structural (Future)"]);
  }
  if (ayadi && ayadi.overall !== "Favourable") {
    rows.push(["Low", "Consider a minor perimeter/porch adjustment in a future extension to improve the Aya/Vyaya balance.", "Structural (Future, optional)"]);
  }
  rows.push(["Low", "Reinforce colour and lighting guidance across the rooms noted in Recommendations.", "Colour & Lighting"]);
  return rows;
}

// ---------- Estimated Improvement Score ----------

function estimatePredictedScore(scoring) {
  let earned = 0;
  let possible = 0;
  scoring.roomResults.forEach(r => {
    const p = r.points < 8 ? Math.min(8, r.points + 5) : r.points;
    earned += p;
    possible += r.maxPoints;
  });
  const predicted = possible > 0 ? Math.round((earned / possible) * 100) : scoring.score;
  return Math.max(predicted, scoring.score);
}

// ---------- Conclusion ----------

function buildConclusion(scoring, tier, brahmasthan) {
  const topStrength = [...scoring.roomResults].sort((a, b) => b.points - a.points)[0];
  const topIssue = scoring.issues[0];
  const brahmasthanIsTopIssue = brahmasthan && brahmasthan.severity === "High"
    && ((brahmasthan.precise && brahmasthan.rating === "dosha") || brahmasthan.rating === "unknown-caution");
  let text = `Overall, this property scores ${scoring.score}/100 (${scoring.rating}). `;
  if (topStrength && topStrength.points >= 8) {
    text += `${topStrength.label} in the ${topStrength.value} zone is one of this layout's strongest placements. `;
  }
  if (brahmasthanIsTopIssue && brahmasthan.precise) {
    text += `The main area to address is the ${brahmasthan.occupantLabel.toLowerCase()} sitting at your plot's ` +
      `centre (Brahmasthan) — this is classically treated as a significant defect and worth prioritising. `;
  } else if (brahmasthanIsTopIssue) {
    text += `The main thing worth checking on-site is whether any of your reported heavier rooms sit at your ` +
      `plot's exact centre (Brahmasthan) — this is classically treated as a significant defect if confirmed. `;
  } else if (topIssue) {
    text += `The main area to address is ${topIssue.room.toLowerCase()} in the ${topIssue.currentDirection} zone, ` +
      `flagged as a ${topIssue.severity.toLowerCase()}-priority item. `;
  } else {
    text += "No significant defects were identified in this audit. ";
  }
  text += tier === "gold"
    ? "Work through the Priority Matrix and Recommendations above in order, and use your 30 days of chat access " +
      "to talk through the renovation options with our team."
    : tier === "silver"
    ? "Work through the Priority Matrix above, and consider a Gold package for a full structural renovation plan."
    : "Start with the Recommendations above, and consider a Silver or Gold report for the full Dosha Analysis, " +
      "Priority Matrix, and a structural renovation plan.";
  return text;
}

// ---------- Table drawing ----------

function drawTable(doc, { columns, rows, fontSize = 8.5, x = 50 }) {
  const totalWidth = columns.reduce((s, c) => s + c.width, 0);
  const headerH = 22;
  const pageBottom = 740;

  function drawHeaderRow(y) {
    doc.rect(x, y, totalWidth, headerH).fillColor("#f4efe6").fill();
    let cx = x;
    columns.forEach(col => {
      doc.fontSize(fontSize).fillColor("#5a3d1f").text(col.header, cx + 4, y + 6, { width: col.width - 8, align: col.align || "left" });
      cx += col.width;
    });
    return y + headerH;
  }

  function drawBorder(top, bottom) {
    let cx = x;
    doc.lineWidth(0.5).strokeColor("#ddd");
    columns.forEach(col => {
      doc.moveTo(cx, top).lineTo(cx, bottom).stroke();
      cx += col.width;
    });
    doc.moveTo(cx, top).lineTo(cx, bottom).stroke();
    doc.rect(x, top, totalWidth, bottom - top).lineWidth(0.75).strokeColor("#bbb").stroke();
  }

  let y = doc.y;
  let tableTop = y;
  y = drawHeaderRow(y);

  rows.forEach((row, i) => {
    let rowH = 14;
    row.forEach((cell, ci) => {
      const h = doc.heightOfString(String(cell), { width: columns[ci].width - 8, fontSize });
      rowH = Math.max(rowH, h + 8);
    });

    if (y + rowH > pageBottom) {
      drawBorder(tableTop, y);
      doc.addPage();
      y = 50;
      tableTop = y;
      y = drawHeaderRow(y);
    }

    doc.rect(x, y, totalWidth, rowH).fillColor(i % 2 === 0 ? "#ffffff" : "#faf7f2").fill();
    let cx = x;
    row.forEach((cell, ci) => {
      doc.fontSize(fontSize).fillColor("#000").text(String(cell), cx + 4, y + 4, { width: columns[ci].width - 8, align: columns[ci].align || "left" });
      cx += columns[ci].width;
    });
    y += rowH;
  });

  drawBorder(tableTop, y);
  doc.y = y + 12;
}

function section(doc, title) {
  doc.fontSize(16).fillColor("#8a5a2b").text(title);
  doc.moveDown(0.5);
}

function cap(str) {
  if (!str) return "—";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = generateReport;
