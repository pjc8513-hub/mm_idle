import { state, runeState, partyState } from "../state.js";
import { buildings as BUILDING_DEFS } from './buildingDefs.js';
import { classes } from "./classes.js";
import { abilities } from "./abilities.js";
import { emit, on } from "../events.js";
import { logMessage } from "../systems/log.js";
import { getBuildingLevel } from "../town.js";
import { updateElementalModifiers } from "../systems/math.js";
import { BOUNTY_FACTOR, incomeSystem } from "../incomeSystem.js";
//import { openDock } from "../systems/dockManager.js";

export function initBuildingMenu() {
    on("goldChanged", () => {
  const dock = document.getElementById("mainDock");
  if (dock && !dock.classList.contains("hidden")) {
    const currentBuildingId = dock.getAttribute("data-building-id");
    if (currentBuildingId && state.activePanel === "panelTown") {
      const building = state.buildings.find(b => b.id === currentBuildingId) 
        || { id: currentBuildingId, name: "Building" };
      const renderer = BUILDING_MENUS[currentBuildingId];
//      console.log('[building menu] renderer: ', renderer);
      if (renderer) dock.innerHTML = renderer(building);
      }
    }
  });
  console.log('buildingMenu initialized!');
}

// You can tweak this cost formula as you like:
const TRAINING_COST = () => 100 * partyState.heroLevel;  // Example: scales with hero level
let TRAINING_EXP_GAIN = 50; // How much EXP you get per training

