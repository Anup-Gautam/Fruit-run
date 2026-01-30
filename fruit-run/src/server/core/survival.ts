import { redis, reddit } from '@devvit/web/server';

const SURVIVAL_LEADERBOARD_PREFIX = 'leaderboard:survival:';
const SURVIVAL_DATA_PREFIX = 'leaderboard:survival:data:';
const USER_BEST_PREFIX = 'user:survival:';

export type SurvivalLeaderboardEntry = {
  username: string;
  score: number;
  timestamp: number;
};

// Submit a survival score for a specific level
export const submitSurvivalScore = async (
  level: number,
  score: number
): Promise<{
  isPersonalBest: boolean;
  rank: number;
  personalBest: number;
}> => {
  const username = await reddit.getCurrentUsername();
  if (!username) throw new Error('User not authenticated');

  const leaderboardKey = `${SURVIVAL_LEADERBOARD_PREFIX}${level}`;
  const dataKey = `${SURVIVAL_DATA_PREFIX}${level}`;
  const userBestKey = `${USER_BEST_PREFIX}${username}:${level}`;

  // Get current personal best
  const currentBestStr = await redis.get(userBestKey);
  const currentBest = currentBestStr ? parseInt(currentBestStr, 10) : 0;

  const isPersonalBest = score > currentBest;

  if (isPersonalBest) {
    // Update personal best
    await redis.set(userBestKey, score.toString());

    // Update leaderboard
    await redis.zAdd(leaderboardKey, { member: username, score });
    await redis.hSet(dataKey, {
      [username]: JSON.stringify({
        username,
        score,
        timestamp: Date.now(),
      }),
    });
  }

  // Get rank
  const rankResult = await redis.zRank(leaderboardKey, username);
  const totalMembers = await redis.zCard(leaderboardKey);
  const rank = rankResult !== undefined ? totalMembers - rankResult : -1;

  return {
    isPersonalBest,
    rank,
    personalBest: isPersonalBest ? score : currentBest,
  };
};

// Get survival leaderboard for a specific level
export const getSurvivalLeaderboard = async (
  level: number,
  limit: number = 10
): Promise<SurvivalLeaderboardEntry[]> => {
  const leaderboardKey = `${SURVIVAL_LEADERBOARD_PREFIX}${level}`;
  const dataKey = `${SURVIVAL_DATA_PREFIX}${level}`;

  const topMembers = await redis.zRange(leaderboardKey, -limit, -1);

  if (topMembers.length === 0) return [];

  const entries: SurvivalLeaderboardEntry[] = [];

  for (const member of topMembers.reverse()) {
    const dataStr = await redis.hGet(dataKey, member.member);
    if (dataStr) {
      entries.push(JSON.parse(dataStr));
    }
  }

  return entries;
};

// Get user's personal best for a level
export const getPersonalBest = async (level: number): Promise<number> => {
  const username = await reddit.getCurrentUsername();
  if (!username) return 0;

  const userBestKey = `${USER_BEST_PREFIX}${username}:${level}`;
  const bestStr = await redis.get(userBestKey);
  return bestStr ? parseInt(bestStr, 10) : 0;
};

// Get user's personal bests for all unlocked levels
export const getAllPersonalBests = async (maxLevel: number): Promise<Record<number, number>> => {
  const username = await reddit.getCurrentUsername();
  if (!username) return {};

  const bests: Record<number, number> = {};

  for (let level = 1; level <= maxLevel; level++) {
    const userBestKey = `${USER_BEST_PREFIX}${username}:${level}`;
    const bestStr = await redis.get(userBestKey);
    if (bestStr) {
      bests[level] = parseInt(bestStr, 10);
    }
  }

  return bests;
};

// Get user's rank for a specific level
export const getSurvivalRank = async (level: number): Promise<number> => {
  const username = await reddit.getCurrentUsername();
  if (!username) return -1;

  const leaderboardKey = `${SURVIVAL_LEADERBOARD_PREFIX}${level}`;
  const rankResult = await redis.zRank(leaderboardKey, username);
  const totalMembers = await redis.zCard(leaderboardKey);

  return rankResult !== undefined ? totalMembers - rankResult : -1;
};
