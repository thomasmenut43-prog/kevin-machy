import type { Metadata } from 'next';
import Link from 'next/link';
import { Hero } from '@/components/Hero';
import { Photo } from '@/components/Photo';
import { Reveal } from '@/components/Reveal';
import { Gallery, type ItemGalerie } from '@/components/Gallery';
import { AppelAction, Bande, EnteteSection, Figure } from '@/components/Blocs';
import { DonneesStructurees, schemaFilAriane } from '@/lib/schema';
import { LIENS, PORTRAIT_INCLUS, PORTRAIT_SUPPORTS } from '@/lib/site';
import s from '@/styles/pages.module.css';

export const metadata: Metadata = {
  title: 'Photographe portrait en Haute-Loire',
  description:
    'Séance portrait au studio du Puy-en-Velay ou en extérieur. Une seule collection à 129 €, un tirage d’art inclus, et une nouvelle séance offerte si aucune image ne vous plaît.',
  alternates: { canonical: '/portrait/' },
  openGraph: {
    title: 'Photographe portrait en Haute-Loire — Kevin Machy',
    description: 'Des portraits pour ceux qui ne se trouvent pas photogéniques. C’est justement là que mon travail commence.',
    url: '/portrait/',
    images: [{ url: '/img/og-portrait.jpg', width: 1200, height: 630, alt: 'Portrait en noir et blanc, regard frontal' }],
  },
};

const METHODE = [
  {
    num: '01',
    titre: 'On commence par vous mettre à l’aise',
    texte:
      'On discute, on teste, on rigole. Au bout de quelques minutes, vous arrêtez de penser à votre sourire, à vos mains, et à cette question qui revient toujours : « mais je fais quoi, là ? »',
    image: 'portrait-methode-01',
    alt: 'Portrait de studio en noir et blanc, regard baissé, lumière rasante',
  },
  {
    num: '02',
    titre: 'Vous n’avez pas à savoir poser',
    texte:
      'Je me suis formé spécifiquement à la gestuelle et à la direction de modèle, pour une raison simple : c’est mon travail, pas le vôtre. Je vous guide dans la posture, le regard, les mouvements.',
    image: 'portrait-methode-02',
    alt: 'Portrait en extérieur, visage entre des branches en fleurs',
  },
  {
    num: '03',
    titre: 'Le but n’est pas de vous transformer',
    texte:
      'Je veux que vous vous reconnaissiez sur les images. Avec, si possible, ce petit moment où vous vous dites : « ah ouais… c’est vraiment moi ? »',
    image: 'portrait-methode-03',
    alt: 'Deux visages proches, lumière chaude, expression détendue',
  },
] as const;

const GALERIE: ItemGalerie[] = [
  { name: 'portrait-galerie-01', alt: 'Portrait de face, cheveux bouclés, lumière douce sur fond sombre' },
  { name: 'portrait-galerie-02', alt: 'Une enfant de dos dans un sous-bois, en noir et blanc' },
  { name: 'portrait-galerie-03', alt: 'Un couple enlacé dans la pénombre, visages proches' },
  { name: 'portrait-galerie-04', alt: 'Un regard en très gros plan, noir et blanc, sourcil et cils nets' },
  { name: 'portrait-galerie-05', alt: 'Portrait serré en noir et blanc, regard direct' },
  { name: 'portrait-galerie-06', alt: 'Portrait en noir et blanc, épaule dénudée, lumière basse' },
  { name: 'portrait-galerie-07', alt: 'Un homme, la main sur le front, dans une lumière très basse' },
  { name: 'portrait-galerie-08', alt: 'Des parents et leur nouveau-né, dehors, en fin de journée' },
  { name: 'portrait-galerie-09', alt: 'Profil se détachant d’un fond sombre' },
  { name: 'portrait-galerie-10', alt: 'Un rire franc, saisi dans une lumière chaude et rasante' },
];

