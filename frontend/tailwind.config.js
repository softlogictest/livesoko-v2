/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-base': 'var(--bg-base)',
        'bg-surface': 'var(--bg-surface)',
        'bg-elevated': 'var(--bg-elevated)',
        'bg-input': 'var(--bg-input)',
        'brand-primary': 'var(--brand-primary)',
        'brand-dim': 'var(--brand-dim)',
        'status-verified': 'var(--status-verified)',
        'status-fraud': 'var(--status-fraud)',
        'status-review': 'var(--status-review)',
        'status-pending': 'var(--status-pending)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'border-subtle': 'var(--border-subtle)',
        'border-active': 'var(--border-active)',
      },
      fontFamily: {
        display: ['Rajdhani', 'sans-serif'],
        body: ['DM Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
