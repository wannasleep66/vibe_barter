// scripts/migrate.js
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { logger } = require('../src/logger/logger');

async function runMigrations(direction = 'up') {
  try {
    // Connect to database
    await mongoose.connect(process.env.DB_URL || 'mongodb://localhost:27017/barter-vibe');
    const db = mongoose.connection.db;
    
    // Get all migration files
    const migrationDir = path.join(__dirname, '../migrations');
    
    // Create migrations directory if it doesn't exist
    if (!fs.existsSync(migrationDir)) {
      fs.mkdirSync(migrationDir, { recursive: true });
      logger.info('Created migrations directory');
    }
    
    const migrationFiles = fs.readdirSync(migrationDir)
      .filter(file => file.endsWith('.js'))
      .sort();
    
    logger.info(`Found ${migrationFiles.length} migration files`);
    
    for (const file of migrationFiles) {
      logger.info(`Running migration: ${file}`);
      const migration = require(path.join(migrationDir, file));
      
      if (direction === 'up') {
        await migration.up(db, mongoose.connection.getClient());
        logger.info(`Completed migration up: ${file}`);
      } else {
        await migration.down(db, mongoose.connection.getClient());
        logger.info(`Completed migration down: ${file}`);
      }
    }
    
    logger.info('All migrations completed!');
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Execute based on command line argument
const direction = process.argv[2] || 'up';
runMigrations(direction);