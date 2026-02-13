import { initTRPC } from '@trpc/server';
import { transformer } from '../transformer';
import { Context } from './context';
import { context, reddit } from '@devvit/web/server';
import { 
  getStoryProgress, 
  canPlay,
  useTry, 
  startStoryGame,
  completeLevel, 
  getStoryLeaderboard,
  getStoryRank 
} from './core/progress';
import { 
  submitSurvivalScore, 
  getSurvivalLeaderboard, 
  getPersonalBest,
  getAllPersonalBests,
  getSurvivalRank 
} from './core/survival';
import { z } from 'zod';

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<Context>().create({
  transformer,
});

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = t.router({
  // Initialize - get all data needed for main menu
  init: t.router({
    get: publicProcedure.query(async () => {
      const [username, storyProgress, storyLeaderboard] = await Promise.all([
        reddit.getCurrentUsername(),
        getStoryProgress(),
        getStoryLeaderboard(10),
      ]);

      // Get personal bests for unlocked levels
      const personalBests = await getAllPersonalBests(storyProgress.currentLevel);

      return {
        postId: context.postId,
        username,
        storyProgress,
        storyLeaderboard,
        personalBests,
      };
    }),
  }),

  // Story Mode progress
  story: t.router({
    getProgress: publicProcedure.query(async () => {
      return await getStoryProgress();
    }),
    canPlay: publicProcedure.query(async () => {
      return await canPlay();
    }),
    useTry: publicProcedure.mutation(async () => {
      return await useTry();
    }),
    startStoryGame: publicProcedure.mutation(async () => {
      return await startStoryGame();
    }),
    completeLevel: publicProcedure
      .input(z.object({ level: z.number() }))
      .mutation(async ({ input }) => {
        return await completeLevel(input.level);
      }),
    getLeaderboard: publicProcedure
      .input(z.number().optional().default(10))
      .query(async ({ input }) => {
        return await getStoryLeaderboard(input);
      }),
    getRank: publicProcedure.query(async () => {
      return await getStoryRank();
    }),
  }),

  // Survival Mode scores
  survival: t.router({
    submitScore: publicProcedure
      .input(z.object({
        level: z.number(),
        score: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await submitSurvivalScore(input.level, input.score);
      }),
    getLeaderboard: publicProcedure
      .input(z.object({
        level: z.number(),
        limit: z.number().optional().default(10),
      }))
      .query(async ({ input }) => {
        return await getSurvivalLeaderboard(input.level, input.limit);
      }),
    getPersonalBest: publicProcedure
      .input(z.object({ level: z.number() }))
      .query(async ({ input }) => {
        return await getPersonalBest(input.level);
      }),
    getAllPersonalBests: publicProcedure
      .input(z.object({ maxLevel: z.number() }))
      .query(async ({ input }) => {
        return await getAllPersonalBests(input.maxLevel);
      }),
    getRank: publicProcedure
      .input(z.object({ level: z.number() }))
      .query(async ({ input }) => {
        return await getSurvivalRank(input.level);
      }),
  }),
});

export type AppRouter = typeof appRouter;