export default function Portrait() {
  return (
    <>
      <DonneesStructurees
        data={schemaFilAriane([
          { nom: 'Accueil', chemin: '/' },
          { nom: 'Portrait', chemin: '/portrait/' },
        ])}
      />

      <Hero
        wide="portrait-hero-wide"
        tall="portrait-hero-tall"
        alt="Silhouette isolée dans un rai de lumière, sur fond noir"
      >
        <Reveal>
          <p className="hero__meta">
            <span>Portrait</span>
            <span>Studio au Puy-en-Velay</span>
            <span>Ou en extérieur</span>
          </p>
        </Reveal>
        <Reveal retard={120}>
          <h1 className="h1">Vous pensez ne pas être photogénique ?</h1>
        </Reveal>
        <Reveal retard={240}>
          <p className="lede">
            Parfait. C’est exactement avec vous que j’aime travailler — et c’est précisément là que mon travail
            commence.
          </p>
        </Reveal>
        <Reveal retard={340}>
          <div className="actions">
            <Link className="bouton" href="/contact/?projet=portrait">
              Me parler de vous
            </Link>
            <a className="bouton bouton-fantome" href="#seance">
              Ce que comprend la séance
            </a>
          </div>
        </Reveal>
      </Hero>

      {/* ————————————————————————— 01 — La méthode ————————————————————————— */}
      <section className="wrap section">
        <EnteteSection
          numero="01"
          surtitre="La méthode"
          titre="Mon boulot : vous faire oublier l’appareil photo."
          chapo={
            <p>
              La plupart des personnes que je photographie ne sont pas habituées à être devant un objectif. Et c’est
              très bien comme ça — je préfère largement ça à quelqu’un qui a appris à poser.
            </p>
          }
        />

        <div className="trio">
          {METHODE.map((m, i) => (
            <div key={m.num}>
              <Figure
                name={m.image}
                alt={m.alt}
                sizes="(min-width: 760px) 30vw, 100vw"
                retard={i * 110}
              />
              <Reveal retard={i * 110 + 80} style={{ marginTop: 'clamp(18px, 2vw, 26px)' }}>
                <p className={s.jalonNum}>{m.num}</p>
                <h3 className="h4" style={{ marginTop: '0.7rem' }}>
                  {m.titre}
                </h3>
                <p className="corps" style={{ marginTop: '0.7rem' }}>
                  {m.texte}
                </p>
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      <Bande
        wide="portrait-silence"
        tall="portrait-hero-tall"
        alt="Une silhouette de profil, entièrement détachée sur le noir"
      />

      {/* ————————————————————————— 02 — La séance —————————————————————————— */}
      <section className="wrap section" id="seance">
        <EnteteSection
          numero="02"
          surtitre="La collection Portrait"
          titre="Une seule collection. 129 €."
          chapo={
            <p>
              Parce que vous n’avez pas à choisir votre expérience dans un tableau de tarifs. Seul, en couple ou à
              plusieurs, le principe reste le même : prendre le temps de créer des portraits qui vous ressemblent, puis
              choisir uniquement ce que vous avez vraiment envie de garder.
            </p>
          }
        />

        <ul className={s.inclus}>
          {PORTRAIT_INCLUS.map((item, i) => (
            <Reveal as="li" className={s.inclusItem} key={item.titre} retard={Math.min(i, 4) * 70}>
              <h3 className="h4">{item.titre}</h3>
              <p>{item.texte}</p>
            </Reveal>
          ))}
        </ul>

        <div className="duo duo-inverse" style={{ marginTop: 'clamp(72px, 9vw, 128px)' }}>
          <Reveal>
            <h3 className="h3">Et après la séance ? C’est vous qui choisissez.</h3>
            <p className="corps" style={{ marginTop: 'clamp(20px, 2.4vw, 30px)' }}>
              Lors du rendez-vous de découverte, vous voyez vos portraits finalisés et vous gardez ceux que vous avez
              envie de garder. Tirage d’art, tableau, Folio, album : je vous présente les supports qui correspondent le
              mieux à vos images et à ce que vous voulez en faire.
            </p>
            <p className="corps">
              <strong>Aucune obligation d’achat supplémentaire.</strong> Vous choisissez librement, selon vos envies et
              votre budget.
            </p>
            <ul className="liste-pointee" style={{ marginTop: 'clamp(24px, 3vw, 34px)' }}>
              {PORTRAIT_SUPPORTS.map((sup) => (
                <li key={sup}>{sup}</li>
              ))}
            </ul>
            <p className="corps" style={{ marginTop: 'clamp(24px, 3vw, 34px)' }}>
              Dès 500 € de panier total, votre galerie complète en haute définition vous est offerte. Et pour chaque
              photographie achetée sur un support, vous recevez aussi son fichier web.
            </p>
          </Reveal>

          <Reveal mode="voile">
            <Photo
              name="portrait-tirage"
              alt="Des tirages encadrés posés sur une étagère, dans la lumière du jour"
              sizes="(min-width: 900px) 45vw, 100vw"
            />
          </Reveal>
        </div>

        <Reveal style={{ marginTop: 'clamp(72px, 9vw, 128px)' }}>
          <div className={s.garantie}>
            <h3 className="h3">Et si je ne me plais sur aucune photo ?</h3>
            <p className="corps">
              C’est probablement la question que vous n’osiez pas poser. Si aucune image ne vous plaît lors du premier
              visionnage, je vous propose une nouvelle séance, une fois, sans frais.
            </p>
            <p className="corps">
              Parce que si vous venez en pensant ne pas être photogénique, mon travail n’est pas d’appuyer sur un
              bouton. C’est de trouver avec vous les images dans lesquelles vous allez enfin vous reconnaître.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ————————————————————————— 03 — La galerie ————————————————————————— */}
      <section className="wrap section">
        <EnteteSection
          numero="03"
          surtitre="La galerie"
          titre="Ils pensaient ne pas être photogéniques, eux aussi."
          chapo={<p>Cliquez sur une image pour l’agrandir.</p>}
        />
        <Gallery items={GALERIE} action="Voir" />
      </section>

      <AppelAction
        titre="On se voit au studio ?"
        texte={
          <p>
            Dites-moi qui vous êtes et ce que vous attendez de ces portraits. On prépare la séance ensemble, je vous
            guide du début à la fin, et vous découvrez vos images au studio du Puy-en-Velay.
          </p>
        }
        actions={[
          { href: '/contact/?projet=portrait', label: 'Me parler de vous' },
          { href: LIENS.reservation, label: 'Réserver ma séance — 129 €', externe: true, fantome: true },
        ]}
      />
    </>
  );
}
