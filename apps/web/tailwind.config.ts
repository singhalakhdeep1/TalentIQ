import type { Config } from 'tailwindcss';

const config: Config = {
    content: [
        './app/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './lib/**/*.{ts,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                panel: '#0f1724',
                panelSoft: '#162238',
                accent: '#30c8b5',
                warning: '#ff8a3d',
                textPrimary: '#f5f7ff',
                textMuted: '#9db0c9',
            },
            fontFamily: {
                body: ['var(--font-body)'],
                heading: ['var(--font-heading)'],
            },
            boxShadow: {
                panel: '0 15px 50px rgba(0, 0, 0, 0.35)',
            },
            animation: {
                rise: 'rise 450ms ease-out',
            },
            keyframes: {
                rise: {
                    from: { opacity: '0', transform: 'translateY(12px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
};

export default config;
