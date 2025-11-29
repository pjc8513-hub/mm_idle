// questManager.js
import { state, partyState } from './state.js';
import { ENEMY_TEMPLATES } from './content/enemyDefs.js';
import { emit, on } from './events.js';
import { prefixes } from './content/definitions.js';
import { logMessage } from './systems/log.js';
import { uiAnimations } from './systems/animations.js';
import { addGems } from './incomeSystem.js';
import { levelUpHero } from './systems/math.js';
import { floatingTextManager } from './systems/floatingtext.js';

// Quest configuration
const QUEST_CONFIG = {
  defeat_prefix: {
    enemiesRequired: 5,
    baseExpReward: 100,
    baseGemReward: 1,
    expPerLevel: 20
  },
  defeat_type: {
    enemiesRequired: 10,
    baseExpReward: 200,
    baseGemReward: 1,
    expPerLevel: 50
  }
};

/**
 * Initialize quest system
 * Call this once when game loads
 */

export function initQuestSystem() {
  // Add quest state if not exists
  if (!state.quests) {
    state.quests = {
      prefixQuests: {}, // Key: prefix name, Value: quest object
      typeQuests: {} // key: type name, value: quest object
    };
  }

  // Generate initial quests for unlocked prefixes
  generateTypeQuests();
  generatePrefixQuests();
  

  // Listen for enemy defeats
  on('enemyDefeated', handleEnemyDefeated);

  // Listen for hero level ups to unlock new prefix quests
  on('heroLevelUp', handleHeroLevelUp);
  on("addHeroExp", addHeroExp); // gain hero exp from training center

  // Auto-quest handler
  on('questCompleted', (quest) => {
    if (state.autoQuest) {
     // console.log("[AUTO QUEST] Auto-turning in quest:", quest);

      // Extract the correct key and determine quest type
      let questStoreKey;
      let createFn;
      let key;

      if (quest.type === 'defeat_prefix') {
        questStoreKey = 'prefixQuests';
        createFn = createPrefixQuest;
        key = quest.prefix; // ✅ Use the prefix property
      } else if (quest.type === 'defeat_type') {
        questStoreKey = 'typeQuests';
        createFn = createTypeQuest;
        key = quest.enemyType; // ✅ Use the enemyType property
      }

      if (questStoreKey && createFn && key) {
        // console.log("[AUTO QUEST] Calling completeQuestGeneric with:", questStoreKey, key);
        completeQuestGeneric(questStoreKey, key, createFn);
      } else {
        console.warn("[AUTO QUEST] Missing required data:", { questStoreKey, createFn, key, quest });
      }
    }
  });
  
  // When auto-quest is toggled ON, complete all waiting quests
  on('autoQuestToggled', (enabled) => {
    if (enabled) {
      // console.log("[AUTO QUEST] Bulk completing all ready quests...");
      completeAllReadyQuests();
    }
  });

  // Set up UI
  setupQuestUI();
}



function generateQuests({ questType, sourceList, keyExtractor, questStoreKey, createQuestFn }) {
  sourceList.forEach(item => {
    const key = keyExtractor(item);
    if (!state.quests[questStoreKey][key]) {
      state.quests[questStoreKey][key] = createQuestFn(key);
    }
  });

  emit('questsUpdated');
  if (isPanelActive('panelQuest')) {
    renderQuestPanel();
  }
}

function generatePrefixQuests() {
  const unlockedPrefixes = prefixes.filter(p => partyState.heroLevel >= p.unlocks);
  generateQuests({
    questType: 'defeat_prefix',
    sourceList: unlockedPrefixes,
    keyExtractor: p => p.prefix,
    questStoreKey: 'prefixQuests',
    createQuestFn: createPrefixQuest
  });
}

function generateTypeQuests() {
  const enemyTypes = [...new Set(Object.values(ENEMY_TEMPLATES).map(e => e.type))];
  generateQuests({
    questType: 'defeat_type',
    sourceList: enemyTypes,
    keyExtractor: t => t,
    questStoreKey: 'typeQuests',
    createQuestFn: createTypeQuest
  });
}


