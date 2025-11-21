import { calculateHeroSpellDamage, calculateSkillDamage, getActiveEnemies, getEnemiesBasedOnSkillLevel, getEnemiesInColumn, getEnemiesInRow, getRandomEnemy, getAdjacentEnemies } from '../systems/combatSystem.js';
import { damageEnemy } from '../waveManager.js';
import { handleSkillAnimation } from '../systems/animations.js';
//import { floatingTextManager } from '../systems/floatingtext.js';
import { showFloatingDamage } from './abilities.js';
import { state, partyState } from '../state.js';
import { emit } from '../events.js';
import { logMessage } from '../systems/log.js';
import { applyVisualEffect, flashScreen, shakeScreen } from '../systems/effects.js';
import { randInt, getSkillDamageRatio } from '../systems/math.js';
import { updateEnemiesGrid } from '../area.js';
import { getBuildingLevel } from '../town.js';
import { spellHandState } from '../state.js';
import { updateSpellDock } from '../systems/dockManager.js';
import { applyDOT } from "../systems/dotManager.js";
import { spawnTornado } from "../systems/tornadoManager.js";
import { addWaveTime } from '../area.js';
import { renderPartyPanel } from '../party.js';
import { dungeonState } from '../dungeonMode.js';

export const heroSpells = [
    {
        id: "moonbeam",
        name: "Moonbeam",
        resonance: "dark",
  //    skillDamageRatio: 3.5,
        get skillLevel() {
          const library = state.buildings.find(c => c.id === 'library');
          return library ? library.level : 1;
        },
        gemCost: 3,
        tier: 3,
        unlocked: true,
        description: "Absorbs all counters from enemies, converts them to dark counters, redistributes them randomly, then deals dark damage based on how many each enemy has.",
        icon: "assets/images/icons/moonbeam.png",

        activate: function () {
            const skillDamageRatio = getSkillDamageRatio(this.id, state.currentWave);
            const enemies = getActiveEnemies();
            let totalCounters = 0;

            // Step 1: Collect all counters
            enemies.forEach(enemy => {
            for (const type in enemy.counters) {
                totalCounters += enemy.counters[type];
            }
            Object.keys(enemy.counters).forEach(k => delete enemy.counters[k]);
            });

            if (totalCounters === 0) {
                logMessage(`${this.name}: No counters to absorb.`);
                return;
            }
            applyVisualEffect('dark-flash', 0.8);
            // Step 3: Redistribute as dark counters
            for (let i = 0; i < totalCounters; i++) {
            const randomEnemy = enemies[Math.floor(Math.random() * enemies.length)];
            randomEnemy.counters["dark"] = (randomEnemy.counters["dark"] || 0) + 1;
            }

            // Step 4: Deal damage and consume counters
            enemies.forEach(enemy => {
            const darkCount = enemy.counters["dark"] || 0;
            const skillDamageObject = calculateHeroSpellDamage(this.resonance, skillDamageRatio, enemy);
            skillDamageObject.damage = skillDamageObject.damage * darkCount;


            if (darkCount > 0) {
                damageEnemy(enemy, skillDamageObject, this.resonance);
                //handleSkillAnimation("moonbeam", enemy.position.row, enemy.position.col);
                showFloatingDamage(enemy.position.row, enemy.position.col, skillDamageObject);
            }

            delete enemy.counters[this.resonance];; // Step 5: Consume all counters
            });
          spellHandState.lastHeroSpellResonance = this.resonance;
        }
    },
    {
        id: "brilliantLight",
        name: "Brilliant Light",
        resonance: "light",
        //skillDamageRatio: 15,
        get skillLevel() {
          const library = state.buildings.find(c => c.id === 'library');
          return library ? library.level : 1;
        },
        gemCost: 3,
        tier: 3,
        unlocked: true,
        description: "Convert all active counters to a random counter type, then deals damage based on the type selected.",
        icon: "assets/images/icons/brilliant.png",
        activate: function () {
        const skillDamageRatio = getSkillDamageRatio(this.id, state.currentWave);
        let targetsHit = false;
        const damageMultipliers = {
            "dark": 0.5,
            "undead": 0.5,
            "earth": 0.5,
            "physical": 0.5,
            "poison": 0.5,
            "air": 1,
            "water": 1,
            "fire": 1,
            "light": 2
        };

        applyVisualEffect('light-flash', 0.8);
        const enemies = getActiveEnemies();
        const counterTypes = ["fire", "water", "poison", "light", "dark", "air", "undead", "physical"]; // define your game's counter types
        const newType = counterTypes[Math.floor(Math.random() * counterTypes.length)];
        //const initialSkillDamage = this.skillDamageRatio * damageMultipliers[newType];
        enemies.forEach(enemy => {
            const currentCounters = enemy.counters;
            const totalCounters = Object.values(currentCounters).reduce((sum, val) => sum + val, 0);

            // Step 2: Convert all counters to the new type
            enemy.counters = { [newType]: totalCounters };
            if (totalCounters>0)console.log(`total counters: ${totalCounters}`);
            const skillDamageObject = calculateHeroSpellDamage(newType, skillDamageRatio, enemy);
            skillDamageObject.damage = (skillDamageObject.damage * totalCounters) * damageMultipliers[newType];
            
            //console.log(`Brilliant Light converting to ${newType} counters, dealing ${skillDamage} damage.`);
            //console.log(`formula damage: (${skillDamageObject.damage} * ${totalCounters}) * ${damageMultipliers[newType]}`);
            //console.log('damage object: ', skillDamageObject)
            if (skillDamageObject.damage > 0){
              damageEnemy(enemy, skillDamageObject, newType);
              //handleSkillAnimation("brilliantLight", enemy.row, enemy.col);
              showFloatingDamage(enemy.position.row, enemy.position.col, skillDamageObject);
              targetsHit = true;
              //if (enemy.hp <= 0) updateEnemiesGrid();
            }
        });
        if (!targetsHit) {
          logMessage(`No damage for ${this.name} to deal. Drawing a spell scroll.`)
          replaceSpell();
        }
        spellHandState.lastHeroSpellResonance = newType;
        },
    },
    {
	id: "breathOfDecay",
	name: "Breath of Decay",
	resonance: "undead",
  //skillDamageRatio: 3.8, 
  get skillLevel() {
    const library = state.buildings.find(c => c.id === 'library');
    return library ? library.level : 1;
  },
	gemCost: 1,
    tier: 1,
	description: "Deals a small amount of undead to rows of enemies based on skill level.",
	icon: "assets/images/icons/breath.png",
    unlocked: true,
	activate: function () {
    const skillDamageRatio = getSkillDamageRatio(this.id, state.currentWave);
    applyVisualEffect('dark-flash', 0.8);
    //console.log('Activating Breath of Decay');
	const enemies = getEnemiesBasedOnSkillLevel(this.skillLevel);
    
        enemies.forEach(enemy => {
            //console.log('Damaging enemy: ', enemy);
            const skillDamage = calculateHeroSpellDamage(this.resonance, skillDamageRatio, enemy);
           // console.log(`Calculated skill damage: ${skillDamage.damage}`);
            damageEnemy(enemy, skillDamage, this.resonance);
            //handleSkillAnimation("breathOfDecay", enemy.row, enemy.col);
            showFloatingDamage(enemy.position.row, enemy.position.col, skillDamage); // show floating text
            //if (enemy.hp<=0) updateEnemiesGrid();
            });
      spellHandState.lastHeroSpellResonance = this.resonance;
    },
},
  {
    id: "flashOfSteel",
    name: "Flash of Steel",
    resonance: "physical",
    //baseSkillDamageRatio: 3.8,
    get dotDamage() {
        return 3.8 * partyState.totalStats.attack || 90;
    },  
    get skillLevel() {
      const library = state.buildings.find(c => c.id === 'library');
      return library ? library.level : 1;
    },
    gemCost: 1,
      tier: 1,
    description: "Deals a small amount of undead to rows of enemies based on skill level. Applies a DoT if the last spell cast was physical.",
    icon: "assets/images/icons/flash.png",
      unlocked: true,
	activate: function () {
  const skillDamageRatio = getSkillDamageRatio(this.id, state.currentWave);  
  flashScreen('white', 600);
    
	const enemies = getEnemiesBasedOnSkillLevel(this.skillLevel);
    
        enemies.forEach(enemy => {
            //console.log('Damaging enemy: ', enemy);
            const skillDamage = calculateHeroSpellDamage(this.resonance, skillDamageRatio, enemy);
           // console.log(`Calculated skill damage: ${skillDamage.damage}`);
            damageEnemy(enemy, skillDamage, this.resonance);
            //handleSkillAnimation("breathOfDecay", enemy.row, enemy.col);
            showFloatingDamage(enemy.position.row, enemy.position.col, skillDamage); // show floating text
            if (spellHandState.lastHeroSpellResonance === "physical" && enemy.hp > 0) {
                applyDOT(enemy, this.resonance, this.dotDamage, 5);
            }
            //if (enemy.hp <= 0) updateEnemiesGrid();
            });
      spellHandState.lastHeroSpellResonance = this.resonance;
    },
},
{
  id: "earthquake",
  name: "Earthquake",
  resonance: "earth",
  tier: 4,
  get skillLevel() {
    const library = state.buildings.find(c => c.id === 'library');
    return library ? library.level : 1;
  },
  gemCost: 4,
  //skillDamageRatio: 20,
  description: "Shuffles all enemies on the grid. Enemies that move take earth damage, increased by your Earth and Physical counters. Consumes all Earth counters.",
    icon: "assets/images/icons/earthquake.webp",
    unlocked: true,

  activate: function () {
    const skillDamageRatio = getSkillDamageRatio(this.id, state.currentWave);

    const grid = state.enemies;
    const activeEnemies = [];

    // Record starting positions
    const originalPositions = new Map();
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const enemy = grid[row][col];
        if (enemy && enemy.hp > 0) {
          activeEnemies.push(enemy);
          originalPositions.set(enemy, { row, col });
        }
      }
    }

    if (activeEnemies.length === 0) {
      logMessage("No enemies to affect with Earthquake!");
      return;
    }

    shakeScreen(1000, 10); // duration: 1000ms, intensity: 10px
    // Shuffle enemies randomly across the grid
    const shuffled = [...activeEnemies].sort(() => Math.random() - 0.5);

    // Clear grid and reassign
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        grid[row][col] = null;
      }
    }

    shuffled.forEach(enemy => {
      let placed = false;
      while (!placed) {
        const r = randInt(0, grid.length - 1);
        const c = randInt(0, grid[0].length - 1);
        if (!grid[r][c]) {
          grid[r][c] = enemy;
          placed = true;
        }
      }
    });

    // Get total bonus multipliers
    const earthBonus = state.heroCounters?.earth || 0;
    const physicalBonus = state.heroCounters?.physical || 0;
    const totalBonus = 1 + 0.2 * (earthBonus + physicalBonus);

    // Apply damage to enemies that moved
    shuffled.forEach(enemy => {
      const { row: oldRow, col: oldCol } = originalPositions.get(enemy);
      let newRow = null;
      let newCol = null;

      // Find new position
      for (let r = 0; r < grid.length; r++) {
        const idx = grid[r].indexOf(enemy);
        if (idx !== -1) {
          newRow = r;
          newCol = idx;
          break;
        }
      }

      // If position changed, apply damage
      if (newRow !== oldRow || newCol !== oldCol) {
        enemy.position.row = newRow;
        enemy.position.col = newCol;
        //updateEnemiesGrid();
        const dmgObject = calculateHeroSpellDamage(this.resonance, skillDamageRatio, enemy);
        let dmg = dmgObject.damage;
        if (totalBonus > 0) dmg = dmgObject.damage * totalBonus;
        dmgObject.damage = dmg;
        damageEnemy(enemy, dmgObject, this.resonance);
        //handleSkillAnimation("earthquake", newRow, newCol);
        showFloatingDamage(newRow, newCol, dmgObject);
        delete enemy.counters["earth", "physical"]; // Consume earth and physical counters
      }
    });
    spellHandState.lastHeroSpellResonance = this.resonance;
    logMessage(`${this.name} shakes the battlefield!`);
  }
},
{
  id: "flush",
  name: "Flush",
  resonance: "water",
  tier: 2,
  gemCost: 3,
  get skillLevel() {
    const library = state.buildings.find(c => c.id === 'library');
    return library ? library.level : 1;
  },
  description: "Deals water damage to enemies aligned in rows or columns of three with matching types or elements. Double damage if both match.",
    icon: "assets/images/icons/brilliant.png",

  activate: function () {
    const skillDamageRatio = getSkillDamageRatio(this.id, state.currentWave);

    const grid = state.enemies;
    const matchedEnemies = new Set();

    // --- Helper: checks and marks a trio for matching ---
    function checkLine(enemiesInLine) {
      if (enemiesInLine.some(e => !e || e.hp <= 0)) return;

      const [a, b, c] = enemiesInLine;
      const sameType = (a.type === b.type && b.type === c.type);
      const sameElement = (a.elementType === b.elementType && b.elementType === c.elementType);

      if (!sameType && !sameElement) return;

      const dmgMultiplier = sameType && sameElement ? 2 : 1;
      enemiesInLine.forEach(enemy => matchedEnemies.add({ enemy, dmgMultiplier }));
    }

    // --- Check all rows ---
    for (let row = 0; row < 3; row++) {
      checkLine(grid[row]);
    }

    // --- Check all columns ---
    for (let col = 0; col < 3; col++) {
      checkLine([grid[0][col], grid[1][col], grid[2][col]]);
    }

    // --- Apply damage ---
    matchedEnemies.forEach(({ enemy, dmgMultiplier }) => {
      // Find position
      let row = null, col = null;
      for (let r = 0; r < grid.length; r++) {
        const c = grid[r].indexOf(enemy);
        if (c !== -1) {
          row = r;
          col = c;
          break;
        }
      }

      if (row !== null && col !== null) {
        const skillDamageObject = calculateHeroSpellDamage(this.resonance, skillDamageRatio * dmgMultiplier, enemy);
        
        damageEnemy(enemy, skillDamageObject, this.resonance);
        handleSkillAnimation("flush", row, col);
        showFloatingDamage(row, col, skillDamageObject);
        //updateEnemiesGrid();
      }
    });

    if (matchedEnemies.size === 0) {
      logMessage(`${this.name} found no aligned enemies. Replacing scroll.`);
      replaceSpell();
    } else {
        shakeScreen(500, 5); // duration: 1000ms, intensity: 10px
        logMessage(`${this.name} strikes matched enemies with crushing force!`);
    }
    spellHandState.lastHeroSpellResonance = this.resonance;
  }
  
},
{
  id: "destroyUndead",
  name: "Destroy Undead",
  resonance: "light",
  tier: 3,
  get skillLevel() {
    const library = state.buildings.find(c => c.id === 'library');
    return library ? library.level : 1;
  },
  gemCost: 3,
  icon: "assets/images/icons/brilliant.png",
  description: "Smite the undead! If three undead line up in a row or column, they are struck by radiant light and take massive damage.",

  activate: function () {
    const skillDamageRatio = getSkillDamageRatio(this.id, state.currentWave);

    const grid = state.enemies;
    const undeadMatches = new Set();

    // Helper: finds undead trios
    function checkUndeadLine(enemiesInLine) {
      if (enemiesInLine.some(e => !e || e.hp <= 0)) return;
      if (enemiesInLine.every(e => e.type === "undead" || e.elementType === "undead")) {
        enemiesInLine.forEach(e => undeadMatches.add(e));
      }
    }

    // Check all rows
    for (let row = 0; row < grid.length; row++) {
      checkUndeadLine(grid[row]);
    }

    // Check all columns
    for (let col = 0; col < grid[0].length; col++) {
      checkUndeadLine([grid[0][col], grid[1][col], grid[2][col]]);
    }

    if (undeadMatches.size === 0) {
      logMessage(`No undead formations to destroy. Spell replaced`);
      replaceSpell(); // cycle the spell out if no undead clusters found
      return;
    }

    // 🔸 Holy flash animation
    flashScreen("white", 700);
    shakeScreen(500, 5);

    // 🔹 Damage scaling
    const holyMultiplier = 2.5;
    const base = skillDamageRatio * holyMultiplier;

    // Apply damage
    undeadMatches.forEach(enemy => {
      let row = null, col = null;
      for (let r = 0; r < grid.length; r++) {
        const c = grid[r].indexOf(enemy);
        if (c !== -1) {
          row = r;
          col = c;
          break;
        }
      }

      if (row !== null && col !== null) {
        const skillDamageObject = calculateHeroSpellDamage(this.resonance, base, enemy);
        
        damageEnemy(enemy, skillDamageObject, this.resonance);
        handleSkillAnimation("destroyUndead", row, col);
        showFloatingDamage(row, col, skillDamageObject);
        //console.log(`${this.name} deals ${dmg} to undead at (${row}, ${col})`);
        //updateEnemiesGrid();
      }
    });
    spellHandState.lastHeroSpellResonance = "light";
    logMessage(`${this.name} incinerates the undead with divine light!`);
  }
},
{
  id: "haste",
  name: "Haste",
  resonance: "fire",
  tier: 1,
  get skillLevel() {
    const library = state.buildings.find(c => c.id === 'library');
    return library ? library.level : 1;
  },
  gemCost: 1,
  description: "Maxes out all party members' attack speed for a short duration.",
  icon: "assets/images/icons/inferno.png",
  duration: 8, // seconds — base duration
  unlocked: true,
  active: false,
  remaining: 0,

  activate: function () {
    
    // Duration logic (double if previous spell was fire)
    let duration = this.duration;
    if (spellHandState.lastHeroSpellResonance === "fire") {
      duration *= 2;
      logMessage("🔥 Fire synergy! Haste duration doubled!");
    }

    // Track spell used
    spellHandState.lastHeroSpellResonance = this.resonance;

    // Apply visual
    applyVisualEffect("light-flash", 0.8);
    logMessage(`✨ ${this.name} activated!`);

    // Activate buff
    this.active = true;
    this.remaining = duration;

    // Apply buff to party
    partyState.party.forEach(member => {
      if (!member.stats) member.stats = {};
      member.stats._originalSpeed = member.stats.speed || 1;
      member.stats.speed = 9999; // effectively max speed
    });

    // Register buff for delta tracking
    if (!partyState.activeHeroBuffs) partyState.activeHeroBuffs = [];
    const existingBuff = partyState.activeHeroBuffs.find(b => b.id === this.id);
    if (!existingBuff) {
      partyState.activeHeroBuffs.push({
        id: this.id,
        remaining: this.remaining,
        onExpire: () => {
          // Restore original speed
          partyState.party.forEach(member => {
            if (member.stats && member.stats._originalSpeed != null) {
              member.stats.speed = member.stats._originalSpeed;
              delete member.stats._originalSpeed;
            }
          });
          this.active = false;
          logMessage("⚡ Haste has worn off.");
        },
      });
    }
    spellHandState.lastHeroSpellResonance = this.resonance;
  },
},
{
  id: "starFall",
  name: "Star Fall",
  resonance: "air",
  get skillLevel() {
    const library = state.buildings.find(c => c.id === 'library');
    return library ? library.level : 1;
  },
  gemCost: 5,
  tier: 4,
  unlocked: true,
  description: "Calls down 9 falling stars that each target a random grid position. Empty tiles result in misses.",
  icon: "assets/images/icons/starfall.webp",
  active: false,
  remainingDelay: 0,
  starsRemaining: 0,

  activate: function () {
    

    //applyVisualEffect("air-flash", 1.2);
    applyVisualEffect('light-flash', 0.8);
    logMessage("🌠 Casting Star Fall!");

    this.active = true;
    if (spellHandState.lastHeroSpellResonance === "air") {
      this.starsRemaining = 12;
      logMessage("💨 Air synergy! Star Fall summons 12 stars!");
    } else {
      this.starsRemaining = 9;
    }
    this.remainingDelay = 0.15; // seconds between each star

    if (!state.activeHeroSpells) state.activeHeroSpells = [];
    state.activeHeroSpells.push(this);
    spellHandState.lastHeroSpellResonance = this.resonance;  
  },

  update: function (delta) {
    //console.log('Updating Star Fall spell:', this);
    if (!this.active) return;

    this.remainingDelay -= delta;
    if (this.remainingDelay <= 0 && this.starsRemaining > 0) {
      this.castStar();
      this.starsRemaining--;
      this.remainingDelay = 0.15; // next star delay
    }

    if (this.starsRemaining <= 0) {
      this.active = false;
      const idx = state.activeHeroSpells.indexOf(this);
      if (idx !== -1) state.activeHeroSpells.splice(idx, 1);
    }
  },

  castStar: function () {
    const skillDamageRatio = getSkillDamageRatio(this.id, state.currentWave);
    const randRow = randInt(0, state.enemies.length - 1);
    const randCol = randInt(0, state.enemies[randRow].length - 1);
    const enemy = state.enemies[randRow][randCol];

    if (enemy && enemy.hp > 0) {
      const skillDamage = calculateHeroSpellDamage(this.resonance, skillDamageRatio, enemy);
      damageEnemy(enemy, skillDamage, this.resonance);
      handleSkillAnimation("followThrough", randRow, randCol);
      showFloatingDamage(randRow, randCol, skillDamage);
      //updateEnemiesGrid();
    } else {
      /*
      showFloatingText("Miss!", randRow, randCol, { color: "#b0c4de" });
      handleSkillAnimation("starFallMiss", randRow, randCol);
      */
      logMessage(`🌠 Star Fall missed at (${randRow}, ${randCol})`);
    }
  },
},
{
  id: "landslide",
  name: "Landslide",
  resonance: "earth",
  tier: 2,
  classSkillLevel: null, // used during active casting
  get skillLevel() {
    const library = state.buildings.find(c => c.id === 'library');
    return library ? library.level : 1;
  },
  gemCost: 3,
  unlocked: true,
  description: "Crushes enemies column by column. If it defeats an enemy, the landslide continues to the next column (max 3).",
  icon: "assets/images/icons/earthquake.webp",
  attacker: null,
  activate: function (modifiedLevel = this.skillLevel, caster=null) {
    this.classSkillLevel = modifiedLevel;
    this.attacker = caster;
    spellHandState.lastHeroSpellResonance = this.resonance;
    shakeScreen(500, 5); // duration: 1000ms, intensity: 10px
    logMessage("🌋 Casting Landslide!");

    let columnsChecked = 0;
    let currentColumn = 0;
    const maxColumns = 3;
    let defeatedSomething = false;

    // Find first column with enemies
    while (currentColumn < state.enemies[0].length && getEnemiesInColumn(currentColumn).length === 0) {
      currentColumn++;
    }

    // If we ran out of columns entirely
    if (currentColumn >= state.enemies[0].length) {
      logMessage("The ground rumbles, but there are no enemies to crush!");
      return;
    }

    // Process up to 3 columns
    while (columnsChecked < maxColumns && currentColumn < state.enemies[0].length) {
      const enemies = getEnemiesInColumn(currentColumn);

      if (enemies.length > 0) {
        logMessage(`🪨 Landslide hits column ${currentColumn + 1}!`);
        defeatedSomething = this.hitColumn(enemies) || defeatedSomething;
        columnsChecked++;
      }

      // Continue only if something died
      if (defeatedSomething) {
        currentColumn++;
        defeatedSomething = false;
      } else {
        break;
      }
    }
  },

  hitColumn: function (enemies) {
    const skillDamageRatio = getSkillDamageRatio(this.id, state.currentWave, this.classSkillLevel);
    let defeated = false;
    enemies.forEach(({ enemy, row, col }) => {
    let skillDamage;
    if (this.attacker === null){ 
      skillDamage = calculateHeroSpellDamage(this.resonance, skillDamageRatio, enemy);
    } else {
      skillDamage = calculateSkillDamage(this.attacker, this.resonance, skillDamageRatio, enemy);     
    }

      // Apply visual and damage
      showFloatingDamage(row, col, skillDamage);
      const beforeHP = enemy.hp;
      damageEnemy(enemy, skillDamage, this.resonance);

      if (beforeHP > 0 && enemy.hp <= 0) {
        defeated = true;
        //updateEnemiesGrid();
      }
    });
    return defeated;
  },
},
{
  id: "fireball",
  name: "Fireball",
  resonance: "fire",
  get dotDamage() {
    return 10 * partyState.totalStats.attack || 150;
  },
  get skillLevel() {
    const library = state.buildings.find(c => c.id === 'library');
    return library ? library.level : 1;
  },
  gemCost: 3,
  tier: 3,
  unlocked: true,
  description: "Launches a fireball that explodes on impact, dealing fire damage to a 2x2 area around a random enemy.",
  icon: "assets/images/icons/inferno.png",

  activate: function (isEcho=false) {
    // search for sorceress and add an echo of fireball if found
    const sorceress = partyState.party.find(c => c.id === "sorceress");
    if (sorceress && !isEcho) {
      if (!partyState.activeEchoes) partyState.activeEchoes = [];
      partyState.activeEchoes.push({
        spellId: this.id,
        delay: 1500,   // 1.5s delay
        isEcho: true
      });
    }
    const skillDamageRatio = getSkillDamageRatio(this.id, state.currentWave);

    const activeEnemies = getActiveEnemies();
    if (activeEnemies.length === 0) {
      logMessage(`No enemies available for ${this.name}`);
      return;
    }

    // Pick a random active enemy as the explosion origin
    const randomEnemy = activeEnemies[Math.floor(Math.random() * activeEnemies.length)];
    //console.log(`Fireball targets enemy at (${randomEnemy.position.row}, ${randomEnemy.position.col})`);
    let { row, col } = randomEnemy.position;
    //console.log(`Enemy position: row ${row}, col ${col}`);
    const numRows = state.enemies.length;
    const numCols = state.enemies[0].length;

    // Adjust the top-left corner of the 2x2 zone so it stays within bounds
    // The zone covers: (baseRow, baseCol), (baseRow+1, baseCol), (baseRow, baseCol+1), (baseRow+1, baseCol+1)
    let baseRow = row;
    let baseCol = col;

    if (baseRow === numRows - 1) baseRow--; // shift up if on bottom edge
    if (baseCol === numCols - 1) baseCol--; // shift left if on right edge

    // Collect enemies in that adjusted 2x2 zone
    const targets = [];
    for (let r = baseRow; r < baseRow + 2; r++) {
      for (let c = baseCol; c < baseCol + 2; c++) {
        const enemy = state.enemies[r][c];
        if (enemy && enemy.hp > 0) {
          targets.push({ enemy, row: r, col: c });
        }
      }
    }

    // Apply damage + effects
    targets.forEach(({ row, col }) => {
      const enemy = state.enemies[row][col];
      const skillDamageObject = calculateHeroSpellDamage(this.resonance, skillDamageRatio, enemy);
      
      damageEnemy(enemy, skillDamageObject, this.resonance);
      if (spellHandState.lastHeroSpellResonance === "fire") {
        // Apply DOT for 5 seconds
        applyDOT(enemy, "fire", this.dotDamage, 5);
        logMessage(`🔥 Fire synergy! ${this.name} applies burn DOT!`);
      }
      handleSkillAnimation("flameArch", row, col);
      showFloatingDamage(row, col, skillDamageObject);
      //if (enemy.hp <= 0) updateEnemiesGrid();
    });
  spellHandState.lastHeroSpellResonance = this.resonance;  
  },
},
{
  id: "ring_of_fire",
  name: "Ring of Fire",
  resonance: "fire",
  get dotDamage() {
    return 8 * partyState.totalStats.attack || 120;
  },
  get skillLevel() {
    const library = state.buildings.find(c => c.id === 'library');
    return library ? library.level : 1;
  },
  gemCost: 3,
  tier: 2,
  unlocked: true,
  description: "Engulfs the battlefield in flames, dealing fire damage to all enemies on the outer ring of the grid (not the center).",
  icon: "assets/images/icons/inferno.png",
  active: false,
  targets: [],
  currentTargetIndex: 0,
  remainingDelay: 0,

  activate: function (isEcho=false) {
    // search for sorceress and add an echo of ring of fire if found
    const sorceress = partyState.party.find(c => c.id === "sorceress");
    if (sorceress && !isEcho) {
      if (!partyState.activeEchoes) partyState.activeEchoes = [];
      // mark sorceress echo ui state
      sorceress.isEchoing = true;
      partyState.activeEchoes.push({
        spellId: this.id,
        delay: 3500,   // 1.5s delay
        isEcho: true
      });
      if (!dungeonState.active) renderPartyPanel();
    }

    const targets = getEnemiesOnOuterRing();

    if (targets.length === 0) {
      logMessage(`No enemies on the outer ring to hit.`);
      return;
    }

    this.targets = targets;
    this.currentTargetIndex = 0;
    this.remainingDelay = 0.2; // seconds between each flame hit
    this.active = true;

    logMessage("🔥 Casting Ring of Fire!");

    if (!state.activeHeroSpells) state.activeHeroSpells = [];
    state.activeHeroSpells.push(this);
  },

  update: function (delta) {
    if (!this.active) return;
    const skillDamageRatio = getSkillDamageRatio(this.id, state.currentWave);

    this.remainingDelay -= delta;

    if (this.remainingDelay <= 0 && this.currentTargetIndex < this.targets.length) {
      const { row, col } = this.targets[this.currentTargetIndex];
      const enemy = state.enemies[row][col];

      if (enemy && enemy.hp > 0) {
        const skillDamageObject = calculateHeroSpellDamage(this.resonance, skillDamageRatio, enemy);
        
        damageEnemy(enemy, skillDamageObject, this.resonance);
        handleSkillAnimation("flameArch", row, col);
        showFloatingDamage(row, col, skillDamageObject);
        if (spellHandState.lastHeroSpellResonance === "fire") {
          // Apply DOT for 5 seconds
          applyDOT(enemy, "fire", this.dotDamage, 5);
          logMessage(`🔥 Fire synergy! ${this.name} applies burn DOT!`);
        }
        //if (enemy.hp <= 0) updateEnemiesGrid();
      } else {
        logMessage(`🔥 Ring of Fire missed at (${row}, ${col})`);
      }

      this.currentTargetIndex++;
      this.remainingDelay = 0.2;
    }

    if (this.currentTargetIndex >= this.targets.length) {
      this.active = false;
      spellHandState.lastHeroSpellResonance = this.resonance;
      const idx = state.activeHeroSpells.indexOf(this);
      if (idx !== -1) state.activeHeroSpells.splice(idx, 1);
    }
  },
},
{
  id: "reaper",
  name: "Reaper",
  resonance: "undead",
  tier: 4,
  gemCost: 4,
  get skillLevel() {
    const library = state.buildings.find(c => c.id === 'library');
    return library ? library.level : 1;
  },
  unlocked: true,
  description: "The Reaper hunts enemies marked by death. Deals damage to enemies with 5+ undead counters, one by one.",
  icon: "assets/images/icons/breath.png",
  active: false,
  targets: [],
  currentTargetIndex: 0,
  remainingDelay: 0,

  activate: function () {
    

    const activeEnemies = getActiveEnemies();
    const markedTargets = [];

    for (const enemy of activeEnemies) {
      const row = enemy.position.row;
      const col = enemy.position.col;

      //console.log(`Checking enemy at (${row}, ${col}) with undead counters: ${enemy?.counters?.undead || 0}`);

      if (enemy?.counters?.undead >= 5) {
       // console.log(`Reaper found marked enemy at (${row}, ${col}) with ${enemy.counters.undead} undead counters.`);
        markedTargets.push({ row, col });
      }
    }

    if (markedTargets.length === 0) {
      logMessage("💀 The Reaper found no souls marked for harvest. Replacing spell.");
      replaceSpell();
      return;
    }

    this.targets = markedTargets;
    this.currentTargetIndex = 0;
    this.remainingDelay = 0.25; // seconds between each execution
    this.active = true;

    logMessage("☠️ The Reaper begins its grim work...");

    if (!state.activeHeroSpells) state.activeHeroSpells = [];
    state.activeHeroSpells.push(this);
    spellHandState.lastHeroSpellResonance = this.resonance;
  },

  update: function (delta) {
    if (!this.active) return;
    const skillDamageRatio = getSkillDamageRatio(this.id, state.currentWave);

    this.remainingDelay -= delta;

    if (this.remainingDelay <= 0 && this.currentTargetIndex < this.targets.length) {
      const { row, col } = this.targets[this.currentTargetIndex];
      const enemy = state.enemies[row][col];

      if (enemy && enemy.hp > 0) {
        const skillDamage = calculateHeroSpellDamage(this.resonance, skillDamageRatio, enemy);
        
        damageEnemy(enemy, skillDamage, this.resonance);
        handleSkillAnimation("lifeDrain", row, col);
        showFloatingDamage(row, col, skillDamage);
        logMessage(`☠️ Reaper strikes enemy at (${row}, ${col})`);
        //if (enemy.hp <= 0) updateEnemiesGrid();
      } else {
        logMessage(`☠️ Reaper missed at (${row}, ${col})`);
      }

      this.currentTargetIndex++;
      this.remainingDelay = 0.25;
    }

    if (this.currentTargetIndex >= this.targets.length) {
      this.active = false;
      const idx = state.activeHeroSpells.indexOf(this);
      if (idx !== -1) state.activeHeroSpells.splice(idx, 1);
    }
  },
},
  {
    id: "tornado",
    name: "Tornado",
    resonance: "air",
    get skillLevel() {
      const library = state.buildings.find(c => c.id === 'library');
      return library ? library.level : 1;
    },
    gemCost: 5,
    tier: 3,
    unlocked: true,
    description: "Summons a roaming tornado that drifts across the grid, spreading counters between enemies.",
    icon: "assets/images/icons/starfall.webp",

    activate: function () {
      const skillDamageRatio = getSkillDamageRatio(this.id, state.currentWave);

      const enemies = getActiveEnemies();
      if (enemies.length === 0) {
        logMessage("No enemies available to target.");
        return;
      }

      // Pick a random starting enemy
      const start = enemies[Math.floor(Math.random() * enemies.length)];
      
      logMessage(`🌪️ A Tornado begins swirling at (${start.position.row},${start.position.col})!`);
      const skillDamage = calculateHeroSpellDamage(this.resonance, skillDamageRatio, start);
      spellHandState.activeTornado = true;
      spawnTornado({
        row: start.position.row,
        col: start.position.col,
        baseDamage: skillDamage.damage,
        duration: 6, // seconds total
        jumpInterval: 1.5, // seconds between jumps
      });

      handleSkillAnimation("tornado", start.position.row, start.position.col);
    },
  },
{
  id: "rot",
  name: "Rot",
  resonance: "undead",
  classSkillLevel: null,
  tier: 3,
  get skillLevel() {
    const library = state.buildings.find(c => c.id === 'library');
    return library ? library.level : 1;
  },
  gemCost: 3,
  icon: "assets/images/icons/breath.png",
  description: "Attempts to corrupt non-undead enemies, turning them into undead with a 25% chance. Corrupted enemies suffer from a decaying DoT. Bosses are immune.",
  attacker: null,
  activate: function (modifiedLevel = this.skillLevel, caster=null) {
    this.attacker = caster;
    this.classSkillLevel = modifiedLevel;
    const skillDamageRatio = getSkillDamageRatio(this.id, state.currentWave, this.classSkillLevel);
    const grid = state.enemies;
    let infectedCount = 0;
    spellHandState.lastHeroSpellResonance = this.resonance;
    flashScreen("#552244", 600); // purple decay flash

    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const enemy = grid[row][col];
        if (!enemy || enemy.hp <= 0) continue;

        // Skip undead and bosses entirely
        if (enemy.type === "undead" || enemy.isBoss) continue;

        // 25% or 35% chance to corrupt
        let corruptionChance = 0.25;
        const necromancer = partyState.party.find(c => c.id === "necromancer");
        if (necromancer) corruptionChance = 0.35;
        if (deterministicChance(corruptionChance)) {
          // Apply DoT *before* changing type
          let skillDamage;
          if (this.attacker === null){ 
            skillDamage = calculateHeroSpellDamage(this.resonance, skillDamageRatio, enemy);
          } else {
            skillDamage = calculateSkillDamage(this.attacker, this.resonance, skillDamageRatio, enemy);     
          }
          applyDOT(enemy, "undead", skillDamage.damage, 5);
          enemy.type = "undead";
          infectedCount++;
          //updateEnemiesGrid();

          //handleSkillAnimation("rot", row, col);
          //showFloatingText(row, col, "☠️", "#bb66ff");
        }
      }
    }

    if (infectedCount > 0) {
      logMessage(`${this.name} spreads corruption to ${infectedCount} enemy${infectedCount > 1 ? "ies" : "y"}!`);
    } else {
      logMessage(`${this.name} fizzles — no new hosts succumb to the rot.`);
    }
  }
},
{
  id: "cure",
  name: "Cure",
  resonance: "light",
  tier: 2,
  get skillLevel() {
    const library = state.buildings.find(c => c.id === 'library');
    return library ? library.level : 1;
  },
  gemCost: 2,
  icon: "assets/images/icons/brilliant.png",
  get skillBaseAmount() {
      return 5;
  },
  description: "Recover 5 seconds. Double recovery if the last spell cast was light.",

  activate: function () {
    
    let recoveryAmount = this.skillBaseAmount;
    if (spellHandState.lastHeroSpellResonance === "light") {
      recoveryAmount *= 2;
      logMessage("🌟 Light synergy! Cure recovery doubled!");
    }
    addWaveTime(recoveryAmount);
    logMessage(`⏳ ${this.name} restores ${recoveryAmount} seconds to the wave timer.`);
    spellHandState.lastHeroSpellResonance = this.resonance;
    emit("healTriggered", { 
      amount: recoveryAmount,
      source: "heroSpell",
      sourceCharacter: null
    });
  }
},
{
  id: "sparks",
  name: "Sparks",
  resonance: "air",
  gemCost: 3,
  tier: 1,
  get skillLevel() {
    const library = state.buildings.find(c => c.id === 'library');
    return library ? library.level : 1;
  },
  classSkillLevel: null, // used during active casting
  unlocked: true,
  description: "Releases 4 spark charges that each strike a random enemy. Consecutive Sparks increase damage.",
  icon: "assets/images/icons/chain.png",
  attacker: null,
  active: false,
  sparksRemaining: 0,
  remainingDelay: 0,

  activate: function (modifiedLevel=this.skillLevel, caster=null) {
    applyVisualEffect('light-flash', 0.4);
    logMessage("⚡ Casting Spark!");
    this.classSkillLevel = modifiedLevel;
    this.attacker = caster;
    // ===== COMBO STACK HANDLING =====
    if (spellHandState.lastHeroSpellId === this.id) {
      spellHandState.sparkComboCount = Math.min(spellHandState.sparkComboCount + 1, 5);
    } else {
      spellHandState.sparkComboCount = 1;
    }

    const comboMult = Math.pow(1.5, spellHandState.sparkComboCount - 1);
    this.currentComboMult = comboMult;

    if (spellHandState.sparkComboCount > 1) {
      logMessage(`⚡ Combo Spark x${spellHandState.sparkComboCount}! Damage ×${comboMult.toFixed(2)}`);
    }

    // Prepare spark volleys
    this.active = true;
    this.sparksRemaining = 4;
    this.remainingDelay = 0; // fire first spark immediately

    if (!state.activeHeroSpells) state.activeHeroSpells = [];
    state.activeHeroSpells.push(this);

    spellHandState.lastHeroSpellId = this.id;
    spellHandState.lastHeroSpellResonance = this.resonance;
  },

  update: function (delta) {
    if (!this.active) return;

    this.remainingDelay -= delta;
    if (this.remainingDelay <= 0 && this.sparksRemaining > 0) {
      this.castSpark();
      this.sparksRemaining--;
      this.remainingDelay = 0.12; // delay between sparks
    }

    if (this.sparksRemaining <= 0) {
      this.active = false;
      const i = state.activeHeroSpells.indexOf(this);
      if (i !== -1) state.activeHeroSpells.splice(i, 1);
    }
  },

  castSpark: function () {
    const skillDamageRatio = getSkillDamageRatio(this.id, state.currentWave, this.classSkillLevel);
    
    const target = getRandomEnemy(); // your provided function
    if (!target) {
      logMessage("⚡ Spark fizzles — no enemies!");
      return;
    }

    const { enemy, row, col } = target;
    let skillDamageObject;
    if (this.attacker === null){ 
      skillDamageObject = calculateHeroSpellDamage(this.resonance, skillDamageRatio, target);
    } else {
      skillDamageObject = calculateSkillDamage(this.attacker, this.resonance, skillDamageRatio, target);     
    }
    //console.log(`combo: ${skillDamageObject.damage}`);
    
    const dmg = skillDamageObject.damage * this.currentComboMult;
    skillDamageObject.damage = dmg;
    damageEnemy(enemy, skillDamageObject, this.resonance);
    handleSkillAnimation("sparks", row, col);
    showFloatingDamage(row, col, skillDamageObject);
    //updateEnemiesGrid();
  },
},
{
  id: "poisonSpray",
  name: "Poison Spray",
  resonance: "poison",
  get skillLevel() {
    const library = state.buildings.find(c => c.id === 'library');
    return library ? library.level : 1;
  },
  gemCost: 1,
  tier: 1,
  unlocked: true,
  description: "A weak poison spray effecting a 2x2 grid.",
  icon: "assets/images/icons/breath.png",

  activate: function () {
    
    const activeEnemies = getActiveEnemies();
    if (activeEnemies.length === 0) {
      logMessage(`No enemies available for ${this.name}`);
      return;
    }
    const skillDamageRatio = getSkillDamageRatio(this.id, state.currentWave);
    // Pick a random active enemy as the explosion origin
    const randomEnemy = activeEnemies[Math.floor(Math.random() * activeEnemies.length)];
    //console.log(`Fireball targets enemy at (${randomEnemy.position.row}, ${randomEnemy.position.col})`);
    let { row, col } = randomEnemy.position;
    //console.log(`Enemy position: row ${row}, col ${col}`);
    const numRows = state.enemies.length;
    const numCols = state.enemies[0].length;

    // Adjust the top-left corner of the 2x2 zone so it stays within bounds
    // The zone covers: (baseRow, baseCol), (baseRow+1, baseCol), (baseRow, baseCol+1), (baseRow+1, baseCol+1)
    let baseRow = row;
    let baseCol = col;

    if (baseRow === numRows - 1) baseRow--; // shift up if on bottom edge
    if (baseCol === numCols - 1) baseCol--; // shift left if on right edge

    // Collect enemies in that adjusted 2x2 zone
    const targets = [];
    for (let r = baseRow; r < baseRow + 2; r++) {
      for (let c = baseCol; c < baseCol + 2; c++) {
        const enemy = state.enemies[r][c];
        if (enemy && enemy.hp > 0) {
          targets.push({ enemy, row: r, col: c });
        }
      }
    }

    // Apply damage + effects
    targets.forEach(({ row, col }) => {
      const enemy = state.enemies[row][col];
      const skillDamageObject = calculateHeroSpellDamage(this.resonance, skillDamageRatio, enemy);
      const damage = skillDamageObject.damage;
      applyDOT(enemy, this.resonance, skillDamageObject.damage, 8);
      handleSkillAnimation("poisonFlask", row, col);
      //if (enemy.hp <= 0) updateEnemiesGrid();
    });
  spellHandState.lastHeroSpellResonance = this.resonance;  
  },
},
{
  id: "rockBlast",
  name: "Rock Blast",
  resonance: "earth",
  classSkillLevel: null, // used during active casting
  get skillLevel() {
    const library = state.buildings.find(c => c.id === 'library');
    return library ? library.level : 1;
  },
  gemCost: 1,
  tier: 1,
  unlocked: true,
  description: "A boulder effecting a 2x2 grid.",
  icon: "assets/images/icons/earthquake.webp",
  attacker: null,
  activate: function (modifiedLevel = this.skillLevel, caster=null) {
    this.classSkillLevel = modifiedLevel;
    this.attacker = caster;
    const activeEnemies = getActiveEnemies();
    if (activeEnemies.length === 0) {
      logMessage(`No enemies available for ${this.name}`);
      return;
    }
    
    // Pick a random active enemy as the explosion origin
    const randomEnemy = activeEnemies[Math.floor(Math.random() * activeEnemies.length)];
    //console.log(`Fireball targets enemy at (${randomEnemy.position.row}, ${randomEnemy.position.col})`);
    let { row, col } = randomEnemy.position;
    //console.log(`Enemy position: row ${row}, col ${col}`);
    const numRows = state.enemies.length;
    const numCols = state.enemies[0].length;

    // Adjust the top-left corner of the 2x2 zone so it stays within bounds
    // The zone covers: (baseRow, baseCol), (baseRow+1, baseCol), (baseRow, baseCol+1), (baseRow+1, baseCol+1)
    let baseRow = row;
    let baseCol = col;

    if (baseRow === numRows - 1) baseRow--; // shift up if on bottom edge
    if (baseCol === numCols - 1) baseCol--; // shift left if on right edge

    // Collect enemies in that adjusted 2x2 zone
    const targets = [];
    for (let r = baseRow; r < baseRow + 2; r++) {
      for (let c = baseCol; c < baseCol + 2; c++) {
        const enemy = state.enemies[r][c];
        if (enemy && enemy.hp > 0) {
          targets.push({ enemy, row: r, col: c });
        }
      }
    }
    if (targets.length > 0){
      if (targets.length = 3) this.tier = 2;
      if (targets.length = 4) this.tier = 3;
      console.log(this.tier);
    }
    const skillDamageRatio = getSkillDamageRatio(this.id, state.currentWave, this.classSkillLevel);
    shakeScreen(500, 10);
    // Apply damage + effects
    targets.forEach(({ row, col }) => {
      const enemy = state.enemies[row][col];
      let skillDamageObject;
      if (this.attacker === null){ 
        skillDamageObject = calculateHeroSpellDamage(this.resonance, skillDamageRatio, enemy);
      } else {
        skillDamageObject = calculateSkillDamage(this.attacker, this.resonance, skillDamageRatio, enemy);     
      }
      
      damageEnemy(enemy, skillDamageObject, this.resonance);
      showFloatingDamage(row, col, skillDamageObject);  
      //if (enemy.hp <= 0) updateEnemiesGrid();
    });
  spellHandState.lastHeroSpellResonance = this.resonance;  
  },
},
{
  id: "falconer",
  name: "Falconer",
  resonance: "physical",
  get skillLevel() {
    const library = state.buildings.find(c => c.id === 'library');
    return library ? library.level : 1;
  },
  classSkillLevel: null, // used during active casting
  gemCost: 2,
  tier: 2,
  unlocked: true,
  description: "Send a trained falcon to strike the weakest enemy.",
  icon: "assets/images/icons/moonbeam.png",
  attacker: null,
  activate: function (modifiedLevel = this.skillLevel, caster=null) {
    this.classSkillLevel = modifiedLevel;
    this.attacker = caster;
    const skillDamageRatio = getSkillDamageRatio(this.id, state.currentWave, this.classSkillLevel);
    //applyVisualEffect('slash-flash', 0.4);
    logMessage("🦅 Falconer strikes!");

    const enemies = getActiveEnemies();
    if (!enemies || enemies.length === 0) {
      logMessage("🦅 No enemies to strike.");
      return;
    }

    // Find lowest HP enemy
    const target = enemies.reduce((low, e) => (e.hp < low.hp ? e : low), enemies[0]);
    if (!target) return;

    const row = target.position.row;
    const col = target.position.col;
    let skillDamageObject;
    if (this.attacker === null){ 
      skillDamageObject = calculateHeroSpellDamage(this.resonance, skillDamageRatio, target);
    } else {
      skillDamageObject = calculateSkillDamage(this.attacker, this.resonance, skillDamageRatio, target);     
    }

    damageEnemy(target, skillDamageObject, this.resonance);
    handleSkillAnimation("falconer", row, col);
    showFloatingDamage(row, col, skillDamageObject);
    if (spellHandState.lastHeroSpellResonance === "physical" && target.hp > 0) {
      applyDOT(target, this.resonance, skillDamageObject.damage/2, 5);
      }
    //if (target.hp <=0) updateEnemiesGrid();

    spellHandState.lastHeroSpellResonance = this.resonance;
  }
},
{
  id: "frostbite",
  name: "Frostbite",
  resonance: "water",
  tier: 1,
  get skillLevel() {
    const library = state.buildings.find(c => c.id === 'library');
    return library ? library.level : 1;
  },
  gemCost: 4,
  icon: "assets/images/icons/frostbite.webp",
  description: "Deals heavy water damage but is negated by fire type and fire counters.",

  activate: function () {
    
    const enemies = getActiveEnemies().filter(e => e.elementType !== "fire"); // fire immune
    if (enemies.length === 0) {
      logMessage("No valid targets for Frostbite!");
      return;
    }
    const skillDamageRatio = getSkillDamageRatio(this.id, state.currentWave);

    flashScreen("#a0d8f0", 800); // icy blue flash

    enemies.forEach(enemy => {
      const waterCount = enemy.counters["water"] || 0;
      const fireCount = enemy.counters["fire"] || 0;

      // Fire cancels water
      const remaining = Math.max(0, waterCount - fireCount);

      
      const bonus = remaining * 2; // remaining chill intensifies
      const skillDamageObject = calculateHeroSpellDamage(this.resonance, skillDamageRatio + bonus, enemy);
      
      damageEnemy(enemy, skillDamageObject, this.resonance);
      handleSkillAnimation("sparks", enemy.position.row, enemy.position.col);
      showFloatingDamage(enemy.position.row, enemy.position.col, skillDamageObject);
    

    });
    spellHandState.lastHeroSpellResonance = this.resonance;  
    logMessage("❄️ Frostbite chills the battlefield!");
  }
},
{
  id: "dragonsBreath",
  name: "Dragon's Breath",
  resonance: "dark",
  get skillLevel() {
    const library = state.buildings.find(c => c.id === 'library');
    return library ? library.level : 1;
  },
  gemCost: 6,
  tier: 4,
  unlocked: true,
  description: "Highest single target spell. Dragons are immune to its effects.",
  icon: "assets/images/icons/inferno.png",
  activate: function () {
    
    const activeEnemies = getActiveEnemies().filter(e => e.type !== "dragon");
    if (activeEnemies.length === 0) {
      logMessage(`No valid targets for ${this.name}`);
      return;
    }
    const skillDamageRatio = getSkillDamageRatio(this.id, state.currentWave) + 12;
    // Pick a random active enemy as the target
    const randomEnemy = activeEnemies[Math.floor(Math.random() * activeEnemies.length)];
    const { row, col } = randomEnemy.position;
    const skillDamageObject = calculateHeroSpellDamage(this.resonance, skillDamageRatio, randomEnemy);
    damageEnemy(randomEnemy, skillDamageObject, this.resonance);
    handleSkillAnimation("flameArch", row, col);
    showFloatingDamage(row, col, skillDamageObject);
    if (randomEnemy.hp <=0) updateEnemiesGrid();
    spellHandState.lastHeroSpellResonance = this.resonance;  
    logMessage(`🐉 Dragon's Breath scorches the enemy at (${row}, ${col})!`);
  }
},
{
  id: "prismaticLight",
  name: "Prismatic Light",
  resonance: "light",
  gemCost: 3,
  tier: 4,
  get skillLevel() {
    const library = state.buildings.find(c => c.id === 'library');
    return library ? library.level : 1;
  },
  classSkillLevel: null, // used during active casting
  unlocked: true,
  description: "Targets damage in a row. Deals more damage if enemy has more light counters than other counter types.",
  icon: "assets/images/icons/brilliant.png",
  active: false,
  attacker: null,
  activate: function (target=null, modifiedLevel=null, caster=null) {
    this.attacker = caster;
    this.classSkillLevel = modifiedLevel;
    let skillTarget=target;
    if (skillTarget === null) skillTarget = getRandomEnemy().enemy;
    //console.log(skillTarget);
    const enemies = getEnemiesInColumn(skillTarget.position.col);
    //console.log(enemies);
    if (!enemies) return;
    
    // Apply light flash effect to all enemies
    if (state.activePanel === 'panelArea') {
      //console.log('light flash');
      applyVisualEffect('light-flash', 0.6);
    }

    enemies.forEach(({enemy, row, col}) => {
      // Ensure enemy.counters exists
      //console.log(enemy);
      if (!enemy.counters) return;

      const counters = enemy.counters;
      const lightCount = counters.light || 0;

      // Check if light has a strictly higher value than all other counters
      const lightIsHighest = Object.entries(counters).every(([element, count]) => {
        if (element === 'light') return true; // skip comparing light to itself
        return lightCount > count;
      });

      // If light dominates, boost damage tier
      const modifiedTier = lightIsHighest ? 5 : null;
      if (modifiedTier!== null) this.tier = modifiedTier;
      console.log(modifiedTier);
      // Now apply damage
      const skillDamageRatio = getSkillDamageRatio(this.id, state.currentWave, this.classSkillLevel);
      let skillDamageObject;
      if (this.attacker === null){ 
        skillDamageObject = calculateHeroSpellDamage(this.resonance, skillDamageRatio, enemy);
      } else {
        skillDamageObject = calculateSkillDamage(this.attacker, this.resonance, skillDamageRatio, enemy);     
      }
      damageEnemy(enemy, skillDamageObject, this.resonance);
      showFloatingDamage(row, col, skillDamageObject);
      if (enemy.hp <=0) updateEnemiesGrid();
    });

  }
},
{
  id: "rage",
  name: "Rage",
  resonance: "physical",
  tier: 2,
  get skillLevel() {
    const library = state.buildings.find(c => c.id === 'library');
    return library ? library.level : 1;
  },
  icon: "assets/images/icons/inferno.png",
  description: "Unleashes fury upon a full row. Each 10 seconds of sustained combat boosts damage further until the wave ends.",
  unlocked: true,
  classSkillLevel: null, // used during active casting
  active: false,
  currentRow: 0,
  rageBonus: 0,            // percent damage multiplier (e.g. 0.2 = +20%)
  elapsedWaveTime: 0,      // counts actual combat seconds
  lastBonusThreshold: 0,   // track when next +10s boost applies
  attacker: null,
  
  /**
   * Called once when player activates Rage skill
   */
  activate: function (modifiedLevel = this.skillLevel, caster=null) {
    if (this.active) return; // can't double-cast
    //console.log("minotaur rage active");
    this.attacker = caster;
    this.classSkillLevel = modifiedLevel;

    // Reset row target to random or strongest enemy row
    this.currentRow = this.pickTargetRow();

    logMessage("💢 Minotaur bellows in fury!");
    applyVisualEffect("rage-flash", 0.6);

    this.active = true;
    this.castRageStrike(); // first strike immediately

    // Register for delta loop updates
    if (!state.activeHeroSpells) state.activeHeroSpells = [];
    state.activeHeroSpells.push(this);
  },

  /**
   * Updates every frame
   */
  update: function (delta) {
    if (!this.active) return;
    //console.log("minotaur rage update");
    // Add elapsed time only if wave is active and not paused
    if (state.activeWave) {
      this.elapsedWaveTime += delta;

      // Every 10 seconds => increase bonus
      const threshold = Math.floor(this.elapsedWaveTime / 10);
      if (threshold > this.lastBonusThreshold) {
        this.lastBonusThreshold = threshold;
        this.rageBonus += 0.25; // +25% each 10s (tune as needed)
        logMessage(`💢 Minotaur’s fury intensifies! +${(this.rageBonus * 100).toFixed(0)}% power`);
        //applyVisualEffect("rage-surge", 0.3);
      }
    }

    // Optionally: repeat attack every few seconds
    // (makes the Rage feel ongoing, not just one hit)
    if (!this.attackCooldown) this.attackCooldown = 2; // seconds between slams
    this.attackCooldown -= delta;
    if (this.attackCooldown <= 0) {
      this.castRageStrike();
      this.attackCooldown = 2;
    }
  },

  /**
   * Performs the actual row-wide attack
   */
  castRageStrike: function () {
    const enemies = getEnemiesInRow(this.currentRow);
    if (enemies.length === 0) {
      //logMessage("💢 Rage fizzles — no enemies in that row!");
      this.currentRow = this.pickTargetRow();
      //this.active = false;
      //this.cleanup();
      return;
    }

    const baseRatio = getSkillDamageRatio(this.id, state.currentWave, this.classSkillLevel);
    const totalMult = 1 + this.rageBonus;
    //console.log("minotaur rage striking");
    for (const { enemy, row, col } of enemies) {
      let dmgObj;
      if (this.attacker === null){
        dmgObj = calculateHeroSpellDamage(this.resonance, baseRatio, enemy);
      } else {
        dmgObj = calculateSkillDamage(this.attacker, this.resonance, baseRatio, enemy);
      }
        
      dmgObj.damage *= totalMult;

      damageEnemy(enemy, dmgObj, this.resonance);
      showFloatingDamage(row, col, dmgObj);
      handleSkillAnimation("rage", row, col);
      if (enemy.hp <=0) updateEnemiesGrid();
    }

    logMessage(`💢 Minotaur slams row ${this.currentRow + 1}! Damage ×${totalMult.toFixed(2)}`);
  },

  /**
   * Pick a target row (e.g. random or most populated)
   */
  pickTargetRow: function () {
    if (state.enemies.length<1) return;
    // Choose the row with most enemies alive
    let maxCount = 0;
    let chosen = 0;
    for (let r = 0; r < state.enemies.length; r++) {
      const count = getEnemiesInRow(r).length;
      if (count > maxCount) {
        maxCount = count;
        chosen = r;
      }
    }
    return chosen;
  },

  /**
   * Reset when wave ends or spell completes
   */
  cleanup: function () {
    if (!state.activeHeroSpells) return;
    console.log('minotaur rage cleaning up');
    this.active = false;
    this.elapsedWaveTime = 0;
    this.rageBonus = 0;
    this.lastBonusThreshold = 0;
    this.attackCooldown = 0;
    const i = state.activeHeroSpells.indexOf(this);
    if (i !== -1) state.activeHeroSpells.splice(i, 1);
  },
},
{
  id: "chainLightning",
  name: "Chain Lightning",
  resonance: "air",
  gemCost: 5,
  tier: 3,
  icon: "assets/images/icons/chain.png",
  description: "Strikes a random enemy, forking between nearby enemies of the same element with dazzling arcs.",
  classSkillLevel: null,
  get skillLevel(){
    const character = partyState.party.find(c => c.id === this.class);
    return character ? character.level : 1; // or some other default value
  },
  active: false,
  visited: new Set(),
  remainingDelay: 0,
  chainQueue: [],
  attacker: null,

  activate: function (modifiedLevel = this.skillLevel, caster=null) {
    //flashScreen('white', 600);
    logMessage("⚡ Chain Lightning crackles through the air!");
    this.attacker = caster;
    this.classSkillLevel = modifiedLevel;
    this.active = true;
    this.visited.clear();
    this.chainQueue = [];

    const start = getRandomEnemy();
    if (!start) {
      logMessage("⚡ Chain Lightning fizzles — no targets!");
      this.active = false;
      return;
    }

    const { enemy, row, col } = start;
    this.chainQueue.push({ enemy, row, col });
    this.remainingDelay = 0;

    if (!state.activeHeroSpells) state.activeHeroSpells = [];
    state.activeHeroSpells.push(this);
  },

  update: function (delta) {
    if (!this.active) return;

    this.remainingDelay -= delta;
    if (this.remainingDelay > 0) return;

    if (this.chainQueue.length === 0) {
      this.finishCast();
      return;
    }

    // Process all queued targets at this "jump" level (fork)
    const currentBatch = [...this.chainQueue];
    this.chainQueue = [];

    for (const { enemy, row, col } of currentBatch) {
      if (!enemy || enemy.hp <= 0 || this.visited.has(enemy.uniqueId)) continue;
      this.strikeTarget(enemy, row, col);
    }

    // Apply delay before next wave of forks
    this.remainingDelay = 0.18;
  },

  strikeTarget: function (enemy, row, col) {
    this.visited.add(enemy.uniqueId);
    let skillDamageObject;
    const skillDamageRatio = getSkillDamageRatio(this.id, state.currentWave, this.classSkillLevel);
    if (this.attacker === null){ 
      skillDamageObject = calculateHeroSpellDamage(this.resonance, skillDamageRatio, enemy);
    } else {
      skillDamageObject = calculateSkillDamage(this.attacker, this.resonance, skillDamageRatio, enemy);     
    }
    damageEnemy(enemy, skillDamageObject, this.resonance);
    showFloatingDamage(row, col, skillDamageObject);
    handleSkillAnimation("chainLightning", row, col);

    // Find all adjacent same-element targets
    const forks = this.findNextTargets(row, col, enemy.elementType);
    if (forks.length > 0) {
      logMessage(`⚡ Lightning forks to ${forks.length} nearby target${forks.length > 1 ? "s" : ""}!`);
      this.chainQueue.push(...forks);
    }
  },

  findNextTargets: function (row, col, elementType) {
    const adjacent = getAdjacentEnemies(row, col);
    return adjacent.filter(({ enemy }) =>
      enemy.elementType === elementType &&
      enemy.hp > 0 &&
      !this.visited.has(enemy.uniqueId)
    );
  },

  finishCast: function () {
    this.active = false;
    const i = state.activeHeroSpells.indexOf(this);
    if (i !== -1) state.activeHeroSpells.splice(i, 1);
    logMessage("⚡ Chain Lightning fades out.");
  },
}


];

export function replaceSpell(){
        // Don’t overfill the hand
      if (spellHandState.hand.length >= spellHandState.maxHandSize) return;
    
      const libraryLevel = getBuildingLevel("library");
      const unlockedSpells = heroSpells.filter(spell => (spell.tier || 1) <= libraryLevel);
    
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
        logMessage(`New hero spell acquired: ${selectedSpell.name}`);
    
      emit("spellHandUpdated");
      updateSpellDock();
}

// Get all enemies on the *outside edge* of the grid (but not center)
function getEnemiesOnOuterRing() {
  const enemies = [];
  const numRows = state.enemies.length;
  const numCols = state.enemies[0].length;

  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      const isEdge = row === 0 || row === numRows - 1 || col === 0 || col === numCols - 1;
      const isCenter = row === Math.floor(numRows / 2) && col === Math.floor(numCols / 2);
      const enemy = state.enemies[row][col];

      if (isEdge && !isCenter && enemy && enemy.hp > 0) {
        enemies.push({ enemy, row, col });
      }
    }
  }
  return enemies;
}

let i = 0;
function deterministicChance(probability) {
  i = (i + 1) % 4; // 4 steps in the cycle
  return i === 0; // 25% chance
}
