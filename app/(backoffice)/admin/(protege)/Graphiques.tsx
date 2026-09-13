'use client';

import { useId, useState } from 'react';
import g from './tableau.module.css';

/**
 * Les graphiques du tableau de bord.
 *
 * Un seul accent, le cuivre du site, et rien d'autre. Ce n'est pas qu'une
 * question de goût : deux teintes proches de la palette ont été mesurées trop
 * semblables pour être distinguées de façon fiable, y compris en vision
 * normale. Plutôt que d'inventer des couleurs étrangères à la direction
 * artistique, chaque mesure a son propre graphique, et l'identité passe par le
 * titre, jamais par la couleur.
 */

const ACCENT = 'var(--bo-accent)';
const GRILLE = 'var(--bo-bord)';

type Point = { jour: string; valeur: number };

/** Courbe de fréquentation, avec repère au survol. */
export function Courbe({ titre, points }: { titre: string; points: Point[] }) {
  const [survol, setSurvol] = useState<number | null>(null);
  const id = useId();

  const L = 640;
  const H = 180;
  const marge = { haut: 12, bas: 24, gauche: 4, droite: 4 };
  const largeur = L - marge.gauche - marge.droite;
  const hauteur = H - marge.haut - marge.bas;

  const max = Math.max(1, ...points.map((p) => p.valeur));
  const x = (i: number) =>
    marge.gauche + (points.length <= 1 ? largeur / 2 : (i / (points.length - 1)) * largeur);
  const y = (v: number) => marge.haut + hauteur - (v / max) * hauteur;

  const ligne = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.valeur).toFixed(1)}`).join(' ');
  const aire = `${ligne} L${x(points.length - 1).toFixed(1)},${marge.haut + hauteur} L${x(0).toFixed(1)},${marge.haut + hauteur} Z`;

  const actif = survol !== null ? points[survol] : null;
  const reperes = reperesAxe(points);

  return (
    <figure className={g.figure}>
      <figcaption>
        <h3>{titre}</h3>
        <p aria-live="polite">
          {actif ? (
            <>
              <strong>{actif.valeur}</strong> le {dateCourte(actif.jour)}
            </>
          ) : (
            <span className={g.discret}>Survolez la courbe pour lire un jour</span>
          )}
        </p>
      </figcaption>

      <svg
        viewBox={`0 0 ${L} ${H}`}
        className={g.svg}
        role="img"
        aria-labelledby={id}
        onMouseLeave={() => setSurvol(null)}
        onMouseMove={(ev) => {
          const cadre = ev.currentTarget.getBoundingClientRect();
          const relatif = ((ev.clientX - cadre.left) / cadre.width) * L;
          const i = Math.round(((relatif - marge.gauche) / largeur) * (points.length - 1));
          setSurvol(Math.min(points.length - 1, Math.max(0, i)));
        }}
      >
        <title id={id}>
          {`${titre} : ${points.map((p) => `${dateCourte(p.jour)} ${p.valeur}`).join(', ')}`}
        </title>

        {/* Grille discrète : trois repères suffisent à situer une hauteur. */}
        {[0, 0.5, 1].map((part) => (
          <line
            key={part}
            x1={marge.gauche}
            x2={L - marge.droite}
            y1={marge.haut + hauteur * part}
            y2={marge.haut + hauteur * part}
            stroke={GRILLE}
            strokeWidth="1"
          />
        ))}

        <path d={aire} fill={ACCENT} opacity="0.12" />
        <path d={ligne} fill="none" stroke={ACCENT} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {actif && survol !== null ? (
          <>
            <line
              x1={x(survol)}
              x2={x(survol)}
              y1={marge.haut}
              y2={marge.haut + hauteur}
              stroke={GRILLE}
              strokeWidth="1"
            />
            {/* Anneau de la couleur du fond : le point reste lisible même
                posé sur la courbe. */}
            <circle cx={x(survol)} cy={y(actif.valeur)} r="5" fill={ACCENT} stroke="var(--bo-surface)" strokeWidth="2" />
          </>
        ) : null}

        {reperes.map((r) => (
          <text
            key={r.i}
            x={x(r.i)}
            y={H - 6}
            textAnchor={r.i === 0 ? 'start' : r.i === points.length - 1 ? 'end' : 'middle'}
            className={g.axe}
          >
            {r.texte}
          </text>
        ))}
      </svg>
    </figure>
  );
}

/** Barres horizontales. Le libellé porte l'identité, la couleur ne dit rien. */
export function Barres({
  titre,
  lignes,
  vide,
}: {
  titre: string;
  lignes: { nom: string; valeur: number }[];
  vide: string;
}) {
  const max = Math.max(1, ...lignes.map((l) => l.valeur));

  return (
    <figure className={g.figure}>
      <figcaption>
        <h3>{titre}</h3>
      </figcaption>

      {lignes.length === 0 ? (
        <p className={g.discret}>{vide}</p>
      ) : (
        <ol className={g.barres}>
          {lignes.map((l) => (
            <li key={l.nom} title={`${l.nom} — ${l.valeur}`}>
              <span className={g.barreNom}>{l.nom}</span>
              <span className={g.barrePiste}>
                {/* Bout arrondi côté données, ancré à la base : la barre se lit
                    comme une quantité, pas comme une pastille. */}
                <span
                  className={g.barreRemplie}
                  style={{ width: `${Math.max(2, (l.valeur / max) * 100)}%` }}
                />
              </span>
              <span className={g.barreValeur}>{l.valeur}</span>
            </li>
          ))}
        </ol>
      )}
    </figure>
  );
}

/**
 * Les dates à écrire sous la courbe.
 *
 * Deux bornes ne disent rien d'une année : sur douze mois, chaque mois est
 * annoncé ; sur un mois, une date tous les cinq jours ; sur une semaine, chaque
 * jour. Jamais plus de treize repères, sinon ils se chevauchent — la largeur
 * du graphique ne change pas, le nombre de points si.
 */
function reperesAxe(points: Point[]) {
  if (points.length <= 1) return points.map((p, i) => ({ i, texte: dateCourte(p.jour) }));

  // Au-delà de trois mois, on raisonne en mois : le premier jour de chacun.
  if (points.length > 92) {
    const debuts: { i: number; texte: string }[] = [];
    points.forEach((p, i) => {
      const mois = Number(p.jour.split('-')[1]);
      if (i === 0 || Number(points[i - 1].jour.split('-')[1]) !== mois) {
        debuts.push({ i, texte: MOIS[mois - 1] ?? '' });
      }
    });
    // Le premier mois de la fenêtre est souvent entamé : s'il reste moins de
    // trois semaines avant le suivant, les deux noms se chevauchent. On garde
    // alors le mois entier, et l'on renonce au bout de celui d'avant.
    const ecart = points.length / 16;
    return debuts.filter((d, n) => n === debuts.length - 1 || debuts[n + 1].i - d.i > ecart);
  }

  const pas = Math.max(1, Math.ceil(points.length / 7));
  const reperes: { i: number; texte: string }[] = [];
  for (let i = 0; i < points.length; i += pas) reperes.push({ i, texte: dateCourte(points[i].jour) });

  // La dernière date compte plus que les autres : on la garde toujours, quitte
  // à sacrifier l'avant-dernière si elles se touchent.
  const fin = points.length - 1;
  if (reperes[reperes.length - 1].i !== fin) {
    if (fin - reperes[reperes.length - 1].i < pas / 2) reperes.pop();
    reperes.push({ i: fin, texte: dateCourte(points[fin].jour) });
  }
  return reperes;
}

/**
 * Le jour, en toutes lettres courtes.
 *
 * Écrit à la main plutôt que confie a `toLocaleDateString` : le serveur et le
 * navigateur n'abrègent pas les mois de la meme facon, et l'écart suffisait à
 * faire échouer l'hydratation de la page — qui perdait alors tous ses
 * gestionnaires d'événements, jusqu'à la touche Échap d'une fenetre.
 */
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

function dateCourte(iso?: string) {
  if (!iso) return '';
  const [, mois, jour] = iso.split('-');
  const n = Number(mois);
  if (!n || n < 1 || n > 12) return iso;
  return `${Number(jour)} ${MOIS[n - 1]}`;
}
