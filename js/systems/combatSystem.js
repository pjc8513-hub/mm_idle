/**
 * Combat System Module
 * Handles auto-attack cycles, targeting, and combat mechanics
 * Follows separation of UI and game logic principles
 */

import { state, partyState } from '../state.js';
//import { calculatePercentage } from '../systems/math.js';
import { emit, on } from '../events.js';
import { damageEnemy, checkWaveCleared } from '../waveManager.js';
import { incomeSystem } from "../incomeSystem.js";
import { logMessage } from './log.js';
import { abilities } from '../content/abilities.js';
import { getElementalMultiplier, getElementalMatchup } from './elementalSystem.js';
import { floatingTextManager } from './floatingtext.js';
import { getEnemyCanvasPosition } from "../area.js";
import { removeEnemyTooltipById } from "../tooltip.js";

// Combat configuration
const COMBAT_CONFIG = {
  BASE_ATTACK_INTERVAL: 3500, // Base attack interval in milliseconds
  CRITICAL_DAMAGE_MULTIPLIER: 2.0,
  DEFAULT_TARGET: { row: 2, col: 0 }, // Front row, leftmost position
  SPEED_SCALING_FACTOR: 1000, // How speed affects attack interval
};

// Combat state
const combatState = {
  isAutoAttacking: false,
  currentTarget: null,
  attackTimers: new Map(), // Map of party member ID to their attack timer
  lastAttackTime: 0,
};

/**
 * Initialize the combat system
 * Sets up event listeners and starts auto-attack if party exists
 */
export function initCombatSystem() {
  console.log('Combat system initializing...');
  
  // Listen for game events
  on('gameStarted', handleGameLoaded);
  on('partyChanged', handlePartyChanged);
  on('waveCleared', handleWaveCleared);
  on('enemyDefeated', handleEnemyDefeated);
  on('targetChanged', handleTargetChanged);
  on("skillReady", ({ member, skillId }) => {
    tryActivateSkill(member, skillId);
  });
  
  // Set initial target if enemies exist
  setInitialTarget();
  
  console.log('Combat system initialized');
}

/**
 * Start auto-attack for all party members
 */
export function startAutoAttack() {
  if (combatState.isAutoAttacking) return;

  combatState.isAutoAttacking = true;

  partyState.party.forEach(member => {
    if (member.stats.hp > 0) {
      member.attackCooldown = 0; // attack immediately
    }
  });

  emit('autoAttackStarted');
  //console.log('Auto-attack started');
}

/**
 * Stop auto-attack for all party members
 */
export function stopAutoAttack() {
  if (!combatState.isAutoAttacking) return;
  
  combatState.isAutoAttacking = false;
  
  emit('autoAttackStopped');
  //console.log('Auto-attack stopped');
}

/**
 * Toggle auto-attack state
 */
export function toggleAutoAttack() {
  if (combatState.isAutoAttacking) {
    stopAutoAttack();
  } else {
    startAutoAttack();
  }
}

/**
 * Helper to get enemies in a row
 * @param {*} row 
 * @returns 
 */
export function getEnemiesInRow(row) {
  return state.enemies[row].map((enemy, col) => ({ enemy, row, col }))
                          .filter(({ enemy }) => enemy && enemy.hp > 0);
}

/**
 * Helper to get the first row with living enemies and extra rows based on skill level
 * @param {number} skillLevel 
 * @returns {Array} Array of enemy objects with row and column positions
 */
export function getEnemiesBasedOnSkillLevel(skillLevel) {
  let rowsToGet;
  if (skillLevel < 20) rowsToGet = 1;
  else if (skillLevel < 50) rowsToGet = 2;
  else return getActiveEnemies(); // Full list for high levels

  let enemies = [];
  for (let i = 0; i < state.enemies.length && rowsToGet > 0; i++) {
    const rowEnemies = getEnemiesInRow(i);
    if (rowEnemies.length > 0) {
      enemies = enemies.concat(rowEnemies);
      rowsToGet--;
    }
  }

  // Unwrap the real enemy objects but preserve their position
  return enemies
    .map(e => e.enemy ? e.enemy : e)
    .filter(e => e && e.hp > 0);
}



