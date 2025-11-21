export const spellHandState = {
  sparkComboCount: 0,
  activeTornado: false,
  lastHeroSpellResonance: null,
  lastHeroSpellId: null,
  counter: 0, // counter for determining when to draw a new spell
  hand: [], // Array of spell IDs currently in hand
  maxHandSize: 5
};

export const partyState = {
  // Hero progression
  heroLevel: 5, // for debug set to 5?
  heroExp: 0,
  heroBaseStats: { hp: 10, attack: 20, defense: 5 }, // Base stats that scale with hero level
  heroGrowthPerLevel: { hp: 0.10, attack: 0.08, defense: 1 }, // How much hero gains per level
  
  // External bonuses (blacksmith, upgrades, etc.)
  heroBonuses: { attack: 0, defense: 0, hp: 0,
    physical: 0, fire: 0, water: 0, air: 0, earth: 0,
    poison: 0, light: 0, dark: 0, undead: 0,
    bossDamage: 0, critDamage: 0, criticalChance: 0,
    autoAttackDamage: 0
   }, // From buildings, items, etc.
  
  // Class management
  unlockedClasses: [], // Array of class IDs
  classLevels: {}, // { fighter: 1, cleric: 2 }
  party: [], // Active party members
  
  // Combat modifiers
  elementalDmgModifiers: { 
    physical: 1, fire: 1, water: 1, air: 1, earth: 0,
    poison: 1, light: 1, dark: 1, undead: 1 
  },
  criticalChance: 0.05,
  elementalPenetration: 0,
  weaknessBonus: 0,
  
  // Cached totals (recalculated when party/levels change)
  totalStats: { hp: 0, attack: 0, defense: 0 },
  
  maxPartySize: 4,
  hasActiveDOTs: false,
  activeHeroBuffs: [],
  //activeHeroSpells: [], moved to state(?)
  activeEchoes: []
};


export const state = {
  tick: 0,
  resources: {
    gold: 10000, //300 / 5000
    gems: 20,
    maxGems: 20,
    wood: 0,
    ore: 0,
    goldIncomePerHit: 0,
    gemIncomePerSecond: 0,
    woodIncomePerSecond: 0,
    oreIncomePerSecond: 0,
  },
  autoQuest: false,
  activeQuest: null, // Add this
  quests: {
    prefixQuests: {},
    typeQuests: {}
  },
  incrementalQuests: {
    gems_collected: {
      type: 'collect_total',
      resource: 'gems',
      targetAmount: 1000,
      currentAmount: 0,
      expReward: 500,
      isComplete: false
    }
  },
    dailyQuests: {
    daily_1: {
      type: 'daily_kills',
      targetCount: 50,
      currentCount: 0,
      expReward: 300,
      resetTime: '2025-09-31T00:00:00',
      isComplete: false
    }
  },
  enemyTypeQuests: {
    pest_slayer: {
      type: 'defeat_enemy_type',
      enemyType: 'pest',
      targetCount: 100,
      currentCount: 0,
      expReward: 200,
      isComplete: false
    }
  },
  buildings: [], // array {id: building-id, level: building-level}
  innAssignments: {
    slots: [null, null, null, null], // Each slot holds a class ID or null
    goldIncomeMultiplier: 1.0 // Starts at 1.0, increases by 0.2 per assignment
  },
  //libraryUpgrade: 'fire',
  spells: [],
  activeHeroSpells: [],
  equipment: [],
  currentArea: "newSorpigal",
  currentWave: 1,
  areaWave: 1,
  baseLevel: 1,
  activeWave: true,
  alreadySpawned: false,
  newArea: false,
  nextArea: "",
//  unlockedAreas: ["newSorpigal"], // Add newly unlocked areas here
  enemies: [
  [null, null, null], // row 0
  [null, null, null], // row 1
  [null, null, null], // row 2
  ],
  // Combat/damage tracking (for future use)
  combatLog: [],
  lastAction: null,

  ui: {}, // Placeholder for UI state and animations

  activePanel: "panelArea"
  
};

export const runeState = {
  grid: [], // 2D array of element types
  animatingTiles: [], // Tiles currently animating
  selectedTile: null, // {row, col}
  isAnimating: false,
  crystals: { fire: 0, water: 0, air: 0, earth: 0, poison: 0,
              physical: 0, light: 0, dark: 0, undead: 0
  },
  comboMultiplier: 1,
  lastMatchTime: 0,
  puzzleLevel: 0,       // 0–10
  totalMatches: 0       // counting all matches for level-ups
};

export const quickSpellState = {
  // array of spell IDs currently assigned to quick slots
  registered: [],

  // maximum number of quick slots available (can increase with upgrades)
  maxSlots: 4,

  // optional: stores the order and slot assignment
  slots: [
    // Example:
    // { slotIndex: 0, spellId: "breathOfDecay" },
    // { slotIndex: 1, spellId: "fireball" },
  ],

  // cooldowns for each spell (used by hotbar or combat loop)
  cooldowns: {
    // breathOfDecay: 0,
    // fireball: 0,
  },

  // helper flag for UI refresh or rebind logic
  dirty: false,
};


export function initState() {
  console.log("Game state initialized");
}

// debugging command to show partyState.heroBonuses
window.showHeroBonuses = function() {
  console.log(partyState.heroBonuses);
};