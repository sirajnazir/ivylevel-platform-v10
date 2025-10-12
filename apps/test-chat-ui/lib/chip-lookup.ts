/**
 * Chip Content Lookup Service
 * Loads chip content from source JSON files
 */

import * as fs from 'fs';
import * as path from 'path';

type ChipData = {
  chip_id: string;
  type: string;
  content: string;
  insight_vector?: string;
  [key: string]: any;
};

// Cache for loaded chips
let chipCache = new Map<string, string>();
let allChipsLoaded = false;

/**
 * Load all chips from source files into memory cache
 */
function loadAllChips() {
  if (allChipsLoaded) return;

  // Reset cache for fresh reload
  chipCache = new Map<string, string>();

  // Resolve from project root (apps/test-chat-ui -> root)
  const dataRoot = path.resolve(process.cwd(), '../../data/kb_intel_chips');
  console.log(`[ChipLookup] Data root: ${dataRoot}`);

  // Load Sessions+Exec chips (w001-w052) - includes batch files and patch files
  const chipsDir = path.join(dataRoot, 'chips');
  if (fs.existsSync(chipsDir)) {
    const files = fs.readdirSync(chipsDir).filter(f =>
      f.endsWith('_intel_chips_batch.json') || f.endsWith('.jsonl')
    );
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(chipsDir, file), 'utf-8');
        const lines = content.trim().split('\n');
        for (const line of lines) {
          if (!line.trim()) continue; // Skip empty lines
          const chip: ChipData = JSON.parse(line);
          chipCache.set(chip.chip_id, chip.content || '');
        }
      } catch (e) {
        console.warn(`[ChipLookup] Failed to load ${file}:`, (e as Error).message);
      }
    }
  }

  // Load iMessage chips
  const imsgDir = path.join(dataRoot, 'imsg-chips');
  if (fs.existsSync(imsgDir)) {
    const imsgFiles = fs.readdirSync(imsgDir).filter(f => f.endsWith('.jsonl'));
    for (const file of imsgFiles) {
      try {
        const content = fs.readFileSync(path.join(imsgDir, file), 'utf-8');
        const lines = content.trim().split('\n');
        for (const line of lines) {
          const chip: ChipData = JSON.parse(line);
          chipCache.set(chip.chip_id, chip.content || '');
        }
      } catch (e) {
        console.warn(`[ChipLookup] Failed to load ${file}:`, e);
      }
    }
  }

  // Load Assessment+GamePlan chips
  const gameplanDir = path.join(dataRoot, 'gameplan-chips');
  if (fs.existsSync(gameplanDir)) {
    // Check both root and chips/ subdirectory
    const dirs = [gameplanDir, path.join(gameplanDir, 'chips')];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;
      const gpFiles = fs.readdirSync(dir).filter(f =>
        (f.endsWith('.jsonl') || f.endsWith('.json')) && !f.endsWith('.bak')
      );
      for (const file of gpFiles) {
        try {
          const content = fs.readFileSync(path.join(dir, file), 'utf-8');
          const lines = content.trim().split('\n');
          for (const line of lines) {
            if (!line.trim()) continue;
            const chip: ChipData = JSON.parse(line);
            chipCache.set(chip.chip_id, chip.content || '');
          }
        } catch (e) {
          console.warn(`[ChipLookup] Failed to load ${file}:`, (e as Error).message);
        }
      }
    }
  }

  // Load Exec chips
  const execDir = path.join(dataRoot, 'exec-chips');
  if (fs.existsSync(execDir)) {
    const execFiles = fs.readdirSync(execDir).filter(f => f.endsWith('.jsonl') || f.endsWith('.json'));
    for (const file of execFiles) {
      try {
        const content = fs.readFileSync(path.join(execDir, file), 'utf-8');
        const lines = content.trim().split('\n');
        for (const line of lines) {
          const chip: ChipData = JSON.parse(line);
          chipCache.set(chip.chip_id, chip.content || '');
        }
      } catch (e) {
        console.warn(`[ChipLookup] Failed to load ${file}:`, e);
      }
    }
  }

  allChipsLoaded = true;
  console.log(`[ChipLookup] Loaded ${chipCache.size} chips into memory cache`);
}

/**
 * Get chip content by chip_id
 */
export function getChipContent(chip_id: string): string {
  if (!allChipsLoaded) {
    loadAllChips();
  }

  return chipCache.get(chip_id) || '';
}

/**
 * Get multiple chip contents at once
 */
export function getChipContents(chip_ids: string[]): Map<string, string> {
  if (!allChipsLoaded) {
    loadAllChips();
  }

  const result = new Map<string, string>();
  for (const id of chip_ids) {
    const content = chipCache.get(id);
    if (content) {
      result.set(id, content);
    }
  }

  return result;
}
