// floorPlanGenerator.js
// Auto-generates a schematic, to-scale floor layout for the audit report
// PDF, styled after a hand-drafted architect's sketch: a rectangular
// outer wall, rooms sized and positioned from the room directions +
// width/length the customer already supplies in the booking form,
// door-swing arcs, a hatched staircase icon, dimension arrows in feet,
// and a north-facing compass arrow.
//
// This is still a *zone-based* layout, not a wall-by-wall architectural
// drawing — the booking form records each room's compass direction and
// size, but never its exact x/y position or which walls are shared with
// which neighbour, so exact adjacency isn't derivable from the data.
// Instead, each room is placed in the compass zone it was reported to
// face (a 3x3 Vastu Purusha Mandala grid), and — new in this version —
// each zone's row/column is sized from the *actual* room dimensions
// reported for that zone, and the whole grid is scaled to the building's
// real outer length/width when provided, so the drawing reads as a
// genuine to-scale floor plan rather than a generic grid.
//
// For landed properties with more than one floor, one floor plan is
// drawn per floor level (using the q_<id>_floor answers collected in
// DirectionQuestions.jsx), each on its own page.

const LANDED_FLOOR_ORDER = ["Ground Floor", "First Floor", "Second Floor", "Third Floor"];

// row/col position of each direction inside the 3x3 grid. Centre [1,1] is
// reserved for the living/drawing room (open space) or, if none was
// recorded, the Brahmasthan (central open zone).
const DIR_POS = {
  "North-West": [0, 0], "North": [0, 1], "North-East": [0, 2],
  "West": [1, 0],                        "East": [1, 2],
  "South-West": [2, 0], "South": [2, 1], "South-East": [2, 2]
};

const DIR_ABBR = {
  "North-West": "NW", "North": "N", "North-East": "NE",
  "West": "W", "East": "E",
  "South-West": "SW", "South": "S", "South-East": "SE"
};

const DEFAULT_BAND_FEET = 9; // fallback zone size (ft) when no room data exists for that band
const MIN_CENTRE_FEET = 5;   // keep the centre/open zone at least this big

/**
 * Adds the "Floor Layout" section (one page per floor level) to an
 * in-progress pdfkit document. Call this from pdfGenerator.js.
 *
 * @param {PDFDocument} doc
 * @param {Object} booking - raw booking answers (q_<id>, q_<id>_width, q_<id>_length, q_<id>_floor, q_<id>_toFloor, residentialType, buildingLengthFeet, buildingWidthFeet)
 * @param {Object} scoring - output of vastuLogic.calculateScore() (uses scoring.roomResults)
 */
function addFloorPlanSection(doc, booking, scoring) {
  const isLanded = booking.residentialType === "landed";

  const placeableRooms = (scoring.roomResults || [])
    .filter(r => r.id !== "plotShape" && DIR_POS[r.value])
    .map(r => ({
      ...r,
      __width: Number(booking[`q_${r.id}_width`]) || null,
      __length: Number(booking[`q_${r.id}_length`]) || null,
      __fromFloor: booking[`q_${r.id}_floor`] || null,
      __toFloor: booking[`q_${r.id}_toFloor`] || null,
      __isStaircase: r.id === "staircase" || r.id === "staircase2"
    }));
  const hasLivingRoom = !!(booking.q_livingRoom_width || booking.q_livingRoom_length);

  if (placeableRooms.length === 0 && !hasLivingRoom) return; // nothing to draw

  const buildingWidthFeet = Number(booking.buildingWidthFeet) || null;
  const buildingLengthFeet = Number(booking.buildingLengthFeet) || null;

  const floors = determineFloors(booking, isLanded);

  doc.addPage();
  header(doc, "Floor Layout");
  doc.fontSize(9).fillColor("#777").text(
    "A to-scale schematic floor layout generated automatically from the room directions and sizes you provided. " +
    "Each room is placed in the compass zone you reported it facing and sized from its recorded dimensions. " +
    "This reflects zone placement for Vastu analysis, not exact wall-by-wall architecture.",
    { width: 495 }
  );
  doc.moveDown(0.8);

  floors.forEach((floorLabel, idx) => {
    if (idx > 0) {
      doc.addPage();
      header(doc, "Floor Layout");
    }

    const roomsHere = placeableRooms.filter(r => r.id !== "entrance" && belongsOnFloor(r.id, floorLabel, booking, isLanded));
    const entranceRoom = placeableRooms.find(r => r.id === "entrance" && belongsOnFloor("entrance", floorLabel, booking, isLanded));
    const living = livingRoomOnFloor(booking, floorLabel, isLanded);

    const floorTitle = isLanded ? (floorLabel || "Ground Floor") : "Floor Plan";
    drawFloorPlan(doc, {
      floorTitle,
      rooms: roomsHere,
      living,
      entranceDirection: entranceRoom ? entranceRoom.value : null,
      buildingWidthFeet,
      buildingLengthFeet
    });
  });
}

