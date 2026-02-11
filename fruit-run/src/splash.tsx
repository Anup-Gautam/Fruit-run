import './index.css';
import logoUrl from './logo.png';

import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { trpc } from './trpc';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from './server/trpc';

type RouterOutputs = inferRouterOutputs<AppRouter>;

const COLORS = {
  background: '#0e1113',
  grid: '#1a1f24',
  gridLine: '#252d33',
  fruit: '#ff4500',
  snakeHead: '#7cfc00',
  snakeBody: '#32cd32',
  success: '#22c55e',
  text: '#ffffff',
  textMuted: '#8b949e',
  accent: '#ff4500',
  danger: '#dc3545',
  powerFood: '#ffdd00',
};

const TOTAL_LEVELS = 30;

export const Splash = () => {
  const [data, setData] = useState<RouterOutputs['init']['get'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await trpc.init.get.query();
        setData(result);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, []);

  return (
    <div 
      className="relative flex h-screen max-h-screen flex-col items-center justify-center p-3 overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${COLORS.background} 0%, #1a1f24 100%)` }}
    >
      {/* How to Play Modal */}
      {showHowToPlay && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setShowHowToPlay(false)}
        >
          <div 
            className="w-full max-w-sm max-h-[90vh] overflow-auto rounded-2xl p-5"
            style={{ background: COLORS.grid }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold" style={{ color: COLORS.text }}>How to Play</h2>
              <button 
                onClick={() => setShowHowToPlay(false)}
                className="text-2xl"
                style={{ color: COLORS.textMuted }}
              >
                ✕
              </button>
            </div>

            {/* Game Preview Visual */}
            <div 
              className="relative w-full h-32 rounded-lg mb-4 flex items-center justify-center"
              style={{ background: COLORS.background }}
            >
              {/* You (the fruit) */}
              <div className="absolute flex flex-col items-center" style={{ right: '25%', top: '20%' }}>
                <div 
                  className="w-8 h-8 rounded-full"
                  style={{ background: COLORS.fruit, boxShadow: `0 0 15px ${COLORS.fruit}` }}
                />
                <span className="text-xs mt-1 font-bold" style={{ color: COLORS.fruit }}>YOU</span>
              </div>

              {/* Arrow showing chase */}
              <div className="text-2xl" style={{ color: COLORS.textMuted }}>←</div>

              {/* Snake */}
              <div className="absolute flex gap-0.5" style={{ left: '20%', top: '30%' }}>
                <div 
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ background: COLORS.snakeHead, boxShadow: `0 0 8px ${COLORS.snakeHead}` }}
                >
                  <span className="text-xs">👀</span>
                </div>
                <div className="w-6 h-6 rounded-md" style={{ background: COLORS.snakeBody }} />
                <div className="w-6 h-6 rounded-md" style={{ background: '#228b22' }} />
              </div>
              <div className="absolute text-xs font-bold" style={{ left: '20%', top: '58%', color: COLORS.snakeHead }}>
                SNAKE
              </div>

              {/* Power Food */}
              <div className="absolute flex flex-col items-center" style={{ right: '10%', bottom: '15%' }}>
                <div 
                  className="w-5 h-5 flex items-center justify-center"
                  style={{ color: COLORS.powerFood }}
                >
                  ⭐
                </div>
                <span className="text-xs" style={{ color: COLORS.powerFood }}>FOOD</span>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-3 text-sm">
              <div className="flex gap-3 items-start">
                <span className="text-xl">📱</span>
                <div>
                  <div className="font-bold" style={{ color: COLORS.text }}>Controls</div>
                  <div style={{ color: COLORS.textMuted }}>
                    Touch & drag (mobile) or move mouse (desktop) to control the fruit
                  </div>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="text-xl">🎯</span>
                <div>
                  <div className="font-bold" style={{ color: COLORS.text }}>Objective</div>
                  <div style={{ color: COLORS.textMuted }}>
                    Survive as long as possible! Don't let the snake catch you.
                  </div>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="text-xl">⭐</span>
                <div>
                  <div className="font-bold" style={{ color: COLORS.text }}>Power Food</div>
                  <div style={{ color: COLORS.textMuted }}>
                    After 30 seconds, collect stars to shrink and slow the snake!
                  </div>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="text-xl">📖</span>
                <div>
                  <div className="font-bold" style={{ color: COLORS.text }}>Story Mode</div>
                  <div style={{ color: COLORS.textMuted }}>
                    Beat 30 levels with unique challenges. 3 tries per day!
                  </div>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="text-xl">⏱️</span>
                <div>
                  <div className="font-bold" style={{ color: COLORS.text }}>Survival Mode</div>
                  <div style={{ color: COLORS.textMuted }}>
                    Unlimited plays on unlocked levels. Compete for high scores!
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHowToPlay(false)}
              className="w-full mt-4 py-3 rounded-lg font-bold"
              style={{ background: COLORS.accent, color: COLORS.text }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Logo & Title */}
      <img
        src={logoUrl}
        alt="Reverse Snake"
        className="w-24 h-24 object-contain mb-2"
      />
      <div className="flex items-center gap-2 mb-3">
        <span className="text-3xl">🍎</span>
        <h1 className="text-xl font-bold" style={{ color: COLORS.text }}>
          Reverse Snake
        </h1>
        <span className="text-3xl">🐍</span>
      </div>

      {/* Progress Display - Compact */}
      {!loading && data && (
        <div className="w-full max-w-xs mb-4 p-3 rounded-xl" style={{ background: COLORS.grid }}>
          <div className="flex justify-between items-center mb-1 text-xs">
            <span style={{ color: COLORS.textMuted }}>Level {data.storyProgress.currentLevel > TOTAL_LEVELS ? TOTAL_LEVELS : data.storyProgress.currentLevel}/{TOTAL_LEVELS}</span>
            <div className="flex items-center gap-1">
              <span style={{ color: COLORS.textMuted }}>Lives:</span>
              {[1, 2, 3].map(i => (
                <span key={i} className="text-sm">
                  {i <= data.storyProgress.triesRemaining ? '❤️' : '🖤'}
                </span>
              ))}
            </div>
          </div>
          <div className="w-full bg-black/30 rounded-full h-1.5">
            <div 
              className="h-1.5 rounded-full transition-all"
              style={{ 
                width: `${Math.min(100, ((data.storyProgress.currentLevel - 1) / TOTAL_LEVELS) * 100)}%`,
                background: COLORS.success 
              }}
            />
          </div>
        </div>
      )}

      {/* Play Button - Prominent */}
      <button
        className="px-10 py-4 rounded-full text-xl font-bold transition-all hover:scale-105 active:scale-95 mb-3"
        style={{ 
          background: `linear-gradient(135deg, ${COLORS.accent} 0%, #ff6b35 100%)`,
          color: COLORS.text,
          boxShadow: `0 4px 25px rgba(255, 69, 0, 0.5)`,
        }}
        onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
      >
        🎮 Play Now
      </button>

      {/* How to Play Button */}
      <button
        onClick={() => setShowHowToPlay(true)}
        className="px-6 py-2 rounded-full text-sm font-medium mb-3"
        style={{ 
          background: COLORS.grid,
          color: COLORS.text,
          border: `1px solid ${COLORS.gridLine}`,
        }}
      >
        ❓ How to Play
      </button>

      {/* User info */}
      <div className="text-xs" style={{ color: COLORS.textMuted }}>
        {context.username ? `Playing as ${context.username}` : 'Loading...'}
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
