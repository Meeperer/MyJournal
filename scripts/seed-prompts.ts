/**
 * Seed default prompts for the daily prompt feature.
 * Run: npx tsx scripts/seed-prompts.ts
 * Requires DATABASE_URL in env.
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const DEFAULT_PROMPTS = [
  "What are you grateful for today?",
  "What went well today?",
  "What did you learn today?",
  "What would you do differently?",
  "Who or what made you smile today?",
];

async function main() {
  const existing = await prisma.prompt.count();
  if (existing > 0) {
    console.log("Prompts already exist, skipping seed.");
    return;
  }
  for (const text of DEFAULT_PROMPTS) {
    await prisma.prompt.create({ data: { text } });
  }
  console.log(`Seeded ${DEFAULT_PROMPTS.length} prompts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