// ---------- floor resolution ----------

function determineFloors(booking, isLanded) {
  if (!isLanded) return [null]; // single, unnamed floor

  const used = new Set();
  Object.keys(booking).forEach(k => {
    if (k.endsWith("_floor") && booking[k]) used.add(booking[k]);
  });

  const ordered = LANDED_FLOOR_ORDER.filter(f => used.has(f));
  return ordered.length ? ordered : [LANDED_FLOOR_ORDER[0]];
}

function belongsOnFloor(roomId, floorLabel, booking, isLanded) {
  if (!isLanded) return true;
  if (roomId === "entrance") {
    // Entrance direction is asked once, with no floor selector (a home has
    // one main entrance) — always shown on the ground floor's diagram.
    return floorLabel === LANDED_FLOOR_ORDER[0];
  }
  return booking[`q_${roomId}_floor`] === floorLabel;
}

function livingRoomOnFloor(booking, floorLabel, isLanded) {
  const width = Number(booking.q_livingRoom_width) || null;
  const length = Number(booking.q_livingRoom_length) || null;
  if (!width && !length) return null;
  if (isLanded && booking.q_livingRoom_floor !== floorLabel) return null;
  return { width, length };
}

// ---------- grid sizing ----------

// Works out how wide each column and how tall each row of the 3x3 grid
// should be, in feet, from the actual room dimensions reported for each
// zone — so a zone with a 12x14 bedroom gets more space than an empty
// zone. Falls back to a default band size where no room data exists.
function computeBandSizes(roomsByPos, buildingWidthFeet, buildingLengthFeet) {
  const colWidths = [0, 0, 0];
  const rowHeights = [0, 0, 0];

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (row === 1 && col === 1) continue; // centre handled separately
      const entries = roomsByPos[row][col] || [];
      const maxW = entries.reduce((m, r) => (r.__width ? Math.max(m, r.__width) : m), 0);
      const maxL = entries.reduce((m, r) => (r.__length ? Math.max(m, r.__length) : m), 0);
      colWidths[col] = Math.max(colWidths[col], maxW);
      rowHeights[row] = Math.max(rowHeights[row], maxL);
    }
  }

  for (let i = 0; i < 3; i++) {
    if (colWidths[i] === 0) colWidths[i] = DEFAULT_BAND_FEET;
    if (rowHeights[i] === 0) rowHeights[i] = DEFAULT_BAND_FEET;
  }

  const sideColsSum = colWidths[0] + colWidths[2];
  const sideRowsSum = rowHeights[0] + rowHeights[2];

  let totalWidth = buildingWidthFeet && buildingWidthFeet > sideColsSum + MIN_CENTRE_FEET
    ? buildingWidthFeet
    : sideColsSum + DEFAULT_BAND_FEET;
  let totalLength = buildingLengthFeet && buildingLengthFeet > sideRowsSum + MIN_CENTRE_FEET
    ? buildingLengthFeet
    : sideRowsSum + DEFAULT_BAND_FEET;

  // If the customer's stated outer dimensions are smaller than the sum of
  // the room footprints, scale the side bands down proportionally so
  // everything still fits, rather than silently ignoring their input.
  if (sideColsSum > totalWidth - MIN_CENTRE_FEET) {
    const scale = (totalWidth - MIN_CENTRE_FEET) / sideColsSum;
    colWidths[0] *= scale;
    colWidths[2] *= scale;
  }
  if (sideRowsSum > totalLength - MIN_CENTRE_FEET) {
    const scale = (totalLength - MIN_CENTRE_FEET) / sideRowsSum;
    rowHeights[0] *= scale;
    rowHeights[2] *= scale;
  }

  colWidths[1] = totalWidth - (colWidths[0] + colWidths[2]);
  rowHeights[1] = totalLength - (rowHeights[0] + rowHeights[2]);

  return { colWidths, rowHeights, totalWidth, totalLength };
}

