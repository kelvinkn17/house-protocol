import './dotenv.ts';

import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import FastifyCors from '@fastify/cors';
import FastifyWebSocket from '@fastify/websocket';
import { APP_PORT } from './src/config/main-config.ts';

// Routes
import { exampletRoute } from './src/routes/exampleRoutes.ts';
import { authRoutes } from './src/routes/authRoutes.ts';
import { vaultRoutes } from './src/routes/vaultRoutes.ts';
import { gameRoutes } from './src/routes/gameRoutes.ts';
import { builderRoutes } from './src/routes/builderRoutes.ts';

// Game handler
import { GameHandler } from './src/handlers/game.handler.ts';

// Workers
import { startErrorLogCleanupWorker } from './src/workers/errorLogCleanup.ts';
import { startVaultIndexer } from './src/workers/vaultIndexer.ts';
import { startSettlementWorker } from './src/workers/settlementWorker.ts';

console.log(
  '======================\n======================\nMY BACKEND SYSTEM STARTED!\n======================\n======================\n'
);

const fastify = Fastify({
  logger: false,
});

// allow empty body on POST/PUT/DELETE requests
fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
  try {
    const str = (body as string).trim();
    done(null, str === '' ? {} : JSON.parse(str));
  } catch (err) {
    done(err as Error, undefined);
  }
});

fastify.register(FastifyWebSocket);

fastify.register(FastifyCors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'token'],
});

// Health check endpoint
fastify.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
  return reply.status(200).send({
    success: true,
    message: 'Hello there!',
    error: null,
    data: null,
  });
});

// Register routes with prefixes
fastify.register(authRoutes, { prefix: '/auth' });
fastify.register(exampletRoute, { prefix: '/example' });
fastify.register(vaultRoutes, { prefix: '/vault' });
fastify.register(gameRoutes, { prefix: '/game' });
fastify.register(builderRoutes, { prefix: '/builder' });

// Register WebSocket game handler (must be a plugin so WS decorator is available)
fastify.register(GameHandler.gameHandlerPlugin);

const start = async (): Promise<void> => {
  try {
    // Start workers
    startErrorLogCleanupWorker();
    startVaultIndexer();
    startSettlementWorker();

    await fastify.listen({
      port: APP_PORT,
      host: '0.0.0.0',
    });

    const address = fastify.server.address();
    const port = typeof address === 'object' && address ? address.port : APP_PORT;

    console.log(`Server started successfully on port ${port}`);
    console.log(`http://localhost:${port}`);
  } catch (error) {
    console.log('Error starting server: ', error);
    process.exit(1);
  }
};

start();
