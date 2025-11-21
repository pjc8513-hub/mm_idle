import { state, partyState } from "../state.js";
import { abilities } from "../content/abilities.js";
import { damageEnemy } from "../waveManager.js";
import { floatingTextManager } from "./floatingtext.js";
import { renderAreaPanel } from "../area.js";
import { dungeonState } from "../dungeonMode.js";

// DOT Configuration
const DOT_TICK_INTERVAL = 1.0; // Apply DOT damage every 1 second
const DOT_BASE_DURATION = 6.0; // Base DOT duration in seconds

// Track DOT timers for each enemy
const dotTimers = new Map(); // key: "row-col", value: { accumulator: number }

/**
 * Initialize DOT data structure on enemy if it doesn't exist
 * Expected format: enemy.DOT = [["poison", damagePerTick, duration, elapsed], ...]
 */
function initializeEnemyDOT(enemy) {
  // Force DOT to be an array, even if it was initialized elsewhere
  if (!enemy.DOT || !Array.isArray(enemy.DOT)) {
    enemy.DOT = [];
  }
}

/**
 * Calculate DOT bonus from attacker's passives
 * Returns: { durationBonus: number, damageMultiplier: number }
 */
function calculateDOTBonuses(attacker, dotType) {
  let durationBonus = 0;
  let damageMultiplier = 1.0;
  
  if (!attacker.skills) return { durationBonus, damageMultiplier };
  
  // Check all passive skills
  for (const skillId in attacker.skills) {
    const skillDef = abilities.find(a => a.id === skillId);
    if (!skillDef || skillDef.type !== "passive") continue;
    
    // Example: Necromancer passive that extends poison duration
    if (skillDef.dotDurationBonus && skillDef.affectedDotTypes?.includes(dotType)) {
      durationBonus += skillDef.dotDurationBonus;
    }
    
    // Example: Passive that increases DOT damage
    if (skillDef.dotDamageMultiplier && skillDef.affectedDotTypes?.includes(dotType)) {
      damageMultiplier *= skillDef.dotDamageMultiplier;
    }
  }
  
  return { durationBonus, damageMultiplier };
}

/**
 * Process all DOTs in the game loop
 * Call this from your update() function
 */
export function updateDOTs(delta) {
  let hasActiveDOTs = false;
  
  for (let row = 0; row < state.enemies.length; row++) {
    for (let col = 0; col < state.enemies[row].length; col++) {
      const enemy = state.enemies[row][col];
      
      if (!enemy || enemy.hp <= 0) {
        // Clean up timer for dead/missing enemies
        dotTimers.delete(`${row}-${col}`);
        continue;
      }
      
      initializeEnemyDOT(enemy);
      
      if (enemy.DOT.length === 0) continue;
      
      // Mark that we have at least one active DOT
      hasActiveDOTs = true;
      
      // Get or create timer for this enemy
      const timerKey = `${row}-${col}`;
      if (!dotTimers.has(timerKey)) {
        dotTimers.set(timerKey, { accumulator: 0 });
      }
      
      const timer = dotTimers.get(timerKey);
      timer.accumulator += delta;
      
      // Check if it's time to apply DOT damage
      if (timer.accumulator >= DOT_TICK_INTERVAL) {
        timer.accumulator -= DOT_TICK_INTERVAL;
        applyDOTDamage(enemy, row, col, DOT_TICK_INTERVAL);
      }
    }
  }
  
  // Update the party state flag
  
    //console.log("[DOT] hasActiveDOTs:", hasActiveDOTs);
    partyState.hasActiveDOTs = hasActiveDOTs;
  
}

/**
 * Apply DOT damage to an enemy
 */
function applyDOTDamage(enemy, row, col, deltaTime) {
  const dotsToRemove = [];
  
  enemy.DOT.forEach((dot, index) => {
    const [type, damagePerTick, duration, elapsed = 0] = dot;
  //  console.log(`[DOT] damagePerTick: ${damagePerTick},
  //      duration: ${duration}, elapsed: ${elapsed}`);  
    // Apply the damage
  const damageObject = {
    damage: damagePerTick * DOT_TICK_INTERVAL,
    isCritical: false,
    resonance: null,
    multiplier: 0,
    elementalMatchup: null
  };
    damageEnemy(enemy, damageObject, type);
    if (!dungeonState.active && enemy.hp <= 0) {
      renderAreaPanel();
    }
    // Update elapsed time
    const newElapsed = elapsed + DOT_TICK_INTERVAL;
    dot[3] = newElapsed;
    
    // Mark for removal if duration exceeded
    if (newElapsed >= duration) {
      dotsToRemove.push(index);
    }
    
    // Visual feedback
    const tickDamage = Math.round(damagePerTick * DOT_TICK_INTERVAL);
    floatingTextManager.addDOTText(row, col, tickDamage);
  });
  
  // Remove expired DOTs (in reverse order to maintain indices)
  for (let i = dotsToRemove.length - 1; i >= 0; i--) {
    enemy.DOT.splice(dotsToRemove[i], 1);
  }
}

/**
 * Add or refresh a DOT on an enemy
 * Call this from your skill's activate function
 * 
 * @param enemy - The enemy to apply DOT to
 * @param type - DOT type (e.g., "poison", "burn")
 * @param totalDamage - Total damage the skill would deal (can be number or damage object)
 * @param baseDuration - Base duration before passives
 * @param attacker - The character applying the DOT (for passive bonuses)
 */
export function applyDOT(enemy, type, totalDamage, baseDuration = DOT_BASE_DURATION, attacker = null) {
  initializeEnemyDOT(enemy);
  
  // Handle if totalDamage is an object from calculateSkillDamage
  const damageValue = typeof totalDamage === 'object' ? totalDamage.damage : totalDamage;
  
  // Calculate bonuses from attacker's passives
  const bonuses = attacker ? calculateDOTBonuses(attacker, type) : { durationBonus: 0, damageMultiplier: 1.0 };
  
  // Apply bonuses
  const finalDuration = baseDuration + bonuses.durationBonus;
  const damagePerSecond = (damageValue / baseDuration) * bonuses.damageMultiplier;
  
  // Find existing DOT of same type
  const existingDOT = enemy.DOT.find(dot => dot[0] === type);
  
  if (existingDOT) {
    // Refresh: add to damage per second (50% effectiveness) and reset duration
    existingDOT[1] += damagePerSecond * 0.5;
    existingDOT[2] = finalDuration; // Reset duration (with bonuses)
    existingDOT[3] = 0; // Reset elapsed time
  } else {
    // New DOT: [type, damagePerSecond, duration, elapsed]
    enemy.DOT.push([type, damagePerSecond, finalDuration, 0]);
    partyState.hasActiveDOTs = true;
  }
}