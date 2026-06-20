import { Queue } from "bullmq";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const connection = new URL(redisUrl);
const redisConnection = {
  host: connection.hostname,
  port: parseInt(connection.port || "6379"),
  password: connection.password || undefined,
};

// Create queue
export const emailQueue = new Queue("email-sending", {
  connection: redisConnection as any,
  defaultJobOptions: {
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
    },
  },
});