/**
 * Helper to get adjacent (but not diagonal) enemies
 * @param {*} row 
 * @param {*} col 
 * @returns 
 */
export function getAdjacentEnemies(row, col) {
  const adjacentPositions = [
    { row: row - 1, col }, // above
    { row: row + 1, col }, // below
    { row, col: col - 1 }, // left
    { row, col: col + 1 }, // right
  ];

  return adjacentPositions.filter(({ row, col }) => row >= 0 && row < state.enemies.length && col >= 0 && col < state.enemies[0].length)
                          .map(({ row, col }) => ({ enemy: state.enemies[row][col], row, col }))
                          .filter(({ enemy }) => enemy && enemy.hp > 0);
}

/**
 * Returns a random adjacent enemy position
 * @param {*} row 
 * @param {*} col 
 * @returns 
 */
export function getRandomAdjacentEnemy(row, col) {
  const adjacentEnemies = getAdjacentEnemies(row, col);
  if (adjacentEnemies.length === 0) return null;
  return adjacentEnemies[Math.floor(Math.random() * adjacentEnemies.length)];
}

/**
 * Returns a random enemy from the entire grid along with its position
 * @returns {{ enemy: object, row: number, col: number } | null}
 */
export function getRandomEnemy() {
  // Flatten the grid to get all active enemies
  const enemies = state.enemies.flat().filter(enemy => enemy && enemy.hp > 0);
  if (enemies.length === 0) return null;

  // Select one randomly
  const randomEnemy = enemies[Math.floor(Math.random() * enemies.length)];

  // Find its row and column in the 2D grid
  let row = null;
  let col = null;

  for (let i = 0; i < state.enemies.length; i++) {
    const index = state.enemies[i].indexOf(randomEnemy);
    if (index !== -1) {
      row = i;
      col = index;
      break;
    }
  }

  // Return both the enemy and its position
  return { enemy: randomEnemy, row, col };
}

/**
 * 
 * @returns active enemies
 */
export function getActiveEnemies() {
  return state.enemies.flat().filter(enemy => enemy && enemy.hp > 0);
}


/**
 *  helper to get enemies in a column
 * @param {*} column 
 * @returns 
 */
export function getEnemiesInColumn(column) {
  return state.enemies.map((row, rowIndex) => ({ enemy: row[column], row: rowIndex, col: column }))
                     .filter(({ enemy }) => enemy && enemy.hp > 0);
}

/**
 * Set target enemy by grid position
 * @param {number} row - Target row (0-2)
 * @param {number} col - Target column (0-2)
 */
export function setTarget(row, col) {
  // Validate target position
  if (row < 0 || row > 2 || col < 0 || col > 2) {
    console.warn(`Invalid target position: ${row}, ${col}`);
    return false;
  }
  
  // Check if enemy exists at target position
  const targetEnemy = state.enemies[row][col];
  if (!targetEnemy || targetEnemy.hp <= 0) {
    console.warn(`No valid enemy at position: ${row}, ${col}`);
    return false;
  }
  
  const oldTarget = combatState.currentTarget;
  combatState.currentTarget = { row, col };
  
  emit('targetChanged', { 
    oldTarget, 
    newTarget: { row, col }, 
    enemy: targetEnemy 
  });
  
  // console.log(`Target set to enemy at position: ${row}, ${col}`);
  return true;
}

/**
 * Get current target information
 * @returns {Object|null} Current target with enemy data
 */
export function getCurrentTarget() {
  if (!combatState.currentTarget) return null;
  
  const { row, col } = combatState.currentTarget;
  const enemy = state.enemies[row][col];
  
  if (!enemy || enemy.hp <= 0) {
    return null;
  }
  
  return {
    position: { row, col },
    enemy: enemy
  };
}

