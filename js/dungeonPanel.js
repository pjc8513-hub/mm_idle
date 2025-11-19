import { startDungeonMode, getDungeonStats, dungeonState } from "./dungeonMode.js";
import { partyState } from "./state.js";
import { on, emit } from "./events.js";

export function initDungeonPanel() {
  // Re-render panel on dungeon events
  on("dungeonModeStarted", renderDungeonPanel);
  on("dungeonModeEnded", renderDungeonPanel);
  on("dungeonEnemyDefeated", renderDungeonPanel);
  
  console.log("Dungeon panel initialized");
}

export function renderDungeonPanel() {
  const panel = document.getElementById("panelDungeon");
  if (!panel) return;

  const stats = getDungeonStats();
  
  if (stats.active) {
    // Show active dungeon stats
    panel.innerHTML = `
      <div class="dungeon-panel-content">
        <h2>🏰 Dungeon Mode - ACTIVE</h2>
        
        <div class="dungeon-active-stats">
          <div class="stat-box">
            <div class="stat-label">Current Depth</div>
            <div class="stat-value">${stats.depth}</div>
          </div>
          
          <div class="stat-box">
            <div class="stat-label">Enemies Defeated</div>
            <div class="stat-value">${stats.enemiesDefeated}</div>
          </div>
          
          <div class="stat-box">
            <div class="stat-label">Best Run</div>
            <div class="stat-value">${stats.maxDepth}</div>
          </div>
        </div>
        
        <div class="dungeon-info">
          <p>⏱️ Defeat enemies to refill your timer!</p>
          <p>⚠️ Running out of time ends the dungeon run</p>
        </div>
        
        <button id="exitDungeonBtn" class="dungeon-btn exit-btn">
          ❌ Exit Dungeon (Forfeit Rewards)
        </button>
      </div>
    `;
    
    // Add exit button handler (optional early exit)
    document.getElementById("exitDungeonBtn")?.addEventListener("click", () => {
      if (confirm("Are you sure? You'll lose all current dungeon progress!")) {
        dungeonState.depth = 0;
        dungeonState.enemiesDefeated = 0;
        emit("waveTimedOut"); // Trigger dungeon end
      }
    });
    
  } else {
    // Show dungeon entry screen
    const isPartyFull = partyState.party.length >= 4;
    const enterDungeonBtnHtml = `
      <button id="enterDungeonBtn" class="dungeon-btn enter-btn ${isPartyFull ? '' : 'disabled-btn'}" ${isPartyFull ? '' : 'disabled'}>
        ⚔️ Enter Dungeon
      </button>
      ${isPartyFull ? '' : '<p style="color: red;">Must form a full party to enter</p>'}
    `;
    panel.innerHTML = `
      <div class="dungeon-panel-content">
        <h2>🏰 Dungeon Mode</h2>
        
        <div class="dungeon-description">
          <p>Enter the endless dungeon and test your skills!</p>
          
          <h3>Rules:</h3>
          <ul>
            <li>🎯 10 second timer that refills on each kill</li>
            <li>⚔️ Endless waves of increasingly difficult enemies</li>
            <li>💰 Earn gold based on depth and enemies defeated</li>
            <li>⏱️ Run ends when timer reaches zero</li>
          </ul>
        </div>
        
        <div class="dungeon-records">
          <h3>📊 Your Records</h3>
          <div class="record-item">
            <span>Best Depth:</span>
            <span class="record-value">${stats.maxDepth}</span>
          </div>
        </div>
        
        ${enterDungeonBtnHtml}
      </div>
    `;
    
    // Add enter button handler
    document.getElementById("enterDungeonBtn")?.addEventListener("click", () => {
      if (startDungeonMode()) {
        // Switch to area panel to see the action
        emit("panelChange", "panelArea");
      }
    });
  }
  
  addDungeonPanelCSS();
}

function addDungeonPanelCSS() {
  if (document.getElementById('dungeon-panel-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'dungeon-panel-styles';
  style.textContent = `
    .dungeon-panel-content {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .dungeon-panel-content h2 {
      text-align: center;
      color: #9c27b0;
      font-size: 2em;
      margin-bottom: 20px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    
    .dungeon-description {
      background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      border: 2px solid #ce93d8;
    }
    
    .dungeon-description h3 {
      color: #7b1fa2;
      margin-top: 15px;
      margin-bottom: 10px;
    }
    
    .dungeon-description ul {
      list-style: none;
      padding-left: 0;
    }
    
    .dungeon-description li {
      padding: 8px 0;
      border-bottom: 1px solid rgba(156, 39, 176, 0.2);
    }
    
    .dungeon-description li:last-child {
      border-bottom: none;
    }
    
    .dungeon-active-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .stat-box {
      background: linear-gradient(135deg, #4a148c 0%, #6a1b9a 100%);
      color: white;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .stat-label {
      font-size: 0.9em;
      opacity: 0.9;
      margin-bottom: 8px;
    }
    
    .stat-value {
      font-size: 2em;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    
    .dungeon-info {
      background: #fff3e0;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      border-left: 4px solid #ff9800;
    }
    
    .dungeon-info p {
      margin: 8px 0;
    }
    
    .dungeon-records {
      background: white;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      border: 1px solid #ddd;
    }
    
    .dungeon-records h3 {
      color: #7b1fa2;
      margin-bottom: 10px;
    }
    
    .record-item {
      display: flex;
      justify-content: space-between;
      padding: 10px;
      border-bottom: 1px solid #eee;
    }
    
    .record-value {
      font-weight: bold;
      color: #9c27b0;
    }
    
    .dungeon-btn {
      width: 100%;
      padding: 15px;
      font-size: 1.2em;
      font-weight: bold;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .enter-btn {
      background: linear-gradient(135deg, #4a148c 0%, #6a1b9a 100%);
      color: white;
      box-shadow: 0 4px 6px rgba(0,0,0,0.2);
    }
    
    .enter-btn:hover {
      background: linear-gradient(135deg, #6a1b9a 0%, #8e24aa 100%);
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0,0,0,0.3);
    }
    
    .exit-btn {
      background: linear-gradient(135deg, #c62828 0%, #e53935 100%);
      color: white;
      box-shadow: 0 4px 6px rgba(0,0,0,0.2);
    }
    
    .exit-btn:hover {
      background: linear-gradient(135deg, #e53935 0%, #f44336 100%);
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0,0,0,0.3);
    }
    
    @media (max-width: 768px) {
      .dungeon-active-stats {
        grid-template-columns: 1fr;
      }
    }
  `;
  
  document.head.appendChild(style);
}