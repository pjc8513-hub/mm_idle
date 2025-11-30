// spellbookPanel.js
import { emit, on } from "./events.js"; // adjust path as needed
import { state, partyState, quickSpellState, spellHandState } from "./state.js";
import { updateSpellDock } from "./systems/dockManager.js";
import { heroSpells } from "./content/heroSpells.js";
import { getBuildingLevel } from "./town.js";

export function initSpellbookPanel() {
  // Re-render whenever gold/gems changes
  on("goldChanged", () => {
    if (document.getElementById("panelSpellbook").classList.contains("active")) {
      renderSpellbookPanel();
    }
  });
    on("gemChanged", () => {
    if (document.getElementById("panelSpellbook").classList.contains("active")) {
      renderSpellbookPanel();
    }
  });
  console.log("Spellbook Panel initialized!");
}

let lastSpellbookState = {
  gold: 0,
  registered: [],
};

// =============================================================
// RENDER ENTRY POINT
// =============================================================

export function renderSpellbookPanel() {
  const panel = document.getElementById("panelSpellbook");

  if (!panel.querySelector(".spellGrid")) {
    fullRenderSpellbookPanel();
  } else {
    updateSpellbookPanel();
  }
}

// =============================================================
// INITIAL FULL RENDER
// =============================================================

function fullRenderSpellbookPanel() {
  const panel = document.getElementById("panelSpellbook");
  panel.innerHTML = `
    <div class="spellbook-panel-header">
      <h2>Spellbook</h2>
    </div>
  `;

  const container = document.createElement("div");
  container.classList.add("spellGrid");

  // Group spells by tier
  const spellsByTier = {};
  heroSpells.forEach(spell => {
    const tier = spell.tier || 1;
    if (!spellsByTier[tier]) {
      spellsByTier[tier] = [];
    }
    spellsByTier[tier].push(spell);
  });

  // Get library building level
  const libraryLevel = getBuildingLevel("library");

  // Render each tier
  const tiers = Object.keys(spellsByTier).sort((a, b) => a - b);
  tiers.forEach(tier => {
    const tierNum = parseInt(tier);
    const isUnlocked = libraryLevel >= tierNum;

    // Tier header
    const tierHeader = document.createElement("div");
    tierHeader.classList.add("spellbook-tier-header");
    tierHeader.innerHTML = `Tier ${tier}`;
    container.appendChild(tierHeader);

    const tierSeparator = document.createElement("hr");
    tierSeparator.classList.add("spellbook-tier-separator");
    container.appendChild(tierSeparator);

    // Tier spell container
    const tierContainer = document.createElement("div");
    tierContainer.classList.add("spellbook-tier-row");
    if (!isUnlocked) {
      tierContainer.classList.add("locked");
    }

    spellsByTier[tier].forEach(spell => {
const spellCard = document.createElement("div");
spellCard.classList.add("spellCard");
spellCard.dataset.spellId = spell.id;
spellCard.dataset.tier = tier;

// Tooltip
spellCard.title = `${spell.name} (Lvl ${spell.skillLevel})\n${spell.description}`;

// Icon
const imageDiv = document.createElement("div");
imageDiv.classList.add("spellImage");
const img = document.createElement("img");
img.src = spell.icon;
img.alt = spell.name;
img.onerror = () => {
  img.style.display = "none";
  imageDiv.innerHTML = `<div class="spell-placeholder">${spell.name[0]}</div>`;
};
imageDiv.appendChild(img);
spellCard.appendChild(imageDiv);

// --- Register button ---
const registerBtn = document.createElement("button");
registerBtn.classList.add("spellRegisterBtn");

// set initial label based on hand contents
updateRegisterButtonState(registerBtn, spell.id, isUnlocked);

// click handler (toggle)
registerBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleRegisterSpell(spell.id);
  updateSpellDock();
  updateSpellbookRegisterButtons(); // refresh all button states
});

spellCard.appendChild(registerBtn);


tierContainer.appendChild(spellCard);

    });

    container.appendChild(tierContainer);
  });

  panel.appendChild(container);

  // initial update
  updateSpellbookPanel();

  // subscribe to events
  setupSpellbookListeners();
}

