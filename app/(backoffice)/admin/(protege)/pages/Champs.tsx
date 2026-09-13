'use client';

import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import type { Champ } from '@/cms/schema';
import {
  OPTIONS_ALIGNEMENT,
  OPTIONS_COULEUR,
  OPTIONS_POLICE,
  OPTIONS_TAILLE,
} from '@/cms/champs';
import { COULEUR_LIBRE } from '@/lib/apparence';
import { urlMedia, type Dossier, type Media } from '@/lib/modeles';
import { Descendre, Fermer, Monter, Poubelle } from './Icones';
import { EditeurTexteRiche } from './TexteRicheEditeur';
import e from './editeur.module.css';

/**
 * Les panneaux de réglages sont **générés depuis le catalogue**, jamais écrits
 * à la main.
 *
 * Ajouter un champ à une section, c'est ajouter une ligne dans
 * `cms/catalogue.ts` : l'éditeur l'affiche, le serveur le valide et le site
 * l'affiche, sans qu'aucun de ces trois endroits ait besoin d'être touché.
 */

/**
 * La liste des pages, mise à disposition de tout le panneau.
 *
 * Passée par un contexte plutôt que de main en main : les champs s'imbriquent
 * — une liste contient des groupes qui contiennent des champs — et traverser
 * quatre signatures pour un menu déroulant ne vaut pas la peine.
 */
const ContextePages = createContext<PageBreve[]>([]);

/** Les dossiers de la médiathèque, pour le sélecteur d'image. */
const ContexteDossiers = createContext<Dossier[]>([]);

export type PageBreve = { id: number; titre: string; chemin: string };

type Props = {
  champs: Champ[];
  /** Les pages du site, pour les champs qui en désignent une. */
  pages?: PageBreve[];
  /** Les dossiers de la médiathèque, pour filtrer le choix d'une image. */
  dossiers?: Dossier[];
  valeurs: Record<string, any>;
  medias: Media[];
  onChange: (valeurs: Record<string, any>) => void;
  /** Le champ montre du doigt depuis l'apercu, a ouvrir en premier. */
  vise?: string | null;
  onVu?: () => void;
};

