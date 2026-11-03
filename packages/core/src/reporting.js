import { fail } from './validation.js';
const offset = 7 * 3600000;
export function dateWindow(query, now = new Date()) {
  const local = new Date(+now + offset);
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offset;
  const day = 86400000;
  const named = {
    today: [midnight, midnight + day], yesterday: [midnight - day, midnight],
    week: [midnight - ((local.getUTCDay() + 6) % 7) * day, midnight + day],
    month: [Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - offset, midnight + day],
    year: [Date.UTC(local.getUTCFullYear(), 0, 1) - offset, Date.UTC(local.getUTCFullYear() + 1, 0, 1) - offset],
  };
  const parse = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(400, 'Ngày phải có dạng YYYY-MM-DD.');
    const timestamp = Date.parse(value + 'T00:00:00+07:00');
    if (!Number.isFinite(timestamp) || new Date(timestamp + offset).toISOString().slice(0, 10) !== value) fail(400, 'Ngày không hợp lệ.');
    return timestamp;
  };
  let range;
  if (query.start || query.end) { if (!query.start || !query.end) fail(400, 'Cần cả ngày bắt đầu và kết thúc.'); range = [parse(query.start), parse(query.end) + day]; }
  else { if (query.range && !named[query.range]) fail(400, 'Khoảng thời gian không hợp lệ.'); range = named[query.range ?? 'year']; }
  if (range[0] >= range[1] || range[1] - range[0] > 3 * 366 * day) fail(400, 'Khoảng ngày phải tăng dần và không quá 3 năm.');
  return { start: new Date(range[0]), end: new Date(range[1]) };
}
