/**
 * Workflow state persistence utilities
 */

import { promises as fs } from 'fs';
import path from 'path';
import { WorkflowState } from './types.js';

export interface PersistenceConfig {
  stateDir: string;
  autoSave: boolean;
  saveInterval: number;
}

const DEFAULT_PERSISTENCE_CONFIG: PersistenceConfig = {
  stateDir: './.tmp/block-builder-states',
  autoSave: true,
  saveInterval: 5000,
};

/**
 * State persistence manager
 */
export class StatePersistence {
  private config: PersistenceConfig;
  private autoSaveTimer?: NodeJS.Timeout;

  constructor(config: Partial<PersistenceConfig> = {}) {
    this.config = { ...DEFAULT_PERSISTENCE_CONFIG, ...config };
  }

  /**
   * Save workflow state to disk
   */
  async saveState(state: WorkflowState, filename?: string): Promise<string> {
    await fs.mkdir(this.config.stateDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const name = filename || `${state.input.blockName}-${timestamp}.json`;
    const filePath = path.join(this.config.stateDir, name);
    
    await fs.writeFile(filePath, JSON.stringify(state, null, 2), 'utf-8');
    
    return filePath;
  }

  /**
   * Load workflow state from disk
   */
  async loadState(filename: string): Promise<WorkflowState> {
    const filePath = path.isAbsolute(filename) 
      ? filename 
      : path.join(this.config.stateDir, filename);
    
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as WorkflowState;
  }

  /**
   * List saved states
   */
  async listStates(): Promise<Array<{ name: string; path: string; mtime: Date }>> {
    try {
      await fs.mkdir(this.config.stateDir, { recursive: true });
      const files = await fs.readdir(this.config.stateDir);
      
      const states = await Promise.all(
        files
          .filter(file => file.endsWith('.json'))
          .map(async (file) => {
            const filePath = path.join(this.config.stateDir, file);
            const stats = await fs.stat(filePath);
            return {
              name: file,
              path: filePath,
              mtime: stats.mtime,
            };
          })
      );
      
      return states.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    } catch {
      return [];
    }
  }

  /**
   * Delete a saved state
   */
  async deleteState(filename: string): Promise<void> {
    const filePath = path.isAbsolute(filename) 
      ? filename 
      : path.join(this.config.stateDir, filename);
    
    await fs.unlink(filePath);
  }

  /**
   * Enable auto-save
   */
  enableAutoSave(state: WorkflowState, onSave?: (path: string) => void): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(async () => {
      try {
        const filePath = await this.saveState(state, `${state.input.blockName}-autosave.json`);
        if (onSave) {
          onSave(filePath);
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, this.config.saveInterval);
  }

  /**
   * Disable auto-save
   */
  disableAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = undefined;
    }
  }

  /**
   * Create a checkpoint of the current state
   */
  async createCheckpoint(state: WorkflowState, label?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const checkpointLabel = label ? `-${label}` : '';
    const filename = `${state.input.blockName}-checkpoint${checkpointLabel}-${timestamp}.json`;
    
    return await this.saveState(state, filename);
  }

  /**
   * Find the most recent state for a block
   */
  async findLatestState(blockName: string): Promise<WorkflowState | null> {
    const states = await this.listStates();
    const matching = states.find(s => s.name.startsWith(blockName));
    
    if (!matching) {
      return null;
    }
    
    return await this.loadState(matching.path);
  }

  /**
   * Clean up old states (keep only recent N states)
   */
  async cleanupOldStates(keepCount = 10): Promise<number> {
    const states = await this.listStates();
    
    if (states.length <= keepCount) {
      return 0;
    }
    
    const toDelete = states.slice(keepCount);
    
    await Promise.all(
      toDelete.map(state => this.deleteState(state.path))
    );
    
    return toDelete.length;
  }
}

/**
 * Create a state diff between two states
 */
export function createStateDiff(
  oldState: WorkflowState,
  newState: WorkflowState
): Record<string, { old: unknown; new: unknown }> {
  const diff: Record<string, { old: unknown; new: unknown }> = {};
  
  // Compare key fields
  const keys: (keyof WorkflowState)[] = [
    'currentStep',
    'designContext',
    'screenshot',
    'analysis',
    'generatedFiles',
    'validation',
  ];
  
  for (const key of keys) {
    if (JSON.stringify(oldState[key]) !== JSON.stringify(newState[key])) {
      diff[key] = {
        old: oldState[key],
        new: newState[key],
      };
    }
  }
  
  return diff;
}

/**
 * Export state summary for reporting
 */
export function exportStateSummary(state: WorkflowState): string {
  const lines: string[] = [
    '# Block Builder Workflow Summary',
    '',
    `**Block Name:** ${state.input.blockName}`,
    `**Status:** ${state.currentStep}`,
    `**Started:** ${state.startTime}`,
  ];
  
  if (state.endTime) {
    lines.push(`**Completed:** ${state.endTime}`);
  }
  
  if (state.duration) {
    lines.push(`**Duration:** ${(state.duration / 1000).toFixed(2)}s`);
  }
  
  lines.push('');
  
  if (state.errors.length > 0) {
    lines.push('## Errors');
    state.errors.forEach((error, i) => {
      lines.push(`${i + 1}. **[${error.step}]** ${error.message}`);
    });
    lines.push('');
  }
  
  if (state.designContext) {
    lines.push('## Design Context');
    lines.push(`- Code length: ${state.designContext.generatedCode.length} characters`);
    lines.push(`- Node ID: ${state.designContext.nodeId}`);
    lines.push('');
  }
  
  if (state.analysis) {
    lines.push('## Analysis');
    lines.push(`- Block type: ${state.analysis.blockType}`);
    lines.push(`- Container fields: ${state.analysis.contentStructure.containerFields.length}`);
    lines.push(`- Item fields: ${state.analysis.contentStructure.itemFields?.length || 0}`);
    lines.push('');
  }
  
  if (state.validation) {
    lines.push('## Validation');
    lines.push(`- Status: ${state.validation.summary.status}`);
    lines.push(`- Errors: ${state.validation.summary.totalErrors}`);
    lines.push(`- Warnings: ${state.validation.summary.totalWarnings}`);
    lines.push('');
  }
  
  return lines.join('\n');
}
