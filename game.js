// Base Defense: Storm to Strange
// Main Game Logic

// ============================================================================
// GAME CONSTANTS
// ============================================================================

const CARDS = {
    expand: {
        id: 'expand',
        name: 'Expand',
        icon: '🔲',
        cost: 1,
        type: 'special',
        description: 'Add one tile adjacent to existing base'
    },
    lightningRod: {
        id: 'lightningRod',
        name: 'Lightning Rod',
        icon: '⚡',
        cost: 1,
        type: 'permanent',
        description: 'Absorbs 1 lightning strike per wave'
    },
    wellBucket: {
        id: 'wellBucket',
        name: 'Well Bucket',
        icon: '🪣',
        cost: 1,
        type: 'consumable',
        description: 'Extinguishes 1 fire, then disappears'
    },
    sandbag: {
        id: 'sandbag',
        name: 'Sandbag Wall',
        icon: '🧱',
        cost: 1,
        type: 'upgrade',
        description: 'Reinforce a perimeter wall in a chosen direction to increase its level'
    },
    reinforce: {
        id: 'reinforce',
        name: 'Reinforce',
        icon: '🛡️',
        cost: 1,
        type: 'upgrade',
        description: 'Board up an existing building to give it reinforced wind protection'
    },
    shrine: {
        id: 'shrine',
        name: 'Shrine',
        icon: '⛩️',
        cost: 2,
        type: 'permanent',
        description: 'Generates +1 bonus token each build phase'
    }
};

const EVENTS = {
    lightning: {
        id: 'lightning',
        name: 'Lightning',
        icon: '⚡',
        flavorText: 'Thunder rolls across the sky...'
    },
    fire: {
        id: 'fire',
        name: 'Brush Fire',
        icon: '🔥',
        flavorText: 'Smoke rises on the horizon...'
    },
    flood: {
        id: 'flood',
        name: 'Rogue Wave',
        icon: '🌊',
        flavorText: 'A massive wave approaches...'
    },
    wind: {
        id: 'wind',
        name: 'Wind Gust',
        icon: '💨',
        flavorText: 'A fierce gale approaches...'
    }
};

const WAVE_DEFINITIONS = [
    // Wave 1-3: Single event, low intensity
    { wave: 1, events: [{ type: 'lightning', intensity: 1 }] },
    { wave: 2, events: [{ type: 'fire', intensity: 1 }] },
    { wave: 3, events: [{ type: 'wind', intensity: 1 }] },
    // Wave 4-5: Medium intensity or two events
    { wave: 4, events: [{ type: 'flood', intensity: 1 }] },
    { wave: 5, events: [{ type: 'lightning', intensity: 2 }, { type: 'fire', intensity: 1 }] },
    // Wave 6-8: Mix of events
    { wave: 6, events: [{ type: 'wind', intensity: 2 }, { type: 'lightning', intensity: 1 }] },
    { wave: 7, events: [{ type: 'flood', intensity: 1 }, { type: 'fire', intensity: 2 }] },
    { wave: 8, events: [{ type: 'lightning', intensity: 2 }, { type: 'wind', intensity: 1 }] },
    // Wave 9-12: Multiple events, higher intensity
    { wave: 9, events: [{ type: 'fire', intensity: 2 }, { type: 'flood', intensity: 1 }] },
    { wave: 10, events: [{ type: 'lightning', intensity: 3 }, { type: 'wind', intensity: 2 }] },
    { wave: 11, events: [{ type: 'flood', intensity: 2 }, { type: 'fire', intensity: 2 }] },
    { wave: 12, events: [{ type: 'wind', intensity: 2 }, { type: 'lightning', intensity: 2 }, { type: 'fire', intensity: 1 }] },
    // Wave 13-15: Most dangerous
    { wave: 13, events: [{ type: 'flood', intensity: 2 }, { type: 'lightning', intensity: 3 }] },
    { wave: 14, events: [{ type: 'fire', intensity: 3 }, { type: 'wind', intensity: 2 }, { type: 'lightning', intensity: 1 }] },
    { wave: 15, events: [{ type: 'flood', intensity: 3 }, { type: 'fire', intensity: 2 }, { type: 'wind', intensity: 2 }, { type: 'lightning', intensity: 2 }] }
];

// ============================================================================
// GAME STATE
// ============================================================================

const gameState = {
    wave: 1,
    tokens: 3,
    phase: 'build', // 'build', 'wave', 'gameover'
    selectedCard: null,
    tiles: new Map(), // key: "x,y", value: tile object
    buildings: new Map(), // key: "x,y", value: building object
    walls: new Map(), // key: "x,y:dir", value: { level }
    heartDestroyed: false, // Track if heart is destroyed
    stats: {
        buildingsPlaced: 0,
        buildingsDestroyed: 0,
        tokensEarned: 0,
        tokensSpent: 0
    },
    pendingSandbagTile: null, // Store tile and direction when reinforcing a wall
    firesOnBoard: new Map(), // Track burning tiles: key -> {x, y, clicksNeeded, maxClicks}
    usedLightningRods: new Set(), // Track used rods this wave
    activeLightningStrikes: [] // Track incoming lightning strikes for player interaction
};

// Grid bounds tracking
let gridBounds = { minX: -2, maxX: 2, minY: -2, maxY: 2 };

// ============================================================================
// DOM ELEMENTS
// ============================================================================

const elements = {
    gameGrid: document.getElementById('game-grid'),
    waveNumber: document.getElementById('wave-number'),
    tokenCount: document.getElementById('token-count'),
    cardHand: document.getElementById('card-hand'),
    wavePreview: document.getElementById('wave-preview'),
    threatIcons: document.getElementById('threat-icons'),
    threatText: document.getElementById('threat-text'),
    waveDirectionIndicator: document.getElementById('wave-direction-indicator'),
    startWaveBtn: document.getElementById('start-wave-btn'),
    directionSelector: document.getElementById('direction-selector'),
    gameOverScreen: document.getElementById('game-over-screen'),
    gameOverTitle: document.getElementById('game-over-title'),
    gameStats: document.getElementById('game-stats'),
    restartBtn: document.getElementById('restart-btn'),
    tutorialOverlay: document.getElementById('tutorial-overlay'),
    startGameBtn: document.getElementById('start-game-btn')
};

// ============================================================================
// INITIALIZATION
// ============================================================================

