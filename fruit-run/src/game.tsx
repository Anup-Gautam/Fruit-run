import './index.css';

import type { PointerEvent as ReactPointerEvent } from 'react';
import { StrictMode, useEffect, useRef, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { trpc } from './trpc';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from './server/trpc';

type RouterOutputs = inferRouterOutputs<AppRouter>;

// ============ GAME CONSTANTS ============
const GRID_SIZE = 20; // Number of cells
const INITIAL_SNAKE_SPEED = 150; // ms per move
const SPEED_INCREASE_INTERVAL = 3000; // Increase speed every 3 seconds
const SPEED_INCREASE_AMOUNT = 5; // ms faster per interval
const MIN_SNAKE_SPEED = 50; // Minimum ms per move
const SNAKE_GROW_INTERVAL = 5000; // Grow every 5 seconds
const FRUIT_RADIUS_RATIO = 0.4; // Fruit radius relative to cell size
const COLLISION_TOLERANCE = 0.6; // Collision detection tolerance

// ============ TYPES ============
type Point = { x: number; y: number };
type GameState = 'idle' | 'playing' | 'gameover';

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
};

// ============ GAME COMPONENT ============
export const App = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Game state
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [snakeLength, setSnakeLength] = useState(3);
  const [snakeSpeed, setSnakeSpeed] = useState(INITIAL_SNAKE_SPEED);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  
  // Data from server
  const [initData, setInitData] = useState<RouterOutputs['init']['get'] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    rank: number;
    isPersonalBest: boolean;
  } | null>(null);

  // Game refs (mutable state for game loop)
  const gameRef = useRef({
    fruit: { x: GRID_SIZE / 2, y: GRID_SIZE / 2 },
    snake: [] as Point[],
    snakeSpeed: INITIAL_SNAKE_SPEED,
    lastMoveTime: 0,
    lastGrowTime: 0,
    lastSpeedTime: 0,
    startTime: 0,
    cellSize: 0,
    canvasSize: 0,
    isPlaying: false,
    hasStarted: false,
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

  // Initialize snake
  const initSnake = useCallback(() => {
    const snake: Point[] = [];
    const startX = 2;
    const startY = Math.floor(GRID_SIZE / 2);
    for (let i = 0; i < 3; i++) {
      snake.push({ x: startX - i, y: startY });
    }
    return snake;
  }, []);

  // Calculate Manhattan distance
  const manhattanDistance = (a: Point, b: Point) => {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  };

  // Get next snake head position using Manhattan distance pathfinding
  const getNextSnakeMove = useCallback((head: Point, target: Point, snake: Point[]): Point => {
    const directions = [
      { x: 0, y: -1 }, // up
      { x: 0, y: 1 },  // down
      { x: -1, y: 0 }, // left
      { x: 1, y: 0 },  // right
    ];

    let bestMove = head;
    let bestDistance = Infinity;

    for (const dir of directions) {
      const newPos = {
        x: head.x + dir.x,
        y: head.y + dir.y,
      };

      // Check bounds
      if (newPos.x < 0 || newPos.x >= GRID_SIZE || newPos.y < 0 || newPos.y >= GRID_SIZE) {
        continue;
      }

      // Check self-collision (skip tail as it will move)
      const wouldCollide = snake.slice(0, -1).some(
        segment => segment.x === newPos.x && segment.y === newPos.y
      );
      if (wouldCollide) continue;

      const distance = manhattanDistance(newPos, target);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMove = newPos;
      }
    }

    return bestMove;
  }, []);

  // Check collision between fruit and any snake segment
  const checkCollision = useCallback((fruit: Point, snake: Point[], cellSize: number): boolean => {
    const fruitCenterX = fruit.x * cellSize + cellSize / 2;
    const fruitCenterY = fruit.y * cellSize + cellSize / 2;

    for (let i = 0; i < snake.length; i++) {
      const segment = snake[i];
      if (!segment) continue;
      
      const segmentCenterX = segment.x * cellSize + cellSize / 2;
      const segmentCenterY = segment.y * cellSize + cellSize / 2;
      
      // Check if fruit overlaps with this segment
      const dx = Math.abs(fruitCenterX - segmentCenterX);
      const dy = Math.abs(fruitCenterY - segmentCenterY);
      
      // Collision if fruit center is within the segment cell
      const collisionThreshold = cellSize * COLLISION_TOLERANCE;
      if (dx < collisionThreshold && dy < collisionThreshold) {
        return true;
      }
    }
    return false;
  }, []);

  // Draw game
  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const { fruit, snake, cellSize, canvasSize } = gameRef.current;

    // Clear canvas
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Draw grid
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
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

    // Draw snake body (from tail to head for proper layering)
    for (let i = snake.length - 1; i >= 0; i--) {
      const segment = snake[i];
      if (!segment) continue;
      const x = segment.x * cellSize;
      const y = segment.y * cellSize;
      const padding = cellSize * 0.1;
      
      // Gradient color from tail to head
      const ratio = i / Math.max(snake.length - 1, 1);
      const isHead = i === 0;
      
      if (isHead) {
        // Draw snake head
        ctx.fillStyle = COLORS.snakeHead;
        ctx.shadowColor = COLORS.snakeHead;
        ctx.shadowBlur = 10;
      } else {
        // Interpolate color
        const green = Math.floor(139 + ratio * (124 - 139));
        const greenHex = Math.floor(205 + ratio * (252 - 205));
        ctx.fillStyle = `rgb(${Math.floor(50 + ratio * 74)}, ${greenHex}, ${green > 50 ? 0 : green})`;
        ctx.shadowBlur = 0;
      }

      // Draw rounded rectangle for segment
      const radius = cellSize * 0.3;
      ctx.beginPath();
      ctx.roundRect(x + padding, y + padding, cellSize - padding * 2, cellSize - padding * 2, radius);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw eyes on head
      if (isHead) {
        ctx.fillStyle = COLORS.snakeEye;
        const eyeSize = cellSize * 0.12;
        const eyeOffsetX = cellSize * 0.25;
        const eyeOffsetY = cellSize * 0.3;
        
        // Determine direction for eye placement
        let dirX = 1, dirY = 0;
        const head = snake[0];
        const neck = snake[1];
        if (snake.length > 1 && head && neck) {
          dirX = head.x - neck.x;
          dirY = head.y - neck.y;
        }
        
        const centerX = x + cellSize / 2;
        const centerY = y + cellSize / 2;
        
        if (dirX !== 0) {
          // Moving horizontally
          ctx.beginPath();
          ctx.arc(centerX + dirX * eyeOffsetX, centerY - eyeOffsetY, eyeSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(centerX + dirX * eyeOffsetX, centerY + eyeOffsetY, eyeSize, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Moving vertically
          ctx.beginPath();
          ctx.arc(centerX - eyeOffsetY, centerY + dirY * eyeOffsetX, eyeSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(centerX + eyeOffsetY, centerY + dirY * eyeOffsetX, eyeSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw fruit (player) with glow effect
    const fruitCenterX = fruit.x * cellSize + cellSize / 2;
    const fruitCenterY = fruit.y * cellSize + cellSize / 2;
    const fruitRadius = cellSize * FRUIT_RADIUS_RATIO;

    // Glow
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

    // Fruit body (apple-like)
    ctx.fillStyle = COLORS.fruit;
    ctx.shadowColor = COLORS.fruit;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(fruitCenterX, fruitCenterY, fruitRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Fruit highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(fruitCenterX - fruitRadius * 0.3, fruitCenterY - fruitRadius * 0.3, fruitRadius * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Fruit stem
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fruitCenterX, fruitCenterY - fruitRadius);
    ctx.lineTo(fruitCenterX + 2, fruitCenterY - fruitRadius - 6);
    ctx.stroke();

    // Leaf
    ctx.fillStyle = '#228b22';
    ctx.beginPath();
    ctx.ellipse(fruitCenterX + 5, fruitCenterY - fruitRadius - 4, 5, 3, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  // Game loop
  const gameLoop = useCallback((timestamp: number) => {
    const game = gameRef.current;
    if (!game.isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Update score (survival time in ms)
    const currentScore = Math.floor((timestamp - game.startTime) / 100) * 100;
    setScore(currentScore);

    // Snake speed increase
    if (timestamp - game.lastSpeedTime >= SPEED_INCREASE_INTERVAL) {
      game.snakeSpeed = Math.max(MIN_SNAKE_SPEED, game.snakeSpeed - SPEED_INCREASE_AMOUNT);
      game.lastSpeedTime = timestamp;
      setSnakeSpeed(game.snakeSpeed);
    }

    // Snake growth
    if (timestamp - game.lastGrowTime >= SNAKE_GROW_INTERVAL) {
      // Add new segment at tail position
      const tail = game.snake[game.snake.length - 1];
      if (tail) {
        game.snake.push({ x: tail.x, y: tail.y });
        game.lastGrowTime = timestamp;
        setSnakeLength(game.snake.length);
      }
    }

    // Snake movement
    if (timestamp - game.lastMoveTime >= game.snakeSpeed) {
      const head = game.snake[0];
      if (head) {
        const targetCell = {
          x: Math.floor(game.fruit.x),
          y: Math.floor(game.fruit.y),
        };
        
        const newHead = getNextSnakeMove(head, targetCell, game.snake);
        
        // Move snake: add new head, remove tail
        game.snake.unshift(newHead);
        game.snake.pop();
        
        game.lastMoveTime = timestamp;
      }
    }

    // Check collision
    if (checkCollision(game.fruit, game.snake, game.cellSize)) {
      game.isPlaying = false;
      setGameState('gameover');
      return;
    }

    // Draw
    draw(ctx);

    // Continue loop
    requestAnimationFrame(gameLoop);
  }, [draw, getNextSnakeMove, checkCollision]);

  // Start game
  const startGame = useCallback(() => {
    const game = gameRef.current;
    game.snake = initSnake();
    game.snakeSpeed = INITIAL_SNAKE_SPEED;
    game.lastMoveTime = 0;
    game.lastGrowTime = 0;
    game.lastSpeedTime = 0;
    game.startTime = performance.now();
    game.isPlaying = true;
    game.hasStarted = true;

    setGameState('playing');
    setScore(0);
    setSnakeLength(3);
    setSnakeSpeed(INITIAL_SNAKE_SPEED);
    setSubmitResult(null);

    requestAnimationFrame(gameLoop);
  }, [initSnake, gameLoop]);

  // Handle pointer move (mouse/touch)
  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const game = gameRef.current;
    const { cellSize } = game;

    // Convert to grid coordinates (allow fractional for smooth movement)
    const gridX = Math.max(0, Math.min(GRID_SIZE - 1, x / cellSize));
    const gridY = Math.max(0, Math.min(GRID_SIZE - 1, y / cellSize));

    game.fruit = { x: gridX, y: gridY };

    // Start game on first movement
    if (!game.hasStarted && gameRef.current.isPlaying === false && gameState === 'idle') {
      startGame();
    }
  }, [gameState, startGame]);

  // Handle canvas resize
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      // Get container dimensions
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      // Use the smaller dimension for a square canvas
      const size = Math.min(containerWidth, containerHeight - 120); // Leave room for HUD
      const canvasSize = Math.floor(size / GRID_SIZE) * GRID_SIZE;
      
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      canvas.style.width = `${canvasSize}px`;
      canvas.style.height = `${canvasSize}px`;

      gameRef.current.cellSize = canvasSize / GRID_SIZE;
      gameRef.current.canvasSize = canvasSize;

      // Redraw if not playing
      if (!gameRef.current.isPlaying) {
        const ctx = canvas.getContext('2d');
        if (ctx) draw(ctx);
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [draw]);

  // Initial draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    gameRef.current.snake = initSnake();
    draw(ctx);
  }, [initSnake, draw]);

  // Submit score
  const handleSubmitScore = async () => {
    if (submitting) return;
    setSubmitting(true);
    
    try {
      const result = await trpc.leaderboard.submit.mutate({
        score,
        snakeLength,
      });
      setSubmitResult(result);
      
      // Refresh leaderboard
      const newData = await trpc.init.get.query();
      setInitData(newData);
    } catch (err) {
      console.error('Failed to submit score:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Format time
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={containerRef}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${COLORS.background} 0%, #1a1f24 100%)` }}
    >
      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
        <div className="flex flex-col gap-1">
          <div className="text-xs uppercase tracking-wider" style={{ color: COLORS.textMuted }}>
            Time
          </div>
          <div className="text-2xl font-bold font-mono" style={{ color: COLORS.text }}>
            {formatTime(score)}
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-1">
          <div className="text-xs uppercase tracking-wider" style={{ color: COLORS.textMuted }}>
            Snake
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: COLORS.snakeHead }}>
                {snakeLength}
              </div>
              <div className="text-[10px]" style={{ color: COLORS.textMuted }}>length</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: COLORS.danger }}>
                {Math.round(1000 / snakeSpeed * 10) / 10}
              </div>
              <div className="text-[10px]" style={{ color: COLORS.textMuted }}>speed</div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          <div className="text-xs uppercase tracking-wider" style={{ color: COLORS.textMuted }}>
            Best
          </div>
          <div className="text-lg font-bold font-mono" style={{ color: COLORS.accent }}>
            {formatTime(initData?.personalBest ?? 0)}
          </div>
        </div>
      </div>

      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        className="cursor-none touch-none rounded-lg shadow-2xl"
        style={{ 
          border: `2px solid ${COLORS.gridLine}`,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 200px)',
        }}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerMove}
      />

      {/* Idle overlay */}
      {gameState === 'idle' && (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
          style={{ pointerEvents: 'none' }}
        >
          <h1 className="text-3xl font-bold mb-2" style={{ color: COLORS.fruit }}>
            🍎 Reverse Snake
        </h1>
          <p className="text-lg mb-6" style={{ color: COLORS.text }}>
            You are the fruit. Don't get eaten!
          </p>
          <div 
            className="px-6 py-3 rounded-full text-lg font-semibold animate-pulse"
            style={{ 
              background: COLORS.accent,
              color: COLORS.text,
            }}
          >
            Move to Start
          </div>
          <p className="mt-4 text-sm" style={{ color: COLORS.textMuted }}>
            Touch or move mouse to control the fruit
        </p>
      </div>
      )}

      {/* Game Over overlay */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-20">
          <div 
            className="p-6 rounded-2xl max-w-sm w-full mx-4"
            style={{ background: COLORS.grid }}
          >
            <h2 className="text-2xl font-bold text-center mb-4" style={{ color: COLORS.danger }}>
              🐍 Game Over!
            </h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-3 rounded-lg" style={{ background: COLORS.background }}>
                <div className="text-xs uppercase tracking-wider mb-1" style={{ color: COLORS.textMuted }}>
                  Survival Time
                </div>
                <div className="text-xl font-bold font-mono" style={{ color: COLORS.text }}>
                  {formatTime(score)}
                </div>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ background: COLORS.background }}>
                <div className="text-xs uppercase tracking-wider mb-1" style={{ color: COLORS.textMuted }}>
                  Snake Length
                </div>
                <div className="text-xl font-bold" style={{ color: COLORS.snakeHead }}>
                  {snakeLength}
                </div>
              </div>
            </div>

            {submitResult && (
              <div 
                className="p-3 rounded-lg mb-4 text-center"
                style={{ background: submitResult.isPersonalBest ? 'rgba(255, 69, 0, 0.2)' : COLORS.background }}
              >
                {submitResult.isPersonalBest ? (
                  <div>
                    <span className="text-lg">🎉</span>
                    <span className="font-bold ml-2" style={{ color: COLORS.accent }}>New Personal Best!</span>
                  </div>
                ) : (
                  <div style={{ color: COLORS.textMuted }}>Score submitted</div>
                )}
                {submitResult.rank > 0 && (
                  <div className="text-sm mt-1" style={{ color: COLORS.textMuted }}>
                    Global Rank: #{submitResult.rank}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              {!submitResult && (
                <button
                  onClick={handleSubmitScore}
                  disabled={submitting}
                  className="w-full py-3 rounded-lg font-semibold transition-opacity"
                  style={{ 
                    background: COLORS.accent,
                    color: COLORS.text,
                    opacity: submitting ? 0.5 : 1,
                  }}
                >
                  {submitting ? 'Submitting...' : 'Submit Score'}
                </button>
              )}
        <button
                onClick={() => {
                  gameRef.current.hasStarted = false;
                  gameRef.current.fruit = { x: GRID_SIZE / 2, y: GRID_SIZE / 2 };
                  setGameState('idle');
                  const canvas = canvasRef.current;
                  if (canvas) {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      gameRef.current.snake = initSnake();
                      draw(ctx);
                    }
                  }
                }}
                className="w-full py-3 rounded-lg font-semibold transition-colors"
                style={{ 
                  background: COLORS.gridLine,
                  color: COLORS.text,
                }}
              >
                Play Again
        </button>
        <button
                onClick={() => setShowLeaderboard(true)}
                className="w-full py-2 rounded-lg font-medium"
                style={{ 
                  color: COLORS.textMuted,
                }}
              >
                View Leaderboard
        </button>
      </div>
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30"
          onClick={() => setShowLeaderboard(false)}
        >
          <div 
            className="p-6 rounded-2xl max-w-sm w-full mx-4 max-h-[80vh] overflow-auto"
            style={{ background: COLORS.grid }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-center mb-4" style={{ color: COLORS.text }}>
              🏆 Leaderboard
            </h2>
            
            {initData?.leaderboard && initData.leaderboard.length > 0 ? (
              <div className="space-y-2">
                {initData.leaderboard.map((entry, index) => (
                  <div 
                    key={entry.username}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ 
                      background: entry.username === initData.username 
                        ? 'rgba(255, 69, 0, 0.2)' 
                        : COLORS.background 
                    }}
                  >
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold"
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
                      <div className="text-xs" style={{ color: COLORS.textMuted }}>
                        🐍 {entry.snakeLength}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold font-mono" style={{ color: COLORS.accent }}>
                        {formatTime(entry.score)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8" style={{ color: COLORS.textMuted }}>
                No scores yet. Be the first!
              </div>
            )}

        <button
              onClick={() => setShowLeaderboard(false)}
              className="w-full mt-4 py-2 rounded-lg font-medium"
              style={{ 
                background: COLORS.gridLine,
                color: COLORS.text,
              }}
            >
              Close
        </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="absolute bottom-4 flex items-center gap-2">
        <button
          onClick={() => setShowLeaderboard(true)}
          className="px-3 py-1 rounded-full text-sm"
          style={{ 
            background: COLORS.gridLine,
            color: COLORS.textMuted,
          }}
        >
          🏆 Leaderboard
        </button>
        {initData?.username && (
          <span className="text-sm" style={{ color: COLORS.textMuted }}>
            Playing as {initData.username}
          </span>
        )}
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