export function Champs({ champs, valeurs, medias, onChange, vise, onVu, pages, dossiers }: Props) {
  const poser = (nom: string, v: unknown) => onChange({ ...valeurs, [nom]: v });
  const boite = useRef<HTMLDivElement>(null);

  /**
   * Le champ désigné dans l'aperçu se met sous les yeux et prend le curseur.
   * Sans cela, cliquer sur une image ouvrirait un panneau de douze réglages
   * sans dire lequel concerne ce qu'on vient de montrer.
   */
  useEffect(() => {
    if (!vise) return;
    const cible = boite.current?.querySelector(`[data-nom="${vise}"]`);
    const saisie = cible?.querySelector<HTMLElement>('input, textarea, select, button');
    (saisie ?? (cible as HTMLElement | null))?.scrollIntoView({ block: 'center' });
    saisie?.focus({ preventScroll: true });
    onVu?.();
  }, [vise, onVu]);

  const contenu = (
    <div className={e.champs} ref={boite}>
      {grouperEnLignes(champs).map((groupe, i) =>
        groupe.length > 1 ? (
          <div key={i} className={e.ligne}>
            {groupe.map((champ) => (
              <div key={champ.nom} data-nom={champ.nom} style={{ display: 'contents' }}>
                <UnChamp
                  champ={champ}
                  valeur={valeurs[champ.nom]}
                  valeurs={valeurs}
                  medias={medias}
                  onChange={(v) => poser(champ.nom, v)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div key={groupe[0].nom} data-nom={groupe[0].nom} style={{ display: 'contents' }}>
            <UnChamp
              champ={groupe[0]}
              valeur={valeurs[groupe[0].nom]}
              valeurs={valeurs}
              medias={medias}
              onChange={(v) => poser(groupe[0].nom, v)}
            />
          </div>
        ),
      )}
    </div>
  );

  // Seul le panneau de plus haut niveau fournit la liste : les Champs
  // imbriqués héritent de la sienne.
  // Le panneau de plus haut niveau fournit les listes ; les Champs imbriqués
  // héritent des siennes. Une section n'a pas besoin des pages, mais elle a
  // besoin des dossiers : les deux contextes sont donc indépendants.
  if (!pages && !dossiers) return contenu;
  return (
    <ContextePages.Provider value={pages ?? []}>
      <ContexteDossiers.Provider value={dossiers ?? []}>{contenu}</ContexteDossiers.Provider>
    </ContextePages.Provider>
  );
}

/** Une page du site, choisie dans la liste de celles qui existent. */
function ChampPage({
  id,
  etiquette,
  aide,
  valeur,
  onChange,
}: {
  id: string;
  etiquette: React.ReactNode;
  aide: React.ReactNode;
  valeur: any;
  onChange: (v: unknown) => void;
}) {
  const pages = useContext(ContextePages);

  return (
    <div className="bo-champ">
      {etiquette}
      <select id={id} value={valeur ?? ''} onChange={(ev) => onChange(ev.target.value)}>
        {/* Une page supprimée depuis laisserait un menu déroulant vide : on
            garde sa valeur visible plutôt que d'en choisir une autre à la
            place de Kevin. */}
        {valeur !== undefined && !pages.some((p) => p.chemin === valeur) ? (
          <option value={valeur}>{valeur ? `/${valeur}/` : 'Page d’accueil'}</option>
        ) : null}
        {pages.map((p) => (
          <option key={p.id} value={p.chemin}>
            {p.titre}
          </option>
        ))}
      </select>
      {aide}
    </div>
  );
}

/** Les champs marqués « moitié » qui se suivent partagent une ligne. */
function grouperEnLignes(champs: Champ[]) {
  const lignes: Champ[][] = [];
  for (const champ of champs) {
    const derniere = lignes[lignes.length - 1];
    if ('moitie' in champ && champ.moitie && derniere?.length === 1 && 'moitie' in derniere[0] && derniere[0].moitie) {
      derniere.push(champ);
    } else {
      lignes.push([champ]);
    }
  }
  return lignes;
}

function UnChamp({
  champ,
  valeur,
  valeurs,
  medias,
  onChange,
}: {
  champ: Champ;
  valeur: any;
  valeurs: Record<string, any>;
  medias: Media[];
  onChange: (v: unknown) => void;
}) {
  const id = useId();

  if (champ.siValeur && valeurs[champ.siValeur.champ] !== champ.siValeur.vaut) return null;

  const etiquette = (
    <label htmlFor={id}>
      {champ.libelle}
      {champ.requis ? <span aria-hidden="true"> *</span> : null}
    </label>
  );
  const aide = champ.aide ? <p className={e.aide}>{champ.aide}</p> : null;

  switch (champ.type) {
    case 'texte':
      return (
        <div className="bo-champ">
          {etiquette}
          {champ.multiligne ? (
            <textarea id={id} value={valeur ?? ''} onChange={(ev) => onChange(ev.target.value)} />
          ) : (
            <input id={id} type="text" value={valeur ?? ''} onChange={(ev) => onChange(ev.target.value)} />
          )}
          {aide}
        </div>
      );

    case 'choix':
      return (
        <div className="bo-champ">
          {etiquette}
          <select id={id} value={valeur ?? champ.defaut ?? ''} onChange={(ev) => onChange(ev.target.value)}>
            {!champ.requis && !champ.defaut ? <option value="">—</option> : null}
            {champ.options.map((o) => (
              <option key={o.valeur} value={o.valeur}>
                {o.libelle}
              </option>
            ))}
          </select>
          {aide}
        </div>
      );

    case 'booleen':
      return (
        <div className={e.bascule}>
          <input
            id={id}
            type="checkbox"
            checked={valeur ?? champ.defaut ?? false}
            onChange={(ev) => onChange(ev.target.checked)}
          />
          <div>
            <label htmlFor={id}>{champ.libelle}</label>
            {aide}
          </div>
        </div>
      );

    case 'texteRiche':
      return (
        <div className="bo-champ">
          {etiquette}
          <EditeurTexteRiche doc={valeur} onChange={onChange} />
          {aide}
        </div>
      );

    case 'page':
      return <ChampPage id={id} etiquette={etiquette} aide={aide} valeur={valeur} onChange={onChange} />;

    case 'image':
      return (
        <div className="bo-champ">
          {etiquette}
          <ChoixImage valeur={valeur} medias={medias} onChange={onChange} />
          {aide}
        </div>
      );

    case 'apparence':
      return <Apparence valeur={valeur ?? champ.defaut ?? {}} onChange={onChange} />;

    case 'groupe':
      return (
        <fieldset className={e.groupe}>
          <legend>{champ.libelle}</legend>
          <Champs champs={champ.champs} valeurs={valeur ?? {}} medias={medias} onChange={onChange} />
        </fieldset>
      );

    case 'repli':
      return (
        <details className={e.repli}>
          <summary>{champ.libelle}</summary>
          <Champs champs={champ.champs} valeurs={valeur ?? {}} medias={medias} onChange={onChange} />
        </details>
      );

    case 'liste':
      return (
        <Liste champ={champ} valeur={valeur} medias={medias} onChange={onChange} aide={aide} />
      );

    default:
      return null;
  }
}

function Liste({
  champ,
  valeur,
  medias,
  onChange,
  aide,
}: {
  champ: Extract<Champ, { type: 'liste' }>;
  valeur: any;
  medias: Media[];
  onChange: (v: unknown) => void;
  aide: React.ReactNode;
}) {
  const items: Record<string, any>[] = Array.isArray(valeur) ? valeur : [];
  const plein = champ.maximum !== undefined && items.length >= champ.maximum;

  const remplacer = (i: number, v: Record<string, any>) =>
    onChange(items.map((item, n) => (n === i ? v : item)));
  const deplacer = (i: number, pas: number) => {
    const cible = i + pas;
    if (cible < 0 || cible >= items.length) return;
    const copie = [...items];
    [copie[i], copie[cible]] = [copie[cible], copie[i]];
    onChange(copie);
  };

  return (
    <div className={e.liste}>
      <div className={e.listeTete}>
        <span>{champ.libelle}</span>
        <span className={e.compte}>{items.length}</span>
      </div>
      {aide}

      {items.map((item, i) => (
        <div key={i} className={e.item}>
          <div className={e.itemTete}>
            <span>
              {champ.libelleItem ?? 'Élément'} {i + 1}
            </span>
            <div className={e.itemBoutons}>
              <button type="button" onClick={() => deplacer(i, -1)} disabled={i === 0} aria-label="Monter">
                <Monter />
              </button>
              <button
                type="button"
                onClick={() => deplacer(i, 1)}
                disabled={i === items.length - 1}
                aria-label="Descendre"
              >
                <Descendre />
              </button>
              <button
                type="button"
                className={e.boutonDanger}
                onClick={() => onChange(items.filter((_, n) => n !== i))}
                aria-label="Supprimer cet élément"
              >
                <Poubelle />
              </button>
            </div>
          </div>
          <Champs
            champs={champ.champs}
            valeurs={item}
            medias={medias}
            onChange={(v) => remplacer(i, v)}
          />
        </div>
      ))}

      <button
        type="button"
        className="bo-bouton bo-bouton-discret"
        onClick={() => onChange([...items, {}])}
        disabled={plein}
      >
        {plein ? `Maximum de ${champ.maximum} atteint` : `Ajouter ${champ.libelleItem ?? 'un élément'}`}
      </button>
    </div>
  );
}

function ChoixImage({
  valeur,
  medias,
  onChange,
}: {
  valeur: any;
  medias: Media[];
  onChange: (v: unknown) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const choisi = medias.find((x) => x.id === valeur);

  if (!medias.length) {
    return (
      <p className={e.aide}>
        La médiathèque est vide. Déposez des images dans l’onglet Médiathèque pour pouvoir les
        choisir ici.
      </p>
    );
  }

  return (
    <div className={e.choixImage}>
      {choisi ? (
        <figure className={e.apercuImage}>
          <img src={urlMedia(choisi.tailles[0]?.fichier ?? choisi.fichier)} alt="" />
          <figcaption>{choisi.alt}</figcaption>
        </figure>
      ) : null}

      <div className={e.choixBoutons}>
        <button type="button" className="bo-bouton bo-bouton-discret" onClick={() => setOuvert(true)}>
          {choisi ? 'Changer d’image' : 'Choisir une image'}
        </button>
        {choisi ? (
          <button
            type="button"
            className="bo-bouton bo-bouton-discret"
            onClick={() => onChange(undefined)}
          >
            Retirer
          </button>
        ) : null}
      </div>

      {ouvert ? (
        <SelecteurImage
          medias={medias}
          choisi={valeur}
          onChoisir={(id) => {
            onChange(id);
            setOuvert(false);
          }}
          onFermer={() => setOuvert(false)}
        />
      ) : null}
    </div>
  );
}

/**
 * Le choix se fait à l'œil.
 *
 * Un menu déroulant obligerait Kevin à reconnaître ses photographies à leur
 * description, ce qui n'a aucun sens pour un photographe.
 */
function SelecteurImage({
  medias,
  choisi,
  onChoisir,
  onFermer,
}: {
  medias: Media[];
  choisi: any;
  onChoisir: (id: number) => void;
  onFermer: () => void;
}) {
  const [recherche, setRecherche] = useState('');
  // null : tous les dossiers. 0 : les images qui ne sont rangées nulle part.
  const [dossier, setDossier] = useState<number | null>(null);
  const dossiers = useContext(ContexteDossiers);

  useEffect(() => {
    const echap = (ev: KeyboardEvent) => ev.key === 'Escape' && onFermer();
    window.addEventListener('keydown', echap);
    return () => window.removeEventListener('keydown', echap);
  }, [onFermer]);

  const q = recherche.trim().toLowerCase();
  const filtres = medias
    .filter((x) => (dossier === null ? true : dossier === 0 ? !x.dossierId : x.dossierId === dossier))
    .filter((x) => !q || x.alt.toLowerCase().includes(q));

  return (
    <div className={e.voile} role="dialog" aria-modal="true" aria-label="Choisir une image">
      <div className={e.modale}>
        <div className={e.modaleTete}>
          <h2>Choisir une image</h2>
          <button type="button" onClick={onFermer} aria-label="Fermer">
            <Fermer />
          </button>
        </div>

        <input
          type="search"
          className={e.recherche}
          placeholder="Rechercher par description"
          value={recherche}
          onChange={(ev) => setRecherche(ev.target.value)}
          autoFocus
        />

        {/* Les dossiers de la médiathèque : un rangement personnel, qui ne
            change rien au site, mais qui évite de faire défiler trois cents
            photographies pour en retrouver une. */}
        {dossiers.length ? (
          <div className={e.filtresDossiers} role="group" aria-label="Filtrer par dossier">
            <button
              type="button"
              data-actif={dossier === null ? '' : undefined}
              onClick={() => setDossier(null)}
            >
              Toutes
            </button>
            {dossiers.map((d) => (
              <button
                key={d.id}
                type="button"
                data-actif={dossier === d.id ? '' : undefined}
                onClick={() => setDossier(d.id)}
              >
                {d.nom}
              </button>
            ))}
            <button
              type="button"
              data-actif={dossier === 0 ? '' : undefined}
              onClick={() => setDossier(0)}
            >
              Non rangées
            </button>
          </div>
        ) : null}

        <div className={e.modaleCorps}>
          <div className={e.grilleImages}>
            {filtres.map((media) => (
              <button
                key={media.id}
                type="button"
                className={e.carteImage}
                data-choisie={media.id === choisi ? '' : undefined}
                onClick={() => onChoisir(media.id)}
              >
                <img src={urlMedia(media.tailles[0]?.fichier ?? media.fichier)} alt="" loading="lazy" />
                <span>{media.alt}</span>
              </button>
            ))}
          </div>
          {!filtres.length ? <p className={e.aide}>Aucune image ne correspond.</p> : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Taille, police, couleur, alignement.
 *
 * Les trois garde-fous sont ici : une échelle et non des pixels, une palette et
 * non une pipette, une liste courte de polices installées. Le choix libre reste
 * possible sur la couleur, et l'aide prévient quand il devient risqué.
 */
function Apparence({
  valeur,
  onChange,
}: {
  valeur: Record<string, any>;
  onChange: (v: unknown) => void;
}) {
  const poser = (cle: string, v: string) => onChange({ ...valeur, [cle]: v });
  const libre = valeur.couleur === 'personnalisee';
  const valide = !valeur.couleurLibre || COULEUR_LIBRE.test(valeur.couleurLibre);

  const liste = (cle: string, libelle: string, options: { valeur: string; libelle: string }[]) => (
    <div className="bo-champ">
      <label>{libelle}</label>
      <select value={valeur[cle] ?? ''} onChange={(ev) => poser(cle, ev.target.value)}>
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.valeur} value={o.valeur}>
            {o.libelle}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <details className={e.repli}>
      <summary>Apparence</summary>
      <div className={e.champs}>
        <div className={e.ligne}>
          {liste('taille', 'Taille', OPTIONS_TAILLE)}
          {liste('police', 'Police', OPTIONS_POLICE)}
        </div>
        <div className={e.ligne}>
          {liste('couleur', 'Couleur', OPTIONS_COULEUR)}
          {liste('alignement', 'Alignement', OPTIONS_ALIGNEMENT)}
        </div>

        {libre ? (
          <div className="bo-champ">
            <label>Couleur personnalisée</label>
            <input
              type="text"
              placeholder="#B9784F"
              value={valeur.couleurLibre ?? ''}
              onChange={(ev) => poser('couleurLibre', ev.target.value)}
            />
            <p className={e.aide}>
              {valide
                ? 'À manier avec précaution : la palette du site est pensée pour rester lisible sur fond sombre.'
                : 'Attendu : une couleur hexadécimale, par exemple #B9784F. Tant qu’elle est incorrecte, elle est ignorée.'}
            </p>
          </div>
        ) : null}
      </div>
    </details>
  );
}
