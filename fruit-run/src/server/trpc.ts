import { initTRPC } from '@trpc/server';
import { transformer } from '../transformer';
import { Context } from './context';
import { context, reddit } from '@devvit/web/server';
import { submitScore, getLeaderboard, getPersonalBest } from './core/leaderboard';
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
  init: t.router({
    get: publicProcedure.query(async () => {
      const [username, personalBest, leaderboard] = await Promise.all([
        reddit.getCurrentUsername(),
        getPersonalBest(),
        getLeaderboard(10),
      ]);

      return {
        postId: context.postId,
        username,
        personalBest,
        leaderboard,
      };
    }),
  }),
  leaderboard: t.router({
    submit: publicProcedure
      .input(z.object({
        score: z.number(),
        snakeLength: z.number(),
      }))
      .mutation(async ({ input }) => {
        const result = await submitScore(input.score, input.snakeLength);
        return result;
      }),
    get: publicProcedure
      .input(z.number().optional().default(10))
      .query(async ({ input }) => {
        return await getLeaderboard(input);
      }),
    personalBest: publicProcedure.query(async () => {
      return await getPersonalBest();
    }),
  }),
});

export type AppRouter = typeof appRouter;