/**
 * Find next available target (prioritizes front row, left to right)
 * @returns {Object|null} Next target position or null if no enemies
 */
export function findNextTarget() {
  // Search from front row (row 2) to back row (row 0)
  for (let row = 2; row >= 0; row--) {
    for (let col = 0; col < 3; col++) {
      const enemy = state.enemies[row][col];
      if (enemy && enemy.hp > 0) {
        return { row, col };
      }
    }
  }
  return null;
}

/**
 * Calculate attack interval for a party member based on speed
 * @param {Object} partyMember - Party member object
 * @returns {number} Attack interval in milliseconds
 */
export function calculateAttackInterval(partyMember) {
  const speed = partyMember.stats.speed || 1;
  return Math.max(500, COMBAT_CONFIG.BASE_ATTACK_INTERVAL - (speed * COMBAT_CONFIG.SPEED_SCALING_FACTOR));
}

// --- Level Difference Dampening ---
function getLevelDampening(attackerLevel, targetLevel) {
  const delta = targetLevel - attackerLevel; // positive = target stronger
  const k = 0.08;   // how punishing being underleveled is
  const k2 = 0.015; // how rewarding being overleveled is

  if (delta > 0) {
    // You are weaker → damage reduced
    return 1 / (1 + delta * k);
  } else if (delta < 0) {
    // You are stronger → mild damage bonus
    return 1 + (-delta * k2);
  } else {
    return 1; // same level
  }
}


/**
 * Calculate damage for an attack
 * @param {Object} attacker - Party member attacking
 * @param {Object} target - Enemy being attacked
 * @returns {Object} Damage calculation result
 */
function calculateDamage(attacker, target) {
  
  let baseDamage = attacker.stats.attack || 30;
  let isCritical = false;
  
  // Check for critical hit
  const critChance = attacker.stats.criticalChance || 0;
  if (Math.random() < critChance) {
    isCritical = true;
    const critBonus = partyState.heroBonuses.criticalDamage || 0;
    baseDamage *= COMBAT_CONFIG.CRITICAL_DAMAGE_MULTIPLIER * (1 + critBonus);
  }
  
  // convert damage to resonance element damage
  const resonance = attacker.resonance || 'physical';

  const elementConvert = partyState.elementalDmgModifiers[resonance] || 1;
  //console.log('elementConvert: ', elementConvert);
  //baseDamage = calculatePercentage(baseDamage, elementConvert);
  baseDamage *= elementConvert;
  
  
  // Apply elemental resistances/weaknesses
  const elementalPenetration = attacker.stats.elementalPenetration || 0;
  const weaknessBonus = attacker.stats.weaknessBonus || 0;
  const elementalMultiplier = getElementalMultiplier(
    resonance,
    target.elementType,
    elementalPenetration,
    weaknessBonus
  );
  // console.log(target);
  // Get matchup type for logging/UI
  const matchup = getElementalMatchup(resonance, target.elementType);
  // console.log(`[Elemental] ${resonance} vs ${target.elementType}: ${matchup} (${elementalMultiplier}x)`);



  let damageMultiplier = elementalMultiplier;

  if (!attacker.lastTarget){
    attacker.lastTarget = target.uniqueId;
    attacker.sameTargetStreak = 0;
  } else if (attacker.lastTarget !== target.uniqueId){
    attacker.lastTarget = target.uniqueId; // Update lastTarget
    attacker.sameTargetStreak = 0;
  } else if (attacker.lastTarget === target.uniqueId){
    attacker.sameTargetStreak++;
  }
  // console.log("[attack] target: ", target, " sameTargetStreak: ", attacker.sameTargetStreak);
  const context = {
    damage: baseDamage,
    isCrit: isCritical,
    sameTargetStreak: attacker.sameTargetStreak || 0,
  };  
  // console.log('[undead]: ', baseDamage);
  for (const skillId in attacker.skills) {
    const skillDef = abilities.find(a => a.id === skillId);
    //console.log(skillDef);
    if (skillDef.type === "passive" && skillDef.applyPassive) {
      skillDef.applyPassive(attacker, target, context);
     // console.log(`[attack] base damage before passive ${baseDamage}`);
      baseDamage = context.damage;
     // console.log(`[attack] base damage after passive ${baseDamage} context ${context.damage}`);
    }
  }
  
  // Boss damage bonus from dungeon rewards
  if (target.isBoss && partyState) {
    const bossDmgBonus = partyState.heroBonuses.bossDamage || 0;
    baseDamage *= (1 + bossDmgBonus);
  }
  
  const autoAttackBonus = partyState.heroBonuses.autoAttackDamage || 0;
  baseDamage *= (1 + autoAttackBonus);
  
  const finalDamage = Math.max(1, Math.floor(baseDamage * damageMultiplier));
  
  return {
    damage: finalDamage,
    isCritical,
    resonance,
    multiplier: damageMultiplier,
    elementalMatchup: matchup
  };
}

