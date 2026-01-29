/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // SF風ダークテーマカラー
        'cockpit': {
          'bg': '#0a0e14',
          'panel': '#111820',
          'border': '#1e2a38',
          'accent': '#00d9ff',
          'accent-dim': '#007a8f',
          'success': '#00ff88',
          'warning': '#ffaa00',
          'error': '#ff4466',
          'text': '#e6edf3',
          'text-dim': '#8b949e',
        }
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Consolas', 'Monaco', 'monospace'],
      }
    },
  },
  plugins: [],
}
