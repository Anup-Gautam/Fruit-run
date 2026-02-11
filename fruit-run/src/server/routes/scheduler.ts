import { reddit } from '@devvit/web/server';
import { Hono } from 'hono';
import type { ScheduledJobRequest, TriggerResponse } from '@devvit/web/shared';

import { getPlayersToNotify, clearNotificationList, removeFromNotificationList } from '../core/progress';

export const scheduler = new Hono();

// Daily job to notify players that their lives have been restocked
scheduler.post('/notify-lives-restocked', async (c) => {
  try {
    const input = await c.req.json<ScheduledJobRequest>();
    console.log(`Running scheduled job: ${input.name}`);

    // Get all players who need to be notified
    const playersToNotify = await getPlayersToNotify();
    
    if (playersToNotify.length === 0) {
      return c.json<TriggerResponse>(
        {
          status: 'success',
          message: 'No players to notify',
        },
        200
      );
    }

    console.log(`Notifying ${playersToNotify.length} players about lives restock`);

    let successCount = 0;
    let failCount = 0;

    // Send notification to each player
    for (const username of playersToNotify) {
      try {
        await reddit.sendPrivateMessage({
          to: username,
          subject: '🍎 Reverse Snake - Your Lives Are Back!',
          text: `Hey ${username}!\n\nYour 3 daily lives have been restored in **Reverse Snake**! 🎮\n\nCome back and continue your adventure through the 30 levels. Can you survive the snake today?\n\n🐍 Good luck!\n\n---\n*This is an automated message from Reverse Snake. You received this because you played yesterday and used all your lives.*`,
        });
        
        // Remove player from list after successful notification
        await removeFromNotificationList(username);
        successCount++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`Failed to notify ${username}:`, err);
        failCount++;
      }
    }

    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `Notified ${successCount} players, ${failCount} failed`,
      },
      200
    );
  } catch (error) {
    console.error(`Error in notify-lives-restocked job:`, error);
    return c.json<TriggerResponse>(
      {
        status: 'error',
        message: 'Failed to run notification job',
      },
      400
    );
  }
});
