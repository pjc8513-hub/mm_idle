import { state, partyState } from "../state.js";
import { summonsState} from "../systems/summonSystem.js";
import { emit, on } from "../events.js";
import { getActiveEnemies, getEnemiesInColumn, getEnemiesInRow, getRandomEnemy, calculateSkillDamage } from "../systems/combatSystem.js";
import { damageEnemy } from "../waveManager.js";
import { handleSkillAnimation } from "../systems/animations.js";
import { getEnemyCanvasPosition } from "../area.js";
import { floatingTextManager } from "../systems/floatingtext.js";
import { renderAreaPanel } from "../area.js";
import { applyDOT } from "../systems/dotManager.js";
import { logMessage } from "../systems/log.js";
import { addWaveTime, addTimeShield } from "../area.js";
import { applyVisualEffect } from "../systems/effects.js";
//import { createVampireMist, createRadiantBurst, createRadiantPulse, spawnRadiantBurst } from "../systems/radiantEffect.js";
import { heroSpells } from "./heroSpells.js";
import { addHeroBonus, getAbilityDamageRatio, updateTotalStats } from "../systems/math.js";
import { dungeonState } from "../dungeonMode.js";

on("summonExpired", handleSummonExpired);

function handleSummonExpired(summon){
  if (summon.name === "Vampire") {
    //console.log("handling vampire expired"); 
    
    // ✅ Find the ability in the array first
    const feastOfAges = abilities.find(a => a.id === "feastOfAges");
    
    // ✅ Then call the function on that ability
    if (feastOfAges && feastOfAges.onVampireExpire) {
      feastOfAges.onVampireExpire(summon);
    }
  } else if (summon.name === "Ghost Dragon") {
    //console.log("handling ghost dragon expired");
    const soulDetonation = abilities.find(a => a.id === "soulDetonation");
    if (soulDetonation && soulDetonation.onGhostDragonExpire){
      soulDetonation.onGhostDragonExpire(summon);
    }
  } else if (summon.name === "Water Elemental") {
    const frostBiteSpell = heroSpells.find(spell => spell.id === "frostbite")
    if (frostBiteSpell) {
      frostBiteSpell.activate();
    }
  } else if (summon.name === "Lesser Devil") {
    const eclipse = abilities.find(a => a.id === "eclipse");
    if (eclipse && eclipse.onLesserDevilExpire){
      console.log('handling lesserDevilExpire');
      eclipse.onLesserDevilExpire(summon);
    }
  }
}

