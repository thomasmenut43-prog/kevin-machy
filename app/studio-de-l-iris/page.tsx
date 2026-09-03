import type { Metadata } from 'next';
import Link from 'next/link';
import { Hero } from '@/components/Hero';
import { Photo } from '@/components/Photo';
import { Reveal } from '@/components/Reveal';
import { Faq } from '@/components/Faq';
import { AppelAction, EnteteSection } from '@/components/Blocs';
import { DonneesStructurees, schemaFaq, schemaFilAriane } from '@/lib/schema';
import { IRIS_ETAPES, IRIS_FAQ, IRIS_SUPPORTS, IRIS_TARIFS, LIENS, SITE } from '@/lib/site';
import s from '@/styles/pages.module.css';

export const metadata: Metadata = {
  title: 'Studio de l’Iris au Puy-en-Velay',
  description:
    'Votre iris photographié en très haute définition, au Puy-en-Velay. Séance à partir de 49 €, sans contact avec l’œil. Humains et animaux, sur rendez-vous.',
  alternates: { canonical: '/studio-de-l-iris/' },
  openGraph: {
    title: 'Studio de l’Iris — Kevin Machy, Le Puy-en-Velay',
    description: 'Votre iris est aussi unique qu’une empreinte digitale. Photographié de près, il devient une œuvre.',
    url: '/studio-de-l-iris/',
    images: [{ url: '/img/og-iris.jpg', width: 1200, height: 630, alt: 'Iris bleu photographié en macrophotographie' }],
  },
};

const MOSAIQUE = [
  { name: 'iris-detail-01', alt: 'Iris ambré aux stries orangées, pupille au centre' },
  { name: 'iris-detail-02', alt: 'Iris bleu clair, cils en premier plan' },
  { name: 'iris-detail-03', alt: 'Iris photographié sous une lumière rouge intense' },
  { name: 'iris-detail-04', alt: 'Œil de profil, cils en contre-jour sur fond sombre' },
  { name: 'iris-detail-05', alt: 'Deux yeux en noir et blanc, regard frontal' },
  { name: 'iris-detail-06', alt: 'Iris brun sombre, sourcil et frange au-dessus' },
] as const;