function initGame() {
    // Reset game state
    gameState.wave = 1;
    gameState.tokens = 3;
    gameState.phase = 'build';
    gameState.selectedCard = null;
    gameState.tiles.clear();
    gameState.buildings.clear();
    gameState.walls.clear();
    gameState.heartDestroyed = false;
    gameState.firesOnBoard.clear();
    gameState.usedLightningRods.clear();
    gameState.pendingSandbagTile = null;
    gameState.stats = {
        buildingsPlaced: 0,
        buildingsDestroyed: 0,
        tokensEarned: 3,
        tokensSpent: 0
    };
    clearWaveDirectionIndicator();

    // Create initial 5-tile plus shape
    createTile(0, 0, true);  // Center - Heart
    createTile(0, -1, false); // North
    createTile(1, 0, false);  // East
    createTile(0, 1, false);  // South
    createTile(-1, 0, false); // West

    // Initial render
    rebuildWalls();
    updateGridBounds();
    renderGrid();
    renderCards();
    updateUI();
    showWavePreview();
}

function createTile(x, y, isHeart = false) {
    const key = `${x},${y}`;
    gameState.tiles.set(key, {
        x,
        y,
        isHeart,
        isBase: true
    });
}

// ============================================================================
// GRID RENDERING
// ============================================================================

function rebuildWalls() {
    const newWalls = new Map();

    for (const [key, tile] of gameState.tiles) {
        const directions = [
            { dir: 'north', dx: 0, dy: -1 },
            { dir: 'south', dx: 0, dy: 1 },
            { dir: 'east', dx: 1, dy: 0 },
            { dir: 'west', dx: -1, dy: 0 }
        ];

        for (const { dir, dx, dy } of directions) {
            const neighborKey = `${tile.x + dx},${tile.y + dy}`;
            if (!gameState.tiles.has(neighborKey)) {
                const wallKey = `${tile.x},${tile.y}:${dir}`;
                const existing = gameState.walls.get(wallKey);
                const level = existing ? existing.level : 1;
                newWalls.set(wallKey, { level });
            }
        }
    }

    gameState.walls = newWalls;
}

function updateGridBounds() {
    gridBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

    for (const [key, tile] of gameState.tiles) {
        gridBounds.minX = Math.min(gridBounds.minX, tile.x);
        gridBounds.maxX = Math.max(gridBounds.maxX, tile.x);
        gridBounds.minY = Math.min(gridBounds.minY, tile.y);
        gridBounds.maxY = Math.max(gridBounds.maxY, tile.y);
    }

    // Add padding for expansion previews
    gridBounds.minX -= 1;
    gridBounds.maxX += 1;
    gridBounds.minY -= 1;
    gridBounds.maxY += 1;
}

function renderGrid() {
    elements.gameGrid.innerHTML = '';

    const cols = gridBounds.maxX - gridBounds.minX + 1;
    const rows = gridBounds.maxY - gridBounds.minY + 1;

    elements.gameGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    elements.gameGrid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    // Get expansion positions if expand card is selected
    const expansionPositions = gameState.selectedCard === 'expand' ? getExpansionPositions() : [];

    for (let y = gridBounds.minY; y <= gridBounds.maxY; y++) {
        for (let x = gridBounds.minX; x <= gridBounds.maxX; x++) {
            const key = `${x},${y}`;
            const tile = gameState.tiles.get(key);
            const building = gameState.buildings.get(key);
            const isExpansion = expansionPositions.some(pos => pos.x === x && pos.y === y);

            const tileElement = document.createElement('div');
            tileElement.className = 'tile';
            tileElement.dataset.x = x;
            tileElement.dataset.y = y;

            if (tile) {
                // Base tile
                if (tile.isHeart) {
                    tileElement.classList.add('heart-tile');
                    tileElement.innerHTML = '<span class="building-icon">♥</span><span class="building-label">Heart</span>';
                } else {
                    tileElement.classList.add('base-tile');

                    if (building) {
                        const card = CARDS[building.type];
                        tileElement.innerHTML = `<span class="building-icon">${card.icon}</span><span class="building-label">${card.name}</span>`;

                        if (building.reinforced) {
                            tileElement.classList.add('wood-boarded');
                            const band = document.createElement('div');
                            band.className = 'wood-frame';
                            tileElement.appendChild(band);
                        }

                        if (card.type === 'consumable') {
                            tileElement.classList.add('consumable');
                        }

                        // Add tooltip to building
                        tileElement.addEventListener('mouseenter', (e) => {
                            let tooltipText = `${card.name}: ${card.description}`;
                            if (card.type === 'consumable') {
                                tooltipText += ' (Consumable - will disappear after this wave)';
                            }
                            showTooltip(e.target, tooltipText);
                        });
                        tileElement.addEventListener('mouseleave', hideTooltip);
                    }

                    // Show fire indicator with click progress
                    if (gameState.firesOnBoard.has(key)) {
                        tileElement.classList.add('on-fire');
                        const fire = gameState.firesOnBoard.get(key);
                        if (fire && fire.clicksNeeded > 0) {
                            const fireIndicator = document.createElement('div');
                            fireIndicator.className = 'fire-indicator';
                            fireIndicator.innerHTML = `🔥<br><span class="fire-clicks">${fire.clicksNeeded}</span>`;
                            tileElement.appendChild(fireIndicator);
                        }
                    }
                }

                // Add wall indicators for perimeter tiles
                addWallIndicators(tileElement, x, y);

                // Highlight valid placement
                if (gameState.selectedCard && gameState.selectedCard !== 'expand') {
                    const cardId = gameState.selectedCard;
                    const isReinforceUpgrade = cardId === 'reinforce';
                    const isSandbagUpgrade = cardId === 'sandbag';
                    const validSandbagSpot = isSandbagUpgrade && isExposedTile(x, y);
                    const canUpgradeBuilding = isReinforceUpgrade && building && !tile.isHeart;
                    const canPlaceNewBuilding = !isReinforceUpgrade && !isSandbagUpgrade && !building;

                    if (!tile.isHeart && (canUpgradeBuilding || validSandbagSpot || canPlaceNewBuilding)) {
                        tileElement.classList.add('valid-placement');
                        // Show ghost preview of building effect
                        addPlacementGhostPreview(tileElement, x, y);
                    } else {
                        tileElement.classList.add('invalid-placement');
                    }
                }
            } else if (isExpansion) {
                // Expansion preview tile
                tileElement.classList.add('expansion-preview');
                tileElement.innerHTML = '+';
            } else {
                // Empty space outside base
                tileElement.style.visibility = 'hidden';
            }

            tileElement.addEventListener('click', () => handleTileClick(x, y));
            elements.gameGrid.appendChild(tileElement);
        }
    }
}