function groupRoomsByPosition(rooms) {
  const grid = [[[], [], []], [[], [], []], [[], [], []]];
  rooms.forEach(r => {
    const pos = DIR_POS[r.value];
    if (!pos) return;
    const [row, col] = pos;
    grid[row][col].push(r);
  });
  return grid;
}

// ---------- drawing ----------

function drawFloorPlan(doc, { floorTitle, rooms, living, entranceDirection, buildingWidthFeet, buildingLengthFeet }) {
  doc.fontSize(12).fillColor("#000").text(floorTitle, { underline: true });
  doc.moveDown(0.4);

  const roomsByPos = groupRoomsByPosition(rooms);
  const { colWidths, rowHeights, totalWidth, totalLength } = computeBandSizes(roomsByPos, buildingWidthFeet, buildingLengthFeet);

  const maxDrawW = 400;
  const maxDrawH = 430;
  const scale = Math.min(maxDrawW / totalWidth, maxDrawH / totalLength);

  const pxCol = colWidths.map(w => w * scale);
  const pxRow = rowHeights.map(h => h * scale);
  const gridW = pxCol.reduce((a, b) => a + b, 0);
  const gridH = pxRow.reduce((a, b) => a + b, 0);

  const gridX = 75;
  const gridY = doc.y + 16;

  // column/row start offsets in px, for locating cells and edge midpoints
  const colX = [gridX, gridX + pxCol[0], gridX + pxCol[0] + pxCol[1]];
  const rowY = [gridY, gridY + pxRow[0], gridY + pxRow[0] + pxRow[1]];

  // ---- outer wall ----
  doc.rect(gridX, gridY, gridW, gridH).lineWidth(1.5).strokeColor("#222").stroke();

  // ---- internal partition lines (approximate zone boundaries) ----
  doc.lineWidth(0.75).strokeColor("#999");
  doc.moveTo(colX[1], gridY).lineTo(colX[1], gridY + gridH).stroke();
  doc.moveTo(colX[2], gridY).lineTo(colX[2], gridY + gridH).stroke();
  doc.moveTo(gridX, rowY[1]).lineTo(gridX + gridW, rowY[1]).stroke();
  doc.moveTo(gridX, rowY[2]).lineTo(gridX + gridW, rowY[2]).stroke();

  // ---- 8 outer zones ----
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (row === 1 && col === 1) continue;
      const x = colX[col], y = rowY[row], w = pxCol[col], h = pxRow[row];
      const direction = Object.keys(DIR_POS).find(d => DIR_POS[d][0] === row && DIR_POS[d][1] === col);
      const roomsInCell = roomsByPos[row][col];

      doc.fontSize(7).fillColor("#aaa").text(DIR_ABBR[direction], x + 5, y + 4);

      const staircaseRooms = roomsInCell.filter(r => r.__isStaircase);
      const plainRooms = roomsInCell.filter(r => !r.__isStaircase);

      let textY = y + 15;
      textY = writeRoomList(doc, plainRooms, x, textY, w, y, h);
      staircaseRooms.forEach(sr => {
        textY = drawStaircase(doc, sr, x, textY, w, h - (textY - y), scale, y, h);
      });

      if (roomsInCell.length === 0) {
        doc.fontSize(6.5).fillColor("#ccc").text("—", x + 5, y + h / 2 - 4);
      }
    }
  }

  // ---- centre zone (living room / open space) ----
  drawCentreCell(doc, colX[1], rowY[1], pxCol[1], pxRow[1], living);

  // ---- entrance door break + swing arc ----
  if (entranceDirection) {
    drawEntrance(doc, entranceDirection, colX, rowY, pxCol, pxRow, gridX, gridY, gridW, gridH);
  }

  // ---- dimension arrows (bottom = width, left = length), in feet ----
  drawDimensionArrow(doc, gridX, gridY + gridH + 14, gridX + gridW, gridY + gridH + 14, "horizontal", `${round1(totalWidth)} ft`);
  drawDimensionArrow(doc, gridX - 14, gridY, gridX - 14, gridY + gridH, "vertical", `${round1(totalLength)} ft`);

  // ---- compass ----
  const compassX = gridX + gridW / 2;
  const compassY = gridY + gridH + 46;
  doc.moveTo(compassX, compassY + 16).lineTo(compassX, compassY).lineWidth(1.2).strokeColor("#555").stroke();
  doc.polygon([compassX - 4, compassY + 4], [compassX + 4, compassY + 4], [compassX, compassY - 4]).fillColor("#555").fill();
  doc.fontSize(8).fillColor("#555").text("N", compassX - 3, compassY + 20);

  doc.y = gridY + gridH + 75;

  const legendNote = rooms.length === 0 && !living
    ? "No room directions or measurements were recorded for this floor."
    : "Rooms without a recorded direction and size are omitted from the diagram above but are still listed in " +
      "the Room Analysis table. Zone sizes reflect the largest room reported in that direction; empty zones use " +
      "a default placeholder size.";
  doc.fontSize(8).fillColor("#999").text(legendNote, 55, doc.y, { width: 495 });
  doc.moveDown(1);
}

