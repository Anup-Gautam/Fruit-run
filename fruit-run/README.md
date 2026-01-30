# 🍎 Reverse Snake

A unique twist on the classic Snake game where **you are the fruit**! Survive as long as possible while an AI-controlled snake hunts you down.

## 🎮 App Overview

**Reverse Snake** flips the traditional snake game on its head. Instead of controlling the snake, you control the fruit and must avoid being eaten. Progress through 30 challenging levels in Story Mode or compete for high scores in Survival Mode.

### Key Features

- **📖 Story Mode**: Progress through 30 unique levels with increasing difficulty
- **⏱️ Survival Mode**: Compete for the highest survival time on unlocked levels
- **🎯 Projectile System**: Later levels feature a snake that shoots projectiles!
- **⭐ Power Food System**: Collect power food to weaken the snake (after 30s)
- **🏆 Dual Leaderboards**: Story progression rankings + Survival high scores per level
- **📱 Cross-Platform**: Works seamlessly on both mobile (touch) and desktop (mouse)

## 📖 How to Play

### Controls
- **Mobile**: Touch and drag anywhere on the game board to move the fruit
- **Desktop**: Move your mouse cursor to control the fruit's position

### Objective
Survive without touching the snake or getting hit by projectiles!

## 🎮 Game Modes

### 📖 Story Mode
- **30 unique levels** with different challenges
- **3 tries per day** - use them wisely!
- Beat a level to **permanently unlock** the next one
- Survive for the required time (1 minute or 3 minutes) to complete each level

### ⏱️ Survival Mode
- Play any **unlocked level** (from Story Mode progress)
- **Unlimited attempts** - compete for high scores
- Scores **automatically submitted** to the level leaderboard
- Track your **personal best** for each level

## ⭐ Power Food System

Power food (golden stars) spawn periodically in most levels:

### When Snake Eats Power Food:
- Snake gains +1 to +3 size (depends on level)
- Snake gains +1 to +3 speed (depends on level)

### When YOU Eat Power Food (after 30 seconds):
- **Every 2 foods**: Snake loses 1 segment
- **Every 4 foods**: Snake slows down by 2ms

This creates a risk/reward dynamic - go for the food to weaken the snake, or play it safe?

## 🎯 Projectile System

Some levels feature a snake that **shoots projectiles**:
- Snake head glows red when charging
- Projectiles travel in a straight line toward your position
- Getting hit by a projectile = instant game over
- Later levels have faster projectiles or spread patterns!

## 📋 Level Overview

| Level | Name | Time | Special Features |
|-------|------|------|------------------|
| 1 | Classic | 1:00 | Standard gameplay |
| 5 | Sniper | 1:00 | 🎯 Projectiles every 5s |
| 7 | Marathon | 3:00 | Long endurance challenge |
| 15 | Micro | 1:00 | 📦 Tiny 10x10 arena |
| 17 | Ambush | 1:00 | 👻 Snake turns invisible |
| 19 | Barrage | 1:00 | 🎯 3 projectiles at once |
| 24 | Zen | 1:00 | Arena shrinks over time |
| 30 | Ultimate | 3:00 | Everything combined! |

## 🏆 Leaderboards

### Story Progress Leaderboard
See which players have progressed the furthest in Story Mode.

### Survival Leaderboards
Each level has its own leaderboard for survival high scores. Compete with others on your favorite levels!

## 📝 Changelog

### Version 1.0.0 (Major Update)
- Complete game redesign with Story Mode and Survival Mode
- Added 30 unique levels with different challenges
- Implemented projectile system for snake
- Player can now consume power food (after 30s) to weaken snake
- Two leaderboard types: Story Progress + Survival per-level
- 3 daily tries for Story Mode
- Auto-submit scores (no manual submission needed)
- Special modifiers: invisible snake, shrinking arena, chaos mode, titan snake
- Removed Easy/Medium/Hard difficulty (replaced with level system)

### Version 0.0.6
- Fixed canvas rendering issues
- Improved mobile responsiveness

### Version 0.0.5
- Added three difficulty modes
- Introduced Power Food system

### Version 0.0.1
- Initial release

## 🛠️ Technical Details

- Built with **Reddit Devvit** platform
- Frontend: React 19, Tailwind CSS 4
- Backend: Devvit serverless environment with Redis storage
- Communication: tRPC for type-safe API calls

## 📄 License

BSD-3-Clause License
