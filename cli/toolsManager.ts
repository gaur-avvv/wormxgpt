/**
 * cli/toolsManager.ts — Interactive tool activation checklist
 */
import readline from 'readline';
import { AppSettings } from '../types';
import { ATTACHED_TOOLS, TOOL_CATEGORIES } from '../services/tools';
import { saveSettings } from './config';
import { C } from './ui';

function promptQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(`${C.cyan}${question}${C.reset} `, (answer) => {
      resolve(answer.trim());
    });
  });
}

export async function runInteractiveToolToggler(rl: readline.Interface, settings: AppSettings): Promise<void> {
  if (!settings.enabledTools) settings.enabledTools = [];
  let enabled = new Set(settings.enabledTools);

  let running = true;
  while (running) {
    console.log(`\n${C.bold}${C.bred}⚡ Tool Activation Checklist Menu:${C.reset}\n`);

    // Build flat index mapping
    const flatList: string[] = [];
    let idx = 1;

    for (const cat of TOOL_CATEGORIES) {
      const catTools = cat.tools.filter(t => ATTACHED_TOOLS[t]);
      if (catTools.length === 0) continue;

      console.log(`${C.bold}${C.cyan}  ${cat.title}${C.reset}`);
      for (const t of catTools) {
        flatList.push(t);
        const isEnabled = enabled.has(t);
        const check = isEnabled ? `${C.green}[x]${C.reset}` : `[ ]`;
        const paddedIndex = String(idx++).padStart(3, ' ');
        console.log(`    ${C.dim}${paddedIndex}.${C.reset} ${check} ${C.white}${t}${C.reset}`);
      }
      console.log('');
    }

    console.log(`${C.bold}Actions:${C.reset}`);
    console.log(`  - Enter tool indices to toggle (e.g. "1" or "3 5 12")`);
    console.log(`  - Type ${C.cyan}all${C.reset} to enable all tools`);
    console.log(`  - Type ${C.cyan}none${C.reset} to disable all tools`);
    console.log(`  - Press ${C.cyan}Enter${C.reset} to save and return to main menu`);
    console.log('');

    const input = await promptQuestion(rl, 'Choose indices or action:');

    if (!input) {
      running = false;
      break;
    }

    if (input.toLowerCase() === 'all') {
      flatList.forEach(t => enabled.add(t));
      console.log(`\n${C.green}✔ Enabled all tools.${C.reset}\n`);
    } else if (input.toLowerCase() === 'none') {
      enabled.clear();
      console.log(`\n${C.yellow}⚠ Disabled all tools.${C.reset}\n`);
    } else {
      const choices = input.split(/\s+/).map(x => parseInt(x)).filter(x => !isNaN(x));
      choices.forEach(ch => {
        const t = flatList[ch - 1];
        if (t) {
          if (enabled.has(t)) {
            enabled.delete(t);
            console.log(`  ${C.red}Disabled${C.reset} ${t}`);
          } else {
            enabled.add(t);
            console.log(`  ${C.green}Enabled${C.reset} ${t}`);
          }
        }
      });
    }

    // Save state
    settings.enabledTools = Array.from(enabled);
    saveSettings(settings);
  }
}