export const abilities = [
    {
        id: "pummel",
        name: "Pummel",
        type: "passive",
        class: "fighter",
        description: "Adds bonus damage % in physical damage per attack to base damage until target changes",
        spritePath: null,  // does not have an animation
        cooldown: null, // passive skills do not have cooldown
        defaultBonus: 1,
        perLevelBonus: 0.10,
        applyPassive(attacker, target, context) {
            if (!context.sameTargetStreak || context.sameTargetStreak <= 0) return;

            // Gain scaling based on level
            const percentPerStack = this.defaultBonus + (attacker.level * this.perLevelBonus); 
            // Example lvl 30: 1 + (30 * 0.1) = 4% per stack

            // Cap stacks so we don't go infinite idle god mode
            const stacks = Math.min(context.sameTargetStreak, 50); // cap at 50 stacks

            // convert to multiplier
            const bonusMultiplier = 1 + (percentPerStack / 100) * stacks;

            context.damage *= bonusMultiplier;
        }
        
    },
    {
        id: "followThrough",
        name: "Follow Through",
        type: "active",
        resonance: "physical",
        tier: 1,
        get skillLevel(){
          const character = partyState.party.find(c => c.id === this.class);
          return character ? character.level : 1; // or some other default value
        },
        //description: `Deals ${skillBaseDamage}% of attack in physical damage to every enemy on the same column as target`,
        spritePath: 'assets/images/sprites/follow_through.png',
        cooldown: 7000,
        class: "fighter",
        activate: function (attacker, target, context) {
            if (!target) return;
            const skillDamageRatio = getAbilityDamageRatio(this.id, state.currentWave);
            //console.log(`[followThrough] ${Date.now()}`);
            // Deal damage to all enemies in target column
            const enemies = getEnemiesInColumn(target.position.col);
           // console.log("[followThrough] activated! target column: ", target.position.col);
           // console.log("[followThrough] enemies: ", enemies);
           //let reducer = 0;
          enemies.forEach(({ enemy, row, col }, index) => {
              const skillDamageObject = calculateSkillDamage(attacker, this.resonance, skillDamageRatio, enemy);
              let damageReducer = 1;
              if (index === 1) damageReducer = 0.75; // 25% reduction for the second pass
              if (index >= 2) damageReducer = 0.5; // 50% reduction for the third pass and onwards
              skillDamageObject.damage *= damageReducer;
              damageEnemy(enemy, skillDamageObject, this.resonance);
              handleSkillAnimation("followThrough", row, col);
              showFloatingDamage(row, col, skillDamageObject);
              if (!dungeonState.active && enemy.hp <= 0) renderAreaPanel(); 
          });
        }
          
    },
    {
      id: "flamePillar",
      name: "Flame Pillar",
      type: "active",
      resonance: "fire",
      tier: 1,
      get skillLevel(){
        const character = partyState.party.find(c => c.id === this.class);
        return character ? character.level : 1; // or some other default value
      },
      //skillBaseDamage: 180,
      //description: `Deals ${skillBaseDamage}% of attack in physical damage to every enemy on the same column as target`,
      spritePath: 'assets/images/sprites/flamePillar.webp',
      cooldown: 6500,
      class: "sorceress",
      activate: function (attacker, target, context) {
          if (!target) return;
          const skillDamageRatio = getAbilityDamageRatio(this.id, state.currentWave);
          //console.log(`[followThrough] ${Date.now()}`);
          // Deal damage to all enemies in target column
          const enemies = getEnemiesInColumn(target.position.col);
          // console.log("[followThrough] activated! target column: ", target.position.col);
          // console.log("[followThrough] enemies: ", enemies);
          enemies.forEach(({ enemy, row, col }) => {
              //console.log('[skill damage] skill base dmg: ', this.skillBaseDamge);
          //   console.log("[followThrough] damaging: ", enemy, attacker.stats.attack);
              const skillDamageObject = calculateSkillDamage(attacker, this.resonance, skillDamageRatio, enemy);
              //console.log('skillDamageObject: ', skillDamageObject);
              damageEnemy(enemy, skillDamageObject, this.resonance);
              handleSkillAnimation("flamePillar", row, col);
              showFloatingDamage(row, col, skillDamageObject); // show floating text
              //if (!dungeonState.active && enemy.hp <= 0) renderAreaPanel();
          });
      }
        
    },    
    {
        id: "speedBoost",
        name: "Speed Boost",
        type: "passive",
        description: "Gains 10% attack speed after 3 attacks on the same target",
        spritePath: null,
        cooldown: null,
        defaultBonus: 0.10,
        class: "fighter"        
    },
    {
        id: "weakSpot",
        name: "Weak Spot",
        type: "passive",
        class: "rogue",
        description: "Adds bonus damage to critical hits per physical counter on enemy",
        spritePath: null,  // does not have an animation
        cooldown: null, // passive skills do not have cooldown
        defaultBonus: 5,
        perLevelBonus: 0.10,
        applyPassive: function (attacker, target, context) {
            const levelBonus = this.defaultBonus + (attacker.level * this.perLevelBonus);
            // Ensure counters and level are valid
            const physicalCounters = target.counters.physical || 0;
            if (context.isCrit && target.counters && attacker.level !== undefined &&
                physicalCounters > 0) {                
                const bonusMultiplier = 1 + (levelBonus / 100) * physicalCounters;
                context.damage *= bonusMultiplier;
                //console.log(`[Rogue weak spot] Physical counters: ${physicalCounters} finalBonus: ${finalBonus} context.damage: ${context.damage}`);
                // Reset physical counters
                target.counters.physical = 0; // Or delete target.counters.physical;
            }
        }        
    },

{
  id: "poisonFlask",
  name: "Poison Flask",
  type: "active",
  resonance: "poison",
  tier: 1,
  get skillLevel(){
    const character = partyState.party.find(c => c.id === this.class);
    return character ? character.level : 1; // or some other default value
  },
  spritePath: "assets/images/sprites/poison_flask.png",
  cooldown: 8500,
  class: "rogue",
  activate: function (attacker, target, context) {
    if (!target) return;
    const skillDamageRatio = getAbilityDamageRatio(this.id, state.currentWave);
    const randomEnemyObject = getRandomEnemy();
    if (!randomEnemyObject) return;

    const { enemy, row, col } = randomEnemyObject;

    const skillDamageObject = calculateSkillDamage(
      attacker,
      this.resonance,
      skillDamageRatio,
      enemy
    );

    applyDOT(enemy, "poison", skillDamageObject, 6, attacker);

    // 🧩 Apply all linked utility effects automatically
    applyUtilityEffects(attacker, this.id, enemy, row, col);

    handleSkillAnimation("poisonFlask", row, col);
  }
},

{
  id: "lethalDose",
  name: "Lethal Dose",
  type: "utility",
  class: "rogue",
  affects: ["poisonFlask"], // 💡 declares its target skills
  description: "Adds % of enemy's total health to poison flask skill as instant damage.",
  resonance: "poison",
  spritePath: null,
  cooldown: null,
  defaultBonus: 20,
  perLevelBonus: 0.10,
  applyUtility(enemy, attacker) {
    if (!enemy || !attacker) return { bonusPercent: 0, resonance: this.resonance };

    const totalPercent = partyState.elementalDmgModifiers.poison 
      + this.defaultBonus 
      + (this.perLevelBonus * attacker.level);

    const cappedPercent = Math.min(totalPercent, 8); // cap at 8% max HP
    const bonusDamage = enemy.currentHp * (cappedPercent / 100); // not max HP

    return {
      bonusDamage,
      percent: cappedPercent,
      resonance: this.resonance,
    };
  }

},

{
    id: "leadership",
    name: "Leadership",
    type: "passive",
    class: "knight",
    description: "Reduces all skill cooldowns by a small amount on autoattack.",
    spritePath: null,
    cooldown: null,
    defaultBonus: 200, // milliseconds reduced per auto-attack
    perLevelBonus: 10, // additional ms per level
    applyPassive: function (attacker) {
        //const amount = this.defaultBonus + (attacker.level * this.perLevelBonus);
        const amount = this.defaultBonus;
        // Simply reduce cooldowns - let updateSkills handle the rest
        partyState.party.forEach(member => {
            if (!member.skills) return;
            
            for (const skillId in member.skills) {
                const skillDef = abilities.find(a => a.id === skillId);
                const skillState = member.skills[skillId];

                // ✅ Add defensive check
                if (!skillDef) {
                    console.warn(`[leadership] Skill definition not found for: ${skillId}`);
                    continue;
                }
                
                if (skillDef.type === "active" && skillDef.cooldown) {
                    // Only reduce the cooldown, don't trigger or reset
                    // Only reduce if cooldown is still active (> 0)
                    // This prevents interfering with updateSkills' transition detection
                    if (skillState.cooldownRemaining > 0) {
                       // console.log('[leadership] ', skillId, 'before: ', skillState.cooldownRemaining);
                        skillState.cooldownRemaining = Math.max(0, skillState.cooldownRemaining - amount);
                       // console.log('[leadership]: ', skillId, 'after: ', skillState.cooldownRemaining);
                    }
                
                }
            }
        });
    }
    },
    {
        id: "flameArch",
        name: "Flame Arch",
        type: "active",
        resonance: "fire",
        tier: 1,
        get skillLevel(){
          const character = partyState.party.find(c => c.id === this.class);
          return character ? character.level : 1; // or some other default value
        },
        //description: `Deals ${skillBaseDamage}% of attack in fire damage to every enemy on the same row as target`,
        spritePath: 'assets/images/sprites/flame_arch.png',
        cooldown: 6500,
        class: "knight",
        activate: function (attacker, target, context) {
            if (!target) return;
            const skillDamageRatio = getAbilityDamageRatio(this.id, state.currentWave);
            // Deal damage to all enemies in target column
            const enemies = getEnemiesInRow(target.position.row);
           // console.log("[followThrough] activated! target column: ", target.position.col);
           // console.log("[followThrough] enemies: ", enemies);
            enemies.forEach(({ enemy, row, col }) => {
                //console.log('[skill damage] skill base dmg: ', this.skillBaseDamge);
           //   console.log("[followThrough] damaging: ", enemy, attacker.stats.attack);
                const skillDamageObject = calculateSkillDamage(attacker, this.resonance, skillDamageRatio, enemy);
                damageEnemy(enemy, skillDamageObject, this.resonance);
                handleSkillAnimation("flameArch", row, col);
                showFloatingDamage(row, col, skillDamageObject); // show floating text
            });
        }
    },
    {
        id: "zombieAmbush",
        name: "Zombie Ambush",
        type: "active",
        resonance: "undead",
        //skillBaseDamage: 180,
        tier: 2,
        get skillLevel(){
          const character = partyState.party.find(c => c.id === this.class);
          return character ? character.level : 1; // or some other default value
        },
        //description: `Deals ${skillBaseDamage}% of attack in undead damage to every enemy on the same column as target`,
        spritePath: 'assets/images/sprites/zombie_ambush.png',
        cooldown: 3500,
        class: "zombie",
        activate: function (attacker, target, context) {

            const randomEnemyObject = getRandomEnemy();
            if (!randomEnemyObject) return;
            const { enemy, enemyRow, enemyCol } = randomEnemyObject;
            //console.log(`[followThrough] ${Date.now()}`);
            // Deal damage to all enemies in target column
        //    console.log('[zombieAmbush] enemy: ', enemy);
            const enemies = getEnemiesInColumn(enemy.position.col);
           // console.log("[zombieAmbush] activated! target column: ", enemy.position.col);
           // console.log("[zombieAmbush] enemies: ", enemies);
            enemies.forEach(({ enemy, row, col }) => {
                //console.log('[skill damage] skill base dmg: ', this.skillBaseDamge);
           //   console.log("[followThrough] damaging: ", enemy, attacker.stats.attack);
                const skillDamageRatio = getAbilityDamageRatio(this.id, state.currentWave);
                const skillDamageObject = calculateSkillDamage(attacker, 
                  this.resonance, 
                  skillDamageRatio, 
                  enemy);
                damageEnemy(enemy, skillDamageObject, this.resonance);
                handleSkillAnimation("zombieAmbush", row, col);
                showFloatingDamage(row, col, skillDamageObject); // show floating text
                applyUtilityEffects(attacker, this.id, enemy, row, col);
            });
        }
          
    },
  {
    id: "plague",
    name: "Plague",
    type: "utility",
    class: "zombie",
    affects: ["zombieAmbush"],
    description: "Has a chance to apply poison DOT to enemies hit by Zombie Ambush.",
    spritePath: null,
    cooldown: null,
    defaultBonus: 200,
    perLevelBonus: 0.25,
    resonance: "poison",
    applyUtility(enemy, attacker) {
      if (!enemy || !attacker) return { bonusDamage: 0, resonance: this.resonance };

      const chancePercent = 10 + attacker.level; // 10% base + 1% per level
      const roll = Math.random() * 100;

      if (roll <= chancePercent) {
        const bonusPercent = partyState.elementalDmgModifiers.poison + this.defaultBonus + (this.perLevelBonus * attacker.level);
        const finalDamage = Math.round((bonusPercent / 100) * partyState.heroBaseStats.attack);
        const skillDamage = calculateSkillDamage(attacker, this.resonance, finalDamage, enemy);

        applyDOT(enemy, this.resonance, skillDamage, 8, attacker);

        logMessage(`${attacker.name}'s ${this.name} infects ${enemy.name} with poison!`, "info");
      //  console.log(`[Plague] DOT applied to ${enemy.name}: ${finalDamage} poison over 8s`);
      }

      // Return zero bonusDamage to avoid triggering extra damage logic
      return { bonusDamage: 0, resonance: this.resonance };
    }
},
// content/abilities.js
{
  id: "heal",
  name: "Heal",
  type: "passive",
  class: "cleric",
  description: "Restores 5 secs + 1 sec per class level (max 40 secs) to the clock the first time a column is cleared during a wave. Deals radiant damage to all enemies whenever any heal is performed.",
  resonance: "light",
  spritePath: null,
  cooldown: null,
  defaultRestore: 5,
  perLevelBonus: 1,
  //skillBaseDamage: 250,
  tier: 2,
  get skillLevel(){
    const character = partyState.party.find(c => c.id === this.class);
    return character ? character.level : 1; // or some other default value
  },
  triggeredThisWave: false, // track per wave

  // Triggered ONLY on column clear (once per wave)
  triggerOnColumnClear: function (context) {
    if (this.triggeredThisWave) return; // only once per wave
    console.log('[cleric] column cleared, triggering heal');
    const cleric = partyState.party.find(c => c.id === "cleric");
    if (!cleric) return;
    
    const restoreAmount = Math.min(this.defaultRestore + cleric.level * this.perLevelBonus, 40);
    addWaveTime(restoreAmount);
    this.triggeredThisWave = true;
    
    // Emit the heal event - this will trigger the damage
    emit("healTriggered", { 
      amount: restoreAmount,
      source: "cleric",
      sourceCharacter: cleric
    });
  },

  // Triggered ANY TIME a heal happens (no wave limit)
  triggerOnHeal: function(healEvent) {
    const cleric = partyState.party.find(c => c.id === "cleric");
    if (!cleric) return;
    const angel = summonsState.active.find(s => s.templateId === "angel");
    if (angel) {
      angel.duration += 10; // refresh angel duration by 10s per heal
      // Optionally cap it at maxDuration
      angel.duration = Math.min(angel.duration, angel.maxDuration);
    }
    
    /*
    // Create radiant pulse effect
    if (state.activePanel === "panelArea"){
      //createRadiantPulse();
      spawnRadiantBurst()
    }
    */

    // Apply light flash effect to all enemies
    if (state.activePanel === 'panelArea') {
      //console.log('light flash');
      applyVisualEffect('light-flash', 0.6);
    }

    // Deal damage to all enemies
    for (let row = 0; row < state.enemies.length; row++) {
      for (let col = 0; col < state.enemies[row].length; col++) {
        const enemy = state.enemies[row][col];
        if (!enemy || enemy.hp <= 0) continue;
        let modifiedTier = null;
        if (enemy.type === "undead" || enemy.elementType === "undead") modifiedTier = 5;
        const skillDamageRatio = getAbilityDamageRatio(this.id, state.currentWave, modifiedTier);
        const skillDamageObject = calculateSkillDamage(cleric, 
          this.resonance, 
          skillDamageRatio, 
          enemy);
        damageEnemy(enemy, skillDamageObject, this.resonance);
        
        // Trigger twice on undead
        /*
        if (enemy.type === "undead"){
          damageEnemy(enemy, skillDamage.damage, this.resonance);
        }
        */
        //console.log(`[soul cleric] healEvent dealt ${skillDamage.damage}`);      
        showFloatingDamage(row, col, skillDamageObject);
        enemy.strobeEffect = { duration: 0.4, elapsed: 0 };
        // Radiant burst effect
        /*
        if (state.activePanel === 'panelArea'){
          const pos = getEnemyCanvasPosition(row, col);
          if (pos) {
            createRadiantBurst(pos.x, pos.y);
          }
        }
        */
      }
    }
    
    console.log('[cleric] Radiant damage triggered by heal from:', healEvent.source);
  },
},
    {
        id: "summonAngel",
        name: "Summon Angel",
        type: "active",
        resonance: "light",
        //description: `Summons an Angel to fight alongside you for 15 seconds. Summon duration refreshed on any heal event`,
        cooldown: 20000,
        class: "cleric",
        activate: function () {
            const angel = partyState.party.find(c => c.id === "angel");
            if (angel) return; // already summoned
            emit("requestSummon", { summonKey: "angel", class: "cleric" });
        }
      },
      {
        id: "summonLesserDevil",
        name: "Summon Lesser Devil",
        type: "active",
        resonance: "dark",
        //description: `Summons an Angel to fight alongside you for 15 seconds. Summon duration refreshed on any heal event`,
        cooldown: 20000,
        class: "warlock",
        activate: function () {
            const lesserDevil = partyState.party.find(c => c.id === "lesserDevil");
            if (lesserDevil) return; // already summoned
            emit("requestSummon", { summonKey: "lesserDevil", class: "warlock" });
        }
      },

    {
        id: "feastOfAges",
        name: "Feast of Ages",
        type: "active",
        resonance: "undead",
        //skillBaseDamage: 180,
        tier: 3,
        get skillLevel(){
          const character = partyState.party.find(c => c.id === this.class);
          return character ? character.level : 1; // or some other default value
        },
        //description: `Deals ${skillBaseDamage}% of attack in undead damage to every enemy on the same column as target`,
        spritePath: 'assets/images/sprites/life_drain.png',
        cooldown: 5000,
        storedHP: 0,
        class: "vampire",
        activate: function (attacker, target, context) {
            const enemies = getActiveEnemies();
            if (!enemies.length) return;
            //let totalDrained = 0;
            enemies.forEach(enemy => {
              // Drain 5% of each enemy's current HP -- nay, 2%
              //const skillDamageRatio = getAbilityDamageRatio(this.id, state.currentWave);
              const drained = {
                damage: (enemy.hp * 0.02) + attacker.stats.attack,
                isCritical: false,
                resonance: null,
                multiplier: 0,
                elementalMatchup: null
              } 
              //console.log(`[vampire] drained each enemy for ${drained}`);
              damageEnemy(enemy, drained, this.resonance);
              //totalDrained += drained;
              handleSkillAnimation("feastOfAges", enemy.position.row, enemy.position.col);
              //showFloatingDamage(enemy.position.row, enemy.position.col, skillDamage); // show floating text
              });
          // Store drained HP for later conversion
          //if (!attacker.storedHP) return;
          //this.storedHP += totalDrained;

          // Small visual/log feedback
          //logMessage(`🩸 Vampire feasts, draining ${Math.round(totalDrained)} HP total.`);
        },

      onVampireExpire: function(summon){
        //console.log("💀 Vampire expires: releasing stored essence.");
          // Convert stored HP into time (e.g., 1s per 500 HP drained)
        //const secondsRestored = Math.floor(this.storedHP / 500);
        const secondsRestored = 5;
        //console.log(`Vampire returns ${secondsRestored}s of stolen time using ${this.storedHP} worth of storedHP.`);
        if (secondsRestored > 0) {
          addWaveTime(secondsRestored);
          logMessage(`⏳ Vampire returns ${secondsRestored}s of stolen time.`);

          // 🧛 Create the spooky mist effect
          /*
          if (state.activePanel === 'panelArea') {
            createVampireMist(secondsRestored);
          }
          */

          // Emit the heal event - this will trigger the damage
          emit("healTriggered", { 
            amount: secondsRestored,
            source: "vampire",
            sourceCharacter: summon
          });
        }
        this.storedHP = 0;
      }
          
    },
    {
      id: "soulDetonation",
      name: "Soul Detonation",
      type: "onExpire",
      class: "ghostDragon",
      description: "When Ghost Dragon expires, it explodes, dealing undead damage to all enemies based on their undead counters.",
      spritePath: null,
      cooldown: null,
      resonance: "undead",
      //defaultBonus: 300, // base % damage per counter
      tier: 2,
      get skillLevel(){
        const character = partyState.party.find(c => c.id === this.class);
        return character ? character.level : 1; // or some other default value
      },
      //perLevelBonus: 50, // extra % per level
      onGhostDragonExpire: function (summon) {
        const attacker = summon;
        const resonance = this.resonance;
        //const basePercent = this.defaultBonus + (this.perLevelBonus * (attacker.level || 1));
        applyVisualEffect('strobe-flash', 0.8);  // Ghost dragon
        //applyVisualEffect('dark-flash', 0.8);

        for (let row = 0; row < state.enemies.length; row++) {
          for (let col = 0; col < state.enemies[row].length; col++) {
            const enemy = state.enemies[row][col];
            if (!enemy || enemy.hp <= 0) continue;

            const undeadStacks = enemy.counters["undead"] || 0;
            if (undeadStacks <= 0) continue;
            const skillDamageRatio = getAbilityDamageRatio(this.id, state.currentWave);
            const damagePayload = calculateSkillDamage(attacker, 
              resonance, 
              skillDamageRatio * undeadStacks, 
              enemy);
            damageEnemy(enemy, damagePayload, resonance);
            showFloatingDamage(enemy.position.row, enemy.position.col, damagePayload);
            if (!dungeonState.active && enemy.hp <= 0) renderAreaPanel();
            //console.log(`[Soul Detonation] Triggered by ${attacker.name}, dealt ${damagePayload.damage} damage based on undead counters.`);
            // Reset undead counters
            enemy.counters["undead"] = 0;
          }
        }

        //console.log(`[Soul Detonation] Triggered by ${attacker.name}, dealt damage based on undead counters.`);
      }
  },
  {
  id: "blindingLight",
  name: "Blinding Light",
  type: "passive",
  class: "templar",
  description: "Creates a time shield whenever any heal is performed.",
  resonance: "light",
  spritePath: null,
  cooldown: null,
  perLevelBonus: 0.5,

  // Triggered ANY TIME a heal happens (no wave limit)
  triggerOnHeal: function(healEvent) {
    const templar = partyState.party.find(c => c.id === "templar");
    if (!templar) return;
    // Apply time shield
    const shieldAmount = Math.min(Math.floor(5 + (this.perLevelBonus * templar.level)), 10); // max 10s
    addTimeShield(shieldAmount);
    //console.log(`[templar] added time shield of ${shieldAmount}s on heal.`);
    
    logMessage(`⏳ Templar gains ${shieldAmount}s time shield from Blinding Light.`, "info");
    }
  },
    {
      // Tornado ability placeholder - used for spritepath for hero spell
        id: "tornado",
        name: "Tornado",
        type: "active",
        resonance: "air",
        skillBaseDamage: 180,
        //description: `Deals ${skillBaseDamage}% of attack in physical damage to every enemy on the same column as target`,
        spritePath: 'assets/images/sprites/tornado.webp',
    },
        {
      // sparks ability placeholder - used for spritepath for hero spell and archer class
        id: "sparks",
        name: "Sparks",
        type: "active",
        resonance: "air",
        get skillLevel(){
          const character = partyState.party.find(c => c.id === this.class);
          return character ? character.level : 1; // or some other default value
        },        
        get skillBaseDamage() {
          return 7 * partyState.heroBaseStats.attack;
        },
        cooldown: 8000,
        //description: `Deals ${skillBaseDamage}% of attack in physical damage to every enemy on the same column as target`,
        spritePath: 'assets/images/sprites/sparks.webp',
        class: "archer",
        activate: function() {
        const character = partyState.party.find(c => c.id === this.class);
        const sparksSpell = heroSpells.find(spell => spell.id === "sparks");
        //if (landslideSpell) console.log("[druid landslide] activating landslide hero spell");
        sparksSpell.activate(this.skillLevel, character);
      }
    },
    {
      // falconer ability placeholder - used for spritepath for hero spell and archer class
        id: "falconer",
        name: "Falconer",
        type: "active",
        resonance: "physical",
        get skillLevel(){
          const character = partyState.party.find(c => c.id === this.class);
          return character ? character.level : 1; // or some other default value
        },         
        get skillBaseDamage() {
          return 15 * partyState.heroBaseStats.attack;
        },
        cooldown: 11000,
        //description: `Deals ${skillBaseDamage}% of attack in physical damage to every enemy on the same column as target`,
        spritePath: 'assets/images/sprites/falcon.webp',
        class: "archer",
        activate: function() {
        const character = partyState.party.find(c => c.id === this.class);
        const falconerSpell = heroSpells.find(spell => spell.id === "falconer");
        //if (landslideSpell) console.log("[druid landslide] activating landslide hero spell");
        falconerSpell.activate(this.skillLevel, character);
      }
    },
    {
      id: "landslide",
      name: "Landslide",
      type: "active",
      resonance: "earth",
      skillBaseDamage: 200,
      spritePath: 'assets/images/sprites/flame_arch.png',
      cooldown: 8000,
      get skillLevel(){
          const character = partyState.party.find(c => c.id === this.class);
          return character ? character.level : 1; // or some other default value
      },
      class: "druid",
      activate: function() {
        const character = partyState.party.find(c => c.id === this.class);
        const landslideSpell = heroSpells.find(spell => spell.id === "landslide");
        //if (landslideSpell) console.log("[druid landslide] activating landslide hero spell");
        landslideSpell.activate(this.skillLevel, character);
      }
    },
    {
      id: "rockBlast",
      name: "Rock Blast",
      type: "active",
      resonance: "earth",
      skillBaseDamage: 200,
      spritePath: 'assets/images/sprites/flame_arch.png',
      cooldown: 8000,
      get skillLevel(){
          const character = partyState.party.find(c => c.id === this.class);
          return character ? character.level : 1; // or some other default value
      },
      class: "druid",
      activate: function() {
        const character = partyState.party.find(c => c.id === this.class);
        const rockBlastSpell = heroSpells.find(spell => spell.id === "rockBlast");
        //if (landslideSpell) console.log("[druid landslide] activating landslide hero spell");
        rockBlastSpell.activate(this.skillLevel, character);
      }
    },
    {
      id: "earthquake",
      name: "Earthquake",
      type: "active",
      resonance: "earth",
      skillBaseDamage: 200,
      spritePath: 'assets/images/sprites/flame_arch.png',
      cooldown: 22000,
      get skillLevel(){
          const character = partyState.party.find(c => c.id === this.class);
          return character ? character.level : 1; // or some other default value
      },
      class: "druid",
      activate: function() {
        const earthquake = heroSpells.find(spell => spell.id === "earthquake");
        //if (landslideSpell) console.log("[druid landslide] activating landslide hero spell");
        earthquake.activate();
      }
    },
    {
        id: "fireball",
        name: "Fireball",
        type: "active",
        resonance: "fire",
        get skillLevel(){
          const character = partyState.party.find(c => c.id === this.class);
          return character ? character.level : 1; // or some other default value
        },         
        cooldown: 8500,
        //description: `Deals ${skillBaseDamage}% of attack in physical damage to every enemy on the same column as target`,
        spritePath: 'assets/images/sprites/flame_arch.png',
        class: "lesserDevil",
        activate: function() {
        const fireballSpell = heroSpells.find(spell => spell.id === "fireball");
        //if (landslideSpell) console.log("[druid landslide] activating landslide hero spell");
        fireballSpell.activate(this.skillLevel);
      }
    },
      {
        id: "summonWaterElemental",
        name: "Summon Water Elemental",
        type: "active",
        resonance: "water",
        //description: `Summons a water element to fight alongside you for 10 seconds. Casts frostbite on expiration`,
        cooldown: 25000,
        class: "druid",
        activate: function () {
            const waterElemental = partyState.party.find(c => c.id === "waterElemental");
            if (waterElemental) return; // already summoned
            emit("requestSummon", { summonKey: "waterElemental", class: "druid" });
        }
      },
      {
        id: "splash",
        name: "Splash",
        type: "active",
        resonance: "water",
        tier: 1,
        get skillLevel(){
          const character = partyState.party.find(c => c.id === this.class);
          return character ? character.level : 1; // or some other default value
        },
        cooldown: 3000,
        spritePath: 'assets/images/sprites/sparks.webp',
        class: "waterElemental",
          activate: function (attacker) {
            
            const activeEnemies = getActiveEnemies();
            if (activeEnemies.length === 0) {
              logMessage(`No enemies available for ${this.name}`);
              return;
            }
        
            // Pick a random active enemy as the splash origin
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
              const skillDamageRatio = getAbilityDamageRatio(this.id, state.currentWave);
              const enemy = state.enemies[row][col];
              //console.log(skillDamageRatio);
              const skillDamageObject = calculateSkillDamage(attacker, this.resonance, skillDamageRatio, enemy);
              //console.log(skillDamageObject);
              
              damageEnemy(enemy, skillDamageObject, this.resonance);
              handleSkillAnimation("splash", row, col);
              showFloatingDamage(row, col, skillDamageObject);
              if (!dungeonState.active && enemy.hp <= 0) renderAreaPanel();
            });
          },
      },
    {
      id: "starFall",
      name: "starFall",
      type: "active",
      resonance: "air",
      skillBaseDamage: 200,
      spritePath: 'assets/images/sprites/follow_through.png',
      cooldown: 9000,
      //class: "angel",
      activate: function() {
        const starFallSpell = heroSpells.find(spell => spell.id === "starFall");
        //if (landslideSpell) console.log("[druid landslide] activating landslide hero spell");
        starFallSpell.activate();
      }
    },
    {
      id: "prismaticLight",
      name: "Prismatic Light",
      type: "active",
      resonance: "air",
      //skillBaseDamage: 200,
      tier: 4,
      get skillLevel(){
        const character = partyState.party.find(c => c.id === this.class);
        return character ? character.level : 1; // or some other default value
      },
      spritePath: 'assets/images/sprites/follow_through.png',
      cooldown: 8000,
      class: "angel",
      activate: function(attacker, target, context) {
        const character = partyState.party.find(c => c.id === this.class);
        const prismaticLight = heroSpells.find(spell => spell.id === "prismaticLight");
        //if (landslideSpell) console.log("[druid landslide] activating landslide hero spell");
        if (!target) return;
        prismaticLight.activate(target.enemy, this.skillLevel, character);
      }
    },
    {
      id: "rot",
      name: "rot",
      type: "active",
      resonance: "undead",
      //skillBaseDamage: 200,
      tier: 3,
      get skillLevel(){
        const character = partyState.party.find(c => c.id === this.class);
        return character ? character.level : 1; // or some other default value
      },
      spritePath: 'assets/images/sprites/follow_through.png',
      cooldown: 4500,
      class: "ghostDragon",
      activate: function() {
        const character = partyState.party.find(c => c.id === this.class);
        const rotSpell = heroSpells.find(spell => spell.id === "rot");
        //if (landslideSpell) console.log("[druid landslide] activating landslide hero spell");
        rotSpell.activate(this.skillLevel, character);
      }
    },
    {
    id: 'might',
    name: 'Might',
    cooldown: 14000,
    class: 'templar',
    buffAmount: 100,
    type: 'active',
    resonance: 'light',
    description: 'Increases attack for 7 seconds',
    active: 'false',
    remaining: 0,
    duration: 7,
    activate: function (){
    
      let duration = this.duration;
      // Apply visual
      applyVisualEffect("light-flash", 0.8);
      logMessage(`✨ ${this.name} activated!`);
      // Activate buff
      this.active = true;
      this.remaining = duration;
      // apply this buff
      addHeroBonus('attack', this.buffAmount);

    // Register buff for delta tracking
    if (!partyState.activeHeroBuffs) partyState.activeHeroBuffs = [];
    const existingBuff = partyState.activeHeroBuffs.find(b => b.id === this.id);
    if (!existingBuff) {
      partyState.activeHeroBuffs.push({
        id: this.id,
        remaining: this.remaining,
        onExpire: () => {
          // Restore original might
          partyState.heroBonuses.attack = partyState.heroBonuses.attack - this.buffAmount;
          updateTotalStats();
          console.log('bonuses:', partyState.heroBonuses);
          this.active = false;
          logMessage("⚡ Might has worn off.");
        },
      });
    }
    }
    },
    {
        id: "eclipse",
        name: "Eclipse",
        type: "active",
        resonance: "dark",
        //skillBaseDamage: 180,
        tier: 5,
        get skillLevel(){
          const character = partyState.party.find(c => c.id === this.class);
          return character ? character.level : 1; // or some other default value
        },
        //description: `Deals ${skillBaseDamage}% of attack in undead damage to every enemy on the same column as target`,
        spritePath: 'assets/images/sprites/life_drain.png',
        cooldown: 7500,
        class: "lesserDevil",
        onLesserDevilExpire: function (summon) {
            if (summon.name !== "Lesser Devil") return;
            const enemies = getActiveEnemies();
            if (!enemies.length) return;
            applyVisualEffect('strobe-flash', 0.8);  // Ghost dragon
            enemies.forEach(enemy => {
              const vulnerableTypes = ["elemental", "humanoid"];
              const vulnerableElements = ["light", "physical", "water", "earth"];
              if (
                  vulnerableTypes.includes(enemy.type) ||
                  vulnerableElements.includes(enemy.elementType)
                ) {
                const bonus = (vulnerableTypes.includes(enemy.type) && vulnerableElements.includes(enemy.elementType)) ? 2 : 1;
                const skillDamageRatio = getAbilityDamageRatio(this.id, state.currentWave);
                
                //console.log(skillDamageRatio);
                const skillDamageObject = calculateSkillDamage(summon, this.resonance, skillDamageRatio, enemy);
                skillDamageObject.damage *= bonus;
                console.log('eclipse damage: ', skillDamageObject.damage);
                
                damageEnemy(enemy, skillDamageObject, this.resonance);
                handleSkillAnimation("feastOfAges", enemy.position.row, enemy.position.col);
                showFloatingDamage(enemy.position.row, enemy.position.col, skillDamageObject);
                if (!dungeonState.active && enemy.hp <= 0) renderAreaPanel();
              }
            });
        }
    },
    {
        id: "smite",
        name: "Smite",
        type: "active",
        resonance: "light",
        //skillBaseDamage: 180,
        tier: 3,
        get skillLevel(){
          const character = partyState.party.find(c => c.id === this.class);
          return character ? character.level : 1; // or some other default value
        },
        //description: `Deals ${skillBaseDamage}% of attack in undead damage to every enemy on the same column as target`,
        spritePath: 'assets/images/sprites/sparks.webp',
        cooldown: 7500,
        class: "templar",
        activate: function (attacker, target, context) {
            const enemies = getActiveEnemies();
            if (!enemies.length) return;
            enemies.forEach(enemy => {
              const vulnerableTypes = ["undead", "demon"];
              const vulnerableElements = ["undead", "poison", "dark", "fire"];
              if (
                  vulnerableTypes.includes(enemy.type) ||
                  vulnerableElements.includes(enemy.elementType)
                ) {
                const bonus = (vulnerableTypes.includes(enemy.type) && vulnerableElements.includes(enemy.elementType)) ? 2 : 1;
                const skillDamageRatio = getAbilityDamageRatio(this.id, state.currentWave);
                
                //console.log(skillDamageRatio);
                const skillDamageObject = calculateSkillDamage(attacker, this.resonance, skillDamageRatio, enemy);
                skillDamageObject.damage *= bonus;
                console.log('smite damage: ', skillDamageObject.damage);
                
                damageEnemy(enemy, skillDamageObject, this.resonance);
                handleSkillAnimation("splash", enemy.position.row, enemy.position.col);
                showFloatingDamage(enemy.position.row, enemy.position.col, skillDamageObject);
                if (!dungeonState.active && enemy.hp <= 0) renderAreaPanel();
              }
            });
        }
    },
    {
    id: "rage",
      name: "Rage",
      type: "active",
      resonance: "physical",
      //skillBaseDamage: 200,
      tier: 3,
      get skillLevel(){
        const character = partyState.party.find(c => c.id === this.class);
        return character ? character.level : 1; // or some other default value
      },
      spritePath: 'assets/images/sprites/follow_through.png',
      cooldown: 2000,
      class: "minotaur",
      activate: function() {
        const character = partyState.party.find(c => c.id === this.class);
        //console.log('activating minotaur rage');
        const rage = heroSpells.find(spell => spell.id === "rage");
        //if (landslideSpell) console.log("[druid landslide] activating landslide hero spell");
        rage.activate(this.skillLevel, character);
      }
    },
        {
    id: "chainLightning",
      name: "Chain Lightning",
      type: "active",
      resonance: "air",
      //skillBaseDamage: 200,
      tier: 2,
      get skillLevel(){
        const character = partyState.party.find(c => c.id === this.class);
        return character ? character.level : 1; // or some other default value
      },
      spritePath: 'assets/images/sprites/sparks.webp',
      cooldown: 2000,
      class: "warlock",
      activate: function() {
        const character = partyState.party.find(c => c.id === this.class);
        console.log('activating chainLightning');
        const chainLightning = heroSpells.find(spell => spell.id === "chainLightning");
        //if (landslideSpell) console.log("[druid landslide] activating landslide hero spell");
        chainLightning.activate(this.skillLevel, character);
      }
    },
  {
      id: "incinerate",
      name: "Incinerate",
      type: "active",
      class: "warlock",
      description: "Totals all fire and air counters and deals damage based on total amount. Consumes all counters.",
      spritePath: 'assets/images/sprites/flamePillar.webp',
      cooldown: 18000,
      resonance: "fire",
      //defaultBonus: 300, // base % damage per counter
      tier: 3,
      get skillLevel(){
        const character = partyState.party.find(c => c.id === this.class);
        return character ? character.level : 1; // or some other default value
      },
      //perLevelBonus: 50, // extra % per level
      activate: function (attacker) {
        
        const resonance = this.resonance;
        //const basePercent = this.defaultBonus + (this.perLevelBonus * (attacker.level || 1));
        applyVisualEffect('strobe-flash', 0.8);  // Ghost dragon
        //applyVisualEffect('dark-flash', 0.8);

        for (let row = 0; row < state.enemies.length; row++) {
          for (let col = 0; col < state.enemies[row].length; col++) {
            const enemy = state.enemies[row][col];
            if (!enemy || enemy.hp <= 0) continue;
            const airStacks = enemy.counters["air"] || 0;
            const fireStacks = enemy.counters["fire"] || 0;
            if (fireStacks <= 0 && airStacks <= 0) continue;
            const skillDamageRatio = getAbilityDamageRatio(this.id, state.currentWave);
            const damagePayload = calculateSkillDamage(attacker, 
              resonance, 
              skillDamageRatio * (fireStacks + airStacks), 
              enemy);
            damageEnemy(enemy, damagePayload, resonance);
            handleSkillAnimation("flamePillar", row, col);
            showFloatingDamage(enemy.position.row, enemy.position.col, damagePayload);
            if (!dungeonState.active && enemy.hp <= 0) renderAreaPanel();
            //console.log(`[Soul Detonation] Triggered by ${attacker.name}, dealt ${damagePayload.damage} damage based on undead counters.`);
            // Reset undead counters
            enemy.counters = {};
          }
        }
      }
    },

];


