

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        secondary: '#7c3aed',
        tertiary: '#059669',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6',
        'text-primary': '#1f2937',
        'text-secondary': '#6b7280',
        'bg-light': '#f8fafc',
        'border-light': '#e5e7eb'
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'button': '0 2px 4px -1px rgba(0, 0, 0, 0.1)'
      }
    }
  },
  plugins: [],
}

