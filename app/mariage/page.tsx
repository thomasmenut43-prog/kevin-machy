import type { Metadata } from 'next';
import Link from 'next/link';
import { Hero } from '@/components/Hero';
import { Photo } from '@/components/Photo';
import { Reveal } from '@/components/Reveal';
import { Gallery, type ItemGalerie } from '@/components/Gallery';
import { AppelAction, Bande, EnteteSection } from '@/components/Blocs';
import { DonneesStructurees, schemaFilAriane } from '@/lib/schema';
import { COLLECTIONS_MARIAGE, JOURNEE, LIENS, OPTIONS_MARIAGE, SOCLE_MARIAGE } from '@/lib/site';
import s from '@/styles/pages.module.css';

export const metadata: Metadata = {
  title: 'Photographe de mariage en Haute-Loire',
  description:
    'Photographe de mariage au Puy-en-Velay, en Haute-Loire et dans la Loire. Un reportage naturel, quatre collections de 1390 € à 3400 €, livraison sous 21 jours.',
  alternates: { canonical: '/mariage/' },
  openGraph: {
    title: 'Photographe de mariage en Haute-Loire — Kevin Machy',
    description: 'Des photos vraies, des gens qui rient, et un photographe présent quand il faut, invisible le reste du temps.',
    url: '/mariage/',
    images: [{ url: '/img/og-mariage.jpg', width: 1200, height: 630, alt: 'Deux mariés s’éloignent dans un pré' }],
  },
};

const GALERIE: ItemGalerie[] = [
  { name: 'mariage-galerie-01', alt: 'Deux visages qui se rapprochent, lumière chaude de fin de journée' },
  { name: 'mariage-galerie-02', alt: 'Les mariés se font face, front contre front, à l’ombre d’un porche' },
  { name: 'mariage-galerie-03', alt: 'Bouquet de gypsophile tenu à deux mains' },
  { name: 'mariage-galerie-04', alt: 'Un couple enlacé, en contre-jour devant une baie vitrée' },
  { name: 'mariage-galerie-05', alt: 'La mariée seule, dehors, à la tombée du jour' },
  { name: 'mariage-galerie-06', alt: 'Les pieds des mariés sur les pavés, robe et costume en mouvement' },
  { name: 'mariage-galerie-07', alt: 'Les alliances posées sur un ruban de satin' },
  { name: 'mariage-galerie-08', alt: 'Les mariés côte à côte devant un mur de brique' },
  { name: 'mariage-galerie-09', alt: 'La mariée le soir, devant une guirlande de lumières hors mise au point' },
  { name: 'mariage-galerie-10', alt: 'Un instant de préparatifs, dans le miroir' },
  { name: 'mariage-galerie-11', alt: 'Les mariés marchent dans un pré, au loin' },
  { name: 'mariage-galerie-12', alt: 'Des fleurs coupées, en attente, avant la cérémonie' },
];

