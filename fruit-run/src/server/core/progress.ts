import { redis, reddit } from '@devvit/web/server';

const STORY_LEVEL_KEY = 'story:level:';
const TRIES_KEY = 'story:tries:';
const LAST_RESET_KEY = 'story:lastReset:';
const STORY_LEADERBOARD_KEY = 'leaderboard:story:progress';
const STORY_DATA_KEY = 'leaderboard:story:data';
const NOTIFY_PLAYERS_KEY = 'notify:lives_restocked';

const MAX_TRIES_PER_DAY = 3;
const TOTAL_LEVELS = 30;

// Set to true for testing: infinite lives (server always reports 3, never decrements)
const INFINITE_LIVES_FOR_TESTING = true;

// Get today's date string in UTC
const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0]!;
};

// Get user's current story progress
export const getStoryProgress = async (): Promise<{
  currentLevel: number;
  triesRemaining: number;
  isCompleted: boolean;
}> => {
  const username = await reddit.getCurrentUsername();
  if (!username) throw new Error('User not authenticated');

  // Check if tries need to be reset
  const lastReset = await redis.get(`${LAST_RESET_KEY}${username}`);
  const today = getTodayString();
  
  let triesRemaining = 3;
  if (lastReset !== today) {
    // Reset tries for new day
    await redis.set(`${TRIES_KEY}${username}`, MAX_TRIES_PER_DAY.toString());
    await redis.set(`${LAST_RESET_KEY}${username}`, today);
  } else {
    const tries = await redis.get(`${TRIES_KEY}${username}`);
    triesRemaining = tries ? parseInt(tries, 10) : MAX_TRIES_PER_DAY;
  }

  const levelStr = await redis.get(`${STORY_LEVEL_KEY}${username}`);
  const currentLevel = levelStr ? parseInt(levelStr, 10) : 1;

  if (INFINITE_LIVES_FOR_TESTING) {
    triesRemaining = MAX_TRIES_PER_DAY;
  }
  
  return {
    currentLevel,
    triesRemaining,
    isCompleted: currentLevel > TOTAL_LEVELS,
  };
};

// Check if user can play (has tries remaining)
export const canPlay = async (): Promise<{ canPlay: boolean; triesRemaining: number }> => {
  const username = await reddit.getCurrentUsername();
  if (!username) throw new Error('User not authenticated');

  // Ensure tries are reset for today
  const lastReset = await redis.get(`${LAST_RESET_KEY}${username}`);
  const today = getTodayString();
  
  if (lastReset !== today) {
    await redis.set(`${TRIES_KEY}${username}`, MAX_TRIES_PER_DAY.toString());
    await redis.set(`${LAST_RESET_KEY}${username}`, today);
    return { canPlay: true, triesRemaining: MAX_TRIES_PER_DAY };
  }

  const triesStr = await redis.get(`${TRIES_KEY}${username}`);
  const tries = triesStr ? parseInt(triesStr, 10) : MAX_TRIES_PER_DAY;

  if (INFINITE_LIVES_FOR_TESTING) {
    return { canPlay: true, triesRemaining: MAX_TRIES_PER_DAY };
  }
  return { canPlay: tries > 0, triesRemaining: tries };
};

// Use a try when player starts a game
export const useTry = async (): Promise<{ triesRemaining: number; success: boolean }> => {
  const username = await reddit.getCurrentUsername();
  if (!username) throw new Error('User not authenticated');

  // Ensure tries are reset for today
  const lastReset = await redis.get(`${LAST_RESET_KEY}${username}`);
  const today = getTodayString();
  
  if (lastReset !== today) {
    await redis.set(`${TRIES_KEY}${username}`, MAX_TRIES_PER_DAY.toString());
    await redis.set(`${LAST_RESET_KEY}${username}`, today);
  }

  if (INFINITE_LIVES_FOR_TESTING) {
    return { triesRemaining: MAX_TRIES_PER_DAY, success: true };
  }

  const triesStr = await redis.get(`${TRIES_KEY}${username}`);
  const tries = triesStr ? parseInt(triesStr, 10) : MAX_TRIES_PER_DAY;

  if (tries <= 0) {
    return { triesRemaining: 0, success: false };
  }

  const newTries = tries - 1;
  await redis.set(`${TRIES_KEY}${username}`, newTries.toString());

  // If player used their last life, add them to notification list
  if (newTries === 0) {
    await redis.sAdd(NOTIFY_PLAYERS_KEY, username);
  }

  return { triesRemaining: newTries, success: true };
};