// =============================================================
// EVENT-DRIVEN UPDATING
// =============================================================

function setupSpellbookListeners() {
  on("goldChanged", updateSpellbookPanel);
  on("spellUpgraded", updateSpellbookPanel);
  on("buildingUpgraded", updateSpellbookPanel);
}

// =============================================================
// INCREMENTAL UPDATE
// =============================================================

export function updateSpellbookPanel() {
  const libraryLevel = getBuildingLevel("library");

  // Update locked/unlocked states
  const tierRows = document.querySelectorAll(".spellbook-tier-row");
  tierRows.forEach(row => {
    const cards = row.querySelectorAll(".spellCard");
    if (cards.length > 0) {
      const tier = parseInt(cards[0].dataset.tier);
      const isUnlocked = libraryLevel >= tier;
      row.classList.toggle("locked", !isUnlocked);
    }
  });

  // Update tooltips with current levels
  const spellCards = document.querySelectorAll(".spellCard");
  spellCards.forEach(card => {
    const spellId = card.dataset.spellId;
    const spell = heroSpells.find(s => s.id === spellId);
    if (spell) {
      card.title = `${spell.name} (Lvl ${spell.skillLevel})\n${spell.description}`;
    }
  });
  updateSpellbookRegisterButtons();

}
// =============================================================
// HELPERS
// =============================================================

function getSpellUpgradeCost(spell) {
  return Math.floor(10 * Math.pow(spell.skillLevel, 2));
}

function spendGold(amount) {
  state.resources.gold = Math.max(0, state.resources.gold - amount);
  emit("goldChanged");
}

function toggleQuickSpell(spellId) {
  const idx = quickSpellState.registered.indexOf(spellId);
  if (idx >= 0) quickSpellState.registered.splice(idx, 1);
  else quickSpellState.registered.push(spellId);
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function registerSpellToHand(spellId) {
  // already in hand? do nothing
  if (spellHandState.hand.includes(spellId)) return;

  // limit reached?
  if (spellHandState.hand.length >= spellHandState.maxHandSize) {
    console.warn("Spell hand is full");
    return;
  }

  spellHandState.hand.push(spellId);
  updateSpellDock();
  updateSpellbookRegisterButtons(); // refresh button states
}

function updateSpellbookRegisterButtons() {
  const libraryLevel = getBuildingLevel("library");

  document.querySelectorAll(".spellCard").forEach(card => {
    const spellId = card.dataset.spellId;
    const tier = parseInt(card.dataset.tier);
    const isUnlocked = libraryLevel >= tier;

    const btn = card.querySelector(".spellRegisterBtn");
    updateRegisterButtonState(btn, spellId, isUnlocked);
  });
}


function toggleRegisterSpell(spellId) {
  const idx = spellHandState.hand.indexOf(spellId);

  if (idx >= 0) {
    // remove
    spellHandState.hand.splice(idx, 1);
  } else {
    // add, enforce cap
    if (spellHandState.hand.length >= spellHandState.maxHandSize) {
      console.warn("Spell hand is full");
      return;
    }
    spellHandState.hand.push(spellId);
  }
}

function updateRegisterButtonState(btn, spellId, isUnlocked = true) {
  const inHand = spellHandState.hand.includes(spellId);
  const isFull = spellHandState.hand.length >= spellHandState.maxHandSize;

  // Set label
  btn.textContent = inHand ? "Unregister" : "Register";

  // If tier locked → disable always
  if (!isUnlocked) {
    btn.disabled = true;
    return;
  }

  // If full AND the spell is not already registered → disable
  btn.disabled = !inHand && isFull;
}
