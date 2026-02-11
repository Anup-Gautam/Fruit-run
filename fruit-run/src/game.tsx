import './index.css';
import logoUrl from './logo.png';

import type { PointerEvent as ReactPointerEvent } from 'react';
import { StrictMode, useEffect, useRef, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { trpc } from './trpc';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from './server/trpc';
import { LEVELS, getLevel, TOTAL_LEVELS, type LevelConfig } from './game/levels';

type RouterOutputs = inferRouterOutputs<AppRouter>;

// ============ GAME CONSTANTS ============
const MIN_SNAKE_SPEED = 30; // Hard cap - snake cannot go faster than 30ms per move
const FRUIT_RADIUS_RATIO = 0.4;
const COLLISION_TOLERANCE = 0.6;
const POWER_FOOD_DURATION = 6000;
const PLAYER_FOOD_UNLOCK_TIME = 30000; // 30 seconds before player can eat food
const PROJECTILE_SIZE_RATIO = 0.3;

// ============ TYPES ============
type Point = { x: number; y: number };
type GameScreen = 'menu' | 'story_select' | 'survival_select' | 'playing' | 'game_over' | 'leaderboard' | 'how_to_play';
type GameMode = 'story' | 'survival';
type PowerFood = { x: number; y: number; spawnTime: number } | null;
type Projectile = { x: number; y: number; dx: number; dy: number };

// ============ COLORS ============
const COLORS = {
  background: '#0e1113',
  grid: '#1a1f24',
  gridLine: '#252d33',
  fruit: '#ff4500',
  fruitGlow: 'rgba(255, 69, 0, 0.4)',
  snakeHead: '#7cfc00',
  snakeBody: '#32cd32',
  snakeTail: '#228b22',
  snakeEye: '#000',
  text: '#ffffff',
  textMuted: '#8b949e',
  accent: '#ff4500',
  danger: '#dc3545',
  success: '#22c55e',
  powerFood: '#ffdd00',
  powerFoodGlow: 'rgba(255, 221, 0, 0.5)',
  powerFoodLocked: 'rgba(255, 221, 0, 0.3)',
  projectile: '#ff3333',
  projectileGlow: 'rgba(255, 51, 51, 0.6)',
};

// ============ GAME COMPONENT ============
export const App = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // UI State
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('story');
  const [, setSelectedLevel] = useState(1);
  const [leaderboardTab, setLeaderboardTab] = useState<'story' | 'survival'>('story');
  const [leaderboardLevel, setLeaderboardLevel] = useState(1);
  
  // Game State
  const [score, setScore] = useState(0);
  const [snakeLength, setSnakeLength] = useState(3);
  const [snakeSpeed, setSnakeSpeed] = useState(150);
  const [playerFoodCount, setPlayerFoodCount] = useState(0);
  const [gameResult, setGameResult] = useState<'win' | 'lose' | null>(null);
  const [currentLevelConfig, setCurrentLevelConfig] = useState<LevelConfig | null>(null);
  const [isStartingGame, setIsStartingGame] = useState(false);
  
  // Server Data
  const [initData, setInitData] = useState<RouterOutputs['init']['get'] | null>(null);
  const [survivalLeaderboard, setSurvivalLeaderboard] = useState<RouterOutputs['survival']['getLeaderboard'] | null>(null);
  const [lastSubmitResult, setLastSubmitResult] = useState<{
    isPersonalBest: boolean;
    rank: number;
  } | null>(null);

  // Game Engine State (refs for game loop)
  const gameRef = useRef({
    fruit: { x: 10, y: 10 },
    snake: [] as Point[],
    powerFood: null as PowerFood,
    projectiles: [] as Projectile[],
    snakeSpeed: 150,
    lastMoveTime: 0,
    lastGrowTime: 0,
    lastSpeedTime: 0,
    lastPowerFoodSpawnTime: 0,
    lastProjectileTime: 0,
    lastChaosTime: 0,
    lastInvisibleTime: 0,
    startTime: 0,
    cellSize: 0,
    canvasSize: 0,
    gridSize: 20,
    isPlaying: false,
    gameMode: 'story' as GameMode,
    levelConfig: null as LevelConfig | null,
    playerFoodCount: 0,
    isSnakeVisible: true,
    currentArenaSize: 20,
    isCharging: false,
    chargeStartTime: 0,
  });

  // Fetch initial data
  useEffect(() => {
  const fetchInit = async () => {
      try {
    const data = await trpc.init.get.query();
        setInitData(data);
      } catch (err) {
        console.error('Failed to fetch init data:', err);
      }
  };
    void fetchInit();
  }, []);

  // Refresh data
  const refreshData = async () => {
    try {
      const data = await trpc.init.get.query();
      setInitData(data);
    } catch (err) {
      console.error('Failed to refresh data:', err);
    }
  };

  // Load survival leaderboard
  const loadSurvivalLeaderboard = async (level: number) => {
    try {
      const data = await trpc.survival.getLeaderboard.query({ level, limit: 10 });
      setSurvivalLeaderboard(data);
      setLeaderboardLevel(level);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    }
  };

  // Initialize snake for a given level
  const initSnake = useCallback((config: LevelConfig) => {
    const snake: Point[] = [];
    const startX = 2;
    const startY = Math.floor(config.gridSize / 2);
    for (let i = 0; i < config.initialSnakeLength; i++) {
      snake.push({ x: startX - i, y: startY });
    }
    return snake;
  }, []);

  // Calculate Euclidean distance (for precise targeting of fractional positions)
  const euclideanDistance = (a: Point, b: Point) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Spawn power food
  const spawnPowerFood = useCallback((snake: Point[], fruit: Point, gridSize: number): PowerFood => {
    let attempts = 0;
    while (attempts < 50) {
      const x = Math.floor(Math.random() * gridSize);
      const y = Math.floor(Math.random() * gridSize);
      
      const onSnake = snake.some(s => s.x === x && s.y === y);
      const tooCloseToFruit = Math.abs(x - fruit.x) < 3 && Math.abs(y - fruit.y) < 3;
      
      if (!onSnake && !tooCloseToFruit) {
        return { x, y, spawnTime: performance.now() };
      }
      attempts++;
    }
    return { x: gridSize - 2, y: gridSize - 2, spawnTime: performance.now() };
  }, []);

  // Snake AI - uses Euclidean distance to track fractional fruit positions
  // This prevents the "stuck between gridlines" bug
  const getNextSnakeMove = useCallback((head: Point, target: Point, gridSize: number, isPerfectAI: boolean): Point => {
    // Use the ACTUAL target position (not floored) for distance calculations
    // This allows the snake to properly track a fruit between grid cells
    const targetX = target.x;
    const targetY = target.y;
    
    const directions = [
      { x: 1, y: 0 },   // right
      { x: -1, y: 0 },  // left
      { x: 0, y: 1 },   // down
      { x: 0, y: -1 },  // up
    ];

    // Calculate distances for each possible move
    type MoveOption = { dir: Point; distance: number; newPos: Point };
    const validMoves: MoveOption[] = [];

    for (const dir of directions) {
      const newPos = {
        x: head.x + dir.x,
        y: head.y + dir.y,
      };

      // Check bounds
      if (newPos.x < 0 || newPos.x >= gridSize || newPos.y < 0 || newPos.y >= gridSize) {
        continue;
      }

      // Calculate distance from CENTER of new cell to the actual target position
      const cellCenter = { x: newPos.x + 0.5, y: newPos.y + 0.5 };
      const distance = euclideanDistance(cellCenter, { x: targetX, y: targetY });
      
      validMoves.push({ dir, distance, newPos });
    }

    if (validMoves.length === 0) {
      return head; // No valid moves
    }

    // Sort by distance (closest first)
    validMoves.sort((a, b) => a.distance - b.distance);

    // Perfect AI always picks the best move
    if (isPerfectAI) {
      return validMoves[0]!.newPos;
    }

    // Normal AI: Usually picks best, occasionally picks second best for unpredictability
    // But NEVER random - always moving toward target
    if (validMoves.length > 1 && Math.random() < 0.08) {
      // 8% chance to pick second best move (still moves toward target)
      return validMoves[1]!.newPos;
    }

    return validMoves[0]!.newPos;
  }, []);

  // Check collision with snake
  const checkSnakeCollision = useCallback((fruit: Point, snake: Point[], cellSize: number, isTitan: boolean): boolean => {
    const fruitCenterX = fruit.x * cellSize + cellSize / 2;
    const fruitCenterY = fruit.y * cellSize + cellSize / 2;
    const segmentSize = isTitan ? 2 : 1;

    for (let i = 0; i < snake.length; i++) {
      const segment = snake[i];
      if (!segment) continue;
      
      const segmentCenterX = segment.x * cellSize + cellSize / 2;
      const segmentCenterY = segment.y * cellSize + cellSize / 2;
      
      const dx = Math.abs(fruitCenterX - segmentCenterX);
      const dy = Math.abs(fruitCenterY - segmentCenterY);
      
      const collisionThreshold = cellSize * COLLISION_TOLERANCE * segmentSize;
      if (dx < collisionThreshold && dy < collisionThreshold) {
        return true;
      }
    }
    return false;
  }, []);

  // Check collision with projectiles
  const checkProjectileCollision = useCallback((fruit: Point, projectiles: Projectile[], cellSize: number): boolean => {
    const fruitCenterX = fruit.x * cellSize + cellSize / 2;
    const fruitCenterY = fruit.y * cellSize + cellSize / 2;
    const fruitRadius = cellSize * FRUIT_RADIUS_RATIO;

    for (const proj of projectiles) {
      const projX = proj.x * cellSize;
      const projY = proj.y * cellSize;
      const projRadius = cellSize * PROJECTILE_SIZE_RATIO;
      
      const dx = fruitCenterX - projX;
      const dy = fruitCenterY - projY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < fruitRadius + projRadius) {
        return true;
      }
    }
    return false;
  }, []);

  // Check if player can eat power food
  const checkPlayerFoodCollision = useCallback((fruit: Point, powerFood: PowerFood, cellSize: number): boolean => {
    if (!powerFood) return false;
    
    const fruitCenterX = fruit.x * cellSize + cellSize / 2;
    const fruitCenterY = fruit.y * cellSize + cellSize / 2;
    const foodCenterX = powerFood.x * cellSize + cellSize / 2;
    const foodCenterY = powerFood.y * cellSize + cellSize / 2;
    
    const dx = Math.abs(fruitCenterX - foodCenterX);
    const dy = Math.abs(fruitCenterY - foodCenterY);
    
    return dx < cellSize * 0.7 && dy < cellSize * 0.7;
  }, []);

  // Check if snake eats power food
  const checkSnakeFoodCollision = useCallback((snakeHead: Point, powerFood: PowerFood): boolean => {
    if (!powerFood) return false;
    return snakeHead.x === powerFood.x && snakeHead.y === powerFood.y;
  }, []);

  // Draw game
  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const game = gameRef.current;
    const { fruit, snake, powerFood, projectiles, cellSize, canvasSize, gridSize, levelConfig, isSnakeVisible, currentArenaSize, isCharging } = game;
    const elapsedTime = performance.now() - game.startTime;
    const canPlayerEatFood = elapsedTime >= PLAYER_FOOD_UNLOCK_TIME;
    const isTitan = levelConfig?.specialModifier === 'titan';

    // Clear canvas
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Draw grid (only within current arena size for shrinking modifier)
    const arenaOffset = (gridSize - currentArenaSize) / 2;
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;
    
    // Draw arena bounds if shrinking
    if (currentArenaSize < gridSize) {
      ctx.fillStyle = 'rgba(220, 53, 69, 0.1)';
      ctx.fillRect(0, 0, arenaOffset * cellSize, canvasSize);
      ctx.fillRect((arenaOffset + currentArenaSize) * cellSize, 0, arenaOffset * cellSize, canvasSize);
      ctx.fillRect(0, 0, canvasSize, arenaOffset * cellSize);
      ctx.fillRect(0, (arenaOffset + currentArenaSize) * cellSize, canvasSize, arenaOffset * cellSize);
    }

    for (let i = 0; i <= gridSize; i++) {
      const pos = i * cellSize;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, canvasSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(canvasSize, pos);
      ctx.stroke();
    }

    // Draw power food
    if (powerFood) {
      const pfCenterX = powerFood.x * cellSize + cellSize / 2;
      const pfCenterY = powerFood.y * cellSize + cellSize / 2;
      const pfRadius = cellSize * 0.35;
      const pulseScale = 1 + 0.2 * Math.sin(performance.now() / 200);
      
      // Different appearance based on whether player can eat it
      const glowColor = canPlayerEatFood ? COLORS.powerFoodGlow : COLORS.powerFoodLocked;
      const foodColor = canPlayerEatFood ? COLORS.powerFood : 'rgba(255, 221, 0, 0.5)';
      
      const gradient = ctx.createRadialGradient(
        pfCenterX, pfCenterY, pfRadius * 0.3,
        pfCenterX, pfCenterY, pfRadius * 2.5 * pulseScale
      );
      gradient.addColorStop(0, glowColor);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pfCenterX, pfCenterY, pfRadius * 2.5 * pulseScale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = foodColor;
      ctx.shadowColor = foodColor;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const x = pfCenterX + Math.cos(angle) * pfRadius;
        const y = pfCenterY + Math.sin(angle) * pfRadius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Lock icon if player can't eat yet
      if (!canPlayerEatFood) {
        ctx.fillStyle = COLORS.text;
        ctx.font = `${cellSize * 0.3}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('🔒', pfCenterX, pfCenterY + cellSize * 0.1);
      }
    }

    // Draw projectiles
    for (const proj of projectiles) {
      const projX = proj.x * cellSize;
      const projY = proj.y * cellSize;
      const projRadius = cellSize * PROJECTILE_SIZE_RATIO;

      const gradient = ctx.createRadialGradient(
        projX, projY, projRadius * 0.3,
        projX, projY, projRadius * 2
      );
      gradient.addColorStop(0, COLORS.projectileGlow);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(projX, projY, projRadius * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = COLORS.projectile;
      ctx.shadowColor = COLORS.projectile;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(projX, projY, projRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw snake (if visible)
    if (isSnakeVisible) {
      const segmentScale = isTitan ? 1.8 : 1;
      
      for (let i = snake.length - 1; i >= 0; i--) {
        const segment = snake[i];
        if (!segment) continue;
        const x = segment.x * cellSize;
        const y = segment.y * cellSize;
        const padding = cellSize * 0.1 / segmentScale;
        
        const ratio = i / Math.max(snake.length - 1, 1);
        const isHead = i === 0;
        
        if (isHead) {
          // Charging effect
          if (isCharging) {
            ctx.fillStyle = COLORS.projectile;
            ctx.shadowColor = COLORS.projectile;
          } else {
            ctx.fillStyle = COLORS.snakeHead;
            ctx.shadowColor = COLORS.snakeHead;
          }
          ctx.shadowBlur = 10;
        } else {
          const green = Math.floor(139 + ratio * (124 - 139));
          const greenHex = Math.floor(205 + ratio * (252 - 205));
          ctx.fillStyle = `rgb(${Math.floor(50 + ratio * 74)}, ${greenHex}, ${green > 50 ? 0 : green})`;
          ctx.shadowBlur = 0;
        }

        const segWidth = (cellSize - padding * 2) * segmentScale;
        const segHeight = (cellSize - padding * 2) * segmentScale;
        const offsetX = isTitan ? -cellSize * 0.4 : 0;
        const offsetY = isTitan ? -cellSize * 0.4 : 0;

        const radius = cellSize * 0.3;
        ctx.beginPath();
        ctx.roundRect(x + padding + offsetX, y + padding + offsetY, segWidth, segHeight, radius);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (isHead) {
          ctx.fillStyle = COLORS.snakeEye;
          const eyeSize = cellSize * 0.12 * segmentScale;
          const eyeOffsetX = cellSize * 0.25;
          const eyeOffsetY = cellSize * 0.3;
          
          let dirX = 1, dirY = 0;
          const head = snake[0];
          const neck = snake[1];
          if (snake.length > 1 && head && neck) {
            dirX = head.x - neck.x;
            dirY = head.y - neck.y;
          }
          
          const centerX = x + cellSize / 2 + offsetX;
          const centerY = y + cellSize / 2 + offsetY;
          
          if (dirX !== 0) {
            ctx.beginPath();
            ctx.arc(centerX + dirX * eyeOffsetX, centerY - eyeOffsetY, eyeSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(centerX + dirX * eyeOffsetX, centerY + eyeOffsetY, eyeSize, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(centerX - eyeOffsetY, centerY + dirY * eyeOffsetX, eyeSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(centerX + eyeOffsetY, centerY + dirY * eyeOffsetX, eyeSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // Draw fruit (player)
    const fruitCenterX = fruit.x * cellSize + cellSize / 2;
    const fruitCenterY = fruit.y * cellSize + cellSize / 2;
    const fruitRadius = cellSize * FRUIT_RADIUS_RATIO;

    const gradient = ctx.createRadialGradient(
      fruitCenterX, fruitCenterY, fruitRadius * 0.5,
      fruitCenterX, fruitCenterY, fruitRadius * 2
    );
    gradient.addColorStop(0, COLORS.fruitGlow);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(fruitCenterX, fruitCenterY, fruitRadius * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.fruit;
    ctx.shadowColor = COLORS.fruit;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(fruitCenterX, fruitCenterY, fruitRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(fruitCenterX - fruitRadius * 0.3, fruitCenterY - fruitRadius * 0.3, fruitRadius * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fruitCenterX, fruitCenterY - fruitRadius);
    ctx.lineTo(fruitCenterX + 2, fruitCenterY - fruitRadius - 6);
    ctx.stroke();

    ctx.fillStyle = '#228b22';
    ctx.beginPath();
    ctx.ellipse(fruitCenterX + 5, fruitCenterY - fruitRadius - 4, 5, 3, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  // Last UI update timestamp for throttling
  const lastUIUpdateRef = useRef(0);

  // Game loop
  const gameLoop = useCallback((timestamp: number) => {
    const game = gameRef.current;
    if (!game.isPlaying || !game.levelConfig) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const config = game.levelConfig;
    const elapsedTime = timestamp - game.startTime;

    // Throttle UI updates to reduce React re-renders (update every 100ms)
    if (timestamp - lastUIUpdateRef.current >= 100) {
      setScore(Math.floor(elapsedTime));
      lastUIUpdateRef.current = timestamp;
    }

    // Check win condition (Story Mode)
    if (game.gameMode === 'story' && elapsedTime >= config.survivalTime) {
      game.isPlaying = false;
      setGameResult('win');
      setScreen('game_over');
      // Auto-complete level
      trpc.story.completeLevel.mutate({ level: config.id }).then(() => {
        refreshData();
      });
      return;
    }

    // Handle special modifiers
    // Invisible modifier
    if (config.specialModifier === 'invisible') {
      const cycleTime = 3000;
      const invisDuration = 500;
      const cyclePos = elapsedTime % cycleTime;
      game.isSnakeVisible = cyclePos >= invisDuration;
    }

    // Chaos modifier - random speed changes
    if (config.specialModifier === 'chaos' && timestamp - game.lastChaosTime >= 5000) {
      game.snakeSpeed = 80 + Math.floor(Math.random() * 120); // 80-200ms
      game.lastChaosTime = timestamp;
      setSnakeSpeed(game.snakeSpeed);
    }

    // Shrinking arena modifier
    if (config.specialModifier === 'shrinking_arena') {
      const shrinkRate = 0.5; // cells per minute
      const shrunk = Math.floor((elapsedTime / 60000) * shrinkRate * 2);
      game.currentArenaSize = Math.max(10, config.gridSize - shrunk);
    }

    // Snake speed increase
    if (config.speedIncreaseInterval > 0 && timestamp - game.lastSpeedTime >= config.speedIncreaseInterval) {
      game.snakeSpeed = Math.max(MIN_SNAKE_SPEED, game.snakeSpeed - config.speedIncreaseAmount);
      game.lastSpeedTime = timestamp;
      setSnakeSpeed(game.snakeSpeed);
    }

    // Snake growth (respects max length cap)
    if (config.growInterval > 0 && timestamp - game.lastGrowTime >= config.growInterval) {
      for (let i = 0; i < config.growAmount; i++) {
        if (game.snake.length >= config.maxSnakeLength) break; // Hard cap
        const tail = game.snake[game.snake.length - 1];
        if (tail) {
          game.snake.push({ x: tail.x, y: tail.y });
        }
      }
      game.lastGrowTime = timestamp;
      setSnakeLength(game.snake.length);
    }

    // Power food spawning
    if (config.hasPowerFood && !game.powerFood && timestamp - game.lastPowerFoodSpawnTime >= config.powerFoodInterval) {
      game.powerFood = spawnPowerFood(game.snake, game.fruit, game.gridSize);
      game.lastPowerFoodSpawnTime = timestamp;
    }

    // Power food expiration
    if (game.powerFood && timestamp - game.powerFood.spawnTime >= POWER_FOOD_DURATION) {
      game.powerFood = null;
      game.lastPowerFoodSpawnTime = timestamp;
    }

    // Projectile firing
    if (config.hasProjectiles) {
      const chargeTime = 500;
      
      if (!game.isCharging && timestamp - game.lastProjectileTime >= config.projectileInterval - chargeTime) {
        game.isCharging = true;
        game.chargeStartTime = timestamp;
      }

      if (game.isCharging && timestamp - game.chargeStartTime >= chargeTime) {
        // Fire projectiles
        const head = game.snake[0];
        if (head) {
          const dx = game.fruit.x - head.x;
          const dy = game.fruit.y - head.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const normalizedDx = dx / dist;
          const normalizedDy = dy / dist;

          if (config.projectileCount === 1) {
            game.projectiles.push({
              x: head.x + 0.5,
              y: head.y + 0.5,
              dx: normalizedDx * 0.3,
              dy: normalizedDy * 0.3,
            });
          } else {
            // Spread pattern for multiple projectiles
            const spreadAngle = 15 * Math.PI / 180;
            for (let i = 0; i < config.projectileCount; i++) {
              const angleOffset = (i - (config.projectileCount - 1) / 2) * spreadAngle;
              const cos = Math.cos(angleOffset);
              const sin = Math.sin(angleOffset);
              const rotatedDx = normalizedDx * cos - normalizedDy * sin;
              const rotatedDy = normalizedDx * sin + normalizedDy * cos;
              game.projectiles.push({
                x: head.x + 0.5,
                y: head.y + 0.5,
                dx: rotatedDx * 0.3,
                dy: rotatedDy * 0.3,
              });
            }
          }
        }
        game.isCharging = false;
        game.lastProjectileTime = timestamp;
      }
    }

    // Update projectiles
    game.projectiles = game.projectiles.filter(proj => {
      proj.x += proj.dx;
      proj.y += proj.dy;
      // Remove if out of bounds
      return proj.x >= 0 && proj.x < game.gridSize && proj.y >= 0 && proj.y < game.gridSize;
    });

    // Snake movement
    if (timestamp - game.lastMoveTime >= game.snakeSpeed) {
      const head = game.snake[0];
      if (head) {
        const isPerfectAI = config.specialModifier === 'perfect_ai';
        
        // Snake ALWAYS prioritizes power food if it exists
        const target = game.powerFood 
          ? { x: game.powerFood.x + 0.5, y: game.powerFood.y + 0.5 }  // Target center of power food cell
          : game.fruit;  // Otherwise target the player
        
        const newHead = getNextSnakeMove(head, target, game.currentArenaSize, isPerfectAI);
        
        game.snake.unshift(newHead);
        game.snake.pop();
        
        // Check if snake eats power food
        if (game.powerFood && checkSnakeFoodCollision(newHead, game.powerFood)) {
          game.snakeSpeed = Math.max(MIN_SNAKE_SPEED, game.snakeSpeed - config.powerFoodSpeedBoost);
          setSnakeSpeed(game.snakeSpeed);
          
          // Grow snake (respects max length cap)
          for (let i = 0; i < config.powerFoodSizeBoost; i++) {
            if (game.snake.length >= config.maxSnakeLength) break; // Hard cap
            const tail = game.snake[game.snake.length - 1];
            if (tail) {
              game.snake.push({ x: tail.x, y: tail.y });
            }
          }
          setSnakeLength(game.snake.length);
          
          game.powerFood = null;
          game.lastPowerFoodSpawnTime = timestamp;
        }
        
        game.lastMoveTime = timestamp;
      }
    }

    // Check if player eats power food (only after 30s)
    const canPlayerEatFood = elapsedTime >= PLAYER_FOOD_UNLOCK_TIME;
    if (canPlayerEatFood && game.powerFood && checkPlayerFoodCollision(game.fruit, game.powerFood, game.cellSize)) {
      game.playerFoodCount++;
      setPlayerFoodCount(game.playerFoodCount);
      
      // SURVIVAL MODE: After 1 minute, power food has bigger impact
      const survivalBoostedFood = game.gameMode === 'survival' && elapsedTime >= 60000;
      
      // Decrease snake length: every 2 foods normally, every 1 food in survival boost mode
      const lengthReductionInterval = survivalBoostedFood ? 1 : 2;
      if (game.playerFoodCount % lengthReductionInterval === 0 && game.snake.length > 1) {
        game.snake.pop();
        // In boosted mode, remove an extra segment
        if (survivalBoostedFood && game.snake.length > 1) {
          game.snake.pop();
        }
        setSnakeLength(game.snake.length);
      }
      
      // Decrease snake speed: every 4 foods normally, every 2 foods in survival boost mode
      const speedReductionInterval = survivalBoostedFood ? 2 : 4;
      const speedReductionAmount = survivalBoostedFood ? 5 : 2;
      if (game.playerFoodCount % speedReductionInterval === 0) {
        game.snakeSpeed = Math.min(300, game.snakeSpeed + speedReductionAmount);
        setSnakeSpeed(game.snakeSpeed);
      }
      
      game.powerFood = null;
      game.lastPowerFoodSpawnTime = timestamp;
    }

    // Helper to handle game over (loss)
    const handleLoss = () => {
      game.isPlaying = false;
      setGameResult('lose');
      setScreen('game_over');
      
      if (game.gameMode === 'survival') {
        // Auto-submit score for survival mode
        trpc.survival.submitScore.mutate({ level: config.id, score: Math.floor(elapsedTime) }).then(result => {
          setLastSubmitResult(result);
          refreshData();
        });
      }
      // Note: Life is consumed at game START, not on loss
      // This allows 3 total game attempts per day regardless of outcome
    };

    // Check collisions
    const isTitan = config.specialModifier === 'titan';
    if (checkSnakeCollision(game.fruit, game.snake, game.cellSize, isTitan)) {
      handleLoss();
      return;
    }

    if (checkProjectileCollision(game.fruit, game.projectiles, game.cellSize)) {
      handleLoss();
      return;
    }

    // Check arena bounds (for shrinking arena)
    const arenaOffset = (game.gridSize - game.currentArenaSize) / 2;
    if (game.fruit.x < arenaOffset || game.fruit.x >= arenaOffset + game.currentArenaSize ||
        game.fruit.y < arenaOffset || game.fruit.y >= arenaOffset + game.currentArenaSize) {
      handleLoss();
      return;
    }

    draw(ctx);
    requestAnimationFrame(gameLoop);
  }, [draw, getNextSnakeMove, checkSnakeCollision, checkProjectileCollision, checkPlayerFoodCollision, checkSnakeFoodCollision, spawnPowerFood, refreshData]);

  // Start game
  const startGame = useCallback(async (mode: GameMode, levelId: number) => {
    // Prevent multiple simultaneous game starts
    if (isStartingGame) return;
    
    const config = getLevel(levelId);
    if (!config) return;

    // For story mode, check if user can play and consume a life immediately
    // Each game attempt costs 1 life (win or lose)
    if (mode === 'story') {
      setIsStartingGame(true);
      try {
        const canPlayResult = await trpc.story.canPlay.query();
        if (!canPlayResult.canPlay) {
          alert('No lives remaining today! Come back tomorrow.');
          setIsStartingGame(false);
          return;
        }
        // Consume a life when starting the game
        await trpc.story.useTry.mutate();
        await refreshData(); // Await to ensure hearts update immediately
      } catch (err) {
        console.error('Error starting game:', err);
        setIsStartingGame(false);
        return;
      }
    }

    const game = gameRef.current;
    game.levelConfig = config;
    game.gridSize = config.gridSize;
    game.currentArenaSize = config.gridSize;
    game.snake = initSnake(config);
    game.fruit = { x: config.gridSize / 2, y: config.gridSize / 2 };
    game.powerFood = null;
    game.projectiles = [];
    game.snakeSpeed = config.initialSnakeSpeed;
    game.lastMoveTime = 0;
    game.lastGrowTime = 0;
    game.lastSpeedTime = 0;
    game.lastPowerFoodSpawnTime = 0;
    game.lastProjectileTime = 0;
    game.lastChaosTime = 0;
    game.lastInvisibleTime = 0;
    game.startTime = performance.now();
    game.isPlaying = true;
    game.gameMode = mode;
    game.playerFoodCount = 0;
    game.isSnakeVisible = true;
    game.isCharging = false;

    setCurrentLevelConfig(config);
    setGameMode(mode);
    setSelectedLevel(levelId);
    setScore(0);
    setSnakeLength(config.initialSnakeLength);
    setSnakeSpeed(config.initialSnakeSpeed);
    setPlayerFoodCount(0);
    setGameResult(null);
    setLastSubmitResult(null);
    setIsStartingGame(false);
    setScreen('playing');

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        // Get viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Calculate available space (accounting for HUD and padding)
        const availableWidth = viewportWidth - 32; // 16px padding on each side
        const availableHeight = viewportHeight - 120; // Space for HUD
        
        // Use the smaller dimension to ensure square canvas fits
        const maxSize = Math.min(availableWidth, availableHeight);
        
        // Calculate cell size based on grid size (minimum 15px per cell for visibility)
        const idealCellSize = Math.floor(maxSize / config.gridSize);
        const cellSize = Math.max(15, idealCellSize);
        const canvasSize = cellSize * config.gridSize;
        
        // Set canvas dimensions
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        canvas.style.width = `${canvasSize}px`;
        canvas.style.height = `${canvasSize}px`;

        game.cellSize = cellSize;
        game.canvasSize = canvasSize;
        
        // Start the game loop after canvas is sized
        requestAnimationFrame(gameLoop);
      }
    });
  }, [initSnake, gameLoop, refreshData, isStartingGame]);

  // Handle pointer move
  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const game = gameRef.current;
    if (!canvas || !game.isPlaying) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const { cellSize, gridSize, currentArenaSize } = game;
    const arenaOffset = (gridSize - currentArenaSize) / 2;

    // Clamp to current arena bounds
    const gridX = Math.max(arenaOffset, Math.min(arenaOffset + currentArenaSize - 1, x / cellSize));
    const gridY = Math.max(arenaOffset, Math.min(arenaOffset + currentArenaSize - 1, y / cellSize));

    game.fruit = { x: gridX, y: gridY };
  }, []);


  // Format time
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const millis = Math.floor((ms % 1000) / 10);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
  };

  const formatTimeShort = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get unlocked levels count (based on story progress)
  const unlockedLevels = initData?.storyProgress.currentLevel ?? 1;

  return (
    <div 
      ref={containerRef}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${COLORS.background} 0%, #1a1f24 100%)` }}
    >
      {/* ============ MAIN MENU ============ */}
      {screen === 'menu' && (
        <div className="flex flex-col items-center justify-center p-3 w-full max-w-sm h-full max-h-screen">
          <img
            src={logoUrl}
            alt="Reverse Snake"
            className="w-20 h-20 object-contain mb-2"
          />
          <h1 className="text-2xl font-bold mb-1 text-center" style={{ color: COLORS.fruit }}>
            🍎 Reverse Snake 🐍
        </h1>
          <p className="text-xs mb-3 text-center" style={{ color: COLORS.textMuted }}>
            You are the fruit. Don't get eaten!
          </p>

          {/* Progress Display - Compact */}
          {initData && (
            <div className="w-full mb-3 p-3 rounded-xl" style={{ background: COLORS.grid }}>
              <div className="flex justify-between items-center mb-1 text-sm">
                <span style={{ color: COLORS.textMuted }}>Level {initData.storyProgress.currentLevel > TOTAL_LEVELS ? TOTAL_LEVELS : initData.storyProgress.currentLevel}/{TOTAL_LEVELS}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs" style={{ color: COLORS.textMuted }}>Lives:</span>
                  {[1, 2, 3].map(i => (
                    <span key={i}>
                      {i <= initData.storyProgress.triesRemaining ? '❤️' : '🖤'}
                    </span>
                  ))}
      </div>
              </div>
              <div className="w-full bg-black/30 rounded-full h-1.5">
                <div 
                  className="h-1.5 rounded-full transition-all"
                  style={{ 
                    width: `${Math.min(100, ((initData.storyProgress.currentLevel - 1) / TOTAL_LEVELS) * 100)}%`,
                    background: COLORS.success 
                  }}
                />
              </div>
            </div>
          )}

          {/* Mode Buttons - More Compact */}
          <div className="flex flex-col gap-2 w-full mb-3">
        <button
              onClick={() => setScreen('story_select')}
              className="w-full p-3 rounded-xl text-left transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: COLORS.grid, border: `2px solid ${COLORS.success}40` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold" style={{ color: COLORS.success }}>📖 Story Mode</div>
                  <div className="text-xs" style={{ color: COLORS.textMuted }}>
                    Beat 30 levels (3 lives/day)
                  </div>
                </div>
                <span className="text-xl">→</span>
              </div>
        </button>

            <button
              onClick={() => setScreen('survival_select')}
              className="w-full p-3 rounded-xl text-left transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: COLORS.grid, border: `2px solid ${COLORS.accent}40` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold" style={{ color: COLORS.accent }}>⏱️ Survival Mode</div>
                  <div className="text-xs" style={{ color: COLORS.textMuted }}>
                    Compete for high scores
                  </div>
                </div>
                <span className="text-xl">→</span>
              </div>
            </button>
          </div>

          {/* Bottom Buttons Row */}
          <div className="flex gap-2 w-full">
            <button
              onClick={() => setScreen('how_to_play')}
              className="flex-1 py-2 rounded-full text-sm"
              style={{ background: COLORS.grid, color: COLORS.text, border: `1px solid ${COLORS.gridLine}` }}
            >
              ❓ How to Play
            </button>
            <button
              onClick={() => {
                setLeaderboardTab('story');
                setScreen('leaderboard');
              }}
              className="flex-1 py-2 rounded-full text-sm"
              style={{ background: COLORS.gridLine, color: COLORS.textMuted }}
            >
              🏆 Leaderboard
            </button>
          </div>

          {initData?.username && (
            <div className="mt-3 text-xs" style={{ color: COLORS.textMuted }}>
              Playing as {initData.username}
            </div>
          )}
        </div>
      )}

      {/* ============ STORY SELECT ============ */}
      {screen === 'story_select' && initData && (
        <div className="flex flex-col items-center p-4 w-full max-w-md">
          <button
            onClick={() => setScreen('menu')}
            className="self-start mb-4 text-sm"
            style={{ color: COLORS.textMuted }}
          >
            ← Back
          </button>

          <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.success }}>
            📖 Story Mode
          </h2>
          
          {initData.storyProgress.isCompleted ? (
            <div className="text-center p-6 rounded-xl mb-4" style={{ background: COLORS.grid }}>
              <div className="text-4xl mb-2">🎉</div>
              <div className="font-bold text-xl mb-2" style={{ color: COLORS.success }}>
                Congratulations!
              </div>
              <div style={{ color: COLORS.textMuted }}>
                You've completed all {TOTAL_LEVELS} levels!
              </div>
            </div>
          ) : (
            <>
              {/* Current Level Info */}
              {(() => {
                const level = getLevel(initData.storyProgress.currentLevel);
                if (!level) return null;
                return (
                  <div className="w-full p-4 rounded-xl mb-4" style={{ background: COLORS.grid }}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{level.emoji}</span>
                      <div>
                        <div className="font-bold text-lg" style={{ color: COLORS.text }}>
                          Level {level.id}: {level.name}
                        </div>
                        <div className="text-sm" style={{ color: COLORS.textMuted }}>
                          {level.description}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mb-3 text-sm">
                      <span style={{ color: COLORS.textMuted }}>Survive:</span>
                      <span className="font-bold" style={{ color: COLORS.accent }}>
                        {formatTimeShort(level.survivalTime)}
        </span>
                    </div>
                    <div className="flex justify-between items-center mb-4 text-sm">
                      <span style={{ color: COLORS.textMuted }}>Lives remaining:</span>
                      <div className="flex gap-1">
                        {[1, 2, 3].map(i => (
                          <span key={i}>
                            {i <= initData.storyProgress.triesRemaining ? '❤️' : '🖤'}
                          </span>
                        ))}
                      </div>
                    </div>
        <button
                      onClick={() => startGame('story', level.id)}
                      disabled={initData.storyProgress.triesRemaining <= 0}
                      className="w-full py-3 rounded-lg font-bold transition-opacity"
                      style={{ 
                        background: COLORS.success,
                        color: COLORS.text,
                        opacity: initData.storyProgress.triesRemaining > 0 ? 1 : 0.5,
                      }}
                    >
                      {initData.storyProgress.triesRemaining > 0 ? '▶ Play' : 'No lives left today'}
        </button>
      </div>
                );
              })()}
            </>
          )}

          {/* Level features legend */}
          <div className="w-full p-3 rounded-lg text-xs" style={{ background: COLORS.background }}>
            <div className="font-bold mb-2" style={{ color: COLORS.textMuted }}>Level Features:</div>
            <div className="grid grid-cols-2 gap-1" style={{ color: COLORS.textMuted }}>
              <div>🎯 = Projectiles</div>
              <div>⭐ = Power Food</div>
              <div>🏃 = 3 minute level</div>
              <div>📦 = Small arena</div>
            </div>
          </div>
        </div>
      )}

      {/* ============ SURVIVAL SELECT ============ */}
      {screen === 'survival_select' && initData && (
        <div className="flex flex-col items-center p-4 w-full max-w-md max-h-screen overflow-auto">
        <button
            onClick={() => setScreen('menu')}
            className="self-start mb-4 text-sm"
            style={{ color: COLORS.textMuted }}
        >
            ← Back
        </button>

          <h2 className="text-2xl font-bold mb-4" style={{ color: COLORS.accent }}>
            ⏱️ Survival Mode
          </h2>
          
          <p className="text-sm mb-4 text-center" style={{ color: COLORS.textMuted }}>
            Select a level to compete for the highest survival time
          </p>

          <div className="w-full space-y-2 pb-4">
            {LEVELS.map(level => {
              const isUnlocked = level.id < unlockedLevels;
              const personalBest = initData.personalBests[level.id];
              
              return (
        <button
                  key={level.id}
                  onClick={() => isUnlocked && startGame('survival', level.id)}
                  disabled={!isUnlocked}
                  className="w-full p-3 rounded-lg text-left transition-transform"
                  style={{ 
                    background: COLORS.grid,
                    opacity: isUnlocked ? 1 : 0.5,
                    transform: isUnlocked ? undefined : 'none',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{isUnlocked ? level.emoji : '🔒'}</span>
                      <div>
                        <div className="font-bold text-sm" style={{ color: COLORS.text }}>
                          {level.id}. {level.name}
                        </div>
                        {isUnlocked && personalBest && (
                          <div className="text-xs" style={{ color: COLORS.accent }}>
                            Best: {formatTime(personalBest)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 text-xs">
                      {level.hasProjectiles && <span>🎯</span>}
                      {level.hasPowerFood && <span>⭐</span>}
                      {level.survivalTime > 60000 && <span>🏃</span>}
                      {level.gridSize < 20 && <span>📦</span>}
                    </div>
                  </div>
        </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ============ PLAYING ============ */}
      {screen === 'playing' && currentLevelConfig && (
        <>
          {/* HUD */}
          <div className="absolute top-2 left-2 right-2 flex justify-between items-start z-10 text-xs sm:text-sm">
            <div className="flex flex-col">
              <div style={{ color: COLORS.textMuted }}>
                {gameMode === 'story' ? '📖 Story' : '⏱️ Survival'} - Lvl {currentLevelConfig.id}
              </div>
              <div className="text-lg sm:text-2xl font-bold font-mono" style={{ color: COLORS.text }}>
                {formatTime(score)}
              </div>
              {gameMode === 'story' && (
                <div className="text-xs" style={{ color: COLORS.accent }}>
                  Goal: {formatTimeShort(currentLevelConfig.survivalTime)}
                </div>
              )}
            </div>
            
            <div className="flex flex-col items-end">
              <div className="flex gap-2">
                <span style={{ color: COLORS.snakeHead }}>🐍 {snakeLength}</span>
                <span style={{ color: COLORS.danger }}>⚡ {Math.round(1000 / snakeSpeed * 10) / 10}</span>
              </div>
              {currentLevelConfig.hasPowerFood && (
                <div className="text-xs" style={{ color: COLORS.powerFood }}>
                  🍎 x{playerFoodCount}
                  {score < PLAYER_FOOD_UNLOCK_TIME && (
                    <span style={{ color: COLORS.textMuted }}> (unlock: {formatTimeShort(PLAYER_FOOD_UNLOCK_TIME - score)})</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Canvas */}
          <canvas
            ref={canvasRef}
            className="cursor-none touch-none rounded-lg shadow-2xl"
            style={{ 
              border: `2px solid ${COLORS.gridLine}`,
              maxWidth: 'calc(100vw - 32px)',
              maxHeight: 'calc(100vh - 180px)',
            }}
            onPointerMove={handlePointerMove}
            onPointerDown={handlePointerMove}
          />
        </>
      )}

      {/* ============ GAME OVER ============ */}
      {screen === 'game_over' && currentLevelConfig && (
        <div className="flex flex-col items-center justify-center p-4 w-full max-w-md">
          <div className="w-full p-6 rounded-2xl" style={{ background: COLORS.grid }}>
            <h2 
              className="text-2xl font-bold text-center mb-4"
              style={{ color: gameResult === 'win' ? COLORS.success : COLORS.danger }}
            >
              {gameResult === 'win' ? '🎉 Level Complete!' : '💀 Game Over'}
            </h2>

            <div className="text-center mb-4">
              <div className="text-sm" style={{ color: COLORS.textMuted }}>
                Level {currentLevelConfig.id}: {currentLevelConfig.name}
              </div>
              <div className="text-3xl font-bold font-mono mt-2" style={{ color: COLORS.text }}>
                {formatTime(score)}
              </div>
              {gameMode === 'story' && (
                <div className="text-sm mt-1" style={{ color: COLORS.textMuted }}>
                  / {formatTimeShort(currentLevelConfig.survivalTime)} needed
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-lg text-center" style={{ background: COLORS.background }}>
                <div className="text-xs" style={{ color: COLORS.textMuted }}>Snake Length</div>
                <div className="font-bold" style={{ color: COLORS.snakeHead }}>{snakeLength}</div>
              </div>
              <div className="p-3 rounded-lg text-center" style={{ background: COLORS.background }}>
                <div className="text-xs" style={{ color: COLORS.textMuted }}>Food Eaten</div>
                <div className="font-bold" style={{ color: COLORS.powerFood }}>{playerFoodCount}</div>
              </div>
            </div>

            {/* Personal best notification for survival */}
            {gameMode === 'survival' && lastSubmitResult && (
              <div 
                className="p-3 rounded-lg mb-4 text-center"
                style={{ background: lastSubmitResult.isPersonalBest ? 'rgba(34, 197, 94, 0.2)' : COLORS.background }}
              >
                {lastSubmitResult.isPersonalBest ? (
                  <div className="font-bold" style={{ color: COLORS.success }}>🎉 New Personal Best!</div>
                ) : (
                  <div style={{ color: COLORS.textMuted }}>Score recorded</div>
                )}
                {lastSubmitResult.rank > 0 && (
                  <div className="text-sm" style={{ color: COLORS.textMuted }}>
                    Rank: #{lastSubmitResult.rank}
                  </div>
                )}
              </div>
            )}

            {/* Story mode: Level unlocked */}
            {gameMode === 'story' && gameResult === 'win' && currentLevelConfig.id < TOTAL_LEVELS && (
              <div className="p-3 rounded-lg mb-4 text-center" style={{ background: 'rgba(34, 197, 94, 0.2)' }}>
                <div className="font-bold" style={{ color: COLORS.success }}>
                  🔓 Level {currentLevelConfig.id + 1} Unlocked!
                </div>
                <div className="text-sm" style={{ color: COLORS.textMuted }}>
                  {getLevel(currentLevelConfig.id + 1)?.name}
                </div>
              </div>
            )}

            {/* Lives remaining for Story Mode */}
            {gameMode === 'story' && initData && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <span style={{ color: COLORS.textMuted }}>Lives:</span>
                <div className="flex gap-1">
                  {[1, 2, 3].map(i => (
                    <span key={i} className="text-lg">
                      {i <= initData.storyProgress.triesRemaining ? '❤️' : '🖤'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col gap-2">
              {gameMode === 'story' && gameResult === 'win' && currentLevelConfig.id < TOTAL_LEVELS && initData && initData.storyProgress.triesRemaining > 0 && (
        <button
                  onClick={() => startGame('story', currentLevelConfig.id + 1)}
                  className="w-full py-3 rounded-lg font-bold"
                  style={{ background: COLORS.success, color: COLORS.text }}
        >
                  Continue to Level {currentLevelConfig.id + 1}
        </button>
              )}
              
              {gameMode === 'story' && gameResult === 'lose' && initData && initData.storyProgress.triesRemaining > 0 && (
                <button
                  onClick={() => startGame('story', currentLevelConfig.id)}
                  className="w-full py-3 rounded-lg font-bold"
                  style={{ background: COLORS.accent, color: COLORS.text }}
                >
                  Retry ({initData.storyProgress.triesRemaining} {initData.storyProgress.triesRemaining === 1 ? 'life' : 'lives'} left)
                </button>
              )}

              {/* No lives remaining message */}
              {gameMode === 'story' && initData && initData.storyProgress.triesRemaining <= 0 && (
                <div 
                  className="w-full py-3 rounded-lg text-center"
                  style={{ background: 'rgba(239, 68, 68, 0.2)', color: COLORS.danger }}
                >
                  No lives left today! Come back tomorrow.
                </div>
              )}

              {gameMode === 'survival' && (
                <button
                  onClick={() => startGame('survival', currentLevelConfig.id)}
                  className="w-full py-3 rounded-lg font-bold"
                  style={{ background: COLORS.accent, color: COLORS.text }}
                >
                  Play Again
                </button>
              )}

              <button
                onClick={() => {
                  refreshData();
                  setScreen('menu');
                }}
                className="w-full py-2 rounded-lg"
                style={{ background: COLORS.gridLine, color: COLORS.text }}
              >
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ LEADERBOARD ============ */}
      {screen === 'leaderboard' && (
        <div className="flex flex-col items-center p-4 w-full max-w-md max-h-screen overflow-auto">
          <button
            onClick={() => setScreen('menu')}
            className="self-start mb-4 text-sm"
            style={{ color: COLORS.textMuted }}
          >
            ← Back
          </button>

          <h2 className="text-2xl font-bold mb-4" style={{ color: COLORS.text }}>
            🏆 Leaderboards
          </h2>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 w-full">
            <button
              onClick={() => setLeaderboardTab('story')}
              className="flex-1 py-2 rounded-lg font-bold"
              style={{ 
                background: leaderboardTab === 'story' ? COLORS.success : COLORS.gridLine,
                color: COLORS.text,
              }}
            >
              Story Progress
            </button>
            <button
              onClick={() => {
                setLeaderboardTab('survival');
                loadSurvivalLeaderboard(1);
              }}
              className="flex-1 py-2 rounded-lg font-bold"
              style={{ 
                background: leaderboardTab === 'survival' ? COLORS.accent : COLORS.gridLine,
                color: COLORS.text,
              }}
            >
              Survival Scores
            </button>
          </div>

          {/* Story Leaderboard */}
          {leaderboardTab === 'story' && initData && (
            <div className="w-full space-y-2">
              {initData.storyLeaderboard.length > 0 ? (
                initData.storyLeaderboard.map((entry, index) => (
                  <div 
                    key={entry.username}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ 
                      background: entry.username === initData.username 
                        ? 'rgba(34, 197, 94, 0.2)' 
                        : COLORS.background 
                    }}
                  >
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                      style={{ 
                        background: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : COLORS.gridLine,
                        color: index < 3 ? '#000' : COLORS.text,
                      }}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate" style={{ color: COLORS.text }}>
                        {entry.username}
                      </div>
                    </div>
                    <div className="font-bold" style={{ color: COLORS.success }}>
                      Level {entry.level > TOTAL_LEVELS ? `${TOTAL_LEVELS} ✅` : entry.level}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8" style={{ color: COLORS.textMuted }}>
                  No progress recorded yet!
                </div>
              )}
            </div>
          )}

          {/* Survival Leaderboard */}
          {leaderboardTab === 'survival' && (
            <div className="w-full">
              {/* Level selector */}
              <div className="mb-4">
                <select
                  value={leaderboardLevel}
                  onChange={(e) => loadSurvivalLeaderboard(Number(e.target.value))}
                  className="w-full p-2 rounded-lg"
                  style={{ background: COLORS.background, color: COLORS.text, border: `1px solid ${COLORS.gridLine}` }}
                >
                  {LEVELS.filter(l => l.id <= unlockedLevels).map(level => (
                    <option key={level.id} value={level.id}>
                      Level {level.id}: {level.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                {survivalLeaderboard && survivalLeaderboard.length > 0 ? (
                  survivalLeaderboard.map((entry, index) => (
                    <div 
                      key={entry.username}
                      className="flex items-center gap-3 p-3 rounded-lg"
                      style={{ 
                        background: entry.username === initData?.username 
                          ? 'rgba(255, 69, 0, 0.2)' 
                          : COLORS.background 
                      }}
                    >
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                        style={{ 
                          background: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : COLORS.gridLine,
                          color: index < 3 ? '#000' : COLORS.text,
                        }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate" style={{ color: COLORS.text }}>
                          {entry.username}
                        </div>
                      </div>
                      <div className="font-bold font-mono" style={{ color: COLORS.accent }}>
                        {formatTime(entry.score)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8" style={{ color: COLORS.textMuted }}>
                    No scores for this level yet!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============ HOW TO PLAY ============ */}
      {screen === 'how_to_play' && (
        <div className="flex flex-col items-center justify-center p-3 w-full max-w-xs h-full">
          <button
            onClick={() => setScreen('menu')}
            className="self-start mb-2 text-xs"
            style={{ color: COLORS.textMuted }}
          >
            ← Back
          </button>

          <h2 className="text-lg font-bold mb-2" style={{ color: COLORS.text }}>
            How to Play
          </h2>

          {/* Game Preview Visual - Compact */}
          <div 
            className="relative w-full h-20 rounded-lg mb-3 flex items-center justify-center"
            style={{ background: COLORS.background, border: `1px solid ${COLORS.gridLine}` }}
          >
            {/* You (the fruit) */}
            <div className="absolute flex flex-col items-center" style={{ right: '18%', top: '10%' }}>
              <div 
                className="w-7 h-7 rounded-full"
                style={{ background: COLORS.fruit, boxShadow: `0 0 10px ${COLORS.fruit}` }}
              />
              <span className="text-[10px] font-bold" style={{ color: COLORS.fruit }}>YOU</span>
            </div>

            {/* Arrow */}
            <div className="text-xl" style={{ color: COLORS.textMuted }}>←</div>

            {/* Snake */}
            <div className="absolute" style={{ left: '12%', top: '18%' }}>
              <div className="flex gap-0.5">
                <div 
                  className="w-5 h-5 rounded flex items-center justify-center text-[8px]"
                  style={{ background: COLORS.snakeHead }}
                >👀</div>
                <div className="w-5 h-5 rounded" style={{ background: COLORS.snakeBody }} />
                <div className="w-5 h-5 rounded" style={{ background: COLORS.snakeTail }} />
              </div>
              <span className="text-[10px] font-bold" style={{ color: COLORS.snakeHead }}>SNAKE</span>
            </div>

            {/* Power Food */}
            <div className="absolute" style={{ right: '5%', bottom: '8%' }}>
              <span className="text-sm">⭐</span>
            </div>
          </div>

          {/* Instructions - Compact Grid */}
          <div className="w-full grid grid-cols-2 gap-2 text-xs mb-3">
            <div className="p-2 rounded" style={{ background: COLORS.grid }}>
              <div className="flex items-center gap-1 mb-0.5">
                <span>📱</span>
                <span className="font-bold" style={{ color: COLORS.text }}>Controls</span>
              </div>
              <div style={{ color: COLORS.textMuted }}>Touch/mouse moves fruit</div>
            </div>
            <div className="p-2 rounded" style={{ background: COLORS.grid }}>
              <div className="flex items-center gap-1 mb-0.5">
                <span>🎯</span>
                <span className="font-bold" style={{ color: COLORS.text }}>Objective</span>
              </div>
              <div style={{ color: COLORS.textMuted }}>Survive, avoid snake!</div>
            </div>
            <div className="p-2 rounded" style={{ background: COLORS.grid }}>
              <div className="flex items-center gap-1 mb-0.5">
                <span>⭐</span>
                <span className="font-bold" style={{ color: COLORS.text }}>Power Food</span>
              </div>
              <div style={{ color: COLORS.textMuted }}>Collect after 30s</div>
            </div>
            <div className="p-2 rounded" style={{ background: COLORS.grid }}>
              <div className="flex items-center gap-1 mb-0.5">
                <span>❤️</span>
                <span className="font-bold" style={{ color: COLORS.text }}>Tries</span>
              </div>
              <div style={{ color: COLORS.textMuted }}>3 per day (story)</div>
            </div>
          </div>

          {/* Mode descriptions */}
          <div className="w-full space-y-1 text-xs mb-3">
            <div className="p-2 rounded flex items-center gap-2" style={{ background: COLORS.grid }}>
              <span>📖</span>
              <span style={{ color: COLORS.textMuted }}><b style={{ color: COLORS.success }}>Story:</b> Beat 30 levels, lose try on death</span>
            </div>
            <div className="p-2 rounded flex items-center gap-2" style={{ background: COLORS.grid }}>
              <span>⏱️</span>
              <span style={{ color: COLORS.textMuted }}><b style={{ color: COLORS.accent }}>Survival:</b> Unlimited, compete for high scores</span>
            </div>
          </div>

          <button
            onClick={() => setScreen('menu')}
            className="w-full py-2 rounded-lg font-bold text-sm"
            style={{ background: COLORS.accent, color: COLORS.text }}
          >
            Got it!
          </button>
        </div>
      )}

      {/* Hidden canvas for initialization */}
      {screen !== 'playing' && (
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />
      )}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