/**
 * 
 * @param {*} attacker 
 * @param {*} skillDamageRatio 
 * @param {*} target 
 * @returns 
 */
export function calculateSkillDamage(attacker, resonance, skillDamageRatio, target) {
  // check for enemy immunity (elementals, dragons, and demons are immune to their own element)
  if ((target.elementType === resonance && target.type === 'elemental')||
      (target.elementType === resonance && target.type === 'dragon')||
      (target.elementType === 'dark' && target.type === 'demon')) {
            return {
              damage: 0,
              isCritical: false,
              resonance,
              multiplier: 0,
              elementalMatchup: 'immune'
            };
          }

  // Base attack
  let baseDamage = partyState.totalStats.attack || 90;
  let isCritical = false;

  // Critical hits
  const critChance = attacker.stats.criticalChance || 0;
  if (Math.random() < critChance) {
    isCritical = true;
    const critBonus = partyState.heroBonuses.criticalDamage || 0;
    baseDamage *= COMBAT_CONFIG.CRITICAL_DAMAGE_MULTIPLIER * (1 + critBonus);
  }

  // console.log('[Skill Damage] baseDamage:', baseDamage, 'skillDamageRatio:', skillDamageRatio);

  // Step 1: Core skill damage
  let skillDamage = baseDamage * skillDamageRatio;

  // Step 2: Elemental bonus
  const elementBonus = partyState.elementalDmgModifiers[resonance] || 0;
  skillDamage *= elementBonus;

  // Step 3: Apply resistances and weaknesses
  const elementalMultiplier = getElementalMultiplier(
    resonance,
    target.elementType,
    attacker.stats.elementalPenetration || 0,
    attacker.stats.weaknessBonus || 0
  );

  const levelMultiplier = getLevelDampening(attacker.level, target.level);
    // Boss damage bonus from dungeon rewards
  if (target.isBoss && partyState) {
    const bossDmgBonus = partyState.heroBonuses.bossDamage || 0;
    skillDamage *= (1 + bossDmgBonus);
  }

  const finalDamage = Math.max(
    1,
    Math.floor(skillDamage * elementalMultiplier * levelMultiplier)
  );

  // console.log(`[Skill Damage] Final: ${finalDamage} (${resonance} vs ${target.elementType})`);
  
  return {
    damage: finalDamage,
    isCritical,
    resonance,
    multiplier: elementalMultiplier,
    elementalMatchup: getElementalMatchup(resonance, target.elementType)
  };
}

/**
 * 
 * @param {*} attacker 
 * @param {*} skillDamageRatio 
 * @param {*} target 
 * @returns 
 */
