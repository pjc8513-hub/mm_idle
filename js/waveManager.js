// waveManager.js - Centralized wave management
import { state, partyState, spellHandState } from "./state.js";
import { getBuildingLevel } from "./town.js";
import { heroSpells } from "./content/heroSpells.js";
import { emit, on } from "./events.js";
import { tryDropCrystal } from "./incomeSystem.js";
import { abilities } from "./content/abilities.js";
import { AREA_TEMPLATES } from "./content/areaDefs.js";
import { ENEMY_TEMPLATES } from "./content/enemyDefs.js";
import { getBonusGoldMultiplier, renderAreaPanel, updateEnemiesGrid } from "./area.js";
import { prefixes } from "./content/definitions.js";
import { stopAutoAttack, startAutoAttack, setTarget } from "./systems/combatSystem.js";
import { applyAreaBackground } from "./ui.js";
import { updateSpellDock } from "./systems/dockManager.js";
import { floatingTextManager } from "./systems/floatingtext.js";

// waveManager.js
const SCALING = {
  baseHP: 1000,
  r: 1.035,
  zone_length: 10,
  zone_multiplier: 1.5,
  boss_base_multiplier: 12,
  spike_set: [30, 50, 70, 90, 120, 150, 170, 200, 220, 240, 260, 280, 300],
  spike_factor: 3,

  // --- Quantum Scaling Parameters ---
  poly_r2: 2.0, // R2: The Polynomial Acceleration Factor (Dimension Multiplier)
  poly_s: 25, // S: The Scale Divisor (System Entropy)

  // Type-specific adjustments for R2 (The higher the value, the higher the HP)
  type_r2_adjustments: {
    pest: -0.2, // Lower HP
    undead: -0.1, // Slightly Lower HP
    humanoid: 0.1, // Slightly Higher HP
    demon: 0.3, // Higher HP
    beast: 0.0, // Normal
    elemental: 0.2, // Higher HP
    construct: 0.4, // Much Higher HP
    dragon: 0.5  // Highest HP
  },
};

// Utility: choose a random element from an array
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Utility: pick a prefix based on heroLevel
function getRandomPrefix(heroLevel) {
  const unlocked = prefixes.filter(p => heroLevel >= p.unlocks);
  return unlocked.length > 0 ? randomChoice(unlocked).prefix : "";
}
/*
  // Enemy type flavor multipliers (keep your chart!)
  const typeMult = {
    pest: 0.9,
    undead: 0.95,
    humanoid: 1.05,
    demon: 1.15,
    beast: 1.0,
    elemental: 1.1,
    construct: 1.2,
    dragon: 1.3,
  }[enemyType] || 1.0;
  */
// waveManager.js

// NOTE: We need to update this function signature to accept the enemy type
function getEnemyHP(wave, enemyType, isBoss = false) {

    const W = Math.max(1, wave);

    let hp = SCALING.baseHP;

    // Core exponential ramp
    hp *= Math.pow(SCALING.r, W);

    // Zone tiers (mild)
    const zoneBoost = Math.floor((W - 1) / SCALING.zone_length);
    hp *= Math.pow(SCALING.zone_multiplier, zoneBoost);

    // Permanent spike tiers
    const spikeCount = SCALING.spike_set.filter(s => W >= s).length;
    hp *= Math.pow(SCALING.spike_factor, spikeCount);

    // Polynomial late-game scaling
    hp *= 1 + Math.pow(W, SCALING.poly_r2) / SCALING.poly_s;

    // Enemy type
    const typeMult = SCALING.type_r2_adjustments[enemyType] || 1;
    hp *= 1 + typeMult; // convert adjustment into multiplier

    // Boss scaling
    if (isBoss) {
        hp *= SCALING.boss_base_multiplier * (1 + zoneBoost * 0.05);
    }

    return Math.floor(hp);
}



export function initWaveManager() {
  // Listen for wave-related events
  on("waveCleared", handleWaveCleared);
  on("waveTimedOut", handleWaveTimeout);
  on("areaCompleted", handleAreaChanged);
  on("gameStarted", handleGameStart);
}

