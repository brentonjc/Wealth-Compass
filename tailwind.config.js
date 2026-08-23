/** @type {import('tailwindcss').Config} */
// Design-system tokens kept in sync with styles/theme.css and the values that
// used to live inline in index.html's CDN config.
module.exports = {
  content: ['./index.html', './src/**/*.js'],
  theme: {
    extend: {
      colors: {
        bg: '#F6F9FC', card: '#FFFFFF', card2: '#F0F3F9', card3: '#E7ECF5',
        primary: '#5851E8', primarybright: '#635BFF', purple: '#6C63E0', purplelight: '#8B85FF',
        success: '#0F9E73', warn: '#C97A0E',
        text: '#0A2540', muted: '#5A6B85', line: 'rgba(10,37,64,0.12)',
        ink0: '#0A0E1A', ink1: '#111B34', ink2: '#16213E', ink3: '#1C2A4C',
        textdark: '#EAF0FA', muteddark: '#8291AD', linedark: 'rgba(107,124,153,0.22)',
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
