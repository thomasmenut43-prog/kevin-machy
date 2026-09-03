import { LIENS, SITE } from './site';

/**
 * Données structurées LocalBusiness. Uniquement des faits relevés sur le
 * site actuel : aucune horaire, aucune note, aucun avis agrégé inventé.
 */
export const schemaEntreprise = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  '@id': `${SITE.url}/#entreprise`,
  name: SITE.nom,
  alternateName: 'Kevin Machy Photographe',
  description:
    'Photographe professionnel et Artisan d’Art au Puy-en-Velay. Mariage, portrait, photographie d’entreprise et Studio de l’Iris, en Haute-Loire et dans la Loire.',
  url: SITE.url,
  telephone: '+33781743284',
  email: SITE.email,
  image: `${SITE.url}/img/og-default.jpg`,
  logo: `${SITE.url}/assets/logo-clair.svg`,
  priceRange: '€€',
  address: {
    '@type': 'PostalAddress',
    streetAddress: SITE.adresse,
    addressLocality: SITE.ville,
    postalCode: SITE.codePostal,
    addressRegion: SITE.region,
    addressCountry: 'FR',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: SITE.geo.lat,
    longitude: SITE.geo.lon,
  },
  areaServed: [
    { '@type': 'AdministrativeArea', name: 'Haute-Loire' },
    { '@type': 'AdministrativeArea', name: 'Loire' },
    { '@type': 'AdministrativeArea', name: 'Auvergne-Rhône-Alpes' },
  ],
  knowsAbout: [
    'Photographie de mariage',
    'Portrait',
    'Photographie d’entreprise',
    'Macrophotographie d’iris',
  ],
  sameAs: [LIENS.instagram, LIENS.facebook, LIENS.linkedin, LIENS.youtube],
} as const;

export function schemaFilAriane(elements: { nom: string; chemin: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: elements.map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: e.nom,
      item: `${SITE.url}${e.chemin}`,
    })),
  };
}

export function schemaFaq(items: readonly { q: string; r: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.r },
    })),
  };
}

export function DonneesStructurees({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