function addWallIndicators(tileElement, x, y) {
    const directions = [
        { dir: 'north', dx: 0, dy: -1 },
        { dir: 'south', dx: 0, dy: 1 },
        { dir: 'east', dx: 1, dy: 0 },
        { dir: 'west', dx: -1, dy: 0 }
    ];

    for (const { dir, dx, dy } of directions) {
        const neighborKey = `${x + dx},${y + dy}`;
        if (!gameState.tiles.has(neighborKey)) {
            const wall = document.createElement('div');
            wall.className = `wall-indicator wall-${dir}`;

            const wallKey = `${x},${y}:${dir}`;
            const wallInfo = gameState.walls.get(wallKey);
            const level = wallInfo ? wallInfo.level : 0;

            if (level > 0) {
                wall.classList.add('reinforced-wall');
                wall.dataset.level = level;
                const label = document.createElement('span');
                label.className = 'wall-level-label';
                label.textContent = `Lv${level}`;
                wall.appendChild(label);
            } else {
                wall.classList.add('broken-wall');
            }

            tileElement.appendChild(wall);
        }
    }
}

function addPlacementGhostPreview(tileElement, x, y) {
    // When a card is selected, show ghost preview of what would be affected
    if (!gameState.selectedCard) return;

    const card = CARDS[gameState.selectedCard];
    if (!card) return;

    const affectsNeighbors = ['reinforce', 'lightningRod', 'wellBucket'];

    if (!affectsNeighbors.includes(gameState.selectedCard)) return;

    // Show preview of effect range when hovering valid placement
    const directions = [
        { dir: 'north', dx: 0, dy: -1 },
        { dir: 'south', dx: 0, dy: 1 },
        { dir: 'east', dx: 1, dy: 0 },
        { dir: 'west', dx: -1, dy: 0 }
    ];

    // Check which adjacent tiles exist
    let affectedTiles = 0;
    for (const { dx, dy } of directions) {
        const neighborKey = `${x + dx},${y + dy}`;
        if (gameState.tiles.has(neighborKey)) {
            affectedTiles++;
        }
    }

    // Add a small indicator showing how many tiles will be protected
    if (affectedTiles > 0) {
        const preview = document.createElement('div');
        preview.className = 'ghost-preview-indicator';
        preview.innerHTML = `+${affectedTiles}`;
        preview.title = `Will protect ${affectedTiles + 1} tiles (including this one)`;
        tileElement.appendChild(preview);
    }
}

function getExpansionPositions() {
    const positions = [];
    const checked = new Set();

    for (const [key, tile] of gameState.tiles) {
        const directions = [
            { dx: 0, dy: -1 },
            { dx: 1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 }
        ];

        for (const { dx, dy } of directions) {
            const newX = tile.x + dx;
            const newY = tile.y + dy;
            const newKey = `${newX},${newY}`;

            if (!gameState.tiles.has(newKey) && !checked.has(newKey)) {
                positions.push({ x: newX, y: newY });
                checked.add(newKey);
            }
        }
    }

    return positions;
}

// ============================================================================
// CARD SYSTEM
// ============================================================================

function renderCards() {
    elements.cardHand.innerHTML = '';

    for (const [cardId, card] of Object.entries(CARDS)) {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.dataset.cardId = cardId;
        cardElement.title = card.description;

        if (card.type === 'consumable') {
            cardElement.classList.add('consumable-card');
        }

        if (gameState.tokens < card.cost) {
            cardElement.classList.add('disabled');
        }

        if (gameState.selectedCard === cardId) {
            cardElement.classList.add('selected');
        }

        cardElement.innerHTML = `
            <span class="card-icon">${card.icon}</span>
            <span class="card-name">${card.name}</span>
            <span class="card-cost">${card.cost} token${card.cost > 1 ? 's' : ''}</span>
        `;

        // Add tooltip on hover/long press
        cardElement.addEventListener('mouseenter', (e) => showTooltip(e.target, card.description));
        cardElement.addEventListener('mouseleave', hideTooltip);
        cardElement.addEventListener('click', () => handleCardClick(cardId));

        elements.cardHand.appendChild(cardElement);
    }
}

function handleCardClick(cardId) {
    if (gameState.phase !== 'build') return;

    const card = CARDS[cardId];
    if (gameState.tokens < card.cost) {
        showToast('Not enough tokens!');
        return;
    }

    // Toggle selection
    if (gameState.selectedCard === cardId) {
        gameState.selectedCard = null;
    } else {
        gameState.selectedCard = cardId;
    }

    renderCards();
    renderGrid();
}

function handleTileClick(x, y) {
    const key = `${x},${y}`;

    // During wave phase, allow clicking fires
    if (gameState.phase === 'wave') {
        if (gameState.firesOnBoard.has(key)) {
            handleFireClick(key);
        }
        return;
    }

    // Build phase logic
    if (gameState.phase !== 'build') return;
    const tile = gameState.tiles.get(key);

    if (!gameState.selectedCard) {
        highlightProtectedTiles(x, y);
        return;
    }

    const card = CARDS[gameState.selectedCard];

    if (gameState.selectedCard === 'expand') {
        // Handle expansion
        const expansionPositions = getExpansionPositions();
        const isValidExpansion = expansionPositions.some(pos => pos.x === x && pos.y === y);

        if (isValidExpansion) {
            placeExpansion(x, y);
        }
    } else if (gameState.selectedCard === 'sandbag') {
        if (!tile || tile.isHeart || !isExposedTile(x, y)) {
            showToast('Pick a perimeter tile to reinforce its wall.');
            return;
        }
        gameState.pendingSandbagTile = { x, y };
        showDirectionSelector();
    } else if (gameState.selectedCard === 'reinforce') {
        const building = gameState.buildings.get(key);
        if (!tile || tile.isHeart || !building) {
            showToast('Reinforce must be applied to an existing building.');
            return;
        }
        if (building.reinforced) {
            showToast('This building is already boarded up.');
            return;
        }
        applyReinforceUpgrade(x, y);
    } else {
        // Handle building placement
        if (!tile || tile.isHeart || gameState.buildings.has(key)) {
            showToast('Cannot place building here!');
            return;
        }
        placeBuilding(x, y, gameState.selectedCard);
    }
}

