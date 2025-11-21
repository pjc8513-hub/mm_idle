// floatingText.js
import { formatNumber, suffixColors } from './math.js';
import { getEnemyCanvasPosition } from '../area.js';
/**
 * Floating text animation system for combat feedback
 */

class FloatingText {
  constructor(text, x, y, color, duration = 1000, fontSize = 24, type = 'normal') {
    this.text = text;
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;
    this.color = color;
    this.duration = duration;
    this.elapsed = 0;
    this.alpha = 1;
    this.scale = 1;
    this.fontSize = fontSize;
    this.type = type; // 'normal', 'damage', 'critical'
  }

  update(delta) {
    this.elapsed += delta * 1000; // convert to ms
    const progress = this.elapsed / this.duration;

    if (progress >= 1) {
      return false; // Animation complete
    }

    // Rise upward
    this.y = this.startY - (progress * 50); // Rise 50 pixels

    // Fade out in the last 40% of animation
    if (progress > 0.6) {
      this.alpha = 1 - ((progress - 0.6) / 0.4);
    }

    // Scale effect based on type
    if (this.type === 'critical') {
      // Critical hits: bigger bounce
      if (progress < 0.2) {
        this.scale = 1 + (progress / 0.2) * 0.5; // Grow to 1.5x
      } else if (progress > 0.8) {
        this.scale = 1.5 - ((progress - 0.8) / 0.2) * 0.5;
      } else {
        this.scale = 1.5;
      }
    } else if (this.type === 'damage') {
      // Regular damage: subtle grow
      if (progress < 0.15) {
        this.scale = 1 + (progress / 0.15) * 0.2; // Grow to 1.2x
      } else if (progress > 0.85) {
        this.scale = 1.2 - ((progress - 0.85) / 0.15) * 0.2;
      } else {
        this.scale = 1.2;
      }
    }else if (this.type === 'achievement') {
      // Achievement toast: big, slow float
      if (progress < 0.25) {
        this.scale = 1 + (progress / 0.25) * 0.5; // Up to 1.5x
      } else if (progress > 0.75) {
        this.scale = 1.5 - ((progress - 0.75) / 0.25) * 0.5;
      } else {
        this.scale = 1.5;
      }

      this.y = this.startY - (progress * 30); // Slight rise
    } else {
      // Status text (WEAK/RESIST): medium bounce
      if (progress < 0.2) {
        this.scale = 1 + (progress / 0.2) * 0.3;
      } else if (progress > 0.8) {
        this.scale = 1.3 - ((progress - 0.8) / 0.2) * 0.3;
      } else {
        this.scale = 1.3;
      }
    } 

    return true; // Continue animating
  }

  render(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.font = `bold ${Math.floor(this.fontSize * this.scale)}px Arial`;
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw text outline
    ctx.strokeText(this.text, this.x, this.y);
    // Draw text fill
    ctx.fillText(this.text, this.x, this.y);
    
    ctx.restore();
  }
}

// Manager for all floating texts
class FloatingTextManager {
  constructor() {
    this.texts = [];
    this.canvas = null;
    this.ctx = null;
  }

  initialize(canvasId = 'enemyEffectsCanvas') {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.warn(`Canvas ${canvasId} not found for floating text`);
      return false;
    }
    this.ctx = this.canvas.getContext('2d');
    return true;
  }

  addText(text, x, y, color, duration = 1000, fontSize = 24, type = 'normal') {
    this.texts.push(new FloatingText(text, x, y, color, duration, fontSize, type));
  }

  /**
   * Show damage number with formatted color
   * @param {number} damage - Raw damage number
   * @param {number} x - Canvas x position
   * @param {number} y - Canvas y position
   * @param {boolean} isCritical - Whether this is a critical hit
   */
  showDamage(damage, x, y, isCritical = false) {
    const formatted = formatNumber(Math.floor(damage));
    const color = suffixColors[formatted.suffix] || 'white';
    const fontSize = isCritical ? 32 : 28;
    const type = isCritical ? 'critical' : 'damage';
    const duration = isCritical ? 1400 : 1200;
    
    // Offset damage numbers slightly to the right
    const offsetX = x + 20;
    
    this.addText(formatted.text, offsetX, y, color, duration, fontSize, type);
  }

  /**
   * Show elemental effectiveness feedback
   * @param {string} matchup - 'weakness', 'resistance', or 'neutral'
   * @param {number} x - Canvas x position
   * @param {number} y - Canvas y position
   */
  showElementalFeedback(matchup, x, y) {
    if (matchup === 'weakness') {
      this.addText('WEAK', x, y, '#00ff00', 1200, 24, 'normal'); // Green
    } else if (matchup === 'resistance') {
      this.addText('RESIST', x, y, '#ff4444', 1200, 24, 'normal'); // Red
    } else if (matchup === 'immune'){
      this.addText('IMMUNE', x, y, '#ec587dff', 1200, 24, 'normal')
    }
    // No text for neutral
  }

  addDOTText(row, col, damage, isCritical=false) {
    const pos = getEnemyCanvasPosition(row, col);
    const formatted = formatNumber(Math.floor(damage));
    const color = suffixColors[formatted.suffix] || 'white';
    const fontSize = isCritical ? 32 : 28;
    const type = isCritical ? 'critical' : 'damage';
    const duration = isCritical ? 1400 : 1200;
    if (!pos) return;

    const offsetY = pos.y + 20;
    // Offset damage numbers slightly to the left
    const offsetX = pos.x - 15;
    //console.log(formatted.text, offsetX, pos.y, color, duration, fontSize, type);
    this.addText(formatted.text, offsetX, offsetY, color, duration, fontSize, type);
  }

  update(delta) {
    // Update all texts and remove completed ones
    this.texts = this.texts.filter(text => text.update(delta));
  }

  render() {
    if (!this.ctx) return;
    
    // Render all active texts
    this.texts.forEach(text => text.render(this.ctx));
  }

  clear() {
    this.texts = [];
  }
  /**
   * Show a global achievement toast
   * Appears centered at top of canvas
   */
  showAchievement(message) {
    if (!this.canvas) return;
    
    const x = this.canvas.width / 2;
    const y = 80; // Top region
    
    this.addText(
      message,
      x,
      y,
      '#FFD700',      // Gold color
      2000,           // Duration
      36,             // Font size
      'achievement'   // New type for special scaling
    );
}

}

// Export singleton instance
export const floatingTextManager = new FloatingTextManager();