export function showFloatingDamage(row, col, skillDamage) {
  if (state.activePanel !== "panelArea") return;
  const pos = getEnemyCanvasPosition(row, col);
  if (!pos) return;

  // 🧩 Normalize: allow passing a number or a full skillDamage object
  const dmgObj = typeof skillDamage === "number"
    ? { damage: skillDamage, isCritical: false, elementalMatchup: "neutral" }
    : skillDamage;

  floatingTextManager.showDamage(
    dmgObj.damage,
    pos.x - 20,
    pos.y - 10,
    dmgObj.isCritical
  );

  if (dmgObj.elementalMatchup !== "neutral") {
    floatingTextManager.showElementalFeedback(
      dmgObj.elementalMatchup,
      pos.x - 20,
      pos.y + 20
    );
  }
}

/*
// utilities.js - if you want to move it to its own module
import { abilities } from "./abilities.js"; // wherever your abilities array lives
import { damageEnemy } from "./combatSystem.js";
import { showFloatingDamage } from "./effects.js";
import { logMessage } from "./log.js";
*/
/**
 * Checks and applies any utility abilities that affect the given skill.
 * @param {object} attacker - The character using the skill.
 * @param {string} skillId - The ID of the skill being activated (e.g. "poisonFlask").
 * @param {object} enemy - The targeted enemy.
 * @param {number} row - Grid row of the enemy.
 * @param {number} col - Grid column of the enemy.
 */
export function applyUtilityEffects(attacker, skillId, enemy, row, col) {
  if (!attacker.skills) return;

  abilities.forEach(ability => {
    if (ability.type === "utility" && ability.affects?.includes(skillId)) {
      const utilityState = attacker.skills[ability.id];
      if (utilityState?.active && typeof ability.applyUtility === "function") {
        const response = ability.applyUtility(enemy, attacker);
        const bonusDamage = response.bonusDamage;
        const resonance = response.resonance;

        if (bonusDamage > 0) {
            /*
          const bonusSkillDamage = {
            damage: bonusDamage,
            isCritical: false,
            elementalMatchup: "neutral",
          };
          */
          const finalDamage = calculateSkillDamage(attacker, resonance, bonusDamage, enemy);
          damageEnemy(enemy, finalDamage);
          showFloatingDamage(row, col, finalDamage);

          logMessage(
            `${attacker.name}'s ${ability.name} triggers for ${finalDamage.damage} bonus damage!`,
            "success"
          );
         // console.log(
         //   `${attacker.name}'s ${ability.name} triggers for ${finalDamage.damage} bonus damage!`);
        }
      }
    }
  });
}
