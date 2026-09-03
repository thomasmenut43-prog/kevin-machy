import type { Metadata } from 'next';
import { Photo } from '@/components/Photo';
import { Reveal } from '@/components/Reveal';
import { AppelAction, Bande, EnteteSection } from '@/components/Blocs';
import { DonneesStructurees, schemaFilAriane } from '@/lib/schema';
import { LIENS } from '@/lib/site';
import s from '@/styles/pages.module.css';

export const metadata: Metadata = {
  title: 'À propos — Kevin Machy, photographe et Artisan d’Art',
  description:
    'Douze ans de gendarmerie avant la photographie. Kevin Machy, photographe professionnel et Artisan d’Art au Puy-en-Velay, également télépilote de drone.',
  alternates: { canonical: '/a-propos/' },
  openGraph: {
    title: 'Derrière l’appareil, il y a Kevin',
    description: 'Photographe professionnel et Artisan d’Art au Puy-en-Velay. Douze ans de gendarmerie avant la photographie.',
    url: '/a-propos/',
    images: [{ url: '/img/og-apropos.jpg', width: 1200, height: 630, alt: 'Portrait de Kevin Machy' }],
  },
};

export default function APropos() {
  return (
    <>
      <DonneesStructurees
        data={schemaFilAriane([
          { nom: 'Accueil', chemin: '/' },
          { nom: 'À propos', chemin: '/a-propos/' },
        ])}
      />

      <section className={`wrap ${s.ouverture}`}>
        <div className="duo duo-inverse">
          <Reveal className={s.ouvertureTitre}>
            <p className="surtitre">
              <span className="surtitre__num">00</span>
              <span>À propos</span>
            </p>
            <h1 className="h1">Derrière l’appareil, il y a Kevin.</h1>
            <p className={`lede ${s.ouvertureChapo}`}>
              Photographe professionnel et Artisan d’Art, basé au Puy-en-Velay. Je photographie surtout des gens — et
              très souvent ceux qui commencent par me dire qu’ils ne sont « pas photogéniques ».
            </p>
            <ul className="distinctions">
              <li>Artisan d’Art</li>
              <li>Télépilote de drone professionnel</li>
            </ul>
          </Reveal>

          <Reveal mode="voile">
            <Photo
              name="apropos-portrait"
              alt="Kevin Machy, portrait en noir et blanc sur fond noir, bras croisés, casquette au logo de bois de cerf"
              sizes="(min-width: 900px) 45vw, 100vw"
              priority
            />
          </Reveal>
        </div>
      </section>

      {/* ————————————————————————— 01 — Le parcours ———————————————————————— */}
      <section className="wrap section">
        <EnteteSection
          numero="01"
          surtitre="Le parcours"
          titre="Avant la photo, il y avait la gendarmerie."
          chapo={
            <p>
              Douze ans. Un univers assez éloigné d’un mariage ou d’une séance portrait — en apparence seulement.
            </p>
          }
        />

        <div className={s.parcours}>
          <Reveal className={s.chapitre}>
            <p className="corps">
              J’y ai appris à observer, à anticiper, à rester discret quand il le faut, et surtout à m’adapter vite aux
              gens et aux situations. Ce sont exactement ces qualités que j’emmène aujourd’hui derrière l’appareil.
            </p>
            <p className="corps">
              Pendant un mariage, je sais être là sans prendre toute la place. En portrait, je prends le temps de
              comprendre la personne que j’ai en face de moi, plutôt que de lui demander d’enchaîner des poses.
            </p>
            <p className="corps">
              La technique photographique s’apprend. Mettre les gens en confiance, observer ce qui se passe et savoir
              quand déclencher, c’est une autre histoire.
            </p>
          </Reveal>
        </div>
      </section>

      <Bande
        wide="apropos-silence"
        tall="mariage-jour-07"
        alt="Silhouettes d’invités qui dansent, bras levés, en fin de soirée"
      />

      {/* ————————————————————————— 02 — Le drone ——————————————————————————— */}
      <section className="wrap section">
        <div className="duo">
          <Reveal>
            <p className="surtitre">
              <span className="surtitre__num">02</span>
              <span>L’outil</span>
            </p>
            <h2 className="h2" style={{ marginTop: 'clamp(20px, 2.4vw, 32px)' }}>
              Et le drone dans tout ça ?
            </h2>
            <p className="corps" style={{ marginTop: 'clamp(24px, 3vw, 36px)' }}>
              Je suis également télépilote de drone professionnel. Une compétence qui permet, lorsque le projet s’y
              prête et que les conditions le permettent, d’apporter un autre point de vue à un reportage.
            </p>
            <p className="corps">
              Mais le drone reste un outil. L’histoire et les personnes passent toujours en premier.
            </p>
          </Reveal>

          <Reveal mode="voile">
            <Photo
              name="apropos-travail"
              alt="Deux mains tenant un boîtier photo, dans une lumière basse"
              sizes="(min-width: 900px) 50vw, 100vw"
            />
          </Reveal>
        </div>
      </section>

      {/* ————————————————————————— 03 — La façon de faire —————————————————— */}
      <section className="wrap section">
        <EnteteSection
          numero="03"
          surtitre="La façon de faire"
          titre="Je ne vais pas vous demander de savoir poser."
          chapo={
            <p>
              La plupart des personnes que je photographie ne sont pas habituées à être devant un objectif. Et c’est
              très bien comme ça.
            </p>
          }
        />
        <div className={s.parcours}>
          <Reveal className={s.chapitre}>
            <p className="corps">
              Mon rôle, c’est de vous guider quand vous en avez besoin, de vous laisser respirer quand il le faut, et
              surtout de faire oublier progressivement l’appareil. Que ce soit pendant un mariage ou une séance
              portrait, je cherche moins la photo parfaite que celle dans laquelle vous allez vraiment vous reconnaître.
            </p>
            <p className="corps">
              Je photographie des personnes, pas des modèles. Des couples qui rient, des mariés qui profitent de leur
              journée, des familles qui bougent — et beaucoup de gens qui commencent leur séance en s’excusant presque
              d’être là.
            </p>
          </Reveal>
        </div>
      </section>

      <AppelAction
        titre="Et maintenant, on fait des photos ?"
        texte={
          <p>
            Si ma façon de voir la photographie vous parle, il ne reste plus qu’à me raconter ce que vous avez en tête.
            Un mariage, une séance portrait, un projet pour votre entreprise : on échange simplement, sans engagement,
            et on voit si je suis la bonne personne pour raconter votre histoire.
          </p>
        }
        actions={[
          { href: '/contact/', label: 'Me parler de votre projet' },
          { href: LIENS.instagram, label: 'Voir mon Instagram', externe: true, fantome: true },
        ]}
      />
    </>
  );
}
