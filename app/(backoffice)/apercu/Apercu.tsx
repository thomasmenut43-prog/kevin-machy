'use client';

import { useEffect, useMemo, useState } from 'react';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { RenduSections } from '@/components/sections/RenduSections';
import { Surligneur } from './Surligneur';
import type { Media, Navigation, Section } from '@/lib/modeles';

/**
 * L'aperçu du site, dans l'iframe de l'éditeur.
 *
 * **C'est le site, pas un extrait.** En-tête, navigation, pied de page : les
 * composants sont exactement ceux du site public, et la page en construction
 * s'insère à sa place, entre les deux. Kevin voit donc ce que verront ses
 * visiteurs, chrome compris, et pas une pile de sections flottant sur du noir.
 *
 * Il ne recharge jamais : l'éditeur lui envoie les sections par message à
 * chaque frappe. C'est ce qui rend l'aperçu instantané, là où recharger la page
 * ferait sauter la position de défilement à chaque lettre tapée.
 */
export function Apercu() {
  const [sections, setSections] = useState<Section[]>([]);
  const [medias, setMedias] = useState<Media[]>([]);
  const [nav, setNav] = useState<Navigation | null>(null);

  useEffect(() => {
    // Les révélations au défilement du site attendent cet attribut. Sans lui,
    // le contenu reste visible — c'est le repli prévu pour les visiteurs sans
    // JavaScript — mais l'aperçu ne montrerait pas les animations réelles.
    document.documentElement.setAttribute('data-js', '1');

    const recevoir = (ev: MessageEvent) => {
      // Sans ce contrôle, n'importe quelle page ouverte ailleurs pourrait
      // pousser du contenu dans l'aperçu.
      if (ev.origin !== window.location.origin) return;
      if (ev.data?.source !== 'editeur-km') return;

      // Message de navigation : on amène la section à l'écran sans rien
      // rerendre. Le rendu est déjà là, seule la position change.
      if (typeof ev.data.cible === 'string') {
        const cible = document.getElementById(`section-${ev.data.cible}`);
        cible?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      setSections(Array.isArray(ev.data.sections) ? ev.data.sections : []);
      setMedias(Array.isArray(ev.data.medias) ? ev.data.medias : []);
      if (ev.data.nav) setNav(ev.data.nav as Navigation);
    };

    window.addEventListener('message', recevoir);
    // L'éditeur peut avoir envoyé son état avant que cette page soit prête.
    window.parent?.postMessage({ source: 'apercu-km', pret: true }, window.location.origin);

    return () => window.removeEventListener('message', recevoir);
  }, []);

  const parId = useMemo(() => new Map(medias.map((m) => [m.id, m])), [medias]);

  return (
    <>
      <Header nav={nav} logo={nav?.logoImage ? (parId.get(nav.logoImage) ?? null) : null} />
      <main id="contenu">
        {sections.length ? (
          <RenduSections sections={sections} medias={parId} />
        ) : (
          <section className="wrap section">
            <p className="corps" style={{ color: 'var(--encre-3)' }}>
              L’aperçu affichera la page dès la première section ajoutée.
            </p>
          </section>
        )}
      </main>
      <Footer />
      <Surligneur />
    </>
  );
}
