require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const connectDB = require('../config/db');
const Subject = require('../models/Subject');

function createSlug(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function seedAcademicTaxonomy() {
  console.log('\n==================================================');
  console.log('STUDYSHARE — ACADEMIC TAXONOMY SEED');
  console.log('==================================================\n');

  const connected = await connectDB();
  if (!connected) {
    console.error('❌ Database connection failed. Aborting taxonomy seed.');
    process.exit(1);
  }

  try {
    const dataFilePath = path.join(__dirname, '../data/canonicalSubjects.json');
    if (!fs.existsSync(dataFilePath)) {
      throw new Error(`Canonical subjects data file not found at ${dataFilePath}`);
    }

    const canonicalSubjects = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    console.log(`Loaded ${canonicalSubjects.length} canonical subjects from data/canonicalSubjects.json`);

    const initialCount = await Subject.countDocuments();
    const initialActive = await Subject.countDocuments({ isActive: true });
    console.log(`Initial database state: ${initialCount} total subjects (${initialActive} active)`);

    const operations = canonicalSubjects.map((sub) => {
      const trimmedName = sub.name.trim();
      const slug = createSlug(trimmedName);
      return {
        updateOne: {
          filter: { slug },
          update: {
            $setOnInsert: {
              name: trimmedName,
              slug,
              code: sub.code || '',
              department: sub.department || 'General / Common Engineering',
              description: sub.description || '',
              isActive: sub.isActive !== false,
            },
          },
          upsert: true,
        },
      };
    });

    const result = await Subject.bulkWrite(operations, { ordered: false });
    const finalCount = await Subject.countDocuments();
    const finalActive = await Subject.countDocuments({ isActive: true });
    const activeBranches = await Subject.distinct('department', { isActive: true });

    console.log('\n--- SEEDING RESULTS ---');
    console.log(`• New subjects inserted (upserted): ${result.upsertedCount}`);
    console.log(`• Existing subjects preserved (matched): ${result.matchedCount}`);
    console.log(`• Final total subjects in DB: ${finalCount}`);
    console.log(`• Final active subjects in DB: ${finalActive}`);
    console.log(`• Final active branches in DB: ${activeBranches.length}`);
    console.log('==================================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error executing academic taxonomy seed:', err);
    await mongoose.connection.close();
    process.exit(1);
  }
}

if (require.main === module) {
  seedAcademicTaxonomy();
}

module.exports = seedAcademicTaxonomy;
