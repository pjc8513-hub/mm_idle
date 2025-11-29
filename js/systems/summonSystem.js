// summonSystem.js
import { partyState } from "../state.js";
import { updateTotalStats } from "./math.js";
import { emit, on } from "../events.js";
import { getBuildingLevel } from "../town.js";
import { logMessage } from "./log.js";
//import { abilities } from "../content/abilities.js";

// Summon definitions
export const summonTemplates = {
  skeleton: {
    id: "skeleton",
    name: "Skeleton",
    rarity: "common",
    resonance: "undead",
    baseDuration: 15, // seconds
    baseStats: { hp: partyState.heroBaseStats.hp * 0.1, attack: partyState.heroBaseStats.attack * 0.5, defense: 1, critChance: 0.05, speed: 1.0 },
    hasAutoAttack: true,
    //image: "assets/images/summons/skeleton.png",
    order: 1 // Position in progression chain
  },
  zombie: {
    id: "zombie",
    name: "Zombie",
    rarity: "uncommon",
    resonance: "undead",
    baseDuration: 20,
    level: 1,
    baseStats: { hp: partyState.heroBaseStats.hp * 0.2, attack: partyState.heroBaseStats.attack * 0.75, defense: 1, critChance: 0.03, speed: 0.8 },
    hasAutoAttack: false,
    //image: "assets/images/summons/zombie.png",
    abilities: [
        { id: "plague", unlockLevel: 1, active: true },
        { id: "zombieAmbush", unlockLevel: 1, active: true }
    ],
    skills: {
        plague: { active: true },
        zombieAmbush: { cooldownRemaining: 3500, active: true }
    },
    order: 2
  },
  vampire: {
    id: "vampire",
    name: "Vampire",
    rarity: "rare",
    resonance: "undead",
    baseDuration: 15,
    baseStats: { hp: partyState.heroBaseStats.hp * 0.3, attack: partyState.heroBaseStats.attack * 0.75, defense: 1, critChance: 0.15, speed: 1.3 },
    hasAutoAttack: false,
    level: 1,
    abilities: [
      { id: "feastOfAges", unlockLevel: 1, active: true}
    ],
    skills:{
      feastOfAges: { cooldownRemaining: 5000, active: true }
    },
    //image: "assets/images/summons/vampire.png",
    order: 3
  },
  ghostDragon: {
    id: "ghostDragon",
    name: "Ghost Dragon",
    rarity: "legendary",
    resonance: "undead",
    baseDuration: 10,
    baseStats: { hp: partyState.heroBaseStats.hp * 0.5, attack: partyState.heroBaseStats.attack * 1.5, defense: 1, critChance: 0.2, speed: 1.5 },
    hasAutoAttack: false,
    //image: "assets/images/summons/ghostdragon.png",
    abilities: [
      { id: "rot", unlockLevel: 1, active: true}
    ],
    skills:{
      feastOfAges: { rot: 4500, active: true }
    },
    order: 4
  },
  angel: {
    id: "angel",
    name: "Angel",
    resonance: "light",
    rarity: "Activated via skill",
    baseDuration: 15,
    hasAutoAttack: true,
    baseStats: { hp: partyState.heroBaseStats.hp * 0.4, attack: partyState.heroBaseStats.attack * 1.8, defense: 2, critChance: 0.15, speed: 1.2 },
    abilities: [
      { id: "prismaticLight", unlockLevel: 1, active: true}
    ],
    skills:{
      prismaticLight: { cooldownRemaining: 8000, active: true }
    },
  },
  lesserDevil: {
    id: "lesserDevil",
    name: "Lesser Devil",
    resonance: "dark",
    rarity: "Activated via skill",
    baseDuration: 12,
    hasAutoAttack: false,
    baseStats: { hp: partyState.heroBaseStats.hp * 0.4, attack: partyState.heroBaseStats.attack * 1.7, defense: 2, critChance: 0.15, speed: 1.2 },
    abilities: [
      { id: "fireball", unlockLevel: 1, active: true}
    ],
    skills:{
      fireball: { cooldownRemaining: 3500, active: true }
    },
  },
  waterElemental: {
    id: "waterElemental",
    name: "Water Elemental",
    resonance: "water",
    rarity: "Activated via skill",
    baseDuration: 10,
    hasAutoAttack: false,
    baseStats: { hp: partyState.heroBaseStats.hp * 0.4, attack: partyState.heroBaseStats.attack * 2, defense: 2, critChance: 0.10, speed: 1 },
    abilities: [
      { id: "splash", unlockLevel: 1, active: true}
    ],
    skills:{
      splash: { cooldownRemaining: 3000, active: true }
    },
  }
};