function createQuest({ idPrefix, questType, key, configKey }) {
  const config = QUEST_CONFIG[configKey];
  // console.log(config);
  return {
    id: `${idPrefix}_${key}_${Date.now()}`,
    type: questType,
    [questType === 'defeat_prefix' ? 'prefix' : 'enemyType']: key,
    targetCount: config.enemiesRequired,
    currentCount: 0,
    expReward: config.baseExpReward + (partyState.heroLevel * config.expPerLevel),
    gemReward: config.baseGemReward + Math.floor(partyState.heroLevel / 5),
    isComplete: false
  };
}

function createPrefixQuest(prefix) {
  return createQuest({
    idPrefix: 'prefix',
    questType: 'defeat_prefix',
    key: prefix,
    configKey: 'defeat_prefix' // ✅ must match QUEST_CONFIG key
  });
}

function createTypeQuest(type) {
  return createQuest({
    idPrefix: 'type',
    questType: 'defeat_type',
    key: type,
    configKey: 'defeat_type' // ✅ must match QUEST_CONFIG key
  });
}



/**
 * Handle enemy defeated event
 */
function handleEnemyDefeated({ enemy }) {
  const questTypes = [
    { store: 'prefixQuests', key: enemy.prefix, type: 'defeat_prefix' },
    { store: 'typeQuests', key: enemy.type, type: 'defeat_type' }
  ];
  
  // console.log(enemy);
  
  questTypes.forEach(({ store, key, type }) => {
    const quest = state.quests[store]?.[key];
    if (quest && !quest.isComplete) {
      quest.currentCount++;
      // console.log(enemy);
      
      if (quest.currentCount >= quest.targetCount) {
        quest.isComplete = true;
        emit('questCompleted', quest);
        
        // Use setTimeout to ensure flash happens AFTER auto-complete
        setTimeout(() => flashSidePanel(quest), 0);
      }
      
      emit('questProgressUpdated', quest);
      
      if (isPanelActive('panelQuest')) {
        // console.log(enemy);
        updateQuestCard(key, store);
      }
    }
  });
}


/**
 * Handle hero level up - unlock new prefix quests
 */
function handleHeroLevelUp() {
  // console.log("[handleHeroLevelUp] Hero leveled up → regenerating quests...");
  if (partyState.heroLevel === 50) {
  // Ascend button just became available
  const canvas = document.getElementById("enemyEffectsCanvas");

  if (canvas) {
    floatingTextManager.showAchievement("ASCEND UNLOCKED!");
  }
}

  // Regenerate prefix quests
  generateQuests({
    questType: 'defeat_prefix',
    sourceList: state.availablePrefixes || [],
    keyExtractor: prefix => prefix, // or prefix.name if it's an object
    questStoreKey: 'prefixQuests',
    createQuestFn: createPrefixQuest
  });

  // Regenerate type quests
  generateQuests({
    questType: 'defeat_type',
    sourceList: state.availableTypes || [],
    keyExtractor: type => type, // adjust if your data is objects
    questStoreKey: 'typeQuests',
    createQuestFn: createTypeQuest
  });
}


/**
 * Complete a specific quest and grant rewards
 * @param {string} questCategory - The key in state.quests (e.g., 'prefixQuests', 'typeQuests')
 * @param {string} questKey - The identifier for the specific quest (e.g., prefix name or type name)
 * @param {Function} createQuestFn - Function to create a new quest of this type
 */
