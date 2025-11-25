import { state, partyState } from "./state.js";
import { emit, on } from "./events.js";
import { buildings } from "./content/buildingDefs.js";
import { classes } from "./content/classes.js";
import { attachRequirementTooltip } from "./tooltip.js";
import { updateUnlockedSkills } from "./party.js";
import { calculateClassStats, updateTotalStats, levelUpClass, addHeroBonus, updateElementalModifiers } from "./systems/math.js";
import { openDock, closeDock, DOCK_TYPES } from "./systems/dockManager.js";
import { /*dungeonProgress*/ } from "./systems/milestones.js";
import { getDungeonStats } from "./dungeonMode.js";
import { BUILDING_MENUS } from "./content/buildingMenu.js";
import { formatNumber } from "./systems/math.js";

// Store the last state to detect changes
let lastBuildingState = {
  gold: -1,
  gems: -1,
  buildings: []
};

export function initBuildingPanel() {
  // Re-render whenever gold/gems or building composition changes
  on("goldChanged", () => {
    if (document.getElementById("panelTown").classList.contains("active")) {
      renderBuildingPanel();
    }
  });

  on("gemsChanged", () => {
    if (document.getElementById("panelTown").classList.contains("active")) {
      renderBuildingPanel();
    }
  });

  on("buildingsChanged", () => {
    if (document.getElementById("panelTown").classList.contains("active")) {
      renderBuildingPanel();
    }
  });
}

/* replacing with listener in dockManger
// close dock menu
document.addEventListener("click", (e) => {
  const dock = document.getElementById("mainDock");
  const currentBuildingId = dock.getAttribute("data-building-id");
  if ((state.activePanel === "panelTown" && currentBuildingId) && !dock.classList.contains("hidden") && !dock.contains(e.target)) {
    closeDock();
  }
});
*/

export function renderBuildingPanel() {
  const panel = document.getElementById("panelTown");
  
  // Only do full render if this is the first time or panel is empty
  if (!panel.querySelector('.buildingGrid')) {
    fullRenderBuildingPanel();
  } else {
    updateBuildingPanel();
  }
}

function fullRenderBuildingPanel() {
  const panel = document.getElementById("panelTown");
  panel.innerHTML = `
    <div class="building-panel-header">
      <h2>Buildings</h2>
    </div>
  `;

  const container = document.createElement("div");
  container.classList.add("buildingGrid");

  // ---- SORT BY TYPE (single container, no sections) ----
  const typeOrder = {
    unitProduction: 0,
    economy: 1,
    upgrade: 2
  };

  const sortedBuildings = [...buildings].sort((a, b) => {
    return typeOrder[a.type] - typeOrder[b.type];
  });

  // ---- render normally ----
  sortedBuildings.forEach((building, index) => {
    const buildingCard = document.createElement("div");
    buildingCard.classList.add("buildingCard");
    buildingCard.dataset.buildingId = building.id;

    // --- Building image ---
    const imageDiv = document.createElement("div");
    imageDiv.classList.add("buildingImage");
    const img = document.createElement("img");
    img.src = building.image;
    img.alt = building.name;
    img.onerror = () => {
      img.style.display = 'none';
      imageDiv.innerHTML = `<div class="building-placeholder">${building.name[0]}</div>`;
    };
    imageDiv.appendChild(img);

    // --- Info overlay ---
    const infoOverlay = document.createElement("div");
    infoOverlay.classList.add("buildingInfo");

    const nameDiv = document.createElement("div");
    nameDiv.classList.add("buildingName");
    nameDiv.textContent = building.name;

    const levelDiv = document.createElement("div");
    levelDiv.classList.add("buildingLevel");

    const productionDiv = document.createElement("div");
    productionDiv.classList.add("buildingProduction");

    infoOverlay.appendChild(nameDiv);
    infoOverlay.appendChild(levelDiv);
    infoOverlay.appendChild(productionDiv);

    // --- Upgrade button ---
    const btn = document.createElement("button");
    btn.classList.add("upgradeBtn");
    btn.dataset.buildingId = building.id;
    btn.dataset.index = index;

    const costSpan = document.createElement("span");
    costSpan.classList.add("upgrade-cost");
    btn.appendChild(costSpan);

    attachRequirementTooltip(btn, building, {
      checkBuildingRequirements,
      getBuildingLevel,
      getHeroLevel: () => partyState.heroLevel,
      checkDungeonProgressRequirement,
      getDungeonProgress: () => getDungeonStats().maxDepth,
    });

    btn.addEventListener("click", () => {
      upgradeBuilding(building.id);
    });

    // --- assemble ---
    buildingCard.appendChild(imageDiv);
    buildingCard.appendChild(infoOverlay);
    buildingCard.appendChild(btn);

    buildingCard.addEventListener("click", (e) => {
      e.stopPropagation();
      openDock(DOCK_TYPES.BUILDING, building);
    });

    container.appendChild(buildingCard);
  });

  panel.appendChild(container);

  updateBuildingPanel();
}



