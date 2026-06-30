import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export interface WorkspaceSummary {
  fileCount: number;
  gitBranch: string | null;
  gitStatusClean: boolean;
  fileExtensions: Record<string, number>;
  structureText: string;
}

export function scanWorkspace(): WorkspaceSummary {
  const cwd = process.cwd();
  const summary: WorkspaceSummary = {
    fileCount: 0,
    gitBranch: null,
    gitStatusClean: true,
    fileExtensions: {},
    structureText: '',
  };

  // 1. Get git branch and status
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
    summary.gitBranch = branch;
    const status = execSync('git status --porcelain', { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
    summary.gitStatusClean = status.length === 0;
  } catch (e) {}

  // 2. Recursive file scan up to max limits
  const maxDepth = 4;
  const maxFiles = 300;
  let fileList: string[] = [];

  function recurse(dir: string, depth: number) {
    if (depth > maxDepth || fileList.length >= maxFiles) return;

    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const name = item.name;
        if (name === 'node_modules' || name === '.git' || name === 'dist' || name === 'build' || name === '.next' || name === '.agents') {
          continue;
        }

        const fullPath = path.join(dir, name);
        if (item.isDirectory()) {
          recurse(fullPath, depth + 1);
        } else {
          summary.fileCount++;
          const ext = path.extname(name).toLowerCase() || 'no-extension';
          summary.fileExtensions[ext] = (summary.fileExtensions[ext] || 0) + 1;
          
          const relPath = path.relative(cwd, fullPath).replace(/\\/g, '/');
          fileList.push(relPath);
        }
      }
    } catch {}
  }

  recurse(cwd, 0);

  // 3. Build structure summary text
  summary.structureText = fileList.map(f => `  - ${f}`).join('\n');
  return summary;
}

export function injectWorkspacePrompt(systemPrompt: string): string {
  try {
    const workspace = scanWorkspace();
    const gitInfo = workspace.gitBranch 
      ? `\nGit Branch: ${workspace.gitBranch} (${workspace.gitStatusClean ? 'clean status' : 'modified files present'})` 
      : '\nGit status: Not initialized / No git repo';

    const extensionsStr = Object.entries(workspace.fileExtensions)
      .map(([ext, count]) => `${ext}: ${count}`)
      .join(', ');

    return `${systemPrompt}

[SYSTEM INSTRUCTION: WORKSPACE CONTEXT]
You are currently running in the user's workspace directory. Here is the metadata of their workspace:
- Total Files Found (limit 300): ${workspace.fileCount}
- Languages / Extensions: ${extensionsStr}${gitInfo}
- File Tree Structure:
${workspace.structureText}
`;
  } catch (e) {
    return systemPrompt;
  }
}

