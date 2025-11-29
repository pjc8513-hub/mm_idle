import { state, partyState } from "../state.js";
import { emit } from "../events.js";
import { saveGame } from "./saveSystem.js";

// Milestone reward definitions - EXPAND THIS LATER!
/*
export const DUNGEON_MILESTONES = {
  20: {
    name: "Depths Survivor I",
    rewards: [
      { type: "permanent_buff", stat: "bossDamage", value: 0.25 }, // +25% boss damage
      { type: "resource", id: "dungeonEssence", amount: 10 }
    ],
    description: "Reached depth 20 for the first time"
  },
  40: {
    name: "Depths Survivor II",
    rewards: [
      { type: "permanent_buff", stat: "critDamage", value: 0.10 }, // +10% crit damage
      { type: "resource", id: "dungeonEssence", amount: 25 },
      { type: "spell_unlock", spellId: "dungeonBlast" } // Example special spell
    ],
    description: "Reached depth 40 for the first time"
  },
  60: {
    name: "Depths Master I",
    rewards: [
      { type: "permanent_buff", stat: "allDamage", value: 0.05 },
      { type: "resource", id: "dungeonEssence", amount: 50 },
      { type: "building_unlock", buildingId: "dungeonShrine" } // Example special building
    ],
    description: "Reached depth 60 for the first time"
  },
  80: {
    name: "Depths Master II",
    rewards: [
      { type: "permanent_buff", stat: "critChance", value: 0.03 }, // +3% crit chance
      { type: "permanent_buff", stat: "bossDamage", value: 0.50 },
      { type: "resource", id: "dungeonEssence", amount: 100 },
      { type: "class_promotion_token", amount: 1 } // Unlock class promotions
    ],
    description: "Reached depth 80 for the first time"
  },
  100: {
    name: "Dungeon Legend",
    rewards: [
      { type: "permanent_buff", stat: "allDamage", value: 0.15 },
      { type: "permanent_buff", stat: "timeBonus", value: 2 }, // +2 seconds max dungeon time
      { type: "resource", id: "dungeonEssence", amount: 200 },
      { type: "spell_unlock", spellId: "dungeonNova" },
      { type: "achievement", id: "dungeon_legend" }
    ],
    description: "Reached depth 100 - A true legend!"
  }
  // Add more milestones at 120, 140, 160, etc.
};

// Track which milestones have been claimed
export const dungeonProgress = {
  claimedMilestones: [], // Array of milestone depths claimed
  permanentBuffs: {
    bossDamage: 0,
    critDamage: 0,
    critChance: 0,
    allDamage: 0,
    timeBonus: 0
  },
  dungeonEssence: 0, // Special currency from dungeons
  unlockedSpells: [],
  unlockedBuildings: [],
  promotionTokens: 0
};
*/