function updateBuildingPanel() {
  const currentGold = Math.floor(state.resources.gold);
  const currentGems = state.resources.gems;
  const currentBuildings = [...(state.buildings || [])];
  const currentHeroLevel = partyState.heroLevel;

  // Detect changes
  const heroLevelChanged = currentHeroLevel !== (lastBuildingState.heroLevel || 0);
  const goldChanged = currentGold !== lastBuildingState.gold;
  const gemsChanged = currentGems !== (lastBuildingState.gems || 0);
  const buildingsChanged = !arraysEqual(currentBuildings, lastBuildingState.buildings);

  // If nothing changed, don't update
  if (!goldChanged && !gemsChanged && !buildingsChanged && !heroLevelChanged) {
    return;
  }

  const buildingCards = document.querySelectorAll('.buildingCard');

  buildingCards.forEach(card => {
    const buildingId = card.dataset.buildingId;
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;

    const currentLevel = getBuildingLevel(buildingId);
    const nextLevelCost = calculateUpgradeCost(building, currentLevel);
    const formattedGold = formatNumber(nextLevelCost.gold);

    // --- Update building level (only if buildings changed) ---
    if (buildingsChanged) {
   //   console.log("Updating building card for:", buildingId, "to level", currentLevel);
      const levelDiv = card.querySelector('.buildingLevel');
      levelDiv.textContent = `Level ${currentLevel}`;
    }

    // --- Update production info (only if buildings changed) ---
    if (buildingsChanged) {
      const productionDiv = card.querySelector('.buildingProduction');
      if (currentLevel > 0) {
        const goldProduction = building.goldIncomePerHit * currentLevel;
        const gemProduction = building.gemPerSecond * currentLevel;

        let productionText = "";
        if (goldProduction > 0) {
          productionText += `${goldProduction.toFixed(1)}g/s`;
        }
        if (gemProduction > 0) {
          if (productionText) productionText += " ";
          productionText += `${gemProduction.toFixed(3)}💎/s`;
        }

        productionDiv.textContent = productionText || "No production";
        productionDiv.style.display = "block";
      } else {
        productionDiv.textContent = "";
        productionDiv.style.display = "none";
      }
    }

    // --- Update upgrade button (if gold/gems/buildings/hero level changed) ---
    if (goldChanged || gemsChanged || buildingsChanged || heroLevelChanged) {
      const btn = card.querySelector('.upgradeBtn');
      const canAfford = state.resources.gold >= nextLevelCost.gold &&
                       state.resources.gems >= nextLevelCost.gems;
      const meetsRequirements = checkBuildingRequirements(building) &&
                                currentLevel < partyState.heroLevel &&
                                currentHeroLevel >= (building.reqHeroLevel || 0) &&
                                checkDungeonProgressRequirement(building);

      // Reset state-related classes (but don’t wipe children like tooltips)
      btn.classList.remove("blocked", "unaffordable", "affordable");

      if (!meetsRequirements) {
        btn.classList.add("blocked");
        btn.disabled = true;
      } else if (!canAfford) {
        btn.classList.add("unaffordable");
        btn.disabled = true;
      } else {
        btn.classList.add("affordable");
        btn.disabled = false;
      }

      const costSpan = btn.querySelector('.upgrade-cost'); 
      costSpan.textContent = `${formattedGold.text}${formattedGold.suffix}g${nextLevelCost.gems > 0 ? ` ${nextLevelCost.gems}💎` : ""}`;
        
    }

    // --- Update card appearance (only if buildings changed) ---
    if (buildingsChanged) {
      card.classList.remove("not-built", "low-level", "medium-level", "high-level");

      if (currentLevel === 0) {
        card.classList.add("not-built");
      } else if (currentLevel >= 10) {
        card.classList.add("high-level");
      } else if (currentLevel >= 5) {
        card.classList.add("medium-level");
      } else {
        card.classList.add("low-level");
      }
    }
  });

  // Save state snapshot
  // Save state snapshot (deep clone buildings to detect level changes)
  lastBuildingState = {
    gold: currentGold,
    gems: currentGems,
    buildings: currentBuildings.map(b => ({ ...b })), // <-- FIX
    heroLevel: currentHeroLevel
  };

}