export function calculateHeroSpellDamage(resonance, skillDamageRatio, target) {
  // check for enemy immunity (elementals, dragons, and demons are immune to their own element)
  if ((target.elementType === resonance && target.type === 'elemental')||
      (target.elementType === resonance && target.type === 'dragon')||
      (target.elementType === 'dark' && target.type === 'demon')) {
    console.log(`[immune check]: ${target.elementType} vs ${resonance}`);
            return {
              damage: 0,
              isCritical: false,
              resonance,
              multiplier: 0,
              elementalMatchup: 'immune'
            };
          }
  // Base attack
  let baseDamage = partyState.heroBaseStats.attack || 30;
  let isCritical = false;

  // Critical hits
  const critChance = partyState.heroBaseStats.criticalChance || 0;
  if (Math.random() < critChance) {
    isCritical = true;
    const critBonus = partyState.heroBonuses.criticalDamage || 0;
    baseDamage *= COMBAT_CONFIG.CRITICAL_DAMAGE_MULTIPLIER * (1 + critBonus);
  }

  // console.log('[Skill Damage] baseDamage:', baseDamage, 'skillDamageRatio:', skillDamageRatio);

  // Step 1: Core skill damage
  let skillDamage = baseDamage * skillDamageRatio;

  // Step 2: Elemental bonus
  const elementBonus = partyState.elementalDmgModifiers[resonance] || 1;
  skillDamage * elementBonus;

  // Step 3: Apply resistances and weaknesses
  const elementalMultiplier = getElementalMultiplier(
    resonance,
    target.elementType,
    partyState.heroBaseStats.elementalPenetration || 0,
    partyState.heroBaseStats.weaknessBonus || 0
  );

  // Boss damage bonus from dungeon rewards
  if (target.isBoss && partyState) {
    const bossDmgBonus = partyState.heroBonuses.bossDamage || 0;
    skillDamage *= (1 + bossDmgBonus);
  }

  const finalDamage = Math.max(1, Math.floor(skillDamage * elementalMultiplier));

  // console.log(`[Skill Damage] Final: ${finalDamage} (${resonance} vs ${target.elementType})`);
  
  return {
    damage: finalDamage,
    isCritical,
    resonance,
    multiplier: elementalMultiplier,
    elementalMatchup: getElementalMatchup(resonance, target.elementType)
  };
}

/**
 * Execute attack from party member to current target
 * @param {Object} attacker - Party member performing the attack
 */
export function executeAttack(attacker) {
  const currentTarget = getCurrentTarget();

  if (!currentTarget) {
    // Try to find a new target
    const nextTarget = findNextTarget();
    if (nextTarget) {
      setTarget(nextTarget.row, nextTarget.col);
      return executeAttack(attacker); // Retry with new target
    } else {
      // No enemies left, combat should end / next wave check
      return;
    }
  }

  const { position, enemy } = currentTarget;
  
  const damageResult = calculateDamage(attacker, enemy);
    // ✅ Award hit income
  const income = incomeSystem.applyHitIncome(attacker, damageResult.damage);
  
  // Log income for debugging
  //logMessage(`Income from attack: ${income.toFixed(0)} gold`);
  //console.log(`Income from attack: ${income} gold`);

  emit( "coinAnimation", position );
  
  
  // Apply damage
  const success = damageEnemy(enemy, damageResult, attacker.resonance);

  // Get canvas position for this enemy
  const pos = getEnemyCanvasPosition(position.row, position.col);
  if (pos) {
    // Show damage number
    floatingTextManager.showDamage(
      damageResult.damage,
      pos.x,
      pos.y - 10, // Slightly above center
      damageResult.isCritical
    );
    
    // Show elemental effectiveness below the damage
    if (damageResult.elementalMatchup !== 'neutral') {
      floatingTextManager.showElementalFeedback(
        damageResult.elementalMatchup,
        pos.x,
        pos.y + 20 // Below the damage number
      );
    }
  }
  
  if (success) {
    // Log the attack
    const attackInfo = {
      timestamp: Date.now(),
      attacker: attacker.name,
      attackerId: attacker.id,
      target: enemy.name,
      targetPosition: position,
      damage: damageResult.damage,
      isCritical: damageResult.isCritical,
      resonance: damageResult.resonance
    };
    
    // Add to combat log (keep last 50 entries)
    state.combatLog.push(attackInfo);
    if (state.combatLog.length > 50) {
      state.combatLog.shift();
    }
    // console.log(`Attack executed:`, attackInfo);
    state.lastAction = attackInfo;
    emit('attackExecuted', attackInfo);
  }
}