// Milestone reward definitions - EXPAND THIS LATER! 
export const DUNGEON_MILESTONES = 
{ 
  10: 
  { name: "Depths Survivor I", 
    rewards: [ 
      { type: "permanent_buff", stat: "bossDamage", value: 0.25 }, // +25% boss damage
      { type: "permanent_buff", stat: "autoAttackDamage", value: 10 }, // +100% auto attack damage
      { type: "permanent_buff", stat: "allDamage", value: 1.5 },
      { type: "permanent_buff", stat: "goldBonus", value: 0.25 },
      { type: "building_unlock", buildingId: "dungeonShrine" },
      { type: "resource", id: "dungeonEssence", amount: 100 },
    ], 
    description: "Reached depth 10 for the first time" }, 
  20: 
  { name: "Depths Survivor II", 
    rewards: [ 
      { type: "permanent_buff", stat: "critDamage", value: 0.10 }, // +10% crit damage 
      { type: "permanent_buff", stat: "autoAttackDamage", value: 10 }, // +100% auto attack damage
      { type: "permanent_buff", stat: "goldBonus", value: 0.25 },
      { type: "resource", id: "dungeonEssence", amount: 200 },
      ], 
      description: "Reached depth 20 for the first time" 
  },
  30:
  { name: "Depths Master I",
    rewards:
    [
      { type: "permanent_buff", stat: "allDamage", value: 1.5 },
      { type: "permanent_buff", stat: "autoAttackDamage", value: 10 }, // +100% auto attack damage
      { type: "permanent_buff", stat: "goldBonus", value: 0.25 },
      { type: "resource", id: "dungeonEssence", amount: 300 },
    ],
    description: "Reached depth 30 for the first time" 
  }, 
  40:
  { name: "Depths Master II",
    rewards:
    [
      { type: "permanent_buff", stat: "autoAttackDamage", value: 10 }, // +100% auto attack damage
      { type: "permanent_buff", stat: "goldBonus", value: 0.25 },
      { type: "permanent_buff", stat: "bossDamage", value: 0.50 },
      { type: "resource", id: "dungeonEssence", amount: 400 },
    ],
    description: "Reached depth 40 for the first time"
      // more 
  },
  50:
  { name: "Dungeon Legend",
    rewards:
    [
      { type: "permanent_buff", stat: "critDamage", value: 0.20 },
      { type: "permanent_buff", stat: "timeBonus", value: 2 }, // +2 seconds max dungeon time
      { type: "permanent_buff", stat: "goldBonus", value: 0.25 },
      { type: "resource", id: "dungeonEssence", amount: 500 },
      //{ type: "achievement", id: "dungeon_legend" }
    ],
    description: "Reached depth 50 for the first time"
  },
  60:
  { name: "Dungeon legend II",
    rewards:
    [
      { type: "permanent_buff", stat: "allDamage", value: 0.50 },
      { type: "permanent_buff", stat: "bossDamage", value: 1 }, // +100% boss damage
      { type: "permanent_buff", stat: "autoAttackDamage", value: 1 }, // +100% auto attack damage
      { type: "resource", id: "dungeonEssence", amount: 600 },
    ],
    description: "Reached depth 60 for the first time"
  },
  70:
  { name: "Dungeon legend III",
    rewards:
    [
      { type: "permanent_buff", stat: "critDamage", value: 0.25 },
      { type: "permanent_buff", stat: "autoAttackDamage", value: 2 }, // +200% auto attack damage
      { type: "resource", id: "dungeonEssence", amount: 700 },
    ],
    description: "Reached depth 70 for the first time"
  }
};

export const dungeonProgress = 
{ 
  claimedMilestones: [], // Array of milestone depths claimed
  permanentBuffs: {
    bossDamage: 0,
    critDamage: 0,
    critChance: 0,
    autoAttackDamage: 0,
    timeBonus: 0
  },
  dungeonEssence: 0, // Special currency from dungeons
  unlockedSpells: [],
  unlockedBuildings: [],
  promotionTokens: 0
};

// Check and award milestone rewards
export function checkMilestoneRewards(currentDepth) {
  // Find all milestones at or below current depth that haven't been claimed
  const unclaimedMilestones = Object.keys(DUNGEON_MILESTONES)
    .map(Number)
    .filter(depth => 
      depth <= currentDepth && 
      !dungeonProgress.claimedMilestones.includes(depth)
    )
    .sort((a, b) => a - b);

  if (unclaimedMilestones.length === 0) return [];

  const awarded = [];
  
  unclaimedMilestones.forEach(milestoneDepth => {
    const milestone = DUNGEON_MILESTONES[milestoneDepth];
    
    // Apply each reward
    milestone.rewards.forEach(reward => {
      applyMilestoneReward(reward);
    });
    
    // Mark as claimed
    dungeonProgress.claimedMilestones.push(milestoneDepth);
    awarded.push({ depth: milestoneDepth, ...milestone });
    
    console.log(`🏆 Milestone unlocked: ${milestone.name} (Depth ${milestoneDepth})`);
  });

  if (awarded.length > 0) {
    emit("milestoneAwarded", awarded);
    //saveDungeonProgress(); // Persist to localStorage
    saveGame();
  }

  return awarded;
}

