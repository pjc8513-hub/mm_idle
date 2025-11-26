import { state, partyState } from "./state.js";
import { logMessage } from "./systems/log.js";
import { emit, on } from "./events.js";
import { calculateClassStats, updateElementalModifiers, updateTotalStats } from "./systems/math.js";
import { classes } from "./content/classes.js";
import { attachRequirementTooltip, attachPartyTooltip } from "./tooltip.js";

// Store the last state to detect changes
let lastPartyState = {
  gold: -1,
  gems: -1,
  partySize: -1,
  partyMembers: []
};

export function initPartyPanel() {
  // Re-render whenever gold or party composition changes
  /*
  on("goldChanged", () => {
    if (document.getElementById("panelParty").classList.contains("active")) {
      renderPartyPanel();
    }
  });

  on("gemsChanged", () => {
    if (document.getElementById("panelParty").classList.contains("active")) {
      renderPartyPanel();
    }
  });
*/
  on("partyChanged", () => {
    if (document.getElementById("panelParty").classList.contains("active")) {
      renderPartyPanel();
    }
  });

  on("buildingsChanged", () => {
    if (document.getElementById("panelParty").classList.contains("active")) {
      renderPartyPanel();
    }
  });
}

export function renderPartyPanel() {
  const panel = document.getElementById("panelParty");
  
  // Only do full render if this is the first time or panel is empty
  if (!panel.querySelector('.partyGrid')) {
    fullRenderPartyPanel();
  } else {
    updatePartyPanel();
  }
}

function fullRenderPartyPanel() {
  const panel = document.getElementById("panelParty");
  panel.innerHTML = `
    <div class="party-panel-header">
      <h2>Party</h2>
    </div>
  `;

  const container = document.createElement("div");
  container.classList.add("partyGrid");

  classes.forEach((cls, index) => {
    const partyCard = document.createElement("div");
    partyCard.classList.add("partyCard");
    partyCard.dataset.classId = cls.id;

    // Character image
    const imageDiv = document.createElement("div");
    imageDiv.classList.add("partyImage");
    const img = document.createElement("img");
    img.src = `../assets/images/classes/${cls.id}.png`;
    img.alt = cls.name;
    img.onerror = () => {
      img.style.display = 'none';
      imageDiv.innerHTML = `<div class="party-placeholder">${cls.name[0]}</div>`;
    };
    imageDiv.appendChild(img);

    // Class info overlay
    const infoOverlay = document.createElement("div");
    infoOverlay.classList.add("partyInfo");

    const nameDiv = document.createElement("div");
    nameDiv.classList.add("partyName");
    nameDiv.textContent = cls.name;
    nameDiv.textContent += ` (Lvl ${partyState.classLevels[cls.id] || 1})`;

    // Production info

    const productionDiv = document.createElement("div");
    productionDiv.classList.add("partyProduction");

    infoOverlay.appendChild(nameDiv);
    infoOverlay.appendChild(productionDiv);

    // Purchase/Recruit button
    const btn = document.createElement("button");
    btn.classList.add("purchaseBtn");
    btn.dataset.classId = cls.id;
    btn.dataset.index = index;

    // Span for cost text (this is what gets updated later)
    const costSpan = document.createElement("span");
    costSpan.classList.add("purchase-cost");
    btn.appendChild(costSpan);

    // Tooltip (persistent child)
    attachRequirementTooltip(btn, cls, { checkBuildingRequirements, getBuildingLevel, getHeroLevel: () => partyState.heroLevel });

    // Click listener once
    btn.addEventListener("click", () => {
      recruitClass(cls.id);
    });

    partyCard.appendChild(imageDiv);
    partyCard.appendChild(infoOverlay);
    partyCard.appendChild(btn);
    attachPartyTooltip(partyCard, cls);
    container.appendChild(partyCard);
  });

  panel.appendChild(container);

  // Update initial states
  updatePartyPanel();
}

