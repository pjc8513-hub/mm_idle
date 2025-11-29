import { partyState } from "../state.js";
import { emit, on } from "../events.js";
import { classes } from "../content/classes.js";
import { heroSpells } from "../content/heroSpells.js";
import { abilities } from "../content/abilities.js";

export function initMath() {
  console.log("Math system initialized");
  on("partyChanged", () => {
	updateElementalModifiers()
});
  on("classUpgraded", ({ id, level }) => {
    calculateClassStats(id, level);
    updateElementalModifiers();
  });
}

// Math utilities
export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
export function chance(prob) {
  return Math.random() < prob;
}

// Helper to get class data by ID
export function getClassById(id) {
  console.log("Getting class by ID:", id);
  return classes.find(c => c.id === id);
}

export function calculatePercentage(number, percentage) {
return (number * percentage) / 100;
}

// Calculate elemental stats in partyState.elementalDmgModifiers from resonance

export function updateElementalModifiers() {
  const baseModifiers = {
    physical: 1,
    fire: 1,
    water: 1,
    air: 1,
    earth: 1,
    poison: 1,
    light: 1,
    dark: 1,
    undead: 1
  };

  // Count how many members share each resonance
  const resonanceCounts = {};
  for (const member of partyState.party) {
    const res = member.resonance;
    if (Array.isArray(res)) {
      for (const r of res) {
        resonanceCounts[r] = (resonanceCounts[r] || 0) + 1;
      }
    } else if (typeof res === "string") {
      resonanceCounts[res] = (resonanceCounts[res] || 0) + 1;
    }
  }

  // Apply tiered bonuses
  for (const element in baseModifiers) {
    const count = resonanceCounts[element] || 0;
    let bonus = 0;
    if (count === 2) bonus = 0.25;
    else if (count === 3) bonus = 0.50;
    else if (count >= 4) bonus = 1.00;
    bonus += partyState.heroBonuses[element] || 0;
    baseModifiers[element] += bonus;
  }

  partyState.elementalDmgModifiers = { ...baseModifiers };
  emit("elementalModifiersUpdated", partyState.elementalDmgModifiers);
}



/*
 * @param {number} num
 * @returns {{ text: string, suffix: string }}
 */
export function formatNumber(num) {
  const units = [
    { value: 1e33, suffix: "Dc" }, // Decillion
    { value: 1e30, suffix: "No" }, // Nonillion
    { value: 1e27, suffix: "Oc" }, // Octillion
    { value: 1e24, suffix: "Sp" }, // Septillion
    { value: 1e21, suffix: "Sx" }, // Sextillion
    { value: 1e18, suffix: "Qi" }, // Quintillion
    { value: 1e15, suffix: "Qa" }, // Quadrillion
    { value: 1e12, suffix: "T"  }, // Trillion
    { value: 1e9,  suffix: "B"  }, // Billion
    { value: 1e6,  suffix: "M"  }, // Million
    { value: 1e3,  suffix: "K"  }, // Thousand
  ];

  for (const u of units) {
    if (num >= u.value) {
      return {
        text: (num / u.value).toFixed(1) + u.suffix,
        suffix: u.suffix
      };
    }
  }

  return { text: num.toString(), suffix: "" };
}

export const suffixColors = {
  "K": "brown",
  "M": "yellow",
  "B": "red",
  "T": "purple",
  "Qa": "lightblue",
  "Qi": "cyan",
  "Sx": "lime",
  "Sp": "green",
  "Oc": "orange",
  "No": "pink",
  "Dc": "gold",
  "": "white"
};


/**
 * Calculate hero's current stats based on level
 */
export function getHeroStats() {
  const stats = {};
  for (const stat in partyState.heroBaseStats) {
    const base = partyState.heroBaseStats[stat];
    const growth = partyState.heroGrowthPerLevel[stat] || 0;
    const bonus = partyState.heroBonuses[stat] || 0;
    //stats[stat] = base + (growth * (partyState.heroLevel - 1)) + bonus;
    stats[stat] = Math.floor(base * (1+ partyState.heroLevel * growth) + bonus);
  }
  return stats;
}

const CLASS_ROLE_TIERS = {
  dps:     { atkRatio: 1.00, growth: 0.05 }, // +5% atk per class lvl
  caster:  { atkRatio: 0.70, growth: 0.08 }, // +8% per class lvl
  support: { atkRatio: 0.40, growth: 0.03 }  // +3% per class lvl
};

/**
 * Calculate a class member's stats based on their level AND hero stats
 * @param {Object} classTemplate - The class definition
 * @param {number} classLevel - The class's current level
 * @returns {Object} - Calculated stats for this class instance
 */

