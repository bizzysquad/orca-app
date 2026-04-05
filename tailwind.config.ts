import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // === PRIMARY BACKGROUNDS (theme-aware via CSS vars) ===
        brand: {
          black: 'var(--brand-black, #0A0A0A)',
          soft: 'var(--brand-soft, #121212)',
        },
        // === SURFACES / DEPTH (theme-aware via CSS vars) ===
        surface: {
          card: 'var(--surface-card, #181818)',
          elevated: 'var(--surface-elevated, #202020)',
          border: 'var(--surface-border, #2A2A2A)',
        },
        // === SIGNATURE GOLD SYSTEM (theme-aware via CSS vars) ===
        gold: {
          DEFAULT: 'var(--gold-primary, #D4AF37)',
          highlight: 'var(--gold-highlight, #F5D76E)',
          deep: 'var(--gold-deep, #8C6A1A)',
          liquid: '#CFAE4A',
          bronze: '#6E5A1F',
        },
        // === TEXT SYSTEM (theme-aware via CSS vars) ===
        text: {
          primary: 'var(--text-primary, #F5F5F5)',
          secondary: 'var(--text-secondary, #A1A1A1)',
          muted: 'var(--text-muted, #6B7280)',
        },
        // === FEEDBACK (theme-aware via CSS vars) ===
        success: 'var(--ok-color, #22C55E)',
        danger: 'var(--bad-color, #EF4444)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Inter', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        'display-sm': ['1.875rem', { lineHeight: '1.15', letterSpacing: '-0.025em', fontWeight: '700' }],
        'display-md': ['2.25rem', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '700' }],
        'display-lg': ['3rem', { lineHeight: '1.05', letterSpacing: '-0.035em', fontWeight: '800' }],
      },
      backgroundImage: {
        // === BRAND GRADIENT ===
        'gold-gradient': 'linear-gradient(135deg, #D4AF37, #F5D76E, #8C6A1A)',
        'gold-gradient-hover': 'linear-gradient(135deg, #F5D76E, #D4AF37, #CFAE4A)',
        // === SUBTLE BACKGROUND ACCENT ===
        'gold-accent': 'linear-gradient(90deg, rgba(212,175,55,0.15), transparent)',
        'gold-accent-radial': 'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.08) 0%, transparent 60%)',
        // === SURFACE GRADIENTS ===
        'surface-gradient': 'linear-gradient(180deg, #121212 0%, #0A0A0A 100%)',
        'card-shine': 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 50%)',
      },
      boxShadow: {
        'gold-sm': '0 0 12px rgba(212,175,55,0.08)',
        'gold': '0 0 20px rgba(212,175,55,0.1), 0 0 60px rgba(212,175,55,0.03)',
        'gold-lg': '0 0 30px rgba(212,175,55,0.15), 0 0 80px rgba(212,175,55,0.05)',
        'card': '0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.02)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)',
        'input-focus': '0 0 0 1px rgba(212,175,55,0.3), 0 0 12px rgba(212,175,55,0.06)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'fade-in-up': 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 16px rgba(212,175,55,0.08)' },
          '50%': { boxShadow: '0 0 28px rgba(212,175,55,0.18)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}

export default config
