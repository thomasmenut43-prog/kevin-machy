'use client';

import type React from 'react';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { urlMedia, type Dossier, type Media } from '@/lib/modeles';
import {
  actionCompterDossier,
  actionCreerDossier,
  actionDeplacerDossier,
  actionDupliquerDossier,
  actionEnvoyer,
  actionRangerPlusieurs,
  actionSupprimerPlusieurs,
  actionMajMedia,
  actionRangerMedia,
  actionRenommerDossier,
  actionSupprimerDossier,
  actionSupprimerMedia,
  type EtatMedia,
} from './actions';
import m from './mediatheque.module.css';

const VIDE: EtatMedia = {};

export function Mediatheque({ medias, dossiers }: { medias: Media[]; dossiers: Dossier[] }) {
  const [ouverte, setOuverte] = useState<Media | null>(null);
  // null : toutes les images. 0 : celles qui ne sont rangées nulle part.
  const [filtre, setFiltre] = useState<number | null>(null);
  const [choisies, setChoisies] = useState<Set<number>>(new Set());
  const [aSupprimer, setASupprimer] = useState(false);
  const [ajout, setAjout] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  // Ce qui est en train d'être glissé : l'image saisie, ou toute la sélection
  // si elle en fait partie.
  const glisse = useRef<number[]>([]);

  const basculer = (id: number) =>
    setChoisies((avant) => {
      const suite = new Set(avant);
      if (suite.has(id)) suite.delete(id);
      else suite.add(id);
      return suite;
    });

  const ranger = (ids: number[], dossierId: number | null) =>
    demarrer(async () => {
      const r = await actionRangerPlusieurs(ids, dossierId);
      setChoisies(new Set());
      setMessage(
        `${r.deplacees} image${r.deplacees > 1 ? 's' : ''} déplacée${r.deplacees > 1 ? 's' : ''}.`,
      );
    });

  const visibles =
    filtre === null
      ? medias
      : medias.filter((x) => (filtre === 0 ? !x.dossierId : x.dossierId === filtre));
  const aRemplacer = visibles.filter((x) => x.aRemplacer).length;
  const sansDossier = medias.filter((x) => !x.dossierId).length;

  // Trois aperçus par dossier : de quoi reconnaître son contenu sans l'ouvrir.
  const apercus = new Map<number | null, Media[]>();
  for (const media of medias) {
    const cle = media.dossierId ?? null;
    const liste = apercus.get(cle) ?? [];
    if (liste.length < 3) apercus.set(cle, [...liste, media]);
  }

  return (
    <>
      <div className={m.tete}>
        <button type="button" className="bo-bouton" onClick={() => setAjout(true)}>
          Ajouter des images
        </button>
      </div>

      {/* Le formulaire prenait la moitié de l'écran en permanence pour un geste
          qu'on fait de temps en temps : il s'ouvre maintenant à la demande. */}
      {ajout ? (
        <div
          className="bo-modale-fond"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget) setAjout(false);
          }}
        >
          <div className="bo-modale" role="dialog" aria-modal="true" aria-label="Ajouter des images">
            <div className="bo-modale-tete">
              <div>
                <h2>Ajouter des images</h2>
                <p>Chacune est redimensionnée en quatre largeurs à l&rsquo;envoi.</p>
              </div>
              <button
                type="button"
                className="bo-modale-fermer"
                onClick={() => setAjout(false)}
                title="Fermer"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
                <span className="visuellement-cache">Fermer</span>
              </button>
            </div>
            <div className="bo-modale-corps">
              <FormulaireEnvoi
                dossiers={dossiers}
                dossierChoisi={filtre}
                onFini={() => setAjout(false)}
              />
            </div>
          </div>
        </div>
      ) : null}

      <Dossiers
        dossiers={dossiers}
        filtre={filtre}
        onFiltrer={setFiltre}
        total={medias.length}
        sansDossier={sansDossier}
        apercus={apercus}
        onDeposer={(dossierId) => {
          if (glisse.current.length) ranger(glisse.current, dossierId);
          glisse.current = [];
        }}
      />

      {message ? (
        <p className={m.succes} role="status">
          {message}
        </p>
      ) : null}

      {aRemplacer > 0 ? (
        <p className={m.avertissement}>
          {aRemplacer} image{aRemplacer > 1 ? 's' : ''} d’attente à remplacer avant la mise en
          ligne.
        </p>
      ) : null}

      {visibles.length === 0 ? (
        <p className="bo-aide">
          {medias.length === 0
            ? 'La médiathèque est vide. Déposez vos premières images pour pouvoir les utiliser dans l’éditeur.'
            : 'Ce dossier est vide. Déplacez-y des images depuis leur fiche.'}
        </p>
      ) : (
        <ul className={m.grille}>
          {visibles.map((media) => (
            <li
              key={media.id}
              data-choisie={choisies.has(media.id) ? '' : undefined}
              draggable
              onDragStart={() => {
                // Glisser une image sélectionnée emporte toute la sélection :
                // c'est ce qu'on attend quand on en a coché douze.
                glisse.current = choisies.has(media.id) ? [...choisies] : [media.id];
              }}
              onDragEnd={() => {
                glisse.current = [];
              }}
            >
              <label className={m.coche}>
                <input
                  type="checkbox"
                  checked={choisies.has(media.id)}
                  onChange={() => basculer(media.id)}
                />
                <span className="visuellement-cache">Sélectionner cette image</span>
              </label>

              <button type="button" className={m.vignette} onClick={() => setOuverte(media)}>
                <img src={urlMedia(media.tailles[0]?.fichier ?? media.fichier)} alt="" loading="lazy" />
                <span className={m.legende}>{media.alt}</span>
                {media.aRemplacer ? <span className={m.marque}>à remplacer</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* La barre n'apparaît que s'il y a quelque chose à faire : une barre
          vide en permanence occupe l'écran sans rien dire. */}
      {choisies.size ? (
        <div className={m.barreChoix} role="region" aria-label="Images sélectionnées">
          <strong>
            {choisies.size} image{choisies.size > 1 ? 's' : ''} sélectionnée
            {choisies.size > 1 ? 's' : ''}
          </strong>

          {aSupprimer ? (
            <>
              <span className={m.barreAlerte}>
                Supprimer définitivement ? Les fichiers et leurs vignettes partent du serveur.
              </span>
              <button
                type="button"
                className={m.barreDanger}
                disabled={enCours}
                onClick={() =>
                  demarrer(async () => {
                    const r = await actionSupprimerPlusieurs([...choisies]);
                    setChoisies(new Set());
                    setASupprimer(false);
                    setMessage(
                      r.erreur ??
                        `${r.supprimees} image${r.supprimees > 1 ? 's' : ''} supprimée${
                          r.supprimees > 1 ? 's' : ''
                        }.`,
                    );
                  })
                }
              >
                Oui, supprimer
              </button>
              <button type="button" onClick={() => setASupprimer(false)}>
                Annuler
              </button>
            </>
          ) : (
            <>
              <label>
                Déplacer vers
                <select
                  value=""
                  disabled={enCours}
                  onChange={(ev) => {
                    if (ev.target.value === '') return;
                    ranger([...choisies], ev.target.value === '0' ? null : Number(ev.target.value));
                  }}
                >
                  <option value="">Choisir…</option>
                  <option value="0">Aucun dossier</option>
                  {dossiers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nom}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className={m.barreDanger} onClick={() => setASupprimer(true)}>
                Supprimer
              </button>
              <button type="button" onClick={() => setChoisies(new Set())}>
                Tout désélectionner
              </button>
            </>
          )}
        </div>
      ) : null}

      {ouverte ? (
        <Fiche media={ouverte} dossiers={dossiers} onFermer={() => setOuverte(null)} />
      ) : null}
    </>
  );
}

/**
 * Le rail des dossiers.
 *
 * Un dossier n'est qu'un filtre : une image rangée reste visible dans « Toutes
 * les images », et supprimer un dossier ne supprime rien. C'est ce qui permet
 * de réorganiser sans risque.
 *//**
 * Les dossiers, comme dans un explorateur de fichiers.
 *
 * Cliquer la chemise entre dedans ; cliquer le nom le renomme sur place ; le
 * clic droit ouvre le menu qui déplace, duplique ou supprime. Un dossier se
 * glisse dans un autre, et les images se glissent dedans : les deux gestes se
 * ressemblent parce qu'ils font la même chose — ranger.
 */
function Dossiers({
  dossiers,
  filtre,
  onFiltrer,
  total,
  sansDossier,
  apercus,
  onDeposer,
}: {
  dossiers: Dossier[];
  filtre: number | null;
  onFiltrer: (v: number | null) => void;
  total: number;
  sansDossier: number;
  apercus: Map<number | null, Media[]>;
  onDeposer: (dossierId: number | null) => void;
}) {
  const [nouveau, setNouveau] = useState(false);
  const [nom, setNom] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const [menu, setMenu] = useState<{ id: number; x: number; y: number } | null>(null);
  const [renomme, setRenomme] = useState<number | null>(null);
  const [confirme, setConfirme] = useState<{ id: number; images: number } | null>(null);
  const [survole, setSurvole] = useState<number | null>(null);
  // Le dossier en cours de glissement, s'il y en a un.
  const dossierGlisse = useRef<number | null>(null);

  const courant = dossiers.find((d) => d.id === filtre) ?? null;

  // Le chemin jusqu'à la racine, pour le fil d'Ariane.
  const chemin: Dossier[] = [];
  for (let d = courant; d; d = dossiers.find((x) => x.id === d!.parentId) ?? null) chemin.unshift(d);

  // À la racine on montre les dossiers de premier niveau ; dans un dossier,
  // ses sous-dossiers.
  const parent = filtre && filtre > 0 ? filtre : null;
  const visibles = dossiers.filter((d) => d.parentId === parent);

  // Les descendants d'un dossier ne peuvent pas l'accueillir.
  const descendants = (id: number): number[] => {
    const enfants = dossiers.filter((d) => d.parentId === id);
    return [id, ...enfants.flatMap((e) => descendants(e.id))];
  };

  const fermerMenu = () => setMenu(null);

  useEffect(() => {
    if (!menu) return;
    document.addEventListener('click', fermerMenu);
    return () => document.removeEventListener('click', fermerMenu);
  }, [menu]);

  const creer = () =>
    demarrer(async () => {
      const r = await actionCreerDossier(nom, parent);
      if (r.erreur) return setErreur(r.erreur);
      setNom('');
      setNouveau(false);
      setErreur(null);
    });

  const renommer = (id: number, valeur: string) =>
    demarrer(async () => {
      setRenomme(null);
      const r = await actionRenommerDossier(id, valeur);
      if (r.erreur) setErreur(r.erreur);
    });

  return (
    <div className={m.dossiers}>
      {/* Le fil d'Ariane remplace le rail dès qu'on est entré quelque part. */}
      {filtre !== null ? (
        <div className={m.chemin}>
          <button type="button" onClick={() => onFiltrer(null)}>
            Toutes les images
          </button>
          {chemin.map((d, i) => (
            <span key={d.id}>
              <span aria-hidden="true">›</span>
              {i === chemin.length - 1 ? (
                <strong>{d.nom}</strong>
              ) : (
                <button type="button" onClick={() => onFiltrer(d.id)}>
                  {d.nom}
                </button>
              )}
            </span>
          ))}
          {filtre === 0 ? (
            <span>
              <span aria-hidden="true">›</span>
              <strong>Non rangées</strong>
            </span>
          ) : null}
        </div>
      ) : null}

      {filtre !== 0 ? (
        <ul className={m.dossiersGrille}>
          {visibles.map((d) => (
            <li
              key={d.id}
              data-survole={survole === d.id ? '' : undefined}
              draggable={renomme !== d.id}
              onDragStart={(ev) => {
                ev.stopPropagation();
                dossierGlisse.current = d.id;
              }}
              onDragEnd={() => {
                dossierGlisse.current = null;
              }}
              onDragOver={(ev) => {
                ev.preventDefault();
                setSurvole(d.id);
              }}
              onDragLeave={() => setSurvole((n) => (n === d.id ? null : n))}
              onDrop={(ev) => {
                ev.preventDefault();
                setSurvole(null);
                const glisse = dossierGlisse.current;
                dossierGlisse.current = null;

                // Un dossier lâché sur un dossier s'y range ; sinon ce sont
                // des images qui arrivent.
                if (glisse && glisse !== d.id) {
                  demarrer(async () => {
                    const r = await actionDeplacerDossier(glisse, d.id);
                    if (r.erreur) setErreur(r.erreur);
                  });
                  return;
                }
                onDeposer(d.id);
              }}
              onContextMenu={(ev) => {
                ev.preventDefault();
                setMenu({ id: d.id, x: ev.clientX, y: ev.clientY });
              }}
            >
              <button
                type="button"
                onClick={() => onFiltrer(d.id)}
                onDoubleClick={() => onFiltrer(d.id)}
              >
                <Chemise apercus={apercus.get(d.id) ?? []} />

                {renomme === d.id ? (
                  <input
                    className={m.renommer}
                    defaultValue={d.nom}
                    maxLength={60}
                    autoFocus
                    onClick={(ev) => ev.stopPropagation()}
                    onBlur={(ev) => renommer(d.id, ev.target.value)}
                    onKeyDown={(ev) => {
                      ev.stopPropagation();
                      if (ev.key === 'Enter') renommer(d.id, (ev.target as HTMLInputElement).value);
                      if (ev.key === 'Escape') setRenomme(null);
                    }}
                  />
                ) : (
                  <strong
                    className={m.nomDossier}
                    title="Cliquer pour renommer"
                    onClick={(ev) => {
                      // Le nom renomme, la chemise ouvre : deux gestes
                      // distincts sur la même tuile, comme dans un
                      // explorateur de fichiers.
                      ev.stopPropagation();
                      setRenomme(d.id);
                    }}
                  >
                    {d.nom}
                  </strong>
                )}

                <span>
                  {d.images} image{d.images > 1 ? 's' : ''}
                </span>
              </button>
            </li>
          ))}

          {sansDossier > 0 && filtre === null && dossiers.length > 0 ? (
            <li
              data-survole={survole === 0 ? '' : undefined}
              onDragOver={(ev) => {
                ev.preventDefault();
                setSurvole(0);
              }}
              onDragLeave={() => setSurvole((n) => (n === 0 ? null : n))}
              onDrop={(ev) => {
                ev.preventDefault();
                setSurvole(null);
                dossierGlisse.current = null;
                onDeposer(null);
              }}
            >
              <button type="button" onClick={() => onFiltrer(0)}>
                <Chemise apercus={apercus.get(null) ?? []} vide />
                <strong>Non rangées</strong>
                <span>
                  {sansDossier} image{sansDossier > 1 ? 's' : ''}
                </span>
              </button>
            </li>
          ) : null}

          <li>
            <button type="button" className={m.dossierNouveau} onClick={() => setNouveau((v) => !v)}>
              <IconeDossierPlus />
              <strong>Nouveau dossier</strong>
              <span>
                {filtre === null
                  ? `${total} image${total > 1 ? 's' : ''} en tout`
                  : `dans ${courant?.nom ?? ''}`}
              </span>
            </button>
          </li>
        </ul>
      ) : null}

      {nouveau ? (
        <div className={m.dossierForm}>
          <input
            type="text"
            value={nom}
            placeholder="Mariages 2026"
            maxLength={60}
            autoFocus
            onChange={(ev) => setNom(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter') creer();
              if (ev.key === 'Escape') setNouveau(false);
            }}
          />
          <button type="button" className="bo-bouton" disabled={enCours} onClick={creer}>
            Créer
          </button>
          <button
            type="button"
            className="bo-bouton bo-bouton-discret"
            onClick={() => setNouveau(false)}
          >
            Annuler
          </button>
        </div>
      ) : null}

      {erreur ? (
        <p className="bo-erreur" role="alert">
          {erreur}
        </p>
      ) : null}

      {/* Le menu du clic droit, posé sous le curseur. */}
      {menu ? (
        <div
          className={m.menuDossier}
          style={{ top: menu.y, left: menu.x }}
          role="menu"
          onClick={(ev) => ev.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setRenomme(menu.id);
              fermerMenu();
            }}
          >
            Renommer
          </button>

          <label>
            Déplacer vers
            <select
              defaultValue=""
              onChange={(ev) => {
                const cible = ev.target.value === 'racine' ? null : Number(ev.target.value);
                const id = menu.id;
                fermerMenu();
                demarrer(async () => {
                  const r = await actionDeplacerDossier(id, cible);
                  if (r.erreur) setErreur(r.erreur);
                });
              }}
            >
              <option value="">Choisir…</option>
              <option value="racine">La racine</option>
              {dossiers
                .filter((d) => !descendants(menu.id).includes(d.id))
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nom}
                  </option>
                ))}
            </select>
          </label>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const id = menu.id;
              fermerMenu();
              demarrer(async () => {
                const images = await actionCompterDossier(id);
                setConfirme({ id, images });
              });
            }}
          >
            Dupliquer
          </button>

          <button
            type="button"
            role="menuitem"
            className={m.menuDanger}
            onClick={() => {
              const id = menu.id;
              fermerMenu();
              demarrer(async () => {
                await actionSupprimerDossier(id);
                if (filtre === id) onFiltrer(null);
              });
            }}
          >
            Supprimer le dossier
          </button>
        </div>
      ) : null}

      {/* Dupliquer recopie les fichiers : on annonce le prix avant. */}
      {confirme ? (
        <div className={m.dossierActions} role="alertdialog">
          <span>
            Dupliquer ce dossier recopiera {confirme.images} image
            {confirme.images > 1 ? 's' : ''} sur le serveur.
          </span>
          <button
            type="button"
            className="bo-bouton"
            disabled={enCours}
            onClick={() => {
              const id = confirme.id;
              setConfirme(null);
              demarrer(async () => {
                await actionDupliquerDossier(id);
              });
            }}
          >
            Dupliquer
          </button>
          <button type="button" onClick={() => setConfirme(null)}>
            Annuler
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Chemise({ apercus, vide }: { apercus: Media[]; vide?: boolean }) {
  return (
    <span className={m.chemise} data-vide={vide ? '' : undefined} aria-hidden="true">
      <span className={m.chemiseLanguette} />
      <span className={m.chemiseDos} />

      <span className={m.chemisePhotos}>
        {apercus.map((media, i) => (
          <span key={media.id} className={m.chemisePhoto} style={{ '--i': i } as React.CSSProperties}>
            <img src={urlMedia(media.tailles[0]?.fichier ?? media.fichier)} alt="" loading="lazy" />
            <span className={m.chemisePhotoVoile} />
            <span className={m.chemisePhotoNom}>{media.alt}</span>
          </span>
        ))}
      </span>

      <span className={m.chemiseFace} />
      {/* Le reflet du carton : une diagonale claire, qui suit la face. */}
      <span className={m.chemiseReflet} />
    </span>
  );
}

/** Le même, ouvert par une croix : on y range ce qui n'existe pas encore. */
function IconeDossierPlus() {
  return (
    <svg viewBox="0 0 48 40" aria-hidden="true" className={m.dossierIcone}>
      <path
        d="M2 8a3 3 0 0 1 3-3h12l4 5h24a3 3 0 0 1 3 3v22a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3z"
        fill="none"
        stroke="var(--bo-bord)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeDasharray="4 3"
      />
      <path
        d="M24 17v12M18 23h12"
        stroke="var(--bo-texte-3)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BoutonEnvoi() {
  const { pending } = useFormStatus();
  return (
    <button className="bo-bouton" type="submit" disabled={pending}>
      {pending ? 'Envoi et redimensionnement…' : 'Envoyer'}
    </button>
  );
}

function FormulaireEnvoi({
  dossiers,
  dossierChoisi,
  onFini,
}: {
  dossiers: Dossier[];
  dossierChoisi: number | null;
  onFini: () => void;
}) {
  const [etat, action] = useActionState(actionEnvoyer, VIDE);
  const [noms, setNoms] = useState<string[]>([]);

  // L'envoi réussi referme la fenêtre : rester devant un formulaire vide ne
  // dit pas si quelque chose est arrivé.
  useEffect(() => {
    if (!etat.envoyees) return;
    const minuteur = setTimeout(onFini, 900);
    return () => clearTimeout(minuteur);
  }, [etat.envoyees, onFini]);

  return (
    <form className="bo-form" action={action} onSubmit={() => setNoms([])}>
      {etat.erreur ? (
        <p className="bo-erreur" role="alert">
          {etat.erreur}
        </p>
      ) : null}

      {etat.envoyees ? (
        <p className={m.succes} role="status">
          {etat.envoyees} image{etat.envoyees > 1 ? 's' : ''} ajoutée
          {etat.envoyees > 1 ? 's' : ''}.
        </p>
      ) : null}

      <div className="bo-champ">
        <label htmlFor="fichiers">Fichiers</label>
        <input
          id="fichiers"
          name="fichiers"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/tiff"
          multiple
          required
          onChange={(ev) => setNoms([...(ev.target.files ?? [])].map((f) => f.name))}
        />
        <p className="bo-aide">
          JPEG, PNG, WebP, AVIF ou TIFF. Vingt-cinq mégaoctets par image au maximum.
        </p>
        {noms.length ? (
          <p className="bo-aide">
            {noms.length} fichier{noms.length > 1 ? 's' : ''} : {noms.slice(0, 4).join(', ')}
            {noms.length > 4 ? '…' : ''}
          </p>
        ) : null}
      </div>

      <div className="bo-champ">
        <label htmlFor="alt">Texte alternatif</label>
        <input id="alt" name="alt" type="text" defaultValue={etat.saisi?.alt ?? ''} required />
        <p className="bo-aide">
          Décrivez ce qui se passe dans le cadre, jamais « photo de mariage ». Sert aux lecteurs
          d’écran et au référencement. Pour plusieurs images à la fois, il sera numéroté et vous
          pourrez l’affiner ensuite.
        </p>
      </div>

      {dossiers.length ? (
        <div className="bo-champ">
          <label htmlFor="dossier">Dossier</label>
          {/* Le dossier ouvert est proposé d'office : on dépose presque
              toujours des images dans le dossier qu'on regarde. */}
          <select id="dossier" name="dossier" defaultValue={dossierChoisi ?? ''}>
            <option value="">Aucun</option>
            {dossiers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nom}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <label className={m.bascule}>
        <input type="checkbox" name="aRemplacer" />
        <span>Image d’attente, à remplacer avant la mise en ligne</span>
      </label>

      <BoutonEnvoi />
    </form>
  );
}

function Fiche({
  media,
  dossiers,
  onFermer,
}: {
  media: Media;
  dossiers: Dossier[];
  onFermer: () => void;
}) {
  const [alt, setAlt] = useState(media.alt);
  const [legende, setLegende] = useState(media.legende ?? '');
  const [dossier, setDossier] = useState<number | null>(media.dossierId ?? null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirme, setConfirme] = useState(false);
  const [enCours, demarrer] = useTransition();

  const enregistrer = () =>
    demarrer(async () => {
      const r = await actionMajMedia(media.id, alt, legende);
      setMessage(r.erreur ?? 'Enregistré.');
    });

  const supprimer = () =>
    demarrer(async () => {
      const r = await actionSupprimerMedia(media.id);
      if (r.erreur) {
        setMessage(r.erreur);
        setConfirme(false);
      } else {
        onFermer();
      }
    });

  return (
    <div className={m.voile} role="dialog" aria-modal="true" aria-label="Détail de l’image">
      <div className={m.fiche}>
        <div className={m.ficheTete}>
          <h2>Image</h2>
          <button type="button" onClick={onFermer} aria-label="Fermer">
            ✕
          </button>
        </div>

        <div className={m.ficheCorps}>
          <img src={urlMedia(media.tailles[1]?.fichier ?? media.fichier)} alt={media.alt} />

          <div className={m.ficheChamps}>
            {message ? (
              <p className={message === 'Enregistré.' ? m.succes : 'bo-erreur'} role="status">
                {message}
              </p>
            ) : null}

            <div className="bo-champ">
              <label htmlFor="fiche-alt">Texte alternatif</label>
              <input id="fiche-alt" type="text" value={alt} onChange={(ev) => setAlt(ev.target.value)} />
            </div>

            <div className="bo-champ">
              <label htmlFor="fiche-dossier">Dossier</label>
              {/* Le rangement prend effet tout de suite : c'est un
                  déplacement, pas une modification à enregistrer. */}
              <select
                id="fiche-dossier"
                value={dossier ?? ''}
                onChange={(ev) => {
                  const cible = ev.target.value ? Number(ev.target.value) : null;
                  setDossier(cible);
                  demarrer(async () => {
                    await actionRangerMedia(media.id, cible);
                    setMessage('Image rangée.');
                  });
                }}
              >
                <option value="">Aucun</option>
                {dossiers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nom}
                  </option>
                ))}
              </select>
            </div>

            <div className="bo-champ">
              <label htmlFor="fiche-legende">Légende</label>
              <input
                id="fiche-legende"
                type="text"
                value={legende}
                onChange={(ev) => setLegende(ev.target.value)}
              />
              <p className="bo-aide">Facultative. Affichée sous l’image quand la section le prévoit.</p>
            </div>

            <dl className={m.infos}>
              <div>
                <dt>Dimensions</dt>
                <dd>
                  {media.largeur} × {media.hauteur} px
                </dd>
              </div>
              <div>
                <dt>Largeurs produites</dt>
                <dd>{media.tailles.map((t) => t.largeur).join(', ') || 'aucune'}</dd>
              </div>
            </dl>

            <div className={m.ficheBoutons}>
              <button type="button" className="bo-bouton" onClick={enregistrer} disabled={enCours}>
                {enCours ? 'Enregistrement…' : 'Enregistrer'}
              </button>

              {confirme ? (
                <button type="button" className={m.danger} onClick={supprimer} disabled={enCours}>
                  Confirmer la suppression
                </button>
              ) : (
                <button
                  type="button"
                  className="bo-bouton bo-bouton-discret"
                  onClick={() => setConfirme(true)}
                  disabled={enCours}
                >
                  Supprimer
                </button>
              )}
            </div>

            {confirme ? (
              <p className="bo-aide">
                La suppression est définitive. Elle est refusée si l’image sert dans une page.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
