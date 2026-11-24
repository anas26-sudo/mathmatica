// Data layer: Supabase when env vars exist, otherwise a browser-only DEMO mode.
import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const isLive = !!(URL && KEY);
const sb = isLive ? createClient(URL, KEY) : null;
export const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'anas2026';

const LS = 'mathmatica_demo_v1';
const TABLES = ['students', 'assignments', 'submissions', 'scores'];

function sample(label) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='1000'><rect width='800' height='1000' fill='#f6f3e8'/>` +
    Array.from({ length: 24 }, (_, i) => `<line x1='0' x2='800' y1='${60 + i * 40}' y2='${60 + i * 40}' stroke='#b9c7e6'/>`).join('') +
    `<text x='60' y='140' font-size='46' font-family='cursive' fill='#1d3a8a'>${label}</text>` +
    `<text x='60' y='240' font-size='40' font-family='cursive' fill='#1d3a8a'>2x + 6 = 14  →  x = 4</text>` +
    `<text x='60' y='340' font-size='40' font-family='cursive' fill='#1d3a8a'>(sample photo — demo mode)</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function seed() {
  const now = Date.now(), H = 3600000;
  const a = { id: 'wk1', title: 'Week 1 — Algebra practice', total: 70, days: 7, pts: 10, start: new Date(now - (2 * 24 + 14) * H).toISOString() };
  const names = [['Omar Hassan', 'Prep 2', 'A'], ['Mariam Ali', 'Prep 2', 'A'], ['Youssef Adel', 'Prep 3', 'B'], ['Nour Ibrahim', 'Prep 3', 'B'], ['Salma Khaled', 'Sec 1', 'A'], ['Ahmed Samy', 'Sec 1', 'A']];
  const students = names.map(([name, grade, group], i) => ({ id: 's' + (i + 1), code: `MATH-${101 + i}`, name, grade, group }));
  const submissions = [];
  const add = (sid, d, extra = {}) => submissions.push({ id: `${a.id}_${sid}_${d}`, assignmentId: a.id, studentId: sid, day: d, images: [sample(`Day ${d} — answers`)], note: '', status: 'submitted', points: a.pts, at: new Date(a.start).getTime() + (d - 1) * 24 * H + 5 * H, ...extra });
  add('s1', 1); add('s1', 2); add('s1', 3);
  add('s2', 1); add('s2', 2);
  add('s3', 1); add('s3', 3);
  add('s4', 2, { status: 'rejected', points: 0 });
  add('s5', 1); add('s5', 2); add('s5', 3);
  const scores = [
    { id: 'q1', studentId: 's1', type: 'quiz', title: 'Quiz 1', score: 17, max: 20 },
    { id: 'q2', studentId: 's2', type: 'quiz', title: 'Quiz 1', score: 14, max: 20 },
    { id: 'm1', studentId: 's1', type: 'monthly', title: 'October exam', score: 44, max: 50 }
  ];
  return { students, assignments: [a], submissions, scores };
}

function load() {
  try { const raw = localStorage.getItem(LS); if (raw) return JSON.parse(raw); } catch {}
  const s = seed(); try { localStorage.setItem(LS, JSON.stringify(s)); } catch {}
  return s;
}
function save(db) { localStorage.setItem(LS, JSON.stringify(db)); }

export async function list(table) {
  if (!TABLES.includes(table)) throw new Error('bad table');
  if (!isLive) return load()[table] || [];
  const { data, error } = await sb.from(table).select('data');
  if (error) throw error;
  return (data || []).map((r) => r.data);
}
export async function put(table, row) {
  if (!isLive) { const db = load(); const arr = db[table]; const i = arr.findIndex((r) => r.id === row.id); i >= 0 ? (arr[i] = row) : arr.push(row); save(db); return row; }
  const { error } = await sb.from(table).upsert({ id: row.id, data: row });
  if (error) throw error; return row;
}
export async function del(table, id) {
  if (!isLive) { const db = load(); db[table] = db[table].filter((r) => r.id !== id); save(db); return; }
  const { error } = await sb.from(table).delete().eq('id', id);
  if (error) throw error;
}
export async function resetDemo() { if (!isLive) { localStorage.removeItem(LS); load(); } }

// Resize photos so phone shots upload fast (max 1400px, JPEG).
export function compressImage(file, max = 1400, q = 0.72) {
  return new Promise((resolve, reject) => {
    const img = new Image(); const url = URL_.createObjectURL(file);
    img.onload = () => {
      const r = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL_.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('compress failed'))), 'image/jpeg', q);
    };
    img.onerror = () => reject(new Error('Not a valid image'));
    img.src = url;
  });
}
const URL_ = typeof window !== 'undefined' ? window.URL : null;

export async function uploadImage(file, path) {
  const blob = await compressImage(file);
  if (!isLive) return await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
  const { error } = await sb.storage.from('homework').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  return sb.storage.from('homework').getPublicUrl(path).data.publicUrl;
}
