'use strict';

// ─── YOUR FILE, implement this ───────────────────────────────────────────────
// Create a BullMQ Queue named 'email' with a Redis connection.
// Export { emailQueue, connection } so the worker and routes can use them.
//
// Redis connection: use process.env.REDIS_HOST (default 'localhost')
//                       process.env.REDIS_PORT (default 6379)

// TODO: implement
const { Queue } = require('bullmq');
require('dotenv').config();

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
};

const emailQueue = new Queue('email', { connection });

module.exports = { emailQueue, connection };