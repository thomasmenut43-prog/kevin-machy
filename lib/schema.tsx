import { telephoneInternational, type Entreprise } from './modeles';

/**
 * Données structurées LocalBusiness, bâties sur ce que Kevin a saisi dans
 * Paramètres → Mon entreprise.
 *
 * Rien n'y est inventé : pas d'horaire supposé, pas de note, pas d'avis
 * agrégé. Un champ vide disparaît de la déclaration plutôt que d'y entrer
 * faux — déclarer à Google une position ou un téléphone erronés est pire que
 * de n'en déclarer aucun.
 */
export function schemaEntreprise(e: Entreprise) {
  return {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  '@id': `${e.url}/#entreprise`,
  name: e.nom,
  description: e.description,
  url: e.url,
  ...(e.telephone ? { telephone: telephoneInternational(e.telephone) } : {}),
  ...(e.email ? { email: e.email } : {}),
  image: `${e.url}/img/og-default.jpg`,
  logo: `${e.url}/assets/logo-clair.svg`,
  priceRange: '€€',
  address: {
    '@type': 'PostalAddress',
    streetAddress: e.adresse,
    addressLocality: e.ville,
    postalCode: e.codePostal,
    addressRegion: e.region,
    addressCountry: 'FR',
  },
  ...(e.latitude && e.longitude
    ? {
        geo: {
          '@type': 'GeoCoordinates',
          latitude: Number(e.latitude),
          longitude: Number(e.longitude),
        },
      }
    : {}),
  openingHoursSpecification: e.horaires
    .filter((h) => h.ouverture)
    .map((h) => {
    const jours: Record<string, string> = {
      Lundi: 'Monday',
      Mardi: 'Tuesday',
      Mercredi: 'Wednesday',
      Jeudi: 'Thursday',
      Vendredi: 'Friday',
      Samedi: 'Saturday',
      Dimanche: 'Sunday',
    };
      const [opens, closes] = h.ouverture!.split(' – ');
      return { '@type': 'OpeningHoursSpecification', dayOfWeek: jours[h.jour], opens, closes };
    })
    // Un horaire mal écrit ne déclare rien : Google refuse une plage sans
    // heure de fin, et la déclaration entière s'en trouverait invalide.
    .filter((h) => h.opens && h.closes),
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
  sameAs: [e.liens.instagram, e.liens.facebook, e.liens.linkedin, e.liens.youtube].filter(Boolean),
  } as const;
}

export function schemaFilAriane(elements: { nom: string; chemin: string }[], urlSite: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: elements.map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: e.nom,
      item: `${urlSite}${e.chemin}`,
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
