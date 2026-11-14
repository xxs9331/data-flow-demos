import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { copyFileSync, cpSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
assert(process.argv[2], '用法：npm run review -- /path/to/md-review [demo-id]');
const wenshu = realpathSync(process.argv[2]);
const require = createRequire(join(wenshu, 'package.json'));
const { createProject } = require(join(wenshu, 'projects.cjs'));
const { Workflow } = require(join(wenshu, 'core.cjs'));
const { Materials } = require(join(wenshu, 'materials.cjs'));
const { Workspace } = require(join(wenshu, 'workspace.cjs'));
const catalog = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8'));
const demo = catalog.demos.find(item => item.id === (process.argv[3] || catalog.demos[0].id));
assert(demo, '目录索引中没有此 demo');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
assert.equal(git('status', '--porcelain').trim(), '', '请先保存并提交本次内容，再生成绑定提交版本的审查包');
const commit = git('rev-parse', 'HEAD').trim();
const files = git('ls-files', '-z').split('\0').filter(Boolean);
const parent = join(root, 'artifacts', 'review');
mkdirSync(parent, { recursive: true });
const output = join(parent, demo.id + '-' + randomUUID().slice(0, 8));
const project = createProject({ target: output, name: '正文.md' }).project;
const records = [];
const sha256 = content => createHash('sha256').update(content).digest('hex');
for (const file of files) {
  const source = join(root, file);
  assert(lstatSync(source).isFile(), '附件只接受普通文件：' + file);
  const target = join(project.root, '附件', '仓库', file);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  const hash = sha256(readFileSync(source));
  assert.equal(sha256(readFileSync(target)), hash);
  records.push({ path: file, sha256: hash });
}
// 这里只迁移本仓库自己编写的普通相对链接，不承担通用 Markdown 转换。
function relocateLinks(markdown, sourcePath, prefix) {
  return markdown.replace(/\]\(([^)]+)\)/g, (match, link) => {
    if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(link)) return match;
    const [file, suffix = ''] = link.split(/(?=[?#])/);
    const relative = posix.normalize(posix.join(posix.dirname(sourcePath), file));
    assert(files.includes(relative), '资料引用未入库文件：' + relative);
    return '](' + prefix + relative + suffix + ')';
  });
}
const blog = readFileSync(join(root, demo.blogs[0]), 'utf8');
const manuscript = relocateLinks(blog, demo.blogs[0], '附件/仓库/');
writeFileSync(project.document, manuscript);
writeFileSync(join(project.root, '附件', 'source-manifest.json'), JSON.stringify({
  repository: catalog.repository, commit, demo: demo.id,
  sourceBlog: demo.blogs[0], manuscriptSha256: sha256(manuscript), files: records
}, null, 2) + '\n');
writeFileSync(join(project.root, '审查说明.md'), `# ${demo.title}：博客审查\n\n主稿：[正文.md](正文.md)。\n\n资料源：${catalog.repository}\n\n固定提交：${commit}\n\n请先审查数据链路、技术解释、样例输出与实际源码是否一致，再调整文章表达。原始代码在附件/仓库中，可读取的代码资料在知识库中。\n\n本包是快照；文书修改不会自动改动 GitHub。审查完成后核对主稿并同步到 ${demo.blogs[0]}。文书 GitHub 接入后，后续资料可按固定提交直接读取。\n`);

const runtime = mkdtempSync(join(tmpdir(), 'data-flow-review-'));
let modelCalls = 0;
const engine = new Workflow(join(runtime, 'settings'), async () => {
  modelCalls++;
  throw new Error('打包不应调用模型');
}, { automatic: false });
let workspace;
try {
  engine.open(project.root, `审查技术博客《${demo.title}》：先核对数据链路、处理规则、样例和真实源码，再审查表达；博客保持待审，代码修改须回仓库验证。`);
  engine.state.discussion.pending = false;
  engine.save();
  const materials = new Materials(engine.dir);
  const references = [
    { path: demo.map, title: '01-数据链路.md' },
    { path: demo.entry, title: '02-Demo代码.md', language: 'javascript' },
    { path: demo.tests, title: '03-边界测试.md', language: 'javascript' },
    { path: demo.readme, title: '04-Demo说明与实际使用.md' },
    ...(demo.related_code || []).map((file, index) => ({ path: file, title: `05-真实源码选段-${index + 1}.md`, language: 'text' })),
    { path: 'README.md', title: '06-仓库组织.md' }
  ];
  const entries = references.map(reference => {
    const source = readFileSync(join(root, reference.path), 'utf8');
    const content = reference.language ? `# ${reference.title}\n\n原始路径：${reference.path}\n\n\`\`\`${reference.language}\n${source}\n\`\`\`\n` : relocateLinks(source, reference.path, '../附件/仓库/');
    return materials.add(project.document, {
      title: reference.title, text: content, kind: 'md',
      url: `${catalog.repository}/blob/${commit}/${reference.path}`
    }, Buffer.from(source)).entry;
  });
  workspace = new Workspace(engine.dir, materials);
  const listed = workspace.list(project.document);
  assert(entries.every(entry => listed.some(item => item.id === entry.id && item.readable)));
  for (const entry of entries) {
    const read = await workspace.read(project.document, entry.id, { start: 1, count: 100 });
    assert(read.text?.length > 0, '资料无法读取：' + entry.title);
  }
  const moved = join(runtime, '搬移验证项目');
  cpSync(project.root, moved, { recursive: true });
  engine.open(moved);
  assert.equal(engine.state.discussion.pending, false);
  assert(engine.state.document.goal.length > 0);
  assert.equal(engine.snapshot().manuscript, manuscript);
  assert.equal(new Materials(engine.dir).list(engine.state.document.path).length, entries.length);
  assert.equal(modelCalls, 0);
  const report = { repository: catalog.repository, commit, project: project.root,
    files: records.length, readableReferences: entries.length,
    copiedFileHashesVerified: true, persistedGoal: true, movedProjectReopened: true,
    modelCalls, desktopUI: 'not-run' };
  writeFileSync(join(output, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  await engine.stop();
  await workspace?.close();
}
