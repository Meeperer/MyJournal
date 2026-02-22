/**
 * Creates a test user (dev-only; do not use in production).
 * Requires database running (e.g. run `npm run db:migrate` then this script).
 *
 * Run: npm run create-test-user
 *
 * Default: test@example.com / password123
 * Override with TEST_USER_EMAIL and TEST_USER_PASSWORD env vars.
 */
import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "../src/lib/prisma";

const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "test@example.com";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "password123";

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: TEST_EMAIL },
  });

  if (existing) {
    console.log(`User already exists: ${TEST_EMAIL}`);
    process.exit(0);
    return;
  }

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  await prisma.user.create({
    data: {
      email: TEST_EMAIL,
      passwordHash,
    },
  });

  console.log("Test user created:");
  console.log("  Email:", TEST_EMAIL);
  console.log("  Password:", TEST_PASSWORD);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