// Apply a single reward
function applyMilestoneReward(reward) {
  switch (reward.type) {
    case "permanent_buff":
      dungeonProgress.permanentBuffs[reward.stat] += reward.value;
      applyPermanentBuff(reward.stat, reward.value);
      console.log(`📈 Permanent buff: +${reward.value} ${reward.stat}`);
      break;

    case "resource":
      if (reward.id === "dungeonEssence") {
        dungeonProgress.dungeonEssence += reward.amount;
        // Also add to state if you create this resource
        // state.resources.dungeonEssence = (state.resources.dungeonEssence || 0) + reward.amount;
      }
      console.log(`💎 Gained ${reward.amount} ${reward.id}`);
      break;

    case "spell_unlock":
      if (!dungeonProgress.unlockedSpells.includes(reward.spellId)) {
        dungeonProgress.unlockedSpells.push(reward.spellId);
        // TODO: Add spell to heroSpells pool when implemented
      }
      console.log(`✨ Unlocked spell: ${reward.spellId}`);
      break;

    case "building_unlock":
      if (!dungeonProgress.unlockedBuildings.includes(reward.buildingId)) {
        dungeonProgress.unlockedBuildings.push(reward.buildingId);
        // TODO: Make building available in town panel
      }
      console.log(`🏛️ Unlocked building: ${reward.buildingId}`);
      break;

    case "class_promotion_token":
      dungeonProgress.promotionTokens += reward.amount;
      console.log(`🎖️ Gained ${reward.amount} class promotion token(s)`);
      break;

    case "achievement":
      console.log(`🏆 Achievement unlocked: ${reward.id}`);
      break;

    default:
      console.warn(`Unknown reward type: ${reward.type}`);
  }
}

// Apply permanent buff to game state
function applyPermanentBuff(stat, value) {
  switch (stat) {
    case "bossDamage":
      partyState.heroBonuses.bossDamage = 
        (partyState.heroBonuses.bossDamage || 0) + value;
      break;

    case "critDamage":
      partyState.heroBonuses.critDamage = 
        (partyState.heroBonuses.critDamage || 0) + value;
      break;

    case "critChance":
      partyState.critChance += value;
      break;

    case "autoAttackDamage":
      partyState.heroBonuses.autoAttackDamage = 
        (partyState.heroBonuses.autoAttackDamage || 0) + value;
      break;

    case "allDamage":
      partyState.heroBonuses.allDamage = 
        (partyState.heroBonuses.allDamage || 0) + value;
      break;

    case "timeBonus":
      partyState.heroBonuses.timeBonus = 
        (partyState.heroBonuses.timeBonus || 0) + value;
      // This would increase max dungeon time or normal wave time
      // dungeonState.DUNGEON_MAX_TIME += value; // Example
      break;

    case "goldBonus":
      partyState.heroBonuses.goldBonus = 
        (partyState.heroBonuses.goldBonus || 0) + value;
      break;

    default:
      console.warn(`Unknown buff stat: ${stat}`);
  }

  emit("permanentBuffApplied", { stat, value });
}

// Get next unclaimed milestone
export function getNextMilestone(currentDepth) {
  const nextDepth = Object.keys(DUNGEON_MILESTONES)
    .map(Number)
    .filter(depth => 
      depth > currentDepth && 
      !dungeonProgress.claimedMilestones.includes(depth)
    )
    .sort((a, b) => a - b)[0];

  return nextDepth ? DUNGEON_MILESTONES[nextDepth] : null;
}

// Get all unclaimed milestones the player has reached
export function getUnclaimedMilestones(currentMaxDepth) {
  return Object.keys(DUNGEON_MILESTONES)
    .map(Number)
    .filter(depth => 
      depth <= currentMaxDepth && 
      !dungeonProgress.claimedMilestones.includes(depth)
    )
    .map(depth => ({
      depth,
      ...DUNGEON_MILESTONES[depth]
    }));
}

// Save/Load from localStorage
/*
function saveDungeonProgress() {
  try {
    localStorage.setItem('dungeonProgress', JSON.stringify(dungeonProgress));
  } catch (e) {
    console.warn("Failed to save dungeon progress:", e);
  }
}

export function loadDungeonProgress() {
  try {
    const saved = localStorage.getItem('dungeonProgress');
    if (saved) {
      const loaded = JSON.parse(saved);
      Object.assign(dungeonProgress, loaded);
      
      // Re-apply all permanent buffs on load
      Object.entries(dungeonProgress.permanentBuffs).forEach(([stat, value]) => {
        if (value > 0) applyPermanentBuff(stat, value);
      });
      
      console.log("📦 Loaded dungeon progress:", dungeonProgress);
    }
  } catch (e) {
    console.warn("Failed to load dungeon progress:", e);
  }
}
*/

