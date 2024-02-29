/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './angular/src/**/*.{html,ts}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e2e2e2',
          100: '#b8b8b8',
          200: '#888888',
          300: '#585858',
          400: '#353535',
          500: '#111111',
          600: '#0f0f0f',
          700: '#0c0c0c',
          800: '#0a0a0a',
          900: '#050505',
          A100: '#ff4e4e',
          A200: '#ff1b1b',
          A400: '#e70000',
          A700: '#ce0000'
        },
        accent: {
          50: '#fae5e5',
          100: '#f3bdbd',
          200: '#eb9191',
          300: '#e36565',
          400: '#dd4444',
          500: '#d72323',
          600: '#d31f1f',
          700: '#cd1a1a',
          800: '#c71515',
          900: '#be0c0c',
          A100: '#ffeaea',
          A200: '#ffb7b7',
          A400: '#ff8484',
          A700: '#ff6a6a'
        },
        warn: {
          50: '#fdfdec',
          100: '#fafbcf',
          200: '#f6f8b0',
          300: '#f2f590',
          400: '#f0f278',
          500: '#edf060',
          600: '#ebee58',
          700: '#e8ec4e',
          800: '#e5e944',
          900: '#e0e533',
          A100: '#ffffff',
          A200: '#fffff7',
          A400: '#fdffc4',
          A700: '#fdffab'
        }
      }
    }
  },
  plugins: [ ],
  corePlugins: {
    preflight: false
  }
};