function updatePartyPanel() {
  const currentGold = Math.floor(state.resources.gold);
  const currentGems = state.resources.gems;
  const currentPartySize = partyState.party.length;
  const currentPartyMembers = [...partyState.party];

  // Detect changes
  const goldChanged = currentGold !== lastPartyState.gold;
  const gemsChanged = currentGems !== (lastPartyState.gems || 0);
  const partySizeChanged = currentPartySize !== lastPartyState.partySize;
  const partyMembersChanged = !arraysEqual(currentPartyMembers, lastPartyState.partyMembers);

  if (!goldChanged && !gemsChanged && !partySizeChanged && !partyMembersChanged) {
    return;
  }

  const partyCards = document.querySelectorAll('.partyCard');

  partyCards.forEach(card => {
    const classId = card.dataset.classId;
    const cls = classes.find(c => c.id === classId);
    if (!cls) return;

    // --- Update production display ---
    const productionDiv = card.querySelector('.partyProduction');
    const goldProduction = cls.goldIncomePerHit || 0;
    const gemProduction = cls.gemPerSecond || 0;

    let productionText = "";
    if (goldProduction > 0) {
      productionText += `${goldProduction.toFixed(1)}g/s`;
    }
    if (gemProduction > 0) {
      if (productionText) productionText += " ";
      productionText += `${gemProduction.toFixed(3)}💎/s`;
    }
    productionDiv.textContent = productionText || "";

    // --- Update level display ---
    const nameDiv = card.querySelector('.partyName');
    nameDiv.textContent = cls.name;
    nameDiv.textContent += ` (Lvl ${partyState.classLevels[cls.id] || 1})`;

    // --- Update purchase button ---
    const btn = card.querySelector('.purchaseBtn');
    const costSpan = btn.querySelector('.purchase-cost');

const isUnlocked = partyState.unlockedClasses.includes(cls.id);
const isInParty = partyState.party.some(member => member.id === cls.id);
const canAfford = state.resources.gold >= cls.goldCost && state.resources.gems >= (cls.gemCost || 0);
const buildingReqMet = checkBuildingRequirements(cls);
const activeMembers = partyState.party.filter(member => !member.isSummon);
const partyFull = activeMembers.length >= partyState.maxPartySize;

btn.classList.remove("recruited", "blocked", "unaffordable", "affordable");

if (isInParty) {
  btn.classList.add("recruited");
  btn.disabled = false; // allow removal
  costSpan.textContent = "✓ In Party (click to remove)";
  btn.onclick = () => togglePartyMember(cls.id);

} else if (isUnlocked) {
  btn.classList.add("affordable");
  btn.disabled = partyFull;
  costSpan.textContent = partyFull ? "Party Full" : "Add to Party";
  btn.onclick = () => togglePartyMember(cls.id);

} else if (!buildingReqMet) {
  btn.classList.add("blocked");
  btn.disabled = true;
  costSpan.textContent = `${cls.goldCost}g${cls.gemCost > 0 ? ` ${cls.gemCost}💎` : ""}`;

} else if (!canAfford) {
  btn.classList.add("unaffordable");
  btn.disabled = true;
  costSpan.textContent = `${cls.goldCost}g${cls.gemCost > 0 ? ` ${cls.gemCost}💎` : ""}`;

} else {
  btn.classList.add("affordable");
  btn.disabled = false;
  costSpan.textContent = `${cls.goldCost}g${cls.gemCost > 0 ? ` ${cls.gemCost}💎` : ""}`;
  btn.onclick = () => recruitClass(cls.id);
}


    // --- Update card status ---
    card.classList.remove("recruited", "blocked", "unaffordable", "available");

    if (isInParty) {
      card.classList.add("recruited");
    } else if (!buildingReqMet) {
      card.classList.add("blocked");
    } else if (!canAfford || partyFull) {
      card.classList.add("unaffordable");
    } else {
      card.classList.add("available");
    }
  });

  // Save snapshot
  lastPartyState = {
    gold: currentGold,
    gems: currentGems,
    partySize: currentPartySize,
    partyMembers: currentPartyMembers
  };
}

// Helper
function checkBuildingRequirements(cls) {
  //console.log("Checking requirements for class:", cls.id);
  //console.log("character building:", cls.buildingRequired);
  if (!cls.buildingRequired) return true;
  
  // Handle single requirement (object) or multiple requirements (array)
  const requirements = Array.isArray(cls.buildingRequired) 
    ? cls.buildingRequired 
    : [cls.buildingRequired];
  
  return requirements.every(req => {
    const requiredLevel = getBuildingLevel(req.id);
    //console.log(`Checking ${req.id}: required ${req.level}, current ${requiredLevel}`);
    return requiredLevel >= req.level;
  });
}

// Helper function to get building level
export function getBuildingLevel(buildingId) {
  if (!state.buildings) return 0;
  const buildingData = state.buildings.find(b => b.id === buildingId);
  return buildingData ? buildingData.level : 0;
}

// Helper function to compare arrays
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((val, index) => val === b[index]);
}

// --- Recruit/Unlock a class (pays cost once) ---
function recruitClass(classId) {
  const cls = classes.find(c => c.id === classId);
  if (!cls) return;

  const alreadyUnlocked = partyState.unlockedClasses.includes(classId);
  const buildingReqMet = checkBuildingRequirements(cls);

  if (!alreadyUnlocked &&
      state.resources.gold >= cls.goldCost &&
      state.resources.gems >= (cls.gemCost || 0) &&
      buildingReqMet) {
    
    // Pay cost
    state.resources.gold -= cls.goldCost;
    state.resources.gems -= (cls.gemCost || 0);

    // Mark unlocked
    // Deep clone to avoid reference issues
    const clsTemplate = classes.find(c => c.id === classId);
    if (!clsTemplate) return;
    const clone = JSON.parse(JSON.stringify(clsTemplate));
    // Use current global level (default 1)
    const level = partyState.classLevels[classId] || 1;
    clone.level = level;

    partyState.classLevels[classId] = level;
    partyState.unlockedClasses.push(classId);
    console.log("Class unlocked:", clone);
    emit("classUnlocked", cls);
    emit("goldChanged", state.resources.gold);
    emit("gemsChanged", state.resources.gems);
  }
}

