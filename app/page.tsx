import Link from 'next/link';
import { Hero } from '@/components/Hero';
import { Photo } from '@/components/Photo';
import { Reveal } from '@/components/Reveal';
import { Gallery, type ItemGalerie } from '@/components/Gallery';
import { AppelAction, Bande, EnteteSection, Temoignages } from '@/components/Blocs';
import { LIENS } from '@/lib/site';
import s from './page.module.css';

const COLLECTIONS = [
  {
    num: '01',
    titre: 'Mariage',
    href: '/mariage/',
    image: 'home-collection-mariage',
    alt: 'Une main posée sur la joue, juste avant un baiser, pendant un mariage',
    texte:
      'Des préparatifs à la fête, je raconte votre journée telle qu’elle se vit : les émotions, les éclats de rire, et tout ce que vous n’aurez peut-être même pas vu passer.',
  },
  {
    num: '02',
    titre: 'Portrait',
    href: '/portrait/',
    image: 'home-collection-portrait',
    alt: 'Portrait de studio en noir et blanc, regard baissé, lumière rasante',
    texte:
      'Vous pensez ne pas être photogénique ? Tant mieux. C’est exactement là que mon travail commence — seul, en couple ou à plusieurs.',
  },
  {
    num: '03',
    titre: 'Studio de l’Iris',
    href: '/studio-de-l-iris/',
    image: 'home-collection-iris',
    alt: 'Iris bleu photographié en macrophotographie sur fond noir',
    texte:
      'Votre regard, photographié en très haute définition, révèle des couleurs et des textures invisibles à l’œil nu. Et devient une œuvre.',
  },
] as const;

const SELECTION: ItemGalerie[] = [
  { name: 'home-selection-01', alt: 'Deux visages qui se rapprochent dans une lumière chaude' },
  { name: 'home-selection-02', alt: 'Silhouette isolée dans un rai de lumière, sur fond noir' },
  { name: 'home-selection-03', alt: 'Une main de mariée portant son alliance, posée sur la dentelle' },
  { name: 'home-selection-04', alt: 'Iris ambré photographié en très gros plan' },
  { name: 'home-selection-05', alt: 'Silhouettes d’invités qui dansent, bras levés, en fin de soirée' },
  { name: 'home-selection-06', alt: 'Portrait en noir et blanc, regard frontal et fixe' },
  { name: 'home-selection-07', alt: 'Robe de mariée tenue à bout de bras, avant l’habillage' },
  { name: 'home-selection-08', alt: 'Petite chapelle en pierre au bout d’une allée d’arbres' },
  { name: 'home-selection-09', alt: 'Un couple enlacé dans la pénombre' },
  { name: 'home-selection-10', alt: 'Deux mariés s’éloignent main dans la main dans un pré' },
  { name: 'home-selection-11', alt: 'Œil de profil, cils en contre-jour, fond sombre' },
  { name: 'home-selection-12', alt: 'Un visage dans l’ombre, traversé par une lame de lumière' },
];