function handleFireClick(key) {
    const fire = gameState.firesOnBoard.get(key);
    if (!fire || fire.clicksNeeded <= 0) return;

    fire.clicksNeeded--;

    // Check for adjacent well bucket brigade effect
    const hasAdjacentBucket = checkAdjacentWellBuckets(fire.x, fire.y);
    if (hasAdjacentBucket && fire.clicksNeeded > 0) {
        // Brigade effect: reduce clicks on adjacent fires too
        spreadFireFightingEffort(fire.x, fire.y);
    }

    if (fire.clicksNeeded <= 0) {
        showToast('Fire extinguished!');
        gameState.firesOnBoard.delete(key);
    }

    renderGrid();
}

function checkAdjacentWellBuckets(x, y) {
    const positions = [
        { x: x - 1, y },
        { x: x + 1, y },
        { x, y: y - 1 },
        { x, y: y + 1 }
    ];

    for (const pos of positions) {
        const key = `${pos.x},${pos.y}`;
        const building = gameState.buildings.get(key);
        if (building && building.type === 'wellBucket') {
            return true;
        }
    }
    return false;
}

function spreadFireFightingEffort(x, y) {
    // Brigade effect: clicking one fire helps adjacent fires
    const positions = [
        { x: x - 1, y },
        { x: x + 1, y },
        { x, y: y - 1 },
        { x, y: y + 1 }
    ];

    for (const pos of positions) {
        const key = `${pos.x},${pos.y}`;
        const adjacentFire = gameState.firesOnBoard.get(key);
        if (adjacentFire && adjacentFire.clicksNeeded > 0) {
            adjacentFire.clicksNeeded--;
            if (adjacentFire.clicksNeeded <= 0) {
                showToast('Brigade extinguished adjacent fire!');
            }
        }
    }
}

function placeExpansion(x, y) {
    const card = CARDS.expand;

    gameState.tokens -= card.cost;
    gameState.stats.tokensSpent += card.cost;
    createTile(x, y, false);

    showToast('Base expanded!');
    gameState.selectedCard = null;

    rebuildWalls();
    updateGridBounds();
    renderGrid();
    renderCards();
    updateUI();
}

function placeBuilding(x, y, buildingType, direction = null) {
    const key = `${x},${y}`;
    const card = CARDS[buildingType];

    if (gameState.tokens < card.cost) {
        showToast('Not enough tokens!');
        return;
    }

    gameState.tokens -= card.cost;
    gameState.stats.tokensSpent += card.cost;
    gameState.stats.buildingsPlaced++;

    const building = {
        type: buildingType,
        x,
        y
    };

    if (direction) {
        building.direction = direction;
    }

    gameState.buildings.set(key, building);

    showToast(`${card.name} placed!`);
    gameState.selectedCard = null;

    renderGrid();
    renderCards();
    updateUI();
}

function applySandbagUpgrade(x, y, direction) {
    const card = CARDS.sandbag;
    const wallKey = `${x},${y}:${direction}`;
    const wall = gameState.walls.get(wallKey);

    if (!wall) {
        showToast('No exterior wall on that side.');
        return;
    }

    if (gameState.tokens < card.cost) {
        showToast('Not enough tokens!');
        return;
    }

    gameState.tokens -= card.cost;
    gameState.stats.tokensSpent += card.cost;
    wall.level += 1;

    showToast(`Wall ${direction} reinforced to level ${wall.level}!`);
    gameState.selectedCard = null;

    renderGrid();
    renderCards();
    updateUI();
}

function applyReinforceUpgrade(x, y) {
    const card = CARDS.reinforce;
    const key = `${x},${y}`;
    const building = gameState.buildings.get(key);

    if (!building) {
        showToast('No building here to reinforce.');
        return;
    }

    if (gameState.tokens < card.cost) {
        showToast('Not enough tokens!');
        return;
    }

    gameState.tokens -= card.cost;
    gameState.stats.tokensSpent += card.cost;
    building.reinforced = true;

    showToast('Building boarded up and reinforced!');
    gameState.selectedCard = null;

    renderGrid();
    renderCards();
    updateUI();
}

// ============================================================================
// DIRECTION SELECTOR (for Sandbags)
// ============================================================================

function showDirectionSelector() {
    elements.directionSelector.classList.remove('hidden');

    const title = elements.directionSelector.querySelector('.direction-title');
    if (title) {
        title.textContent = 'Choose wall direction to reinforce:';
    }

    // Add event listeners for direction buttons
    const dirButtons = elements.directionSelector.querySelectorAll('.dir-btn');
    dirButtons.forEach(btn => {
        btn.onclick = () => {
            const direction = btn.dataset.dir;
            hideDirectionSelector();
            if (gameState.pendingSandbagTile) {
                applySandbagUpgrade(
                    gameState.pendingSandbagTile.x,
                    gameState.pendingSandbagTile.y,
                    direction
                );
                gameState.pendingSandbagTile = null;
            }
        };
    });

    // Cancel button
    const cancelBtn = elements.directionSelector.querySelector('.cancel-btn');
    cancelBtn.onclick = () => {
        hideDirectionSelector();
        gameState.pendingSandbagTile = null;
    };
}

function hideDirectionSelector() {
    elements.directionSelector.classList.add('hidden');
}

// ============================================================================
// WAVE SYSTEM
// ============================================================================

function showWavePreview() {
    const waveData = WAVE_DEFINITIONS[gameState.wave - 1];
    if (!waveData) return;

    let iconsHtml = '';
    let textParts = [];

    for (const event of waveData.events) {
        const eventInfo = EVENTS[event.type];
        for (let i = 0; i < event.intensity; i++) {
            iconsHtml += eventInfo.icon;
        }
        textParts.push(eventInfo.flavorText);
    }

    elements.threatIcons.innerHTML = iconsHtml;
    elements.threatText.textContent = textParts[0]; // Show first flavor text
    elements.wavePreview.classList.remove('hidden');
}

function hideWavePreview() {
    elements.wavePreview.classList.add('hidden');
}

function showWaveDirectionIndicator(edge) {
    if (!elements.waveDirectionIndicator) return;

    const arrows = {
        north: '⬇️',
        south: '⬆️',
        east: '⬅️',
        west: '➡️'
    };

    elements.waveDirectionIndicator.classList.remove('hidden');
    elements.waveDirectionIndicator.textContent = `${arrows[edge] || ''} Incoming wave from the ${edge}`;
}

function clearWaveDirectionIndicator() {
    if (!elements.waveDirectionIndicator) return;
    elements.waveDirectionIndicator.classList.add('hidden');
    elements.waveDirectionIndicator.textContent = '';
}

