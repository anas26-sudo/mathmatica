'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Phone, CheckCircle2, XCircle, Clock, Lock, AlertTriangle, Eye } from 'lucide-react';
import { isLive } from '@/lib/db';

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(i); }, [ms]);
  return now;
}

export function Logo({ size = 44 }) {
  return <img src="/logo.png" alt="Mathmatica Logo" width={size} height={size} className="logo-ring" style={{ width: size, height: size }} />;
}

export function Navbar({ right }) {
  return (
    <header className="sticky top-0 z-30 border-b border-neon/25 bg-ink/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Logo size={44} />
          <span className="text-xl font-bold tracking-tight text-white">Mathmatica</span>
        </Link>
        <div className="flex items-center gap-2">{right}</div>
      </div>
      {!isLive && (
        <div className="bg-yellow-400/10 py-1 text-center text-xs text-yellow-200">
          Demo mode — data is saved in this browser only. Add Supabase keys in <code>.env.local</code> to go live.
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-neon/25 px-4 py-8 text-center text-sm text-slate-300">
      <p className="font-semibold text-white">Mathmatica — AI Eng. Anas Ayman</p>
      <p className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 neon-text">
        <a href="tel:01552645503" className="inline-flex items-center gap-1"><Phone size={14} /> 01552645503</a>
        <a href="tel:01040485663" className="inline-flex items-center gap-1"><Phone size={14} /> 01040485663</a>
      </p>
    </footer>
  );
}

const MAP = {
  submitted: ['b-ok', CheckCircle2, 'Submitted', 'تم التصحيح'],
  review: ['border-cyan2/60 bg-cyan2/15 text-cyan2', Eye, 'Under Review', 'قيد المراجعة'],
  missed: ['b-miss', XCircle, 'Missed (0 pts)', 'فاتك'],
  pending: ['b-pend', Clock, 'Pending', 'متاح الآن'],
  locked: ['b-lock', Lock, 'Locked', 'لم يبدأ'],
  rejected: ['b-rej', AlertTriangle, 'Rejected (0 pts)', 'مرفوض']
};
export function StatusBadge({ status, short }) {
  const [cls, Icon, en] = MAP[status] || MAP.pending;
  const label = short ? (status === 'review' ? 'Review' : en.split(' ')[0]) : en;
  return <span className={`badge ${cls}`}><Icon size={13} />{label}</span>;
}

export function Modal({ onClose, title, children, wide }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div onClick={(e) => e.stopPropagation()} className={`panel panel-glow max-h-[92vh] w-full overflow-y-auto rounded-b-none p-5 sm:rounded-b-[14px] ${wide ? 'max-w-3xl' : 'max-w-md'}`} style={{ background: '#0A1428' }}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-300 hover:text-white"><X /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Lightbox({ images, onClose, title }) {
  const [i, setI] = useState(0);
  return (
    <Modal onClose={onClose} title={title} wide>
      {images.length === 0 ? <p className="text-slate-400">No images were uploaded.</p> : (
        <>
          <img src={images[i]} alt={`Homework page ${i + 1}`} className="mx-auto max-h-[60vh] w-auto rounded-lg border border-neon/30 bg-white" />
          {images.length > 1 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {images.map((src, k) => (
                <button key={k} onClick={() => setI(k)} className={`h-14 w-14 overflow-hidden rounded-md border-2 ${k === i ? 'border-cyan2' : 'border-transparent'}`}>
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

export function Stat({ icon: Icon, label, value, sub }) {
  return (
    <div className="panel panel-glow p-4">
      <div className="flex items-center gap-2 text-sm text-slate-300"><Icon size={16} className="text-cyan2" />{label}</div>
      <div className="mt-2 text-3xl font-extrabold text-white" style={{ textShadow: '0 0 14px rgba(0,168,255,.6)' }}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}