export function calculateClassStats(classTemplate, classLevel) {
  const hero = getHeroStats();
  const role = CLASS_ROLE_TIERS[classTemplate.role];
  const lvl = classLevel - 1;  // lvl 1 = baseline

  const stats = {};

  // Loop same keys as old system so nothing breaks
  for (const stat in classTemplate.heroStatRatios) {
    const ratio = classTemplate.heroStatRatios[stat] ?? 0;
    const heroVal = hero[stat] || 0;

    if (stat === "hp") {
      stats.hp = Math.floor(hero.hp * (ratio || 1));
    }
    else if (stat === "defense") {
      stats.defense = Math.floor(hero.defense * (ratio || 0.5));
    }
    else if (stat === "attack") {
      const attackMultiplier = 1 + (lvl * role.growth);
      stats.attack = Math.floor(hero.attack * (role.atkRatio ?? 1) * attackMultiplier);
    }
    else {
      // Fallback = legacy behavior for misc stats (speed, crit, etc.)
      const base = classTemplate.baseStats?.[stat] || 0;
      const growth = classTemplate.growthPerLevel?.[stat] || 0;
      stats[stat] = (heroVal * ratio) + (base + growth * lvl);
    }
  }

  // Safety: ensure speed + crit at least exist even if not in heroStatRatios
  stats.speed = stats.speed ??
    ((classTemplate.baseStats?.speed || 1) +
     (classTemplate.growthPerLevel?.speed || 0) * lvl);

  stats.critChance = stats.critChance ??
    ((classTemplate.baseStats?.critChance || 0) +
     (classTemplate.growthPerLevel?.critChance || 0) * lvl);

  return stats;
}


/**
 * Recalculate all party member stats and totals
 */
export function updateTotalStats() {
  const totals = { hp: 0, attack: 0, defense: 0 };
  
  // Update each party member's stats first
  for (const member of partyState.party) {
    const classLevel = partyState.classLevels[member.id] || 1;
    const classTemplate = classes.find(c => c.id === member.id);
    
    if (classTemplate) {
      member.stats = calculateClassStats(classTemplate, classLevel);
      member.level = classLevel;
      
      // Add to totals
      totals.hp += member.stats.hp || 0;
      totals.attack += member.stats.attack || 0;
      totals.defense += member.stats.defense || 0;
    }
  }
  updateElementalModifiers();
  partyState.totalStats = totals;
  emit("statsUpdated", totals);
}

/**
 * Level up the hero
 */
export function levelUpHero() {
  partyState.heroLevel++;
  updateTotalStats(); // All classes benefit from hero level up
  emit("heroLevelUp", partyState.heroLevel);
}

/**
 * Level up a specific class
 */
export function levelUpClass(classId) {
  partyState.classLevels[classId] = (partyState.classLevels[classId] || 1) + 1;
  
  // If this class is in the party, update stats
  if (partyState.party.some(m => m.id === classId)) {
    updateTotalStats();
  }
  
  emit("classLevelUp", { id: classId, level: partyState.classLevels[classId] });
}

/**
 * Add blacksmith or other external bonuses
 */
export function addHeroBonus(stat, amount) {
  partyState.heroBonuses[stat] = (partyState.heroBonuses[stat] || 0) + amount;
  updateTotalStats(); // Affects all classes
  emit("heroBonusAdded", { stat, amount });
}

export function getSkillDamageRatio(skillId, wave, overrideLevel=null) {
  // look up skill
  const skill = heroSpells.find(a => a.id === skillId);
  // Base ratio depends on skill tier
  const tierBaseRatios = {
    1: 2.5,   // Tier 1: 250% of attack
    2: 3.2,   // Tier 2: 320% of attack
    3: 7.0,   // Tier 3: 700% of attack
    4: 11.5,   // Tier 4: 1150% of attack
    5: 20.0   // Tier 5: 2000% of attack
  };
  
  const baseRatio = tierBaseRatios[skill.tier] || 1.0;
  
  // Skill level scaling (similar to your enemy HP zone scaling)
  //const levelScaling = Math.pow(1.15, skill.skillLevel - 1);
  const effectiveLevel = overrideLevel !== null ? overrideLevel : skill.skillLevel;
  const levelScaling = Math.pow(1.15, effectiveLevel - 1);
  
  // Wave-based scaling (matches enemy progression but slightly weaker)
  // Using 1.03 instead of 1.035 means skills scale ~97% as fast as enemies
  const waveScaling = Math.pow(1.03, wave - 1);
  
  const finalRatio = baseRatio * levelScaling * waveScaling;
  
  return finalRatio;
}

export function getAbilityDamageRatio(skillId, wave, modifiedTier=null) {
  // look up skill
  const skill = abilities.find(a => a.id === skillId);
  // Base ratio depends on skill tier
  const tierBaseRatios = {
    1: 0.5,   // Tier 1: 250% of attack
    2: 1.2,   // Tier 2: 320% of attack
    3: 3.0,   // Tier 3: 700% of attack
    4: 8.0,   // Tier 4: 1150% of attack
    5: 20.0   // Tier 5: 2000% of attack
  };
  
  const baseRatio = tierBaseRatios[skill.tier] || 1.0;
  
  // Skill level scaling (similar to your enemy HP zone scaling)
  //const levelScaling = Math.pow(1.15, skill.skillLevel - 1);
  const effectiveLevel = modifiedTier !== null ? modifiedTier : skill.skillLevel;
  const levelScaling = Math.pow(1.15, effectiveLevel - 1);
  
  // Wave-based scaling (matches enemy progression but slightly weaker)
  // Using 1.03 instead of 1.035 means skills scale ~97% as fast as enemies
  const waveScaling = Math.pow(1.03, wave - 1);
  
  const finalRatio = baseRatio * levelScaling * waveScaling;
  
  return finalRatio;
}