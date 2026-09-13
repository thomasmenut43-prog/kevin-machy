import Link from 'next/link';
import { Faq } from '@/components/Faq';
import { ContactForm } from '@/components/ContactForm';
import { Gallery } from '@/components/Gallery';
import { Hero } from '@/components/Hero';
import { Reveal } from '@/components/Reveal';
import { SimulateurIris } from '@/components/SimulateurIris';
import { BarreIris } from '@/components/BarreIris';
import { styleApparence, styleSection, type Apparence, type ReglagesSection } from '@/lib/apparence';
import type { Entreprise, Media, Section } from '@/lib/modeles';
import { Boutons } from './Boutons';
import { Image, ImagePleinEcran } from './Image';
import { TexteRiche } from './TexteRiche';
import s from './RenduSections.module.css';
import p from '@/styles/pages.module.css';

/**
 * Transforme les sections enregistrées en page.
 *
 * Une section dont le type est inconnu n'affiche rien plutôt que de casser la
 * page : le catalogue peut changer sans que les pages déjà écrites tombent.
 */

type Valeurs = Record<string, any>;
type Contexte = { medias: Map<number, Media>; premiere: boolean; entreprise: Entreprise };

export function RenduSections({
  sections,
  medias,
  entreprise,
}: {
  sections: Section[];
  medias: Map<number, Media>;
  /** Les coordonnées et les liens réglés dans Paramètres → Mon entreprise. */
  entreprise: Entreprise;
}) {
  const reglagesDe = (section: Section) =>
    (section.valeurs?.reglages ?? undefined) as ReglagesSection | undefined;
  const visibles = sections.filter((section) => !reglagesDe(section)?.masquee);

  // Le simulateur vit soit seul dans sa section, soit dans une formule de la
  // grille de tarifs. Dans les deux cas, la barre de rappel le suit.
  const simulateur = visibles.find(
    (sec) =>
      sec.type === 'simulateurIris' ||
      (sec.type === 'tarifs' &&
        (((sec.valeurs as Valeurs)?.formules ?? []) as Valeurs[]).some((form) => form?.simulateur)),
  );

  return (
    <>
      {visibles.map((section, i) => (
        <Enveloppe
          key={section.cle}
          cle={section.cle}
          type={section.type}
          reglages={reglagesDe(section)}
        >
          <Contenu section={section} ctx={{ medias, premiere: i === 0, entreprise }} />
        </Enveloppe>
      ))}

      {simulateur?.valeurs?.barreDeRappel !== false && simulateur ? (
        <BarreIris hrefReservation={entreprise.liens.reservation} hrefDevis="/contact/?projet=iris" />
      ) : null}
    </>
  );
}

function Enveloppe({
  cle,
  type,
  reglages,
  children,
}: {
  cle: string;
  type: string;
  reglages?: ReglagesSection;
  children: React.ReactNode;
}) {
  // L'identifiant sert à l'éditeur : sélectionner une section dans le rail
  // amène l'aperçu dessus.
  return (
    <section id={`section-${cle}`} data-type={type} style={styleSection(reglages)}>
      {children}
    </section>
  );
}

