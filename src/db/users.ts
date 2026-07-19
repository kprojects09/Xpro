import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, fullName?: string, username?: string, avatarUrl?: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
        fullName,
        username,
        avatarUrl,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          fullName: fullName ?? undefined,
          username: username ?? undefined,
          avatarUrl: avatarUrl ?? undefined,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const result = await db.select().from(users).where(eq(users.uid, uid));
    return result[0] || null;
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}
