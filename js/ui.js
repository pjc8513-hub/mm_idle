import { state, spellHandState } from "./state.js";
import { AREA_TEMPLATES } from "./content/areaDefs.js";
import { renderPartyPanel } from "./party.js";
import { renderBuildingPanel } from "./town.js";
import { renderDungeonPanel } from "./dungeonPanel.js";
import { renderAreaPanel, setupEnemyEffectsCanvas } from "./area.js";
import { renderQuestPanel } from "./questManager.js";
import { on } from "./events.js";
import { floatingTextManager } from "./systems/floatingtext.js";
import { renderSpellbookPanel } from "./spellbookPanel.js";
import { updateDockIfEnemyChanged } from "./systems/dockManager.js";
import { openDock, closeDock, DOCK_TYPES } from "./systems/dockManager.js";
//import { heroSpells } from "./content/heroSpells.js";
import { drawSpellHand, castSpellFromHand } from "./area.js";
import { renderRunePanel } from "./runePanel.js";
import { resetGame } from "./systems/saveSystem.js";
import { applyAscensionBoon, ascend } from "./systems/ascensionSystem.js";

export function initUI() {
  // panel switching (all buttons except New Game)
  const buttons = document.querySelectorAll("#sidePanel button[data-panel]");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-panel");
      showPanel(target);
    });
  });

    // -------------------------------
  // NEW GAME BUTTON SPECIAL LOGIC
  // -------------------------------
  const newGameBtn = document.getElementById("newGameBtn");
  const ring = newGameBtn.querySelector("circle");

  const radius = ring.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;

  ring.style.strokeDasharray = `${circumference}`;
  ring.style.strokeDashoffset = `${circumference}`;

  let hoverInterval = null;
  let hoverTime = 0;
  const requiredTime = 2000; // 2 seconds
  let armed = false;

  function resetProgress() {
    hoverTime = 0;
    ring.style.strokeDashoffset = circumference;
    newGameBtn.classList.remove("armed");
    armed = false;
  }

  newGameBtn.addEventListener("mouseenter", () => {
    resetProgress();
    hoverInterval = setInterval(() => {
      hoverTime += 50;

      const progress = hoverTime / requiredTime;
      ring.style.strokeDashoffset = circumference * (1 - progress);

      // Fully armed
      if (hoverTime >= requiredTime) {
        clearInterval(hoverInterval);
        armed = true;
        newGameBtn.classList.add("armed");
      }
    }, 50);
  });

  newGameBtn.addEventListener("mouseleave", () => {
    clearInterval(hoverInterval);
    resetProgress();
  });

  newGameBtn.addEventListener("click", async () => {
    if (!armed) return;

    const yes = confirm(
      "Are you sure you want to start a NEW GAME?\nThis deletes all progress."
    );

    if (yes) {
      await resetGame();
    } else {
      resetProgress();
    }
  });

  // ✅ FIXED: Attach to mainDock instead of document
const mainDock = document.getElementById("mainDock");
if (mainDock) {
  mainDock.addEventListener('click', (e) => {
    // Handle spell casting
    const spellBtn = e.target.closest('.quick-spell-btn');
    if (spellBtn && !spellBtn.disabled) {  // ✅ Add disabled check
      const spellId = spellBtn.dataset.spellId;
      const handIndex = parseInt(spellBtn.dataset.handIndex, 10);  // ✅ Get index
      castSpellFromHand(spellId, handIndex);  // ✅ Pass both
      spellHandState.lastHeroSpellId = spellId;
      return;
    }
    
    // Handle draw button
    const drawBtn = e.target.closest('.draw-spells-btn');
    if (drawBtn && !drawBtn.disabled) {
      drawSpellHand();
    }
  });
}

on("enemyDamaged", (enemy) => {
    const dock = document.getElementById("mainDock");
    if (dock && !dock.classList.contains("hidden")) {
      //console.log("enemy damaged");
      if (state.activePanel === "panelArea") {
        //console.log("enemy damaged");
        // Update the UI if that enemy is open in the dock
        updateDockIfEnemyChanged(enemy);
      }
    }
});  