function Contenu({ section, ctx }: { section: Section; ctx: Contexte }) {
  const v = section.valeurs as Valeurs;
  const img = (id?: number) => (id ? (ctx.medias.get(id) ?? null) : null);

  switch (section.type) {
    // ————————————————————————————— Héros —————————————————————————————
    case 'heros': {
      const fond = img(v.image);
      const etroite = img(v.imageEtroite) ?? fond;
      const sobre = v.variante === 'sobre' || !fond;

      const contenu = (
        <>
          {(v.surtitres ?? []).length ? (
            <Reveal>
              <p className="hero__meta">
                {((v.surtitres ?? []) as Valeurs[]).map((m, i) => (
                  <span key={i}>{m.texte}</span>
                ))}
              </p>
            </Reveal>
          ) : null}
          <Reveal retard={120}>
            <Titre champ={v.titre} defautClasse="h1" />
          </Reveal>
          <Reveal retard={240}>
            <TexteRiche doc={v.chapo?.contenu} className="lede" champ="chapo" />
          </Reveal>
          <Reveal retard={340}>
            <Boutons boutons={v.boutons} />
          </Reveal>
        </>
      );

      // Le héros du site est le seul élément en parallaxe, et l'image y est
      // peinte immédiatement : c'est elle que mesure Google. On garde donc le
      // composant d'origine plutôt que d'en refaire un approchant.
      if (!sobre) {
        return (
          <Hero media={<ImagePleinEcran large={fond} etroite={etroite} prioritaire={ctx.premiere} />}>
            {contenu}
          </Hero>
        );
      }

      return (
        <div className={`${s.heros} ${s.herosSobre}`}>
          <div className="wrap">
            <div className={s.herosContenu}>{contenu}</div>
          </div>
        </div>
      );
    }

    // ———————————————————————— Texte et image ————————————————————————
    case 'texteImage': {
      const media = img(v.image);
      const pleine = v.variante === 'imagePleineLargeur' || !media;

      const texte = (
        <Reveal>
          {v.numero || v.surtitre ? (
            <p className="surtitre">
              {v.numero ? <span className="surtitre__num">{v.numero}</span> : null}
              {v.surtitre ? <span>{v.surtitre}</span> : null}
            </p>
          ) : null}
          <Titre champ={v.titre} />
          <TexteRiche doc={v.texte?.contenu} className="corps" />
          {((v.distinctions ?? []) as Valeurs[]).length ? (
            <ul className="distinctions">
              {((v.distinctions ?? []) as Valeurs[]).map((d, i) => (
                <li key={i}>{d.texte}</li>
              ))}
            </ul>
          ) : null}
          <Boutons boutons={v.boutons} />
          <LienFleche lien={v.lien} />
        </Reveal>
      );

      // L'ouverture d'une page intérieure : pas d'image de fond, mais la
      // hauteur qu'il faut sous le bandeau, et un chapô en gros texte.
      if (v.variante === 'ouverture') {
        const bloc = (
          <Reveal className={p.ouvertureTitre}>
            {v.numero || v.surtitre ? (
              <p className="surtitre">
                {v.numero ? <span className="surtitre__num">{v.numero}</span> : null}
                {v.surtitre ? <span>{v.surtitre}</span> : null}
              </p>
            ) : null}
            <Titre champ={v.titre} defautClasse="h1" />
            <TexteRiche doc={v.texte?.contenu} className={`lede ${p.ouvertureChapo}`} />
            {((v.distinctions ?? []) as Valeurs[]).length ? (
              <ul className="distinctions">
                {((v.distinctions ?? []) as Valeurs[]).map((d, i) => (
                  <li key={i}>{d.texte}</li>
                ))}
              </ul>
            ) : null}
            <Boutons boutons={v.boutons} />
          </Reveal>
        );

        return (
          <div className={`wrap ${p.ouverture}`}>
            {media ? (
              <div className={`duo ${s.duoInverse}`}>
                {bloc}
                <Reveal mode="voile">
                  <Image media={media} sizes="(min-width: 900px) 45vw, 100vw" prioritaire={ctx.premiere} />
                </Reveal>
              </div>
            ) : (
              bloc
            )}
          </div>
        );
      }

      if (pleine) {
        return (
          <div className="wrap">
            {texte}
            {media ? (
              <Reveal mode="voile">
                <div className={s.imagePleine}>
                  <Image media={media} sizes="100vw" />
                </div>
              </Reveal>
            ) : null}
          </div>
        );
      }

      return (
        <div className="wrap">
          <div className={`duo ${v.variante === 'imageGauche' ? s.duoInverse : ''}`}>
            {texte}
            <Reveal mode="voile">
              <Image media={media} sizes="(min-width: 900px) 50vw, 100vw" />
            </Reveal>
          </div>
        </div>
      );
    }

    // ————————————————————————————— Galeries —————————————————————————
    case 'galerie': {
      const images = ((v.images ?? []) as Valeurs[]).map((i) => img(i.image)).filter(Boolean);

      if (v.variante === 'visionneuse') {
        return (
          <div className="wrap">
            <Entete champ={v.entete} />
            <Gallery items={images as never} action="Voir" />
          </div>
        );
      }

      // Les dispositions du site, reprises telles quelles : ce sont les mêmes
      // classes que celles des pages écrites en code.
      const CLASSES: Record<string, string> = {
        bande: s.bande,
        colonne: s.colonne,
        duo: 'duo',
        trio: 'trio',
        mosaiqueLarge: p.iris,
      };
      const classe = CLASSES[v.variante as string] ?? s.mosaique;
      const TAILLES: Record<string, string> = {
        colonne: '100vw',
        bande: '38vw',
        duo: '(min-width: 900px) 50vw, 100vw',
        trio: '(min-width: 760px) 32vw, 100vw',
        mosaiqueLarge: '(min-width: 760px) 33vw, 50vw',
      };
      const tailles = TAILLES[v.variante as string] ?? '(min-width: 900px) 33vw, 100vw';

      // La mosaïque large touche les deux bords : elle seule sort de la page.
      if (v.variante === 'mosaiqueLarge') {
        return (
          <div className={classe}>
            {images.map((media, i) => (
              <Reveal key={media!.id + '-' + i} mode="voile" retard={(i % 3) * 100}>
                <Image media={media} sizes={tailles} />
              </Reveal>
            ))}
          </div>
        );
      }

      return (
        <div className="wrap">
          <Entete champ={v.entete} />
          <div className={classe}>
            {images.map((media, i) => (
              <Reveal key={media!.id + '-' + i} mode="voile" retard={(i % 3) * 100}>
                <Image media={media} sizes={tailles} />
              </Reveal>
            ))}
          </div>
        </div>
      );
    }

    case 'collections':
      return (
        <div className="wrap">
          <Entete champ={v.entete} />
          <div className={s.collections}>
            {((v.cartes ?? []) as Valeurs[]).map((c, i) => (
              <Reveal key={i} retard={i * 120}>
                <Link href={c.href || '/'} className={s.collection}>
                  <Image media={img(c.image)} sizes="(min-width: 860px) 30vw, 100vw" />
                  {c.numero ? <span className={s.collectionNum}>{c.numero}</span> : null}
                  <span className="h3">{c.titre}</span>
                  <span className={s.collectionTexte}>{c.texte}</span>
                  <span className="lien" style={{ width: 'fit-content' }}>
                    {c.libelleLien || 'Découvrir'}
                    <span className="lien__fleche" aria-hidden="true">
                      →
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>

          {v.appoint?.contenu ? (
            <Reveal className={s.appoint}>
              <TexteRiche doc={v.appoint.contenu} />
              <LienFleche lien={v.lienAppoint} />
            </Reveal>
          ) : null}
        </div>
      );

    case 'bande': {
      const visuel = (
        <Reveal mode="voile" className="bande bande-haute">
          <ImagePleinEcran large={img(v.image)} etroite={img(v.imageEtroite) ?? img(v.image)} />
        </Reveal>
      );
      const legende = v.legende ? (
        <Reveal style={{ marginTop: 'clamp(20px, 2.4vw, 30px)' }}>
          <p className="legende" style={{ maxWidth: '62ch' }}>
            {v.legende}
          </p>
        </Reveal>
      ) : null;

      if (v.variante === 'dansLaPage') {
        return (
          <div className="wrap">
            {visuel}
            {legende}
          </div>
        );
      }

      return (
        <>
          {visuel}
          {legende ? <div className="wrap">{legende}</div> : null}
        </>
      );
    }

    case 'inclus':
      return (
        <div className="wrap">
          <Entete champ={v.entete} />
          <ul className={p.inclus}>
            {((v.elements ?? []) as Valeurs[]).map((el, i) => (
              <Reveal as="li" className={p.inclusItem} key={i} retard={Math.min(i, 4) * 70}>
                <h3 className="h4">{el.titre}</h3>
                <p>{el.texte}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      );

    case 'jalons':
      return (
        <div className="wrap">
          <Entete champ={v.entete} />
          <div className={p.jalons}>
            {((v.jalons ?? []) as Valeurs[]).map((jalon, i) => (
              <div className={p.jalon} key={i}>
                <Reveal mode="voile">
                  <Image media={img(jalon.image)} sizes="(min-width: 820px) 34vw, 100vw" />
                </Reveal>
                <Reveal className={p.jalonTexte} retard={90}>
                  <span className={p.jalonNum}>{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="h3">{jalon.titre}</h3>
                  <p className="corps">{jalon.texte}</p>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      );

    case 'offres':
      return (
        <div className="wrap">
          <Entete champ={v.entete} />

          {v.socle?.titre || (v.socle?.points ?? []).length ? (
            <Reveal className={p.socle}>
              {v.socle?.titre ? <p className="h4">{v.socle.titre}</p> : null}
              <ul className="liste-pointee">
                {((v.socle?.points ?? []) as Valeurs[]).map((pt, i) => (
                  <li key={i}>{pt.texte}</li>
                ))}
              </ul>
            </Reveal>
          ) : null}

          <ul className={p.collections}>
            {((v.formules ?? []) as Valeurs[]).map((f, i) => (
              <Reveal as="li" className={p.offre} key={i} retard={Math.min(i, 3) * 80}>
                <div className={p.offreTete}>
                  <h3 className="h3">{f.nom}</h3>
                  <p className="prix">{f.prix}</p>
                  {f.duree ? <p className={p.offreDuree}>{f.duree}</p> : null}
                </div>
                <div className={p.offreCorps}>
                  {f.promesse ? <p className={p.offrePromesse}>{f.promesse}</p> : null}
                  <ul className="liste-pointee">
                    {((f.inclus ?? []) as Valeurs[]).map((item, n) => (
                      <li key={n}>{item.texte}</li>
                    ))}
                  </ul>
                </div>
                {f.libelleBouton && f.href ? (
                  <div className={p.offreAction}>
                    <Link className="bouton bouton-fantome" href={f.href}>
                      {f.libelleBouton}
                    </Link>
                  </div>
                ) : null}
              </Reveal>
            ))}
          </ul>
        </div>
      );

    case 'options':
      return (
        <div className="wrap">
          <Entete champ={v.entete} />
          <Reveal>
            <ul className={p.options}>
              {((v.options ?? []) as Valeurs[]).map((o, i) => (
                <li className={p.option} key={i}>
                  <p className="h4">{o.nom}</p>
                  {o.prix ? <p className={p.optionPrix}>{o.prix}</p> : null}
                  <p className={p.optionTexte}>{o.texte}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      );

    case 'encadre':
      return (
        <div className="wrap">
          <Reveal>
            <div className={p.garantie}>
              <Titre champ={v.titre} defautClasse="h3" />
              <TexteRiche doc={v.texte?.contenu} className="corps" />
            </div>
          </Reveal>
        </div>
      );

    // ————————————————————————————— Contenu ——————————————————————————
    // ——————————————————— Identité de l'entreprise ———————————————————
    // Aucun champ à saisir : tout vient de Paramètres → Mon entreprise. Ce qui
    // est vide ne s'affiche pas — une mention légale incomplète vaut mieux
    // qu'une ligne « Hébergeur : » suivie de rien.
    case 'identiteEntreprise': {
      const e = ctx.entreprise;
      const adresse = [e.adresse, [e.codePostal, e.ville].filter(Boolean).join(' ')]
        .filter(Boolean)
        .join(', ');
      const hebergeur = [e.hebergeurNom, e.hebergeurAdresse].filter(Boolean).join(', ');

      const lignes: { terme: string; valeur: string }[] = [
        { terme: 'Éditeur du site', valeur: e.raisonSociale || e.nom },
        { terme: 'SIRET', valeur: e.siret },
        { terme: 'Adresse', valeur: adresse },
        { terme: 'Téléphone', valeur: e.telephone },
        { terme: 'Adresse e-mail', valeur: e.email },
        { terme: 'Directeur de la publication', valeur: e.directeurPublication },
        { terme: 'Hébergeur', valeur: hebergeur },
      ].filter((l) => l.valeur);

      return (
        <div className="wrap">
          <Entete champ={v.entete} />
          <Reveal>
            <dl className={p.identiteLegale}>
              {lignes.map((l) => (
                <div key={l.terme}>
                  <dt>{l.terme}</dt>
                  <dd>{l.valeur}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      );
    }

    case 'texteLibre': {
      const largeur = v.largeur === 'mesureCourte' ? s.mesureCourte : v.largeur === 'pleine' ? '' : s.mesure;
      // Le titre seul a précédé l'en-tête complet : une page enregistrée avant
      // ce changement garde le sien plutôt que de le perdre en silence.
      const entete = v.entete ?? (v.titre?.texte ? v.titre : undefined);
      return (
        <div className="wrap">
          <Entete champ={entete} />
          <Reveal>
            <div className={largeur}>
              <TexteRiche doc={v.texte?.contenu} className="corps" />
            </div>
          </Reveal>
        </div>
      );
    }

    case 'etapes':
      // Le déroulé file en lignes séparées quand il n'y a pas d'image à
      // montrer : c'est la forme des étapes du Studio de l'Iris.
      if (v.variante === 'filets') {
        return (
          <div className="wrap">
            <Entete champ={v.entete} />
            <ol className="liste-filets">
              {((v.etapes ?? []) as Valeurs[]).map((etape, i) => (
                <Reveal as="li" key={i} retard={Math.min(i, 4) * 70}>
                  <div>
                    <span className={p.jalonNum}>{String(i + 1).padStart(2, '0')}</span>
                    <h3 className="h3" style={{ marginTop: '0.6rem' }}>
                      {etape.titre}
                    </h3>
                  </div>
                  <p className="corps">{etape.texte}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        );
      }

      return (
        <div className="wrap">
          <Entete champ={v.entete} />
          <div className="trio">
            {((v.etapes ?? []) as Valeurs[]).map((etape, i) => (
              <div key={i}>
                {/* L'image d'abord, le texte dessous : c'est l'ordre de lecture
                    du site, et il tient aussi bien en colonne sur téléphone. */}
                {img(etape.image) ? (
                  <Reveal mode="voile" retard={i * 110}>
                    <Image media={img(etape.image)} sizes="(min-width: 760px) 30vw, 100vw" />
                  </Reveal>
                ) : null}
                <Reveal retard={i * 110 + 80} style={{ marginTop: 'clamp(18px, 2vw, 26px)' }}>
                  <p className={p.jalonNum}>{String(i + 1).padStart(2, '0')}</p>
                  <h3 className="h4" style={{ marginTop: '0.7rem' }}>
                    {etape.titre}
                  </h3>
                  {etape.texte ? (
                    <p className="corps" style={{ marginTop: '0.7rem' }}>
                      {etape.texte}
                    </p>
                  ) : null}
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      );

    case 'listePointee':
      return (
        <div className="wrap">
          <Reveal>
            <Titre champ={v.titre} />
            <ul className="liste-pointee">
              {((v.points ?? []) as Valeurs[]).map((p, i) => (
                <li key={i}>{p.texte}</li>
              ))}
            </ul>
          </Reveal>
        </div>
      );

    case 'citation':
      return (
        <div className="wrap">
          <Reveal>
            <blockquote className={s.citationBloc}>
              <p className="citation">{v.citation}</p>
              {v.auteur ? <cite className={s.auteur}>{v.auteur}</cite> : null}
            </blockquote>
          </Reveal>
        </div>
      );

    // ———————————————————————————— Commercial ————————————————————————
    case 'tarifs':
      return (
        <div className="wrap">
          <Entete champ={v.entete} />
          <div className={p.tarifs}>
            {((v.formules ?? []) as Valeurs[]).map((f, i) => (
              <Reveal as="article" className={p.tarif} key={i} retard={i * 100}>
                <div>
                  <h3 className="h3">{f.nom}</h3>
                  {/* Le prix dépend du nombre d'iris : plutôt que de l'écrire,
                      on laisse le visiteur le calculer lui-même. */}
                  {f.simulateur ? (
                    <SimulateurIris repli={f.prix} repliNote={f.note} hrefDevis="/contact/?projet=iris" />
                  ) : (
                    <>
                      <p className="prix" style={{ marginTop: '0.6rem' }}>
                        {f.prix}
                      </p>
                      {f.note ? (
                        <p className={p.offreDuree} style={{ marginTop: '0.5rem' }}>
                          {f.note}
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
                <ul className="liste-pointee">
                  {((f.inclus ?? []) as Valeurs[]).map((l, n) => (
                    <li key={n}>{l.texte}</li>
                  ))}
                </ul>
                {f.exclus ? <p className={p.supportNote}>{f.exclus}</p> : null}
                <Boutons boutons={f.boutons} />
              </Reveal>
            ))}
          </div>
          {v.legende ? (
            <Reveal style={{ marginTop: 'clamp(20px, 2.4vw, 30px)' }}>
              <p className="legende" style={{ maxWidth: '62ch' }}>
                {v.legende}
              </p>
            </Reveal>
          ) : null}
        </div>
      );

    case 'supports':
      return (
        <div className="wrap">
          <Reveal>
            <Titre champ={v.titre} defautClasse="h3" />
            <ul className={p.supports} style={{ marginTop: 'clamp(24px, 3vw, 36px)' }}>
              {((v.supports ?? []) as Valeurs[]).map((sup, i) => (
                <li className={p.support} key={i}>
                  <p className="h4">{sup.nom}</p>
                  <p className={p.supportPrix}>{sup.prix}</p>
                  {sup.note ? <p className={p.supportNote}>{sup.note}</p> : null}
                </li>
              ))}
            </ul>
            {v.legende ? (
              <p className="legende" style={{ marginTop: 'clamp(20px, 2.4vw, 30px)', maxWidth: '62ch' }}>
                {v.legende}
              </p>
            ) : null}
          </Reveal>
        </div>
      );

    // ————————————————————————————— Contact ——————————————————————————
    case 'contact':
      return (
        <div className="wrap">
          <div className={p.contact}>
            {v.formulaire !== false ? (
              <Reveal>
                <ContactForm email={ctx.entreprise.email} telephone={ctx.entreprise.telephone} />
              </Reveal>
            ) : null}

            <Reveal className={p.coordonnees} retard={120}>
              {((v.blocs ?? []) as Valeurs[]).map((bloc, i) => (
                <div className={p.coordonneesBloc} key={i}>
                  <p className="surtitre">
                    <span>{bloc.surtitre}</span>
                  </p>

                  {bloc.variante === 'horaires' ? (
                    <ul className={p.horaires}>
                      {((bloc.horaires ?? []) as Valeurs[]).map((h, n) => (
                        <li key={n}>
                          <span>{h.jour}</span>
                          <span>{h.ouverture || 'Fermé'}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {bloc.texte ? <p>{enLignes(String(bloc.texte))}</p> : null}

                  {((bloc.liens ?? []) as Valeurs[]).map((l, n) =>
                    EXTERNE.test(String(l.href ?? '')) ? (
                      <a key={n} href={l.href} target="_blank" rel="noopener noreferrer">
                        {l.libelle}
                      </a>
                    ) : (
                      <a key={n} className={l.grand ? p.grand : undefined} href={l.href}>
                        {l.libelle}
                      </a>
                    ),
                  )}

                  {bloc.legende ? <p className="legende">{bloc.legende}</p> : null}
                </div>
              ))}
            </Reveal>
          </div>
        </div>
      );

    case 'simulateurIris':
      return (
        <div className="wrap">
          <Entete champ={v.entete} />
          <SimulateurIris
            repli="À partir de 49 €"
            repliNote="Le tarif dépend du nombre d’iris photographiés."
            hrefDevis="/contact/?projet=iris"
          />
        </div>
      );

    case 'appelAction':
      return (
        <div className="wrap">
          <Reveal>
            <div className={s.mesure}>
              <Titre champ={v.titre} />
              <TexteRiche doc={v.texte?.contenu} className="corps" />
              <Boutons boutons={v.boutons} />
            </div>
          </Reveal>
        </div>
      );

    // ————————————————————————————— Preuve ———————————————————————————
    case 'avis':
      return (
        <div className="wrap">
          <Entete champ={v.entete} />
          <div className={s.avis}>
            {((v.avis ?? []) as Valeurs[]).map((a, i) => (
              <Reveal key={i} retard={(i % 3) * 100}>
                <figure className={s.avisItem}>
                  <blockquote className="corps">{a.texte}</blockquote>
                  <figcaption>
                    {a.auteur}
                    {a.source ? <span className={s.source}> · {nomSource(a.source)}</span> : null}
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
          <LienFleche lien={v.lien} />
        </div>
      );

    case 'faq':
      return (
        <div className="wrap">
          <Entete champ={v.entete} />
          <Faq
            items={((v.questions ?? []) as Valeurs[]).map((q) => ({
              q: String(q.question ?? ''),
              r: String(q.reponse ?? ''),
            }))}
          />
        </div>
      );

    case 'logos':
      return (
        <div className="wrap">
          <Entete champ={v.entete} />
          <div className={s.logos}>
            {((v.logos ?? []) as Valeurs[]).map((l, i) => {
              const media = img(l.image);
              if (!media) return null;
              const vignette = <Image key={i} media={media} sizes="200px" />;
              return l.lien ? (
                <a key={i} href={l.lien} target="_blank" rel="noopener noreferrer">
                  {vignette}
                </a>
              ) : (
                vignette
              );
            })}
          </div>
        </div>
      );

    default:
      return null;
  }
}

// ————————————————————————————— Fragments —————————————————————————————

/** Une adresse qui sort du site s'ouvre dans un nouvel onglet. Un numéro de
    téléphone ou une adresse e-mail, non : ils ouvrent une application. */
const EXTERNE = /^https?:/i;

/** Un texte saisi sur plusieurs lignes garde ses retours à la ligne. */
function enLignes(valeur: string) {
  return valeur.split('\n').map((ligne, i) => (
    <span key={i}>
      {i > 0 ? <br /> : null}
      {ligne}
    </span>
  ));
}

type ChampTitre = { texte?: string; niveau?: string; apparence?: Apparence };

const NIVEAUX = { h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h4' } as const;

/**
 * Le niveau et la taille sont deux choses distinctes, et c'est volontaire : le
 * niveau dit à Google et aux lecteurs d'écran quelle est la hiérarchie, la
 * taille dit à l'œil ce qui compte.
 */
function Titre({
  champ,
  defautClasse,
  nom = 'titre',
}: {
  champ?: ChampTitre;
  defautClasse?: string;
  nom?: string;
}) {
  if (!champ?.texte) return null;
  const niveau = (champ.niveau ?? 'h2') as keyof typeof NIVEAUX;
  const Balise = NIVEAUX[niveau] ?? 'h2';
  const classe = defautClasse ?? (Balise === 'h4' ? 'h4' : Balise === 'h3' ? 'h3' : 'h2');

  return (
    <Balise className={classe} style={styleApparence(champ.apparence)} data-champ={nom}>
      {champ.texte}
    </Balise>
  );
}

type ChampEntete = ChampTitre & { numero?: string; surtitre?: string; chapo?: unknown };

/** Numéro, surtitre, titre, chapô : le motif qui ouvre les sections du site. */
function Entete({ champ }: { champ?: ChampEntete }) {
  if (!champ?.texte && !champ?.surtitre) return null;

  return (
    <Reveal as="header" className="entete-section">
      <div>
        {champ.numero || champ.surtitre ? (
          <p className="surtitre">
            {champ.numero ? <span className="surtitre__num">{champ.numero}</span> : null}
            {champ.surtitre ? <span>{champ.surtitre}</span> : null}
          </p>
        ) : null}
        <Titre champ={champ} nom="entete" />
      </div>
      <TexteRiche doc={champ.chapo} className="corps" champ="entete" />
    </Reveal>
  );
}

/** Lien de texte avec sa flèche. Plus discret qu'un bouton. */
function LienFleche({ lien }: { lien?: { libelle?: string; href?: string } }) {
  if (!lien?.libelle || !lien?.href) return null;
  const externe = /^https?:\/\//i.test(lien.href);
  const contenu = (
    <>
      {lien.libelle}
      <span className="lien__fleche" aria-hidden="true">
        {externe ? '↗' : '→'}
      </span>
    </>
  );

  return externe ? (
    <a className="lien" href={lien.href} target="_blank" rel="noopener noreferrer">
      {contenu}
    </a>
  ) : (
    <Link className="lien" href={lien.href}>
      {contenu}
    </Link>
  );
}

const nomSource = (v: string) =>
  v === 'google' ? 'Google' : v === 'mariagenet' ? 'Mariage.net' : 'Témoignage direct';
