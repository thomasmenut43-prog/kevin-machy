'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CATALOGUE, PAR_TYPE } from '@/cms/catalogue';
import { CHAMPS_NAVIGATION } from '@/cms/navigation';
import { FAMILLES } from '@/cms/schema';
import {
  nouvelleCle,
  type Dossier,
  type Media,
  type Navigation,
  type Page,
  type Section,
} from '@/lib/modeles';
import {
  actionEnregistrerBrouillon,
  actionPublier,
  actionPublierNavigation,
  actionSupprimerPage,
} from './actions';
import { Champs } from './Champs';
import { FormulaireNouvellePage } from './Formulaires';
import { Reglages, Versions } from './Reglages';
import { Dupliquer, Ordinateur, Poignee, Poubelle, Telephone } from './Icones';
import e from './editeur.module.css';

/**
 * L'éditeur de site.
 *
 * Un principe commande tout le reste, et il vient du cadrage :
 *
 *   **L'aperçu suit la frappe. Le site en ligne ne bouge qu'au clic sur
 *   Enregistrer.**
 *
 * D'où deux chemins bien distincts. À chaque frappe, les sections partent dans
 * l'aperçu par message, sans passer par le serveur : c'est instantané et
 * personne d'autre ne le voit. En parallèle, le brouillon est sauvegardé en
 * base au repos, pour qu'un onglet fermé ne coûte rien. Le bouton Enregistrer,
 * lui, publie : il remplace ce que voient les visiteurs.
 */

const DELAI_BROUILLON = 900;

type Props = {
  page: Page;
  pages: { id: number; titre: string; chemin: string; statut: string }[];
  medias: Media[];
  administrateur: boolean;
  /** La barre de navigation du site, commune à toutes les pages. */
  navigation: Navigation;
  /** Les dossiers de la médiathèque, pour filtrer le choix d'une image. */
  dossiers: Dossier[];
};

/** Les trois volets de gauche. L'aperçu, lui, ne quitte jamais l'écran. */
type Vue = 'sections' | 'reglages' | 'versions';