export function completeQuestGeneric(questCategory, questKey, createQuestFn) {
  const questStore = state.quests[questCategory];
  const oldQuest = questStore?.[questKey];
  

  if (!oldQuest || !oldQuest.isComplete) {
    console.warn(`Cannot complete quest for ${questCategory}: ${questKey}`);
    return;
  }

  // console.log("[COMPLETE QUEST] Starting turn-in:", questCategory, questKey, oldQuest);

  const prevLevel = partyState.heroLevel;

  // Grant rewards
  addHeroExp(oldQuest.expReward);
  addGems(oldQuest.gemReward);
  // console.log(`[COMPLETE QUEST] Gem reward: ${oldQuest.gemReward}`);
  // console.log("[COMPLETE QUEST] After EXP:", { heroLevel: partyState.heroLevel, heroExp: partyState.heroExp });

  // Replace quest with a fresh one
  const newQuest = createQuestFn(questKey);
  questStore[questKey] = newQuest;
  // console.log("[COMPLETE QUEST] New quest created:", newQuest);

  emit('questTurnedIn', {
    questType: oldQuest.type,
    key: questKey,
    expGained: oldQuest.expReward,
    leveledUp: partyState.heroLevel > prevLevel
  });

  // Refresh UI
  if (isPanelActive('panelQuest')) {
    updateQuestPanel();
  }

  // Check if ANY quests across ALL categories are still complete
  const anyQuestsComplete = Object.values(state.quests).some(questStore => 
    Object.values(questStore).some(q => q.isComplete)
  );
  
  // console.log("[COMPLETE QUEST] Any quests complete across all categories?", anyQuestsComplete);
  
  if (!anyQuestsComplete) {
    const panelQuestButton = document.getElementById('panelQuestButton');
    panelQuestButton?.classList.remove('quest-complete');
  }
}

/**
 * Complete all ready quests (used when toggling auto-quest ON)
 */
function completeAllReadyQuests() {
  const questConfig = [
    { category: 'prefixQuests', createFn: createPrefixQuest, getKey: (q) => q.prefix },
    { category: 'typeQuests', createFn: createTypeQuest, getKey: (q) => q.enemyType }
  ];

  questConfig.forEach(({ category, createFn, getKey }) => {
    const questStore = state.quests[category];
    Object.entries(questStore).forEach(([questKey, quest]) => {
      if (quest.isComplete) {
        // console.log(`[AUTO QUEST] Bulk completing ${category}:`, questKey);
        completeQuestGeneric(category, questKey, createFn);
      }
    });
  });
}


/**
 * Add experience to hero and handle leveling
 */
export function addHeroExp(amount) {
  const oldLevel = partyState.heroLevel;
  partyState.heroExp += amount;

  // Calculate exp needed for next level
  let expNeeded = getExpForLevel(partyState.heroLevel + 1);

  // Handle level ups (can be multiple levels)
  while (partyState.heroExp >= expNeeded) {
    levelUpHero();
    expNeeded = getExpForLevel(partyState.heroLevel + 1);
  }

 /* console.log("[EXP] Final hero state:", { 
    level: partyState.heroLevel, 
    exp: partyState.heroExp, 
    nextNeeded: getExpForLevel(partyState.heroLevel + 1) 
  }); */

  updateQuestPanel();
  if (partyState.heroLevel > oldLevel) {
    emit('heroExpChanged', {
      exp: partyState.heroExp,
      oldLevel,
      newLevel: partyState.heroLevel
    });
  }
}

/**
 * Calculate experience needed for a given level
 * Using formula: level^2 * 100
 */
function getExpForLevel(level) {
  return Math.floor(level ** 2 * 100 * (1 + level * 0.015));
}

/**
 * Set up quest UI elements
 */
function setupQuestUI() {
  const questButton = document.querySelector('[data-panel="quest"]');
  if (questButton) {
    questButton.addEventListener('click', renderQuestPanel);
  }

  // Initial render if panel exists
  renderQuestPanel();
}

/**
 * Main render function for quest panel
 */
export function renderQuestPanel() {
  const panel = document.getElementById("panelQuest");
  if (!panel) return;

  // Only do full render if this is the first time or panel is empty
  if (!panel.querySelector('.questGrid')) {
    fullRenderQuestPanel();
  } else {
    updateQuestPanel();
  }
}

/**
 * Full render of quest panel (called once or when structure changes)
 */
/**
 * Full render of quest panel (called once or when structure changes)
 */