async function startWave() {
    if (gameState.phase !== 'build') return;

    gameState.phase = 'wave';
    gameState.selectedCard = null;
    hideWavePreview();
    renderCards();
    elements.startWaveBtn.disabled = true;

    showPhaseIndicator(`Wave ${gameState.wave}`);
    await delay(1500);

    const waveData = WAVE_DEFINITIONS[gameState.wave - 1];

    // Process each event
    for (const event of waveData.events) {
        await processEvent(event);
        await delay(500);
    }

    // Process fire spread at end of wave
    await processFireSpread();

    // Check win/lose conditions
    if (checkGameOver()) {
        endGame(false);
        return;
    }

    // Clear consumables and reset state
    clearConsumables();
    gameState.usedLightningRods.clear();

    // Check for victory
    if (gameState.wave >= 15) {
        endGame(true);
        return;
    }

    // Next wave
    gameState.wave++;
    gameState.phase = 'build';

    // Award tokens
    const baseTokens = 3;
    const shrineBonus = calculateShrineBonus();
    gameState.tokens = baseTokens + shrineBonus;
    gameState.stats.tokensEarned += baseTokens + shrineBonus;

    if (shrineBonus > 0) {
        showToast(`+${shrineBonus} bonus tokens from shrines!`);
    }

    elements.startWaveBtn.disabled = false;
    updateUI();
    renderGrid();
    renderCards();
    showWavePreview();
}

async function processEvent(event) {
    const eventInfo = EVENTS[event.type];
    showToast(`${eventInfo.icon} ${eventInfo.name}!`);
    await delay(500);

    switch (event.type) {
        case 'lightning':
            await processLightning(event.intensity);
            break;
        case 'fire':
            await processFire(event.intensity);
            break;
        case 'flood':
            await processFlood(event.intensity);
            break;
        case 'wind':
            await processWind(event.intensity);
            break;
    }
}

async function processLightning(intensity) {
    const baseTiles = getBaseTiles();

    for (let i = 0; i < intensity && baseTiles.length > 0; i++) {
        // Pick random tile
        const randomIndex = Math.floor(Math.random() * baseTiles.length);
        const tile = baseTiles.splice(randomIndex, 1)[0];
        const key = `${tile.x},${tile.y}`;

        // Find nearby lightning rod info
        const rodInfo = findNearbyLightningRod(tile.x, tile.y);

        // Show lightning warning with telegraph
        showLightningWarning(tile.x, tile.y, rodInfo);
        showToast('⚡ Lightning incoming!');

        // Wait for player to react (timing window)
        const timingWindow = rodInfo ? (rodInfo.hasAdjacent ? 2000 : 1200) : 0;

        if (rodInfo && timingWindow > 0) {
            // Create interactive catch opportunity
            const caught = await waitForLightningCatch(tile.x, tile.y, rodInfo, timingWindow);

            if (caught) {
                showToast('Lightning Rod caught the strike!');
                markLightningRodUsed(rodInfo.key);
                clearLightningWarning(tile.x, tile.y);
                continue;
            }
        } else {
            await delay(1000);
        }

        // Lightning strikes
        clearLightningWarning(tile.x, tile.y);
        const tileElement = document.querySelector(`.tile[data-x="${tile.x}"][data-y="${tile.y}"]`);
        if (tileElement) {
            tileElement.classList.add('lightning-effect');
            await delay(500);
            tileElement.classList.remove('lightning-effect');
        }

        // Destroy building or damage heart
        if (tile.isHeart) {
            gameState.heartDestroyed = true;
            showToast('The Heart is destroyed!');
            return;
        } else if (gameState.buildings.has(key)) {
            await destroyBuilding(tile.x, tile.y);
        }
    }
}

function findNearbyLightningRod(x, y) {
    const positions = [];

    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            positions.push({ x: x + dx, y: y + dy });
        }
    }

    for (const pos of positions) {
        const key = `${pos.x},${pos.y}`;
        const building = gameState.buildings.get(key);

        if (building && building.type === 'lightningRod' && !gameState.usedLightningRods.has(key)) {
            // Check if this rod has adjacent rods (stacking bonus)
            const hasAdjacent = checkAdjacentLightningRods(pos.x, pos.y);
            return {
                x: pos.x,
                y: pos.y,
                key: key,
                hasAdjacent: hasAdjacent
            };
        }
    }

    return null;
}

function checkAdjacentLightningRods(x, y) {
    const positions = [];

    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            positions.push({ x: x + dx, y: y + dy });
        }
    }

    for (const pos of positions) {
        const key = `${pos.x},${pos.y}`;
        const building = gameState.buildings.get(key);
        if (building && building.type === 'lightningRod') {
            return true;
        }
    }

    return false;
}

function markLightningRodUsed(key) {
    gameState.usedLightningRods.add(key);
}

function showLightningWarning(x, y, rodInfo) {
    const tileElement = document.querySelector(`.tile[data-x="${x}"][data-y="${y}"]`);
    if (!tileElement) return;

    const warning = document.createElement('div');
    warning.className = 'lightning-warning';
    warning.dataset.targetX = x;
    warning.dataset.targetY = y;
    warning.innerHTML = '⚡';

    if (rodInfo) {
        warning.classList.add('catchable');
        const rodTile = document.querySelector(`.tile[data-x="${rodInfo.x}"][data-y="${rodInfo.y}"]`);
        if (rodTile) {
            rodTile.classList.add('rod-ready');
            const catchBtn = document.createElement('div');
            catchBtn.className = 'catch-button';
            catchBtn.innerHTML = 'TAP!';
            catchBtn.dataset.rodKey = rodInfo.key;
            rodTile.appendChild(catchBtn);
        }
    }

    tileElement.appendChild(warning);
}

function clearLightningWarning(x, y) {
    const tileElement = document.querySelector(`.tile[data-x="${x}"][data-y="${y}"]`);
    if (tileElement) {
        const warning = tileElement.querySelector('.lightning-warning');
        if (warning) warning.remove();
    }

    // Clear all catch buttons
    document.querySelectorAll('.catch-button').forEach(btn => btn.remove());
    document.querySelectorAll('.rod-ready').forEach(el => el.classList.remove('rod-ready'));
}

