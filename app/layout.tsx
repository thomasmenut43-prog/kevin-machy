import type { Metadata, Viewport } from 'next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { bodoni, switzer } from '@/lib/fonts';
import { DonneesStructurees, schemaEntreprise } from '@/lib/schema';
import { SITE } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: 'Kevin Machy — Photographe mariage et portrait en Haute-Loire',
    template: '%s — Kevin Machy',
  },
  description:
    'Photographe professionnel et Artisan d’Art au Puy-en-Velay. Mariages, portraits et Studio de l’Iris en Haute-Loire et dans la Loire. Des images où vous vous reconnaissez.',
  applicationName: SITE.nom,
  authors: [{ name: SITE.nom }],
  creator: SITE.nom,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: SITE.nom,
    url: SITE.url,
    title: 'Kevin Machy — Photographe mariage et portrait en Haute-Loire',
    description:
      'Photographe professionnel et Artisan d’Art au Puy-en-Velay. Des images naturelles, pour les gens qui veulent se reconnaître sur leurs photos.',
    images: [{ url: '/img/og-default.jpg', width: 1200, height: 630, alt: 'Photographie de mariage de nuit' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kevin Machy — Photographe en Haute-Loire',
    description: 'Mariages, portraits et Studio de l’Iris au Puy-en-Velay.',
    images: ['/img/og-default.jpg'],
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: true, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0b',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${bodoni.variable} ${switzer.variable}`} suppressHydrationWarning>
      <body>
        {/* Sans JavaScript, aucune révélation n'est appliquée : le contenu reste visible. */}
        <script dangerouslySetInnerHTML={{ __html: `document.documentElement.setAttribute('data-js','1')` }} />
        <a className="saut-contenu" href="#contenu">
          Aller au contenu
        </a>
        <Header />
        <main id="contenu">{children}</main>
        <Footer />
        <DonneesStructurees data={schemaEntreprise} />
      </body>
    </html>
  );
}
