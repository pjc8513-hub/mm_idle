// dungeonMode.js - Dungeon Mode System
import { state, partyState } from "./state.js";
import { emit, on } from "./events.js";
import { ENEMY_TEMPLATES } from "./content/enemyDefs.js";
import { createEnemy } from "./waveManager.js";
import { stopAutoAttack, startAutoAttack, setTarget } from "./systems/combatSystem.js";
import { addWaveTime, stopWaveTimer, startWaveTimer, updateEnemiesGrid, updateAreaPanel, renderAreaPanel } from "./area.js";
import { prefixes } from "./content/definitions.js";
import { checkMilestoneRewards } from "./systems/milestones.js";
import { addHeroExp } from "./questManager.js";

// Dungeon enemy tiers - progressively unlock harder enemies
const DUNGEON_ENEMY_TIERS = {
  1: ["goblin", "bandit", "dragonFly", "skeletonArcher", "apprenticeMage"],
  2: ["ogre", "masterArcher", "druid", "waterSpirit", "evilSpirit", "pirateRaider", "giantRat"],
  3: ["cobra", "harpy", "spectre", "emeraldOoze", "medusa", "royalGriffin", "spider"],
  4: ["seaSerpent", "hydra", "diamondGargoyle", "earthElemental", "fireElemental", "abomination"],
  5: ["blueDragon", "werewolf", "thunderLizard", "minotaur", "giant", "flyingEye", "devilSpawn"]
};

// Dungeon names that change based on depth
const DUNGEON_NAMES = {
  1: "Goblin Watch",
  10: "Shadow Guild Hideout",
  20: "Temple of Baa",
  30: "Corlagon's Estate",
  40: "Hall of the Fire Lord",
  50: "Temple of the Snake",
  60: "Temple of the Fist",
  70: "Temple of the Sun",
  80: "Silver Helm Outpost",
  90: "Ethric's Tomb",
  100: "Castle Alamos",
  110: "Icewind Keep",
  120: "Warlord's Fortress",
  130: "Tomb of VAARN",
  140: "Supreme Temple of Baa",
  150: "Devils Outpost",
  160: "The Hive"
};

export const dungeonState = {
  active: false,
  enemiesDefeated: 0,
  depth: 0, // How far player has progressed
  maxDepth: 0, // Best run tracker
  savedState: null, // Store area state before entering dungeon
  currentTier: 1, // Which enemy tier is currently active
  DUNGEON_MAX_TIME: 7, // 7 second timer
  REFILL_AMOUNT: 7, // Refill full timer on kill
  enemiesSinceLastDepth: 0,
  depthKillRequirement: 10 // starting requirement
};

// Get current dungeon name based on depth
export function getDungeonName(depth) {
  // Find the highest dungeon name threshold at or below current depth
  const thresholds = Object.keys(DUNGEON_NAMES).map(Number).sort((a, b) => b - a);
  for (const threshold of thresholds) {
    if (depth >= threshold) {
      return DUNGEON_NAMES[threshold];
    }
  }
  return DUNGEON_NAMES[1]; // Default to first dungeon
}

// Utility: choose random prefix based on depth
function getRandomPrefix(depth) {
  const heroLevel = partyState.heroLevel;
  const unlocked = prefixes.filter(p => heroLevel >= p.unlocks);
  return unlocked.length > 0 ? unlocked[Math.floor(Math.random() * unlocked.length)].prefix : "";
}

// Utility: Get available enemy pool based on depth
function getEnemyPool(depth) {
  let pool = [];
  
  // Unlock tiers progressively based on depth
  if (depth < 10) {
    pool = [...DUNGEON_ENEMY_TIERS[1]];
  } else if (depth < 25) {
    pool = [...DUNGEON_ENEMY_TIERS[1], ...DUNGEON_ENEMY_TIERS[2]];
  } else if (depth < 50) {
    pool = [...DUNGEON_ENEMY_TIERS[2], ...DUNGEON_ENEMY_TIERS[3]];
  } else if (depth < 100) {
    pool = [...DUNGEON_ENEMY_TIERS[3], ...DUNGEON_ENEMY_TIERS[4]];
  } else {
    pool = [...DUNGEON_ENEMY_TIERS[4], ...DUNGEON_ENEMY_TIERS[5]];
  }
  
  return pool;
}

// Calculate enemy wave level based on depth
function getDungeonEnemyLevel(depth) {
  // Start at player's current wave, scale up with depth
  return state.currentWave + Math.floor(depth / 5);
}