/**
 * Toggle a class member in/out of the active party
 * @param {string} classId - The ID of the class to toggle
 */
export function togglePartyMember(classId) {
  const idx = partyState.party.findIndex(member => member.id === classId);
  
  if (idx !== -1) {
    // Remove from party
    const removed = partyState.party.splice(idx, 1)[0];
    emit("partyChanged", partyState.party);
    updateTotalStats();
    updateElementalModifiers();
    console.log(`Removed ${removed.name} from party`);
    return;
  }
  
  // Adding to party - validate first
  if (!partyState.unlockedClasses.includes(classId)) {
    console.warn(`Class ${classId} is not unlocked`);
    return;
  }
  
  // Count only non-summon members when checking space
  const nonSummons = partyState.party.filter(m => !m.isSummon);
  if (nonSummons.length >= partyState.maxPartySize) {
    console.warn("Party is full (ignoring summons)");
    return;
  }
  
  // Find the class template
  const classTemplate = classes.find(c => c.id === classId);
  if (!classTemplate) {
    console.error(`Class template not found for ${classId}`);
    return;
  }
  
  // Create a party member instance
  const classLevel = partyState.classLevels[classId] || 1;
  const partyMember = {
    ...JSON.parse(JSON.stringify(classTemplate)), // Clone template
    id: classId,
    level: classLevel,
    stats: calculateClassStats(classTemplate, classLevel)
  };
  
  // Ensure correct skills are active based on level
  updateUnlockedSkills(partyMember);
  
  console.log("Adding to party:", partyMember);
  partyState.party.push(partyMember);
  
  emit("partyChanged", partyState.party);
  updateElementalModifiers();
  updateTotalStats();
}

// Party resonance logic
const resonanceBonuses = {
  2: 0.50,
  3: 1.00,
  4: 2.00
};

/* now uses math/updateElementalModifiers
function updateResonance() {
  const resonanceCounts = {};

  // Count resonance occurrences
  partyState.party.forEach(member => {
    const resonance = member.resonance;
    resonanceCounts[resonance] = (resonanceCounts[resonance] || 0) + 1;
  });

  // Apply bonuses
  Object.keys(resonanceCounts).forEach(resonance => {
    const count = resonanceCounts[resonance];
    const bonus = resonanceBonuses[count] || 0;
    partyState.elementalDmgModifiers[resonance] = (partyState.elementalDmgModifiers[resonance] || 0) + bonus;
  });
  console.log('[party resonance]: ', partyState.elementalDmgModifiers);
}
*/

/**
 * Updates a class's skills based on its abilities and current level.
 * Activates any that meet unlockLevel, disables those that don't.
 * @param {object} classObj - The class object (e.g. rogue)
 */
export function updateUnlockedSkills(classObj) {
  if (!classObj.abilities || !classObj.skills) return;

  classObj.abilities.forEach(ability => {
    const { id, unlockLevel } = ability;

    // If skill is newly unlocked
    if (classObj.level >= unlockLevel && !classObj.skills[id]?.active) {
      if (!classObj.skills[id]) classObj.skills[id] = {};
      classObj.skills[id].active = true;

      // 🟢 Log to the game log
      logMessage(`${classObj.name} unlocked skill: ${id}!`, "success");

      // Optional: emit event for UI
      emit("skillUnlocked", { classId: classObj.id, skillId: id });
    }

    // Disable skills that are above current level (e.g., if level temporarily reduced)
    if (classObj.level < unlockLevel) {
      if (!classObj.skills[id]) classObj.skills[id] = {};
      classObj.skills[id].active = false;
    }
  });
}

window.showParty = function() {
  console.log("Party State:", partyState.party);
}

window.cleanupBrokenSummons = function () {
  const removed = [];

  // iterate backwards to safely splice
  for (let i = partyState.party.length - 1; i >= 0; i--) {
    const member = partyState.party[i];
    if (member.isSummon === true) {
      removed.push(member);
      partyState.party.splice(i, 1);
    }
  }

  if (removed.length > 0) {
    emit("partyChanged", partyState.party);
    updateTotalStats();
    updateElementalModifiers();
  }

  console.log(`Removed ${removed.length} stray summons:`, removed);
};
