// ==============================
// SAVE / LOAD / RESET SYSTEM
// ==============================

import { state, partyState, spellHandState, runeState,
         quickSpellState } from "../state.js";
import { dungeonState } from "../dungeonMode.js";
import { dungeonProgress } from "./milestones.js";
import { emit } from "../events.js";
import { renderAreaPanel } from "../area.js";
import { renderPartyPanel, togglePartyMember } from "../party.js";

const SAVE_KEY = "cityOfMightSave";

// Accumulator for loop-based autosave
let saveTimer = 0;
const AUTOSAVE_INTERVAL = 30; // seconds


// ------------------------------
// SAVE GAME
// ------------------------------
export async function saveGame() {
  const saveData = {
    state,
    partyState,
    spellHandState,
    runeState,
    quickSpellState,
    dungeonState,
    dungeonProgress
  };

  localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
  console.log("%c[SAVE] Game Saved", "color:lime");

  emit("gameSaved");
}


// ------------------------------
// LOAD GAME
// ------------------------------
export async function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw);

    Object.assign(state, parsed.state);
    Object.assign(partyState, parsed.partyState);
    Object.assign(spellHandState, parsed.spellHandState);
    Object.assign(runeState, parsed.runeState);
    Object.assign(quickSpellState, parsed.quickSpellState);
    Object.assign(dungeonState, parsed.dungeonState);
    Object.assign(dungeonProgress, parsed.dungeonProgress);

    // Re-initialize party members based on loaded state
    if (partyState.party.length > 0){
        partyState.party.forEach((member, index) => {
        if (member.active) {
            togglePartyMember(index, true);
        }
        });
        renderPartyPanel();
    }
    console.log("%c[LOAD] Game Loaded", "color:cyan");
    console.log(dungeonState);
    renderAreaPanel();
    emit("gameLoaded");

    // If a wave was active when saved, resume its timer
    if (parsed.state.activeWave) {
        emit("resumeWaveTimer");
    }

    return true;

  } catch (err) {
    console.error("❌ Load error:", err);
    return false;
  }
}


// ------------------------------
// RESET GAME / NEW GAME
// ------------------------------
export async function resetGame() {
  localStorage.removeItem(SAVE_KEY);
  window.location.reload(); // cleanest form of reset
}


// ------------------------------
// LOOP-DRIVEN AUTOSAVE
// (called from update(delta))
// ------------------------------
export async function autosaveUpdate(delta) {

  // Only save if NOT in dungeon mode
  if (dungeonState.active || !state.activeWave) return;

  saveTimer += delta;

  if (saveTimer >= AUTOSAVE_INTERVAL) {
    saveTimer -= AUTOSAVE_INTERVAL;
    saveGame();
  }
}

window.newGame = async () => {
  await resetGame();
};
