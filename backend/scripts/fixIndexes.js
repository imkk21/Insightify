/**
 * Run ONCE to drop all bad legacy unique indexes.
 * Usage:  node scripts/fixIndexes.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const COLLECTIONS = ['githubstats', 'insights', 'weather', 'news', 'users'];

async function dropBadIndexes(db, collName) {
  let indexes;
  try {
    indexes = await db.collection(collName).indexes();
  } catch {
    console.log(`  ⚠  Collection "${collName}" doesn't exist yet — skipping`);
    return;
  }

  for (const idx of indexes) {
    if (idx.name === '_id_') continue; // never touch _id
    if (idx.unique) {
      try {
        await db.collection(collName).dropIndex(idx.name);
        console.log(`  ✅ Dropped unique index: ${collName}.${idx.name}`);
      } catch (e) {
        console.log(`  ⚠  Could not drop ${collName}.${idx.name}: ${e.message}`);
      }
    }
  }
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');
  const db = mongoose.connection.db;

  for (const col of COLLECTIONS) {
    console.log(`Checking: ${col}`);
    await dropBadIndexes(db, col);
  }

  console.log('\n✅ Done! Restart your backend server now.');
  await mongoose.disconnect();
}

main().catch(console.error);