export const BUILDING_MENUS = {
  trainingCenter: (building) => {
    // 🔍 Find building info in state.buildings array
    const b = state.buildings.find(b => b.id === building.id);
    const buildingLevel = b ? b.level : 0;

    if (buildingLevel <= 0) {
      return `
        <h3>Training Center</h3>
        <p>This building hasn't been constructed yet.</p>
        <p>Build it first to unlock hero training!</p>
      `;
    }

    const cost = TRAINING_COST();
    const canAfford = state.resources.gold >= cost;
    const btnColor = canAfford ? "green" : "red";

  return `
    <h3>Training Center</h3>
    <div class="building-stats">
      <p>Need some training?</p>
      <p>Cost per training: <strong>${cost} gold</strong></p>
    </div>

    <div class="training-buttons">
      <button 
        style="background-color: ${state.resources.gold >= cost ? "green" : "red"};" 
        onclick="exchangeGoldForExp('${building.id}', 1)"
      >
        Train x1
      </button>

      <button 
        style="background-color: ${state.resources.gold >= cost * 10 ? "green" : "red"};" 
        onclick="exchangeGoldForExp('${building.id}', 10)"
      >
        Train x10
      </button>

      <button 
        style="background-color: ${state.resources.gold >= cost * 100 ? "green" : "red"};" 
        onclick="exchangeGoldForExp('${building.id}', 100)"
      >
        Train x100
      </button>
    </div>
  `;

  },
  blacksmith: (building) => {
        // 🔍 Find building info in state.buildings array
    const b = state.buildings.find(b => b.id === building.id);
    const buildingLevel = b ? b.level : 0;

    if (buildingLevel <= 0) {
      return `
        <h3>Blacksmith</h3>
        <p>This building hasn't been constructed yet.</p>
        <p>Build it first in order to increase hero attack!</p>
      `;
    } else {
    return `
      <h3>Blacksmith</h3>
        <div class="building-stats">
        <p>Level up to raise the attack of your hero!</p>
      </div>
      <div>
        <p>Current attack bonus: ${partyState.heroBonuses.attack} </p>
      </div>
    `;
    }
  },
  graveyard: (building) => {
        // 🔍 Find building info in state.buildings array
    const b = state.buildings.find(b => b.id === building.id);
    const buildingLevel = b ? b.level : 0;

    if (buildingLevel <= 0) {
      return `
        <h3>Graveyard</h3>
        <p>This building hasn't been constructed yet.</p>
        <p>Build it first in order to increase the level of necromancer summons!</p>
      `;
    } else {
    return `
      <h3>Graveyard</h3>
        <div class="building-stats">
        <p>Level up to raise the attack of your necromancer summons!</p>
      </div>
    `;
    }
  },
  gemMine: (building) => {
        // 🔍 Find building info in state.buildings array
    const b = state.buildings.find(b => b.id === building.id);
    const buildingLevel = b ? b.level : 0;

    if (buildingLevel <= 0) {
      return `
        <h3>Gem Mine</h3>
        <p>This building hasn't been constructed yet.</p>
        <p>Build it first in order to increase max gems!</p>
      `;
    } else {
    return `
      <h3>Gem Mine</h3>
        <div class="building-stats">
        <p>Level up to raise the gem cap!</p>
      </div>
      <div>
        <p>Current gem cap bonus: ${state.resources.maxGems} </p>
      </div>
    `;
    }
  },
  mine: (building) => {
        // 🔍 Find building info in state.buildings array
    const b = state.buildings.find(b => b.id === building.id);
    const buildingLevel = b ? b.level : 0;

    if (buildingLevel <= 0) {
      return `
        <h3>Mine</h3>
        <p>This building hasn't been constructed yet.</p>
        <p>Build it first in order to increase hit economy!</p>
      `;
    } else {
    return `
      <h3>Mine</h3>
        <div class="building-stats">
        <p>Level up to raise the hit economy!</p>
      </div>
      <div>
        <p>Current hit economy bonus: ${building.goldIncomePerHit * buildingLevel} </p>
      </div>
    `;
    }
  },
  lumberMill: (building) => {
        // 🔍 Find building info in state.buildings array
    const b = state.buildings.find(b => b.id === building.id);
    const buildingLevel = b ? b.level : 0;

    if (buildingLevel <= 0) {
      return `
        <h3>Lumber Mill</h3>
        <p>This building hasn't been constructed yet.</p>
        <p>Build it first in order to increase hit economy!</p>
      `;
    } else {
    return `
      <h3>Lumber Mill</h3>
        <div class="building-stats">
        <p>Level up to raise the hit economy!</p>
      </div>
      <div>
        <p>Current hit economy bonus: ${building.goldIncomePerHit * buildingLevel} </p>
      </div>
    `;
    }
  },
  castle: (building) => {
        // 🔍 Find building info in state.buildings array
    const b = state.buildings.find(b => b.id === building.id);
    const buildingLevel = b ? b.level : 0;

    if (buildingLevel <= 0) {
      return `
        <h3>Castle</h3>
        <p>This building hasn't been constructed yet.</p>
        <p>Build it first in order to increase bounty!</p>
      `;
    } else {
    return `
      <h3>Castle</h3>
        <div class="building-stats">
        <p>Level up to raise the bounty!</p>
      </div>
      <div>
        <p>Current bounty bonus: ${BOUNTY_FACTOR} * ${buildingLevel}</p>
      </div>
    `;
    }
  },

fountain: (building) => {
  const b = state.buildings.find(b => b.id === building.id);
  const lvl = b ? b.level : 0;

  if (lvl <= 0) {
    return `
      <h3>Fountain</h3>
      <p>This building hasn't been constructed yet.</p>
    `;
  }

  const now = Date.now();
  const nextDrink = state.fountainNextDrink || 0;
  const remaining = Math.max(0, nextDrink - now);

  const hoursReward = Math.max(1, lvl / 10);

  let buttonText = "Drink from Fountain";
  let disabled = "";
  let btnColor = "green";

  if (remaining > 0) {
    let sec = remaining / 1000;
    const mm = Math.floor(sec / 60);
    const ss = Math.floor(sec % 60).toString().padStart(2, "0");
    buttonText = `Cooldown: ${mm}:${ss}`;
    disabled = "disabled";
    btnColor = "gray";
  }

  return `
    <h3>Fountain</h3>
    <p>Drink to receive <strong>${hoursReward}h</strong> of idle rewards.</p>

    <button id="fountainDrinkBtn"
      style="background-color:${btnColor}; width:180px;"
      ${disabled}
      onclick="drinkFromFountain('${building.id}')"
    >
      ${buttonText}
    </button>
  `;
},

library: (building) => {
  const b = state.buildings.find(b => b.id === building.id);
  const buildingLevel = b ? b.level : 0;

  if (buildingLevel <= 0) {
    return `
      <h3>Library</h3>
      <p>This building hasn't been constructed yet.</p>
      <p>Build it first in order to unlock spell drops and increase element effectiveness!</p>
    `;
  }

  const elements = [
    { id: 'fire', label: 'Fire', icon: '🔥', color: '#ff4500', resource: 'fire' },
    { id: 'water', label: 'Water', icon: '💧', color: '#1e90ff', resource: 'water' },
    { id: 'air', label: 'Air', icon: '💨', color: '#87ceeb', resource: 'air' },
    { id: 'earth', label: 'Earth', icon: '🌍', color: '#8b4513', resource: 'earth' }
  ];

  const elementCards = elements.map(elem => {
    const modifier = partyState.elementalDmgModifiers[elem.id] || 1;
    const bonusPercent = ((modifier - 1) * 100).toFixed(0);
    const currentLevel = Math.round((modifier - 1) / 0.10); // Calculate upgrade level
    
    // Base cost is 20, increases by 20% per level
    const baseCost = 20;
    const upgradeCost = Math.floor(baseCost * Math.pow(1.2, currentLevel));
    
    const canAfford = runeState.crystals[elem.resource] >= upgradeCost;
    const btnColor = canAfford ? elem.color : '#333';
    
    return `
      <div class="library-element-card" 
           style="border-color: ${elem.color};">
        <div class="element-icon" style="color: ${elem.color};">
          ${elem.icon}
        </div>
        <div class="element-name">${elem.label}</div>
        <div class="element-bonus">+${bonusPercent}%</div>
        <div class="element-cost">${upgradeCost} ${elem.resource}</div>
        <button 
          class="element-upgrade-btn"
          style="background: ${btnColor}; ${!canAfford ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
          onclick="upgradeLibraryElement('${elem.id}')"
          ${!canAfford ? 'disabled' : ''}
        >
          Upgrade
        </button>
      </div>
    `;
  }).join('');

  return `
    <h3>Library</h3>
    <div class="building-stats">
      <p>Invest in elemental research to increase damage effectiveness!</p>
    </div>
    <div class="library-elements-container">
      ${elementCards}
    </div>
    <style>
      .library-elements-container {
        display: flex;
        gap: 10px;
        justify-content: space-between;
        margin-top: 12px;
      }
      .library-element-card {
        flex: 1;
        background: rgba(20, 20, 30, 0.6);
        border: 2px solid #666;
        border-radius: 8px;
        padding: 10px 8px;
        text-align: center;
        transition: all 0.3s ease;
      }
      .library-element-card:hover {
        background: rgba(30, 30, 40, 0.8);
        transform: translateY(-2px);
      }
      .element-icon {
        font-size: 2em;
        margin-bottom: 6px;
      }
      .element-name {
        font-weight: 600;
        font-size: 0.95em;
        margin-bottom: 4px;
        color: #fff;
      }
      .element-bonus {
        font-size: 0.85em;
        color: #4ade80;
        margin-bottom: 4px;
        font-weight: 600;
      }
      .element-cost {
        font-size: 0.8em;
        color: #fbbf24;
        margin-bottom: 8px;
      }
      .element-upgrade-btn {
        width: 100%;
        padding: 6px 8px;
        font-size: 0.85em;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
        font-weight: 600;
        color: #fff;
      }
      .element-upgrade-btn:not(:disabled):hover {
        opacity: 0.9;
        transform: scale(1.05);
      }
      .element-upgrade-btn:disabled {
        cursor: not-allowed;
      }
    </style>
  `;
},

shadowGuild: (building) => {
  const b = state.buildings.find(b => b.id === building.id);
  const buildingLevel = b ? b.level : 0;

  if (buildingLevel <= 0) {
    return `
      <h3>Shadow Guild</h3>
      <p>This building hasn't been constructed yet.</p>
      <p>Build it first in order increase physical, poison, and undead element effectiveness!</p>
    `;
  }

  const elements = [
    { id: 'physical', label: 'Physical', icon: 'assets/images/icons/flash.png', color: '#52474eff', resource: 'physical' },
    { id: 'poison', label: 'Poison', icon: 'assets/images/icons/moonbeam.png', color: '#4dbd56ff', resource: 'poison' },
    { id: 'undead', label: 'Undead', icon: 'assets/images/icons/breath.png', color: '#a0399bff', resource: 'undead' },
  ];

  const elementCards = elements.map(elem => {
    const modifier = partyState.elementalDmgModifiers[elem.id] || 1;
    const bonusPercent = ((modifier - 1) * 100).toFixed(0);
    const currentLevel = Math.round((modifier - 1) / 0.10); // Calculate upgrade level
    
    // Base cost is 20, increases by 20% per level
    const baseCost = 20;
    const upgradeCost = Math.floor(baseCost * Math.pow(1.2, currentLevel));
    
    const canAfford = runeState.crystals[elem.resource] >= upgradeCost;
    const btnColor = canAfford ? elem.color : '#333';
    
    return `
      <div class="library-element-card" 
           style="border-color: ${elem.color};">
        <div class="element-icon" style="color: ${elem.color};">
          <div class="element-icon">
            <img src="${elem.icon}" alt="${elem.label} icon" />
          </div>
        </div>
        <div class="element-name">${elem.label}</div>
        <div class="element-bonus">+${bonusPercent}%</div>
        <div class="element-cost">${upgradeCost} ${elem.resource}</div>
        <button 
          class="element-upgrade-btn"
          style="background: ${btnColor}; ${!canAfford ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
          onclick="upgradeLibraryElement('${elem.id}')"
          ${!canAfford ? 'disabled' : ''}
        >
          Upgrade
        </button>
      </div>
    `;
  }).join('');

  return `
    <h3>Shadow Guild</h3>
    <div class="building-stats">
      <p>Invest in the dark arts to increase damage effectiveness!</p>
    </div>
    <div class="library-elements-container">
      ${elementCards}
    </div>
    <style>
      .library-elements-container {
        display: flex;
        gap: 10px;
        justify-content: space-between;
        margin-top: 12px;
      }
      .library-element-card {
        flex: 1;
        background: rgba(20, 20, 30, 0.6);
        border: 2px solid #666;
        border-radius: 8px;
        padding: 10px 8px;
        text-align: center;
        transition: all 0.3s ease;
      }
      .library-element-card:hover {
        background: rgba(30, 30, 40, 0.8);
        transform: translateY(-2px);
      }
      .element-icon {
        font-size: 2em;
        margin-bottom: 6px;
      }
      .element-name {
        font-weight: 600;
        font-size: 0.95em;
        margin-bottom: 4px;
        color: #fff;
      }
      .element-bonus {
        font-size: 0.85em;
        color: #4ade80;
        margin-bottom: 4px;
        font-weight: 600;
      }
      .element-cost {
        font-size: 0.8em;
        color: #fbbf24;
        margin-bottom: 8px;
      }
      .element-upgrade-btn {
        width: 100%;
        padding: 6px 8px;
        font-size: 0.85em;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
        font-weight: 600;
        color: #fff;
      }
      .element-upgrade-btn:not(:disabled):hover {
        opacity: 0.9;
        transform: scale(1.05);
      }
      .element-upgrade-btn:disabled {
        cursor: not-allowed;
      }
    </style>
  `;
},

dungeonShrine: (building) => {
  const b = state.buildings.find(b => b.id === building.id);
  const buildingLevel = b ? b.level : 0;

  if (buildingLevel <= 0) {
    return `
      <h3>Dungeon Shrine</h3>
      <p>This building hasn't been constructed yet.</p>
      <p>Build it first in order to receive random blessings!</p>
    `;
  }

  const blessings = [
    { id: 'hunter', label: 'Hunter', icon: 'assets/images/icons/flash.png', color: '#52474eff' },
    { id: 'slayer', label: 'Slayer', icon: 'assets/images/icons/inferno.png', color: '#4dbd56ff' },
    { id: 'banishing', label: 'Banishing', icon: 'assets/images/icons/brilliant.png', color: '#a0399bff' },
    { id: 'alchemy' , label: 'Alchemy', icon: 'assets/images/icons/starfall.webp', color: '#a0a039ff' },
    { id: 'excommunication', label: 'Excommunication', icon: 'assets/images/icons/moonbeam.png', color: '#39a0a0ff' },
  ];

  const blessingCards = blessings.map(blessing => {
    const modifier = partyState.blessings[blessing.id] || 1;
    const bonusPercent = ((modifier - 1) * 100).toFixed(0);

    return `
      <div class="blessing-card" style="border-color: ${blessing.color};">
        <div class="blessing-icon-small">
          <img src="${blessing.icon}" alt="${blessing.label}" />
        </div>
        <div class="blessing-name">${blessing.label}</div>
        <div class="blessing-bonus">+${bonusPercent}%</div>
      </div>
    `;
  }).join('');

  // Blessing cost scaling
  const baseCost = 25;
  const blessingLevel = partyState.blessingLevel || 0;
  const blessingCost = Math.floor(baseCost * Math.pow(1.35, blessingLevel));
  const currentEssence = state.resources.dungeonEssence;
  const canPurchase = currentEssence >= blessingCost;

  return `
    <h3>Dungeon Shrine</h3>

    <p class="essence-display">
      Dungeon Essence: <span class="essence-amount">${currentEssence}</span>
    </p>

    <p class="building-description">
      Receive a random blessing to empower your party.
    </p>

    <div class="blessings-container small">
      ${blessingCards}
    </div>

    <p class="blessing-cost">Cost: ${blessingCost} Essence</p>

    <button 
      class="blessing-upgrade-btn"
      style="background: ${canPurchase ? '#4ade80' : '#555'};"
      onclick="receiveBlessing()"
      ${!canPurchase ? 'disabled' : ''}
    >
      Receive Blessing
    </button>

    <style>
      .essence-display {
        font-size: 0.9em;
        margin-bottom: 4px;
        color: #9be1ff;
      }
      .building-description {
        font-size: 0.85em;
        margin-bottom: 10px;
      }
      .blessings-container.small {
        display: flex;
        gap: 6px;
        justify-content: space-between;
      }
      .blessing-card {
        flex: 1;
        background: rgba(20, 20, 30, 0.55);
        border: 1px solid #666;
        border-radius: 6px;
        padding: 6px 4px;
        text-align: center;
      }
      .blessing-icon-small img {
        width: 26px;
        height: 26px;
        opacity: 0.9;
        margin-bottom: 4px;
      }
      .blessing-name {
        font-size: 0.75em;
        font-weight: 600;
        color: #fff;
      }
      .blessing-bonus {
        font-size: 0.75em;
        color: #4ade80;
        font-weight: 600;
      }
      .blessing-cost {
        font-size: 0.85em;
        color: #fbbf24;
        margin: 8px 0;
      }
      .blessing-upgrade-btn {
        width: 75px;
        padding: 6px;
        font-size: 0.85em;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        transition: 0.15s;
        color: #fff;
      }
      .blessing-upgrade-btn:not(:disabled):hover {
        transform: scale(1.05);
      }

    </style>
  `;
},

  inn: (building) => {
        // 🔍 Find building info in state.buildings array
    const b = state.buildings.find(b => b.id === building.id);
    const buildingLevel = b ? b.level : 0;

    if (buildingLevel <= 0) {
      return `
        <h3>Inn</h3>
        <p>This building hasn't been constructed yet.</p>
        <p>Build it first to unlock hero training!</p>
      `;
    } 
    
    return `
    <h3>Inn</h3>
    <div class="building-stats">
      <p style="text-align: center; margin: 8px 0;">Assign adventurers to increase income.</p>
    </div>
    ${renderPartyAssignment(building)}
  `;
},
  farm: unitProducingMenu,
  barracks: unitProducingMenu,
  thievesGuild: unitProducingMenu,
  darkTower: unitProducingMenu,
  archery: unitProducingMenu,
  temple: unitProducingMenu,
  grove: unitProducingMenu,
  bellTower: unitProducingMenu,
  labyrinth: unitProducingMenu,
  mageGuild: unitProducingMenu,
  nighonTunnels: unitProducingMenu,
  magicConflux: (building) => `
    <h3>Magic Conflux</h3>
    <div>
      <button onclick="increaseElementalPower('${building.id}')">Boost Elemental Power</button>
    </div>
  `
};


