import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = JSON.parse(readFileSync(new URL('../catalog.json', import.meta.url), 'utf8'));
// 只运行当前登记的用例，避免把文书附件中的历史快照再次当成测试。
const result = spawnSync(process.execPath, ['--test', ...catalog.demos.map(demo => demo.tests)], {
  cwd: root, stdio: 'inherit'
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
