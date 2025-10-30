import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';

const execAsync = promisify(exec);
const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Export SQLite data to JSON
router.post('/export', async (req, res) => {
  try {
    const scriptPath = join(__dirname, '../../scripts/sqlite-sync.js');
    const { stdout, stderr } = await execAsync(`node ${scriptPath} export`);
    
    if (stderr) {
      console.error('Export stderr:', stderr);
    }
    
    res.json({
      success: true,
      message: 'Data exported successfully',
      output: stdout
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Export failed',
      error: error.message
    });
  }
});

// Import JSON data to PostgreSQL
router.post('/import', async (req, res) => {
  try {
    const scriptPath = join(__dirname, '../../scripts/sqlite-sync.js');
    const { stdout, stderr } = await execAsync(`node ${scriptPath} import`);
    
    if (stderr) {
      console.error('Import stderr:', stderr);
    }
    
    res.json({
      success: true,
      message: 'Data imported successfully',
      output: stdout
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({
      success: false,
      message: 'Import failed',
      error: error.message
    });
  }
});

// Create backup
router.post('/backup', async (req, res) => {
  try {
    const scriptPath = join(__dirname, '../../scripts/sqlite-sync.js');
    const { stdout, stderr } = await execAsync(`node ${scriptPath} backup`);
    
    if (stderr) {
      console.error('Backup stderr:', stderr);
    }
    
    res.json({
      success: true,
      message: 'Backup created successfully',
      output: stdout
    });
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Backup failed',
      error: error.message
    });
  }
});

// Full synchronization
router.post('/sync', async (req, res) => {
  try {
    const scriptPath = join(__dirname, '../../scripts/sqlite-sync.js');
    const { stdout, stderr } = await execAsync(`node ${scriptPath} sync`);
    
    if (stderr) {
      console.error('Sync stderr:', stderr);
    }
    
    res.json({
      success: true,
      message: 'Synchronization completed successfully',
      output: stdout
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Synchronization failed',
      error: error.message
    });
  }
});

// Get sync status and available backups
router.get('/status', async (req, res) => {
  try {
    const databasePath = join(__dirname, '../../database');
    const sqliteDbPath = join(databasePath, 'ticketing_monitoring.sqlite');
    const exportPath = join(databasePath, 'sqlite-export.json');
    
    const status = {
      sqliteExists: existsSync(sqliteDbPath),
      exportExists: existsSync(exportPath),
      lastExport: null,
      backups: []
    };

    if (status.exportExists) {
      try {
        const exportData = JSON.parse(readFileSync(exportPath, 'utf8'));
        status.lastExport = exportData.timestamp;
      } catch (error) {
        console.error('Error reading export file:', error);
      }
    }

    // List backup files
    try {
      const { readdirSync } = await import('fs');
      const files = readdirSync(databasePath);
      status.backups = files
        .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
        .map(file => ({
          filename: file,
          path: join(databasePath, file)
        }));
    } catch (error) {
      console.error('Error listing backups:', error);
    }

    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sync status',
      error: error.message
    });
  }
});

// Download export file
router.get('/download/export', (req, res) => {
  try {
    const exportPath = join(__dirname, '../../database/sqlite-export.json');
    
    if (!existsSync(exportPath)) {
      return res.status(404).json({
        success: false,
        message: 'Export file not found'
      });
    }

    res.download(exportPath, 'sqlite-export.json');
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      message: 'Download failed',
      error: error.message
    });
  }
});

// Download backup file
router.get('/download/backup/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const backupPath = join(__dirname, '../../database', filename);
    
    if (!existsSync(backupPath) || !filename.startsWith('backup-') || !filename.endsWith('.json')) {
      return res.status(404).json({
        success: false,
        message: 'Backup file not found'
      });
    }

    res.download(backupPath, filename);
  } catch (error) {
    console.error('Download backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Download failed',
      error: error.message
    });
  }
});

export default router;
