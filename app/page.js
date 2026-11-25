'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, UserRound, ShieldCheck, ArrowRight } from 'lucide-react';
import { Navbar, Footer, Logo } from '@/components/ui';
import { list, ADMIN_PASSWORD } from '@/lib/db';

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState('code'); // code | name | admin
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [group, setGroup] = useState('');
  const [pin, setPin] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [grades, setGrades] = useState([]);
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    list('students').then((s) => {
      setGrades([...new Set(s.map((x) => x.grade).filter(Boolean))]);
      setGroups([...new Set(s.map((x) => x.group).filter(Boolean))]);
    }).catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      if (mode === 'admin') {
        if (pw !== ADMIN_PASSWORD) throw new Error('Wrong password. Try again.');
        sessionStorage.setItem('mm_admin', '1'); router.push('/admin'); return;
      }
      const all = await list('students');
      const norm = (s) => String(s || '').trim().toLowerCase();
      const cleanPin = pin.trim();

      const st = mode === 'code'
        ? all.find((s) => norm(s.code) === norm(code))
        : all.find((s) => norm(s.name) === norm(name) && s.grade === grade && (!group || norm(s.group) === norm(group)));

      if (!st) {
        throw new Error(mode === 'code' ? 'No student has that code. Check it with your teacher.' : 'No match for that name, grade, and group.');
      }

      if (st.pin && String(st.pin).trim() !== cleanPin) {
        throw new Error('Incorrect 4-digit PIN. Ask your teacher for your PIN.');
      }
      if (!st.pin && !cleanPin) {
        throw new Error('Please enter your 4-digit PIN.');
      }

      localStorage.setItem('mm_student', st.id);
      router.push('/student');
    } catch (x) { setErr(x.message); setBusy(false); }
  }

  const tabs = [['code', KeyRound, 'Student code'], ['name', UserRound, 'Name + group'], ['admin', ShieldCheck, 'Teacher']];
  return (
    <>
      <Navbar />
      <main className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 md:grid-cols-2 md:pt-16">
        <section className="text-center md:text-left">
          <div className="mx-auto w-fit md:mx-0"><Logo size={150} /></div>
          <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-white sm:text-6xl" style={{ textShadow: '0 0 28px rgba(0,168,255,.55)' }}>Mathmatica</h1>
          <p className="mt-3 text-lg neon-text">“All things are numbers.” — Pythagoras</p>
          <p className="mx-auto mt-5 max-w-md text-slate-300 md:mx-0">
            Ten questions a day. Photograph your steps, upload, keep your streak alive. <span dir="rtl" className="block font-[var(--font-cairo)] text-slate-400">كل يوم واجب جديد… سلّم قبل ما الوقت يخلص.</span>
          </p>
        </section>

        <section className="panel panel-glow p-5 sm:p-7">
          <h2 className="text-xl font-bold text-white">Log in</h2>
          <div className="mt-4 grid grid-cols-3 gap-2" role="tablist">
            {tabs.map(([k, Icon, label]) => (
              <button key={k} role="tab" aria-selected={mode === k} onClick={() => { setMode(k); setErr(''); }}
                className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs font-semibold ${mode === k ? 'border-cyan2 bg-neon/15 text-cyan2' : 'border-neon/25 text-slate-300'}`}>
                <Icon size={18} />{label}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="mt-5 space-y-3">
            {mode === 'code' && (
              <>
                <input className="input text-center text-lg tracking-widest" placeholder="MATH-101" value={code} onChange={(e) => setCode(e.target.value)} required autoCapitalize="characters" aria-label="Student code" />
                <input type="password" inputMode="numeric" maxLength={6} className="input text-center text-lg tracking-widest" placeholder="4-digit PIN (الرقم السري)" value={pin} onChange={(e) => setPin(e.target.value)} required aria-label="Student PIN" />
              </>
            )}
            {mode === 'name' && (
              <>
                <input className="input" placeholder="Full name (الاسم بالكامل)" value={name} onChange={(e) => setName(e.target.value)} required aria-label="Full name" />
                <div className="grid grid-cols-2 gap-2">
                  <select className="input" value={grade} onChange={(e) => setGrade(e.target.value)} required aria-label="Grade">
                    <option value="">Select grade</option>
                    {[...new Set(['Prep 2', 'Prep 3', 'Sec 1', ...grades])].map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <select className="input" value={group} onChange={(e) => setGroup(e.target.value)} required aria-label="Group">
                    <option value="">Select group</option>
                    {groups.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <input type="password" inputMode="numeric" maxLength={6} className="input text-center tracking-widest" placeholder="4-digit PIN (الرقم السري)" value={pin} onChange={(e) => setPin(e.target.value)} required aria-label="Student PIN" />
              </>
            )}
            {mode === 'admin' && <input type="password" className="input" placeholder="Teacher password" value={pw} onChange={(e) => setPw(e.target.value)} required aria-label="Teacher password" />}
            {err && <p className="text-sm text-red-400" role="alert">{err}</p>}
            <button className="btn w-full" disabled={busy}>{mode === 'admin' ? 'Open dashboard' : 'Start today’s homework'} <ArrowRight size={18} /></button>
            {mode !== 'admin' && <p className="text-center text-xs text-slate-400">Ask your teacher for your Code & 4-digit PIN</p>}
          </form>
        </section>
      </main>
      <Footer />
    </>
  );
}