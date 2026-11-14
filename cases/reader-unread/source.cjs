// SPDX-License-Identifier: AGPL-3.0-only
// 2026-11-14 追更阅读器 model.js 的原函数选段，函数体未修改。
// 文件哈希与来源见 README.md；module.exports 为独立核对而添加。
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;

function isAllowed(account, key, index, now) {
  const book = account.books[key];
  if (!book?.enabled) return true;
  if (!integer(index, 0, book.chapters.length - 1)) return false;
  return index < (book.startIndex || 0) || book.completed.includes(index) || account.grants.some(g => g.key === key && g.index === index &&
    (!g.temporary || g.completed || (now >= g.at && now < g.until)));
}

function unreadGrant(account, key, now) {
  const book = account.books[key];
  if (!book) return;
  return account.grants.find(g => g.key === key && g.index >= (book.startIndex || 0) &&
    !g.completed && !book.completed.includes(g.index) &&
    (!g.temporary || now >= g.at && now < g.until));
}

module.exports = { isAllowed, unreadGrant };