function fullRenderQuestPanel() {
  const panel = document.getElementById("panelQuest");

  panel.innerHTML = `
    <div class="quest-panel-header">
      <h2>Quests</h2>
      <div class="quest-hero-info">
        <div class="hero-level">Hero Level: <span id="heroLevel">${partyState.heroLevel}</span></div>
        <div class="hero-exp">
          Experience: <span id="heroExp">${Math.floor(partyState.heroExp)}</span> / 
          <span id="heroExpNeeded">${getExpForLevel(partyState.heroLevel + 1)}</span>
        </div>
      </div>
    </div>

    <!-- Autoquest toggle sits BELOW hero-info -->
    <div id="autoquestToggle">
      <label class="switch">
        <input type="checkbox" id="autoquestCheckbox">
        <span class="slider round"></span>
      </label>
      <span class="switch-label">Auto Complete</span>
    </div>
  `;

  // container for quest cards
  const container = document.createElement("div");
  container.classList.add("questGrid");

  const questTypes = [
    { key: 'prefixQuests', label: 'Prefix' },
    { key: 'typeQuests', label: 'Type' }
  ];

  let totalQuests = 0;

  questTypes.forEach(({ key }) => {
    const quests = state.quests[key] || {};
    Object.entries(quests).forEach(([questKey, quest]) => {
      const questCard = createQuestCard(questKey, quest, key);
      container.appendChild(questCard);
      totalQuests++;
    });
  });

  if (totalQuests === 0) {
    const emptyMessage = document.createElement("div");
    emptyMessage.classList.add("quest-empty-message");
    emptyMessage.textContent = "No quests available yet. Keep playing to unlock more!";
    container.appendChild(emptyMessage);
  }

  panel.appendChild(container);

    // ✅ attach listener to the checkbox input
  const autoQuestCheckbox = document.getElementById("autoquestCheckbox");
  autoQuestCheckbox.addEventListener("change", (e) => {
    state.autoQuest = e.target.checked;
    //console.log("[AUTO QUEST] Auto-complete is now:", state.autoQuest);
    
    // Emit event so questManager can handle bulk completion
    emit('autoQuestToggled', state.autoQuest);
  });

  updateQuestPanel();
}


/**
 * Create a quest card element
 */
function createQuestCard(questKey, quest, questStoreKey) {
  const questCard = document.createElement("div");
  questCard.classList.add("questCard");
  questCard.dataset.questKey = questKey;
  questCard.dataset.questType = quest.type;

  const iconText = document.createElement("div");
  iconText.classList.add("quest-icon");
  iconText.textContent = questKey.charAt(0).toUpperCase();

  const infoOverlay = document.createElement("div");
  infoOverlay.classList.add("questInfo");

  const titleDiv = document.createElement("div");
  titleDiv.classList.add("questTitle");
  titleDiv.textContent = `${questKey} ${quest.type === 'defeat_prefix' ? 'Slayer' : 'Hunter'}`;

  const descDiv = document.createElement("div");
  descDiv.classList.add("questDesc");
  descDiv.textContent = `Defeat ${quest.targetCount} ${questKey} enemies`;

  const progressDiv = document.createElement("div");
  progressDiv.classList.add("questProgress");
  progressDiv.textContent = `Progress: ${quest.currentCount} / ${quest.targetCount}`;

  const rewardDiv = document.createElement("div");
  rewardDiv.classList.add("questReward");
  rewardDiv.textContent = `Reward: ${quest.expReward} EXP | ${quest.gemReward} Gems`;

  infoOverlay.appendChild(titleDiv);
  infoOverlay.appendChild(descDiv);
  infoOverlay.appendChild(progressDiv);
  infoOverlay.appendChild(rewardDiv);

  const btn = document.createElement("button");
  btn.classList.add("completeQuestBtn");
  btn.dataset.questKey = questKey;
  btn.dataset.questStoreKey = questStoreKey;

  const btnText = document.createElement("span");
  btnText.textContent = "Complete";
  btn.appendChild(btnText);

  updateQuestButton(btn, quest);

  btn.addEventListener("click", () => {
    const liveQuest = state.quests[questStoreKey]?.[questKey];
    if (liveQuest && liveQuest.isComplete) {
      const createFn = liveQuest.type === 'defeat_prefix' ? createPrefixQuest : createTypeQuest;
      completeQuestGeneric(questStoreKey, questKey, createFn);
    }
  });



  questCard.appendChild(infoOverlay);
  questCard.appendChild(btn);

  return questCard;
}


