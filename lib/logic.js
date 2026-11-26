export const DAY = 86400000;
const t = (a) => new Date(a.start).getTime();

export const dayWindow = (a, d) => ({ start: t(a) + (d - 1) * DAY, end: t(a) + d * DAY });
export const currentDay = (a, now) => Math.floor((now - t(a)) / DAY) + 1; // <1 not started, >days finished
export const totalPoints = (a) => a.days * a.pts;
export const subId = (a, sid, d) => `${a.id}_${sid}_${d}`;

export function questionRange(a, d) {
  const per = Math.ceil(a.total / a.days);
  return [(d - 1) * per + 1, Math.min(d * per, a.total)];
}
export function cellStatus(a, sub, d, now) {
  if (sub) {
    if (sub.status === 'rejected') return 'rejected';
    if (sub.status === 'review') return 'review';
    return 'submitted';
  }
  const w = dayWindow(a, d);
  if (now >= w.end) return 'missed';
  if (now >= w.start) return 'pending';
  return 'locked';
}
export function earned(subs) { return subs.reduce((s, x) => s + (x.status === 'submitted' ? x.points : 0), 0); }
export function streak(a, subs, now) {
  const ok = {}; subs.forEach((s) => { if (s.status === 'submitted' || s.status === 'review') ok[s.day] = true; });
  let d = Math.min(currentDay(a, now), a.days);
  if (!ok[d]) d -= 1;
  let n = 0; while (d >= 1 && ok[d]) { n++; d--; }
  return n;
}
export function fmtCountdown(ms) {
  if (ms <= 0) return '00:00:00';
  const s = Math.floor(ms / 1000), h = String(Math.floor(s / 3600)).padStart(2, '0'), m = String(Math.floor((s % 3600) / 60)).padStart(2, '0'), x = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${x}`;
}
export const pct = (s, m) => (m ? Math.round((s / m) * 100) : 0);
export const avgPct = (arr) => (arr.length ? Math.round(arr.reduce((s, x) => s + pct(x.score, x.max), 0) / arr.length) : null);