// waveManager.js
on("enemyDefeated", ({ enemy }) => {
  updateEnemiesGrid();
  // drop logic
  tryDropCrystal(enemy);
  // Check if all enemies in this column are cleared
  const col = enemy.position.col;
  const columnCleared = state.enemies.every(row => !row[col] || row[col].hp <= 0);
  
  if (columnCleared) {
    console.log(`[waveManager] Column ${col} cleared.`);
    const cleric = partyState.party.find(c => c.id === "cleric");
    if (cleric){
      const heal = abilities.find(a => a.id === "heal");
      if (heal && !heal.triggeredThisWave) {
        heal.triggerOnColumnClear({ col });
      }
    }
  }

  /*
  spellHandState.counter += 1;
  // Draw a new spell every 3 defeated enemies
  if (spellHandState.counter < 3) return;
  spellHandState.counter = 0;
    // Don’t overfill the hand
  if (spellHandState.hand.length >= spellHandState.maxHandSize) return;

  const libraryLevel = getBuildingLevel("library");
  const unlockedSpells = heroSpells.filter(spell => 
    (spell.tier || 1) <= libraryLevel && spell.id !== 'rage'
  );

  if (unlockedSpells.length === 0) return;
  // --- Weighted tiers ---
  const tierWeights = {
    1: 60,
    2: 25,
    3: 10,
    4: 5,
  };
  // Normalize weights for currently unlocked tiers only
  const availableWeights = unlockedSpells.map(spell => tierWeights[spell.tier] || 1);
  const totalWeight = availableWeights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;

    let selectedSpell = null;
  for (let i = 0; i < unlockedSpells.length; i++) {
    roll -= availableWeights[i];
    if (roll <= 0) {
      selectedSpell = unlockedSpells[i];
      break;
    }
  }

  if (!selectedSpell) selectedSpell = unlockedSpells[0]; // fallback safety

  spellHandState.hand.push(selectedSpell.id);
  console.log(`💧 Dropped spell: ${selectedSpell.name} (Tier ${selectedSpell.tier}) from ${enemy.name}`);

  emit("spellHandUpdated");
  updateSpellDock();
  */
});

on("waveStarted", () => {
  const heal = abilities.find(a => a.id === "heal");
  if (heal) heal.triggeredThisWave = false;
  const rage = state.activeHeroSpells.find(c => c.id === "rage");
  const rageSkill = heroSpells.find(s => s.id === "rage");
  if (rage && rageSkill) rageSkill.cleanup();
  const warlock = partyState.party.find(c=> c.id ==="warlock");
  if (warlock) {
    const summonLesserDevil = abilities.find(a => a.id ==="summonLesserDevil");
    if (summonLesserDevil) summonLesserDevil.activate();
  }
});

// NEW: Listen for ANY heal event and trigger cleric's damage
on("healTriggered", (healEvent) => {
  const cleric = partyState.party.find(c => c.id === "cleric");
  if (!cleric) return;
  
  const heal = abilities.find(a => a.id === "heal");
  if (heal && heal.triggerOnHeal) {
    heal.triggerOnHeal(healEvent);
  }
  const templar = partyState.party.find(c => c.id === "templar");
  if (!templar) return;
  const blindingLight = abilities.find(a => a.id === "blindingLight");
  if (blindingLight && blindingLight.triggerOnHeal) {
    blindingLight.triggerOnHeal(healEvent);
  }
});

export function handleGameStart() {
  // Start the first wave when game begins
  if (state.currentArea && state.currentWave === 1) {
    startWave();
  }
}

export async function handleAreaChanged(newAreaId) {
  // When switching areas, reset to wave 1 and start
  state.areaWave = 1;
  state.currentArea = newAreaId;
  await preloadAreaEnemies(state.currentArea);
  /*
  if (state.activePanel === "panelArea"){
        const area = AREA_TEMPLATES[state.currentArea];
        const gameEl = document.getElementById("game");
        const resourceBarEl = document.getElementById("resourceBar");
        const sidePanelEl = document.getElementById("sidePanel");    
        removeBackgroundElement("game");
        gameEl.style.backgroundImage = `url('../assets/images/${area.backgroundImg}')`;
        removeBackgroundElement("resourceBar");
        resourceBarEl.style.backgroundImage = `url('../assets/images/${area.topImg}')`;
        removeBackgroundElement("sidePanel");
        sidePanelEl.style.backgroundImage = `url('../assets/images/${area.sideImg}')`;
        gameEl.classList.add("area-bg");
        resourceBarEl.classList.add("area-bg");
        sidePanelEl.classList.add("area-bg");
  }
        */
  console.log("changing background");
  applyAreaBackground(AREA_TEMPLATES[state.currentArea]);
  state.newArea = true;
  renderAreaPanel(); 
  //emit("areaChanged", newAreaId);
  state.newArea = false;
  startWave();
}

