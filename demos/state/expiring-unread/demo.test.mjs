import test from 'node:test';
import assert from 'node:assert/strict';
import { findUnreadGrant, projectUnread } from './demo.mjs';
import original from '../../../cases/reader-unread/source.cjs';

const book = { key: 'one', startIndex: 0, completed: [] };
const first = { key: 'one', index: 0, temporary: true, at: 1000, until: 2000, completed: false };
const second = { ...first, at: 2000, until: 3000 };

test('有效期左闭右开，记录生效前与到期时都不算未读', () => {
  assert.equal(findUnreadGrant(book, [first], 999), null);
  assert.equal(findUnreadGrant(book, [first], 1000), first);
  assert.equal(findUnreadGrant(book, [first], 2000), null);
});

test('重领时选择新记录，旧记录不会重新有效', () => {
  assert.equal(findUnreadGrant(book, [first, second], 2500), second);
});

test('旧记录仍未完成，但章节已完成时不再未读', () => {
  const completedBook = { ...book, completed: [0] };
  assert.deepEqual(projectUnread(completedBook, [first, { ...second, completed: true }], 2600),
    { unread: false, chapterIndex: null });
  assert.equal(first.completed, false);
  assert.equal(findUnreadGrant(completedBook, [second], 2600), null);
});

test('记录完成、追更起点之前以及其他书籍的记录均被排除', () => {
  assert.equal(findUnreadGrant(book, [{ ...first, completed: true }], 1500), null);
  assert.equal(findUnreadGrant({ ...book, startIndex: 1 }, [first], 1500), null);
  assert.equal(findUnreadGrant(book, [{ ...first, key: 'another-book' }], 1500), null);
});

test('正式记录不过期，已完成章节仍然优先排除', () => {
  const regular = { ...first, temporary: false };
  assert.equal(findUnreadGrant(book, [regular], 9999), regular);
  assert.equal(findUnreadGrant({ ...book, completed: [0] }, [regular], 9999), null);
});

test('第0章正确显示未读，完成一章后仍保留另一章未读', () => {
  assert.deepEqual(projectUnread(book, [first], 1500), { unread: true, chapterIndex: 0 });
  assert.deepEqual(projectUnread({ ...book, completed: [0] }, [first, { ...first, index: 1 }], 1500),
    { unread: true, chapterIndex: 1 });
  assert.deepEqual(projectUnread(book, [], 1500), { unread: false, chapterIndex: null });
});

test('相同输入输出相同，状态查询不修改输入', () => {
  const input = { book: structuredClone(book), grants: [structuredClone(first)] };
  const before = structuredClone(input);
  assert.deepEqual(projectUnread(input.book, input.grants, 1500), projectUnread(input.book, input.grants, 1500));
  assert.deepEqual(input, before);
});

test('真实案例：重建旧判定会误亮，原始修复 helper 与 demo 均判定已读', () => {
  const done = { ...book, enabled: true, chapters: ['chapter-0'], completed: [0] };
  const account = { books: { one: done }, grants: [first, { ...second, completed: true }] };
  // 按故障描述重建旧判定，并非原文件原样摘录。
  const legacyUnread = account.grants.some(grant => grant.key === 'one' &&
    !grant.completed && original.isAllowed(account, 'one', grant.index, 2600));
  assert.equal(legacyUnread, true);
  assert.equal(original.unreadGrant(account, 'one', 2600), undefined);
  assert.deepEqual(projectUnread(done, account.grants, 2600), { unread: false, chapterIndex: null });
});

test('有效、过期、重领、完成与正式记录场景都与留存源码一致', () => {
  const states = [
    { grants: [first], now: 1500, completed: [] },
    { grants: [first], now: 2000, completed: [] },
    { grants: [first, second], now: 2500, completed: [] },
    { grants: [first, { ...second, completed: true }], now: 2600, completed: [0] },
    { grants: [{ ...first, temporary: false }], now: 9999, completed: [] }
  ];
  for (const state of states) {
    const current = { ...book, completed: state.completed };
    assert.deepEqual(findUnreadGrant(current, state.grants, state.now),
      original.unreadGrant({ books: { one: current }, grants: state.grants }, 'one', state.now) ?? null);
  }
});
