'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ModaleParametres } from './ModaleParametres';
import { Cadenas, Enveloppe, Externe, Images, Pages, Reglage, Sortie, Tableau } from './IconesMenu';
import type { Utilisateur } from '@/lib/auth';
import { urlAvatar } from '@/lib/modeles';

type Onglet = {
  href: string;
  libelle: string;
  /** L'icône, seule visible quand le menu est réduit. */
  Signe: (p: { className?: string }) => React.ReactElement;
  /** Présent mais inactif : pose le jalon d'un chantier futur. */
  verrouille?: boolean;
  /** Réservé aux administrateurs. */
  administrateur?: boolean;
};

const ONGLETS: Onglet[] = [
  { href: '/admin/', libelle: 'Tableau de bord', Signe: Tableau },
  { href: '/admin/pages/', libelle: 'Éditeur de site', Signe: Pages },
  { href: '/admin/medias/', libelle: 'Médiathèque', Signe: Images },
  { href: '/admin/messages/', libelle: 'Messages', Signe: Enveloppe },
  { href: '/admin/boutique/', libelle: 'Boutique', Signe: Cadenas, verrouille: true },
];

/** Une ou deux lettres, faute de photo. */
function initialesDe(u: { prenom: string; nom: string }) {
  return ([u.prenom[0], u.nom[0]].filter(Boolean).join('') || '?').toUpperCase();
}

export function MenuBackOffice({
  utilisateur,
  deconnexion,
}: {
  utilisateur: Utilisateur;
  deconnexion: () => Promise<void>;
}) {
  const chemin = usePathname();

  /**
   * Le menu vit réduit, en colonne d'icônes, et s'ouvre quand la souris entre.
   *
   * Il s'ouvre **par-dessus** l'écran plutôt qu'en le poussant : l'aperçu de
   * l'éditeur et les graphiques du tableau de bord se remettraient en page à
   * chaque passage de souris, ce qui se voit beaucoup plus qu'un menu ouvert.
   *
   * L'épingle reste, pour qui préfère le garder ouvert — et c'est aussi le
   * seul chemin au clavier, où il n'y a pas de survol.
   */
  const [survol, setSurvol] = useState(false);
  const [epingle, setEpingle] = useState(false);
  const ouvert = epingle || survol;

  // Les paramètres ne sont pas une destination : ils s'ouvrent par-dessus.
  const [parametres, setParametres] = useState(false);

  return (
    <aside
      className="bo-menu"
      data-ouvert={ouvert ? '' : undefined}
      data-epingle={epingle ? '' : undefined}
      onMouseEnter={() => setSurvol(true)}
      onMouseLeave={() => setSurvol(false)}
      onFocus={() => setSurvol(true)}
      onBlur={(ev) => {
        if (!ev.currentTarget.contains(ev.relatedTarget as Node)) setSurvol(false);
      }}
    >
      {/* Le nom et la commande de repli partagent une ligne : deux rangées
          pour deux éléments courts écartaient les onglets pour rien. */}
      <div className="bo-entete-menu">
        <div className="bo-marque">
          <strong>Kevin Machy</strong>
          <span>BackOffice</span>
        </div>

        <button
          type="button"
          className="bo-reduire"
          onClick={() => setEpingle((v) => !v)}
          aria-pressed={epingle}
          title={epingle ? 'Laisser le menu se refermer' : 'Garder le menu ouvert'}
        >
          <span aria-hidden="true">{epingle ? '«' : '»'}</span>
          <span className="visuellement-cache">
            {epingle ? 'Laisser le menu se refermer' : 'Garder le menu ouvert'}
          </span>
        </button>
      </div>

      <nav aria-label="Sections du BackOffice">
        {ONGLETS.filter((o) => !o.administrateur || utilisateur.role === 'administrateur').map(
          (onglet) =>
            onglet.verrouille ? (
              <span
                key={onglet.href}
                className="bo-lien bo-lien-verrouille"
                title="Boutique — module non activé"
                aria-disabled="true"
              >
                <span className="bo-signe">
                  <onglet.Signe />
                </span>
                <span className="bo-libelle">{onglet.libelle}</span>
              </span>
            ) : (
              <Link
                key={onglet.href}
                className="bo-lien"
                href={onglet.href}
                aria-current={estCourant(chemin, onglet.href) ? 'page' : undefined}
                title={onglet.libelle}
              >
                <span className="bo-signe">
                  <onglet.Signe />
                </span>
                <span className="bo-libelle">{onglet.libelle}</span>
              </Link>
            ),
        )}
      </nav>

      <div className="bo-pied-menu">
        {/* La pastille reste visible quand le menu est replié : c'est alors le
            seul rappel du compte avec lequel on travaille. */}
        <span className="bo-profil">
          <span className="bo-profil-rond" aria-hidden="true">
            {utilisateur.avatar ? (
              <img src={urlAvatar(utilisateur.avatar, 128)} alt="" />
            ) : (
              initialesDe(utilisateur)
            )}
          </span>
          <span className="bo-libelle">
            {[utilisateur.prenom, utilisateur.nom].filter(Boolean).join(' ')}
            <br />
            {utilisateur.role === 'administrateur' ? 'Administrateur' : 'Éditeur'}
          </span>
        </span>
        <button
          type="button"
          className="bo-lien bo-lien-bouton"
          onClick={() => setParametres(true)}
          title="Paramètres"
        >
          <span className="bo-signe">
            <Reglage />
          </span>
          <span className="bo-libelle">Paramètres</span>
        </button>

        <form action={deconnexion}>
          <button
            className="bo-bouton bo-bouton-discret"
            type="submit"
            style={{ width: '100%' }}
            title="Se déconnecter"
          >
            <span className="bo-signe">
              <Sortie />
            </span>
            <span className="bo-libelle">Se déconnecter</span>
          </button>
        </form>
        <Link className="bo-lien" href="/" target="_blank" title="Voir le site">
          <span className="bo-signe">
            <Externe />
          </span>
          <span className="bo-libelle">Voir le site</span>
        </Link>
      </div>
      {parametres ? <ModaleParametres onFermer={() => setParametres(false)} /> : null}
    </aside>
  );
}

/** L'accueil ne s'allume que sur lui-même ; les autres onglets couvrent leurs sous-pages. */
function estCourant(chemin: string, href: string) {
  if (href === '/admin/') return chemin === '/admin' || chemin === '/admin/';
  return chemin.startsWith(href.replace(/\/$/, ''));
}
