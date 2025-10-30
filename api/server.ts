/**
 * local server entry file, for local development
 */
import express from 'express';
import { createServer } from 'http';
import app from './app';
import { initializeWebSocket } from './websocket/socketServer.js';

const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize WebSocket server
const socketServer = initializeWebSocket(server);

server.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
  console.log(`WebSocket server initialized`);
});

/**
 * close server
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;