/**
 * Update all quest cards (efficient update)
 */
function updateQuestPanel() {
  // Update hero info
  const heroLevelEl = document.getElementById('heroLevel');
  const heroExpEl = document.getElementById('heroExp');
  const heroExpNeededEl = document.getElementById('heroExpNeeded');

  if (heroLevelEl) heroLevelEl.textContent = partyState.heroLevel;
  if (heroExpEl) heroExpEl.textContent = Math.floor(partyState.heroExp);
  if (heroExpNeededEl) heroExpNeededEl.textContent = getExpForLevel(partyState.heroLevel + 1);

  // Update all quest cards across all quest types
  const questTypes = ['prefixQuests', 'typeQuests']; // Add more keys here as needed

  questTypes.forEach(storeKey => {
    const quests = state.quests[storeKey] || {};
    Object.keys(quests).forEach(questKey => {
      updateQuestCard(questKey, storeKey);
    });
  });
}


/**
 * Update a specific quest card
 */
function updateQuestCard(questKey, questStoreKey) {
  const quest = state.quests[questStoreKey]?.[questKey];
  if (!quest) return;

  const card = document.querySelector(`.questCard[data-quest-key="${questKey}"]`);
  if (!card) return;

  // Ensure dataset stays in sync
  card.dataset.questType = quest.type;

  const progressDiv = card.querySelector('.questProgress');
  if (progressDiv) {
    progressDiv.textContent = `Progress: ${quest.currentCount} / ${quest.targetCount}`;
  }

  const btn = card.querySelector('.completeQuestBtn');
  if (btn) {
    updateQuestButton(btn, quest);
  }
}



/**
 * Update quest button appearance based on completion status
 */
function updateQuestButton(btn, quest) {
  if (quest.isComplete) {
    btn.classList.add('quest-ready');
    btn.classList.remove('quest-not-ready');
    btn.disabled = false;
  } else {
    btn.classList.add('quest-not-ready');
    btn.classList.remove('quest-ready');
    btn.disabled = true;
  }
}

function flashSidePanel(quest) {
  // If auto-quest is enabled, don't flash - quest will be auto-completed
  if (state.autoQuest) {
  //  console.log("[FLASH] Skipping flash - auto-quest enabled");
    return;
  }
  
  // Double-check the quest still exists and is still complete in state
  // (it might have been auto-completed already)
  let questStore;
  let questKey;
  
  if (quest.type === 'defeat_prefix') {
    questStore = state.quests.prefixQuests;
    questKey = quest.prefix;
  } else if (quest.type === 'defeat_type') {
    questStore = state.quests.typeQuests;
    questKey = quest.enemyType;
  }
  
  const currentQuest = questStore?.[questKey];
  
  if (!currentQuest || !currentQuest.isComplete) {
   // console.log("[FLASH] Quest no longer complete, skipping flash");
    return;
  }
  
  logMessage(`${questKey} quest waiting to be turned in!`);
  //console.log("[FLASH] Adding quest-complete class for:", questKey);
  const panelQuestButton = document.getElementById('panelQuestButton');
  panelQuestButton?.classList.add('quest-complete');
}

/**
 * Check if a specific panel is currently active
 */
function isPanelActive(panelId) {
  const panel = document.getElementById(panelId);
  return panel && panel.classList.contains('active');
}

export function renderQuestPanelAnimations() {
  if (!isPanelActive('panelQuest')) return;

  const heroLevelEl = document.querySelector(".hero-level"); // <-- select the right element
  if (heroLevelEl) {
    if (uiAnimations.heroLevelUp) {
      heroLevelEl.classList.add("level-up-anim");
      //console.log("Level up animation triggered!", heroLevelEl);

      // remove after animation ends so it can replay later
      heroLevelEl.addEventListener("animationend", () => {
        heroLevelEl.classList.remove("level-up-anim");
      }, { once: true });
    }
  }
}



/**
 * Get all active quests (useful for debugging)
 */
export function getActiveQuests() {
  return state.quests?.prefixQuests || {};
}
