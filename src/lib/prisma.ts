import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var prisma: PrismaClient | undefined;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Prisma 7 "client" engine requires either adapter or accelerateUrl.
// Use accelerateUrl for Prisma Postgres / Accelerate (prisma+postgres://),
// otherwise use the pg adapter for standard postgresql:// URLs.
const useAccelerate =
  connectionString.startsWith("prisma+postgres") ||
  connectionString.startsWith("prisma+mysql") ||
  !!process.env.ACCELERATE_URL;

const clientOptions: ConstructorParameters<typeof PrismaClient>[0] = useAccelerate
  ? { accelerateUrl: process.env.ACCELERATE_URL ?? connectionString, log: ["error", "warn"] }
  : {
      adapter: new PrismaPg({ connectionString }),
      log: ["error", "warn"],
    };

export const prisma =
  global.prisma ?? new PrismaClient(clientOptions);

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

