#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Clean up duplicate files with " 2" suffixes
 */
function cleanupDuplicates(dir = '.') {
  console.log('🧹 Cleaning up duplicate files...');
  
  let deletedCount = 0;
  
  function walkDir(currentPath) {
    try {
      const items = fs.readdirSync(currentPath);
      
      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip node_modules to avoid breaking dependencies
          if (item === 'node_modules') continue;
          
          // Check if this is a duplicate directory
          if (item.includes(' 2')) {
            console.log(`🗑️  Removing duplicate directory: ${fullPath}`);
            fs.rmSync(fullPath, { recursive: true, force: true });
            deletedCount++;
          } else {
            walkDir(fullPath);
          }
        } else if (stat.isFile()) {
          // Check if this is a duplicate file
          if (item.includes(' 2')) {
            console.log(`🗑️  Removing duplicate file: ${fullPath}`);
            fs.unlinkSync(fullPath);
            deletedCount++;
          }
        }
      }
    } catch (error) {
      console.error(`Error processing ${currentPath}:`, error.message);
    }
  }
  
  walkDir(dir);
  
  if (deletedCount === 0) {
    console.log('✅ No duplicate files found!');
  } else {
    console.log(`✅ Cleaned up ${deletedCount} duplicate files/directories`);
  }
}

// Run cleanup
cleanupDuplicates(); 