function writeRoomList(doc, roomsInCell, x, startY, cellW, cellY, cellH) {
  let y = startY;
  const maxShown = 3;
  const shown = roomsInCell.slice(0, maxShown);
  // Multiple rooms in one cell share the same edge (same compass zone), so
  // spread their doors apart along that edge rather than stacking them.
  const spread = 11;
  const offsets = shown.map((_, i) => (i - (shown.length - 1) / 2) * spread);

  shown.forEach((r, i) => {
    const label = truncate(r.label, 20);
    doc.fontSize(7.5).fillColor("#5a3d1f").text(label, x + 5, y, { width: cellW - 10 });
    if (cellY !== undefined && cellH !== undefined) {
      drawRoomDoor(doc, r.value, x, cellY, cellW, cellH, offsets[i]);
    }
    y += 9;
    const dim = r.__width || r.__length ? `${r.__width || "—"} × ${r.__length || "—"} ft` : null;
    if (dim) {
      doc.fontSize(7).fillColor("#888").text(dim, x + 5, y, { width: cellW - 10 });
      y += 9;
    } else {
      y += 2;
    }
  });
  if (roomsInCell.length > maxShown) {
    doc.fontSize(7).fillColor("#888").text(`+${roomsInCell.length - maxShown} more`, x + 5, y);
    y += 9;
  }
  return y;
}

// Draws a hatched staircase icon (parallel "tread" lines, like the
// reference sketch) sized from its own width/length where available, and
// labels its entrance/exit direction.
function drawStaircase(doc, stair, x, startY, cellW, availH, scale, cellY, cellH) {
  const label = stair.id === "staircase2" ? "2nd Staircase" : "Staircase";
  doc.fontSize(7.5).fillColor("#5a3d1f").text(label, x + 5, startY, { width: cellW - 10 });
  if (cellY !== undefined && cellH !== undefined) {
    drawRoomDoor(doc, stair.value, x, cellY, cellW, cellH, 0);
  }
  let y = startY + 9;

  const boxW = Math.min(cellW - 14, (stair.__width || 4) * scale || cellW - 14);
  const boxH = Math.min(Math.max(availH - 22, 14), (stair.__length || 8) * scale || 24);
  const boxX = x + (cellW - boxW) / 2;
  const boxY = y;

  doc.rect(boxX, boxY, boxW, boxH).lineWidth(0.75).strokeColor("#8a5a2b").stroke();
  const treadCount = Math.max(3, Math.min(8, Math.round(boxH / 5)));
  for (let i = 1; i < treadCount; i++) {
    const ty = boxY + (boxH * i) / treadCount;
    doc.moveTo(boxX, ty).lineTo(boxX + boxW, ty).lineWidth(0.5).strokeColor("#c9a76a").stroke();
  }
  y = boxY + boxH + 8;

  doc.fontSize(6.5).fillColor("#888").text(
    stair.__fromFloor && stair.__toFloor
      ? `${stair.__fromFloor} to ${stair.__toFloor}`
      : stair.__toFloor
        ? `Leads up to: ${stair.__toFloor}`
        : "Floor connection not specified",
    x + 5, y, { width: cellW - 10 }
  );
  y += 9;
  return y;
}