async function waitForLightningCatch(x, y, rodInfo, timingWindow) {
    return new Promise((resolve) => {
        let caught = false;
        const startTime = Date.now();

        const catchHandler = (event) => {
            const catchBtn = event.target.closest('.catch-button');
            if (catchBtn && catchBtn.dataset.rodKey === rodInfo.key) {
                caught = true;
                cleanup();
                resolve(true);
            }
        };

        const cleanup = () => {
            document.removeEventListener('click', catchHandler);
        };

        document.addEventListener('click', catchHandler);

        // Timeout
        setTimeout(() => {
            cleanup();
            resolve(caught);
        }, timingWindow);
    });
}

function tryAbsorbLightning(x, y) {
    // Legacy function - kept for compatibility
    return false;
}

function calculateRodCapacity(x, y) {
    // Legacy function - kept for compatibility
    return 1;
}

async function processFire(intensity) {
    const baseTiles = getBaseTiles().filter(t => !t.isHeart);

    for (let i = 0; i < intensity && baseTiles.length > 0; i++) {
        // Pick random tile
        const randomIndex = Math.floor(Math.random() * baseTiles.length);
        const tile = baseTiles.splice(randomIndex, 1)[0];
        const key = `${tile.x},${tile.y}`;

        // Calculate clicks needed based on well buckets
        const clicksNeeded = calculateFireClicksNeeded(tile.x, tile.y);

        // Set tile on fire with interactive element
        gameState.firesOnBoard.set(key, {
            x: tile.x,
            y: tile.y,
            clicksNeeded: clicksNeeded,
            maxClicks: clicksNeeded,
            startTime: Date.now()
        });

        // Animate fire appearance
        const tileElement = document.querySelector(`.tile[data-x="${tile.x}"][data-y="${tile.y}"]`);
        if (tileElement) {
            tileElement.classList.add('fire-effect');
            await delay(300);
        }

        showToast(`Fire! Click to extinguish! (${clicksNeeded} clicks)`);
    }

    renderGrid();

    // Give player time to fight fires (5 seconds per fire)
    await delay(5000);

    // Process any remaining fires
    await processUnextinguishedFires();
}

function calculateFireClicksNeeded(x, y) {
    const baseClicks = 8;

    // Check for well buckets nearby
    const positions = [
        { x, y },
        { x: x - 1, y },
        { x: x + 1, y },
        { x, y: y - 1 },
        { x, y: y + 1 }
    ];

    let bucketCount = 0;
    for (const pos of positions) {
        const key = `${pos.x},${pos.y}`;
        const building = gameState.buildings.get(key);
        if (building && building.type === 'wellBucket') {
            bucketCount++;
        }
    }

    if (bucketCount === 0) return baseClicks;
    if (bucketCount === 1) return 4; // One bucket = half clicks
    return 2; // Multiple buckets = very few clicks (brigade effect)
}

async function processUnextinguishedFires() {
    const remainingFires = [];

    for (const [key, fire] of gameState.firesOnBoard) {
        if (fire.clicksNeeded > 0) {
            remainingFires.push({ key, fire });
        }
    }

    if (remainingFires.length === 0) {
        showToast('All fires extinguished!');
        gameState.firesOnBoard.clear();
        renderGrid();
        return;
    }

    showToast(`${remainingFires.length} fire(s) spread!`);

    // Destroy buildings on unextinguished fires
    for (const { key, fire } of remainingFires) {
        if (gameState.buildings.has(key)) {
            await destroyBuilding(fire.x, fire.y);
        }
    }

    // Clear fires after damage
    gameState.firesOnBoard.clear();
    renderGrid();
}

function tryUseWellBucket(x, y) {
    // Look for well bucket on this tile or adjacent
    const positions = [
        { x, y },
        { x: x - 1, y },
        { x: x + 1, y },
        { x, y: y - 1 },
        { x, y: y + 1 }
    ];

    for (const pos of positions) {
        const key = `${pos.x},${pos.y}`;
        const building = gameState.buildings.get(key);

        if (building && building.type === 'wellBucket') {
            // Use and remove the bucket
            building.used = true;
            return true;
        }
    }

    return false;
}

async function processFireSpread() {
    // Fire spread is now handled differently - fires don't spread, they just need to be extinguished
    // This function is kept for compatibility but can be simplified or removed
    return;
}

async function processFlood(intensity) {
    // Rogue Wave: Pick a random edge and direction to roll across the base
    const edges = ['north', 'south', 'east', 'west'];
    const edge = edges[Math.floor(Math.random() * edges.length)];

    showToast(`🌊 Rogue Wave from the ${edge}!`);
    showWaveDirectionIndicator(edge);

    // Get starting tile(s) on that edge
    const edgeTiles = getEdgeTiles(edge);

    if (edgeTiles.length === 0) return;

    // For each intensity, create a wave path
    for (let i = 0; i < intensity; i++) {
        if (edgeTiles.length === 0) break;

        // Pick a random starting tile
        const randomIndex = Math.floor(Math.random() * edgeTiles.length);
        const startTile = edgeTiles.splice(randomIndex, 1)[0];

        // Roll the wave across the base
        await rollRogueWave(startTile.x, startTile.y, edge);
        await delay(300);
    }

    // Remove flood effect
    document.querySelectorAll('.flood-effect').forEach(el => {
        el.classList.remove('flood-effect');
    });

    clearWaveDirectionIndicator();
    renderGrid();
}

async function rollRogueWave(startX, startY, fromEdge) {
    // Determine the direction the wave travels (opposite of the edge it comes from)
    let dx = 0, dy = 0;
    let oppositeDir = '';

    switch (fromEdge) {
        case 'north':
            dy = 1;
            oppositeDir = 'north';
            break;
        case 'south':
            dy = -1;
            oppositeDir = 'south';
            break;
        case 'east':
            dx = -1;
            oppositeDir = 'east';
            break;
        case 'west':
            dx = 1;
            oppositeDir = 'west';
            break;
    }

    let currentX = startX;
    let currentY = startY;

    // Roll the wave across the base
    while (true) {
        const key = `${currentX},${currentY}`;
        const tile = gameState.tiles.get(key);

        // Stop if we've left the base
        if (!tile) break;

        const tileElement = document.querySelector(`.tile[data-x="${currentX}"][data-y="${currentY}"]`);

        // Show wave animation
        if (tileElement) {
            tileElement.classList.add('flood-warning');
        }

        await delay(200);

        if (tileElement) {
            tileElement.classList.remove('flood-warning');
        }

        // Check for wall blocking this direction
        if (absorbWallHit(currentX, currentY, oppositeDir)) {
            showToast('🧱 Perimeter wall stops the wave!');
            if (tileElement) {
                tileElement.classList.add('flood-effect');
                await delay(300);
                tileElement.classList.remove('flood-effect');
            }
            break;
        }

        // Animate flood hitting this tile
        if (tileElement) {
            tileElement.classList.add('flood-effect');
        }

        // Destroy building if present
        if (gameState.buildings.has(key) && !tile.isHeart) {
            await destroyBuilding(currentX, currentY);
        }

        await delay(200);

        // Move to next tile
        currentX += dx;
        currentY += dy;
    }
}

