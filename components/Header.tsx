'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { LIENS, NAV, SITE } from '@/lib/site';
import s from './Header.module.css';

export function Header() {
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
          <Link href="/" className={s.logo} aria-label={`${SITE.nom} — retour à l’accueil`}>
            <img src="/assets/logo-clair.svg" alt="" width={1774} height={547} />
          </Link>

          <nav className={s.nav} aria-label="Navigation principale">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className={s.lienNav} data-actif={actif(item.href)}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className={s.appoints}>
            <a className={s.lienNav} href={SITE.telephoneUri}>
              {SITE.telephone}
            </a>
            <span className={s.separateur} aria-hidden="true" />
            <a className={s.lienNav} href={LIENS.accesClients} target="_blank" rel="noopener noreferrer">
              Accès clients
            </a>
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
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className={s.lienPanneau} data-actif={actif(item.href)}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className={`wrap ${s.panneauPied}`}>
            <a className={s.panneauLien} href={SITE.telephoneUri}>
              {SITE.telephone}
            </a>
            <a className={s.panneauLien} href={`mailto:${SITE.email}`}>
              {SITE.email}
            </a>
            <a className={s.panneauLien} href={LIENS.accesClients} target="_blank" rel="noopener noreferrer">
              Accès clients ↗
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}
