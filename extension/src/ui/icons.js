/**
 * DropTrends Lucide SVG Icon Library
 * High-precision, stroke-based SVG icons (no system emojis).
 */

const DropIcons = {
  svg(inner, { size = 16, className = '', strokeWidth = 2, color = 'currentColor' } = {}) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="dt-icon ${className}">${inner}</svg>`;
  },

  drop({ size = 16, className = '' } = {}) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128" fill="none" class="dt-icon ${className}">
      <defs>
        <linearGradient id="dt-drop-gradient" x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stop-color="#009cde" />
          <stop offset="50%" stop-color="#0284c7" />
          <stop offset="100%" stop-color="#0369a1" />
        </linearGradient>
      </defs>
      <g transform="translate(64, 64) scale(1.06, 1.06) translate(-64, -58.7)">
        <path d="M 96.8 54.3 C 96.5 53.8 96.2 53.3 95.8 52.8 C 94.1 50.6 91.8 48.6 89.8 46.8 C 86.8 44.1 83.7 41.5 81.2 38.4 C 77.3 33.6 74.4 28.1 72.1 22.3 C 70.3 17.7 69 13 67.9 8.2 C 67.4 5.9 66.8 3.5 66.2 1.3 C 65.9 0.4 65.4 -0.1 64.4 0 C 63.6 0.1 63 0.6 62.7 1.4 C 61.8 4.2 60.9 7 60.2 9.9 C 58.5 16.7 56.4 23.4 53 29.6 C 50.1 35 46.2 39.7 42.1 44.2 C 38.6 48 34.6 51.5 31.6 55.9 C 27.2 62.3 25.1 69.8 25 77.6 C 24.9 84.8 27.2 91.5 31.1 97.5 C 36.3 105.7 43.6 111.4 52.6 114.7 C 60.1 117.5 67.9 117.5 75.4 114.7 C 84.4 111.4 91.7 105.7 96.9 97.5 C 100.8 91.5 103.1 84.8 103 77.6 C 102.9 69.3 100.7 61.3 96.8 54.3 Z" fill="url(#dt-drop-gradient)" />
        <path d="M 64 12 C 55 24 38 48 35 68 C 33 76 35 84 39 90" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2.5" stroke-linecap="round" />
      </g>
      <rect x="38" y="80" width="14" height="32" rx="4" fill="#ef4444" />
      <rect x="57" y="62" width="14" height="50" rx="4" fill="#f59e0b" />
      <rect x="76" y="44" width="14" height="68" rx="4" fill="#7cbc48" />
      <path d="M 34 78 L 94 34" stroke="#ffffff" stroke-width="11" stroke-linecap="round" />
      <path d="M 72 34 L 94 34 L 94 54" fill="none" stroke="#ffffff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M 34 78 L 94 34" stroke="#7cbc48" stroke-width="6.5" stroke-linecap="round" />
      <path d="M 72 34 L 94 34 L 94 54" fill="none" stroke="#7cbc48" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>`;
  },

  shieldCheck({ size = 16, className = '', color = '#059669' } = {}) {
    return this.svg(`
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="m9 12 2 2 4-4"/>
    `, { size, className, color });
  },

  shieldAlert({ size = 16, className = '', color = '#d97706' } = {}) {
    return this.svg(`
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    `, { size, className, color });
  },

  zap({ size = 16, className = '', color = '#d97706' } = {}) {
    return this.svg(`
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    `, { size, className, color });
  },

  clock({ size = 16, className = '', color = '#d97706' } = {}) {
    return this.svg(`
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    `, { size, className, color });
  },

  rocket({ size = 16, className = '', color = '#2563eb' } = {}) {
    return this.svg(`
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
      <path d="M12 9v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    `, { size, className, color });
  },

  flask({ size = 16, className = '', color = '#0891b2' } = {}) {
    return this.svg(`
      <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/>
      <path d="M8.5 2h7"/>
      <path d="M7 16h10"/>
    `, { size, className, color });
  },

  users({ size = 16, className = '', color = '#4f46e5' } = {}) {
    return this.svg(`
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    `, { size, className, color });
  },

  sprout({ size = 16, className = '', color = '#16a34a' } = {}) {
    return this.svg(`
      <path d="M7 20h10"/>
      <path d="M10 20c5.5-2.5.8-6.4 3-13"/>
      <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/>
      <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>
    `, { size, className, color });
  },

  checkCircle({ size = 16, className = '', color = '#059669' } = {}) {
    return this.svg(`
      <circle cx="12" cy="12" r="10"/>
      <path d="m9 12 2 2 4-4"/>
    `, { size, className, color });
  },

  alertTriangle({ size = 16, className = '', color = '#d97706' } = {}) {
    return this.svg(`
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    `, { size, className, color });
  },

  alertCircle({ size = 16, className = '', color = '#dc2626' } = {}) {
    return this.svg(`
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    `, { size, className, color });
  },

  copy({ size = 14, className = '', color = 'currentColor' } = {}) {
    return this.svg(`
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
    `, { size, className, color });
  },

  check({ size = 14, className = '', color = '#059669' } = {}) {
    return this.svg(`
      <polyline points="20 6 9 17 4 12"/>
    `, { size, className, color });
  },

  externalLink({ size = 12, className = '', color = 'currentColor' } = {}) {
    return this.svg(`
      <path d="M15 3h6v6"/>
      <path d="M10 14 21 3"/>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    `, { size, className, color });
  },

  x({ size = 18, className = '', color = 'currentColor' } = {}) {
    return this.svg(`
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    `, { size, className, color });
  },

  chevronDown({ size = 12, className = '', color = 'currentColor' } = {}) {
    return this.svg(`
      <polyline points="6 9 12 15 18 9"/>
    `, { size, className, strokeWidth: 2.5, color });
  },

  gitlab({ size = 14, className = '', color = '#e24329' } = {}) {
    return this.svg(`
      <path d="m22 13.29-3.33-10a.42.42 0 0 0-.14-.18.38.38 0 0 0-.22-.11.39.39 0 0 0-.23.07.42.42 0 0 0-.14.18l-2.26 6.67H8.32L6.06 3.26a.42.42 0 0 0-.14-.18.38.38 0 0 0-.22-.11.39.39 0 0 0-.23.07.42.42 0 0 0-.14.18L2 13.29a.74.74 0 0 0 .27.83L12 21l9.69-6.88a.71.71 0 0 0 .31-.83Z"/>
    `, { size, className, strokeWidth: 1.8, color });
  }
};

if (typeof globalThis !== 'undefined') {
  globalThis.DropIcons = DropIcons;
}