export function handleWaveCleared() {
  const currentArea = AREA_TEMPLATES[state.currentArea];
  if (!currentArea) return;
  stopAutoAttack();
  if (!state.activeWave) return;
  state.activeWave = false;
  state.alreadySpawned = false;
  // Calculate bonus gold based on time remaining
  const bonusMultiplier = getBonusGoldMultiplier(); // From area.js
  const bonusGold = Math.floor(50 * bonusMultiplier * state.areaWave);
  state.resources.gold += bonusGold;
  
  // console.log(`Wave ${state.currentWave} cleared! Bonus: ${bonusGold} gold`);

  state.currentWave++;
  // Check if this was the final wave (boss wave)
  if (state.areaWave >= currentArea.maxWaves) {
    handleAreaCompleted();
  } else {
    // Advance to next wave
    //state.currentWave++;
    state.areaWave++;
    setTimeout(() => {
      
      startWave();
    }, 2000); // 2 second delay between waves
  }
}

export function handleWaveTimeout() {
  if (!state.activeWave) return;
  state.activeWave = false;
  state.alreadySpawned = false;
  // console.log("Wave timed out! Restarting area...");
  stopAutoAttack();
  // Reset to wave 1
  state.areaWave = 1;
  
  // Small delay then restart
  setTimeout(() => {
    
    startWave();
  }, 1500);
  
  //emit("areaReset");
}

export function handleAreaCompleted() {
  const currentArea = AREA_TEMPLATES[state.currentArea];
  const canvas = document.getElementById("enemyEffectsCanvas");

  if (canvas) {
    floatingTextManager.showAchievement("AREA COMPLETE!");
  }
  // console.log(`Area ${currentArea.name} completed!`);

    emit("areaCompleted", {
    areaId: state.currentArea,
    quest: { id: currentArea.questId }
  });
  state.baseLevel += 10; // raise the base level by 10
    
  // unlock next area or loop back to beginning
  if (currentArea.nextArea) {
    state.currentArea = currentArea.nextArea;
  } else {
    // loop back to the beginning and increase difficulty
    state.currentArea = "newSorpigal";
  }
  
  // go to the next area
  state.areaWave = 1;
  setTimeout(() => {
    startWave();
  }, 3000); // Longer delay after area completion
}

export function startWave() {
  if (state.alreadySpawned) return;
  state.alreadySpawned = true;
  // console.log(`Starting wave ${state.areaWave} in ${state.currentArea}`);
  
  // Clear existing enemies
  state.enemies = [
    [null, null, null],
    [null, null, null], 
    [null, null, null]
  ];
  
  // Spawn new wave
  spawnWave();
  
  // Emit wave started event (this triggers timer)
  emit("waveStarted", state.areaWave);
  setTarget(2, 0);
  startAutoAttack();
  state.activeWave = true;
}