function tryActivateSkill(member, skillId) {
  //console.log("[skills] member: ", member);
  //console.log("[skills] skillId:", skillId);
  const skillDef = abilities.find(a => a.id === skillId);
  const skillState = member.skills[skillId];
  //console.log("[skills] skillId / skillDef / skillState", skillId, skillDef, skillState);

  if (skillState.cooldownRemaining <= 0) {
    skillDef.activate(member, getCurrentTarget(), {});
    skillState.cooldownRemaining = skillDef.cooldown;
  }
}


/**
 * Set initial target when wave starts
 */
function setInitialTarget() {
  const defaultPos = COMBAT_CONFIG.DEFAULT_TARGET;
  const enemy = state.enemies[defaultPos.row][defaultPos.col];
  
  if (enemy && enemy.hp > 0) {
    setTarget(defaultPos.row, defaultPos.col);
  } else {
    // Find first available enemy
    const nextTarget = findNextTarget();
    if (nextTarget) {
      setTarget(nextTarget.row, nextTarget.col);
    }
  }
}

// Event Handlers
function handleGameLoaded() {
  setInitialTarget();
  if (partyState.party.length > 0) {
    startAutoAttack();
  }
}

function handlePartyChanged() {
  if (combatState.isAutoAttacking) {
    // Restart auto-attack to account for party changes
    stopAutoAttack();
    if (partyState.party.length > 0) {
      startAutoAttack();
    }
  } else {
    startAutoAttack();
  }
}

function handleWaveCleared() {
  stopAutoAttack();
  combatState.currentTarget = null;
  // console.log('Wave cleared - combat stopped');
}

function getEnemyAt(enemy) {
  const { row, col } = enemy.position;
  if (row < 0 || row > 2 || col < 0 || col > 2) return null;
  console.log('enemy: ', state.enemies[row][col]);
  return state.enemies[row][col];
}

function handleEnemyDefeated({ enemy }) {
  const { row, col } = enemy.position;
  //console.log(`Enemy defeated at position: ${row}, ${col}`);
  //const enemy = getEnemyAt(row, col);
    if (enemy) {
    removeEnemyTooltipById(enemy.uniqueId);
    //console.log(`Enemy defeated at position: ${row}, ${col}`);
    //removeAllEnemyTooltips();
    //updateAreaPanel();
    // ✅ Award kill bounty
    const bounty = incomeSystem.applyKillIncome(enemy);
    logMessage(`Bounty: ${bounty.toFixed(2)} gold`);
    state.enemies[row][col] = null; // Remove enemy from grid
  }
  // If current target was defeated, find new target
  if (combatState.currentTarget && 
      combatState.currentTarget.row === row && 
      combatState.currentTarget.col === col) {
    
    const nextTarget = findNextTarget();
    if (nextTarget) {
      setTarget(nextTarget.row, nextTarget.col);
    } else {
      combatState.currentTarget = null;
    }
  }
}

function handleTargetChanged({ oldTarget, newTarget, enemy }) {
  //console.log(`Target changed from ${oldTarget ? `${oldTarget.row},${oldTarget.col}` : 'none'} to ${newTarget.row},${newTarget.col}`);
}

// Public API for external use
export const combatAPI = {
  isAutoAttacking: () => combatState.isAutoAttacking,
  getCurrentTarget,
  setTarget,
  findNextTarget,
  startAutoAttack,
  stopAutoAttack,
  toggleAutoAttack,
  getCombatState: () => ({ ...combatState }) // Return copy for read-only access
};

// Export for module initialization
export { combatState };