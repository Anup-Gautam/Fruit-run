# 🍎 Reverse Snake

A unique twist on the classic Snake game where **you are the fruit**! Survive as long as possible while an AI-controlled snake hunts you down.

## 🎮 App Overview

**Reverse Snake** flips the traditional snake game on its head. Instead of controlling the snake, you control the fruit and must avoid being eaten. The snake grows longer and faster over time, making survival increasingly challenging.

### Key Features

- **Three Difficulty Modes**: Easy, Medium, and Hard with different progression speeds
- **Power Food System**: In Medium and Hard modes, power food spawns that makes the snake stronger
- **Smart Snake AI**: The snake uses pathfinding to hunt you down
- **Cross-Platform**: Works seamlessly on both mobile (touch) and desktop (mouse)
- **Global Leaderboard**: Compete with other players for the longest survival time
- **Personal Best Tracking**: Track your own high scores

## 📖 How to Play

### Controls
- **Mobile**: Touch and drag anywhere on the game board to move the fruit
- **Desktop**: Move your mouse cursor to control the fruit's position

### Objective
Survive as long as possible without touching any part of the snake (head, body, or tail).

### Game Modes

| Mode | Description |
|------|-------------|
| 🌱 **Easy** | Slower snake growth and speed increase. No power food. Great for beginners. |
| ⭐ **Medium** | Moderate difficulty with power food that boosts snake by +1 speed and +1 size when eaten. |
| 🔥 **Hard** | Fast progression. Snake **prioritizes hunting power food first** before chasing you. Power food gives +2 speed and +2 size. |

### Power Food (Medium & Hard modes)
- Appears as a glowing golden star ⭐
- Spawns every 8 seconds
- Disappears after 6 seconds if not eaten by the snake
- In **Hard mode only**: The snake will go for power food before chasing you

### Scoring
- Your score is based on **survival time**
- Submit your score to the global leaderboard after each game
- Try to beat your personal best!

## 📝 Changelog

### Version 0.0.6 (Latest)
- Fixed canvas rendering issues
- Improved mobile responsiveness
- Fixed initialization bugs when switching game states

### Version 0.0.5
- Added three difficulty modes: Easy, Medium, Hard
- Introduced Power Food system
- Snake prioritizes power food in Hard mode
- Added difficulty selection menu
- Added power food indicator in HUD

### Version 0.0.4
- Snake can now pass through itself (prevents self-trapping)
- Increased speed scaling to 5ms per 2 seconds

### Version 0.0.3
- Fixed snake pathfinding bug when fruit is between grid cells
- Changed to Euclidean distance for smoother tracking
- Added direction shuffling to prevent oscillation
- Updated difficulty scaling

### Version 0.0.2
- Improved snake AI pathfinding
- Added collision detection for entire snake body

### Version 0.0.1
- Initial release
- Basic gameplay with snake AI
- Leaderboard system
- Touch and mouse controls

## 🛠️ Technical Details

- Built with **Reddit Devvit** platform
- Frontend: React 19, Tailwind CSS 4
- Backend: Devvit serverless environment with Redis storage
- Communication: tRPC for type-safe API calls

## 📄 License

BSD-3-Clause License
