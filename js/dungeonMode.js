// dungeonMode.js - Dungeon Mode System
import { state, partyState } from "./state.js";
import { emit, on } from "./events.js";
import { ENEMY_TEMPLATES } from "./content/enemyDefs.js";
import { createEnemy } from "./waveManager.js";
import { stopAutoAttack, startAutoAttack, setTarget } from "./systems/combatSystem.js";
import { addWaveTime, stopWaveTimer, startWaveTimer, updateEnemiesGrid, updateAreaPanel } from "./area.js";
import { prefixes } from "./content/definitions.js";

// Dungeon enemy tiers - progressively unlock harder enemies
const DUNGEON_ENEMY_TIERS = {
  1: ["goblin", "bandit", "dragonFly", "skeletonArcher", "apprenticeMage"],
  2: ["ogre", "masterArcher", "druid", "waterSpirit", "evilSpirit", "pirateRaider", "giantRat"],
  3: ["cobra", "harpy", "spectre", "emeraldOoze", "medusa", "royalGriffin", "spider"],
  4: ["seaSerpent", "hydra", "diamondGargoyle", "earthElemental", "fireElemental", "abomination"],
  5: ["blueDragon", "werewolf", "thunderLizard", "minotaur", "giant", "flyingEye", "devilSpawn"]
};

export const dungeonState = {
  active: false,
  enemiesDefeated: 0,
  depth: 0, // How far player has progressed
  maxDepth: 0, // Best run tracker
  savedState: null, // Store area state before entering dungeon
  currentTier: 1, // Which enemy tier is currently active
  DUNGEON_MAX_TIME: 10, // 10 second timer
  REFILL_AMOUNT: 10 // Refill full timer on kill
};

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
    dungeonState.depth++;
    
    // Update max depth tracker
    if (dungeonState.depth > dungeonState.maxDepth) {
      dungeonState.maxDepth = dungeonState.depth;
    }
    
    // Refill timer on kill
    addWaveTime(dungeonState.REFILL_AMOUNT);
    
    // Spawn new enemy in the killed enemy's position
    const { row, col } = enemy.position;
    spawnDungeonEnemy(row, col);
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
  dungeonState.depth = 0;
  dungeonState.currentTier = 1;
  
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
  
  // Add depth indicator to name
  enemy.name = `[Depth ${dungeonState.depth}] ${enemy.name}`;
  
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
  
  // Award rewards
  applyDungeonRewards(rewards);
  
  // Deactivate dungeon mode
  dungeonState.active = false;
  
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
  return {
    gold: totalGold,
    gems: Math.floor(depth / 10), // 1 gem per 10 depth
    exp: enemiesDefeated * 5
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
  // if (rewards.exp > 0) { ... }
  
  console.log("💰 Dungeon Rewards:", rewards);
}

// Get current dungeon stats for UI
export function getDungeonStats() {
  return {
    active: dungeonState.active,
    depth: dungeonState.depth,
    maxDepth: dungeonState.maxDepth,
    enemiesDefeated: dungeonState.enemiesDefeated,
    currentTier: dungeonState.currentTier
  };
}

// Export for easy testing
window.startDungeonMode = startDungeonMode;
window.endDungeonMode = endDungeonMode;
window.getDungeonStats = getDungeonStats;