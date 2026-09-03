import Link from 'next/link';

export default function Introuvable() {
  return (
    <section className="wrap" style={{ paddingBlock: 'clamp(200px, 30vh, 320px) clamp(120px, 18vh, 220px)' }}>
      <p className="surtitre">
        <span className="surtitre__num">404</span>
        <span>Page introuvable</span>
      </p>
      <h1 className="h1" style={{ marginTop: 'clamp(20px, 2.4vw, 32px)', maxWidth: '16ch' }}>
        Cette page n’existe pas.
      </h1>
      <p className="lede" style={{ marginTop: 'clamp(20px, 2.4vw, 30px)' }}>
        Elle a peut-être changé d’adresse. Le reste du site, lui, est toujours là.
      </p>
      <div className="actions" style={{ marginTop: 'clamp(32px, 4vw, 48px)' }}>
        <Link className="bouton" href="/">
          Retour à l’accueil
        </Link>
        <Link className="bouton bouton-fantome" href="/contact/">
          Me contacter
        </Link>
      </div>
    </section>
  );
}
