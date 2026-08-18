const ALL_DIRECTIONS = ["North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West"];

export const QUESTION_SETS = {
  bronze: [
    { id: "entrance", label: "Main entrance direction", options: ALL_DIRECTIONS },
    { id: "kitchen", label: "Kitchen direction", options: ALL_DIRECTIONS },
    { id: "bedroom", label: "Master bedroom direction", options: ALL_DIRECTIONS },
    { id: "room2", label: "Second bedroom direction", options: ALL_DIRECTIONS },
    { id: "livingRoom", label: "Living / drawing room", measurementOnly: true },
    { id: "bathroom", label: "Washroom direction", options: ALL_DIRECTIONS },
    { id: "bathroom2", label: "Washroom 2 direction", options: ALL_DIRECTIONS, optional: true },
    { id: "bathroom3", label: "Washroom 3 direction", options: ALL_DIRECTIONS, optional: true },
    { id: "poojaRoom", label: "Pooja / prayer room direction", options: ALL_DIRECTIONS },
    { id: "storeroom", label: "Storeroom direction", options: ALL_DIRECTIONS }
  ],
  silver: [
    { id: "entrance", label: "Main entrance direction", options: ALL_DIRECTIONS },
    { id: "bedroom", label: "Master bedroom direction", options: ALL_DIRECTIONS },
    { id: "room2", label: "Second bedroom direction", options: ALL_DIRECTIONS },
    { id: "kitchen", label: "Kitchen direction", options: ALL_DIRECTIONS },
    { id: "childrenRoom", label: "Children's room direction", options: ALL_DIRECTIONS },
    { id: "homeOffice", label: "Home office / study direction", options: ALL_DIRECTIONS },
    { id: "poojaRoom", label: "Pooja / prayer room direction", options: ALL_DIRECTIONS },
    { id: "livingRoom", label: "Living / drawing room", measurementOnly: true },
    { id: "bathroom", label: "Washroom direction", options: ALL_DIRECTIONS },
    { id: "bathroom2", label: "Washroom 2 direction", options: ALL_DIRECTIONS, optional: true },
    { id: "bathroom3", label: "Washroom 3 direction", options: ALL_DIRECTIONS, optional: true },
    { id: "storeroom", label: "Storeroom direction", options: ALL_DIRECTIONS }
  ],
  gold: [
    { id: "entrance", label: "Main entrance direction", options: ALL_DIRECTIONS },
    { id: "bedroom", label: "Master bedroom direction", options: ALL_DIRECTIONS },
    { id: "room2", label: "Second bedroom direction", options: ALL_DIRECTIONS },
    { id: "kitchen", label: "Kitchen direction", options: ALL_DIRECTIONS },
    { id: "childrenRoom", label: "Children's room direction", options: ALL_DIRECTIONS },
    { id: "homeOffice", label: "Home office / study direction", options: ALL_DIRECTIONS },
    { id: "poojaRoom", label: "Pooja / prayer room direction", options: ALL_DIRECTIONS },
    { id: "livingRoom", label: "Living / drawing room", measurementOnly: true },
    { id: "bathroom", label: "Washroom direction", options: ALL_DIRECTIONS },
    { id: "bathroom2", label: "Washroom 2 direction", options: ALL_DIRECTIONS, optional: true },
    { id: "bathroom3", label: "Washroom 3 direction", options: ALL_DIRECTIONS, optional: true },
    { id: "storeroom", label: "Storeroom direction", options: ALL_DIRECTIONS },
    { id: "staircase", label: "Staircase direction (compass zone it's located in)", options: ALL_DIRECTIONS, hasToFloor: true, toFloorLabel: "This staircase leads up to which floor?" },
    { id: "waterSource", label: "Water source / overhead tank direction", options: ALL_DIRECTIONS },
    { id: "plotShape", label: "Plot / building shape", options: ["Square", "Rectangular", "Irregular", "L-shaped"] }
  ]
};

export const LANDED_FLOOR_OPTIONS = ["Ground Floor", "First Floor", "Second Floor", "Third Floor"];

// Landed (multi-floor) properties always have at least one staircase, so
// these are injected dynamically into Bronze/Silver forms when isLanded is
// true (Gold already asks about the main staircase above). A second
// staircase is optional, for houses with a service/back staircase. Each
// staircase's own "floor" (which floor it starts on) is collected the
// same way as any other room, via the shared floor-level selector — the
// toFloor field here just adds which floor it leads UP to.
export const STAIRCASE_QUESTIONS = [
  { id: "staircase", label: "Staircase direction (compass zone it's located in)", options: ALL_DIRECTIONS, hasToFloor: true, toFloorLabel: "This staircase leads up to which floor?" },
  { id: "staircase2", label: "Second staircase direction (compass zone it's located in)", options: ALL_DIRECTIONS, hasToFloor: true, toFloorLabel: "This staircase leads up to which floor?", optional: true }
];

export const PACKAGE_LABELS = { bronze: "Bronze", silver: "Silver", gold: "Gold" };
export const PACKAGE_PRICES = { bronze: "RM 250", silver: "RM 500", gold: "RM 1,500+" };

// Original (pre-discount) prices, shown crossed out on the pricing cards
// alongside the current promo price above. Gold has no fixed original price
// since it starts at RM 1,500 and scales with property size.
export const PACKAGE_ORIGINAL_PRICES = { bronze: "RM 500", silver: "RM 1,000" };
export const PROPERTY_TYPE_LABELS = { residential: "Residential", commercial: "Commercial", industrial: "Industrial" };
