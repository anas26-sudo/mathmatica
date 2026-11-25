'use client';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Table2, BookPlus, FileSpreadsheet, Users, LogOut, Download, Trash2, Plus, RefreshCw, Check, Ban, Edit3, RotateCcw, FileText, X, Upload, Paperclip, ExternalLink } from 'lucide-react';
import { Navbar, Footer, StatusBadge, Modal, useNow } from '@/components/ui';
import { list, put, del, resetDemo, isLive, uploadImage } from '@/lib/db';
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
  const [selectedHwId, setSelectedHwId] = useState('');

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

  const sortedHw = useMemo(() => [...D.assignments].sort((x, y) => (y.createdAt || new Date(y.start).getTime()) - (x.createdAt || new Date(x.start).getTime())), [D.assignments]);

  useEffect(() => {
    if (sortedHw.length && (!selectedHwId || !sortedHw.find((x) => x.id === selectedHwId))) {
      setSelectedHwId(sortedHw[0].id);
    }
  }, [sortedHw, selectedHwId]);

  if (!ok) return null;

  const a = sortedHw.find((x) => x.id === selectedHwId) || sortedHw[0] || null;
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
          {tab === 'tracker' && <Tracker D={D} sortedHw={sortedHw} a={a} setSelectedHwId={setSelectedHwId} now={now} act={act} />}
          {tab === 'homework' && <Homework D={D} sortedHw={sortedHw} a={a} setSelectedHwId={setSelectedHwId} act={act} />}
          {tab === 'exams' && <Exams D={D} act={act} />}
          {tab === 'students' && <Students D={D} sortedHw={sortedHw} now={now} act={act} />}
        </div>
        {!isLive && <button className="btn btn-ghost mt-8 !py-2 text-xs" onClick={() => act(async () => { if (confirm('Reset demo data?')) await resetDemo(); })}><RefreshCw size={14} />Reset demo data</button>}
      </main>
      <Footer />
    </>
  );
}