function getClassInfo(classId) {
  const level = partyState.classLevels[classId];
  const thisClass = classes.find((b) => b.id === classId);
  const name = thisClass.name;
  //console.log(name);
  if (level === undefined){ 
    return{
        id: classId,
        name: name,
        level: 0
    } 
    }
  return {
    id: classId,
    name: name,
    level
  };
}

function getBuildingInfo(buildingId, level) {
  //console.log(`building.id ${buildingId}`);
  const def = BUILDING_DEFS.find((b) => b.id === buildingId);
  if (!def) return null;

  let effects = {};
  if (typeof def.effects === "function") {
    effects = def.effects(level);
  } else {
    effects = {
      goldIncomePerHit: def.goldIncomePerHit ?? 0,
      gemPerSecond: def.gemPerSecond ?? 0,
    };
  }

  let classInfo = [];
  if (def.upgradedClasses) {
    const upgradedClasses = Array.isArray(def.upgradedClasses)
      ? def.upgradedClasses
      : [def.upgradedClasses];

    classInfo = upgradedClasses.map((uc) => getClassInfo(uc.id)).filter(Boolean).map((classData) => ({
      id: classData.id,
      name: classData.name,
      level: classData.level,
    }));
  }

  return {
    id: def.id,
    name: def.name,
    description: def.description,
    image: def.image,
    level,
    effects,
    classes: classInfo,
  };
}


