import type { Metadata } from 'next';
import { ContactForm } from '@/components/ContactForm';
import { Photo } from '@/components/Photo';
import { Reveal } from '@/components/Reveal';
import { DonneesStructurees, schemaFilAriane } from '@/lib/schema';
import { LIENS, SITE, ZONE } from '@/lib/site';
import s from '@/styles/pages.module.css';

export const metadata: Metadata = {
  title: 'Contact — Photographe au Puy-en-Velay',
  description:
    'Parlez-moi de votre projet photo : mariage, portrait, iris ou entreprise. Studio au Puy-en-Velay, sur rendez-vous. 07 81 74 32 84.',
  alternates: { canonical: '/contact/' },
  openGraph: {
    title: 'Contacter Kevin Machy, photographe en Haute-Loire',
    description: 'Quelques lignes suffisent. Dites-moi ce que vous préparez, où et quand si vous le savez déjà.',
    url: '/contact/',
    images: [{ url: '/img/og-contact.jpg', width: 1200, height: 630, alt: 'Le studio, fond de prise de vue' }],
  },
};

export default function Contact() {
  return (
    <>
      <DonneesStructurees
        data={schemaFilAriane([
          { nom: 'Accueil', chemin: '/' },
          { nom: 'Contact', chemin: '/contact/' },
        ])}
      />

      <section className={`wrap ${s.ouverture}`}>
        <Reveal className={s.ouvertureTitre}>
          <p className="surtitre">
            <span className="surtitre__num">00</span>
            <span>Contact</span>
          </p>
          <h1 className="h1">Parlez-moi de votre projet.</h1>
          <p className={`lede ${s.ouvertureChapo}`}>
            Quelques lignes suffisent. Dites-moi ce que vous préparez, où, et quand si vous le savez déjà. Je vous
            réponds pour qu’on puisse en discuter.
          </p>
        </Reveal>
      </section>

      <section className="wrap section-serree">
        <div className={s.contact}>
          <Reveal>
            <ContactForm />
          </Reveal>

          <Reveal className={s.coordonnees} retard={120}>
            <div className={s.coordonneesBloc}>
              <p className="surtitre">
                <span>Vous préférez appeler</span>
              </p>
              <a className={s.grand} href={SITE.telephoneUri}>
                {SITE.telephone}
              </a>
            </div>

            <div className={s.coordonneesBloc}>
              <p className="surtitre">
                <span>Ou écrire</span>
              </p>
              <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
            </div>

            <div className={s.coordonneesBloc}>
              <p className="surtitre">
                <span>Le studio</span>
              </p>
              <p>
                {SITE.adresse}
                <br />
                {SITE.codePostal} {SITE.ville}
              </p>
              <p className="legende">Sur rendez-vous uniquement.</p>
            </div>

            <div className={s.coordonneesBloc}>
              <p className="surtitre">
                <span>Zone d’intervention</span>
              </p>
              <p className="legende">{ZONE}</p>
            </div>

            <div className={s.coordonneesBloc}>
              <p className="surtitre">
                <span>Déjà client</span>
              </p>
              <a href={LIENS.accesClients} target="_blank" rel="noopener noreferrer">
                Accéder à ma galerie ↗
              </a>
              <a href={LIENS.reservation} target="_blank" rel="noopener noreferrer">
                Prendre rendez-vous en ligne ↗
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="wrap section-serree">
        <Reveal mode="voile" className="bande bande-haute">
          <Photo
            name="contact-studio"
            alt="Le fond de prise de vue du studio, éclairé de côté dans une pièce sombre"
            sizes="100vw"
          />
        </Reveal>
        <Reveal style={{ marginTop: 'clamp(20px, 2.4vw, 30px)' }}>
          <p className="legende" style={{ maxWidth: '62ch' }}>
            Le studio du Puy-en-Velay accueille les séances portrait, les portraits professionnels, le Studio de l’Iris
            et les photos d’identité agréées ANTS. Toujours sur rendez-vous.
          </p>
        </Reveal>
      </section>
    </>
  );
}
