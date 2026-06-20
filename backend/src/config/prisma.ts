import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  shareVibePrisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.shareVibePrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.shareVibePrisma = prisma;
}
