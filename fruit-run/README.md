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

## 📋 Complete Level Guide

All 30 levels with their unique challenges. **Speed always increases until cap (30ms)!**

| Lv | Name | Start | Max | Food | Growth | Grid | Time | Speed |
|----|------|-------|-----|------|--------|------|------|-------|
| 1 | 🎮 Classic | 3 | 20 | 3.5s | +1/food | 22×22 | 0:45 | +5/2s |
| 2 | ⚡ Speed Demon | 3 | 20 | 3.5s | +1/food | 22×22 | 0:45 | +5/2s (fast start) |
| 3 | 📦 Tiny Arena | 3 | 14 | 4s | +1/food | 18×18 | 0:50 | +5/2s |
| 4 | 🐢 Accelerator | 3 | 20 | 4s | +1/food | 22×22 | 0:50 | +5/2s (slow start) |
| 5 | 🎯 Sniper | 4 | 20 | 4s | +1/food | 22×22 | 0:55 | +5/2s |
| 6 | ⭐ Power Surge | 4 | 20 | 3s | +2/food | 22×22 | 0:55 | +5/2s + food |
| 7 | 🏃 Marathon | 4 | 20 | 4.5s | +1/food | 22×22 | 2:00 | +5/2s |
| 8 | 😰 Claustrophobia | 4 | 9 | 4.5s | +1/food | 14×14 | 0:55 | +3/3s |
| 9 | 🍔 Glutton | 4 | 18 | 4s | +2/food | 20×20 | 0:55 | +5/2s |
| 10 | 🚀 Hyperspeed | 5 | 18 | 4s | +1/1.5s | 20×20 | 0:50 | +5/2s (fast start) |
| 11 | 🐍 Long Boi | 8 | 18 | 4s | +1/food | 20×20 | 0:55 | +5/2s |
| 12 | 🏜️ Famine | 5 | 18 | 6s | +1/food | 20×20 | 1:00 | +5/2s |
| 13 | 🍕 Feast | 5 | 18 | 3s | +3/food | 20×20 | 0:55 | +5/2s + food |
| 14 | 🏹 Marksman | 6 | 18 | 4s | +1/food | 20×20 | 1:00 | +5/2s |
| 15 | 🔬 Micro | 4 | 8 | 4.5s | +1/food | 12×12 | 0:45 | +3/3s |
| 16 | 🧘 Patience | 6 | 18 | 4s | +1/1.5s | 20×20 | 1:00 | +5/2s |
| 17 | 👻 Ambush | 6 | 18 | 4.5s | +1/food | 20×20 | 1:00 | +5/2s |
| 18 | 🦖 Titan | 6 | 18 | 5s | +1/food | 20×20 | 1:00 | +5/2s |
| 19 | 💥 Barrage | 7 | 18 | 4s | +1/food | 20×20 | 1:05 | +5/2s |
| 20 | 📈 Momentum | 7 | 18 | 4.5s | +1/food | 20×20 | 1:00 | +5/2s |
| 21 | 🎁 Risk/Reward | 6 | 18 | 5.5s | +1/food | 20×20 | 1:10 | +5/2s |
| 22 | 🦈 Predator | 7 | 18 | 5s | +1/food | 20×20 | 1:00 | +5/2s |
| 23 | 🎲 Chaos | 7 | 18 | 4s | +1/food | 20×20 | 1:05 | +5/2s + random |
| 24 | ☯️ Zen | 6 | 20 | 5s | +1/food | 22→14 | 1:15 | +5/2s |
| 25 | 😱 Nightmare | 6 | 8 | 4.5s | +1/food | 12×12 | 0:45 | +3/3s (fast start) |
| 26 | 🔫 Machine Gun | 7 | 18 | 4s | +1/food | 20×20 | 1:00 | +5/2s |
| 27 | 💪 Endurance | 7 | 18 | 6s | +1/food | 20×20 | 2:30 | +5/2s |
| 28 | 🌱 Rapid Growth | 6 | 18 | 4s | +1/1s | 20×20 | 0:55 | +5/2s |
| 29 | ⚔️ Final Form | 8 | 8 | none | none | 20×20 | 0:45 | +5/2s (90ms start) |
| 30 | 👑 Ultimate | 8 | 9 | 4s | +1/1.5s | 14×14 | 2:00 | +3/3s |

### Speed Rules

| Grid Size | Speed Increase | Max Speed |
|-----------|----------------|-----------|
| > 15 (18, 20, 22) | **+5ms every 2 seconds** | 30ms |
| ≤ 15 (12, 14, 15) | +3ms every 3 seconds | 30ms |

### Snake Length Hard Caps by Grid Size

| Grid | Max Length |
|------|------------|
| 22×22 | 20 |
| 20×20 | 18 |
| 18×18 | 14 |
| 15×15 | 10 |
| 14×14 | 9 |
| 12×12 | 8 |
| 10×10 | 6 |

### Column Legend

| Column | Meaning |
|--------|---------|
| **Start** | Initial snake length (segments) |
| **Max** | Hard cap - snake cannot exceed this length |
| **Food** | Power food spawn interval |
| **Growth** | How snake grows: `/food` = per food eaten, `/Xs` = time-based |
| **Speed** | Speed increase rate (+2/3s = 2ms faster every 3 seconds) |

### Special Modifiers

| Level | Modifier | Effect |
|-------|----------|--------|
| 7, 20 | 📈 **Momentum** | Extra aggressive acceleration |
| 17 | 👻 **Invisible** | Snake turns invisible for 0.5s every 3s |
| 18 | 🦖 **Titan** | Snake segments are 2x larger |
| 22 | 🦈 **Perfect AI** | Snake always takes the optimal path |
| 23 | 🎲 **Chaos** | Random speed bursts on top of base increase |
| 24 | ☯️ **Shrinking** | Arena shrinks from 22×22 to 14×14 |

### Projectile Levels

| Level | Name | Projectiles | Interval |
|-------|------|-------------|----------|
| 5 | Sniper | 1 | 5s |
| 14 | Marksman | 1 | 4s |
| 19 | Barrage | 3 (spread) | 4.5s |
| 26 | Machine Gun | 1 | 3s |
| 30 | Ultimate | 2 | 4s |

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