export default function StudioIris() {
  return (
    <>
      <DonneesStructurees
        data={schemaFilAriane([
          { nom: 'Accueil', chemin: '/' },
          { nom: 'Studio de l’Iris', chemin: '/studio-de-l-iris/' },
        ])}
      />
      <DonneesStructurees data={schemaFaq(IRIS_FAQ)} />

      <Hero
        wide="iris-hero-wide"
        tall="iris-hero-tall"
        alt="Iris bleu-gris photographié en macrophotographie, sur fond noir"
      >
        <Reveal>
          <p className="hero__meta">
            <span>Studio de l’Iris</span>
            <span>{SITE.adresse}</span>
            <span>Sur rendez-vous</span>
          </p>
        </Reveal>
        <Reveal retard={120}>
          <h1 className="h1">Votre iris est aussi unique qu’une empreinte digitale.</h1>
        </Reveal>
        <Reveal retard={240}>
          <p className="lede">
            Photographié en très haute définition, il révèle des couleurs, des textures et des détails invisibles à
            l’œil nu. Seul, en couple, en famille — ou avec votre animal.
          </p>
        </Reveal>
        <Reveal retard={340}>
          <div className="actions">
            <a className="bouton" href={LIENS.reservation} target="_blank" rel="noopener noreferrer">
              Réserver ma séance
            </a>
            <a className="bouton bouton-fantome" href="#tarifs">
              Voir les tarifs
            </a>
          </div>
        </Reveal>
      </Hero>

      {/* ————————————————————————— 01 — L'œuvre ——————————————————————————— */}
      <section className="wrap section">
        <div className="duo">
          <Reveal>
            <p className="surtitre">
              <span className="surtitre__num">01</span>
              <span>L’œuvre</span>
            </p>
            <h2 className="h2" style={{ marginTop: 'clamp(20px, 2.4vw, 32px)' }}>
              Votre regard devient une pièce à part entière.
            </h2>
            <p className="corps" style={{ marginTop: 'clamp(24px, 3vw, 36px)' }}>
              La prise de vue est rapide et se fait sans aucun contact avec l’œil. Je vous accompagne ensuite dans le
              choix de la composition et du rendu qui mettront le mieux votre iris en valeur.
            </p>
            <p className="corps">
              La prestation fonctionne pour une personne seule, pour un duo, ou pour immortaliser le regard de votre
              animal — chien, chat, cheval, NAC selon les conditions.
            </p>
            <ul className="liste-pointee" style={{ marginTop: 'clamp(28px, 3.4vw, 40px)' }}>
              <li>Maîtrise technique en photographie macro</li>
              <li>Équipement spécialisé, dédié à la prise de vue d’iris</li>
              <li>Sécurité et confort : sans contact, sans risque</li>
              <li>Une composition adaptée à chaque sujet</li>
            </ul>
          </Reveal>

          <Reveal mode="voile">
            <Photo
              name="iris-oeuvre"
              alt="Iris bleu-gris en très gros plan, texture en fines stries autour de la pupille"
              sizes="(min-width: 900px) 50vw, 100vw"
            />
          </Reveal>
        </div>
      </section>

      {/* Mosaïque pleine largeur : la page la plus visuelle du site. */}
      <section className="section-serree">
        <div className={s.iris}>
          {MOSAIQUE.map((m, i) => (
            <Reveal key={m.name} mode="voile" retard={(i % 3) * 100}>
              <Photo name={m.name} alt={m.alt} sizes="(min-width: 760px) 33vw, 50vw" />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ————————————————————————— 02 — Le déroulé ————————————————————————— */}
      <section className="wrap section">
        <EnteteSection
          numero="02"
          surtitre="Le déroulé"
          titre="Une séance dure environ trente minutes."
          chapo={
            <p>
              Quarante-cinq minutes pour deux personnes. Pour un animal, la durée dépend de son calme et de sa
              réceptivité — et son rythme reste prioritaire.
            </p>
          }
        />

        <ol className="liste-filets">
          {IRIS_ETAPES.map((etape, i) => (
            <Reveal as="li" key={etape.numero} retard={Math.min(i, 4) * 70}>
              <div>
                <span className={s.jalonNum}>{etape.numero}</span>
                <h3 className="h3" style={{ marginTop: '0.6rem' }}>
                  {etape.titre}
                </h3>
              </div>
              <p className="corps">{etape.texte}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ————————————————————————— 03 — L'iris animal —————————————————————— */}
      <section className="wrap section">
        <EnteteSection
          numero="03"
          surtitre="L’iris animal"
          titre="Le regard de votre compagnon."
          chapo={
            <p>
              Chaque animal a un regard unique. La séance se déroule dans le respect total de l’animal, sans contrainte,
              avec patience — et votre présence est fortement recommandée.
            </p>
          }
        />
        <div className="trio">
          <Reveal mode="voile">
            <Photo
              name="iris-animal-01"
              alt="Œil de chat vert émeraude, pupille verticale, poils blancs autour"
              sizes="(min-width: 760px) 32vw, 100vw"
            />
          </Reveal>
          <Reveal mode="voile" retard={110}>
            <Photo
              name="iris-animal-02"
              alt="Œil sombre d’un cheval, cils longs, robe claire"
              sizes="(min-width: 760px) 32vw, 100vw"
            />
          </Reveal>
          <Reveal mode="voile" retard={220}>
            <Photo
              name="iris-duo"
              alt="Deux iris photographiés côte à côte, composition en duo"
              sizes="(min-width: 760px) 32vw, 100vw"
              ratio={1}
            />
          </Reveal>
        </div>
      </section>

      {/* ————————————————————————— 04 — Les tarifs ————————————————————————— */}
      <section className="wrap section" id="tarifs">
        <EnteteSection
          numero="04"
          surtitre="Les tarifs"
          titre="Deux formules, adaptables."
          chapo={
            <p>
              Le tirage et le support grande taille se choisissent après la séance, quand vous avez vu votre image. Rien
              n’est imposé.
            </p>
          }
        />

        <div className={s.tarifs}>
          {IRIS_TARIFS.map((t, i) => (
            <Reveal as="article" className={s.tarif} key={t.nom} retard={i * 100}>
              <div>
                <h3 className="h3">{t.nom}</h3>
                <p className="prix" style={{ marginTop: '0.6rem' }}>
                  {t.prix}
                </p>
                <p className={s.offreDuree} style={{ marginTop: '0.5rem' }}>
                  {t.note}
                </p>
              </div>
              <ul className="liste-pointee">
                {t.inclus.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {t.exclus ? <p className={s.supportNote}>{t.exclus}</p> : null}
              {t.cta.href.startsWith('http') ? (
                <a
                  className="bouton bouton-fantome"
                  href={t.cta.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ width: 'fit-content' }}
                >
                  {t.cta.label}
                </a>
              ) : (
                <Link className="bouton bouton-fantome" href={t.cta.href} style={{ width: 'fit-content' }}>
                  {t.cta.label}
                </Link>
              )}
            </Reveal>
          ))}
        </div>

        <Reveal style={{ marginTop: 'clamp(64px, 8vw, 112px)' }}>
          <h3 className="h3" style={{ marginBottom: 'clamp(24px, 3vw, 36px)' }}>
            Les supports
          </h3>
          <ul className={s.supports}>
            {IRIS_SUPPORTS.map((sup) => (
              <li className={s.support} key={sup.nom}>
                <p className="h4">{sup.nom}</p>
                <p className={s.supportPrix}>{sup.prix}</p>
                {sup.note ? <p className={s.supportNote}>{sup.note}</p> : null}
              </li>
            ))}
          </ul>
          <p className="legende" style={{ marginTop: 'clamp(20px, 2.4vw, 30px)', maxWidth: '62ch' }}>
            La grille complète des formats et des finitions est détaillée au studio. Au-delà des formats listés, sur
            devis.
          </p>
        </Reveal>

        <div className="duo" style={{ marginTop: 'clamp(64px, 8vw, 112px)' }}>
          <Reveal mode="voile">
            <Photo
              name="iris-support-tableau"
              alt="Mur d’accrochage garni de tirages encadrés, dans une pièce sombre"
              sizes="(min-width: 900px) 50vw, 100vw"
            />
          </Reveal>
          <Reveal mode="voile" retard={110}>
            <Photo
              name="iris-support-bijou"
              alt="Un bijou gravé d’iris, porté au poignet"
              sizes="(min-width: 900px) 45vw, 100vw"
            />
          </Reveal>
        </div>
      </section>

      {/* ————————————————————————— 05 — Questions ————————————————————————— */}
      <section className="wrap-etroit section">
        <EnteteSection numero="05" surtitre="Questions fréquentes" titre="Ce que l’on me demande le plus souvent." />
        <Faq items={IRIS_FAQ} />
      </section>

      <AppelAction
        titre="Prêt à voir votre iris ?"
        texte={
          <p>
            Le Studio de l’Iris se trouve au {SITE.adresse}, au Puy-en-Velay, uniquement sur rendez-vous. Dès la
            commande passée, je vous recontacte pour fixer une date.
          </p>
        }
        actions={[
          { href: LIENS.reservation, label: 'Réserver ma séance Iris', externe: true },
          { href: '/contact/?projet=iris', label: 'Poser une question', fantome: true },
        ]}
      />
    </>
  );
}