export default function Accueil() {
  return (
    <>
      <Hero
        wide="home-hero-wide"
        tall="home-hero-tall"
        alt="Une mariée, le soir, devant une guirlande de lumières hors de la mise au point"
      >
        <Reveal>
          <p className="hero__meta">
            <span>Photographe</span>
            <span>Artisan d’Art</span>
            <span>Le Puy-en-Velay</span>
          </p>
        </Reveal>
        <Reveal retard={120}>
          <h1 className="h1">Vous n’aurez pas à savoir poser.</h1>
        </Reveal>
        <Reveal retard={240}>
          <p className="lede">
            Mariages, portraits et histoires humaines en Haute-Loire. Je vous guide juste ce qu’il faut, et j’évite
            autant que possible les photos où tout le monde attend qu’on dise « cheese ».
          </p>
        </Reveal>
        <Reveal retard={340}>
          <div className="actions">
            <Link className="bouton" href="/mariage/">
              Découvrir les mariages
            </Link>
            <Link className="bouton bouton-fantome" href="/portrait/">
              Découvrir les portraits
            </Link>
          </div>
        </Reveal>
      </Hero>

      {/* ————————————————————————— 01 — Le photographe ————————————————————— */}
      <section className="wrap section">
        <div className="duo duo-inverse">
          <Reveal>
            <p className="surtitre">
              <span className="surtitre__num">01</span>
              <span>Le photographe</span>
            </p>
            <h2 className="h2" style={{ marginTop: 'clamp(20px, 2.4vw, 32px)' }}>
              Photographe, oui. Mais surtout là pour raconter les gens.
            </h2>
            <p className="corps" style={{ marginTop: 'clamp(24px, 3vw, 36px)' }}>
              Je suis Kevin Machy, photographe professionnel et Artisan d’Art, basé au Puy-en-Velay. Mon terrain de jeu
              préféré, ce sont les gens : ceux qui se marient, ceux qui s’aiment, ceux qui sont persuadés de ne pas être
              photogéniques, et ceux qui veulent simplement garder une trace vraie d’un moment de leur vie.
            </p>
            <p className="corps">
              Mon approche tient en peu de mots : vous guider quand il le faut, me faire oublier le reste du temps.
            </p>
            <p style={{ marginTop: 'clamp(28px, 3.4vw, 40px)' }}>
              <Link className="lien" href="/a-propos/">
                Découvrir qui je suis
                <span className="lien__fleche" aria-hidden="true">
                  →
                </span>
              </Link>
            </p>
          </Reveal>

          <Reveal mode="voile">
            <Photo
              name="home-apropos"
              alt="Kevin Machy, portrait en noir et blanc sur fond noir, bras croisés"
              sizes="(min-width: 900px) 45vw, 100vw"
            />
          </Reveal>
        </div>
      </section>

      {/* ————————————————————————— 02 — Les collections ———————————————————— */}
      <section className="wrap section">
        <EnteteSection
          numero="02"
          surtitre="Les collections"
          titre="Quel projet allons-nous imaginer ensemble ?"
          chapo={
            <p>
              Trois façons de travailler ensemble. Elles se ressemblent sur un point : dans les trois, on commence par
              parler avant de photographier.
            </p>
          }
        />

        <div className={s.collections}>
          {COLLECTIONS.map((c, i) => (
            <Reveal key={c.href} retard={i * 120}>
              <Link href={c.href} className={s.collection}>
                <Photo name={c.image} alt={c.alt} sizes="(min-width: 860px) 30vw, 100vw" />
                <span className={s.collectionNum}>{c.num}</span>
                <span className="h3">{c.titre}</span>
                <span className={s.collectionTexte}>{c.texte}</span>
                <span className="lien" style={{ width: 'fit-content' }}>
                  Découvrir
                  <span className="lien__fleche" aria-hidden="true">
                    →
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>

        <Reveal className={s.appoint}>
          <p>
            Vous cherchez un photographe pour votre entreprise ? Portraits de collaborateurs, gestes métier, reportage
            ou banque d’images : dites-moi ce dont vous avez besoin, on construit la prestation autour.
          </p>
          <Link className="lien" href="/contact/?projet=entreprise">
            Parler d’un projet d’entreprise
            <span className="lien__fleche" aria-hidden="true">
              →
            </span>
          </Link>
        </Reveal>
      </section>

      <Bande
        wide="mariage-silence"
        tall="mariage-jour-03"
        alt="Une allée d’arbres qui mène à une petite chapelle, en fin de journée"
      />

      {/* ————————————————————————— 03 — Une sélection —————————————————————— */}
      <section className="wrap section">
        <EnteteSection
          numero="03"
          surtitre="Une sélection"
          titre="Quelques images, plutôt que toutes."
          chapo={
            <p>
              Douze photographies pour voir comment je travaille : les gens, les émotions, et tout ce qui se passe entre
              les deux. Cliquez sur une image pour l’agrandir.
            </p>
          }
        />
        <Gallery items={SELECTION} action="Voir" />
      </section>

      {/* ————————————————————————— 04 — Les avis —————————————————————————— */}
      <section className="wrap section">
        <EnteteSection numero="04" surtitre="Ce qu’ils en disent" titre="Ce sont eux qui en parlent le mieux." />
        <Temoignages />
        <Reveal style={{ marginTop: 'clamp(40px, 5vw, 64px)' }}>
          <a className="lien" href={LIENS.avis} target="_blank" rel="noopener noreferrer">
            Voir plus d’avis
            <span className="lien__fleche" aria-hidden="true">
              ↗
            </span>
          </a>
        </Reveal>
      </section>

      <AppelAction
        titre="Vous avez une histoire à me raconter ?"
        texte={
          <p>
            Un mariage, une séance portrait, un projet pour votre entreprise. Parlez-moi de ce que vous avez en tête :
            on échange simplement, sans engagement, et on voit ensemble comment le photographier à votre manière.
          </p>
        }
        actions={[
          { href: '/contact/', label: 'Me parler de votre projet' },
          { href: LIENS.accesClients, label: 'Accès clients', externe: true, fantome: true },
        ]}
      />
    </>
  );
}
