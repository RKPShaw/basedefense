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
        type: 'permanent',
        description: 'Blocks flood from one direction'
    },
    reinforce: {
        id: 'reinforce',
        name: 'Reinforce',
        icon: '🛡️',
        cost: 1,
        type: 'consumable',
        description: 'Tile and adjacent tiles immune to wind this wave'
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
        name: 'Flood',
        icon: '🌊',
        flavorText: 'The waters are rising...'
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
    heartDestroyed: false, // Track if heart is destroyed
    stats: {
        buildingsPlaced: 0,
        buildingsDestroyed: 0,
        tokensEarned: 0,
        tokensSpent: 0
    },
    pendingSandbagTile: null,
    firesOnBoard: new Set(), // Track burning tiles
    reinforcedTiles: new Set(), // Track reinforced tiles for this wave
    usedLightningRods: new Set() // Track used rods this wave
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
    gameState.heartDestroyed = false;
    gameState.firesOnBoard.clear();
    gameState.reinforcedTiles.clear();
    gameState.usedLightningRods.clear();
    gameState.pendingSandbagTile = null;
    gameState.stats = {
        buildingsPlaced: 0,
        buildingsDestroyed: 0,
        tokensEarned: 3,
        tokensSpent: 0
    };

    // Create initial 5-tile plus shape
    createTile(0, 0, true);  // Center - Heart
    createTile(0, -1, false); // North
    createTile(1, 0, false);  // East
    createTile(0, 1, false);  // South
    createTile(-1, 0, false); // West

    // Initial render
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

                        if (card.type === 'consumable') {
                            tileElement.classList.add('consumable');
                        }

                        // Show sandbag direction
                        if (building.type === 'sandbag' && building.direction) {
                            const dirIndicator = document.createElement('div');
                            dirIndicator.className = `sandbag-dir ${building.direction}`;
                            tileElement.appendChild(dirIndicator);
                        }
                    }

                    // Show fire indicator
                    if (gameState.firesOnBoard.has(key)) {
                        tileElement.classList.add('on-fire');
                    }
                }

                // Add wall indicators for perimeter tiles
                addWallIndicators(tileElement, x, y);

                // Highlight valid placement
                if (gameState.selectedCard && gameState.selectedCard !== 'expand') {
                    if (!tile.isHeart && !building) {
                        tileElement.classList.add('valid-placement');
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
            tileElement.appendChild(wall);
        }
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
    if (gameState.phase !== 'build') return;
    if (!gameState.selectedCard) return;

    const key = `${x},${y}`;
    const tile = gameState.tiles.get(key);
    const card = CARDS[gameState.selectedCard];

    if (gameState.selectedCard === 'expand') {
        // Handle expansion
        const expansionPositions = getExpansionPositions();
        const isValidExpansion = expansionPositions.some(pos => pos.x === x && pos.y === y);

        if (isValidExpansion) {
            placeExpansion(x, y);
        }
    } else {
        // Handle building placement
        if (!tile || tile.isHeart || gameState.buildings.has(key)) {
            showToast('Cannot place building here!');
            return;
        }

        if (gameState.selectedCard === 'sandbag') {
            // Show direction selector
            gameState.pendingSandbagTile = { x, y };
            showDirectionSelector();
        } else {
            placeBuilding(x, y, gameState.selectedCard);
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

    updateGridBounds();
    renderGrid();
    renderCards();
    updateUI();
}

function placeBuilding(x, y, buildingType, direction = null) {
    const key = `${x},${y}`;
    const card = CARDS[buildingType];

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

// ============================================================================
// DIRECTION SELECTOR (for Sandbags)
// ============================================================================

function showDirectionSelector() {
    elements.directionSelector.classList.remove('hidden');

    // Add event listeners for direction buttons
    const dirButtons = elements.directionSelector.querySelectorAll('.dir-btn');
    dirButtons.forEach(btn => {
        btn.onclick = () => {
            const direction = btn.dataset.dir;
            hideDirectionSelector();
            if (gameState.pendingSandbagTile) {
                placeBuilding(
                    gameState.pendingSandbagTile.x,
                    gameState.pendingSandbagTile.y,
                    'sandbag',
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
    gameState.reinforcedTiles.clear();
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
    let strikesRemaining = intensity;

    while (strikesRemaining > 0 && baseTiles.length > 0) {
        // Pick random tile
        const randomIndex = Math.floor(Math.random() * baseTiles.length);
        const tile = baseTiles[randomIndex];
        const key = `${tile.x},${tile.y}`;

        // Check for lightning rod
        const rodAbsorbed = tryAbsorbLightning(tile.x, tile.y);

        // Animate lightning
        const tileElement = document.querySelector(`.tile[data-x="${tile.x}"][data-y="${tile.y}"]`);
        if (tileElement) {
            tileElement.classList.add('lightning-effect');
            await delay(500);
            tileElement.classList.remove('lightning-effect');
        }

        if (!rodAbsorbed) {
            // Destroy building or damage heart
            if (tile.isHeart) {
                // Heart is hit - game over!
                gameState.heartDestroyed = true;
                showToast('The Heart is destroyed!');
                return; // Stop processing, game over
            } else if (gameState.buildings.has(key)) {
                await destroyBuilding(tile.x, tile.y);
            }
        } else {
            showToast('Lightning Rod absorbed the strike!');
        }

        strikesRemaining--;
    }
}

function tryAbsorbLightning(x, y) {
    // Check for unused lightning rods on this tile or adjacent
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

        if (building && building.type === 'lightningRod' && !gameState.usedLightningRods.has(key)) {
            // Calculate absorption capacity (check for adjacent rod bonus)
            const capacity = calculateRodCapacity(pos.x, pos.y);

            // Mark as used (partially or fully based on capacity)
            if (!building.absorptionsUsed) building.absorptionsUsed = 0;
            building.absorptionsUsed++;

            if (building.absorptionsUsed >= capacity) {
                gameState.usedLightningRods.add(key);
            }

            return true;
        }
    }

    return false;
}

function calculateRodCapacity(x, y) {
    // Check for adjacent lightning rods for stacking bonus
    const adjacent = [
        { x: x - 1, y },
        { x: x + 1, y },
        { x, y: y - 1 },
        { x, y: y + 1 }
    ];

    for (const pos of adjacent) {
        const key = `${pos.x},${pos.y}`;
        const building = gameState.buildings.get(key);
        if (building && building.type === 'lightningRod') {
            return 2; // Adjacent rod bonus: absorbs 2 instead of 1
        }
    }

    return 1;
}

async function processFire(intensity) {
    const baseTiles = getBaseTiles().filter(t => !t.isHeart);

    for (let i = 0; i < intensity && baseTiles.length > 0; i++) {
        // Pick random tile
        const randomIndex = Math.floor(Math.random() * baseTiles.length);
        const tile = baseTiles.splice(randomIndex, 1)[0];
        const key = `${tile.x},${tile.y}`;

        // Check for well bucket
        const bucketUsed = tryUseWellBucket(tile.x, tile.y);

        if (!bucketUsed) {
            // Set tile on fire
            gameState.firesOnBoard.add(key);

            // Animate fire
            const tileElement = document.querySelector(`.tile[data-x="${tile.x}"][data-y="${tile.y}"]`);
            if (tileElement) {
                tileElement.classList.add('fire-effect');
                await delay(500);
            }

            // Destroy building if present
            if (gameState.buildings.has(key)) {
                await destroyBuilding(tile.x, tile.y);
            }
        } else {
            showToast('Well Bucket extinguished the fire!');
        }
    }

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
    if (gameState.firesOnBoard.size === 0) return;

    const newFires = [];

    for (const key of gameState.firesOnBoard) {
        const [x, y] = key.split(',').map(Number);

        // Fire spreads to 1 random adjacent tile
        const adjacent = [
            { x: x - 1, y },
            { x: x + 1, y },
            { x, y: y - 1 },
            { x, y: y + 1 }
        ];

        const validAdjacent = adjacent.filter(pos => {
            const adjKey = `${pos.x},${pos.y}`;
            const tile = gameState.tiles.get(adjKey);
            return tile && !tile.isHeart && !gameState.firesOnBoard.has(adjKey);
        });

        if (validAdjacent.length > 0) {
            const spreadTo = validAdjacent[Math.floor(Math.random() * validAdjacent.length)];
            const spreadKey = `${spreadTo.x},${spreadTo.y}`;

            // Check for well bucket
            if (!tryUseWellBucket(spreadTo.x, spreadTo.y)) {
                newFires.push(spreadKey);

                // Destroy building if present
                if (gameState.buildings.has(spreadKey)) {
                    await destroyBuilding(spreadTo.x, spreadTo.y);
                }
            }
        }
    }

    // Add new fires
    for (const key of newFires) {
        gameState.firesOnBoard.add(key);
        showToast('Fire spreads!');
    }

    // Clear old fires (they burn out)
    gameState.firesOnBoard.clear();

    // Add new fires as current fires
    for (const key of newFires) {
        gameState.firesOnBoard.add(key);
    }

    renderGrid();
}

async function processFlood(intensity) {
    // Pick random edge
    const edges = ['north', 'south', 'east', 'west'];
    const edge = edges[Math.floor(Math.random() * edges.length)];

    showToast(`Flood from the ${edge}!`);

    // Get tiles on that edge
    const edgeTiles = getEdgeTiles(edge);

    for (const tile of edgeTiles) {
        const key = `${tile.x},${tile.y}`;

        // Check for sandbag protection
        const building = gameState.buildings.get(key);
        const protected = building && building.type === 'sandbag' && building.direction === edge;

        if (protected) {
            showToast('Sandbag blocks the flood!');
            continue;
        }

        // Animate flood
        const tileElement = document.querySelector(`.tile[data-x="${tile.x}"][data-y="${tile.y}"]`);
        if (tileElement) {
            tileElement.classList.add('flood-effect');
            await delay(300);
        }

        // Destroy building (including the sandbag if not protecting)
        if (gameState.buildings.has(key)) {
            await destroyBuilding(tile.x, tile.y);
        }
    }

    await delay(500);

    // Remove flood effect
    document.querySelectorAll('.flood-effect').forEach(el => {
        el.classList.remove('flood-effect');
    });
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

async function processWind(intensity) {
    // Get perimeter tiles (tiles with at least one exposed edge)
    const perimeterTiles = getPerimeterTiles();

    for (const tile of perimeterTiles) {
        const key = `${tile.x},${tile.y}`;

        // Check for reinforcement
        if (gameState.reinforcedTiles.has(key)) {
            continue;
        }

        // Check for reinforce building effect
        const isReinforced = checkReinforceProtection(tile.x, tile.y);
        if (isReinforced) {
            continue;
        }

        // Animate wind
        const tileElement = document.querySelector(`.tile[data-x="${tile.x}"][data-y="${tile.y}"]`);
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

function checkReinforceProtection(x, y) {
    // Check this tile and adjacent for reinforce buildings
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
        if (building && building.type === 'reinforce') {
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