// Initialize dungeon mode
export function initDungeonMode() {
  // Listen for enemy defeats in dungeon mode
  on("enemyDefeated", ({ enemy }) => {
    if (!dungeonState.active) return;
      
    dungeonState.enemiesDefeated++;
    dungeonState.enemiesSinceLastDepth++;

    // Check if player has met the kill requirement to advance depth
    if (dungeonState.enemiesSinceLastDepth >= dungeonState.depthKillRequirement) {
      dungeonState.enemiesSinceLastDepth = 0;
      dungeonState.depth++;
      checkMilestoneRewards(dungeonState.depth);

      // Gradually increase requirement to simulate larger dungeons
      //dungeonState.depthKillRequirement = Math.ceil(dungeonState.depthKillRequirement * 1.03);
      // Diablo-rift-like dungeon growth
      /*
      if (dungeonState.depth % 5 === 0) {
        dungeonState.depthKillRequirement += 5;
      }
      */
      // or use: +1, +2 occasionally, etc.

      // Update max depth
      if (dungeonState.depth > dungeonState.maxDepth) {
        dungeonState.maxDepth = dungeonState.depth;
      }

      emit("dungeonDepthUp", { depth: dungeonState.depth });
    }

    // Refill timer on kill
    addWaveTime(dungeonState.REFILL_AMOUNT);

    // Reinforcements
    handleDungeonReinforcements();

    updateAreaPanel();
    updateEnemiesGrid();
    emit("dungeonEnemyDefeated", { depth: dungeonState.depth, enemy });
  });

  
  // Handle dungeon timeout
  on("waveTimedOut", () => {
    if (dungeonState.active) {
      endDungeonMode();
    }
  });
  
  console.log("Dungeon Mode initialized");
}

// Handle enemy reinforcements - enemies step forward, new spawns in back
function handleDungeonReinforcements() {
  // Step 1: Shift all enemies forward (toward row 2)
  for (let col = 0; col < 3; col++) {
    // Shift from front to back
    for (let row = 2; row > 0; row--) {
      if (state.enemies[row][col] === null && state.enemies[row - 1][col] !== null) {
        // Move enemy forward
        state.enemies[row][col] = state.enemies[row - 1][col];
        state.enemies[row][col].position = { row, col };
        state.enemies[row - 1][col] = null;
      }
    }
  }
  
  // Step 2: Count empty slots in back row (row 0)
  const emptyBackSlots = [];
  for (let col = 0; col < 3; col++) {
    if (state.enemies[0][col] === null) {
      emptyBackSlots.push(col);
    }
  }
  
  // Step 3: Spawn new enemies in empty back row slots
  emptyBackSlots.forEach(col => {
    spawnDungeonEnemy(0, col);
  });
}

// Start dungeon mode
export function startDungeonMode() {
  if (dungeonState.active) {
    console.warn("Dungeon mode already active!");
    return false;
  }
  
  // Save current game state
  dungeonState.savedState = {
    currentArea: state.currentArea,
    areaWave: state.areaWave,
    currentWave: state.currentWave,
    baseLevel: state.baseLevel,
    enemies: JSON.parse(JSON.stringify(state.enemies)) // Deep copy
  };
  
  // Reset dungeon stats
  dungeonState.active = true;
  dungeonState.enemiesDefeated = 0;
  //dungeonState.depth = 0;
  //dungeonState.currentTier = 1;
  
  // Clear existing enemies
  state.enemies = [
    [null, null, null],
    [null, null, null],
    [null, null, null]
  ];
  
  // Spawn initial dungeon grid (9 enemies)
  spawnInitialDungeonWave();

  // Start dungeon timer (will use modified max time)
  stopAutoAttack();
  startWaveTimer();
  startAutoAttack();
  setTarget(2, 0);

  // Immediately update area panel to dungeon mode
  renderAreaPanel();

  emit("dungeonModeStarted");
  console.log("🏰 Dungeon Mode Started!");

  return true;
}

// Spawn initial 3x3 grid of dungeon enemies
function spawnInitialDungeonWave() {
  const enemyPool = getEnemyPool(dungeonState.depth);
  const enemyLevel = getDungeonEnemyLevel(dungeonState.depth);
  
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      spawnDungeonEnemy(row, col);
    }
  }
  
  emit("waveStarted", state.areaWave);
}