function getEdgeTiles(edge) {
    const tiles = [];

    for (const [key, tile] of gameState.tiles) {
        if (tile.isHeart) continue;

        const neighborKey = getNeighborKey(tile.x, tile.y, edge);
        if (!gameState.tiles.has(neighborKey)) {
            tiles.push(tile);
        }
    }

    return tiles;
}

function getNeighborKey(x, y, direction) {
    switch (direction) {
        case 'north': return `${x},${y - 1}`;
        case 'south': return `${x},${y + 1}`;
        case 'east': return `${x + 1},${y}`;
        case 'west': return `${x - 1},${y}`;
    }
}

function getEntryDirection(dx, dy) {
    if (dx === 1) return 'west';
    if (dx === -1) return 'east';
    if (dy === 1) return 'north';
    if (dy === -1) return 'south';
    return '';
}

function getExposedDirections(x, y) {
    const directions = [];

    if (!gameState.tiles.has(`${x},${y - 1}`)) directions.push('north');
    if (!gameState.tiles.has(`${x},${y + 1}`)) directions.push('south');
    if (!gameState.tiles.has(`${x - 1},${y}`)) directions.push('west');
    if (!gameState.tiles.has(`${x + 1},${y}`)) directions.push('east');

    return directions;
}

function absorbWallHit(x, y, direction, strength = 1) {
    const wallKey = `${x},${y}:${direction}`;
    const wall = gameState.walls.get(wallKey);

    if (!wall || wall.level <= 0) return false;

    wall.level = Math.max(0, wall.level - strength);
    return true;
}

async function processWind(intensity) {
    // Get perimeter tiles (tiles with at least one exposed edge)
    const perimeterTiles = getPerimeterTiles();

    showToast('💨 Wind gust incoming!');

    // Show warning first
    for (const tile of perimeterTiles) {
        const tileElement = document.querySelector(`.tile[data-x="${tile.x}"][data-y="${tile.y}"]`);
        if (tileElement) {
            const isReinforced = checkReinforceProtection(tile.x, tile.y);
            if (!isReinforced) {
                tileElement.classList.add('wind-warning');
            }
        }
    }

    await delay(1500); // Give player time to see what will be hit

    // Clear warnings and apply wind
    for (const tile of perimeterTiles) {
        const key = `${tile.x},${tile.y}`;
        const tileElement = document.querySelector(`.tile[data-x="${tile.x}"][data-y="${tile.y}"]`);

        if (tileElement) {
            tileElement.classList.remove('wind-warning');
        }

        // Walls absorb wind first
        const exposedDirections = getExposedDirections(tile.x, tile.y);
        let wallAbsorbed = false;
        for (const dir of exposedDirections) {
            if (absorbWallHit(tile.x, tile.y, dir, intensity)) {
                wallAbsorbed = true;
                if (tileElement) {
                    tileElement.classList.add('wall-block');
                    await delay(200);
                    tileElement.classList.remove('wall-block');
                }
                break;
            }
        }

        if (wallAbsorbed) continue;

        // Check for reinforce building effect
        const isReinforced = checkReinforceProtection(tile.x, tile.y);
        if (isReinforced) {
            showToast('Reinforce protected!');
            continue;
        }

        // Animate wind
        if (tileElement) {
            tileElement.classList.add('wind-effect');
            await delay(300);
            tileElement.classList.remove('wind-effect');
        }

        // Destroy building
        if (gameState.buildings.has(key)) {
            await destroyBuilding(tile.x, tile.y);
        }
    }

    renderGrid();
}

function getPerimeterTiles() {
    const tiles = [];

    for (const [key, tile] of gameState.tiles) {
        if (tile.isHeart) continue;

        // Check if any edge is exposed (no neighbor)
        const hasExposedEdge = [
            `${tile.x},${tile.y - 1}`,
            `${tile.x},${tile.y + 1}`,
            `${tile.x - 1},${tile.y}`,
            `${tile.x + 1},${tile.y}`
        ].some(nKey => !gameState.tiles.has(nKey));

        if (hasExposedEdge) {
            tiles.push(tile);
        }
    }

    return tiles;
}

function isExposedTile(x, y) {
    const directions = [
        `${x},${y - 1}`,
        `${x},${y + 1}`,
        `${x - 1},${y}`,
        `${x + 1},${y}`
    ];

    return directions.some(nKey => !gameState.tiles.has(nKey));
}

function checkReinforceProtection(x, y) {
    // Check this tile and adjacent for reinforced buildings
    const positions = [
        { x, y },
        { x: x - 1, y },
        { x: x + 1, y },
        { x, y: y - 1 },
        { x, y: y + 1 }
    ];

    for (const pos of positions) {
        const key = `${pos.x},${pos.y}`;
        const building = gameState.buildings.get(key);
        if (building && building.reinforced) {
            return true;
        }
    }

    return false;
}

// ============================================================================
// BUILDING DESTRUCTION
// ============================================================================

async function destroyBuilding(x, y) {
    const key = `${x},${y}`;
    const building = gameState.buildings.get(key);

    if (!building) return;

    const card = CARDS[building.type];
    showToast(`${card.name} destroyed!`);

    // Animate destruction
    const tileElement = document.querySelector(`.tile[data-x="${x}"][data-y="${y}"]`);
    if (tileElement) {
        const icon = tileElement.querySelector('.building-icon');
        if (icon) {
            icon.classList.add('destroying');
            await delay(500);
        }
    }

    gameState.buildings.delete(key);
    gameState.stats.buildingsDestroyed++;

    renderGrid();
}

function clearConsumables() {
    const toRemove = [];

    for (const [key, building] of gameState.buildings) {
        const card = CARDS[building.type];
        if (card.type === 'consumable' || building.used) {
            toRemove.push(key);
        }
    }

    for (const key of toRemove) {
        gameState.buildings.delete(key);
    }
}

// ============================================================================
// SHRINE BONUS CALCULATION
// ============================================================================