// Updated listener to find the summoner
on("requestSummon", (data) => {
  const { summonKey, class: summonerClass } = data;
  
  if (!summonKey || !summonerClass) {
    console.error("requestSummon requires summonKey and class");
    return;
  }
  
  // Find the summoner in the party
  const summoner = partyState.party.find(m => m.id === summonerClass);
  
  if (!summoner) {
    console.error(`Summoner ${summonerClass} not found in party`);
    return;
  }
  
  // Check if this summon is already active
  const existingSummon = summonsState.active.find(s => s.templateId === summonKey);
  if (existingSummon) {
    //console.log(`${summonKey} already summoned`);
    return;
  }
  
  createSummon(summonKey, summoner);
});

// Summon state tracking
export const summonsState = {
  active: [], // Array of active summon instances
  initialized: false
};

// Initialize the summon system
export function initSummonSystem() {
  if (summonsState.initialized) return;
  
  console.log("Initializing Summon System...");
  
  // Listen for enemy defeats from necromancers
  on("enemyDefeated", (data) => {
    handleEnemyDefeated(data);
  });
  
  summonsState.initialized = true;
  console.log("Summon System initialized");
}

// Handle enemy defeated event - check for summons
function handleEnemyDefeated(data) {
  // Find all necromancers in party
  const necromancers = partyState.party.filter(member => member.id === "necromancer");
  
  if (necromancers.length === 0) return;
  
  // Each necromancer gets a chance to summon
  necromancers.forEach(necromancer => {
    attemptSummon(necromancer);
  });
}

// Create a new summon - flexible for any summoner class
function createSummon(summonKey, summoner = null, bonusLevel = 0) {
  const template = summonTemplates[summonKey];
  
  if (!template) {
    console.error(`Summon template not found: ${summonKey}`);
    return;
  }
  
  // Determine summoner details
  const summonerClass = summoner ? summoner.id : 'unknown';
  const summonerLevel = summoner ? summoner.level : 1;
  
  // Calculate duration based on summoner type
  let duration = template.baseDuration;
  
  // Apply class-specific bonuses
  if (summonerClass === 'cleric') {
    // Cleric might get different bonuses (e.g., from temple level)
    const templeLevel = getBuildingLevel("temple") || 0;
    duration += templeLevel * 1.5;
    bonusLevel = templeLevel;
  }
  // Future summoners can be added here (warlock -> demons, mage -> elementals, etc.)
  
  const newSummon = {
    id: `summon_${summonKey}_${Date.now()}`,
    templateId: summonKey,
    name: template.name,
    duration: duration,
    maxDuration: duration,
    level: summonerLevel,
    summonerClass: summonerClass, // Track who summoned this
    stats: {},
    attackCooldown: 0,
    isSummon: true,
    resonance: template.resonance,
    hasAutoAttack: template.hasAutoAttack,
    abilities: template.abilities ? [...template.abilities] : [],
    skills: template.skills ? { ...template.skills } : {}
  };
  
  // Calculate stats based on summoner type
  updateSummonStats(newSummon, template, bonusLevel, summonerClass);
  
  // Add to active summons
  summonsState.active.push(newSummon);
  
  // Add to party
  addSummonToParty(newSummon);
  
  //console.log(`${summonerClass} summoned ${template.name}!`);
  
  emit("summonCreated", { summon: newSummon, summoner: summonerClass });
}

// Update summon stats based on summoner type and bonuses
function updateSummonStats(summon, template, bonusLevel, summonerClass) {
  let attackBonus = 0;
  let hpMultiplier = 1.0;
  let defenseBonus = 0;
  
  // Apply class-specific stat bonuses
  switch(summonerClass) {
    case 'necromancer':
      // Graveyard increases attack
      attackBonus = bonusLevel * 0.5;
      break;
      
    case 'cleric':
      // Temple might increase HP and defense
      hpMultiplier = 1 + (bonusLevel * 0.1);
      defenseBonus = bonusLevel * 0.2;
      break;
      
    case 'warlock':
      // Future: demons might get different bonuses
      attackBonus = bonusLevel * 0.7;
      break;
      
    case 'mage':
      // Future: elementals might scale differently
      attackBonus = bonusLevel * 0.4;
      hpMultiplier = 1 + (bonusLevel * 0.15);
      break;
      
    default:
      // No bonuses for unknown summoners
      break;
  }
  
  summon.stats = {
    hp: template.baseStats.hp * hpMultiplier,
    mp: template.baseStats.mp,
    attack: template.baseStats.attack + attackBonus,
    defense: template.baseStats.defense + defenseBonus,
    critChance: template.baseStats.critChance,
    speed: template.baseStats.speed
  };
}

