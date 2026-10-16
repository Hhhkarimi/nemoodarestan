import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export async function npm(args, cwd = root) {
  const cli = process.env.npm_execpath;
  if (!cli) throw new Error('Run this command using npm run.');
  await new Promise((ok, fail) => {
    const child = spawn(process.execPath, [cli, ...args], { cwd, stdio: 'inherit', env: process.env });
    child.once('error', fail);
    child.once('exit', code => code === 0 ? ok() : fail(new Error(`npm ${args.join(' ')} exited with ${code}`)));
  });
}