export default function Mariage() {
  return (
    <>
      <DonneesStructurees
        data={schemaFilAriane([
          { nom: 'Accueil', chemin: '/' },
          { nom: 'Mariage', chemin: '/mariage/' },
        ])}
      />

      <Hero
        wide="mariage-hero-wide"
        tall="mariage-hero-tall"
        alt="Deux mariés s’éloignent main dans la main dans un pré, en fin d’après-midi"
      >
        <Reveal>
          <p className="hero__meta">
            <span>Mariage</span>
            <span>Haute-Loire &amp; Loire</span>
            <span>Et plus loin si l’histoire l’exige</span>
          </p>
        </Reveal>
        <Reveal retard={120}>
          <h1 className="h1">Des photos vraies, et une journée que vous allez vraiment vivre.</h1>
        </Reveal>
        <Reveal retard={240}>
          <p className="lede">
            Photographe de mariage en Haute-Loire et dans la Loire. Mon rôle commence bien avant les photos : vous
            mettre à l’aise, vous laisser profiter, et raconter votre journée telle qu’elle se passe.
          </p>
        </Reveal>
        <Reveal retard={340}>
          <div className="actions">
            <Link className="bouton" href="/contact/?projet=mariage">
              Me parler de votre mariage
            </Link>
            <a className="bouton bouton-fantome" href="#collections">
              Voir les collections
            </a>
          </div>
        </Reveal>
      </Hero>

      {/* ————————————————————————— 01 — L'approche ————————————————————————— */}
      <section className="wrap section">
        <div className="duo duo-inverse">
          <Reveal>
            <p className="surtitre">
              <span className="surtitre__num">01</span>
              <span>L’approche</span>
            </p>
            <h2 className="h2" style={{ marginTop: 'clamp(20px, 2.4vw, 32px)' }}>
              Présent quand il faut. Invisible le reste du temps.
            </h2>
            <p className="corps" style={{ marginTop: 'clamp(24px, 3vw, 36px)' }}>
              Je ne vais pas transformer votre mariage en séance photo de huit heures. Je vous guide quand vous en avez
              besoin — pendant les photos de couple, essentiellement — puis je vous laisse vivre. Le reste du temps, je
              cherche les regards, les gestes et les fous rires que vous n’avez parfois même pas vus passer.
            </p>
            <p className="corps">
              L’objectif n’est pas d’avoir de belles photos. C’est qu’en les regardant dans vingt ans, vous retrouviez
              vraiment votre journée : les gens que vous aimez, l’ambiance, et tout ce qui fait que cette journée
              n’appartiendra qu’à vous.
            </p>
            <ul className="distinctions" style={{ marginTop: 'clamp(32px, 4vw, 48px)' }}>
              <li>Wedding Awards 2025 &amp; 2026</li>
              <li>Artisan d’Art</li>
            </ul>
          </Reveal>

          <Reveal mode="voile">
            <Photo
              name="mariage-approche"
              alt="Une main posée sur la joue, juste avant un baiser, pendant un mariage"
              sizes="(min-width: 900px) 45vw, 100vw"
            />
          </Reveal>
        </div>
      </section>

      <Bande
        wide="mariage-silence"
        tall="mariage-jour-03"
        alt="Une allée d’arbres qui mène à une petite chapelle, en fin de journée"
      />

      {/* ————————————————————————— 02 — Le déroulé ————————————————————————— */}
      <section className="wrap section">
        <EnteteSection
          numero="02"
          surtitre="Le déroulé"
          titre="Une journée, sept moments."
          chapo={
            <p>
              Chaque mariage se déroule à sa façon. Voici les temps que je couvre, et ce que je cherche dans chacun
              d’eux. Le détail de ce qui est inclus dépend de la collection choisie.
            </p>
          }
        />

        <div className={s.jalons}>
          {JOURNEE.map((jalon, i) => (
            <div className={s.jalon} key={jalon.titre}>
              <Reveal mode="voile">
                <Photo name={jalon.image} alt={jalon.alt} sizes="(min-width: 820px) 34vw, 100vw" />
              </Reveal>
              <Reveal className={s.jalonTexte} retard={90}>
                <span className={s.jalonNum}>{String(i + 1).padStart(2, '0')}</span>
                <h3 className="h3">{jalon.titre}</h3>
                <p className="corps">{jalon.texte}</p>
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      {/* ————————————————————————— 03 — La galerie ————————————————————————— */}
      <section className="wrap section">
        <EnteteSection
          numero="03"
          surtitre="La galerie"
          titre="Douze images, prises dans de vrais mariages."
          chapo={<p>Cliquez sur une image pour l’agrandir. Les flèches du clavier permettent de passer d’une photographie à l’autre.</p>}
        />
        <Gallery items={GALERIE} action="Voir" />
      </section>

      {/* ————————————————————————— 04 — Les collections ———————————————————— */}
      <section className="wrap section" id="collections">
        <EnteteSection
          numero="04"
          surtitre="Les collections"
          titre="Pas de mariage standard, donc pas de reportage standard."
          chapo={
            <p>
              De cinq heures de reportage à une couverture complète de votre journée, quatre collections permettent de
              choisir l’accompagnement qui correspond réellement à votre mariage.
            </p>
          }
        />

        <Reveal className={s.socle}>
          <p className="h4">Dans toutes les collections</p>
          <ul className="liste-pointee">
            {SOCLE_MARIAGE.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Reveal>

        <ul className={s.collections}>
          {COLLECTIONS_MARIAGE.map((c, i) => (
            <Reveal as="li" className={s.offre} key={c.nom} retard={Math.min(i, 3) * 80}>
              <div className={s.offreTete}>
                <h3 className="h3">{c.nom}</h3>
                <p className="prix">{c.prix}</p>
                <p className={s.offreDuree}>{c.duree}</p>
              </div>
              <div className={s.offreCorps}>
                <p className={s.offrePromesse}>{c.promesse}</p>
                <ul className="liste-pointee">
                  {c.inclus.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className={s.offreAction}>
                <Link className="bouton bouton-fantome" href={`/contact/?projet=mariage`}>
                  Vérifier la disponibilité
                </Link>
              </div>
            </Reveal>
          ))}
        </ul>

        <Reveal style={{ marginTop: 'clamp(56px, 7vw, 96px)' }}>
          <h3 className="h3" style={{ marginBottom: 'clamp(24px, 3vw, 36px)' }}>
            Et si vous voulez aller plus loin
          </h3>
          <ul className={s.options}>
            {OPTIONS_MARIAGE.map((o) => (
              <li className={s.option} key={o.nom}>
                <p className="h4">{o.nom}</p>
                {o.prix ? <p className={s.optionPrix}>{o.prix}</p> : null}
                <p className={s.optionTexte}>{o.texte}</p>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal style={{ marginTop: 'clamp(56px, 7vw, 96px)' }}>
          <div className={s.garantie}>
            <h3 className="h3">Et un vidéaste ?</h3>
            <p className="corps">
              Je me consacre aujourd’hui entièrement à la photographie. Si vous voulez aussi garder votre journée en
              vidéo, je travaille régulièrement aux côtés de vidéastes qui abordent un mariage comme moi :
              naturellement, discrètement, sans transformer la journée en tournage. Je vous oriente vers les bonnes
              personnes, et nous coordonnons nos prestations.
            </p>
          </div>
        </Reveal>
      </section>

      <AppelAction
        titre="Racontez-moi votre mariage."
        texte={
          <p>
            La date, le lieu, l’ambiance que vous imaginez — ou simplement le fait que vous n’en savez encore rien. On
            échange, et on voit si je suis la bonne personne pour raconter cette journée.
          </p>
        }
        actions={[
          { href: '/contact/?projet=mariage', label: 'Me parler de votre mariage' },
          { href: LIENS.reservation, label: 'Prendre rendez-vous', externe: true, fantome: true },
        ]}
      />
    </>
  );
}