function drawCentreCell(doc, x, y, cellW, cellH, living) {
  doc.rect(x, y, cellW, cellH).lineWidth(0.75).strokeColor("#ccc").dash(2, { space: 2 }).stroke();
  doc.undash();

  if (living && (living.width || living.length)) {
    // Draw a rectangle whose proportions reflect the living room's actual
    // width:length ratio, inset within the centre zone — "the living room
    // is an open space and should follow the [customer's] length and width".
    const pad = 12;
    const availW = cellW - pad * 2;
    const availH = cellH - pad * 2 - 16; // leave room for the label above
    const w = living.width || living.length || 1;
    const l = living.length || living.width || 1;
    const cellScale = Math.min(availW / w, availH / l);
    const rectW = w * cellScale;
    const rectL = l * cellScale;
    const rectX = x + (cellW - rectW) / 2;
    const rectY = y + 18 + (availH - rectL) / 2;

    doc.fontSize(8).fillColor("#5a3d1f").text("Living / Drawing Room (open space)", x + 6, y + 6, { width: cellW - 12, align: "center" });
    doc.rect(rectX, rectY, rectW, rectL).lineWidth(1).strokeColor("#8a5a2b").dash(3, { space: 2 }).stroke();
    doc.undash();
    doc.fontSize(7).fillColor("#888").text(
      `${living.width || "—"} × ${living.length || "—"} ft`,
      x + 6, y + cellH - 14, { width: cellW - 12, align: "center" }
    );
  } else {
    doc.fontSize(8).fillColor("#999").text("Central / open zone", x + 6, y + 6, { width: cellW - 12, align: "center" });
    doc.fontSize(7).fillColor("#aaa").text("(Brahmasthan — keep open)", x + 6, y + cellH / 2, { width: cellW - 12, align: "center" });
  }
}

