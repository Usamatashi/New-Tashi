import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function seed() {
  const phone = "03055198651";
  const password = "admin123";

  const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone));
  if (existing.length > 0) {
    console.log("Admin user already exists:", phone);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(usersTable).values({
    phone,
    passwordHash,
    role: "admin",
    points: 0,
  });
  console.log("Admin user created:");
  console.log("  Phone:", phone);
  console.log("  Password:", password);
  process.exit(0);
}

seed().catch(console.error);