export function Editeur({ page, pages, medias, administrateur, navigation, dossiers }: Props) {
  const [vue, setVue] = useState<Vue>('sections');
  // L'aperçu s'affiche au format d'un écran d'ordinateur ou d'un téléphone.
  // Plus de la moitié des visiteurs arrivent sur mobile : Kevin doit pouvoir
  // vérifier ce qu'ils voient sans quitter l'éditeur.
  const [format, setFormat] = useState<'ordinateur' | 'mobile'>('ordinateur');
  const [nouvelle, setNouvelle] = useState(false);
  const [aSupprimer, setASupprimer] = useState(false);
  // Le nom de la page effacée, rapporté depuis l'écran précédent.
  const [supprimee, setSupprimee] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>(page.brouillon ?? page.sections);
  // La barre de navigation ne dépend d'aucune page : elle vit à côté des
  // sections, et part en ligne avec elles.
  const [nav, setNav] = useState<Navigation>(navigation);
  const [navModifiee, setNavModifiee] = useState(false);
  const [choisie, setChoisie] = useState<string | null>(null);
  // Le champ montré du doigt dans l'aperçu, à ouvrir dans le panneau.
  const [champVise, setChampVise] = useState<string | null>(null);
  const [catalogueOuvert, setCatalogueOuvert] = useState(false);
  const [etat, setEtat] = useState<'repos' | 'enregistre' | 'publie' | 'erreur'>('repos');
  const [publication, setPublication] = useState<'repos' | 'encours' | 'fait'>('repos');
  const [modifie, setModifie] = useState(false);

  const apercu = useRef<HTMLIFrameElement>(null);
  const glisse = useRef<number | null>(null);

  // ————————————————————— L'aperçu suit la frappe —————————————————————
  const envoyerApercu = useCallback(() => {
    apercu.current?.contentWindow?.postMessage(
      { source: 'editeur-km', sections, medias, nav },
      window.location.origin,
    );
  }, [sections, medias, nav]);

  useEffect(() => {
    envoyerApercu();
  }, [envoyerApercu]);

  // Choisir une section dans le rail amène l'aperçu dessus. Sans cela, Kevin
  // modifie un bloc situé trois écrans plus bas sans rien voir bouger.
  useEffect(() => {
    if (!choisie) return;
    apercu.current?.contentWindow?.postMessage(
      { source: 'editeur-km', cible: choisie },
      window.location.origin,
    );
  }, [choisie]);

  // La suppression quitte la page : sans ce relais, Kevin arriverait sur
  // l'accueil sans savoir si son geste a fait quelque chose.
  useEffect(() => {
    const nom = sessionStorage.getItem('km-page-supprimee');
    if (!nom) return;
    sessionStorage.removeItem('km-page-supprimee');
    setSupprimee(nom);
    const minuteur = setTimeout(() => setSupprimee(null), 4000);
    return () => clearTimeout(minuteur);
  }, []);

  // L'aperçu réclame l'état dès qu'il est prêt : il peut charger après nous.
  useEffect(() => {
    const ecouter = (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin) return;
      if (ev.data?.source !== 'apercu-km') return;
      if (ev.data.pret) envoyerApercu();

      // Kevin a cliqué dans l'aperçu : on ouvre la section désignée, et le
      // champ qu'il visait précisément.
      if (ev.data.selection?.cle) {
        setVue('sections');
        setChoisie(ev.data.selection.cle);
        setChampVise(ev.data.selection.champ ?? null);
      }
    };
    window.addEventListener('message', ecouter);
    return () => window.removeEventListener('message', ecouter);
  }, [envoyerApercu]);

  // ———————————————— Le brouillon se sauvegarde au repos ————————————————
  useEffect(() => {
    if (!modifie) return;
    const minuteur = setTimeout(async () => {
      try {
        await actionEnregistrerBrouillon(page.id, sections);
        setEtat('enregistre');
      } catch {
        setEtat('erreur');
      }
    }, DELAI_BROUILLON);
    return () => clearTimeout(minuteur);
  }, [sections, modifie, page.id]);

  // Prévient avant de fermer un onglet dont le brouillon n'est pas parti.
  useEffect(() => {
    if (etat !== 'repos' || !modifie) return;
    const avant = (ev: BeforeUnloadEvent) => ev.preventDefault();
    window.addEventListener('beforeunload', avant);
    return () => window.removeEventListener('beforeunload', avant);
  }, [etat, modifie]);

  // ————————————————————————— Manipulations —————————————————————————
  const changer = (suite: Section[]) => {
    setSections(suite);
    setModifie(true);
    setEtat('repos');
  };

  const ajouter = (type: string) => {
    const bloc = PAR_TYPE.get(type);
    if (!bloc) return;
    const section: Section = { cle: nouvelleCle(), type, valeurs: valeursParDefaut(bloc.champs) };
    changer([...sections, section]);
    setChoisie(section.cle);
    setCatalogueOuvert(false);
  };

  const majSection = (cle: string, valeurs: Record<string, any>) =>
    changer(sections.map((s) => (s.cle === cle ? { ...s, valeurs } : s)));

  const deplacer = (de: number, vers: number) => {
    if (vers < 0 || vers >= sections.length || de === vers) return;
    const copie = [...sections];
    const [pris] = copie.splice(de, 1);
    copie.splice(vers, 0, pris);
    changer(copie);
  };

  const dupliquer = (i: number) => {
    const copie = [...sections];
    copie.splice(i + 1, 0, { ...sections[i], cle: nouvelleCle() });
    changer(copie);
  };

  /**
   * Publier réussit souvent sans que rien ne change à l'écran : la page était
   * déjà en ligne, et l'aperçu montrait déjà le brouillon. Sans retour
   * explicite, Kevin clique et croit que le bouton est mort. D'où cet état
   * passager, qui dit « c'est parti » puis « c'est fait ».
   */
  const publier = async () => {
    setPublication('encours');
    setEtat('repos');
    try {
      await actionPublier(page.id, sections);
      if (navModifiee) {
        setNav(await actionPublierNavigation(nav));
        setNavModifiee(false);
      }
      setModifie(false);
      setEtat('publie');
      setPublication('fait');
      setTimeout(() => setPublication('repos'), 2600);
    } catch {
      setEtat('erreur');
      setPublication('repos');
    }
  };

  return (
    <div className={`${e.cadre} editeur-plein`}>
      {/* ————————————————————————— Colonne de gauche ————————————————————— */}
      <div className={e.panneau}>
        <div className={e.panneauTete}>
          <div className={e.choixPage}>
            <label className="visuellement-cache" htmlFor="choix-page">
              Page à modifier
            </label>
            <select
              id="choix-page"
              value={page.id}
              onChange={(ev) => {
                if (ev.target.value === 'nouvelle') setNouvelle(true);
                else window.location.href = `/admin/pages/${ev.target.value}/`;
              }}
            >
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.titre}
                  {p.statut === 'publie' ? '' : ' — brouillon'}
                </option>
              ))}
              <option value="nouvelle">+ Nouvelle page…</option>
            </select>
            <p className={e.adresse}>{page.chemin ? `/${page.chemin}/` : '/ — page d’accueil'}</p>

            {/* Supprimer se fait d'ici, à côté du nom de la page : c'est là
                qu'on la cherche, pas au fond d'un panneau de réglages.
                L'accueil n'a pas ce bouton — le site s'y ouvre. */}
            {administrateur && page.chemin ? (
              aSupprimer ? (
                <div className={e.confirmer} role="alertdialog" aria-label="Confirmer la suppression">
                  <p>
                    Supprimer « {page.titre} » ? La page, son adresse et son historique
                    disparaissent.
                  </p>
                  <div>
                    <button
                      type="button"
                      className={e.confirmerDanger}
                      onClick={() => {
                        sessionStorage.setItem('km-page-supprimee', page.titre);
                        actionSupprimerPage(page.id).catch(() => {
                          sessionStorage.removeItem('km-page-supprimee');
                          setASupprimer(false);
                        });
                      }}
                    >
                      <Poubelle />
                      Supprimer définitivement
                    </button>
                    <button type="button" onClick={() => setASupprimer(false)}>
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className={e.supprimerPage}
                  onClick={() => setASupprimer(true)}
                  title="Supprimer cette page"
                >
                  <Poubelle />
                  <span>Supprimer cette page</span>
                </button>
              )
            ) : null}

            {supprimee ? (
              <p className={e.supprimee} role="status">
                « {supprimee} » a été supprimée.
              </p>
            ) : null}
          </div>
          <Etat etat={etat} modifie={modifie} publiee={page.statut === 'publie'} />
        </div>

        <nav className={e.onglets} aria-label="Volets de l’éditeur">
          {([
            ['sections', 'Sections'],
            ['reglages', 'Réglages'],
            ['versions', 'Versions'],
          ] as [Vue, string][]).map(([cle, libelle]) => (
            <button
              key={cle}
              type="button"
              onClick={() => setVue(cle)}
              aria-current={vue === cle ? 'page' : undefined}
            >
              {libelle}
            </button>
          ))}
        </nav>

        <div className={e.panneauCorps}>
          {vue === 'reglages' ? (
            <Reglages page={page} administrateur={administrateur} />
          ) : vue === 'versions' ? (
            <Versions
              pageId={page.id}
              onRestaurer={(sections) => {
                changer(sections);
                setChoisie(null);
                setVue('sections');
              }}
            />
          ) : (
            <ListeSections
              sections={sections}
              choisie={choisie}
              // Recliquer referme : la section ouverte est un tiroir, pas un
              // écran, et l'on doit pouvoir tout replier pour revoir la pile.
              onChoisir={(cle) => setChoisie((actuelle) => (actuelle === cle ? null : cle))}
              nav={nav}
              medias={medias}
              dossiers={dossiers}
              pages={pages}
              champVise={champVise}
              onVu={() => setChampVise(null)}
              onMajSection={majSection}
              onMajNav={(v) => {
                setNav(v);
                setNavModifiee(true);
                setModifie(true);
                setEtat('repos');
              }}
              onDeplacer={deplacer}
              onDupliquer={dupliquer}
              onSupprimer={(i) => changer(sections.filter((_, n) => n !== i))}
              glisse={glisse}
              onAjouter={() => setCatalogueOuvert(true)}
            />
          )}
        </div>

        {vue === 'sections' ? (
          <div className={e.panneauPied}>
            <button
              type="button"
              className="bo-bouton"
              onClick={publier}
              disabled={publication === 'encours'}
              data-fait={publication === 'fait' ? '' : undefined}
            >
              {publication === 'encours'
                ? 'Enregistrement…'
                : publication === 'fait'
                  ? 'Enregistré, le site est à jour'
                  : 'Enregistrer'}
            </button>
            <p className={e.aide}>
              Met le site en ligne à jour. Jusque-là, vos modifications ne sont visibles que d’ici.
            </p>
          </div>
        ) : null}
      </div>

      {/* ————————————————————————— Aperçu en direct ————————————————————— */}
      <div className={e.apercu}>
        <div className={e.barreApercu}>
          {/* Deux symboles suffisent : la barre doit prendre le moins de
              place possible au-dessus de l'aperçu. Le nom reste dans
              l'infobulle et dans le nom accessible du bouton. */}
          <div className={e.formats} role="group" aria-label="Format de l’aperçu">
            <button
              type="button"
              onClick={() => setFormat('ordinateur')}
              aria-pressed={format === 'ordinateur'}
              title="Aperçu sur ordinateur"
            >
              <Ordinateur />
              <span className="visuellement-cache">Aperçu sur ordinateur</span>
            </button>
            <button
              type="button"
              onClick={() => setFormat('mobile')}
              aria-pressed={format === 'mobile'}
              title="Aperçu sur téléphone"
            >
              <Telephone />
              <span className="visuellement-cache">Aperçu sur téléphone</span>
            </button>
          </div>
          <a className={e.voirEnLigne} href={page.chemin ? `/${page.chemin}/` : '/'} target="_blank" rel="noopener noreferrer">
            Ouvrir la page publiée
          </a>
        </div>

        <div className={e.scene} data-format={format}>
          <iframe ref={apercu} src="/apercu/" title="Aperçu du site" />
        </div>
      </div>

      {catalogueOuvert ? (
        <Catalogue onChoisir={ajouter} onFermer={() => setCatalogueOuvert(false)} />
      ) : null}

      {nouvelle ? <NouvellePage onFermer={() => setNouvelle(false)} /> : null}
    </div>
  );
}