on("healTriggered", ({ amount }) => {
  if (state.activePanel !== "panelArea") return;
  const timerBar = document.getElementById("waveTimerBar");
  const canvas = document.getElementById("enemyEffectsCanvas");
  if (!timerBar || !canvas) return;

  const rect = timerBar.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();

  // Position floating text above timer
  const x = (rect.left + rect.right) / 2 - canvasRect.left;
  const y = rect.top - canvasRect.top - 20;
  const color = "#7eff7e";

  floatingTextManager.addText(`+${amount}s`, x, y, color, 1200, 28, "normal");

  // 🔆 Add heal pulse animation to the timer bar
  timerBar.classList.add("heal-pulse");
  setTimeout(() => timerBar.classList.remove("heal-pulse"), 1200);
});

  on("milestoneAwarded", (milestones) => {
    console.log("Milestones awarded:", milestones);
    milestones.forEach(m => {
      floatingTextManager.showAchievement(`Milestone: ${m.description}!`);
    });
  });

  // show default
  document.getElementById("game").classList.add("area-bg");
  showPanel("panelArea");

  // render Party Panel initially
  //  renderPartyPanel();
  // ✅ Toggle log visibility
  const toggle = document.getElementById('log-toggle');
  const log = document.getElementById('log');

  toggle.addEventListener('change', () => {
    console.log('Log toggle changed:', toggle.checked);
    log.style.display = toggle.checked ? 'block' : 'none';
  });
}

export function showPanel(panelId) {
  // Force-close the dock so panel changes always hide it (even quick-spells)
  closeDock({ force: true });
  const panels = document.querySelectorAll(".panel");
  panels.forEach(panel => {
    panel.classList.remove("active");
  });
  document.getElementById(panelId).classList.add("active");

  // Re-render panels on open if needed
  if (panelId === "panelParty") {
    state.activePanel = "panelParty";
    removeBackgroundElement("game");
    document.getElementById("game").classList.add("party-bg");
    console.log(document.getElementById("game").classList);
    removeBackgroundElement("resourceBar");
    document.getElementById("resourceBar").classList.add("party-bg");
    removeBackgroundElement("sidePanel");
    document.getElementById("sidePanel").classList.add("party-bg");
    renderPartyPanel();
  }
  if (panelId === "panelTown") {
    state.activePanel = "panelTown";
    removeBackgroundElement("game");
    document.getElementById("game").classList.add("town-bg");
    removeBackgroundElement("resourceBar");
    document.getElementById("resourceBar").classList.add("town-bg");
    removeBackgroundElement("sidePanel");
    document.getElementById("sidePanel").classList.add("town-bg");
    renderBuildingPanel();
  }
  if (panelId === "panelDungeon") {
    state.activePanel = "panelDungeon";
    removeBackgroundElement("game");
    document.getElementById("game").classList.add("dungeon-bg");
    removeBackgroundElement("resourceBar");
    document.getElementById("resourceBar").classList.add("dungeon-bg");
    removeBackgroundElement("sidePanel");
    document.getElementById("sidePanel").classList.add("dungeon-bg");
    renderDungeonPanel(); // ← CRITICAL LINE
  }
  if (panelId === "panelArea") {
    
    state.activePanel = "panelArea";
    const area = AREA_TEMPLATES[state.currentArea];
    const gameEl = document.getElementById("game");
    const resourceBarEl = document.getElementById("resourceBar");
    const sidePanelEl = document.getElementById("sidePanel");    
    removeBackgroundElement("game");
    gameEl.style.backgroundImage = `url('assets/images/${area.backgroundImg}')`;
    removeBackgroundElement("resourceBar");
    resourceBarEl.style.backgroundImage = `url('assets/images/${area.topImg}')`;
    removeBackgroundElement("sidePanel");
    sidePanelEl.style.backgroundImage = `url('assets/images/${area.sideImg}')`;
    gameEl.classList.add("area-bg");
    resourceBarEl.classList.add("area-bg");
    sidePanelEl.classList.add("area-bg");
    
   //state.activePanel = "panelArea";
   //applyAreaBackground(AREA_TEMPLATES[state.currentArea]);

    const enemiesGridExists = !!document.getElementById("enemiesGrid");
    if (!enemiesGridExists) {
      renderAreaPanel();
    }
    // Ensure the enemy effects canvas is setup (idempotent)
    setupEnemyEffectsCanvas();

    // Defer the dock opening until the DOM is updated — always attempt to open
    // the quick-spells dock when switching to the Area panel so it reappears
    // even if the panel was previously rendered and the dock closed.
    requestAnimationFrame(() => {
      openDock(DOCK_TYPES.AREA, { type: "quickSpells" }, {
        sourcePanel: "panelArea",
        persist: false
      });
    });

  }
    
  if (panelId === "panelSpellbook") {
    state.activePanel = "panelSpellbook";
    removeBackgroundElement("game");
    document.getElementById("game").classList.add("spellbook-bg");
    removeBackgroundElement("resourceBar");
    document.getElementById("resourceBar").classList.add("spellbook-bg");
    removeBackgroundElement("sidePanel");
    document.getElementById("sidePanel").classList.add("spellbook-bg");
    renderSpellbookPanel();
  }

  if (panelId === "panelQuest") {
    state.activePanel = "panelQuest";
    removeBackgroundElement("game");
    document.getElementById("game").classList.add("spellbook-bg");
    removeBackgroundElement("resourceBar");
    document.getElementById("resourceBar").classList.add("spellbook-bg");
    removeBackgroundElement("sidePanel");
    document.getElementById("sidePanel").classList.add("spellbook-bg");
    renderQuestPanel();
  }

  if (panelId === "panelRune") {
    state.activePanel = "panelRune";
    removeBackgroundElement("game");
    document.getElementById("game").classList.add("party-bg");
    removeBackgroundElement("resourceBar");
    document.getElementById("resourceBar").classList.add("party-bg");
    removeBackgroundElement("sidePanel");
    document.getElementById("sidePanel").classList.add("party-bg");
    renderRunePanel();
  }
}


