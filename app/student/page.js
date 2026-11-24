'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Flame, Trophy, ClipboardCheck, GraduationCap, Camera, ImagePlus, Timer, Send, LogOut, X, Eye } from 'lucide-react';
import { Navbar, Footer, Stat, StatusBadge, Lightbox, useNow } from '@/components/ui';
import { list, put, uploadImage } from '@/lib/db';
import { currentDay, dayWindow, questionRange, cellStatus, earned, totalPoints, streak, fmtCountdown, subId, avgPct, pct } from '@/lib/logic';

export default function StudentPage() {
  const router = useRouter();
  const now = useNow(1000);
  const [st, setSt] = useState(null);
  const [a, setA] = useState(null);
  const [subs, setSubs] = useState([]);
  const [scores, setScores] = useState([]);
  const [ready, setReady] = useState(false);
  const [files, setFiles] = useState([]); // {file, url}
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [view, setView] = useState(null);
  const cam = useRef(null), gal = useRef(null);

  const load = useCallback(async () => {
    const id = localStorage.getItem('mm_student');
    if (!id) return router.replace('/');
    const [S, A, SB, SC] = await Promise.all([list('students'), list('assignments'), list('submissions'), list('scores')]);
    const me = S.find((x) => x.id === id);
    if (!me) { localStorage.removeItem('mm_student'); return router.replace('/'); }
    const cur = [...A].sort((x, y) => new Date(y.start) - new Date(x.start))[0] || null;
    setSt(me); setA(cur); setSubs(SB.filter((x) => x.studentId === id && cur && x.assignmentId === cur.id)); setScores(SC.filter((x) => x.studentId === id)); setReady(true);
  }, [router]);
  useEffect(() => { load().catch((e) => setMsg({ err: e.message })); }, [load]);

  if (!ready) return <><Navbar /><p className="p-10 text-center text-slate-300">Loading…</p></>;

  const logout = <button className="btn btn-ghost !py-2 text-sm" onClick={() => { localStorage.removeItem('mm_student'); router.push('/'); }}><LogOut size={16} />Log out</button>;
  if (!a) return <><Navbar right={logout} /><p className="p-10 text-center text-slate-300">No homework has been published yet. Check back soon.</p><Footer /></>;

  const cd = currentDay(a, now);
  const active = cd >= 1 && cd <= a.days;
  const bySub = Object.fromEntries(subs.map((s) => [s.day, s]));
  const todaySub = active ? bySub[cd] : null;
  const w = active ? dayWindow(a, cd) : null;
  const left = w ? w.end - now : 0;
  const [qa, qb] = active ? questionRange(a, cd) : [0, 0];
  const pts = earned(subs), total = totalPoints(a);
  const quiz = scores.filter((s) => s.type === 'quiz'), month = scores.filter((s) => s.type === 'monthly');

  function addFiles(list_) {
    const arr = [...list_].filter((f) => f.type.startsWith('image/')).map((file) => ({ file, url: URL.createObjectURL(file) }));
    setFiles((p) => [...p, ...arr]);
  }
  async function submit() {
    setMsg(null);
    if (Date.now() >= w.end) return setMsg({ err: 'Today’s window just closed. This day is now locked.' });
    if (!files.length) return setMsg({ err: 'Add at least one photo of your steps first.' });
    setBusy(true);
    try {
      const urls = [];
      for (let i = 0; i < files.length; i++) urls.push(await uploadImage(files[i].file, `${a.id}/${st.id}/day${cd}_${Date.now()}_${i}.jpg`));
      await put('submissions', { id: subId(a, st.id, cd), assignmentId: a.id, studentId: st.id, day: cd, images: urls, note, status: 'submitted', points: a.pts, at: Date.now() });
      files.forEach((f) => URL.revokeObjectURL(f.url)); setFiles([]); setNote('');
      await load(); setMsg({ ok: `Day ${cd} submitted. +${a.pts} points!` });
    } catch (e) { setMsg({ err: 'Upload failed: ' + e.message + '. Check your connection and try again.' }); }
    setBusy(false);
  }

  return (
    <>
      <Navbar right={logout} />
      <main className="mx-auto max-w-5xl space-y-6 px-4 pt-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Hi {st.name.split(' ')[0]} 👋</h1>
          <p className="text-sm text-slate-400">{st.grade} · Group {st.group} · Code {st.code}</p>
        </div>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat icon={Trophy} label="Homework points" value={`${pts}/${total}`} />
          <Stat icon={Flame} label="Streak" value={`🔥 ${streak(a, subs, now)}`} sub="days in a row" />
          <Stat icon={ClipboardCheck} label="Session quizzes (امتحانات الحصة)" value={avgPct(quiz) === null ? '—' : avgPct(quiz) + '%'} sub={`${quiz.length} taken`} />
          <Stat icon={GraduationCap} label="Monthly exams (امتحانات الشهر)" value={avgPct(month) === null ? '—' : avgPct(month) + '%'} sub={`${month.length} taken`} />
        </section>

        <section className="panel panel-glow pulse-glow p-5 sm:p-6" aria-live="polite">
          {cd < 1 && <p className="text-lg text-white">Week starts in <span className="neon-text">{fmtCountdown(dayWindow(a, 1).start - now)}</span>.</p>}
          {cd > a.days && <p className="text-lg text-white">This week’s homework is finished. You earned <span className="neon-text">{pts}/{total}</span> points.</p>}
          {active && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-300">{a.title}</p>
                  <h2 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">Day {cd}: Solve questions {qa} to {qb}</h2>
                  <p dir="rtl" className="mt-1 text-slate-400">اليوم {cd}: حل الأسئلة من {qa} إلى {qb}</p>
                </div>
                <div className="rounded-xl border border-neon/40 bg-ink/70 px-4 py-2 text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-slate-300"><Timer size={14} />Time left</div>
                  <div className={`font-mono text-3xl font-bold ${left < 3600000 ? 'text-red-400' : 'neon-text'}`}>{fmtCountdown(left)}</div>
                </div>
              </div>

              {todaySub && <p className="mt-4 flex flex-wrap items-center gap-2 text-sm"><StatusBadge status={todaySub.status === 'rejected' ? 'rejected' : 'submitted'} /> {todaySub.status === 'rejected' ? 'Your teacher asked you to redo this day. Upload again before the timer ends.' : 'Submitted. You can replace your photos until the timer ends.'}
                <button className="btn btn-ghost !py-1 text-xs" onClick={() => setView(todaySub)}><Eye size={14} />View</button></p>}

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button className="btn" onClick={() => cam.current.click()}><Camera size={18} />Take photo</button>
                <button className="btn btn-ghost" onClick={() => gal.current.click()}><ImagePlus size={18} />From gallery</button>
                <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
                <input ref={gal} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
              </div>

              {files.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <div key={f.url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-neon/40">
                      <img src={f.url} alt={`Selected photo ${i + 1}`} className="h-full w-full object-cover" />
                      <button aria-label="Remove photo" onClick={() => setFiles((p) => p.filter((x) => x !== f))} className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
              <textarea className="input mt-4" rows={2} placeholder="Note for your teacher (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
              {msg && <p role="alert" className={`mt-3 text-sm ${msg.err ? 'text-red-400' : 'text-emerald-300'}`}>{msg.err || msg.ok}</p>}
              <button className="btn mt-4 w-full sm:w-auto" disabled={busy || !files.length} onClick={submit}><Send size={18} />{busy ? 'Uploading…' : todaySub ? 'Replace today’s homework' : 'Submit today’s homework'}</button>
            </>
          )}
        </section>

        <section className="panel p-5">
          <h2 className="mb-4 text-lg font-bold text-white">This week</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {Array.from({ length: a.days }, (_, i) => i + 1).map((d) => {
              const s = cellStatus(a, bySub[d], d, now); const [x, y] = questionRange(a, d);
              return (
                <button key={d} disabled={!bySub[d]} onClick={() => setView(bySub[d])} className={`rounded-xl border p-3 text-left ${d === cd ? 'border-cyan2 shadow-neon' : 'border-neon/25'}`}>
                  <div className="font-bold text-white">Day {d}</div>
                  <div className="mb-2 text-xs text-slate-400">Q{x}–{y}</div>
                  <StatusBadge status={s} short />
                </button>
              );
            })}
          </div>
          <PointsChart a={a} bySub={bySub} cd={cd} />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <ScoreList title="Session quizzes · امتحانات الحصة" rows={quiz} />
          <ScoreList title="Monthly exams · امتحانات الشهر" rows={month} />
        </section>
      </main>
      <Footer />
      {view && <Lightbox images={view.images} title={`Day ${view.day} homework`} onClose={() => setView(null)} />}
    </>
  );
}

function PointsChart({ a, bySub, cd }) {
  const W = 100 / a.days;
  return (
    <svg viewBox="0 0 100 40" className="mt-5 h-36 w-full" role="img" aria-label="Points earned per day">
      {[0, 0.5, 1].map((g) => <line key={g} x1="0" x2="100" y1={34 - g * 30} y2={34 - g * 30} stroke="rgba(0,168,255,.2)" strokeWidth=".3" />)}
      {Array.from({ length: a.days }, (_, i) => {
        const d = i + 1, p = bySub[d]?.status === 'submitted' ? bySub[d].points : 0, h = (p / a.pts) * 30;
        return (
          <g key={d}>
            <rect x={i * W + W * 0.2} y={34 - Math.max(h, 0.8)} width={W * 0.6} height={Math.max(h, 0.8)} rx="1" fill={p ? '#00A8FF' : d < cd ? '#ff5a73' : '#26406b'} style={{ filter: p ? 'drop-shadow(0 0 1.5px #00E5FF)' : 'none' }} />
            <text x={i * W + W / 2} y="39" fontSize="3" textAnchor="middle" fill="#9fb4d6">D{d}</text>
          </g>
        );
      })}
    </svg>
  );
}

function ScoreList({ title, rows }) {
  return (
    <div className="panel p-5">
      <h3 className="mb-3 font-bold text-white">{title}</h3>
      {rows.length === 0 ? <p className="text-sm text-slate-400">No results yet.</p> : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <div className="flex justify-between text-sm"><span>{r.title}</span><span className="neon-text">{r.score}/{r.max}</span></div>
              <div className="mt-1 h-2 rounded-full bg-ink"><div className="h-2 rounded-full bg-neon shadow-neon" style={{ width: pct(r.score, r.max) + '%' }} /></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
