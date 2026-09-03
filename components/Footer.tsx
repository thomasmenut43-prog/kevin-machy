import Link from 'next/link';
import { LIENS, NAV, SITE, ZONE } from '@/lib/site';
import s from './Footer.module.css';

const RESEAUX = [
  { href: LIENS.instagram, label: 'Instagram' },
  { href: LIENS.facebook, label: 'Facebook' },
  { href: LIENS.linkedin, label: 'LinkedIn' },
  { href: LIENS.youtube, label: 'YouTube' },
];

export function Footer() {
  return (
    <footer className={s.pied}>
      <div className="wrap">
        <div className={s.grille}>
          <div className={s.bloc}>
            <img className={s.logo} src="/assets/logo-clair.svg" alt={SITE.nom} width={1774} height={547} />
            <p className={s.signature}>
              Photographe professionnel et Artisan d’Art, basé au Puy-en-Velay. Je photographie surtout des gens.
            </p>
            <div className={s.reseaux}>
              {RESEAUX.map((r) => (
                <a key={r.label} className={s.lien} href={r.href} target="_blank" rel="noopener noreferrer">
                  {r.label}
                </a>
              ))}
            </div>
          </div>

          <nav className={s.bloc} aria-label="Navigation de pied de page">
            <p className={s.titreBloc}>Le site</p>
            <div className={s.liste}>
              <Link className={s.lien} href="/">
                Accueil
              </Link>
              {NAV.map((item) => (
                <Link key={item.href} className={s.lien} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          <div className={s.bloc}>
            <p className={s.titreBloc}>Me joindre</p>
            <div className={s.liste}>
              <a className={s.lien} href={SITE.telephoneUri}>
                {SITE.telephone}
              </a>
              <a className={s.lien} href={`mailto:${SITE.email}`}>
                {SITE.email}
              </a>
              <a className={s.lien} href={LIENS.accesClients} target="_blank" rel="noopener noreferrer">
                Accès clients ↗
              </a>
              <a className={s.lien} href={LIENS.reservation} target="_blank" rel="noopener noreferrer">
                Prendre rendez-vous ↗
              </a>
            </div>
            <p className={s.zone}>
              Studio au {SITE.adresse}, {SITE.codePostal} {SITE.ville}. Sur rendez-vous uniquement.
            </p>
          </div>

          <div className={`${s.bloc} ${s.identite}`}>
            <p className={s.titreBloc}>Photos d’identité</p>
            <p>
              Photos d’identité agréées ANTS pour carte d’identité, passeport, permis de conduire et visa. À partir de
              10 € la planche de 6 photos, uniquement sur rendez-vous au Puy-en-Velay.
            </p>
            <a className={s.lien} href={LIENS.reservation} target="_blank" rel="noopener noreferrer">
              Prendre rendez-vous ↗
            </a>
            <p className={s.zone}>{ZONE}</p>
          </div>
        </div>

        <div className={s.bas}>
          <p>
            © {new Date().getFullYear()} {SITE.nom}. Toutes les photographies sont protégées.
          </p>
          <div className={s.basLiens}>
            <a className={s.lien} href={LIENS.mentions} target="_blank" rel="noopener noreferrer">
              Mentions légales
            </a>
            <a className={s.lien} href={LIENS.cgv} target="_blank" rel="noopener noreferrer">
              CGV
            </a>
            <a className={s.lien} href={LIENS.cookies} target="_blank" rel="noopener noreferrer">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
