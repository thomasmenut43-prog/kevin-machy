'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { LIENS, NAV, SITE } from '@/lib/site';
import { telephoneUri, urlMedia, type Entreprise, type Media, type Navigation } from '@/lib/modeles';
import s from './Header.module.css';

/**
 * La barre de navigation, telle que Kevin l'a réglée.
 *
 * Sans configuration — le temps que la base réponde, ou si elle n'a jamais été
 * touchée — l'en-tête retombe sur le menu écrit dans le code. Le site n'est
 * donc jamais sans navigation, quoi qu'il arrive à la base.
 */
const REPLI: Navigation = {
  logoActif: true,
  logoImage: null,
  menu: NAV.map((n) => ({ chemin: n.href.replace(/^\/|\/$/g, ''), libelle: n.label })),
  telephoneActif: true,
  telephone: SITE.telephone,
  accesActif: true,
  accesLibelle: 'Accès clients',
  accesLien: LIENS.accesClients,
};

export function Header({
  nav,
  logo,
  entreprise,
}: {
  nav?: Navigation | null;
  logo?: Media | null;
  /** Nom et adresse publique, réglés dans Paramètres → Mon entreprise. */
  entreprise: Entreprise;
}) {
  const reglages = nav ?? REPLI;
  const liens = reglages.menu.map((l) => ({
    href: l.chemin ? `/${l.chemin}/` : '/',
    label: l.libelle ?? l.chemin,
  }));
  const chemin = usePathname();
  const [pose, setPose] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const bascule = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const auDefilement = () => setPose(window.scrollY > 24);
    auDefilement();
    window.addEventListener('scroll', auDefilement, { passive: true });
    return () => window.removeEventListener('scroll', auDefilement);
  }, []);

  // Le panneau plein écran verrouille le défilement et se ferme au clavier.
  useEffect(() => {
    if (!ouvert) return;
    const precedent = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOuvert(false);
        bascule.current?.focus();
      }
    };
    document.addEventListener('keydown', auClavier);
    return () => {
      document.body.style.overflow = precedent;
      document.removeEventListener('keydown', auClavier);
    };
  }, [ouvert]);

  useEffect(() => {
    setOuvert(false);
  }, [chemin]);

  const actif = (href: string) => chemin === href || (href !== '/' && chemin.startsWith(href));

  return (
    <>
      <header className={s.entete} data-pose={pose || ouvert}>
        <div className={`wrap ${s.barre}`}>
          {reglages.logoActif ? (
            <Link href="/" className={s.logo} aria-label={`${entreprise.nom} — retour à l’accueil`}>
              {logo ? (
                <img src={urlMedia(logo.fichier)} alt="" width={logo.largeur ?? 1774} height={logo.hauteur ?? 547} />
              ) : (
                <img src="/assets/logo-clair.svg" alt="" width={1774} height={547} />
              )}
            </Link>
          ) : (
            <span />
          )}

          <nav className={s.nav} aria-label="Navigation principale">
            {liens.map((item) => (
              <Link key={item.href} href={item.href} className={s.lienNav} data-actif={actif(item.href)}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className={s.appoints}>
            {reglages.telephoneActif ? (
              <a className={s.lienNav} href={telephoneUri(reglages.telephone)}>
                {reglages.telephone}
              </a>
            ) : null}
            {reglages.telephoneActif && reglages.accesActif ? (
              <span className={s.separateur} aria-hidden="true" />
            ) : null}
            {reglages.accesActif ? (
              <a
                className={s.lienNav}
                href={reglages.accesLien}
                target="_blank"
                rel="noopener noreferrer"
              >
                {reglages.accesLibelle}
              </a>
            ) : null}
          </div>

          <button
            ref={bascule}
            type="button"
            className={s.bascule}
            aria-expanded={ouvert}
            aria-controls="menu-principal"
            onClick={() => setOuvert((v) => !v)}
          >
            {ouvert ? 'Fermer' : 'Menu'}
            <span className={s.traits} aria-hidden="true">
              <span />
              <span />
            </span>
          </button>
        </div>
      </header>

      {ouvert ? (
        <div className={s.panneau} id="menu-principal">
          <nav className={`wrap ${s.panneauNav}`} aria-label="Navigation principale, plein écran">
            {liens.map((item) => (
              <Link key={item.href} href={item.href} className={s.lienPanneau} data-actif={actif(item.href)}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className={`wrap ${s.panneauPied}`}>
            {reglages.telephoneActif ? (
              <a className={s.panneauLien} href={telephoneUri(reglages.telephone)}>
                {reglages.telephone}
              </a>
            ) : null}
            {entreprise.email ? (
              <a className={s.panneauLien} href={`mailto:${entreprise.email}`}>
                {entreprise.email}
              </a>
            ) : null}
            {reglages.accesActif ? (
              <a
                className={s.panneauLien}
                href={reglages.accesLien}
                target="_blank"
                rel="noopener noreferrer"
              >
                {reglages.accesLibelle} ↗
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