export function spawnWave() {
  const currentArea = AREA_TEMPLATES[state.currentArea];
  if (!currentArea) return;
  
  const isLastWave = state.areaWave >= currentArea.maxWaves;
  const enemiesToSpawn = [];
  
  if (isLastWave) {
    // Keep track of positions already reserved in this spawn
    const reservedPositions = new Set();
    reservedPositions.add("1,1"); // Reserve center for boss
    // Boss wave - spawn boss in center, maybe some minions
    const boss = createEnemy(currentArea.boss, state.currentWave, true);
    enemiesToSpawn.push({ enemy: boss, row: 1, col: 1 }); // Center position
    
    // Add some minions around boss
    const minionCount = Math.min(3, currentArea.enemies.length);
    for (let i = 0; i < minionCount; i++) {
      const minionType = currentArea.enemies[Math.floor(Math.random() * currentArea.enemies.length)];
      const minion = createEnemy(minionType, state.currentWave);
      
      // Place minions in random positions (not center)
      let row, col;
      do {
        row = Math.floor(Math.random() * 3);
        col = Math.floor(Math.random() * 3);
      } while (state.enemies[row][col] !== null || reservedPositions.has(`${row},${col}`));
    
      reservedPositions.add(`${row},${col}`);  
      enemiesToSpawn.push({ enemy: minion, row, col });
    }
  } else {
    // Normal wave - always spawn 9 enemies
    const enemyCount = 9;
    
    // Keep track of positions already reserved in this spawn
    const reservedPositions = new Set();
    
    for (let i = 0; i < enemyCount; i++) {
      const enemyType = currentArea.enemies[Math.floor(Math.random() * currentArea.enemies.length)];
      const enemy = createEnemy(enemyType, state.currentWave);
      
      // Find random empty position that's not reserved
      let row, col;
      do {
        row = Math.floor(Math.random() * 3);
        col = Math.floor(Math.random() * 3);
        const posKey = `${row},${col}`;
      } while (state.enemies[row][col] !== null || reservedPositions.has(`${row},${col}`));
      
      // Mark this position as reserved
      reservedPositions.add(`${row},${col}`);
      enemiesToSpawn.push({ enemy, row, col });
    }
  }
  
  // Place all enemies
  enemiesToSpawn.forEach(({ enemy, row, col }) => {
    // ✅ Assign position to the enemy object
    enemy.position = { row, col };

    state.enemies[row][col] = enemy;
    // console.log(`Placed enemy ${enemy.name} (Lvl ${enemy.level}) at [${row}, ${col}]`);
  });
  
  // console.log(`Spawned ${enemiesToSpawn.length} enemies for wave ${state.currentWave}`);
  //emit("waveStarted"); don't do this twice :(
}

let enemyCounter = 0;
function generateUniqueEnemyId(enemyId) {
  return `${enemyId}-${enemyCounter++}`;
}

export function createEnemy(enemyId, wave, isBoss = false) {
  const template = ENEMY_TEMPLATES[enemyId];
  if (!template) return null;

  //const { heroLevel, currentArea } = state;
  const heroLevel = partyState.heroLevel;
  const currentArea = state.currentArea;

  // 1. Get HP and Attack scaling
  const hp = getEnemyHP(wave, template.type, isBoss);

  // Attack could scale similarly (simple version for now)
  const attack = Math.floor(
    (template.baseAttack || 5) 
    * Math.pow(SCALING.r, wave - 1) 
    * Math.pow(SCALING.zone_multiplier, Math.floor((wave - 1) / SCALING.zone_length))
    * (isBoss ? 2 : 1) // bosses hit harder
  );

  // 2. Assign prefix
  const prefix = getRandomPrefix(heroLevel);
  const name = prefix ? `${prefix} ${template.baseName}` : template.baseName;
  
  // 3. Build final enemy object
  return {
    id: enemyId,
    uniqueId: generateUniqueEnemyId(enemyId),
    name,
    prefix,
    level: state.currentWave, // or scale by wave if you want
    hp,
    maxHp: hp,
    attack,
    statusEffects: [],
    justDamaged: false,
    row: template.row,
    type: template.type,
    counters: {}, // map: type, value
    DOT: [], // map: type, value
    elementType: template.elementType,
    strobeEffect: null, // { duration: 0.4, elapsed: 0 }
    resistances: { ...template.resistances },
    weaknesses: { ...template.weaknesses },
    specialAbilities: template.specialAbilities ? [...template.specialAbilities] : [],
    image: template.image || "../../assets/images/enemies/goblin.webp",
    isBoss
  };
}

// Utility function to check if wave is cleared
export function checkWaveCleared() {
  const hasEnemies = state.enemies.some(row => 
    row.some(enemy => enemy !== null && enemy.hp > 0)
  );
  
  if (!hasEnemies) {
    emit("waveCleared");
    return true;
  }
  return false;
}

