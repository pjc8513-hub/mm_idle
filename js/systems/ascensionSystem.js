import { dungeonState } from "../dungeonMode.js";
import { state, partyState, spellHandState } from "../state.js";
import { saveGame, loadGame } from "../systems/saveSystem.js";
import { startWave } from "../waveManager.js";
import { dungeonProgress } from "./milestones.js";

export function applyAscensionBoon(type) {

  switch(type) {
    case "gold":
      partyState.ascensionPermanentBuffs.goldBonus += 0.25;
      break;
    case "boss":
      partyState.ascensionPermanentBuffs.bossDamage += 0.25;
      break;
    case "crit":
      partyState.ascensionPermanentBuffs.critDamage += 0.10;
      break;
    case "allDamage":
      partyState.ascensionPermanentBuffs.allDamage += 0.10;
      break;
    case "autoAttack":
      partyState.ascensionPermanentBuffs.autoAttackDamage += 1.00;
      break;
    case "partySize":
      partyState.ascensionPermanentBuffs.partySize += 1;
      break;
  }
}

export function applyAscensionBonuses() {
  // Percent bonuses to base stats
  const A = partyState.ascensionBonuses;

  partyState.heroBaseStats.hp = Math.floor(10 * (partyState.ascensionCount + A.hp));
  partyState.heroBaseStats.attack = Math.floor(20 * (partyState.ascensionCount + A.attack));
  partyState.heroBaseStats.defense = Math.floor(5 * (partyState.ascensionCount + A.defense));

  // Permanent buffs to heroBonuses
  const P = partyState.ascensionPermanentBuffs;
  partyState.heroBonuses.goldBonus += P.goldBonus;
  partyState.heroBonuses.bossDamage += P.bossDamage;
  partyState.heroBonuses.critDamage += P.critDamage;
  partyState.heroBonuses.allDamage += P.allDamage;
  partyState.heroBonuses.autoAttackDamage += P.autoAttackDamage;
}

export function ascend() {
    const partySize = 4 + (partyState.ascensionPermanentBuffs.partySize || 0);
    console.log(`Ascending! New max party size: ${partySize}`);
  // 1. Increment ascension count
  partyState.ascensionCount++;

  // 2. Reset game state (except ascension fields)
  Object.assign(state, {
    tick: 0,
    resources: {
      gold: 10000, gems: 0, maxGems: 20,
      wood: 0, ore: 0,
      goldIncomePerHit: 0,
      gemIncomePerSecond: 0,
      woodIncomePerSecond: 0,
      oreIncomePerSecond: 0,
      dungeonEssence: 0
    },
    currentArea: "newSorpigal",
    currentWave: 1,
    areaWave: 1,
    baseLevel: 1,
    activeWave: true,
    alreadySpawned: false,
    newArea: false,
    nextArea: "",
    enemies: [[null,null,null],[null,null,null],[null,null,null]],
    buildings: [],
    innAssignments: {
    slots: [null, null, null, null], // Each slot holds a class ID or null
    goldIncomeMultiplier: 1.0 // Starts at 1.0, increases by 0.2 per assignment
    },
    spells: [],
    activeHeroSpells: [],
    combatLog: []
  });
  console.log(`Max party size after ascension: ${state.maxPartySize}`);
  Object.assign(spellHandState, {
    spellHand: [],
    maxHandSize: 5,
    sparkComboCount: 0,
    activeTornado: false,
    lastHeroSpellResonance: null,
    lastHeroSpellId: null,
    counter: 0, // counter for determining when to draw a new spell
  });

  Object.assign(partyState, {
    heroLevel: 1,
    heroExp: 0,

    heroBaseStats: { hp: 10, attack: 20, defense: 5 },
    heroBonuses: { attack: 0, defense: 0, hp: 0,
      physical: 0, fire: 0, water: 0, air: 0, earth: 0,
      poison: 0, light: 0, dark: 0, undead: 0,
      bossDamage: 0, critDamage: 0, critChance: 0,
      autoAttackDamage: 0, allDamage: 0, goldBonus: 0 },

    party: [],
    classLevels: {},
    unlockedClasses: [],
    maxPartySize: partySize,

    elementDmgModifiers: {
      physical: 1, fire: 1, water: 1, air: 1,
      earth: 1, poison: 1, light: 1, dark: 1, undead: 1
    },
    blessingLevel: 0,
    blessings: {
      hunter: 1, slayer: 1,
      banishing: 1, alchemy: 1, excommunication: 1
    },
  });

    dungeonProgress.claimedMilestones = [];
    dungeonProgress.permanentBuffs = {
      bossDamage: 0,
      critDamage: 0,
      allDamage: 0,
      autoAttackDamage: 0,
      goldBonus: 0,
      timeBonus: 0
    };
    dungeonProgress.unlockedBuildings = [];

  Object.assign(dungeonState, {
    inDungeon: false,
    depth: 0,
    enemiesDefeated: 0,
    dungeonEssence: 0,
    dungeonStartTime: null,
    enemiesSinceLastDepth: 0,
    currentTier: 1,
    maxDepth: 0
  });

  // 3. Reapply ascension bonuses
  applyAscensionBonuses();

  // 4. Save and reload (soft restart)
  saveGame();
  loadGame();
  startWave();
}


window.ascend = ascend; // For debugging in console
window.showStats = () => console.log(partyState); // Debugging