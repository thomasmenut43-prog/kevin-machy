'use client';

import { useEffect, useState } from 'react';
import { PAR_TYPE } from '@/cms/catalogue';

/**
 * Désigner ce que l'on va modifier, avant de le modifier.
 *
 * Le survol encadre l'élément sous la souris — un titre, un texte, une image,
 * des boutons, à défaut la section entière — et le clic prévient l'éditeur, qui
 * ouvre le réglage correspondant. C'est la manière dont on modifie un site
 * depuis dix ans : on montre l'endroit, on ne cherche pas son nom dans une
 * liste.
 *
 * Le cadre est posé par-dessus, sans jamais intercepter la souris : sans
 * `pointer-events: none`, il se survolerait lui-même et clignoterait.
 */

const NOMS: Record<string, string> = {
  titre: 'Titre',
  texte: 'Texte',
  chapo: 'Chapô',
  entete: 'En-tête',
  image: 'Image',
  boutons: 'Boutons',
};

type Marque = { haut: number; gauche: number; largeur: number; hauteur: number; nom: string };

export function Surligneur() {
  const [marque, setMarque] = useState<Marque | null>(null);

  useEffect(() => {
    /** Remonte depuis l'élément survolé jusqu'à ce qui se modifie. */
    const designer = (depart: Element | null) => {
      for (let n: Element | null = depart; n && n !== document.body; n = n.parentElement) {
        if (n.matches('.actions, .bouton')) return { el: n.closest('.actions') ?? n, champ: 'boutons' };
        if (n.matches('img, picture, .photo, .photo-absente')) {
          return { el: n.closest('.photo, .photo-absente, picture') ?? n, champ: 'image' };
        }
        const nomme = (n as HTMLElement).dataset?.champ;
        if (nomme) return { el: n, champ: nomme };
        if (n.id.startsWith('section-')) return { el: n, champ: null };
      }
      return null;
    };

    const cleDe = (el: Element) => el.closest('section[id^="section-"]')?.id.slice(8) ?? null;

    const libelle = (el: Element, champ: string | null) => {
      if (champ) return NOMS[champ] ?? champ;
      const section = el.closest('section[id^="section-"]') as HTMLElement | null;
      const type = section?.dataset.type;
      return (type && PAR_TYPE.get(type)?.libelle) || 'Section';
    };

    const survoler = (ev: MouseEvent) => {
      const trouve = designer(ev.target as Element);
      if (!trouve || !cleDe(trouve.el)) return setMarque(null);
      const r = trouve.el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return setMarque(null);
      setMarque({
        haut: r.top,
        gauche: r.left,
        largeur: r.width,
        hauteur: r.height,
        nom: libelle(trouve.el, trouve.champ),
      });
    };

    const cliquer = (ev: MouseEvent) => {
      const cible = ev.target as Element;
      // Ce qui est réellement interactif reste utilisable : Kevin doit pouvoir
      // essayer son simulateur ou déplier une question depuis l'aperçu.
      if (cible.closest('input, select, textarea, summary, button')) return;

      const trouve = designer(cible);
      const cle = trouve && cleDe(trouve.el);

      // Un lien de l'en-tête ou du pied de page ne désigne aucune section :
      // c'est une autre page du site. L'aperçu ne l'affiche pas tout seul —
      // il montrerait la page en ligne pendant que l'éditeur en modifie une
      // autre — il demande à l'éditeur de changer de page, panneau compris.
      const lien = cible.closest('a[href]') as HTMLAnchorElement | null;
      if (!cle && lien) {
        const url = new URL(lien.href, window.location.origin);
        // Un lien extérieur — réservation, galerie client, réseaux — s'ouvre
        // comme il le ferait sur le site.
        if (url.origin !== window.location.origin) return;

        ev.preventDefault();
        ev.stopPropagation();
        window.parent?.postMessage(
          { source: 'apercu-km', chemin: url.pathname },
          window.location.origin,
        );
        return;
      }

      if (!cle) return;

      // Un lien de l'aperçu ne doit pas emmener ailleurs : on désigne, on ne
      // navigue pas.
      ev.preventDefault();
      ev.stopPropagation();
      window.parent?.postMessage(
        { source: 'apercu-km', selection: { cle, champ: trouve!.champ } },
        window.location.origin,
      );
    };

    const partir = () => setMarque(null);

    document.addEventListener('mousemove', survoler, { passive: true });
    document.addEventListener('click', cliquer, true);
    document.addEventListener('mouseleave', partir);
    window.addEventListener('scroll', partir, { passive: true });

    return () => {
      document.removeEventListener('mousemove', survoler);
      document.removeEventListener('click', cliquer, true);
      document.removeEventListener('mouseleave', partir);
      window.removeEventListener('scroll', partir);
    };
  }, []);

  if (!marque) return null;

  const haut = marque.haut < 22;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: marque.haut,
        left: marque.gauche,
        width: marque.largeur,
        height: marque.hauteur,
        border: '1px solid #c07a4a',
        borderRadius: 2,
        boxShadow: '0 0 0 1px rgb(192 122 74 / 0.25)',
        pointerEvents: 'none',
        zIndex: 2147483000,
      }}
    >
      <span
        style={{
          position: 'absolute',
          [haut ? 'top' : 'bottom']: '100%',
          left: 0,
          margin: haut ? '2px 0 0' : '0 0 2px',
          padding: '2px 6px',
          background: '#c07a4a',
          color: '#fff',
          font: '500 11px/1.4 system-ui, sans-serif',
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
          borderRadius: 2,
        }}
      >
        {marque.nom}
      </span>
    </div>
  );
}
