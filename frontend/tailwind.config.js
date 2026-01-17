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
                    DEFAULT: '#f0f4f8',        // Light blue-gray base
                    elevated: '#ffffff',       // Pure white for cards
                    hover: '#e3e9f0',          // Blue-tinted hover
                    subtle: '#e8eff6',         // Subtle blue backgrounds
                    card: '#fafbfd',           // Very light blue card
                    table: '#f5f8fb',          // Table rows alternate
                    panel: '#f7f9fc',          // Panel backgrounds
                    accent: '#eff6ff',         // Light blue accent areas
                },
                foreground: {
                    DEFAULT: '#1e293b',        // Darker text for better contrast
                    muted: '#475569',          // Muted text (darker)
                    subtle: '#64748b',         // Subtle text
                },
                border: {
                    DEFAULT: '#cbd5e1',        // More visible borders
                    hover: '#94a3b8',          // Darker on hover
                    strong: '#64748b',         // Strong borders
                    light: '#e2e8f0',          // Light borders
                    accent: '#bfdbfe',         // Light blue borders
                },
                accent: {
                    DEFAULT: '#0070f3',
                    hover: '#0761d1',
                    light: '#3b82f6',
                    subtle: '#dbeafe',
                    bg: '#eff6ff',             // Light accent background
                    border: '#93c5fd',         // Light blue border
                },
                purple: {
                    light: '#f3e8ff',
                    DEFAULT: '#a855f7',
                    dark: '#7e22ce',
                },
                success: '#10b981',
                warning: '#f59e0b',
                error: '#ef4444',
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