/*
function showRequirementTooltip(button, building) {
  const tooltip = button.querySelector('.requirement-tooltip');
  if (!tooltip) {
    console.error('Tooltip element not found');
    return;
  }

  if (!building.buildingRequired || checkBuildingRequirements(building)) {
    tooltip.style.display = 'none';
    return;
  }

  const requirements = Array.isArray(building.buildingRequired) 
    ? building.buildingRequired 
    : [building.buildingRequired];
  
  let tooltipText = "Requirements:<br>";
  requirements.forEach(req => {
    const currentLevel = getBuildingLevel(req.id);
    const met = currentLevel >= req.level;
    const status = met ? "✓" : "✗";
    const color = met ? "#4CAF50" : "#f44336";
    tooltipText += `<span style="color: ${color}">${status} ${req.id} Level ${req.level} (${currentLevel})</span><br>`;
  });
  
  tooltip.innerHTML = tooltipText;
  tooltip.style.display = 'block';
}

function hideRequirementTooltip(button) {
  const tooltip = button.querySelector('.requirement-tooltip');
  if (!tooltip) {
    console.error('Tooltip element not found');
    return;
  }

  tooltip.style.display = 'none';
}
*/

// Helper function to get building level
export function getBuildingLevel(buildingId) {
  if (!state.buildings) return 0;
  const buildingData = state.buildings.find(b => b.id === buildingId);
  return buildingData ? buildingData.level : 0;
}

// Helper function to calculate upgrade cost (could be exponential scaling)
function calculateUpgradeCost(building, currentLevel) {
  const nextLevel = currentLevel + 1;
  const multiplier = Math.pow(1.2, currentLevel); // 20% cost increase per level
  
  return {
    gold: Math.floor(building.goldCost * multiplier),
    gems: Math.floor((building.gemCost || 0) * multiplier)
  };
}

// Helper function to check building requirements
function checkBuildingRequirements(building) {
  if (!building.buildingRequired) return true;
  
  // Handle single requirement (object) or multiple requirements (array)
  const requirements = Array.isArray(building.buildingRequired) 
    ? building.buildingRequired 
    : [building.buildingRequired];
  
  return requirements.every(req => {
    const requiredLevel = getBuildingLevel(req.id);
    return requiredLevel >= req.level;
  });
}
function checkDungeonProgressRequirement(building) {
  if (!building.dungeonProgressRequired) return true;
  // Use dungeon max depth as the player's best recorded progress
  const { maxDepth } = getDungeonStats();
  return maxDepth >= building.dungeonProgressRequired;
}

// Helper function to compare arrays
function arraysEqual(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every((val, index) => JSON.stringify(val) === JSON.stringify(b[index]));
}

