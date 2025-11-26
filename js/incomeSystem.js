import { state, runeState } from "./state.js";
import { emit } from "./events.js";
import { buildings } from "./content/buildingDefs.js";
import { getBuildingLevel } from "./town.js";
import { logMessage } from "./systems/log.js";

// Constants
const K_HIT = 0.02;       // gold per point of auto damage dealt
export const BOUNTY_FACTOR = 10; // gold per enemy HP on kill

// Centralized income functions
export const incomeSystem = {
  applyHitIncome(attacker, damage) {
    let income = 0;

    // Base income from damage dealt
    income += damage * K_HIT;

    // Class bonus (if class defines income per hit)
    if (attacker.goldIncomePerHit) {
      income += attacker.goldIncomePerHit;
    }

    // Building bonuses (loop through owned buildings in state)
    for (const building of state.buildings) {
      let buildingData = buildings.find(b => b.id === building.id);
      const buildingLevel = getBuildingLevel(building.id);
      const goldFromBuilding =  buildingData.goldIncomePerHit * buildingLevel || 0;
      //console.log('buildingData: ', buildingData);
      income += goldFromBuilding;
      //console.log(`gold from ${buildingData.id}: ${goldFromBuilding}`);
    }

    // Global/time bonuses
    income *= getBonusGoldMultiplier();
    //console.log(`income on hit: ${income}`);

    // Apply to state
    state.resources.gold += income;

    // Emit event for UI/logging
    emit("goldChanged", state.resources.gold);

    return income;
  },

  applyKillIncome(enemy) {
    let income =
    Math.log10(enemy.maxHp + 1) *
    Math.max(10, BOUNTY_FACTOR * (1 + (state.buildings.castle?.level ?? 0) * 0.1));
    income *= getBonusGoldMultiplier();

    state.resources.gold += income;
    emit("goldChanged", state.resources.gold);

    return income;
  },
    // -----------------------------------------------------
  // NEW: Idle rewards
  // -----------------------------------------------------
  calculateIdleIncome(secondsOffline) {
    // Cap at 24 hours
    const capped = Math.min(secondsOffline, 24 * 3600);

    if (capped <= 0) {
      return { gold: 0, seconds: 0 };
    }

    // Your base idle might be:
    //   - Your current party attack
    //   - Multiplied by income multipliers
    //   - Multiplied by wave progression

    const attack = state.partyTotals?.attack || 0; 
    const wave = state.areaWave || 1;

    // Base idle formula — tweak to taste
    let goldPerSecond = attack * 0.05;      // 5% of attack per second
    goldPerSecond *= 1 + wave * 0.05;       // +5% per wave
    goldPerSecond *= getBonusGoldMultiplier(); // same multiplier used in normal income
    let essencePerSecond = 0;

    // Buildings that give income per hit? 
    // Give them partial value, not full hit frequency
    for (const building of state.buildings) {
      const data = buildings.find(b => b.id === building.id);
      const lvl = getBuildingLevel(building.id);

      if (data.goldIncomePerHit) {
        goldPerSecond += data.goldIncomePerHit * lvl * 0.25; 
      }
      if (data.id === 'dungeonShrine'){
        essencePerSecond += 0.01 * lvl; // flat 0.01 essence/sec per shrine level
      }
    }

    const gold = Math.floor(goldPerSecond * capped);
    const essence = Math.floor(essencePerSecond * capped);

    return { gold, essence, seconds: capped };
  },


  // -----------------------------------------------------
  // NEW: Apply idle income and update state
  // -----------------------------------------------------
  applyIdleIncome(rewards) {
    state.resources.gold += rewards.gold;  
    emit("goldChanged", state.resources.gold);

    state.resources.dungeonEssence += rewards.essence;
    emit("essenceChanged", state.resources.dungeonEssence);
  }
  
};

// Example multiplier function (expand later)
function getBonusGoldMultiplier() {
  let bonus=0;
  bonus += state.innAssignments.goldIncomeMultiplier
  return bonus; // could factor in artifacts, wave clears, buffs, etc.
}

export function addGems(amount) {
  if (typeof amount !== 'number' || amount < 0) {
    console.error('Invalid amount');
    return;
  }
  state.resources.gems = Math.min(state.resources.gems + amount, state.resources.maxGems);
  emit("gemsChanged", state.resources.gems);
}



export function tryDropCrystal(enemy) {

  // -------------------------------------------
  // Bosses always drop — no 20% chance check
  // -------------------------------------------
  if (enemy.isBoss) {
    dropBossCrystals(enemy);
    return;
  }

  // -----------------------------
  // A) 20% chance to drop at all
  // -----------------------------
  const roll = Math.random();
  if (roll > 0.20) return;

  // -----------------------------
  // B) Normal quantity
  // -----------------------------
  const quantity = getDropQuantity(enemy.type);
  if (quantity <= 0) return;

  // -----------------------------
  // C) Determine element
  // -----------------------------
  const element = pickWeightedElement(enemy.elementType);

  // -----------------------------
  // D) Apply drop
  // -----------------------------
  runeState.crystals[element] += quantity;
  console.log(`Dropped ${quantity}x ${element} crystal(s)`);
  logMessage(`Dropped ${quantity}x ${element} crystal(s)`);
}

function dropBossCrystals(enemy) {
  const baseQty = Math.max(1, getDropQuantity(enemy.type));
  const quantity = baseQty * 2; // bosses double their quantity

  const elements = Object.keys(runeState.crystals);

  // 1) First crystal is weighted toward the boss element
  const firstElement = pickWeightedElement(enemy.elementType);

  // 2) Choose the remaining 2 elements randomly (but different)
  const remaining = elements.filter(el => el !== firstElement);
  shuffle(remaining);
  const secondElement = remaining[0];
  const thirdElement = remaining[1];

  const drops = [firstElement, secondElement, thirdElement];

  drops.forEach(el => {
    runeState.crystals[el] += quantity;
    console.log(`Boss dropped ${quantity}x ${el} crystal(s)`);
    logMessage(`Boss dropped ${quantity}x ${el} crystal(s)`);
  });
}


// Quantity table
function getDropQuantity(enemyType) {
  switch (enemyType) {
    case 'dragon':
    case 'elemental':
    case 'demon':
      return 3;
    case 'construct':
      return 2;
    case 'humanoid':
    case 'beast':
    case 'undead':
      return 1;
    default:
      return 0; // pest, typos, anything unlisted
  }
}

function pickWeightedElement(primaryElement) {
  const elements = Object.keys(runeState.crystals);

  const weights = {};
  const primaryWeight = 0.60; // 60% chance for enemy’s own element
  const otherWeight = (1 - primaryWeight) / (elements.length - 1);

  elements.forEach(el => {
    weights[el] = (el === primaryElement) ? primaryWeight : otherWeight;
  });

  // Random weighted selection
  let r = Math.random();
  for (const el of elements) {
    r -= weights[el];
    if (r <= 0) return el;
  }

  return primaryElement; // fallback
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

window.gainIdleRewards = function(seconds) {
  const rewards = incomeSystem.calculateIdleIncome(seconds);
  incomeSystem.applyIdleIncome(rewards);
  showIdleModal(rewards);
}