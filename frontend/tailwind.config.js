/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: {
                    DEFAULT: '#ffffff',
                    elevated: 'rgba(255, 255, 255, 0.8)',
                    hover: '#f8fafc',
                },
                foreground: {
                    DEFAULT: '#0f172a',
                    muted: '#64748b',
                    subtle: '#94a3b8',
                },
                border: {
                    DEFAULT: '#e2e8f0',
                    hover: '#cbd5e1',
                },
                accent: {
                    DEFAULT: '#0070f3',
                    hover: '#0761d1',
                },
                success: '#00c853',
                warning: '#ffa726',
                error: '#f44336',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['Fira Code', 'monospace'],
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-in-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                pulseSubtle: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.7' },
                },
            },
        },
    },
    plugins: [],
}