// Export for use in combat/damage systems
export function damageEnemy(enemy, damageObject, element) {
  //console.log(damageObject);
  //let damageCap = partyState.heroLevel * 1000;
  //if (damageObject.isCritical) damageCap = partyState.heroLevel * 10000;
  let damage = damageObject.damage;
  //console.log(damage);
  
  //const enemy = state.enemies[row][col];
  if (!enemy || enemy.hp <= 0) return false;
  const applyDmg = Math.round(damage * (1 + (partyState.heroBonuses.allDamage || 0)));
  //console.log(`Damaging ${enemy.name} for ${applyDmg} (${damage} base, +${(partyState.heroBonuses.allDamage || 0)*100}% bonus)`);
  enemy.hp = Math.max(0, enemy.hp - applyDmg);
  
  // Check for NaN and log details
  if (isNaN(applyDmg)) {
    console.error("[NaN DETECTED] applyDmg is NaN!", {
      enemy,
      damage,
      element,
      stack: new Error().stack
    });
    // Optionally, you can force it to 0 to prevent crashing
    //return false;
  }
  
  
  enemy.justDamaged = true;
  

  emit("enemyDamaged", enemy);
  
  // Check if enemy died
  if (enemy.hp <= 0) {
    //state.enemies[row][col] = null; // Remove enemy from grid
    emit("enemyDefeated", {
      enemy: enemy,
      wave: state.currentWave
    });
  } else {
    //console.log(`Damaged ${enemy.name} for ${applyDmg}. Remaining HP: ${enemy.hp}. Current counters: ${enemy.counters[element]}`);
    //console.log(enemy);
    enemy.counters[element] = (enemy.counters[element] || 0) + 1;
  }
    // Small delay then check if wave is cleared
    setTimeout(() => {
      checkWaveCleared();
    }, 100);
  
  return true;
}

const areaAssets = {
  newSorpigal: ["swarm.webp", "mage.webp", "dragonFly.webp", "bandit.webp", "main.webp", "area-side.webp", "area-top.webp"],
  mistyIslands: ["goblinKing.webp", "goblin.webp", "skeletonArcher.webp", "mage.webp", "bandit.webp", "misty-bg.webp", "misty-side.webp", "misty-top.webp"],
  bootlegBay: ["seaTerror.webp", "deathKnight.webp", "willow.webp", "pirateRaider.webp", "giantRat.webp", "misty-bg.webp", "misty-side.webp", "misty-top.webp"],
  castleIronfist: ["thief.webp", "masterArcher.webp", "goblin.webp", "bandit.webp", "lich.webp", "cobra.webp", "main.webp", "area-side.webp", "area-top.webp"],
  mireOfTheDamned: ["spider.webp", "skeletonArcher.webp", "harpy.webp", "willow.webp", "spectre.webp", "snergle.webp"],
  freeHaven: ["lich.webp", "royalGriffin.webp", "medusa.webp", "emeraldOoze.webp"],
  eelInfestedWaters:["frostDrake.webp", "waterSpirit.webp", "seaTerror.webp", "hydra.webp"],
  silverCove:["warlock.webp", "earthElemental.webp", "chimera.webp", "diamondGargoyle.webp"],
  frozenHighlands:["deathKnight.webp", "frostDrake.webp", "chimera.webp", "ogre.webp", "harpy.webp"],
  blackshire:["werewolf.webp", "goldDragon.webp", "mage.webp", "willow.webp"],
  kriegspire:["basilisk.webp", "flyingEye.webp", "minotaur.webp", "devilSpawn.webp", "earthElemental"],
  paradiseValley:["titan.webp", "angel.webp", "hydra.webp", "spectre.webp"],
  hermitIsle:["seaTerror.webp", "waterSpirit.webp", "lich.webp", "mage.webp"],
  dragonSand:["goldDragon.webp", "frostDrake.webp", "titan.webp"],
  sweetWater:["angel.webp", "demonQueen.webp", "devilSpawn.webp", "flyingEye.webp"],
  // ...
};

function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = resolve;
    img.onerror = reject;
    img.src = src;
  });
}

export async function preloadAreaEnemies(areaName) {
  const images = areaAssets[areaName];
  if (!images) return;
  
  const basePath = "assets/enemies/";
  await Promise.all(images.map(img => preloadImage(basePath + img)));
  console.log(`[Preload] Loaded ${images.length} enemy sprites for ${areaName}`);
}