/* ---------------- Tracker ---------------- */
function Tracker({ D, sortedHw, a, setSelectedHwId, now, act }) {
  const [grade, setGrade] = useState('All');
  const [group, setGroup] = useState('All');
  const [cell, setCell] = useState(null);
  if (!a) return <p className="text-slate-300">Create a homework batch first (Homework tab).</p>;

  const grades = ['All', ...new Set(D.students.map((s) => s.grade))];
  const groups = ['All', ...new Set(D.students.map((s) => s.group))];

  const rows = D.students.filter((s) => {
    const matchHwGrade = !a.targetGrade || a.targetGrade === 'All' || s.grade === a.targetGrade;
    const matchHwGroup = !a.targetGroup || a.targetGroup === 'All' || s.group === a.targetGroup;
    const matchFilterGrade = grade === 'All' || s.grade === grade;
    const matchFilterGroup = group === 'All' || s.group === group;
    return matchHwGrade && matchHwGroup && matchFilterGrade && matchFilterGroup;
  });

  const sub = (sid, d) => D.submissions.find((x) => x.id === subId(a, sid, d));
  const cd = currentDay(a, now);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <select className="input !w-auto font-semibold text-cyan2" value={a.id} onChange={(e) => setSelectedHwId(e.target.value)} aria-label="Select Homework">
          {sortedHw.map((hw) => <option key={hw.id} value={hw.id}>{hw.title} ({hw.targetGrade || 'All'} · {hw.targetGroup || 'All'})</option>)}
        </select>
        <select className="input !w-auto" value={grade} onChange={(e) => setGrade(e.target.value)} aria-label="Filter by grade">{grades.map((g) => <option key={g} value={g}>{g === 'All' ? 'All Grades' : g}</option>)}</select>
        <select className="input !w-auto" value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Filter by group">{groups.map((g) => <option key={g} value={g}>{g === 'All' ? 'All Groups' : g}</option>)}</select>
        <span className="text-sm text-slate-300">{cd < 1 ? 'Not started' : cd > a.days ? 'Finished' : `Day ${cd}`}</span>
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
                  <td className="p-3"><div className="font-semibold text-white">{s.name}</div><div className="text-xs text-slate-400">{s.grade} · {s.group} · {s.code}</div></td>
                  {Array.from({ length: a.days }, (_, i) => {
                    const d = i + 1, st = cellStatus(a, sub(s.id, d), d, now);
                    return <td key={d} className="p-2 text-center"><button onClick={() => setCell({ s, d })} aria-label={`${s.name} day ${d}`}><StatusBadge status={st} short /></button></td>;
                  })}
                  <td className="p-3 text-center font-bold neon-text">{earned(mine)}/{totalPoints(a)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={a.days + 2} className="p-6 text-center text-slate-400">No students match this homework target/filter.</td></tr>}
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
function Homework({ D, sortedHw, a, setSelectedHwId, act }) {
  const local = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [f, setF] = useState({ title: '', total: 70, days: 7, pts: 10, start: local(new Date()), targetGrade: 'All', targetGroup: 'All' });
  const [sheetFiles, setSheetFiles] = useState([]);
  const [existingSheets, setExistingSheets] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [uploadingDay, setUploadingDay] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const dayFileRef = useRef(null);
  const [targetDayForUpload, setTargetDayForUpload] = useState(null);

  const availableGrades = ['All', ...new Set(['Prep 2', 'Prep 3', 'Sec 1', ...D.students.map((s) => s.grade)])];
  const availableGroups = ['All', ...new Set(D.students.map((s) => s.group))];

  const per = Math.ceil((+f.total || 1) / (+f.days || 1));

  const uploadAttachments = async (fileList, prefix) => {
    const uploaded = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = file.name.split('.').pop() || 'file';
      const url = await uploadImage(file, `sheets/${prefix}_${Date.now()}_${i}.${ext}`);
      uploaded.push({ name: file.name, url, isPdf: file.type === 'application/pdf' || ext.toLowerCase() === 'pdf' });
    }
    return uploaded;
  };

  const saveHw = (e) => {
    e.preventDefault();
    if (+f.total < +f.days) return setMsg('Total questions must be at least the number of days.');
    setBusy(true);
    act(async () => {
      try {
        const id = editingId || ('a_' + uid());
        const existing = D.assignments.find((x) => x.id === editingId);
        const newlyUploaded = sheetFiles.length ? await uploadAttachments(sheetFiles, `${id}_general`) : [];
        const finalSheets = [...existingSheets, ...newlyUploaded];

        await put('assignments', {
          id,
          title: f.title,
          total: +f.total,
          days: +f.days,
          pts: +f.pts,
          start: new Date(f.start).toISOString(),
          targetGrade: f.targetGrade,
          targetGroup: f.targetGroup,
          sheets: finalSheets,
          dayFiles: existing?.dayFiles || {},
          createdAt: existing?.createdAt || Date.now()
        });
        setSelectedHwId(id);
        setMsg(editingId ? 'Homework updated successfully!' : 'Published! Students can now view the questions and submit.');
        setEditingId(null);
        setSheetFiles([]);
        setExistingSheets([]);
        setF({ title: '', total: 70, days: 7, pts: 10, start: local(new Date()), targetGrade: 'All', targetGroup: 'All' });
      } finally {
        setBusy(false);
      }
    });
  };

  const startEdit = (hw) => {
    setEditingId(hw.id);
    setF({
      title: hw.title,
      total: hw.total,
      days: hw.days,
      pts: hw.pts,
      start: local(new Date(hw.start)),
      targetGrade: hw.targetGrade || 'All',
      targetGroup: hw.targetGroup || 'All'
    });
    setExistingSheets(hw.sheets || []);
    setSheetFiles([]);
    setMsg('');
  };

  const handleDayUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length || !a || !targetDayForUpload) return;
    const day = targetDayForUpload;
    setUploadingDay(day);
    act(async () => {
      try {
        const uploaded = await uploadAttachments(files, `${a.id}_day${day}`);
        const currentDayFiles = a.dayFiles || {};
        const updatedDayFiles = {
          ...currentDayFiles,
          [day]: [...(currentDayFiles[day] || []), ...uploaded]
        };
        await put('assignments', { ...a, dayFiles: updatedDayFiles });
        setMsg(`Questions uploaded for Day ${day}!`);
      } finally {
        setUploadingDay(null);
        setTargetDayForUpload(null);
        e.target.value = '';
      }
    });
  };

  const clearDayFiles = (day) => {
    if (!a || !confirm(`Remove uploaded question files for Day ${day}?`)) return;
    act(async () => {
      const updatedDayFiles = { ...(a.dayFiles || {}) };
      delete updatedDayFiles[day];
      await put('assignments', { ...a, dayFiles: updatedDayFiles });
      setMsg(`Cleared Day ${day} files.`);
    });
  };

  const resetHwSubmissions = (hw) => {
    if (!confirm(`Reset all student submissions for "${hw.title}"? Students will be able to submit from scratch.`)) return;
    act(async () => {
      const targetSubs = D.submissions.filter((x) => x.assignmentId === hw.id);
      for (const s of targetSubs) await del('submissions', s.id);
      setMsg(`Reset complete (${targetSubs.length} submissions cleared).`);
    });
  };

  const deleteHw = (hw) => {
    if (!confirm(`Delete "${hw.title}" and all its submissions permanently?`)) return;
    act(async () => {
      await del('assignments', hw.id);
      const targetSubs = D.submissions.filter((x) => x.assignmentId === hw.id);
      for (const s of targetSubs) await del('submissions', s.id);
      if (editingId === hw.id) setEditingId(null);
      setMsg('Homework deleted.');
    });
  };

  return (
    <div className="space-y-6">
      <input ref={dayFileRef} type="file" accept="image/*,application/pdf" multiple hidden onChange={handleDayUpload} />
      <div className="grid gap-5 md:grid-cols-2">
        <form onSubmit={saveHw} className="panel space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">{editingId ? 'Edit homework' : 'New weekly homework'}</h2>
            {editingId && <button type="button" onClick={() => { setEditingId(null); setExistingSheets([]); setSheetFiles([]); setF({ title: '', total: 70, days: 7, pts: 10, start: local(new Date()), targetGrade: 'All', targetGroup: 'All' }); }} className="text-xs text-slate-400 hover:text-white flex items-center gap-1"><X size={14} />Cancel edit</button>}
          </div>
          <input className="input" placeholder="Title (e.g. Week 2 — Geometry)" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required />
          
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-slate-300">Target Grade (المرحلة)
              <select className="input mt-1" value={f.targetGrade} onChange={(e) => setF({ ...f, targetGrade: e.target.value })}>
                {availableGrades.map((g) => <option key={g} value={g}>{g === 'All' ? 'All Grades (الكل)' : g}</option>)}
              </select>
            </label>
            <label className="text-xs text-slate-300">Target Group (الجروب)
              <select className="input mt-1" value={f.targetGroup} onChange={(e) => setF({ ...f, targetGroup: e.target.value })}>
                {availableGroups.map((g) => <option key={g} value={g}>{g === 'All' ? 'All Groups (الكل)' : g}</option>)}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[['total', 'Questions'], ['days', 'Days'], ['pts', 'Pts / day']].map(([k, l]) => <label key={k} className="text-xs text-slate-300">{l}<input type="number" min="1" className="input mt-1" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} required /></label>)}
          </div>
          <label className="block text-xs text-slate-300">Day 1 opens at (each day lasts 24 hours)<input type="datetime-local" className="input mt-1" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} required /></label>

          <div className="rounded-lg border border-neon/25 bg-ink/50 p-3">
            <label className="block text-xs font-semibold text-cyan2 mb-1.5">Attach General Sheet / PDF or Images (ملف أو صور الأسئلة)</label>
            <input type="file" accept="image/*,application/pdf" multiple onChange={(e) => setSheetFiles([...e.target.files])} className="text-xs text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-neon/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-cyan2 hover:file:bg-neon/30" />
            {existingSheets.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {existingSheets.map((s, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-[11px] text-slate-200">
                    <Paperclip size={11} />{s.name}
                    <button type="button" onClick={() => setExistingSheets(existingSheets.filter((_, i) => i !== idx))} className="text-red-400 ml-1"><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <p className="text-sm text-cyan2">{per} questions a day · {f.days * f.pts} points in total</p>
          {msg && <p className="text-sm text-emerald-300">{msg}</p>}
          <button className="btn w-full" disabled={busy}>{busy ? 'Uploading & Saving...' : editingId ? <><Check size={18} />Save changes</> : <><Plus size={18} />Publish homework</>}</button>
        </form>

        <div className="panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="text-lg font-bold text-white">Daily schedule & Questions</h2>
            {a && (
              <div className="flex gap-1.5">
                <button onClick={() => startEdit(a)} className="btn btn-ghost !px-2.5 !py-1 text-xs" title="Edit this homework"><Edit3 size={13} />Edit</button>
                <button onClick={() => resetHwSubmissions(a)} className="btn btn-ghost !px-2.5 !py-1 text-xs text-amber-300" title="Clear all student submissions"><RotateCcw size={13} />Reset</button>
                <button onClick={() => deleteHw(a)} className="btn btn-danger !px-2.5 !py-1 text-xs" title="Delete homework"><Trash2 size={13} />Delete</button>
              </div>
            )}
          </div>
          <p className="mb-1 text-sm text-cyan2">{a ? `${a.title} (${a.targetGrade || 'All'} · ${a.targetGroup || 'All'})` : 'Nothing published yet.'}</p>
          {a?.sheets?.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span>General Sheet:</span>
              {a.sheets.map((s, i) => <a key={i} href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded bg-cyan2/15 px-2 py-0.5 text-cyan2 hover:underline"><ExternalLink size={11} />{s.name}</a>)}
            </div>
          )}
          <ul className="space-y-2 text-sm max-h-72 overflow-y-auto pr-1">
            {(a ? Array.from({ length: a.days }, (_, i) => i + 1) : []).map((d) => {
              const [x, y] = questionRange(a, d);
              const t = new Date(new Date(a.start).getTime() + (d - 1) * 86400000);
              const dFiles = a.dayFiles?.[d] || [];
              return (
                <li key={d} className="flex flex-wrap items-center justify-between gap-2 border-b border-neon/10 py-1.5">
                  <div>
                    <span className="font-semibold text-white">Day {d}: Q{x}–{y}</span>
                    <span className="block text-xs text-slate-400">{t.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {dFiles.length > 0 && (
                      <>
                        <a href={dFiles[0].url} target="_blank" rel="noreferrer" className="rounded bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/30">{dFiles.length} file(s)</a>
                        <button onClick={() => clearDayFiles(d)} className="text-red-400 p-1" title="Remove day files"><X size={13} /></button>
                      </>
                    )}
                    <button
                      disabled={uploadingDay === d}
                      onClick={() => { setTargetDayForUpload(d); dayFileRef.current.click(); }}
                      className="inline-flex items-center gap-1 rounded border border-cyan2/40 bg-cyan2/10 px-2 py-1 text-xs font-medium text-cyan2 hover:bg-cyan2/20"
                    >
                      <Upload size={12} />{uploadingDay === d ? 'Uploading...' : dFiles.length ? '+ More' : 'Upload Qs'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* All Published Homeworks List */}
      <div className="panel p-5">
        <h3 className="text-base font-bold text-white mb-3">All Published Homeworks ({sortedHw.length})</h3>
        {sortedHw.length === 0 ? <p className="text-sm text-slate-400">No homework batches created yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead><tr className="border-b border-neon/25 text-left text-slate-300">
                <th className="p-2.5">Title</th><th className="p-2.5">Target</th><th className="p-2.5">Questions / Days</th><th className="p-2.5">Start Date</th><th className="p-2.5 text-right">Actions</th>
              </tr></thead>
              <tbody>
                {sortedHw.map((hw) => (
                  <tr key={hw.id} onClick={() => setSelectedHwId(hw.id)} className={`cursor-pointer border-b border-neon/10 transition ${a?.id === hw.id ? 'bg-neon/10' : 'hover:bg-white/5'}`}>
                    <td className="p-2.5 font-semibold text-white">{hw.title} {a?.id === hw.id && <span className="ml-2 rounded bg-cyan2/20 px-1.5 py-0.5 text-[10px] text-cyan2">Selected</span>}</td>
                    <td className="p-2.5 text-cyan2">{hw.targetGrade || 'All'} · {hw.targetGroup || 'All'}</td>
                    <td className="p-2.5 text-slate-300">{hw.total} Qs / {hw.days} Days</td>
                    <td className="p-2.5 text-slate-400">{new Date(hw.start).toLocaleDateString()}</td>
                    <td className="p-2.5 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => startEdit(hw)} className="text-cyan2 hover:underline text-xs">Edit</button>
                      <button onClick={() => resetHwSubmissions(hw)} className="text-amber-300 hover:underline text-xs">Reset</button>
                      <button onClick={() => deleteHw(hw)} className="text-red-400 hover:underline text-xs">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
        <select className="input sm:col-span-2" value={f.studentId} onChange={(e) => setF({ ...f, studentId: e.target.value })} required><option value="">Student…</option>{D.students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>)}</select>
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
const genPin = () => String(Math.floor(1000 + Math.random() * 9000));

function Students({ D, sortedHw, now, act }) {
  const [f, setF] = useState({ name: '', grade: 'Prep 2', group: 'A' });
  const nextCode = useMemo(() => 'MATH-' + (Math.max(100, ...D.students.map((s) => parseInt(s.code.split('-')[1]) || 0)) + 1), [D.students]);
  const add = (e) => {
    e.preventDefault();
    act(async () => {
      await put('students', { id: 's_' + uid(), code: nextCode, pin: genPin(), ...f, name: f.name.trim(), notes: '' });
      setF({ ...f, name: '' });
    });
  };
  const generateMissingPins = () => {
    act(async () => {
      for (const s of D.students.filter((x) => !x.pin)) {
        await put('students', { ...s, pin: genPin() });
      }
    });
  };
  const remove = (s) => confirm(`Remove ${s.name} and all their data?`) && act(async () => {
    await del('students', s.id);
    for (const x of D.submissions.filter((x) => x.studentId === s.id)) await del('submissions', x.id);
    for (const x of D.scores.filter((x) => x.studentId === s.id)) await del('scores', x.id);
  });

  const getStudentHw = (s) => sortedHw.find((hw) => (!hw.targetGrade || hw.targetGrade === 'All' || hw.targetGrade === s.grade) && (!hw.targetGroup || hw.targetGroup === 'All' || hw.targetGroup === s.group)) || null;

  function exportCsv() {
    const head = ['Name', 'Code', 'PIN', 'Grade', 'Group', 'Homework points', 'Total points', 'Streak', 'Quiz avg %', 'Monthly avg %', 'Monthly Notes'];
    const rows = D.students.map((s) => {
      const hw = getStudentHw(s);
      const mine = hw ? D.submissions.filter((x) => x.studentId === s.id && x.assignmentId === hw.id) : [];
      const sc = D.scores.filter((x) => x.studentId === s.id);
      return [s.name, s.code, s.pin || '', s.grade, s.group, earned(mine), hw ? totalPoints(hw) : 0, hw ? streak(hw, mine, now) : 0, avgPct(sc.filter((x) => x.type === 'quiz')) ?? '', avgPct(sc.filter((x) => x.type === 'monthly')) ?? '', s.notes || ''];
    });
    const csv = '\ufeff' + [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const el = document.createElement('a'); el.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); el.download = 'mathmatica-report.csv'; el.click();
  }

  function printStudentPdf(targetStudents) {
    const monthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const cards = targetStudents.map((s) => {
      const hw = getStudentHw(s);
      const mine = hw ? D.submissions.filter((x) => x.studentId === s.id && x.assignmentId === hw.id) : [];
      const sc = D.scores.filter((x) => x.studentId === s.id);
      const qz = sc.filter((x) => x.type === 'quiz');
      const mn = sc.filter((x) => x.type === 'monthly');
      return `
        <div class="card">
          <div class="header">
            <div>
              <h1>Mathmatica</h1>
              <p class="sub">Monthly Student Performance Report · ${monthName}</p>
            </div>
            <div class="teacher">
              <strong>AI Eng. Anas Ayman</strong><br/>
              <span>01552645503 · 01040485663</span>
            </div>
          </div>
          <div class="info">
            <div><strong>Student:</strong> ${s.name}</div>
            <div><strong>Code / PIN:</strong> ${s.code} (PIN: ${s.pin || '—'})</div>
            <div><strong>Grade:</strong> ${s.grade}</div>
            <div><strong>Group:</strong> ${s.group}</div>
          </div>
          <div class="stats">
            <div class="stat"><span>Homework Points</span><strong>${earned(mine)} / ${hw ? totalPoints(hw) : 0}</strong></div>
            <div class="stat"><span>Current Streak</span><strong>${hw ? streak(hw, mine, now) : 0} Days</strong></div>
            <div class="stat"><span>Session Quizzes</span><strong>${avgPct(qz) !== null ? avgPct(qz) + '%' : 'N/A'}</strong></div>
            <div class="stat"><span>Monthly Exams</span><strong>${avgPct(mn) !== null ? avgPct(mn) + '%' : 'N/A'}</strong></div>
          </div>
          ${sc.length ? `<table><thead><tr><th>Assessment</th><th>Type</th><th>Score</th></tr></thead><tbody>${sc.map((r) => `<tr><td>${r.title}</td><td>${r.type === 'quiz' ? 'Session Quiz' : 'Monthly Exam'}</td><td>${r.score} / ${r.max}</td></tr>`).join('')}</tbody></table>` : ''}
          <div class="notes">
            <strong>Teacher Monthly Notes · ملاحظات المعلم:</strong>
            <p>${s.notes ? s.notes.replace(/\n/g, '<br/>') : 'Keep up the good work and maintain daily practice.'}</p>
          </div>
        </div>
      `;
    }).join('<div class="page-break"></div>');

    const w = window.open('', '_blank');
    w.document.write(`
      <html><head><title>Mathmatica Monthly Report</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; margin: 0; padding: 20px; background: #fff; }
        .card { border: 2px solid #0284c7; border-radius: 14px; padding: 24px; max-width: 750px; margin: 0 auto 20px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 18px; }
        .header h1 { margin: 0; color: #0284c7; font-size: 26px; }
        .sub { margin: 4px 0 0; color: #475569; font-size: 13px; }
        .teacher { text-align: right; font-size: 13px; color: #334155; }
        .info { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; background: #f8fafc; padding: 14px; border-radius: 10px; margin-bottom: 18px; font-size: 14px; }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }
        .stat { border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; text-align: center; }
        .stat span { display: block; font-size: 11px; color: #64748b; margin-bottom: 4px; }
        .stat strong { font-size: 18px; color: #0f172a; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 13px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
        th { background: #f1f5f9; }
        .notes { background: #f0f9ff; border-left: 4px solid #0284c7; padding: 14px; border-radius: 8px; font-size: 14px; }
        .notes p { margin: 6px 0 0; line-height: 1.6; }
        .page-break { page-break-after: always; }
        @media print { body { padding: 0; } .card { border: 1.5px solid #0284c7; } }
      </style></head><body>${cards}
      <script>window.onload = () => { window.print(); };</script>
      </body></html>
    `);
    w.document.close();
  }

  const grades = [...new Set(['Prep 2', 'Prep 3', 'Sec 1', ...D.students.map((s) => s.grade)])];
  const hasMissingPins = D.students.some((s) => !s.pin);

  return (
    <div className="space-y-5">
      <form onSubmit={add} className="panel grid gap-3 p-5 sm:grid-cols-5">
        <input className="input sm:col-span-2" placeholder="Student full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
        <input className="input" list="grades" value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })} aria-label="Grade" /><datalist id="grades">{grades.map((g) => <option key={g} value={g} />)}</datalist>
        <input className="input" placeholder="Group" value={f.group} onChange={(e) => setF({ ...f, group: e.target.value })} aria-label="Group" />
        <button className="btn"><Plus size={18} />Add · {nextCode}</button>
      </form>
      <div className="flex flex-wrap justify-end gap-2">
        {hasMissingPins && <button className="btn btn-ghost !py-2 text-sm text-amber-300" onClick={generateMissingPins}>Generate missing PINs</button>}
        <button className="btn !py-2 text-sm" onClick={() => printStudentPdf(D.students)} disabled={!D.students.length}><FileText size={16} />All Monthly PDFs</button>
        <button className="btn btn-ghost !py-2 text-sm" onClick={exportCsv}><Download size={16} />Export CSV</button>
      </div>
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead><tr className="border-b border-neon/25 text-left text-slate-300"><th className="p-3">Name</th><th className="p-3">Code</th><th className="p-3">PIN</th><th className="p-3">Grade & Group</th><th className="p-3">Monthly Notes (ملاحظات الشهر)</th><th className="p-3 text-right">Report / Delete</th></tr></thead>
          <tbody>{D.students.map((s) => <StudentRow key={s.id} s={s} act={act} remove={remove} onPdf={() => printStudentPdf([s])} />)}
            {D.students.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-slate-400">Add your first student above to generate a login code & PIN.</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
}

function StudentRow({ s, act, remove, onPdf }) {
  const [note, setNote] = useState(s.notes || '');
  useEffect(() => { setNote(s.notes || ''); }, [s.notes]);
  const saveNote = () => {
    if (note !== (s.notes || '')) act(() => put('students', { ...s, notes: note }));
  };
  const resetPin = () => {
    const newPin = genPin();
    act(() => put('students', { ...s, pin: newPin }));
  };
  return (
    <tr className="border-b border-neon/10">
      <td className="p-3 font-semibold text-white">{s.name}</td>
      <td className="p-3 font-mono neon-text">{s.code}</td>
      <td className="p-3 font-mono">
        <span className="rounded bg-amber-400/15 px-2 py-0.5 text-amber-300 font-bold">{s.pin || '—'}</span>
        <button onClick={resetPin} className="ml-1.5 text-[11px] text-slate-400 hover:text-cyan2 underline" title="Generate new PIN">New</button>
      </td>
      <td className="p-3 text-slate-300">{s.grade} · {s.group}</td>
      <td className="p-2">
        <input className="input !py-1.5 text-xs" placeholder="Write monthly note for PDF..." value={note} onChange={(e) => setNote(e.target.value)} onBlur={saveNote} />
      </td>
      <td className="p-3 text-right space-x-2">
        <button onClick={onPdf} className="inline-flex items-center gap-1 rounded bg-cyan2/15 px-2.5 py-1 text-xs font-semibold text-cyan2 hover:bg-cyan2/25" title="Download Monthly PDF"><FileText size={14} />PDF</button>
        <button aria-label={`Remove ${s.name}`} className="text-red-400 align-middle" onClick={() => remove(s)}><Trash2 size={16} /></button>
      </td>
    </tr>
  );
}