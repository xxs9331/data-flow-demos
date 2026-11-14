// SPDX-License-Identifier: AGPL-3.0-only
// 从追更阅读器 unreadGrant 提炼，来源与使用位置见 README.md。
import { pathToFileURL } from 'node:url';

/** @typedef {{key: string, startIndex: number, completed: number[]}} BookState */
/** @typedef {{key: string, index: number, temporary: boolean, at: number, until: number, completed: boolean}} Grant */

/**
 * 输入均为已校验的内存数据，时间使用同一单位、同一时间轴。
 * @param {BookState} book
 * @param {Grant[]} grants 领取顺序，先出现的有效记录优先。
 * @param {number} now
 * @returns {Grant | null}
 */
export function findUnreadGrant(book, grants, now) {
  return grants.find(grant =>
    grant.key === book.key && grant.index >= book.startIndex &&
    !grant.completed && !book.completed.includes(grant.index) &&
    (!grant.temporary || now >= grant.at && now < grant.until)
  ) ?? null;
}

/** @returns {{unread: boolean, chapterIndex: number | null}} */
export function projectUnread(book, grants, now) {
  const grant = findUnreadGrant(book, grants, now);
  return { unread: grant !== null, chapterIndex: grant?.index ?? null };
}

export function runDemo() {
  // 合成时间轴，单位为毫秒；相同输入每次得到相同结果。
  const book = { key: 'sample-book', startIndex: 0, completed: [] };
  const first = { key: book.key, index: 0, temporary: true, at: 1000, until: 2000, completed: false };
  const second = { ...first, at: 2000, until: 3000 };
  const steps = [
    { name: '首次领取', now: 1500, book, grants: [first] },
    { name: '领取过期', now: 2000, book, grants: [first] },
    { name: '重新领取', now: 2500, book, grants: [first, second] },
    { name: '重领后完成', now: 2600, book: { ...book, completed: [0] },
      grants: [first, { ...second, completed: true }] }
  ];
  const rows = steps.map(step => ({
    stage: step.name, now: step.now,
    ...projectUnread(step.book, step.grants, step.now)
  }));
  console.table(rows);
  return rows;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runDemo();