// Spawn a single dungeon enemy at specific position
function spawnDungeonEnemy(row, col) {
  const enemyPool = getEnemyPool(dungeonState.depth);
  const enemyLevel = getDungeonEnemyLevel(dungeonState.depth);
  
  // Pick random enemy from pool
  const enemyId = enemyPool[Math.floor(Math.random() * enemyPool.length)];
  
  // Create enemy with dungeon scaling
  const enemy = createEnemy(enemyId, enemyLevel, false);
  
  if (!enemy) {
    console.warn(`Failed to create dungeon enemy: ${enemyId}`);
    return;
  }
  
  // Assign position
  enemy.position = { row, col };
  
  // Mark as dungeon enemy (optional, for special behavior)
  enemy.isDungeonEnemy = true;
  
  // Get current dungeon name
  const dungeonName = getDungeonName(dungeonState.depth);
  
  // Add dungeon name to enemy name (instead of depth)
  enemy.name = `[${dungeonName}] ${enemy.name}`;
  
  // Place enemy
  state.enemies[row][col] = enemy;
  
  emit("dungeonEnemySpawned", { row, col, enemy });
}

// End dungeon mode and return to saved state
export function endDungeonMode() {
  if (!dungeonState.active) return;

  stopAutoAttack();
  stopWaveTimer();

  const finalDepth = dungeonState.depth;
  const enemiesDefeated = dungeonState.enemiesDefeated;

  // Calculate rewards
  const rewards = calculateDungeonRewards(finalDepth, enemiesDefeated);

  // Restore saved state
  if (dungeonState.savedState) {
    state.currentArea = dungeonState.savedState.currentArea;
    state.areaWave = dungeonState.savedState.areaWave;
    state.currentWave = dungeonState.savedState.currentWave;
    state.baseLevel = dungeonState.savedState.baseLevel;
  }

  // Clear dungeon enemies
  state.enemies = [
    [null, null, null],
    [null, null, null],
    [null, null, null]
  ];

  // Deactivate dungeon mode before rendering the area panel
  dungeonState.active = false;

  // Set dungeonExited flag to force re-rendering
  state.dungeonExited = true;

  // Immediately update area panel to normal mode
  renderAreaPanel();

  // Award rewards
  applyDungeonRewards(rewards);

  // Spawn normal wave
  emit("dungeonModeEnded", { 
    finalDepth, 
    enemiesDefeated,
    rewards 
  });
  // Restart area wave after short delay
  setTimeout(() => {
    emit("areaReset");
    startAutoAttack();
  }, 2000);

  console.log(`🏰 Dungeon Mode Ended! Depth: ${finalDepth}, Enemies: ${enemiesDefeated}`);
}

// Calculate rewards based on performance
function calculateDungeonRewards(depth, enemiesDefeated) {
  const baseGoldPerEnemy = 100;
  const depthBonus = depth * 50;
  const streakBonus = Math.floor(enemiesDefeated / 10) * 200; // Bonus every 10 kills
  
  const totalGold = (enemiesDefeated * baseGoldPerEnemy) + depthBonus + streakBonus;
  
  // Future: Add more reward types
  const dungeonEssence = Math.floor(enemiesDefeated / 5); // 1 essence per 5 enemies
  return {
    gold: totalGold,
    gems: Math.floor(depth / 10), // 1 gem per 10 depth
    exp: enemiesDefeated * 5,
    essence: dungeonEssence
  };
}

// Apply calculated rewards to player
function applyDungeonRewards(rewards) {
  if (rewards.gold > 0) {
    state.resources.gold += rewards.gold;
    emit("goldChanged", state.resources.gold);
  }
  
  if (rewards.gems > 0) {
    state.resources.gems += rewards.gems;
    emit("gemsChanged", state.resources.gems);
  }
  
  // Future: Add XP system
  if (rewards.exp > 0) {
    addHeroExp(rewards.exp);
    emit("heroExpChanged", partyState.heroExp);
  }
  if (rewards.essence > 0) {
    state.resources.dungeonEssence = (state.resources.dungeonEssence || 0) + rewards.essence;
    emit("dungeonEssenceChanged", state.resources.dungeonEssence);
  }
  
  
  console.log("💰 Dungeon Rewards:", rewards);
}

// Get current dungeon stats for UI
export function getDungeonStats() {
  return {
    active: dungeonState.active,
    depth: dungeonState.depth,
    maxDepth: dungeonState.maxDepth,
    enemiesDefeated: dungeonState.enemiesDefeated,
    currentTier: dungeonState.currentTier,
    currentDungeonName: getDungeonName(dungeonState.depth)
  };
}

// Export for easy testing
window.startDungeonMode = startDungeonMode;
window.endDungeonMode = endDungeonMode;
window.getDungeonStats = getDungeonStats;
window.getDungeonName = getDungeonName;