// ————————————————————————————— Sous-vues —————————————————————————————

function NouvellePage({ onFermer }: { onFermer: () => void }) {
  useEffect(() => {
    const echap = (ev: KeyboardEvent) => ev.key === 'Escape' && onFermer();
    window.addEventListener('keydown', echap);
    return () => window.removeEventListener('keydown', echap);
  }, [onFermer]);

  return (
    <div className={e.voile} role="dialog" aria-modal="true" aria-label="Nouvelle page">
      <div className={e.modaleEtroite}>
        <div className={e.modaleTete}>
          <h2>Nouvelle page</h2>
          <button type="button" onClick={onFermer} aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className={e.modaleCorps}>
          <FormulaireNouvellePage />
        </div>
      </div>
    </div>
  );
}

function Etat({
  etat,
  modifie,
  publiee,
}: {
  etat: string;
  modifie: boolean;
  publiee: boolean;
}) {
  const texte =
    etat === 'erreur'
      ? 'Échec de l’enregistrement'
      : etat === 'publie'
        ? 'En ligne'
        : modifie && etat === 'repos'
          ? 'Modifications non enregistrées'
          : etat === 'enregistre'
            ? 'Brouillon sauvegardé'
            : publiee
              ? 'En ligne'
              : 'Brouillon';

  return (
    <span className={e.etat} data-alerte={etat === 'erreur' ? '' : undefined} role="status">
      {texte}
    </span>
  );
}