function calculateShrineBonus() {
    let totalBonus = 0;

    for (const [key, building] of gameState.buildings) {
        if (building.type !== 'shrine') continue;

        // Check for adjacent shrine bonus
        const [x, y] = key.split(',').map(Number);
        const adjacent = [
            `${x - 1},${y}`,
            `${x + 1},${y}`,
            `${x},${y - 1}`,
            `${x},${y + 1}`
        ];

        let hasAdjacentShrine = false;
        for (const adjKey of adjacent) {
            const adjBuilding = gameState.buildings.get(adjKey);
            if (adjBuilding && adjBuilding.type === 'shrine') {
                hasAdjacentShrine = true;
                break;
            }
        }

        totalBonus += hasAdjacentShrine ? 2 : 1;
    }

    return totalBonus;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getBaseTiles() {
    const tiles = [];
    for (const [key, tile] of gameState.tiles) {
        tiles.push(tile);
    }
    return tiles;
}

function checkGameOver() {
    // Check if heart has been destroyed
    return gameState.heartDestroyed;
}

function endGame(victory) {
    gameState.phase = 'gameover';

    elements.gameOverScreen.classList.remove('hidden');

    if (victory) {
        elements.gameOverScreen.classList.add('victory');
        elements.gameOverTitle.textContent = 'Victory!';
    } else {
        elements.gameOverScreen.classList.remove('victory');
        elements.gameOverTitle.textContent = 'Game Over';
    }

    elements.gameStats.innerHTML = `
        <div><span class="stat-label">Waves Survived:</span> <span class="stat-value">${gameState.wave}</span></div>
        <div><span class="stat-label">Buildings Placed:</span> <span class="stat-value">${gameState.stats.buildingsPlaced}</span></div>
        <div><span class="stat-label">Buildings Destroyed:</span> <span class="stat-value">${gameState.stats.buildingsDestroyed}</span></div>
        <div><span class="stat-label">Total Tokens Earned:</span> <span class="stat-value">${gameState.stats.tokensEarned}</span></div>
        <div><span class="stat-label">Total Tokens Spent:</span> <span class="stat-value">${gameState.stats.tokensSpent}</span></div>
    `;
}

function updateUI() {
    elements.waveNumber.textContent = gameState.wave;
    elements.tokenCount.textContent = gameState.tokens;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 2000);
}

function showPhaseIndicator(text) {
    const indicator = document.createElement('div');
    indicator.className = 'phase-indicator';
    indicator.textContent = text;
    document.body.appendChild(indicator);

    setTimeout(() => {
        indicator.remove();
    }, 1500);
}

let protectionHighlightTimeout = null;

function highlightProtectedTiles(x, y) {
    if (protectionHighlightTimeout) {
        clearTimeout(protectionHighlightTimeout);
        protectionHighlightTimeout = null;
    }

    document.querySelectorAll('.protected-highlight').forEach(el => el.classList.remove('protected-highlight'));

    const key = `${x},${y}`;
    const building = gameState.buildings.get(key);
    const tilesToMark = [];

    if (building) {
        // Reinforced buildings protect themselves + orthogonal neighbors
        if (building.reinforced) {
            tilesToMark.push({ x, y });
            tilesToMark.push({ x: x - 1, y });
            tilesToMark.push({ x: x + 1, y });
            tilesToMark.push({ x, y: y - 1 });
            tilesToMark.push({ x, y: y + 1 });
        }

        // Well buckets assist adjacent fires (orthogonal)
        if (building.type === 'wellBucket') {
            tilesToMark.push({ x, y });
            tilesToMark.push({ x: x - 1, y });
            tilesToMark.push({ x: x + 1, y });
            tilesToMark.push({ x, y: y - 1 });
            tilesToMark.push({ x, y: y + 1 });
        }

        // Lightning rods protect all 8 surrounding tiles
        if (building.type === 'lightningRod') {
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    tilesToMark.push({ x: x + dx, y: y + dy });
                }
            }
        }
    }

    // Walls protect the tile they face
    const wallDirections = getExposedDirections(x, y);
    if (wallDirections.length > 0) {
        tilesToMark.push({ x, y });
    }

    const uniqueKeys = new Set();
    for (const pos of tilesToMark) {
        const markKey = `${pos.x},${pos.y}`;
        if (!gameState.tiles.has(markKey) || uniqueKeys.has(markKey)) continue;
        uniqueKeys.add(markKey);
        const tileElement = document.querySelector(`.tile[data-x="${pos.x}"][data-y="${pos.y}"]`);
        if (tileElement) {
            tileElement.classList.add('protected-highlight');
        }
    }

    if (uniqueKeys.size === 0) return;

    protectionHighlightTimeout = setTimeout(() => {
        document.querySelectorAll('.protected-highlight').forEach(el => el.classList.remove('protected-highlight'));
    }, 1200);
}

// ============================================================================
// TOOLTIP SYSTEM
// ============================================================================

let currentTooltip = null;
let tooltipTimeout = null;

function showTooltip(element, text) {
    // Clear any existing tooltip
    hideTooltip();

    // Wait a moment before showing tooltip (to avoid showing on quick hover)
    tooltipTimeout = setTimeout(() => {
        currentTooltip = document.createElement('div');
        currentTooltip.className = 'custom-tooltip';
        currentTooltip.textContent = text;
        document.body.appendChild(currentTooltip);

        // Position tooltip near the element
        const rect = element.getBoundingClientRect();
        const tooltipRect = currentTooltip.getBoundingClientRect();

        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        let top = rect.top - tooltipRect.height - 10;

        // Keep tooltip on screen
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }

        if (top < 10) {
            // Show below if not enough space above
            top = rect.bottom + 10;
        }

        currentTooltip.style.left = `${left}px`;
        currentTooltip.style.top = `${top}px`;
        currentTooltip.classList.add('visible');
    }, 300);
}

function hideTooltip() {
    if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
    }

    if (currentTooltip) {
        currentTooltip.remove();
        currentTooltip = null;
    }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

elements.startWaveBtn.addEventListener('click', startWave);

elements.restartBtn.addEventListener('click', () => {
    elements.gameOverScreen.classList.add('hidden');
    initGame();
});

elements.startGameBtn.addEventListener('click', () => {
    elements.tutorialOverlay.classList.add('hidden');
    initGame();
});

// Prevent zoom on double tap (mobile)
document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });

let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, false);

// Initialize the game when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Show tutorial overlay (game will init when user clicks start)
});