// Initialize on game start
export function initDungeonMilestones() {
 // loadDungeonProgress();
  
  // Check for milestone rewards when dungeon ends
  // (Already tracking maxDepth in dungeonState)
  
  console.log("🏆 Dungeon Milestones initialized");
}

// ============================================
// UI HELPER: Milestone Display Component
// ============================================

export function renderMilestonePopup(milestones) {
  if (!milestones || milestones.length === 0) return;

  const popup = document.createElement('div');
  popup.className = 'milestone-popup';
  popup.innerHTML = `
    <div class="milestone-content">
      <h2>🏆 Milestone${milestones.length > 1 ? 's' : ''} Reached!</h2>
      ${milestones.map(m => `
        <div class="milestone-item">
          <h3>${m.name} - Depth ${m.depth}</h3>
          <p>${m.description}</p>
          <div class="milestone-rewards">
            ${m.rewards.map(r => formatReward(r)).join('')}
          </div>
        </div>
      `).join('')}
      <button onclick="this.parentElement.parentElement.remove()">Claim Rewards</button>
    </div>
  `;

  document.body.appendChild(popup);
  
  // Auto-remove after 10 seconds
  setTimeout(() => popup.remove(), 10000);
}

function formatReward(reward) {
  switch (reward.type) {
    case "permanent_buff":
      return `<div class="reward">📈 +${(reward.value * 100).toFixed(0)}% ${reward.stat}</div>`;
    case "resource":
      return `<div class="reward">💎 +${reward.amount} ${reward.id}</div>`;
    case "spell_unlock":
      return `<div class="reward">✨ Unlocked: ${reward.spellId}</div>`;
    case "building_unlock":
      return `<div class="reward">🏛️ Unlocked: ${reward.buildingId}</div>`;
    case "class_promotion_token":
      return `<div class="reward">🎖️ +${reward.amount} Promotion Token</div>`;
    default:
      return `<div class="reward">🎁 ${reward.type}</div>`;
  }
}

// Add to dungeonMode.js endDungeonMode():
/*
export function endDungeonMode() {
  // ... existing code ...
  
  // Check for milestone rewards BEFORE clearing dungeon state
  const milestones = checkMilestoneRewards(dungeonState.maxDepth);
  
  if (milestones.length > 0) {
    renderMilestonePopup(milestones);
  }
  
  // ... rest of function ...
}
*/

// ============================================
// TESTING COMMANDS
// ============================================

window.testMilestone = (depth) => {
  const milestones = checkMilestoneRewards(depth);
  if (milestones.length > 0) {
    renderMilestonePopup(milestones);
  } else {
    console.log(`No unclaimed milestones at depth ${depth}`);
  }
};

window.showDungeonProgress = () => {
  console.table(dungeonProgress.permanentBuffs);
  console.log("Claimed milestones:", dungeonProgress.claimedMilestones);
  console.log("Dungeon Essence:", dungeonProgress.dungeonEssence);
  console.log("Unlocked Spells:", dungeonProgress.unlockedSpells);
  console.log("Promotion Tokens:", dungeonProgress.promotionTokens);
};

window.resetMilestones = () => {
  dungeonProgress.claimedMilestones = [];
  dungeonProgress.permanentBuffs = {
    bossDamage: 0,
    critDamage: 0,
    allDamage: 0,
    autoAttackDamage: 0,
    timeBonus: 0,
    goldBonus: 0,
    critChance: 0
  };
  if (partyState.heroBonuses.bossDamage) partyState.heroBonuses.bossDamage = 0;
  if (partyState.heroBonuses.critDamage) partyState.heroBonuses.critDamage = 0;
  if (partyState.heroBonuses.allDamage) partyState.heroBonuses.allDamage = 0;
  if (partyState.heroBonuses.timeBonus) partyState.heroBonuses.timeBonus = 0;
  if (partyState.critChance) partyState.critChance = 0;
  if (partyState.heroBonuses.goldBonus) partyState.heroBonuses.goldBonus = 0;
  if (partyState.heroBonuses.autoAttackDamage) partyState.heroBonuses.autoAttackDamage = 0;
  saveGame();
  //saveDungeonProgress();
  console.log("✅ Milestones reset!");
};