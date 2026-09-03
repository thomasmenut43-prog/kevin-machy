import { Bodoni_Moda } from 'next/font/google';
import localFont from 'next/font/local';

/** Titres : didone à fort contraste, en écho au monogramme KM du logo. */
export const bodoni = Bodoni_Moda({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--police-titre',
});

/** Texte courant : grotesque neutre-chaud, auto-hébergé. */
export const switzer = localFont({
  src: [
    { path: '../public/fonts/Switzer-400.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/Switzer-500.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/Switzer-600.woff2', weight: '600', style: 'normal' },
  ],
  display: 'swap',
  variable: '--police-texte',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});