function unitProducingMenu(building) {
 // console.log('unit producing building: ', building);
  const info = getBuildingInfo(building.id, building.level);
  const income = info?.effects?.goldIncomePerHit ?? 0;

  const upgradedUnits = (info?.classes ?? [])
    .map(
      (cls) => `
        <div class="unit-info">
          <strong>${cls.name}</strong> (Lv ${cls.level})
        </div>
      `
    )
    .join("");

  return `
    <h3>${info?.name ?? building.id}</h3>
    ${info?.description ? `<p>${info.description}</p>` : ""}
    <div class="building-stats">
      <p><strong>Income per hit:</strong> ${income} gold</p>
    </div>
    <div class="upgraded-units">
      <h4>Upgrades:</h4>
      ${upgradedUnits || "<p>No upgraded units.</p>"}
    </div>
  `;
}

// --- Training function ---
window.exchangeGoldForExp = function (buildingId, count = 1) {
  const trainingLevel = getBuildingLevel(buildingId);
  TRAINING_EXP_GAIN = 50 + (trainingLevel - 1) * 10;

  let trainingsPerformed = 0;
  let totalExp = 0;
  let totalGoldSpent = 0;

  for (let i = 0; i < count; i++) {
    const cost = TRAINING_COST();  // cost increases as hero level increases

    if (state.resources.gold < cost) break;

    state.resources.gold -= cost;
    totalGoldSpent += cost;
    totalExp += TRAINING_EXP_GAIN;
    trainingsPerformed++;

    emit("goldChanged", state.resources.gold);
  }

  if (trainingsPerformed > 0) {
    logMessage(`Trained ${trainingsPerformed}x for ${totalExp} EXP (spent ${totalGoldSpent} gold).`);
    emit("addHeroExp", totalExp);
  } else {
    logMessage("Not enough gold!");
  }
};


