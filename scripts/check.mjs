import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, lstatSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8'));
const ids = new Set(), entries = new Set();
const inside = name => {
  assert.equal(typeof name, 'string');
  const target = resolve(root, name), local = relative(root, target);
  assert(local && local !== '..' && !local.startsWith('..' + sep), `路径越界：${name}`);
  assert(statSync(target).isFile(), `文件不存在：${name}`);
  return target;
};
const text = name => readFileSync(inside(name), 'utf8');
function links(file) {
  // 只检查本仓库约定的普通 Markdown 文件链接，忽略代码围栏。
  const content = text(file).replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, '');
  return [...content.matchAll(/\]\(([^)]+)\)/g)]
    .map(match => match[1])
    .filter(target => !/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(target))
    .map(target => relative(root, resolve(root, dirname(file), decodeURIComponent(target.split(/[?#]/)[0]))).split(sep).join('/'));
}
function files(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    if (entry.name.startsWith('.') || ['node_modules', 'artifacts'].includes(entry.name)) return [];
    const full = join(folder, entry.name);
    assert(!lstatSync(full).isSymbolicLink(), `不收录符号链接：${full}`);
    return entry.isDirectory() ? files(full) : [relative(root, full).split(sep).join('/')];
  });
}

assert.equal(catalog.version, 2);
assert(Array.isArray(catalog.demos) && catalog.demos.length > 0);
for (const demo of catalog.demos) {
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(demo.id) && !ids.has(demo.id), 'ID 无效或重复');
  ids.add(demo.id);
  for (const key of ['title', 'problem', 'category', 'run', 'verify']) assert(demo[key]?.trim(), `${demo.id} 缺少 ${key}`);
  for (const key of ['data_types', 'locations', 'implementation', 'constraints', 'blogs', 'processing']) {
    assert(Array.isArray(demo[key]) && demo[key].length > 0, `${demo.id} 缺少 ${key}`);
  }
  for (const file of [demo.readme, demo.map, demo.entry, demo.tests, ...demo.blogs, ...(demo.related_code || [])]) inside(file);
  assert(Array.isArray(demo.usages), `${demo.id} 缺少实际使用索引`);
  for (const usage of demo.usages) {
    const url = new URL(usage.url);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.hostname, 'github.com');
    assert.equal(url.pathname.split('/')[1], new URL(catalog.repository).pathname.split('/')[1], '实际使用必须链接作者自有仓库');
    assert(/^\/[^/]+\/[^/]+\/blob\/[^/]+\/.+/.test(url.pathname), '实际使用应链接具体代码文件');
    assert(usage.project?.trim() && usage.location?.trim(), '缺少实际使用项目或位置');
    assert(text(demo.readme).includes(usage.url), 'Demo 说明缺少实际项目链接');
  }
  assert(!entries.has(demo.entry), `实现入口重复：${demo.entry}`);
  entries.add(demo.entry);
  for (const process of demo.processing) {
    assert.equal(process.file, demo.entry, '首版要求处理实现收在同一文件');
    assert(process.inputs?.length && process.output && process.responsibility);
    assert.equal(typeof (await import(pathToFileURL(inside(process.file)).href))[process.symbol], 'function', `函数绑定不存在：${process.symbol}`);
  }
  for (const blog of demo.blogs) {
    const targets = links(blog);
    assert(targets.includes(demo.readme) && targets.includes(demo.entry), `博客未关联 demo：${blog}`);
  }
  assert(links(demo.map).includes(demo.readme), '数据地图未链接 demo');
}
let localLinks = 0;
for (const file of files(root)) {
  if (file.startsWith('demos/') && file.endsWith('/demo.mjs')) assert(entries.has(file), `未登记的 demo：${file}`);
  if (file.endsWith('.md')) for (const target of links(file)) { inside(target); localLinks++; }
}
console.log(`关系检查通过：${ids.size} 个 demo，${localLinks} 条本地文件链接，全部处理节点均绑定真实导出函数。`);
