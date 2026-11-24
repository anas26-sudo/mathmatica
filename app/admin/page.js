'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Table2, BookPlus, FileSpreadsheet, Users, LogOut, Download, Trash2, Plus, RefreshCw, Check, Ban } from 'lucide-react';
import { Navbar, Footer, StatusBadge, Modal, useNow } from '@/components/ui';
import { list, put, del, resetDemo, isLive } from '@/lib/db';
import { currentDay, cellStatus, earned, totalPoints, subId, questionRange, avgPct, streak } from '@/lib/logic';

const TABS = [['tracker', Table2, 'Tracker'], ['homework', BookPlus, 'Homework'], ['exams', FileSpreadsheet, 'Exams'], ['students', Users, 'Students']];
const uid = () => Math.random().toString(36).slice(2, 10);

export default function Admin() {
  const router = useRouter();
  const now = useNow(30000);
  const [tab, setTab] = useState('tracker');
  const [ok, setOk] = useState(false);
  const [D, setD] = useState({ students: [], assignments: [], submissions: [], scores: [] });
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const [students, assignments, submissions, scores] = await Promise.all(['students', 'assignments', 'submissions', 'scores'].map(list));
      setD({ students, assignments, submissions, scores }); setErr('');
    } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => {
    if (sessionStorage.getItem('mm_admin') !== '1') return router.replace('/');
    setOk(true); load(); const i = setInterval(load, 20000); return () => clearInterval(i);
  }, [load, router]);
  if (!ok) return null;

  const a = [...D.assignments].sort((x, y) => new Date(y.start) - new Date(x.start))[0] || null;
  const act = async (fn) => { try { await fn(); await load(); } catch (e) { setErr(e.message); } };
  const out = <button className="btn btn-ghost !py-2 text-sm" onClick={() => { sessionStorage.removeItem('mm_admin'); router.push('/'); }}><LogOut size={16} />Log out</button>;

  return (
    <>
      <Navbar right={out} />
      <main className="mx-auto max-w-6xl px-4 pt-6">
        <h1 className="text-2xl font-extrabold text-white">Teacher dashboard · لوحة المعلم</h1>
        {err && <p className="mt-2 text-sm text-red-400" role="alert">{err}</p>}
        <nav className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist">
          {TABS.map(([k, Icon, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold ${tab === k ? 'border-cyan2 bg-neon/15 text-cyan2' : 'border-neon/25 text-slate-300'}`}><Icon size={16} />{l}</button>
          ))}
        </nav>
        <div className="mt-5">
          {tab === 'tracker' && <Tracker D={D} a={a} now={now} act={act} />}
          {tab === 'homework' && <Homework a={a} act={act} />}
          {tab === 'exams' && <Exams D={D} act={act} />}
          {tab === 'students' && <Students D={D} a={a} now={now} act={act} />}
        </div>
        {!isLive && <button className="btn btn-ghost mt-8 !py-2 text-xs" onClick={() => act(async () => { if (confirm('Reset demo data?')) await resetDemo(); })}><RefreshCw size={14} />Reset demo data</button>}
      </main>
      <Footer />
    </>
  );
}

/* ---------------- Tracker ---------------- */
function Tracker({ D, a, now, act }) {
  const [grade, setGrade] = useState('All');
  const [cell, setCell] = useState(null);
  if (!a) return <p className="text-slate-300">Create a homework batch first (Homework tab).</p>;
  const grades = ['All', ...new Set(D.students.map((s) => s.grade))];
  const rows = D.students.filter((s) => grade === 'All' || s.grade === grade);
  const sub = (sid, d) => D.submissions.find((x) => x.id === subId(a, sid, d));
  const cd = currentDay(a, now);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <select className="input !w-auto" value={grade} onChange={(e) => setGrade(e.target.value)} aria-label="Filter by grade">{grades.map((g) => <option key={g}>{g}</option>)}</select>
        <span className="text-sm text-slate-300">{a.title} · today is {cd < 1 ? 'not started' : cd > a.days ? 'finished' : `Day ${cd}`}</span>
        <span className="ml-auto flex gap-2"><StatusBadge status="submitted" short /><StatusBadge status="pending" short /><StatusBadge status="missed" short /><StatusBadge status="rejected" short /></span>
      </div>
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead><tr className="border-b border-neon/25 text-left text-slate-300">
            <th className="p-3">Student</th>
            {Array.from({ length: a.days }, (_, i) => <th key={i} className="p-3 text-center">D{i + 1}</th>)}
            <th className="p-3 text-center">Points</th>
          </tr></thead>
          <tbody>
            {rows.map((s) => {
              const mine = D.submissions.filter((x) => x.studentId === s.id && x.assignmentId === a.id);
              return (
                <tr key={s.id} className="border-b border-neon/10">
                  <td className="p-3"><div className="font-semibold text-white">{s.name}</div><div className="text-xs text-slate-400">{s.grade} · {s.code}</div></td>
                  {Array.from({ length: a.days }, (_, i) => {
                    const d = i + 1, st = cellStatus(a, sub(s.id, d), d, now);
                    return <td key={d} className="p-2 text-center"><button onClick={() => setCell({ s, d })} aria-label={`${s.name} day ${d}`}><StatusBadge status={st} short /></button></td>;
                  })}
                  <td className="p-3 text-center font-bold neon-text">{earned(mine)}/{totalPoints(a)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={a.days + 2} className="p-6 text-center text-slate-400">No students yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {cell && <CellModal a={a} now={now} {...cell} sub={sub(cell.s.id, cell.d)} act={act} onClose={() => setCell(null)} />}
    </>
  );
}

function CellModal({ a, s, d, sub, now, act, onClose }) {
  const st = cellStatus(a, sub, d, now);
  const [pts, setPts] = useState(sub?.points ?? a.pts);
  const [big, setBig] = useState(null);
  const [x, y] = questionRange(a, d);
  const save = (patch) => act(async () => { await put('submissions', { ...sub, ...patch }); onClose(); });
  const grant = () => act(async () => { await put('submissions', { id: subId(a, s.id, d), assignmentId: a.id, studentId: s.id, day: d, images: [], note: 'Granted by teacher', status: 'submitted', points: a.pts, at: Date.now() }); onClose(); });
  return (
    <Modal onClose={onClose} title={`${s.name} — Day ${d} (Q${x}–${y})`} wide>
      <div className="mb-3 flex items-center gap-2"><StatusBadge status={st} />{sub && <span className="text-xs text-slate-400">{new Date(sub.at).toLocaleString()}</span>}</div>
      {sub ? (
        <>
          {sub.note && <p className="mb-3 rounded-lg bg-ink/70 p-3 text-sm text-slate-200">“{sub.note}”</p>}
          {sub.images.length === 0 ? <p className="text-sm text-slate-400">No images (teacher override).</p> : (
            <>
              {big !== null && <img src={sub.images[big]} alt="Homework" className="mx-auto mb-3 max-h-[55vh] rounded-lg border border-neon/30 bg-white" />}
              <div className="flex flex-wrap gap-2">{sub.images.map((src, i) => <button key={i} onClick={() => setBig(i)} className={`h-20 w-20 overflow-hidden rounded-md border-2 ${big === i ? 'border-cyan2' : 'border-neon/30'}`}><img src={src} alt={`Page ${i + 1}`} className="h-full w-full object-cover" /></button>)}</div>
              {big === null && <p className="mt-2 text-xs text-slate-400">Tap a thumbnail to enlarge.</p>}
            </>
          )}
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <label className="text-sm">Points (0–{a.pts})<input type="number" min="0" max={a.pts} className="input mt-1 !w-28" value={pts} onChange={(e) => setPts(e.target.value)} /></label>
            <button className="btn" onClick={() => save({ status: 'submitted', points: Math.max(0, Math.min(a.pts, +pts || 0)) })}><Check size={16} />Save points</button>
            <button className="btn btn-danger" onClick={() => save({ status: 'rejected', points: 0 })}><Ban size={16} />Reject (0 pts)</button>
          </div>
        </>
      ) : st === 'locked' ? <p className="text-slate-300">This day has not opened yet.</p> : (
        <>
          <p className="text-slate-300">{st === 'missed' ? 'No submission before the deadline. Late uploads are locked for the student.' : 'The student has not submitted yet.'}</p>
          <button className="btn mt-4" onClick={grant}><Check size={16} />Override: mark as submitted ({a.pts} pts)</button>
        </>
      )}
    </Modal>
  );
}

/* ---------------- Homework ---------------- */
function Homework({ a, act }) {
  const local = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [f, setF] = useState({ title: '', total: 70, days: 7, pts: 10, start: local(new Date()) });
  const [msg, setMsg] = useState('');
  const per = Math.ceil(f.total / f.days);
  const create = (e) => {
    e.preventDefault();
    if (+f.total < +f.days) return setMsg('Total questions must be at least the number of days.');
    act(async () => { await put('assignments', { id: 'a_' + uid(), title: f.title, total: +f.total, days: +f.days, pts: +f.pts, start: new Date(f.start).toISOString() }); setMsg('Published. Students see Day 1 at the start time.'); });
  };
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <form onSubmit={create} className="panel space-y-3 p-5">
        <h2 className="text-lg font-bold text-white">New weekly homework</h2>
        <input className="input" placeholder="Title (e.g. Week 2 — Geometry)" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required />
        <div className="grid grid-cols-3 gap-3">
          {[['total', 'Questions'], ['days', 'Days'], ['pts', 'Pts / day']].map(([k, l]) => <label key={k} className="text-xs text-slate-300">{l}<input type="number" min="1" className="input mt-1" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} required /></label>)}
        </div>
        <label className="block text-xs text-slate-300">Day 1 opens at (each day lasts 24 hours)<input type="datetime-local" className="input mt-1" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} required /></label>
        <p className="text-sm text-cyan2">{per} questions a day · {f.days * f.pts} points in total</p>
        {msg && <p className="text-sm text-emerald-300">{msg}</p>}
        <button className="btn w-full"><Plus size={18} />Publish homework</button>
      </form>
      <div className="panel p-5">
        <h2 className="text-lg font-bold text-white">Daily schedule</h2>
        <p className="mb-3 text-sm text-slate-400">{a ? `Active: ${a.title}` : 'Nothing published yet.'}</p>
        <ul className="space-y-1 text-sm">
          {(a ? Array.from({ length: a.days }, (_, i) => i + 1) : []).map((d) => { const [x, y] = questionRange(a, d); const t = new Date(new Date(a.start).getTime() + (d - 1) * 86400000); return <li key={d} className="flex justify-between border-b border-neon/10 py-1"><span>Day {d}: Q{x}–{y}</span><span className="text-slate-400">{t.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span></li>; })}
        </ul>
      </div>
    </div>
  );
}

/* ---------------- Exams ---------------- */
function Exams({ D, act }) {
  const [f, setF] = useState({ type: 'quiz', studentId: '', title: '', score: '', max: 20 });
  const add = (e) => { e.preventDefault(); act(async () => { await put('scores', { id: 'sc_' + uid(), ...f, score: +f.score, max: +f.max }); setF({ ...f, title: '', score: '' }); }); };
  const nm = (id) => D.students.find((s) => s.id === id)?.name || '—';
  return (
    <div className="space-y-5">
      <form onSubmit={add} className="panel grid gap-3 p-5 sm:grid-cols-6">
        <select className="input sm:col-span-2" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value, max: e.target.value === 'quiz' ? 20 : 50 })}><option value="quiz">Session quiz · امتحان الحصة</option><option value="monthly">Monthly exam · امتحان الشهر</option></select>
        <select className="input sm:col-span-2" value={f.studentId} onChange={(e) => setF({ ...f, studentId: e.target.value })} required><option value="">Student…</option>{D.students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <input className="input sm:col-span-2" placeholder="Title (Quiz 2)" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required />
        <input type="number" step="0.5" className="input sm:col-span-2" placeholder="Score" value={f.score} onChange={(e) => setF({ ...f, score: e.target.value })} required />
        <input type="number" className="input sm:col-span-2" placeholder="Out of" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })} required />
        <button className="btn sm:col-span-2"><Plus size={18} />Add score</button>
      </form>
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead><tr className="border-b border-neon/25 text-left text-slate-300"><th className="p-3">Student</th><th className="p-3">Type</th><th className="p-3">Title</th><th className="p-3">Score</th><th className="p-3">Out of</th><th /></tr></thead>
          <tbody>{D.scores.map((r) => <ScoreRow key={r.id} r={r} name={nm(r.studentId)} act={act} />)}
            {D.scores.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-slate-400">No scores yet. Add the first one above.</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
}
function ScoreRow({ r, name, act }) {
  const [sc, setSc] = useState(r.score), [mx, setMx] = useState(r.max);
  const commit = () => (+sc !== r.score || +mx !== r.max) && act(() => put('scores', { ...r, score: +sc, max: +mx }));
  return (
    <tr className="border-b border-neon/10">
      <td className="p-3 text-white">{name}</td><td className="p-3">{r.type === 'quiz' ? 'Quiz' : 'Monthly'}</td><td className="p-3">{r.title}</td>
      <td className="p-2"><input type="number" step="0.5" className="input !w-20 !py-1" value={sc} onChange={(e) => setSc(e.target.value)} onBlur={commit} aria-label="Score" /></td>
      <td className="p-2"><input type="number" className="input !w-20 !py-1" value={mx} onChange={(e) => setMx(e.target.value)} onBlur={commit} aria-label="Out of" /></td>
      <td className="p-2"><button aria-label="Delete score" className="text-red-400" onClick={() => confirm('Delete this score?') && act(() => del('scores', r.id))}><Trash2 size={16} /></button></td>
    </tr>
  );
}

/* ---------------- Students ---------------- */
function Students({ D, a, now, act }) {
  const [f, setF] = useState({ name: '', grade: 'Prep 2', group: 'A' });
  const nextCode = useMemo(() => 'MATH-' + (Math.max(100, ...D.students.map((s) => parseInt(s.code.split('-')[1]) || 0)) + 1), [D.students]);
  const add = (e) => { e.preventDefault(); act(async () => { await put('students', { id: 's_' + uid(), code: nextCode, ...f, name: f.name.trim() }); setF({ ...f, name: '' }); }); };
  const remove = (s) => confirm(`Remove ${s.name} and all their data?`) && act(async () => {
    await del('students', s.id);
    for (const x of D.submissions.filter((x) => x.studentId === s.id)) await del('submissions', x.id);
    for (const x of D.scores.filter((x) => x.studentId === s.id)) await del('scores', x.id);
  });
  function exportCsv() {
    const head = ['Name', 'Code', 'Grade', 'Group', 'Homework points', 'Total points', 'Streak', 'Quiz avg %', 'Monthly avg %'];
    const rows = D.students.map((s) => {
      const mine = a ? D.submissions.filter((x) => x.studentId === s.id && x.assignmentId === a.id) : [];
      const sc = D.scores.filter((x) => x.studentId === s.id);
      return [s.name, s.code, s.grade, s.group, earned(mine), a ? totalPoints(a) : 0, a ? streak(a, mine, now) : 0, avgPct(sc.filter((x) => x.type === 'quiz')) ?? '', avgPct(sc.filter((x) => x.type === 'monthly')) ?? ''];
    });
    const csv = '\ufeff' + [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const el = document.createElement('a'); el.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); el.download = 'mathmatica-report.csv'; el.click();
  }
  const grades = [...new Set(['Prep 2', 'Prep 3', 'Sec 1', ...D.students.map((s) => s.grade)])];
  return (
    <div className="space-y-5">
      <form onSubmit={add} className="panel grid gap-3 p-5 sm:grid-cols-5">
        <input className="input sm:col-span-2" placeholder="Student full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
        <input className="input" list="grades" value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })} aria-label="Grade" /><datalist id="grades">{grades.map((g) => <option key={g} value={g} />)}</datalist>
        <input className="input" placeholder="Group" value={f.group} onChange={(e) => setF({ ...f, group: e.target.value })} aria-label="Group" />
        <button className="btn"><Plus size={18} />Add · {nextCode}</button>
      </form>
      <div className="flex justify-end"><button className="btn btn-ghost !py-2 text-sm" onClick={exportCsv}><Download size={16} />Export report (CSV)</button></div>
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead><tr className="border-b border-neon/25 text-left text-slate-300"><th className="p-3">Name</th><th className="p-3">Login code</th><th className="p-3">Grade</th><th className="p-3">Group</th><th /></tr></thead>
          <tbody>{D.students.map((s) => (
            <tr key={s.id} className="border-b border-neon/10"><td className="p-3 text-white">{s.name}</td><td className="p-3 font-mono neon-text">{s.code}</td><td className="p-3">{s.grade}</td><td className="p-3">{s.group}</td>
              <td className="p-2"><button aria-label={`Remove ${s.name}`} className="text-red-400" onClick={() => remove(s)}><Trash2 size={16} /></button></td></tr>))}
            {D.students.length === 0 && <tr><td colSpan="5" className="p-6 text-center text-slate-400">Add your first student above to generate a login code.</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
}