// Helper for finding and removing the background element
export function removeBackgroundElement(element) {
  const gameElement = document.getElementById(element);
    gameElement.classList.forEach((className) => {
    if (className.endsWith("-bg")) {
      gameElement.classList.remove(className);
    }
  });
  // Clear inline background styles to allow CSS classes to take effect
  gameElement.style.backgroundImage = '';
}

export function applyAreaBackground(area) {
  const gameEl = document.getElementById("game");
  const resourceBarEl = document.getElementById("resourceBar");
  const sidePanelEl = document.getElementById("sidePanel");    

  if (!area || !gameEl || !resourceBarEl || !sidePanelEl) return;

  removeBackgroundElement("game");
  gameEl.style.backgroundImage = `url('assets/images/${area.backgroundImg}')`;

  removeBackgroundElement("resourceBar");
  resourceBarEl.style.backgroundImage = `url('assets/images/${area.topImg}')`;

  removeBackgroundElement("sidePanel");
  sidePanelEl.style.backgroundImage = `url('assets/images/${area.sideImg}')`;

  [gameEl, resourceBarEl, sidePanelEl].forEach(el => el.classList.add("area-bg"));
}

export function showIdleModal(rewards) {
  const modal = document.getElementById("idleModal");
  const msg = document.getElementById("idleMessage");

  const hours = (rewards.seconds / 3600).toFixed(1);

  msg.innerHTML = `
    You were gone for <strong>${hours} hours</strong><br><br>
    <strong>Gold gained:</strong> ${rewards.gold.toLocaleString()}<br>
    <strong>Dungeon essence gained:</strong> ${rewards.essence.toLocaleString()}
  `;

  modal.classList.remove("hidden");

  document.getElementById("idleCloseBtn").onclick = () => {
    modal.classList.add("hidden");
  };
}

ascendBtn.addEventListener("click", () => {
  ascendModal.classList.remove("hidden");
});
ascensionCancel.addEventListener("click", () => {
  ascendModal.classList.add("hidden");
});

document.querySelectorAll(".ascendChoice").forEach(btn => {
  btn.addEventListener("click", () => {
    const boon = btn.dataset.boon;
    applyAscensionBoon(boon);
    ascend();
    ascendModal.classList.add("hidden");
  });
});