/** Clé réservée : la barre n'est pas une section, mais s'ouvre comme elles. */
export const NAVIGATION = '@navigation';

function ListeSections({
  sections,
  choisie,
  onChoisir,
  nav,
  medias,
  dossiers,
  pages,
  champVise,
  onVu,
  onMajSection,
  onMajNav,
  onDeplacer,
  onDupliquer,
  onSupprimer,
  glisse,
  onAjouter,
}: {
  sections: Section[];
  choisie: string | null;
  onChoisir: (cle: string) => void;
  nav: Navigation;
  medias: Media[];
  dossiers: Dossier[];
  pages: Props['pages'];
  champVise: string | null;
  onVu: () => void;
  onMajSection: (cle: string, valeurs: Record<string, unknown>) => void;
  onMajNav: (nav: Navigation) => void;
  onDeplacer: (de: number, vers: number) => void;
  onDupliquer: (i: number) => void;
  onSupprimer: (i: number) => void;
  glisse: React.RefObject<number | null>;
  onAjouter: () => void;
}) {
  const [survol, setSurvol] = useState<number | null>(null);

  return (
    <>
      {/* Épinglée, et ni déplaçable ni supprimable : un site sans barre de
          navigation n'a plus de sortie. */}
      <div className={e.epingleeBloc} data-ouvert={choisie === NAVIGATION ? '' : undefined}>
        <button
          type="button"
          className={e.epinglee}
          aria-expanded={choisie === NAVIGATION}
          onClick={() => onChoisir(NAVIGATION)}
        >
          <strong>Barre de navigation</strong>
          <span>
            {nav.menu.length} lien{nav.menu.length > 1 ? 's' : ''} · commune à tout le site
          </span>
        </button>

        {choisie === NAVIGATION ? (
          <div className={e.deroule}>
            <Champs
              champs={CHAMPS_NAVIGATION}
              valeurs={nav}
              medias={medias}
              dossiers={dossiers}
              pages={pages.map((p) => ({ id: p.id, titre: p.titre, chemin: p.chemin }))}
              onChange={(v) => onMajNav(v as Navigation)}
            />
          </div>
        ) : null}
      </div>

      <ol className={e.sections}>
        {sections.map((section, i) => {
          const bloc = PAR_TYPE.get(section.type);
          const masquee = Boolean((section.valeurs as any)?.reglages?.masquee);

          return (
            <li
              key={section.cle}
              className={e.sectionItem}
              data-masquee={masquee ? '' : undefined}
              data-ouvert={choisie === section.cle ? '' : undefined}
              draggable={choisie !== section.cle}
              data-cible={survol === i && glisse.current !== i ? '' : undefined}
              onDragStart={() => (glisse.current = i)}
              onDragEnd={() => {
                glisse.current = null;
                setSurvol(null);
              }}
              onDragOver={(ev) => {
                ev.preventDefault();
                setSurvol(i);
              }}
              onDragLeave={() => setSurvol((n) => (n === i ? null : n))}
              onDrop={(ev) => {
                ev.preventDefault();
                if (glisse.current !== null) onDeplacer(glisse.current, i);
                glisse.current = null;
                setSurvol(null);
              }}
            >
              <div className={e.sectionTete}>
              {/* La poignée n'est pas qu'un décor : c'est aussi le chemin
                  clavier. Retirer les flèches sans cela rendrait le
                  réordonnancement impossible sans souris. */}
              <button
                type="button"
                className={e.poignee}
                aria-label={`Déplacer « ${bloc?.libelle ?? section.type} », flèches haut et bas`}
                onKeyDown={(ev) => {
                  if (ev.key === 'ArrowUp') {
                    ev.preventDefault();
                    onDeplacer(i, i - 1);
                  }
                  if (ev.key === 'ArrowDown') {
                    ev.preventDefault();
                    onDeplacer(i, i + 1);
                  }
                }}
              >
                <Poignee />
              </button>

              <button
                type="button"
                className={e.sectionNom}
                aria-expanded={choisie === section.cle}
                onClick={() => onChoisir(section.cle)}
              >
                <strong>{bloc?.libelle ?? section.type}</strong>
                <span>{resume(section) || bloc?.resume}</span>
              </button>

              {/* Le glisser-déposer ne suffit pas : ces boutons sont le chemin
                  au clavier, et le seul chemin fiable au doigt. */}
              <div className={e.sectionBoutons}>
                <button type="button" onClick={() => onDupliquer(i)} aria-label="Dupliquer la section">
                  <Dupliquer />
                </button>
                <button
                  type="button"
                  className={e.boutonDanger}
                  onClick={() => onSupprimer(i)}
                  aria-label="Supprimer la section"
                >
                  <Poubelle />
                </button>
              </div>
              </div>

              {/* Les réglages se déroulent sous la section plutôt que de
                  remplacer la liste : on garde la pile sous les yeux, et l'on
                  referme d'un second clic. */}
              {choisie === section.cle && bloc ? (
                <div className={e.deroule}>
                  <Champs
                    champs={bloc.champs}
                    valeurs={section.valeurs}
                    medias={medias}
                    dossiers={dossiers}
                    vise={champVise}
                    onVu={onVu}
                    onChange={(v) => onMajSection(section.cle, v)}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {sections.length === 0 ? (
        <p className={e.vide}>
          Cette page est vide. Ajoutez une première section pour commencer.
        </p>
      ) : null}

      <button type="button" className="bo-bouton bo-bouton-discret" onClick={onAjouter}>
        Ajouter une section
      </button>
    </>
  );
}

function Catalogue({
  onChoisir,
  onFermer,
}: {
  onChoisir: (type: string) => void;
  onFermer: () => void;
}) {
  const [recherche, setRecherche] = useState('');

  useEffect(() => {
    const echap = (ev: KeyboardEvent) => ev.key === 'Escape' && onFermer();
    window.addEventListener('keydown', echap);
    return () => window.removeEventListener('keydown', echap);
  }, [onFermer]);

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return q
      ? CATALOGUE.filter((b) => (b.libelle + b.resume).toLowerCase().includes(q))
      : CATALOGUE;
  }, [recherche]);

  return (
    <div className={e.voile} role="dialog" aria-modal="true" aria-label="Ajouter une section">
      <div className={e.modale}>
        <div className={e.modaleTete}>
          <h2>Ajouter une section</h2>
          <button type="button" onClick={onFermer} aria-label="Fermer">
            ✕
          </button>
        </div>

        <input
          type="search"
          className={e.recherche}
          placeholder="Rechercher une section"
          value={recherche}
          onChange={(ev) => setRecherche(ev.target.value)}
          autoFocus
        />

        <div className={e.modaleCorps}>
          {FAMILLES.map((famille) => {
            const blocs = filtres.filter((b) => b.famille === famille);
            if (!blocs.length) return null;

            return (
              <section key={famille}>
                <h3>{famille}</h3>
                <div className={e.grille}>
                  {blocs.map((b) => (
                    <button key={b.type} type="button" className={e.carte} onClick={() => onChoisir(b.type)}>
                      <Vignette type={b.type} />
                      <strong>{b.libelle}</strong>
                      <span>{b.resume}</span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Vignette de section : un schéma, pas une image générique.
 *
 * Kevin doit reconnaître la mise en page d'un coup d'œil, sans lire le nom.
 * Des rectangles suffisent, à condition qu'ils disent la bonne chose.
 */
function Vignette({ type }: { type: string }) {
  const b = 'var(--bo-bord)';
  const a = 'var(--bo-texte-3)';

  const formes: Record<string, React.ReactNode> = {
    heros: (
      <>
        <rect x="0" y="0" width="80" height="50" fill={b} />
        <rect x="6" y="30" width="40" height="4" fill={a} />
        <rect x="6" y="38" width="26" height="3" fill={a} />
      </>
    ),
    texteImage: (
      <>
        <rect x="4" y="10" width="32" height="4" fill={a} />
        <rect x="4" y="18" width="30" height="3" fill={b} />
        <rect x="4" y="24" width="26" height="3" fill={b} />
        <rect x="44" y="6" width="32" height="38" fill={b} />
      </>
    ),
    galerie: (
      <>
        <rect x="4" y="10" width="22" height="30" fill={b} />
        <rect x="29" y="10" width="22" height="30" fill={b} />
        <rect x="54" y="10" width="22" height="30" fill={b} />
      </>
    ),
    texteLibre: (
      <>
        <rect x="12" y="12" width="40" height="4" fill={a} />
        <rect x="12" y="22" width="56" height="3" fill={b} />
        <rect x="12" y="29" width="52" height="3" fill={b} />
        <rect x="12" y="36" width="44" height="3" fill={b} />
      </>
    ),
    etapes: (
      <>
        <rect x="6" y="14" width="6" height="3" fill={a} />
        <rect x="6" y="22" width="18" height="3" fill={b} />
        <rect x="31" y="14" width="6" height="3" fill={a} />
        <rect x="31" y="22" width="18" height="3" fill={b} />
        <rect x="56" y="14" width="6" height="3" fill={a} />
        <rect x="56" y="22" width="18" height="3" fill={b} />
      </>
    ),
    listePointee: (
      <>
        {[14, 22, 30, 38].map((y) => (
          <g key={y}>
            <rect x="10" y={y} width="3" height="3" fill={a} />
            <rect x="18" y={y} width="44" height="3" fill={b} />
          </g>
        ))}
      </>
    ),
    citation: (
      <>
        <rect x="16" y="18" width="48" height="5" fill={a} />
        <rect x="26" y="28" width="28" height="4" fill={b} />
      </>
    ),
    tarifs: (
      <>
        <rect x="5" y="8" width="21" height="34" fill={b} />
        <rect x="29" y="8" width="21" height="34" fill={b} />
        <rect x="53" y="8" width="21" height="34" fill={b} />
        <rect x="9" y="14" width="12" height="4" fill={a} />
      </>
    ),
    simulateurIris: (
      <>
        <rect x="8" y="12" width="28" height="14" fill={b} />
        <rect x="44" y="12" width="28" height="14" fill={b} />
        <rect x="8" y="32" width="20" height="6" fill={a} />
      </>
    ),
    appelAction: (
      <>
        <rect x="18" y="14" width="44" height="5" fill={a} />
        <rect x="26" y="28" width="28" height="9" fill={b} />
      </>
    ),
    avis: (
      <>
        <rect x="6" y="12" width="30" height="3" fill={b} />
        <rect x="6" y="19" width="24" height="3" fill={b} />
        <rect x="6" y="28" width="14" height="3" fill={a} />
        <rect x="44" y="12" width="30" height="3" fill={b} />
        <rect x="44" y="19" width="24" height="3" fill={b} />
        <rect x="44" y="28" width="14" height="3" fill={a} />
      </>
    ),
    faq: (
      <>
        {[12, 24, 36].map((y) => (
          <g key={y}>
            <rect x="8" y={y} width="50" height="3" fill={b} />
            <rect x="68" y={y} width="4" height="3" fill={a} />
          </g>
        ))}
      </>
    ),
    logos: (
      <>
        {[10, 33, 56].map((x) => (
          <rect key={x} x={x} y="20" width="14" height="10" fill={b} />
        ))}
      </>
    ),
  };

  return (
    <svg className={e.vignette} viewBox="0 0 80 50" aria-hidden="true">
      {formes[type] ?? <rect x="8" y="12" width="64" height="26" fill={b} />}
    </svg>
  );
}

// ————————————————————————————— Utilitaires —————————————————————————————

/** Une section s'insère pré-réglée : jamais de page cassée en cours de route. */
function valeursParDefaut(champs: any[]): Record<string, any> {
  const sortie: Record<string, any> = {};
  for (const champ of champs) {
    if (champ.defaut !== undefined) sortie[champ.nom] = champ.defaut;
    else if (champ.type === 'groupe' || champ.type === 'repli') {
      sortie[champ.nom] = valeursParDefaut(champ.champs);
    } else if (champ.type === 'liste') sortie[champ.nom] = [];
  }
  return sortie;
}

/** Le début du titre de la section, pour la reconnaître dans la liste. */
function resume(section: Section) {
  const v = section.valeurs as any;
  const texte = v?.titre?.texte ?? v?.citation ?? '';
  return typeof texte === 'string' && texte ? texte.slice(0, 60) : '';
}
