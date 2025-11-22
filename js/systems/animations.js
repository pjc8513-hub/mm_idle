// animations.js
import { state, uiState } from '../state.js';
import { emit, on } from '../events.js';
import { getEnemyCanvasPosition } from "../area.js";
import { abilities } from "../content/abilities.js";

export const uiAnimations = {
  heroLevelUp: null, // null or { remaining: seconds }
  
  triggerHeroLevelUp() {
    emit("heroLevelUp");
    this.heroLevelUp = { remaining: 1.2 }; // matches CSS animation duration
  },

  update(delta) {
    if (this.heroLevelUp) {
      this.heroLevelUp.remaining -= delta;
      if (this.heroLevelUp.remaining <= 0) {
        this.heroLevelUp = null;
      }
    }
  }
};


export function initAnimations() {
  // console.log('Animations initializing...');
  // Listen for game events
  on('coinAnimation', handleCoinAnimation);
  on('skillAnimation', handleSkillAnimation);
}

export function handleCoinAnimation(position) {
  if (state.activePanel !== "panelArea") return;
  
  const pos = getEnemyCanvasPosition(position.row, position.col);
  const canvas = document.getElementById("enemyEffectsCanvas");
  
  if (!canvas) {
    // console.log("no canvas (animations)");
    return;
  }
  
  if (uiState.ui?.spriteAnimations && pos) {
    uiState.ui.spriteAnimations.playAnimation({
      targets: [pos],
      spritePath: "../assets/images/sprites/coin_drops2.png", 
      frameWidth: 65,
      frameHeight: 90,
      frameCount: 6,
      frameRate: 12  // 12 frames per second (was 5 ticks/frame = ~12fps at 60fps)
    });
  }
}

export function handleSkillAnimation(id, row, col) {
  // console.log('Triggering skill animation at: ', row, col);
  if (state.activePanel !== "panelArea") return;
  
  const pos = getEnemyCanvasPosition(row, col);
  const canvas = document.getElementById("enemyEffectsCanvas");
  
  if (!canvas) {
    // console.log("no canvas (animations)");
    return;
  }
  
  if (uiState.ui?.spriteAnimations && pos) {
    const skillSpritePath = abilities.find((a) => a.id === id)?.spritePath;
    // console.log("[followThrough animation] spritePath: ", skillSpritePath);
    
    if (!skillSpritePath) return;
    
    uiState.ui.spriteAnimations.playAnimation({
      targets: [pos],
      spritePath: skillSpritePath, 
      frameWidth: 80,
      frameHeight: 90,
      frameCount: 4,
      frameRate: 12  // 12 frames per second
    });
  }
}