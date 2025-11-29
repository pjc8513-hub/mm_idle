import { state, partyState } from "./state.js";
import { on } from "./events.js";
import { logMessage, logSuccess } from "./systems/log.js";
import { formatNumber } from "./systems/math.js";

export function initRender() {
  // Subscribe to resource updates
  on("goldChanged", () => renderResourceBar());
  on("gemsChanged", () => renderResourceBar());
  on("heroLevelUp", levelAnmiation);

    // Subscribe to recruitment events and log them
  on("classRecruited", (cls) => {
    logSuccess(`You recruited ${cls.name} into your party!`);
    // You could also use cls.name if you prefer:
    // logSuccess(`You recruited ${cls.name} into your party!`);
  });
  on("goldIncomeChanged", (newIncome) => {
    logMessage(`Gold income per second updated: ${newIncome}`);
  });
  on("gemIncomeChanged", (newIncome) => {
    logMessage(`Gem income per second updated: ${newIncome}`);
  });

  // Initial draw
  renderResourceBar();
}

export function renderResourceBar() {
  let displayGold = Math.floor(state.resources.gold);
  let displayAttack;
  if (partyState.party.length !== 0) {
    displayAttack = formatNumber(partyState.totalStats.attack || 0);
  } else {
    displayAttack = { text: "0", suffix: "" };
  }
  displayGold = formatNumber(displayGold);
  document.getElementById("heroLevelResource").textContent = `Hero Level: ${partyState.heroLevel}`;
  document.getElementById("ascensionCount").textContent = ` | Ascensions: ${partyState.ascensionCount}`;
  if (partyState.heroLevel <= 49) {
    document.getElementById("ascendBtn").classList.add("hidden");
    ascendBtn.classList.remove("ascend-pop");
  } else {
    document.getElementById("ascendBtn").classList.remove("hidden");
    ascendBtn.classList.add("ascend-pop");
  }
  document.getElementById("gold").textContent = `Gold: ${displayGold.text}`;
  document.getElementById("gems").textContent = `Gems: ${state.resources.gems.toFixed(0)}/${state.resources.maxGems}`;
  document.getElementById("partyTotals").textContent = `Attack: ${displayAttack.text}`;
}
function levelAnmiation(){
  document.getElementById("heroLevelResource").classList.add
}