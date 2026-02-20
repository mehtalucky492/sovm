#!/usr/bin/env node

/**
 * CLI for Block Builder workflow
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { promises as fs } from 'fs';
import path from 'path';
import { runWorkflow } from './workflow.js';
import { WorkflowInput, WorkflowInputSchema, WorkflowStep } from './types.js';
import { createVSCodeMCPClient } from './vscode-mcp-client.js';

const program = new Command();

program
  .name('block-builder')
  .description('Generate Adobe EDS blocks from Figma designs using LangGraph workflow orchestration')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate an EDS block from a Figma design')
  .requiredOption('-n, --name <name>', 'Block name (lowercase-hyphenated)')
  .option('-u, --url <url>', 'Figma URL with node-id')
  .option('-i, --node-id <nodeId>', 'Figma node ID (e.g., "13157:13513")')
  .option('-o, --output <path>', 'Output directory', './blocks')
  .option('--no-screenshot', 'Skip screenshot capture')
  .option('--no-section-model', 'Skip section model update')
  .option('--no-validate', 'Skip output validation')
  .option('--strict', 'Enable strict validation mode')
  .option('--no-persist', 'Don\'t persist context artifacts')
  .option('--save-state <path>', 'Save workflow state to file')
  .action(async (options) => {
    const spinner = ora('Initializing Block Builder workflow...').start();
    
    try {
      // Validate input
      const input: WorkflowInput = WorkflowInputSchema.parse({
        blockName: options.name,
        figmaUrl: options.url,
        figmaNodeId: options.nodeId,
        outputPath: options.output,
        options: {
          skipScreenshot: !options.screenshot,
          updateSectionModel: options.sectionModel,
          validateOutput: options.validate,
          strictValidation: options.strict,
          persistContext: options.persist,
        },
      });

      // Validate that either URL or node ID is provided
      if (!input.figmaUrl && !input.figmaNodeId) {
        spinner.fail(chalk.red('Error: Either --url or --node-id must be provided'));
        process.exit(1);
      }

      spinner.text = 'Running Block Builder workflow...';
      
      // Use real VS Code MCP client (note: requires VS Code extension context)
      const mcpClient = createVSCodeMCPClient();
      
      const result = await runWorkflow(input, mcpClient);
      
      // Check if workflow succeeded
      if (result.currentStep === WorkflowStep.COMPLETED) {
        spinner.succeed(chalk.green('✅ Block generation completed successfully!'));
        
        console.log(chalk.bold('\n📦 Generated Block:'));
        console.log(chalk.cyan(`   Name: ${result.input.blockName}`));
        console.log(chalk.cyan(`   Location: ${result.input.outputPath}/${result.input.blockName}`));
        
        if (result.validation) {
          console.log(chalk.bold('\n✅ Validation Results:'));
          console.log(chalk.cyan(`   Status: ${result.validation.summary.status}`));
          console.log(chalk.cyan(`   Errors: ${result.validation.summary.totalErrors}`));
          console.log(chalk.cyan(`   Warnings: ${result.validation.summary.totalWarnings}`));
        }
        
        if (result.duration) {
          console.log(chalk.bold('\n⏱️  Duration:'));
          console.log(chalk.cyan(`   ${(result.duration / 1000).toFixed(2)}s`));
        }
        
        // Save state if requested
        if (options.saveState) {
          await fs.mkdir(path.dirname(options.saveState), { recursive: true });
          await fs.writeFile(
            options.saveState,
            JSON.stringify(result, null, 2),
            'utf-8'
          );
          console.log(chalk.gray(`\n💾 State saved to: ${options.saveState}`));
        }
        
        process.exit(0);
      } else {
        spinner.fail(chalk.red('❌ Block generation failed'));
        
        console.log(chalk.bold('\n❌ Errors:'));
        result.errors.forEach((error, i) => {
          console.log(chalk.red(`   ${i + 1}. [${error.step}] ${error.message}`));
        });
        
        // Save state if requested
        if (options.saveState) {
          await fs.mkdir(path.dirname(options.saveState), { recursive: true });
          await fs.writeFile(
            options.saveState,
            JSON.stringify(result, null, 2),
            'utf-8'
          );
          console.log(chalk.gray(`\n💾 State saved to: ${options.saveState}`));
        }
        
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(chalk.red('Fatal error'));
      console.error(chalk.red('\n❌ Fatal Error:'));
      console.error(error);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate an existing block')
  .requiredOption('-n, --name <name>', 'Block name')
  .option('-p, --path <path>', 'Block path', './blocks')
  .option('--strict', 'Enable strict validation mode')
  .action(async (options) => {
    const spinner = ora(`Validating block "${options.name}"...`).start();
    
    try {
      // TODO: Implement validation command
      spinner.warn(chalk.yellow('Validation command not yet implemented'));
    } catch (error) {
      spinner.fail(chalk.red('Validation failed'));
      console.error(error);
      process.exit(1);
    }
  });

program
  .command('resume')
  .description('Resume a workflow from saved state')
  .requiredOption('-s, --state <path>', 'Path to saved state file')
  .action(async (options) => {
    const spinner = ora('Loading workflow state...').start();
    
    try {
      // TODO: Implement resume command
      spinner.warn(chalk.yellow('Resume command not yet implemented'));
    } catch (error) {
      spinner.fail(chalk.red('Failed to resume workflow'));
      console.error(error);
      process.exit(1);
    }
  });

program.parse();
