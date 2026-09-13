import Link from 'next/link';
import { telephoneUri, type Entreprise, type PiedDePage } from '@/lib/modeles';
import s from './Footer.module.css';

/**
 * Le pied de page.
 *
 * Deux sources, et la distinction tient : **l'entreprise** donne les faits —
 * téléphone, adresse, réseaux, liens légaux, réglés une seule fois dans les
 * Paramètres — et **le pied** donne ses propres textes et ce qu'il choisit
 * d'en montrer, réglés dans l'éditeur comme une section.
 *
 * Les deux lui sont passés plutôt que lus ici : l'aperçu du BackOffice affiche
 * ce même composant depuis le navigateur, et un composant qui interroge la
 * base ne peut pas y entrer. Un lien vide n'est pas affiché, plutôt que de
 * mener nulle part.
 */
export function Footer({ entreprise, pied }: { entreprise: Entreprise; pied: PiedDePage }) {
  const reseaux = (
    [
      ['instagram', 'Instagram'],
      ['facebook', 'Facebook'],
      ['linkedin', 'LinkedIn'],
      ['youtube', 'YouTube'],
    ] as const
  )
    .map(([cle, label]) => ({ href: entreprise.liens[cle], label }))
    .filter((r) => r.href && pied.reseauxActifs);

  return (
    <footer className={s.pied}>
      <div className="wrap">
        <div className={s.grille}>
          <div className={s.bloc}>
            <img className={s.logo} src="/assets/logo-clair.svg" alt={entreprise.nom} width={1774} height={547} />
            {pied.signature ? <p className={s.signature}>{pied.signature}</p> : null}
            <div className={s.reseaux}>
              {reseaux.map((r) => (
                <a key={r.label} className={s.lien} href={r.href} target="_blank" rel="noopener noreferrer">
                  {r.label}
                </a>
              ))}
            </div>
          </div>

          <nav className={s.bloc} aria-label="Navigation de pied de page">
            <p className={s.titreBloc}>{pied.site.titre}</p>
            <div className={s.liste}>
              <Link className={s.lien} href="/">
                Accueil
              </Link>
              {pied.site.menu.map((item) => (
                <Link key={item.chemin} className={s.lien} href={`/${item.chemin}/`}>
                  {item.libelle}
                </Link>
              ))}
            </div>
          </nav>

          <div className={s.bloc}>
            <p className={s.titreBloc}>{pied.joindre.titre}</p>
            <div className={s.liste}>
              {pied.joindre.telephone && entreprise.telephone ? (
                <a className={s.lien} href={telephoneUri(entreprise.telephone)}>
                  {entreprise.telephone}
                </a>
              ) : null}
              {pied.joindre.email && entreprise.email ? (
                <a className={s.lien} href={`mailto:${entreprise.email}`}>
                  {entreprise.email}
                </a>
              ) : null}
              {pied.joindre.acces && entreprise.liens.accesClients ? (
                <a
                  className={s.lien}
                  href={entreprise.liens.accesClients}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Accès clients ↗
                </a>
              ) : null}
              {pied.joindre.reservation && entreprise.liens.reservation ? (
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
            {pied.joindre.adresse && entreprise.adresse ? (
              <p className={s.zone}>
                Studio au {entreprise.adresse}, {entreprise.codePostal} {entreprise.ville}. Sur
                rendez-vous uniquement.
              </p>
            ) : null}
          </div>

          {pied.encadre.actif ? (
          <div className={`${s.bloc} ${s.identite}`}>
            {pied.encadre.titre ? <p className={s.titreBloc}>{pied.encadre.titre}</p> : null}
            {pied.encadre.texte ? <p>{pied.encadre.texte}</p> : null}
            {pied.encadre.lien && entreprise.liens.reservation ? (
              <a
                className={s.lien}
                href={entreprise.liens.reservation}
                target="_blank"
                rel="noopener noreferrer"
              >
                Prendre rendez-vous ↗
              </a>
            ) : null}
            {pied.encadre.zone && entreprise.zone ? (
              <p className={s.zone}>{entreprise.zone}</p>
            ) : null}
          </div>
          ) : null}
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
                // Le lien s'appelait « Cookies » quand il menait à une
                // politique de cookies. Le site n'en dépose aucun : il mène
                // maintenant à la page qui explique ce qu'il enregistre.
                ['cookies', 'Confidentialité'],
              ] as const
            )
              .filter(([cle]) => entreprise.liens[cle])
              .map(([cle, libelle]) => {
                // Les pages légales vivent sur le site : un lien interne ne
                // s'ouvre pas dans un nouvel onglet, et n'a pas à se protéger
                // d'un site tiers.
                const href = entreprise.liens[cle];
                return href.startsWith('/') ? (
                  <Link key={cle} className={s.lien} href={href}>
                    {libelle}
                  </Link>
                ) : (
                  <a
                    key={cle}
                    className={s.lien}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {libelle}
                  </a>
                );
              })}
          </div>
        </div>
      </div>
    </footer>
  );
}
