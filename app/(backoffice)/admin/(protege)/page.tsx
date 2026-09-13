import Link from 'next/link';
import { utilisateurConnecte } from '@/lib/auth';
import { lireAudience } from '@/lib/audience';
import { compterNonLus } from '@/lib/messages';
import { Barres, Courbe } from './Graphiques';
import g from './tableau.module.css';

export const metadata = { title: 'Tableau de bord' };
export const dynamic = 'force-dynamic';

const PERIODES = [
  { jours: 7, libelle: '7 jours' },
  { jours: 30, libelle: '30 jours' },
  { jours: 365, libelle: '12 mois' },
] as const;

const NOMS_EVENEMENTS: Record<string, string> = {
  reservation: 'Clics vers la réservation',
  appel: 'Clics sur le téléphone',
  contact: 'Formulaires envoyés',
  'acces-clients': 'Accès à la galerie client',
};

export default async function TableauDeBord({
  searchParams,
}: {
  searchParams: Promise<{ jours?: string }>;
}) {
  const demande = Number((await searchParams).jours);
  const jours = PERIODES.some((p) => p.jours === demande) ? demande : 30;

  const [utilisateur, audience, nonLus] = await Promise.all([
    utilisateurConnecte(),
    lireAudience(jours),
    compterNonLus(),
  ]);

  const totalAppareils = audience.mobile + audience.ordinateur;
  const partMobile = totalAppareils ? Math.round((audience.mobile / totalAppareils) * 100) : null;

  return (
    <>
      <div>
        <h1 className="bo-titre">Bonjour {utilisateur?.prenom}</h1>
        <p className="bo-sous-titre">
          {nonLus > 0 ? (
            <>
              Vous avez{' '}
              <Link href="/admin/messages/" className={g.lien}>
                {nonLus} message{nonLus > 1 ? 's' : ''} non lu{nonLus > 1 ? 's' : ''}
              </Link>
              .
            </>
          ) : (
            'Aucun message en attente.'
          )}
        </p>
      </div>

      {/* Les filtres au-dessus des graphiques, sur une seule ligne. */}
      <nav className={g.periodes} aria-label="Période">
        {PERIODES.map((p) => (
          <Link
            key={p.jours}
            href={`/admin/?jours=${p.jours}`}
            aria-current={p.jours === jours ? 'page' : undefined}
          >
            {p.libelle}
          </Link>
        ))}
      </nav>

      {audience.vues === 0 ? (
        <p className="bo-aide">
          Aucune visite mesurée sur cette période. La mesure démarre dès la mise en ligne du site,
          sans cookie et sans bandeau de consentement à afficher.
        </p>
      ) : null}

      <div className={g.chiffres}>
        <Chiffre titre="Visiteurs" valeur={audience.visiteurs} variation={audience.variationVisiteurs} />
        <Chiffre titre="Pages vues" valeur={audience.vues} variation={audience.variationVues} />
        <Chiffre
          titre="Sur téléphone"
          valeur={partMobile === null ? '—' : `${partMobile} %`}
          detail={partMobile === null ? undefined : `${100 - partMobile} % sur ordinateur`}
        />
        {audience.evenements.slice(0, 1).map((e) => (
          <Chiffre key={e.nom} titre={NOMS_EVENEMENTS[e.nom] ?? e.nom} valeur={e.total} />
        ))}
      </div>

      {/* Deux mesures, deux graphiques. Les superposer demanderait de les
          distinguer par la couleur, ce que la palette du site ne permet pas de
          faire de façon lisible. */}
      <div className={g.duo}>
        <Courbe
          titre="Visiteurs par jour"
          points={audience.jours.map((j) => ({ jour: j.jour, valeur: j.visiteurs }))}
        />
        <Courbe
          titre="Pages vues par jour"
          points={audience.jours.map((j) => ({ jour: j.jour, valeur: j.vues }))}
        />
      </div>

      <div className={g.duo}>
        <Barres
          titre="D’où viennent les visiteurs"
          vide="Aucune source sur cette période."
          lignes={audience.sources.map((s) => ({
            nom: s.nom === 'direct' ? 'Accès direct' : s.nom,
            valeur: s.vues,
          }))}
        />
        <Barres
          titre="Pages les plus vues"
          vide="Aucune page vue sur cette période."
          lignes={audience.pages.map((p) => ({ nom: p.chemin, valeur: p.vues }))}
        />
      </div>

      {audience.evenements.length > 1 ? (
        <Barres
          titre="Ce que font les visiteurs"
          vide="Aucun geste mesuré."
          lignes={audience.evenements.map((e) => ({
            nom: NOMS_EVENEMENTS[e.nom] ?? e.nom,
            valeur: e.total,
          }))}
        />
      ) : null}

      <p className={g.note}>
        Aucun cookie, aucune adresse IP enregistrée. Un visiteur est reconnu dans la journée par
        une empreinte qui change chaque nuit et ne permet pas de remonter à lui. C’est ce qui
        dispense le site de bandeau de consentement.
      </p>
    </>
  );
}

function Chiffre({
  titre,
  valeur,
  variation,
  detail,
}: {
  titre: string;
  valeur: number | string;
  variation?: number | null;
  detail?: string;
}) {
  return (
    <div className={g.chiffre}>
      <span className={g.chiffreTitre}>{titre}</span>
      <strong>{valeur}</strong>
      {variation !== null && variation !== undefined ? (
        <span className={g.variation} data-sens={variation >= 0 ? 'hausse' : 'baisse'}>
          {variation >= 0 ? '+' : ''}
          {variation} % face à la période précédente
        </span>
      ) : detail ? (
        <span className={g.chiffreDetail}>{detail}</span>
      ) : null}
    </div>
  );
}