// Draws a door on a room's own cell boundary — same visual language as the
// main entrance (a white gap "breaking" the wall line plus an angular door
// swing), but scoped to that room's own cell rectangle and drawn in black
// so it never gets confused with the red main entrance. `offset` shifts
// the door along its edge so multiple rooms sharing one compass zone (e.g.
// two rooms both facing South-West) don't draw overlapping doors.
function drawRoomDoor(doc, direction, rectX, rectY, rectW, rectH, offset = 0) {
  const pos = DIR_POS[direction];
  if (!pos) return;
  const [row, col] = pos;
  const doorSpan = 9;

  // The room's own compass zone tells us which OUTER wall its cell backs
  // onto — but a room (unlike the main entrance) is entered from inside
  // the house, not from outside. So the door goes on the opposite side of
  // the cell: the interior-facing wall, not the exterior-facing one.
  let outerEdge;
  if (row === 0) outerEdge = "top";
  else if (row === 2) outerEdge = "bottom";
  else outerEdge = col === 0 ? "left" : "right";

  const OPPOSITE = { top: "bottom", bottom: "top", left: "right", right: "left" };
  const edge = OPPOSITE[outerEdge];

  let cx, cy;
  if (edge === "top" || edge === "bottom") {
    cx = clamp(rectX + rectW / 2 + offset, rectX + doorSpan / 2 + 2, rectX + rectW - doorSpan / 2 - 2);
    cy = edge === "top" ? rectY : rectY + rectH;
  } else {
    cy = clamp(rectY + rectH / 2 + offset, rectY + doorSpan / 2 + 2, rectY + rectH - doorSpan / 2 - 2);
    cx = edge === "left" ? rectX : rectX + rectW;
  }

  doc.lineWidth(1.25).strokeColor("#fff");
  if (edge === "top" || edge === "bottom") {
    doc.moveTo(cx - doorSpan / 2, cy).lineTo(cx + doorSpan / 2, cy).stroke();
  } else {
    doc.moveTo(cx, cy - doorSpan / 2).lineTo(cx, cy + doorSpan / 2).stroke();
  }

  doc.lineWidth(0.6).strokeColor("#000");
  const r = doorSpan / 2;
  if (edge === "top") {
    doc.moveTo(cx - r, cy).lineTo(cx - r, cy - r).stroke();
    doc.moveTo(cx - r, cy - r).lineTo(cx + r, cy).stroke();
  } else if (edge === "bottom") {
    doc.moveTo(cx - r, cy).lineTo(cx - r, cy + r).stroke();
    doc.moveTo(cx - r, cy + r).lineTo(cx + r, cy).stroke();
  } else if (edge === "left") {
    doc.moveTo(cx, cy - r).lineTo(cx - r, cy - r).stroke();
    doc.moveTo(cx - r, cy - r).lineTo(cx, cy + r).stroke();
  } else {
    doc.moveTo(cx, cy - r).lineTo(cx + r, cy - r).stroke();
    doc.moveTo(cx + r, cy - r).lineTo(cx, cy + r).stroke();
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Breaks the outer wall on the correct edge for the entrance direction and
// draws a short door-swing arc, matching the reference sketch's style.
function drawEntrance(doc, direction, colX, rowY, pxCol, pxRow, gridX, gridY, gridW, gridH) {
  const [row, col] = DIR_POS[direction];
  const doorSpan = 16;

  let edge;
  if (row === 0) edge = "top";
  else if (row === 2) edge = "bottom";
  else edge = col === 0 ? "left" : "right";

  let cx, cy;
  if (edge === "top" || edge === "bottom") {
    cx = colX[col] + pxCol[col] / 2;
    cy = edge === "top" ? gridY : gridY + gridH;
  } else {
    cy = rowY[row] + pxRow[row] / 2;
    cx = edge === "left" ? gridX : gridX + gridW;
  }

  // erase a gap in the wall line (white-out) then draw a door swing arc
  doc.lineWidth(2).strokeColor("#fff");
  if (edge === "top" || edge === "bottom") {
    doc.moveTo(cx - doorSpan / 2, cy).lineTo(cx + doorSpan / 2, cy).stroke();
  } else {
    doc.moveTo(cx, cy - doorSpan / 2).lineTo(cx, cy + doorSpan / 2).stroke();
  }

  doc.lineWidth(1).strokeColor("#b23b3b");
  const r = doorSpan / 2;
  if (edge === "top") {
    doc.moveTo(cx - r, cy).lineTo(cx - r, cy - r).stroke();
    doc.moveTo(cx - r, cy - r).lineTo(cx + r, cy).stroke();
  } else if (edge === "bottom") {
    doc.moveTo(cx - r, cy).lineTo(cx - r, cy + r).stroke();
    doc.moveTo(cx - r, cy + r).lineTo(cx + r, cy).stroke();
  } else if (edge === "left") {
    doc.moveTo(cx, cy - r).lineTo(cx - r, cy - r).stroke();
    doc.moveTo(cx - r, cy - r).lineTo(cx, cy + r).stroke();
  } else {
    doc.moveTo(cx, cy - r).lineTo(cx + r, cy - r).stroke();
    doc.moveTo(cx + r, cy - r).lineTo(cx, cy + r).stroke();
  }

  const labelX = edge === "left" ? cx - 55 : edge === "right" ? cx + 6 : cx - 24;
  const labelY = edge === "top" ? cy - 20 : edge === "bottom" ? cy + 8 : cy - 20;
  doc.fontSize(7).fillColor("#b23b3b").text("ENTRANCE", labelX, labelY, { width: 60, align: "center" });
}

function drawDimensionArrow(doc, x1, y1, x2, y2, orientation, label) {
  doc.lineWidth(0.75).strokeColor("#555");
  doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
  const tick = 4;
  if (orientation === "horizontal") {
    doc.moveTo(x1, y1 - tick).lineTo(x1, y1 + tick).stroke();
    doc.moveTo(x2, y2 - tick).lineTo(x2, y2 + tick).stroke();
    doc.fontSize(7.5).fillColor("#555").text(label, x1, y1 + 4, { width: x2 - x1, align: "center" });
  } else {
    doc.moveTo(x1 - tick, y1).lineTo(x1 + tick, y1).stroke();
    doc.moveTo(x2 - tick, y2).lineTo(x2 + tick, y2).stroke();
    doc.save();
    doc.rotate(-90, { origin: [x1 - 6, (y1 + y2) / 2] });
    doc.fontSize(7.5).fillColor("#555").text(label, x1 - 56, (y1 + y2) / 2 - 6, { width: 100, align: "center" });
    doc.restore();
  }
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function truncate(str, n) {
  if (!str) return "";
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
}

function header(doc, title) {
  doc.fontSize(16).fillColor("#8a5a2b").text(title);
  doc.moveDown(0.4);
}

module.exports = { addFloorPlanSection };
