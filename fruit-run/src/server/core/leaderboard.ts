import { redis, reddit } from '@devvit/web/server';

const LEADERBOARD_KEY = 'reverse-snake:leaderboard';
const PERSONAL_BEST_PREFIX = 'reverse-snake:pb:';

export type LeaderboardEntry = {
  username: string;
  score: number;
  snakeLength: number;
  timestamp: number;
};

export const submitScore = async (
  score: number,
  snakeLength: number
): Promise<{ rank: number; isPersonalBest: boolean; globalBest: number }> => {
  const username = await reddit.getCurrentUsername();
  if (!username) throw new Error('User not authenticated');

  const personalBestKey = `${PERSONAL_BEST_PREFIX}${username}`;
  const currentPersonalBest = Number((await redis.get(personalBestKey)) ?? 0);
  const isPersonalBest = score > currentPersonalBest;

  if (isPersonalBest) {
    await redis.set(personalBestKey, score.toString());
    
    // Store entry data as JSON
    const entry: LeaderboardEntry = {
      username,
      score,
      snakeLength,
      timestamp: Date.now(),
    };
    await redis.hSet(`${LEADERBOARD_KEY}:data`, {
      [username]: JSON.stringify(entry),
    });
    
    // Update sorted set for ranking
    await redis.zAdd(LEADERBOARD_KEY, { member: username, score });
  }

  // Get rank (0-indexed from zRank, so add 1)
  const rankResult = await redis.zRank(LEADERBOARD_KEY, username);
  const totalMembers = await redis.zCard(LEADERBOARD_KEY);
  // zRank returns rank from lowest to highest, we want highest first
  const rank = rankResult !== undefined ? totalMembers - rankResult : -1;

  // Get global best
  const topScores = await redis.zRange(LEADERBOARD_KEY, -1, -1);
  const topMember = topScores.length > 0 ? topScores[0] : null;
  const globalBest = topMember 
    ? (await redis.zScore(LEADERBOARD_KEY, topMember.member)) ?? 0
    : 0;

  return { rank, isPersonalBest, globalBest };
};

export const getLeaderboard = async (
  limit: number = 10
): Promise<LeaderboardEntry[]> => {
  // Get top scores (highest first)
  const topMembers = await redis.zRange(LEADERBOARD_KEY, -limit, -1);
  
  if (topMembers.length === 0) return [];

  const entries: LeaderboardEntry[] = [];
  
  for (const member of topMembers.reverse()) {
    const dataStr = await redis.hGet(`${LEADERBOARD_KEY}:data`, member.member);
    if (dataStr) {
      entries.push(JSON.parse(dataStr));
    }
  }

  return entries;
};

export const getPersonalBest = async (): Promise<number> => {
  const username = await reddit.getCurrentUsername();
  if (!username) return 0;
  
  const personalBestKey = `${PERSONAL_BEST_PREFIX}${username}`;
  return Number((await redis.get(personalBestKey)) ?? 0);
};
