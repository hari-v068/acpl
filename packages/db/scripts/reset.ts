import { execSync } from 'child_process';
import { db } from '../src/db';
import {
  agents,
  chats,
  inventoryItems,
  items,
  jobItems,
  jobs,
  messages,
  providers,
  wallets,
} from '../src/schema';
import { sql } from 'drizzle-orm';

async function resetSupabaseDatabase(mode: 'soft' | 'hard' = 'soft') {
  try {
    console.log(
      `[reset-supabase] - RESETTING DATABASE (${mode.toUpperCase()} RESET)`,
    );

    await db.transaction(async (tx) => {
      await tx.delete(messages);
      await tx.delete(chats);
      await tx.delete(jobItems);
      await tx.delete(jobs);
      await tx.delete(providers);
      await tx.delete(inventoryItems);
      await tx.delete(items);
      await tx.delete(wallets);
      await tx.delete(agents);

      if (mode === 'hard') {
        await tx.execute(sql`DROP TABLE IF EXISTS messages CASCADE;`);
        await tx.execute(sql`DROP TABLE IF EXISTS chats CASCADE;`);
        await tx.execute(sql`DROP TABLE IF EXISTS job_items CASCADE;`);
        await tx.execute(sql`DROP TABLE IF EXISTS jobs CASCADE;`);
        await tx.execute(sql`DROP TABLE IF EXISTS providers CASCADE;`);
        await tx.execute(sql`DROP TABLE IF EXISTS inventory_items CASCADE;`);
        await tx.execute(sql`DROP TABLE IF EXISTS items CASCADE;`);
        await tx.execute(sql`DROP TABLE IF EXISTS wallets CASCADE;`);
        await tx.execute(sql`DROP TABLE IF EXISTS agents CASCADE;`);

        await tx.execute(sql`DROP TYPE IF EXISTS job_phase CASCADE;`);
      }
    });

    console.log(
      `[reset-supabase] - DATABASE ${mode.toUpperCase()} RESET COMPLETE`,
    );
  } catch (error) {
    console.error('[reset-supabase] - ERROR:', error);
    throw error;
  }
}

async function resetFirebaseDatabase() {
  try {
    console.log('[reset-firebase] - RESETTING FIREBASE DATABASE');
    execSync('firebase database:remove / --project acp-lite-dev --force', {
      stdio: 'inherit',
    });
    console.log('[reset-firebase] - DATABASE RESET COMPLETE');
  } catch (error) {
    console.error('[reset-firebase] - ERROR:', error);
    throw error;
  }
}

async function resetDatabases(mode: 'soft' | 'hard' = 'soft') {
  try {
    console.log('-- RESETTING DATABASES --');
    await Promise.all([resetSupabaseDatabase(mode), resetFirebaseDatabase()]);
    console.log('-- RESET COMPLETE --');
  } catch (error) {
    console.error('Failed to reset databases:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const mode: 'soft' | 'hard' = args.includes('--hard') ? 'hard' : 'soft';
  resetDatabases(mode)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