// Updated listener to find the summoner
on("requestSummon", (data) => {
  const { summonKey, class: summonerClass } = data;
  
  if (!summonKey || !summonerClass) {
    console.error("requestSummon requires summonKey and class");
    return;
  }
  
  // Find the summoner in the party
  const summoner = partyState.party.find(m => m.id === summonerClass);
  
  if (!summoner) {
    console.error(`Summoner ${summonerClass} not found in party`);
    return;
  }
  
  // Check if this summon is already active
  const existingSummon = summonsState.active.find(s => s.templateId === summonKey);
  if (existingSummon) {
    //console.log(`${summonKey} already summoned`);
    return;
  }
  
  createSummon(summonKey, summoner);
});

// Updated attemptSummon to use new signature
function attemptSummon(necromancer) {
  const graveyardLevel = getBuildingLevel("graveyard") || 0;
  const summonChance = 60 + graveyardLevel;
  const roll = Math.random() * 100;
  
  if (roll <= summonChance) {
    const activeSummonTypes = summonsState.active.map(s => s.templateId);
    const progressionChain = ['skeleton', 'zombie', 'vampire', 'ghostDragon'];
    
    let summonToCreate = null;
    
    for (const summonKey of progressionChain) {
      if (!activeSummonTypes.includes(summonKey)) {
        summonToCreate = summonKey;
        break;
      }
    }
    
    if (!summonToCreate) {
      //console.log("All summons already active - no new summon created");
      return;
    }
    
    // Now passes the necromancer object directly
    createSummon(summonToCreate, necromancer);
  }
}

// Add summon to party
function addSummonToParty(summon) {
  const template = summonTemplates[summon.templateId];
  
  const partyMember = {
    id: summon.id,
    templateId: summon.templateId,
    name: template.name,
    level: summon.level,
    stats: { ...summon.stats },
    attackCooldown: 0,
    isSummon: true,
    image: template.image,
    resonance: template.resonance,
    hasAutoAttack: template.hasAutoAttack,
    abilities: template.abilities ? [...template.abilities] : [],
    skills: template.skills ? { ...template.skills } : {}
  };
  
  //console.log(`[SUMMON] ${summon.templateId} added to party`);
  //console.log(summon);
  partyState.party.push(partyMember);
  emit("partyChanged", partyState.party);
  updateTotalStats(); // 🔥 update totals after removing
}

// Update summon durations (called from main game loop)
export function updateSummons(delta) {
  if (summonsState.active.length === 0) return;
  
  const toRemove = [];
  
  summonsState.active.forEach(summon => {
    summon.duration -= delta;
    
    if (summon.duration <= 0) {
      toRemove.push(summon);
    }
  });
  
  // Remove expired summons
  toRemove.forEach(summon => {
    removeSummon(summon);
  });
}

// Remove a summon from the system
function removeSummon(summon) {
  const template = summonTemplates[summon.templateId];
  
  // Remove from active summons
  const index = summonsState.active.findIndex(s => s.id === summon.id);
  if (index !== -1) {
    summonsState.active.splice(index, 1);
  }
  
  // Remove from party
  const partyIndex = partyState.party.findIndex(m => m.id === summon.id);
  if (partyIndex !== -1) {
    partyState.party.splice(partyIndex, 1);
    emit("partyChanged", partyState.party);
    updateTotalStats(); // 🔥 update totals after removing
  }
  
  //console.log(`${template.name} expired`);
  emit("summonExpired", summon);
}

// Get total summon power for display/stats
export function getTotalSummonPower() {
  return summonsState.active.reduce((total, summon) => {
    return total + (summon.stats.attack || 0);
  }, 0);
}

// Get active summon count
export function getActiveSummonCount() {
  return summonsState.active.length;
}

// Manual summon clear (for debugging or game events)
export function clearAllSummons() {
  const toRemove = [...summonsState.active];
  toRemove.forEach(summon => removeSummon(summon));
} 

window.clearSummons = function() {
  clearAllSummons();
  console.log("All summons cleared");
}
window.showSummons = function() {
  console.log(summonsState.active);
}