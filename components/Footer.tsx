import Link from 'next/link';
import { telephoneUri, type Entreprise } from '@/lib/modeles';
import { NAV } from '@/lib/site';
import s from './Footer.module.css';

/**
 * Le pied de page porte les coordonnées.
 *
 * Elles lui sont données plutôt que lues ici : l'aperçu du BackOffice affiche
 * ce même pied de page depuis le navigateur, et un composant qui interroge la
 * base ne peut pas y entrer. Un lien vide n'est pas affiché, plutôt que de
 * mener nulle part.
 */
export function Footer({ entreprise }: { entreprise: Entreprise }) {
  const reseaux = (
    [
      ['instagram', 'Instagram'],
      ['facebook', 'Facebook'],
      ['linkedin', 'LinkedIn'],
      ['youtube', 'YouTube'],
    ] as const
  )
    .map(([cle, label]) => ({ href: entreprise.liens[cle], label }))
    .filter((r) => r.href);

  return (
    <footer className={s.pied}>
      <div className="wrap">
        <div className={s.grille}>
          <div className={s.bloc}>
            <img className={s.logo} src="/assets/logo-clair.svg" alt={entreprise.nom} width={1774} height={547} />
            <p className={s.signature}>
              Photographe professionnel et Artisan d’Art, basé au Puy-en-Velay. Je photographie surtout des gens.
            </p>
            <div className={s.reseaux}>
              {reseaux.map((r) => (
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
              {entreprise.telephone ? (
                <a className={s.lien} href={telephoneUri(entreprise.telephone)}>
                  {entreprise.telephone}
                </a>
              ) : null}
              {entreprise.email ? (
                <a className={s.lien} href={`mailto:${entreprise.email}`}>
                  {entreprise.email}
                </a>
              ) : null}
              {entreprise.liens.accesClients ? (
                <a
                  className={s.lien}
                  href={entreprise.liens.accesClients}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Accès clients ↗
                </a>
              ) : null}
              {entreprise.liens.reservation ? (
                <a
                  className={s.lien}
                  href={entreprise.liens.reservation}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Prendre rendez-vous ↗
                </a>
              ) : null}
            </div>
            <p className={s.zone}>
              Studio au {entreprise.adresse}, {entreprise.codePostal} {entreprise.ville}. Sur
              rendez-vous uniquement.
            </p>
          </div>

          <div className={`${s.bloc} ${s.identite}`}>
            <p className={s.titreBloc}>Photos d’identité</p>
            <p>
              Photos d’identité agréées ANTS pour carte d’identité, passeport, permis de conduire et visa. À partir de
              10 € la planche de 6 photos, uniquement sur rendez-vous au Puy-en-Velay.
            </p>
            {entreprise.liens.reservation ? (
              <a
                className={s.lien}
                href={entreprise.liens.reservation}
                target="_blank"
                rel="noopener noreferrer"
              >
                Prendre rendez-vous ↗
              </a>
            ) : null}
            <p className={s.zone}>{entreprise.zone}</p>
          </div>
        </div>

        <div className={s.bas}>
          <p>
            © {new Date().getFullYear()} {entreprise.nom}. Toutes les photographies sont
            protégées.
          </p>
          <div className={s.basLiens}>
            {(
              [
                ['mentions', 'Mentions légales'],
                ['cgv', 'CGV'],
                ['cookies', 'Cookies'],
              ] as const
            )
              .filter(([cle]) => entreprise.liens[cle])
              .map(([cle, libelle]) => (
                <a
                  key={cle}
                  className={s.lien}
                  href={entreprise.liens[cle]}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {libelle}
                </a>
              ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