// Single call to check + consume a life (reduces round-trips when starting a game)
export const startStoryGame = async (): Promise<{
  canPlay: boolean;
  triesRemaining: number;
}> => {
  const can = await canPlay();
  if (!can.canPlay) return { canPlay: false, triesRemaining: 0 };
  const used = await useTry();
  return { canPlay: used.success, triesRemaining: used.triesRemaining };
};

// Get players who need to be notified about lives restocking
export const getPlayersToNotify = async (): Promise<string[]> => {
  const members = await redis.sMembers(NOTIFY_PLAYERS_KEY);
  return members;
};

// Clear the notification list after sending notifications
export const clearNotificationList = async (): Promise<void> => {
  await redis.del(NOTIFY_PLAYERS_KEY);
};

// Remove a single player from the notification list
export const removeFromNotificationList = async (username: string): Promise<void> => {
  await redis.sRem(NOTIFY_PLAYERS_KEY, [username]);
};

// Complete a level (advance to next) - does NOT consume a try
export const completeLevel = async (level: number): Promise<{
  newLevel: number;
  isCompleted: boolean;
}> => {
  const username = await reddit.getCurrentUsername();
  if (!username) throw new Error('User not authenticated');

  const currentLevelStr = await redis.get(`${STORY_LEVEL_KEY}${username}`);
  const currentLevel = currentLevelStr ? parseInt(currentLevelStr, 10) : 1;

  // Only advance if completing current level
  if (level !== currentLevel) {
    return { newLevel: currentLevel, isCompleted: currentLevel > TOTAL_LEVELS };
  }

  const newLevel = currentLevel + 1;
  await redis.set(`${STORY_LEVEL_KEY}${username}`, newLevel.toString());

  // Update story progression leaderboard
  await redis.zAdd(STORY_LEADERBOARD_KEY, { member: username, score: newLevel });
  await redis.hSet(STORY_DATA_KEY, {
    [username]: JSON.stringify({
      username,
      level: newLevel,
      completedAt: Date.now(),
    }),
  });

  return {
    newLevel,
    isCompleted: newLevel > TOTAL_LEVELS,
  };
};

// Get story progression leaderboard
export type StoryLeaderboardEntry = {
  username: string;
  level: number;
  completedAt: number;
};

export const getStoryLeaderboard = async (limit: number = 10): Promise<StoryLeaderboardEntry[]> => {
  const topMembers = await redis.zRange(STORY_LEADERBOARD_KEY, -limit, -1);
  
  if (topMembers.length === 0) return [];

  const entries: StoryLeaderboardEntry[] = [];
  
  for (const member of topMembers.reverse()) {
    const dataStr = await redis.hGet(STORY_DATA_KEY, member.member);
    if (dataStr) {
      entries.push(JSON.parse(dataStr));
    }
  }

  return entries;
};

// Get user's rank in story progression
export const getStoryRank = async (): Promise<number> => {
  const username = await reddit.getCurrentUsername();
  if (!username) return -1;

  const rankResult = await redis.zRank(STORY_LEADERBOARD_KEY, username);
  const totalMembers = await redis.zCard(STORY_LEADERBOARD_KEY);
  
  return rankResult !== undefined ? totalMembers - rankResult : -1;
};
