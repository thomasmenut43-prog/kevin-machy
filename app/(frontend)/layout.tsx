import type { Metadata, Viewport } from 'next';
import { Header } from '@/components/Header';
import { lireEntreprise } from '@/lib/entreprise';
import { lireNavigation } from '@/lib/navigation';
import { lirePied } from '@/lib/piedDePage';
import { mediasParIds } from '@/lib/medias';
import { Footer } from '@/components/Footer';
import { Mesure } from '@/components/Mesure';
import { bodoni, switzer } from '@/lib/fonts';
import { DonneesStructurees, schemaEntreprise } from '@/lib/schema';
import './globals.css';

/**
 * Les métadonnées du site.
 *
 * Le domaine, le nom et la phrase de présentation viennent de la base : ce
 * sont les informations de l'entreprise, réglées dans Paramètres → Mon
 * entreprise. Les titres, eux, restent de la rédaction : chaque page a le
 * sien dans l'éditeur, et celui-ci n'est que le repli.
 */
export async function generateMetadata(): Promise<Metadata> {
  const e = await lireEntreprise();

  return {
    metadataBase: new URL(e.url),
    title: {
      default: 'Kevin Machy — Photographe mariage et portrait en Haute-Loire',
      template: `%s — ${e.nom}`,
    },
    description: e.description,
    applicationName: e.nom,
    authors: [{ name: e.nom }],
    creator: e.nom,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      locale: 'fr_FR',
      siteName: e.nom,
      url: e.url,
      title: 'Kevin Machy — Photographe mariage et portrait en Haute-Loire',
      description: e.description,
      images: [
        { url: '/img/og-default.jpg', width: 1200, height: 630, alt: 'Photographie de mariage de nuit' },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Kevin Machy — Photographe en Haute-Loire',
      description: e.description,
      images: ['/img/og-default.jpg'],
    },
    robots: { index: true, follow: true },
    formatDetection: { telephone: true, address: false, email: false },
  };
}

export const viewport: Viewport = {
  themeColor: '#0a0a0b',
  colorScheme: 'dark',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // La barre de navigation vient de la base : Kevin la règle depuis l'éditeur.
  const nav = await lireNavigation().catch(() => null);
  const [entreprise, pied] = await Promise.all([lireEntreprise(), lirePied()]);
  const logo = nav?.logoImage ? (await mediasParIds([nav.logoImage])).get(nav.logoImage) : null;

  return (
    <html lang="fr" className={`${bodoni.variable} ${switzer.variable}`} suppressHydrationWarning>
      <body>
        {/* Sans JavaScript, aucune révélation n'est appliquée : le contenu reste visible. */}
        <script dangerouslySetInnerHTML={{ __html: `document.documentElement.setAttribute('data-js','1')` }} />
        <a className="saut-contenu" href="#contenu">
          Aller au contenu
        </a>
        <Header nav={nav} logo={logo} entreprise={entreprise} />
        <main id="contenu">{children}</main>
        <Footer entreprise={entreprise} pied={pied} />
        <DonneesStructurees data={schemaEntreprise(entreprise)} />
        <Mesure />
      </body>
    </html>
  );
}
