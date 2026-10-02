import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { noteRoutes } from './routes/notes.js';
import { attachmentRoutes } from './routes/attachments.js';
import { tagRoutes } from './routes/tags.js';
import { healthRoutes } from './routes/health.js';
import path from 'path';
import fs from 'fs';

export async function buildApp(): Promise<FastifyInstance> {
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';

  const app = Fastify({
    logger: isTest ? false : true,
  });

  // Register CORS
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Register Multipart for File Uploads
  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB max file size
    },
  });

  // Register Swagger / OpenAPI Docs
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Notes Web App API',
        description: 'REST API for Notes Web App with MySQL & S3 Storage',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${process.env.PORT || 9548}`,
          description: 'Local Server',
        },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  // Register API Routes
  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(noteRoutes, { prefix: '/api' });
  await app.register(attachmentRoutes, { prefix: '/api' });
  await app.register(tagRoutes, { prefix: '/api' });

  // In production, check if frontend/dist exists to serve the SPA
  const frontendDistPath = path.resolve(process.cwd(), '../frontend/dist');
  const localFrontendDistPath = path.resolve(process.cwd(), 'frontend/dist');
  const distPath = fs.existsSync(frontendDistPath)
    ? frontendDistPath
    : fs.existsSync(localFrontendDistPath)
    ? localFrontendDistPath
    : null;

  if (distPath) {
    await app.register(fastifyStatic, {
      root: distPath,
      prefix: '/',
    });

    // SPA fallback: any non-API route serves index.html
    app.setNotFoundHandler((req, reply) => {
      if (req.raw.url && req.raw.url.startsWith('/api')) {
        return reply.status(404).send({ error: 'API route not found' });
      }
      return reply.sendFile('index.html');
    });
  } else {
    // Development Root Route
    app.get('/', async (req, reply) => {
      return {
        name: 'Notes Web App API',
        status: 'online',
        mode: isProduction ? 'production' : 'development',
        docs: '/docs',
        health: '/api/health',
      };
    });
  }

  return app;
}
