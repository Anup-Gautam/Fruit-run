import './index.css';

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
  fruit: '#ff4500',
  snakeHead: '#7cfc00',
  text: '#ffffff',
  textMuted: '#8b949e',
  accent: '#ff4500',
};

export const Splash = () => {
  const [data, setData] = useState<RouterOutputs['init']['get'] | null>(null);
  const [loading, setLoading] = useState(true);

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

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="relative flex min-h-screen flex-col items-center justify-center p-4"
      style={{ background: `linear-gradient(135deg, ${COLORS.background} 0%, #1a1f24 100%)` }}
    >
      {/* Game Title */}
      <div className="flex flex-col items-center gap-2 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🍎</span>
          <h1 className="text-2xl font-bold" style={{ color: COLORS.text }}>
            Reverse Snake
          </h1>
          <span className="text-4xl">🐍</span>
        </div>
        <p className="text-sm text-center max-w-xs" style={{ color: COLORS.textMuted }}>
          You are the fruit. Survive as long as possible without being eaten!
        </p>
      </div>

      {/* Game Preview */}
      <div 
        className="relative w-48 h-48 rounded-xl mb-6 overflow-hidden"
        style={{ background: COLORS.background, border: `2px solid ${COLORS.grid}` }}
      >
        {/* Animated snake and fruit preview */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="absolute w-6 h-6 rounded-full animate-bounce"
            style={{ 
              background: COLORS.fruit,
              boxShadow: `0 0 20px ${COLORS.fruit}`,
              top: '30%',
              right: '25%',
            }}
          />
          <div 
            className="absolute flex gap-1"
            style={{ bottom: '35%', left: '20%' }}
          >
            <div 
              className="w-5 h-5 rounded-md"
              style={{ background: COLORS.snakeHead, boxShadow: `0 0 10px ${COLORS.snakeHead}` }}
            />
            <div className="w-5 h-5 rounded-md" style={{ background: '#32cd32' }} />
            <div className="w-5 h-5 rounded-md" style={{ background: '#228b22' }} />
          </div>
        </div>
        
        {/* Grid overlay */}
        <svg className="absolute inset-0 w-full h-full opacity-20">
          <defs>
            <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke={COLORS.textMuted} strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Stats */}
      {!loading && data && (
        <div className="flex gap-4 mb-6">
          {data.personalBest > 0 && (
            <div 
              className="px-4 py-2 rounded-lg text-center"
              style={{ background: COLORS.grid }}
            >
              <div className="text-xs uppercase tracking-wider" style={{ color: COLORS.textMuted }}>
                Your Best
              </div>
              <div className="text-lg font-bold font-mono" style={{ color: COLORS.accent }}>
                {formatTime(data.personalBest)}
              </div>
            </div>
          )}
          {data.leaderboard && data.leaderboard.length > 0 && data.leaderboard[0] && (
            <div 
              className="px-4 py-2 rounded-lg text-center"
              style={{ background: COLORS.grid }}
            >
              <div className="text-xs uppercase tracking-wider" style={{ color: COLORS.textMuted }}>
                Top Score
              </div>
              <div className="text-lg font-bold font-mono" style={{ color: COLORS.snakeHead }}>
                {formatTime(data.leaderboard[0].score)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Play Button */}
      <button
        className="px-8 py-4 rounded-full text-lg font-bold transition-all hover:scale-105 active:scale-95"
        style={{ 
          background: `linear-gradient(135deg, ${COLORS.accent} 0%, #ff6b35 100%)`,
          color: COLORS.text,
          boxShadow: `0 4px 20px rgba(255, 69, 0, 0.4)`,
        }}
        onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
      >
        🎮 Play Now
      </button>

      {/* User info */}
      <div className="mt-4 text-sm" style={{ color: COLORS.textMuted }}>
        {context.username ? `Playing as ${context.username}` : 'Loading...'}
      </div>

      {/* How to play */}
      <div 
        className="mt-6 p-4 rounded-lg max-w-xs"
        style={{ background: COLORS.grid }}
      >
        <h3 className="text-sm font-semibold mb-2" style={{ color: COLORS.text }}>
          How to Play
        </h3>
        <ul className="text-xs space-y-1" style={{ color: COLORS.textMuted }}>
          <li>📱 Touch/mouse controls the fruit</li>
          <li>🐍 Snake hunts you down</li>
          <li>⏱️ Survive as long as possible</li>
          <li>📈 Snake grows & speeds up over time</li>
        </ul>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
