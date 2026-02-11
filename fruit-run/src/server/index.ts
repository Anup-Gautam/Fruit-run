import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { trpcServer } from '@hono/trpc-server';

import { createServer, getServerPort } from '@devvit/web/server';
import { menu } from './routes/menu';
import { triggers } from './routes/triggers';
import { scheduler } from './routes/scheduler';
import { appRouter } from './trpc';
import { createContext } from './context';

const app = new Hono();

const api = new Hono();
api.use(
  '/trpc/*',
  trpcServer({
    endpoint: '/api/trpc',
    router: appRouter,
    createContext,
  })
);

const internal = new Hono();
internal.route('/menu', menu);
internal.route('/triggers', triggers);
internal.route('/scheduler', scheduler);

app.route('/api', api);
app.route('/internal', internal);

serve({
  fetch: app.fetch,
  createServer: createServer,
  port: getServerPort(),
});
