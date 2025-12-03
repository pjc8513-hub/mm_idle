export const classes = [
    { id: "fighter", 
      name: "Fighter",
      level: 0, 
      goldCost: 10,
      gemCost: 0, 
      goldIncomePerHit: 0.5, 
      gemPerSecond: 0,
      buildingRequired: { id: "farm", level: 1 },
      hasAutoAttack: true,
      //image: "assets/images/classes/fighter.png",
      description: "Scrappy brawler that gains damage per hit to the same target and pressures columns.",
      abilities: [
        { id: "pummel", unlockLevel: 1, description: "Deals more damage in consecutive hits against the same target" },
        { id: "followThrough", unlockLevel: 1, active: false, description: "Attacks the current column of enemies", cooldown: 7000 },
        { id: "speedBoost", unlockLevel: 5, description: "Increases attack speed temporarily" }
      ],
      skills: {
        pummel: { active: true },
        followThrough: { cooldownRemaining: 7000 },
        speedBoost: { active: false, streak: 0 }
      },
      lastTarget: null,
      sameTargetStreak: 0,
      resonance: "physical",
        // How much of the hero's stats this class gets
      role: "dps",
      heroStatRatios: {
        hp: 1,      // 120% of hero HP
        attack: 1,  // 80% of hero attack
        defense: 0.6  // 60% of hero defense
      },
      
      // Class's own base stats (independent of hero)
      baseStats: {
        hp: 5,
        attack: 5,
        defense: 10,
        speed: 1.3,
        critChance: 0.15
      },
      
      // How much the class grows per level
      growthPerLevel: {
        hp: 0,
        attack: 2,
        defense: 3
      },
      //baseStats: { hp: partyState.heroStats.hp, attack: partyState.heroStats.attack, defense: 3, critChance: 0.15, speed: 1 },
      //growthPerLevel: { attack: 1, defense: 1 },
      attackCooldown: 0
    },
    { id: "knight", 
      name: "Knight", 
      goldCost: 20,
      gemCost: 0, 
      goldIncomePerHit: 0.5, 
      buildingRequired: { id: "barracks", level: 1 }, 
      lastTarget: null,
      sameTargetStreak: 0,
      resonance: "physical",
      hasAutoAttack: true,
        // How much of the hero's stats this class gets
      role: "support",
      heroStatRatios: {
        hp: 1.2,      // 120% of hero HP
        attack: 0.8,  // 80% of hero attack
        defense: 0.6  // 60% of hero defense
      },
      
      // Class's own base stats (independent of hero)
      baseStats: {
        hp: 5,
        attack: 5,
        defense: 10,
        speed: 1,
        critChance: 0.12
      },
      
      // How much the class grows per level
      growthPerLevel: {
        hp: 0,
        attack: 2,
        defense: 3
      },

      //baseStats: { hp: partyState.heroStats.hp * 1.2, attack: partyState.heroStats.attack * 0.8, defense: 3, critChance: 0.15, speed: 1.5 },
      //growthPerLevel: { attack: 1, defense: 1 },
      abilities: [
        { id: "leadership", unlockLevel: 1, description: "Reduces skill cooldowns of party members per autoattack" },
        { id: "flameArch", unlockLevel: 1, active: false, description: "Deals fire damage to a row of enemies", cooldown: 6500 }
        
      ],
      skills: {
        leadership: { active: true },
        flameArch: { cooldownRemaining: 6500 }
      },
      attackCooldown: 0
    },
        { id: "archer", 
      name: "Archer", 
     //image: "assets/images/classes/archer.png",
      level: 0,
      goldCost: 40,
      gemCost: 0, 
      goldIncomePerHit: 0.5,
      gemPerSecond: 0, 
      buildingRequired: {id: "archery", level: 1},
      lastTarget: null,
      sameTargetStreak: 0,
      resonance: "air",
      hasAutoAttack: true,
      role: "dps",
      heroStatRatios: { hp: 0.6, attack: 1.2, defense: 2 },
      // Class's own base stats (independent of hero)
      baseStats: {
        hp: 0,
        attack: 10,
        defense: 10,
        speed: 1.5,
        critChance: 0.2
      },
      
      // How much the class grows per level
      growthPerLevel: {
        hp: 0,
        attack: 3,
        defense: 3
      },
      attackCooldown: 0,
      abilities: [
        { id: "sparks", unlockLevel: 1, active: false },
        { id: "falconer", unlockLevel: 5, active: false },
        { id: "strafe", unlockLevel: 15, active: false },
      ],
      skills: {
        sparks: { cooldownRemaining: 8000 },
        falconer: { cooldownRemaining: 11000 },
        strafe: { cooldownRemaining: 12000 },
      }, 
    },
    { id: "sorceress", 
      name: "Sorceress",
      image: "assets/images/classes/sorceress.png", 
      level: 0,
      goldCost: 30,
      gemCost: 5, 
      goldIncomePerHit: 0.5, 
      gemPerSecond: 0,
      buildingRequired: {
        id: "mageGuild", level: 1 },
      lastTarget: null,
      sameTargetStreak: 0,
      resonance: "fire",
      hasAutoAttack: true,
      isEchoing: false,
      abilities: [
        { id: "flamePillar", unlockLevel: 1, active: false },
        { id: "implosion", unlockLevel: 25, active: false }
      ],
      skills: {
        flamePillar: { cooldownRemaining: 6500 },
        implosion: { cooldownRemaining: 12000 }
      },
      heroStatRatios: { hp: 0.5, attack: 1.5, defense: 2},
      // Class's own base stats (independent of hero)
      role: "caster",
      baseStats: {
        hp: 0,
        attack: 5,
        defense: 10,
        critChance: 0.1,
        speed: 1.2
      },
      
      // How much the class grows per level
      growthPerLevel: {
        hp: 0,
        attack: 3,
        defense: 3
      },
      attackCooldown: 0 
    },
    { id: "rogue", 
      name: "Rogue", 
      level: 0,
      goldCost: 25,
      gemCost: 0, 
      goldIncomePerHit: 1,
      gemPerSecond: 0, 
      buildingRequired: {id: "thievesGuild", level: 1 },
      lastTarget: null,
      sameTargetStreak: 0,
      resonance: "physical",
      hasAutoAttack: true,
      abilities: [
        { id: "weakSpot", unlockLevel: 1 },
        { id: "poisonFlask", unlockLevel: 1, active: false },
        { id: "lethalDose", unlockLevel: 5 }
      ],
      skills: {
        weakSpot: { active: true },
        poisonFlask: { cooldownRemaining: 8000 },
        lethalDose: { active: false }
      },
      role: "dps",
      heroStatRatios: { hp: 0.7, attack: 1.3, defense: 2 },
      // Class's own base stats (independent of hero)
      baseStats: {
        hp: 0,
        attack: 5,
        defense: 10,
        speed: 1.8,
        critChance: 0.2
      },
      
      // How much the class grows per level
      growthPerLevel: {
        hp: 0,
        attack: 3,
        defense: 3
      },
      attackCooldown: 0
    },
    { id: "cleric", 
      name: "Cleric", 
      level: 0,
      goldCost: 35,
      gemCost: 0, 
      goldIncomePerHit: 0.5,
      gemPerSecond: 0, 
      buildingRequired: {id: "temple", level: 1 },
      lastTarget: null,
      sameTargetStreak: 0,
      resonance: "light",
      hasAutoAttack: true,
      role: "support",
      heroStatRatios: { hp: 1.1, attack: 0.8, defense: 3 },
      // Class's own base stats (independent of hero)
      baseStats: {
        hp: 5,
        attack: 5,
        defense: 10,
        critChance: 0.1,
        speed: 1.3
      },
      
      // How much the class grows per level
      growthPerLevel: {
        hp: 0,
        attack: 2,
        defense: 3
      },
      attackCooldown: 0,
      abilities: [
        { id: "summonAngel", unlockLevel: 5, active: false },        
      ],
      skills: {
        summonAngel: { cooldownRemaining: 20000 },
      },
    },
    { id: "templar", 
      name: "Templar",
      image: "assets/images/classes/templar.png", 
      goldCost: 20,
      gemCost: 0, 
      level: 0,
      goldIncomePerHit: 0.5, 
      buildingRequired: [
        { id: "bellTower", level: 1 }, 
      ],
      lastTarget: null,
      sameTargetStreak: 0,
      resonance: "light",
      hasAutoAttack: true,
      role: "support",
      heroStatRatios: { hp: 1.2, attack: 0.8, defense: 3 },
      // Class's own base stats (independent of hero)
      baseStats: {
        hp: 10,
        attack: 5,
        defense: 10,
        speed: 1.5,
        critChance: 0.15
      },
      
      // How much the class grows per level
      growthPerLevel: {
        hp: 0,
        attack: 2,
        defense: 3
      },
      abilities: [
        { id: "blindingLight", unlockLevel: 1 },
        { id: "might", unlockLevel: 1 },
        { id: "smite", unlockLevel: 5, active: false },
        { id: "honeAttack", unlockLevel: 10 },
      ],
      skills: {
        blindingLight: { active: true },
        might: { cooldownRemaining: 14000},
        smite: { cooldownRemaining: 7500 },
      },
      attackCooldown: 0
    },    
    { id: "necromancer", 
      name: "Necromancer",
      image: "assets/images/classes/necromancer.png", 
      level: 0,
      goldCost: 60,
      gemCost: 0, 
      goldIncomePerHit: 0.5,
      gemPerSecond: 0, 
      buildingRequired: [
        {id: "mageGuild", level: 1 },
        {id: "darkTower", level: 1 }
      ],
      lastTarget: null,
      sameTargetStreak: 0,
      resonance: "dark",
      hasAutoAttack: false,
      role: "caster",
      abilities: [
        { id: "undertaker", unlockLevel: 20, active: false },
      ],
      skills: {
        undertaker: { cooldownRemaining: 12000 },
      },
      heroStatRatios: { hp: 0.9, attack: 1, defense: 2 },
      // Class's own base stats (independent of hero)
      baseStats: {
        hp: 10,
        attack: 2,
        defense: 10,
        speed: 1.2,
        critChance: 0.1
      },
      
      // How much the class grows per level
      growthPerLevel: {
        hp: 0,
        attack: 1,
        defense: 3
      },
      attackCooldown: 0
    }, 
    { id: "druid", 
      name: "Druid", 
     //image: "assets/images/classes/druid.png",
      level: 0,
      goldCost: 30,
      gemCost: 10, 
      goldIncomePerHit: 0.5, 
      gemPerSecond: 0.0167, // 1 gem per minute
      buildingRequired: {id: "grove", level: 1 },
      lastTarget: null,
      sameTargetStreak: 0,
      resonance: "earth",
      hasAutoAttack: false,
      role: "caster",
      heroStatRatios: { hp: 0.9, attack: 1.1, defense: 3 },
      // Class's own base stats (independent of hero)
      baseStats: {
        hp: 10,
        attack: 5,
        defense: 10,
        speed: 1.3,
        critChance: 0.1
      },
      
      // How much the class grows per level
      growthPerLevel: {
        hp: 0,
        attack: 2,
        defense: 3
      },
      attackCooldown: 0,
      abilities: [
        { id: "landslide", unlockLevel: 1, active: false },
        { id: "rockBlast", unlockLevel: 1, active: false },
        { id: "summonWaterElemental", unlockLevel: 5, active: false },
        { id: "massDistortion", unlockLevel: 25, active: false },
        //{ id: "earthquake", unlockLevel: 20, active: false },
        
      ],
      skills: {
        landslide: { cooldownRemaining: 7500 },
        rockBlast: { cooldownRemaining: 9500 },
        summonWaterElemental: { cooldownRemaining: 25000 },
        massDistortion: { cooldownRemaining: 18000 },
        //earthquake: { cooldownRemaining: 22000 }
      },
    },
    { id: "minotaur", 
      name: "Minotaur Warrior", 
      level: 0,
      goldCost: 50,
      gemCost: 0, 
      goldIncomePerHit: 1,
      gemPerSecond: 0, 
      buildingRequired: {id: "labyrinth", level: 1 },
      lastTarget: null,
      sameTargetStreak: 0,
      resonance: ["physical", "earth"],
      hasAutoAttack: false,
      abilities: [
        { id: "rage", unlockLevel: 1, active: false },
        
      ],
      skills: {
        rage: { cooldownRemaining: 2000 },
      },
      role: "dps",
      heroStatRatios: { hp: 1, attack: 1.1, defense: 3 },
      // Class's own base stats (independent of hero)
      baseStats: {
        hp: 0,
        attack: 5,
        defense: 10,
        speed: 1.8,
        critChance: 0.16
      },
      
      // How much the class grows per level
      growthPerLevel: {
        hp: 0,
        attack: 3,
        defense: 3
      },
      attackCooldown: 0
    },
    { id: "warlock", 
      name: "Warlock", 
      level: 0,
      goldCost: 50,
      gemCost: 0, 
      goldIncomePerHit: 1,
      gemPerSecond: 0, 
      buildingRequired: {id: "nighonTunnels", level: 1 },
      lastTarget: null,
      sameTargetStreak: 0,
      resonance: ["fire", "air"],
      hasAutoAttack: false,
      abilities: [
        { id: "chainLightning", unlockLevel: 1, active: false },
        { id: "incinerate", unlockLevel: 5, active: false },      
        
      ],
      skills: {
        chainLightning: { cooldownRemaining: 4500 },
        incinerate: { cooldownRemaining: 18000 }
      },
      role: "caster",
      heroStatRatios: { hp: 0.6, attack: 1.6, defense: 1 },
      // Class's own base stats (independent of hero)
      baseStats: {
        hp: 0,
        attack: 5,
        defense: 10,
        speed: 1.8,
        critChance: 0.16
      },
      
      // How much the class grows per level
      growthPerLevel: {
        hp: 0,
        attack: 3,
        defense: 1
      },
      attackCooldown: 0
    },

    /* 
    { id: "ranger", 
      name: "Ranger", 
      image: "assets/images/classes/ranger.png",
      level: 0,
      goldCost: 55,
      gemCost: 5, 
      goldIncomePerHit: 1,
      gemPerSecond: 0.0167, // 1 gem per minute 
      buildingRequired: [
        {id: "archery", level: 5 },
        {id: "grove", level: 1 },
        { id: "thievesGuild", level: 5 }
      ],
      lastTarget: null,
      sameTargetStreak: 0,
      resonance: "physical",
      hasAutoAttack: true,
      baseStats: { hp: partyState.heroStats.hp * 0.6, attack: partyState.heroStats.attack * 1.2, defense: 2, critChance: 0.15, speed: 1.6 },
      growthPerLevel: { attack: 1, defense: 1 },
      attackCooldown: 0 
    },
    { 
      id: "assassin", 
      name: "Assassin", 
      image: "assets/images/classes/assassin.png",
      level: 0,
      goldCost: 70,
      gemCost: 5, 
      goldIncomePerHit: 1,
      gemPerSecond: 0, 
      buildingRequired: [
        {id: "thievesGuild", level: 10 },
        {id: "darkTower", level: 1 }
      ],
      lastTarget: null,
      sameTargetStreak: 0,
      resonance: "dark",
      hasAutoAttack: true,
      baseStats: { hp: partyState.heroStats.hp * 0.7, attack: partyState.heroStats.attack * 1.3, defense: 2, critChance: 0.15, speed: 1.8 },
      growthPerLevel: { attack: 2, defense: 1 },
      attackCooldown: 0 
    }
      */
];