function upgradeBuilding(buildingId) {
  const lastTotalGems = state.resources.gems;
  console.log("Attempting to upgrade building:", buildingId);
  const building = buildings.find(b => b.id === buildingId);
  if (!building) return;

  const currentLevel = getBuildingLevel(buildingId);
  const meetsDungeonRequirement = checkDungeonProgressRequirement(building);
  const upgradeCost = calculateUpgradeCost(building, currentLevel);

  if (state.resources.gold >= upgradeCost.gold &&
      state.resources.gems >= upgradeCost.gems && 
      currentLevel < partyState.heroLevel &&
      checkBuildingRequirements(building) &&
      meetsDungeonRequirement) {
    
    state.resources.gold -= upgradeCost.gold;
    state.resources.gems -= upgradeCost.gems;
    
    // Initialize buildings array if it doesn't exist
    if (!state.buildings) {
      state.buildings = [];
    }
    
    // Find existing building or create new one
    let buildingData = state.buildings.find(b => b.id === buildingId);
    if (buildingData) {
      console.log('[Building Data]: ', buildingData);
      buildingData.level++;
    } else {
      state.buildings.push({ id: buildingId, level: 1 });
    }
    if (building.id === "blacksmith"){ 
      const blacksmithLevel = getBuildingLevel(building.id);
      const attackBonus = 2 + Math.floor((blacksmithLevel ** 0.8) * 0.1);
      addHeroBonus('attack', attackBonus);
    }
    if (building.id === "gemMine"){
      const gemMineLevel = getBuildingLevel(building.id);
      if (gemMineLevel % 5 === 0) {
        const maxGemsBonus = 5 + Math.floor(gemMineLevel / 5) * 5;
        state.resources.maxGems += maxGemsBonus;
        emit("maxGemsChanged", state.resources.maxGems);
      }
    }
      /*
    if (building.id === 'library'){
      partyState.heroBonuses[state.libraryUpgrade] += 0.10;
      updateElementalModifiers();
    }
      */
    const buildingLevel = getBuildingLevel(buildingId);
    //console.log(buildingData);
    if (building.upgradedClasses && buildingLevel > 1) upgradeLinkedClasses(building);
    // --- NEW: upgrade linked classes ---
    // Emit upgrade event with building data
    emit("buildingUpgraded", { ...building, level: buildingData ? buildingData.level : 1 });

    emit("goldChanged", state.resources.gold);
    if (state.resources.gems !== lastTotalGems) emit("gemsChanged", state.resources.gems);
    emit("buildingsChanged", state.buildings);
  }
}

/**
 * Upgrade classes linked to a building
 * @param {Object} building - The building object with upgradedClasses property
 */
export function upgradeLinkedClasses(building) {
  if (!building.upgradedClasses) return;
  
  const upgraded = Array.isArray(building.upgradedClasses)
    ? building.upgradedClasses
    : [building.upgradedClasses];
  
  upgraded.forEach(upgrade => {
    const classId = upgrade.id;
    const levelsToAdd = upgrade.levels || 1; // Allow upgrading by multiple levels
    
    // Increase class level
    partyState.classLevels[classId] = (partyState.classLevels[classId] || 1) + levelsToAdd;
    const newLevel = partyState.classLevels[classId];
    
    console.log(`Upgraded ${classId} to level ${newLevel}`);
    
    // Update party member if currently in party
    const partyMember = partyState.party.find(p => p.id === classId);
    if (partyMember) {
      const classTemplate = classes.find(c => c.id === classId);
      if (classTemplate) {
        partyMember.level = newLevel;
        partyMember.stats = calculateClassStats(classTemplate, newLevel);
        updateUnlockedSkills(partyMember);
        emit("partyMemberUpdated", partyMember);
      }
    }
    
    emit("classUpgraded", { id: classId, level: newLevel });
  });
  
  // Only recalculate totals once after all upgrades
  if (upgraded.some(u => partyState.party.some(p => p.id === u.id))) {
    updateTotalStats();
  }
}