function renderPartyAssignment(building) {
  const unlockedSlots = getUnlockedInnSlots();

  const slotsHTML = state.innAssignments.slots.map((classId, index) => {
    const isUnlocked = index < unlockedSlots;
    const assignedClass = classes.find(c => c.id === classId);
    const label = assignedClass ? assignedClass.name : "Empty";
    const image = assignedClass ? assignedClass.image : "";
    const slotClass = assignedClass ? "assigned-slot" : "empty-slot";

    return `
      <div 
        class="inn-slot ${slotClass}" 
        onclick="${isUnlocked ? `assignToInnSlot(${index})` : ''}"
        title="${isUnlocked ? (assignedClass ? assignedClass.description : 'Click to assign') : 'Locked slot'}"
        style="${isUnlocked ? '' : 'opacity: 0.4; pointer-events: none;'}"
      >
        ${image ? `<img src="${image}" alt="${label}" class="class-icon" />` : ''}
        <span class="slot-label">${isUnlocked ? label : 'Locked'}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="inn-assignment-container">
      <p>Gold Income Bonus: ${(state.innAssignments.goldIncomeMultiplier * 100).toFixed(0)}%</p>
      <div class="inn-slots">
        ${slotsHTML}
      </div>
      <p>${unlockedSlots} / 4 slots unlocked (Inn Level ${getUnlockedInnSlots() * 10 - 9}+)</p>
    </div>
  `;
}




window.assignToInnSlot = function (slotIndex) {
  const current = state.innAssignments.slots[slotIndex];

  if (current) {
    // Unassign
    state.innAssignments.slots[slotIndex] = null;
    state.innAssignments.goldIncomeMultiplier -= 0.2;
    logMessage(`Slot ${slotIndex + 1} unassigned.`);
  } else {
    // Get list of already assigned class IDs
    const assignedClassIds = state.innAssignments.slots.filter(Boolean);

    // Filter for unlocked and unassigned classes
    const unlockedClasses = classes.filter(cls => {
      const building = state.buildings.find(b => b.id === cls.buildingRequired.id);
      const isUnlocked = building && building.level >= cls.buildingRequired.level;
      const isUnassigned = !assignedClassIds.includes(cls.id);
      return isUnlocked && isUnassigned;
    });

    if (unlockedClasses.length === 0) {
      logMessage("No unlocked classes available.");
      return;
    }

    const randomClass = unlockedClasses[Math.floor(Math.random() * unlockedClasses.length)];
    state.innAssignments.slots[slotIndex] = randomClass.id;
    state.innAssignments.goldIncomeMultiplier += 0.2;
    logMessage(`${randomClass.name} assigned to slot ${slotIndex + 1}.`);
  }

  // Re-render the inn menu. Prefer a dedicated #building-menu container if present,
  // otherwise render into the main dock. This prevents errors when the
  // #building-menu element isn't present in the DOM.
  const dock = document.getElementById("mainDock");
  const currentBuildingId = dock?.getAttribute("data-building-id") || "inn";
  const innMenu = BUILDING_MENUS.inn({ id: currentBuildingId });
  const container = document.querySelector("#building-menu") || dock;
  if (container) {
    container.innerHTML = innMenu;
  } else {
    console.warn("assignToInnSlot: no container found to render inn menu");
  }
};

function getUnlockedInnSlots() {
  const inn = state.buildings.find(b => b.id === "inn");
  const level = inn ? inn.level : 0;
  return Math.min(1 + Math.floor(level / 10), 4);
}


function enforceInnSlotLimits() {
  const unlocked = getUnlockedInnSlots();
  for (let i = unlocked; i < state.innAssignments.slots.length; i++) {
    if (state.innAssignments.slots[i]) {
      state.innAssignments.slots[i] = null;
      state.innAssignments.goldIncomeMultiplier -= 0.2;
    }
  }
}

// Add this window function below the library menu definition:
window.upgradeLibraryElement = function(elementId) {
  const modifier = partyState.elementalDmgModifiers[elementId] || 1;
  const currentLevel = Math.round((modifier - 1) / 0.10);
  
  // Calculate cost (base 20, increases 20% per level)
  const baseCost = 20;
  const upgradeCost = Math.floor(baseCost * Math.pow(1.2, currentLevel));
  
  // Determine which resource to use (all use gold for now, but easily extensible)
  const resourceType = elementId;
  
  if (runeState.crystals[resourceType] >= upgradeCost) {
    // Deduct cost
    runeState.crystals[resourceType] -= upgradeCost;
    
    // Apply upgrade
    //partyState.elementalDmgModifiers[elementId] += 0.10;
    partyState.heroBonuses[elementId] += 0.10;
    
    // Update elemental modifiers (call your existing function)
    if (typeof updateElementalModifiers === 'function') {
      updateElementalModifiers();
    }
    
    logMessage(`${elementId.charAt(0).toUpperCase() + elementId.slice(1)} magic enhanced! +10% damage`);
    emit("crystalChanged", runeState.crystals[elementId]);
    
    // Re-render the library menu
    const dock = document.getElementById("mainDock");
    if (dock) {
      const currentBuildingId = dock.getAttribute("data-building-id");
      if (currentBuildingId === "library") {
        const building = state.buildings.find(b => b.id === currentBuildingId) 
          || { id: currentBuildingId, name: "Library" };
        dock.innerHTML = BUILDING_MENUS.library(building);
      }
    }
  } else {
    logMessage(`Not enough ${resourceType}! Need ${upgradeCost}.`);
  }
};

window.receiveBlessing = function () {
  const baseCost = 25;
  const currentLevel = partyState.blessingLevel || 0;
  const cost = Math.floor(baseCost * Math.pow(1.35, currentLevel));

  if (state.resources.dungeonEssence < cost) {
    logMessage(`Not enough Dungeon Essence! Need ${cost}.`);
    return;
  }

  // Deduct cost
  state.resources.dungeonEssence -= cost;

  // Choose a random blessing
  const blessingPool = ['hunter','slayer','banishing','alchemy','excommunication'];
  const chosenId = blessingPool[Math.floor(Math.random() * blessingPool.length)];

  // Apply blessing – each blessing gives +10% (same style as your library)
  partyState.blessings[chosenId] = (partyState.blessings[chosenId] || 1) + 0.10;

  // Increase global blessing level → increases future costs
  partyState.blessingLevel = (partyState.blessingLevel || 0) + 1;

  logMessage(`You received the ${chosenId} blessing! (+10%)`);
  emit("resourceChanged", state.resources.dungeonEssence);

  // Re-render the shrine menu
  const dock = document.getElementById("mainDock");
  if (dock) {
    const currentBuildingId = dock.getAttribute("data-building-id");
    if (currentBuildingId === "dungeonShrine") {
      const building = state.buildings.find(b => b.id === currentBuildingId)
        || { id: currentBuildingId, name: "Dungeon Shrine" };
      dock.innerHTML = BUILDING_MENUS.dungeonShrine(building);
    }
  }
};

window.drinkFromFountain = function (buildingId) {
  const lvl = getBuildingLevel(buildingId);
  const hours = Math.max(1, lvl);
  const seconds = hours * 3600;

  // Generate idle rewards
  const rewards = incomeSystem.calculateIdleIncome(seconds);

  // Apply them
  incomeSystem.applyIdleIncome(rewards);

  logMessage(
    `You drank from the Fountain and gained ${rewards.gold} gold and ${rewards.essence} essence (${hours}h idle rewards)!`
  );

  // Set a new cooldown — 10 minutes
  state.fountainNextDrink = Date.now() + (10 * 60 * 1000);
};
