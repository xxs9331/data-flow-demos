// SPDX-License-Identifier: AGPL-3.0-only
/**
 * 带有效期记录的未读判定。
 *
 * 数据链路（同一进程内存）：
 * 完成状态 + 历史领取记录 + 显式时间
 * → findUnreadGrant → 有效记录或 null
 * → projectUnread → 未读标记与章节索引。
 *
 * 同一章可能重复领取：旧记录未完成，章节却已在新记录下完成。
 * 同时检查记录有效期与章节完成状态，不能用访问权限代替未读判定。
 * 临时记录在 at <= now < until 有效；正式记录永久有效。
 * 只查询、不修改历史数据；第 0 章仍是有效目标。
 *
 * 运行：Node.js 22+，无需安装依赖，执行 node expiring-unread.mjs。
 * 输出：领取、过期、重领、完成四个阶段，unread 为 true/false/true/false。
 *
 * 实际使用：Koodo 追更阅读器的 model.js::unreadGrant。
 * https://github.com/xxs9331/koodo-serial-reader/blob/f2ad1058654f12c5f58bf3671276856e2eee57cc/src/utils/serial/model.js#L190
 * 来源：Koodo Reader 及其贡献者，AGPL-3.0；本例缩小输入范围并统一空结果为 null。
 */
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
