module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: { extend: {
    colors: { ink: '#050A14', navy: '#0A1428', panel: '#0B1730', neon: '#00A8FF', cyan2: '#00E5FF' },
    fontFamily: { sans: ['var(--font-inter)', 'var(--font-cairo)', 'sans-serif'] },
    boxShadow: { neon: '0 0 15px rgba(0,168,255,0.5)', neonlg: '0 0 30px rgba(0,168,255,0.55)' }
  } },
  plugins: []
};
