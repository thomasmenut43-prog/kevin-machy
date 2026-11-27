'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { Adresse, Dossier, Lu, Resume } from '@/lib/boite-mail';
import {
  actionEcrire,
  actionLire,
  actionLister,
  actionMarquerLu,
  actionSupprimer,
} from './actions';
import b from '../messages/messages.module.css';
import e from './emails.module.css';

/**
 * La boîte mail de Kevin, dans la même mise en page que les Messages.
 *
 * Liste à gauche, lecture à droite, et sur téléphone l'une puis l'autre —
 * c'est déjà ce que Kevin connaît de l'onglet Messages, et la feuille de
 * styles est la même : deux boîtes qui se ressemblent ne demandent pas deux
 * apprentissages.
 */

type Redaction = {
  titre: string;
  a: string;
  cc: string;
  objet: string;
  texte: string;
  /** Le texte proposé à l'ouverture : ce qui s'en écarte est le travail de Kevin. */
  depart: string;
  reponse?: { chemin: string; uid: number };
};

export function BoiteMail(props: {
  dossiers: Dossier[];
  chemin: string;
  emails: Resume[];
  total: number;
  /** L'adresse de la boîte : on ne se met pas soi-même en copie d'une réponse à tous. */
  moi: string;
}) {
  const [dossiers, setDossiers] = useState(props.dossiers);
  const [chemin, setChemin] = useState(props.chemin);
  const [emails, setEmails] = useState(props.emails);
  const [total, setTotal] = useState(props.total);
  const [numero, setNumero] = useState(0);
  const [choisi, setChoisi] = useState<number | null>(null);
  const [lu, setLu] = useState<Lu | null>(null);
  const [vue, setVue] = useState<'liste' | 'message'>('liste');
  const [redaction, setRedaction] = useState<Redaction | null>(null);
  const [images, setImages] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const [ouverture, ouvrirEnFond] = useTransition();

  /*
   * La dernière lecture demandée.
   *
   * Cliquer sur un message puis sur un autre lance deux lectures, et la
   * première peut revenir après la seconde. Sans ce jeton, le panneau
   * afficherait le message qu'on a quitté sous l'objet de celui qu'on a choisi.
   */
  const demande = useRef(0);

  const dossier = dossiers.find((d) => d.chemin === chemin);
  const role = dossier?.role ?? 'autre';
  const deSoi = role === 'envoyes' || role === 'brouillons';

  /** Quitter un message en cours d'écriture ne doit pas le perdre sans prévenir. */
  const abandonnerRedaction = () => {
    if (!redaction) return true;
    const modifie = redaction.texte !== redaction.depart && redaction.texte.trim() !== '';
    if (modifie && !window.confirm('Abandonner ce message ? Ce que vous avez écrit sera perdu.')) {
      return false;
    }
    setRedaction(null);
    return true;
  };

  const recharger = async (vers: string, page: number) => {
    const r = await actionLister(vers, page);
    if (!r.ok) {
      setErreur(r.message);
      return false;
    }
    setDossiers(r.dossiers);
    setTotal(r.total);
    setNumero(page);
    setEmails((avant) =>
      page === 0
        ? r.emails
        : [...avant, ...r.emails.filter((x) => !avant.some((p) => p.uid === x.uid))],
    );
    return true;
  };

  const changerDossier = (vers: string) => {
    if (vers !== chemin && !abandonnerRedaction()) return;
    demarrer(async () => {
      setErreur(null);
      setInfo(null);
      if (await recharger(vers, 0)) {
        setChemin(vers);
        setChoisi(null);
        setLu(null);
        setVue('liste');
      }
    });
  };

  const ouvrir = (m: Resume) => {
    if (!abandonnerRedaction()) return;
    setChoisi(m.uid);
    setVue('message');
    setLu(null);
    setImages(false);
    setErreur(null);
    setInfo(null);
    const jeton = ++demande.current;
    ouvrirEnFond(async () => {
      const r = await actionLire(chemin, m.uid);
      if (jeton !== demande.current) return;
      if (!r.ok) {
        setErreur(r.message);
        return;
      }
      setLu(r.email);
      if (!m.lu) {
        setEmails((l) => l.map((x) => (x.uid === m.uid ? { ...x, lu: true } : x)));
        setDossiers((ds) =>
          ds.map((d) => (d.chemin === chemin ? { ...d, nonLus: Math.max(0, d.nonLus - 1) } : d)),
        );
      }
    });
  };

  const fermer = () => {
    setChoisi(null);
    setLu(null);
    setVue('liste');
  };

  const marquerNonLu = (m: Lu) =>
    demarrer(async () => {
      const r = await actionMarquerLu(chemin, m.uid, false);
      if (!r.ok) {
        setErreur(r.message);
        return;
      }
      setEmails((l) => l.map((x) => (x.uid === m.uid ? { ...x, lu: false } : x)));
      setDossiers((ds) =>
        ds.map((d) => (d.chemin === chemin ? { ...d, nonLus: d.nonLus + 1 } : d)),
      );
      // Resté ouvert, il aurait l'air lu : on revient à la liste, où il est en gras.
      fermer();
    });

  const supprimerLu = (m: Lu) => {
    const definitif = role === 'corbeille';
    if (
      definitif &&
      !window.confirm('Supprimer définitivement ce message ? Il ne pourra pas être récupéré.')
    ) {
      return;
    }
    demarrer(async () => {
      let r = await actionSupprimer(chemin, m.uid, definitif);
      if (r.ok && r.issue === 'confirmer') {
        if (
          !window.confirm(
            'Votre boîte n’a pas de corbeille : ce message sera supprimé définitivement. Continuer ?',
          )
        ) {
          return;
        }
        r = await actionSupprimer(chemin, m.uid, true);
      }
      if (!r.ok) {
        setErreur(r.message);
        return;
      }
      setEmails((l) => l.filter((x) => x.uid !== m.uid));
      setTotal((t) => Math.max(0, t - 1));
      fermer();
      setInfo(r.issue === 'corbeille' ? 'Message mis à la corbeille.' : 'Message supprimé.');
    });
  };

  const nouveau = () => {
    if (!abandonnerRedaction()) return;
    setRedaction({ titre: 'Nouveau message', a: '', cc: '', objet: '', texte: '', depart: '' });
    setVue('message');
    setErreur(null);
    setInfo(null);
  };

  const repondre = (m: Lu, tous: boolean) => {
    // Depuis les Envoyés, « répondre » relance le destinataire, pas soi-même.
    const vers = deSoi ? (m.a[0] ?? null) : (m.repondreA ?? m.de);
    const exclus = new Set([props.moi.toLowerCase(), vers?.adresse.toLowerCase() ?? ''].filter(Boolean));
    const copies = tous
      ? [...m.a, ...m.cc].filter((x, i, liste) => {
          const cle = x.adresse.toLowerCase();
          return !exclus.has(cle) && liste.findIndex((y) => y.adresse.toLowerCase() === cle) === i;
        })
      : [];
    const depart = `\n\n\n${citation(m)}`;
    setRedaction({
      titre: tous ? 'Répondre à tous' : 'Répondre',
      a: vers ? formater(vers) : '',
      cc: copies.map(formater).join(', '),
      objet: /^(re|aw|sv)\s*:/i.test(m.objet) ? m.objet : `Re: ${m.objet}`.trim(),
      texte: depart,
      depart,
      reponse: { chemin, uid: m.uid },
    });
    setErreur(null);
    setInfo(null);
  };

  const envoyer = () => {
    if (!redaction) return;
    const { a, cc, objet, texte, reponse } = redaction;
    demarrer(async () => {
      setErreur(null);
      let r;
      try {
        r = await actionEcrire({ a, cc, objet, texte }, reponse);
      } catch {
        setErreur('Le message n’est pas parti. Réessayez dans un instant.');
        return;
      }
      if (!r.ok) {
        setErreur(r.message);
        return;
      }
      setRedaction(null);
      setInfo(
        r.range
          ? 'Message envoyé. Une copie est dans vos Envoyés.'
          : 'Message envoyé, mais sa copie n’a pas pu être rangée dans vos Envoyés.',
      );
      if (reponse && reponse.chemin === chemin) {
        setEmails((l) => l.map((x) => (x.uid === reponse.uid ? { ...x, repondu: true } : x)));
      }
      if (role === 'envoyes') await recharger(chemin, 0);
      if (!lu) setVue('liste');
    });
  };

  const destinataires = lu ? lu.a.length + lu.cc.length : 0;

  return (
    <>
      {erreur ? (
        <p className={b.alerte} role="alert">
          {erreur}
        </p>
      ) : null}
      {info ? (
        <p className={b.reussite} role="status">
          {info}
        </p>
      ) : null}

      <div className={b.boite} data-vue={vue}>
        <div className={b.colonne}>
          <div className={b.barre}>
            <div className={e.outils}>
              <button type="button" className="bo-bouton" onClick={nouveau}>
                Nouveau message
              </button>
              <button
                type="button"
                className="bo-bouton bo-bouton-discret"
                disabled={enCours}
                onClick={() =>
                  demarrer(async () => {
                    setErreur(null);
                    await recharger(chemin, 0);
                  })
                }
              >
                {enCours ? 'Relève…' : 'Actualiser'}
              </button>
            </div>
            <div className={`${b.filtres} ${e.dossiers}`} role="group" aria-label="Dossiers">
              {dossiers.map((d) => (
                <button
                  key={d.chemin}
                  type="button"
                  className={b.filtre}
                  data-actif={d.chemin === chemin ? '' : undefined}
                  onClick={() => changerDossier(d.chemin)}
                >
                  {d.nom}
                  {/* Des envoyés « non lus » ne veulent rien dire pour Kevin. */}
                  {d.nonLus > 0 && d.role !== 'envoyes' && d.role !== 'corbeille' ? (
                    <span className={b.compte}>{d.nonLus}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <ul className={b.liste} aria-busy={enCours}>
            {emails.map((m) => (
              <li key={m.uid}>
                <button
                  type="button"
                  className={b.entree}
                  data-choisi={m.uid === choisi ? '' : undefined}
                  data-nonlu={!m.lu ? '' : undefined}
                  aria-current={m.uid === choisi ? 'true' : undefined}
                  onClick={() => ouvrir(m)}
                >
                  <span className={b.pastille} aria-hidden="true" />
                  <span className={b.entreeTexte}>
                    <span className={b.entreeTete}>
                      <strong className={b.expediteur}>
                        {deSoi ? `À : ${m.a.map(nomDe).join(', ') || '—'}` : nomDe(m.de)}
                      </strong>
                      {m.date ? (
                        <time className={b.quand} dateTime={m.date}>
                          {dateCourte(m.date)}
                        </time>
                      ) : null}
                    </span>
                    <span className={b.apercu}>{m.objet || '(sans objet)'}</span>
                    {m.piecesJointes || m.repondu ? (
                      <span className={b.entreePied}>
                        {m.piecesJointes ? <span className={b.etiquette}>pièce jointe</span> : null}
                        {m.repondu ? <span className={b.etiquette}>répondu</span> : null}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
            {!emails.length ? <li className={b.listeVide}>Aucun message dans ce dossier.</li> : null}
            {emails.length < total ? (
              <li>
                <button
                  type="button"
                  className={e.plus}
                  disabled={enCours}
                  onClick={() =>
                    demarrer(async () => {
                      await recharger(chemin, numero + 1);
                    })
                  }
                >
                  {enCours ? 'Chargement…' : 'Messages plus anciens'}
                </button>
              </li>
            ) : null}
          </ul>
        </div>

        <div className={b.lecture}>
          {redaction ? (
            <Redacteur
              key={redaction.reponse ? `r-${redaction.reponse.uid}` : 'nouveau'}
              redaction={redaction}
              enCours={enCours}
              onChange={setRedaction}
              onEnvoyer={envoyer}
              onAnnuler={() => {
                if (abandonnerRedaction() && !lu) setVue('liste');
              }}
            />
          ) : lu ? (
            <article className={b.lu} key={lu.uid}>
              <button type="button" className={b.retour} onClick={fermer}>
                ← {dossier?.nom ?? 'Messages'}
              </button>

              <header className={b.enTete}>
                <h2 className={b.sujet}>{lu.objet || '(sans objet)'}</h2>
                <div className={b.de}>
                  <span className={b.avatar} aria-hidden="true">
                    {initiales(lu.de)}
                  </span>
                  <span>
                    <strong>{lu.de?.nom || lu.de?.adresse || 'Expéditeur inconnu'}</strong>
                    {lu.de?.nom ? <span className={b.adresse}>{lu.de.adresse}</span> : null}
                  </span>
                  {lu.date ? (
                    <time className={b.quandLong} dateTime={lu.date}>
                      {dateLongue(lu.date)}
                    </time>
                  ) : null}
                </div>
              </header>

              <dl className={b.infos}>
                <div>
                  <dt>À</dt>
                  <dd>{lu.a.map(formater).join(', ') || '—'}</dd>
                </div>
                {lu.cc.length ? (
                  <div>
                    <dt>Copie</dt>
                    <dd>{lu.cc.map(formater).join(', ')}</dd>
                  </div>
                ) : null}
              </dl>

              <div className={b.actions}>
                <button type="button" className="bo-bouton" onClick={() => repondre(lu, false)}>
                  Répondre
                </button>
                {destinataires > 1 ? (
                  <button
                    type="button"
                    className="bo-bouton bo-bouton-discret"
                    onClick={() => repondre(lu, true)}
                  >
                    Répondre à tous
                  </button>
                ) : null}
                <button
                  type="button"
                  className="bo-bouton bo-bouton-discret"
                  disabled={enCours}
                  onClick={() => marquerNonLu(lu)}
                >
                  Marquer non lu
                </button>
                <button
                  type="button"
                  className={b.danger}
                  disabled={enCours}
                  onClick={() => supprimerLu(lu)}
                >
                  {role === 'corbeille' ? 'Supprimer définitivement' : 'Supprimer'}
                </button>
              </div>

              {lu.pieces.length ? (
                <ul className={e.pieces} aria-label="Pièces jointes">
                  {lu.pieces.map((p) => (
                    <li key={p.numero}>
                      <a
                        href={`/admin/emails/piece/?dossier=${encodeURIComponent(chemin)}&uid=${lu.uid}&n=${p.numero}`}
                        download={p.nom}
                      >
                        {p.nom} <span className={e.taille}>{taille(p.octets)}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}

              {lu.html ? (
                <>
                  {!images && imagesDistantes(lu.html) ? (
                    <p className={e.images}>
                      Les images venues d’Internet sont masquées : elles peuvent prévenir
                      l’expéditeur que vous avez ouvert son message.
                      <button type="button" className={e.lien} onClick={() => setImages(true)}>
                        Afficher les images
                      </button>
                    </p>
                  ) : null}
                  <CorpsHtml html={lu.html} images={images} />
                </>
              ) : (
                <p className={b.texte}>{lu.texte}</p>
              )}
            </article>
          ) : choisi !== null && ouverture ? (
            <p className={b.rienChoisi}>Ouverture du message…</p>
          ) : (
            <p className={b.rienChoisi}>Choisissez un message pour le lire.</p>
          )}
        </div>
      </div>
    </>
  );
}

/** Écrire : un nouveau message, ou une réponse avec le message d'origine cité. */
function Redacteur({
  redaction,
  enCours,
  onChange,
  onEnvoyer,
  onAnnuler,
}: {
  redaction: Redaction;
  enCours: boolean;
  onChange: (r: Redaction) => void;
  onEnvoyer: () => void;
  onAnnuler: () => void;
}) {
  const champA = useRef<HTMLInputElement>(null);
  const zone = useRef<HTMLTextAreaElement>(null);
  const champ = (cle: 'a' | 'cc' | 'objet' | 'texte') => ({
    value: redaction[cle],
    onChange: (ev: { target: { value: string } }) => onChange({ ...redaction, [cle]: ev.target.value }),
  });

  // Une réponse s'écrit au-dessus de la citation, curseur en tête ; un nouveau
  // message commence par son destinataire.
  useEffect(() => {
    if (redaction.reponse && zone.current) {
      zone.current.focus();
      zone.current.setSelectionRange(0, 0);
      zone.current.scrollTop = 0;
    } else {
      champA.current?.focus();
    }
    // Seulement à l'ouverture : chaque frappe change `redaction`.
  }, []);

  return (
    <form
      className={`${b.lu} ${e.redaction}`}
      aria-label={redaction.titre}
      onSubmit={(ev) => {
        ev.preventDefault();
        onEnvoyer();
      }}
    >
      <button type="button" className={b.retour} onClick={onAnnuler}>
        ← Annuler
      </button>
      <h2 className={b.sujet}>{redaction.titre}</h2>

      <div className="bo-champ">
        <label htmlFor="redaction-a">À</label>
        <input
          id="redaction-a"
          ref={champA}
          type="text"
          autoComplete="off"
          placeholder="adresse@exemple.fr"
          required
          {...champ('a')}
        />
        <p className="bo-aide">Plusieurs adresses ? Séparez-les par une virgule.</p>
      </div>

      <div className="bo-champ">
        <label htmlFor="redaction-cc">Copie</label>
        <input id="redaction-cc" type="text" autoComplete="off" {...champ('cc')} />
      </div>

      <div className="bo-champ">
        <label htmlFor="redaction-objet">Objet</label>
        <input id="redaction-objet" type="text" maxLength={200} required {...champ('objet')} />
      </div>

      <div className="bo-champ">
        <label htmlFor="redaction-texte">Message</label>
        <textarea id="redaction-texte" ref={zone} rows={14} {...champ('texte')} />
      </div>

      <div className={b.reponseBoutons}>
        <button
          type="submit"
          className="bo-bouton"
          disabled={enCours || redaction.texte.trim() === redaction.depart.trim()}
        >
          {enCours ? 'Envoi…' : 'Envoyer'}
        </button>
        <button
          type="button"
          className="bo-bouton bo-bouton-discret"
          disabled={enCours}
          onClick={onAnnuler}
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

/**
 * Le HTML d'un message, dans un cadre isolé.
 *
 * Un e-mail en HTML est une page écrite par un inconnu. Il est affiché dans un
 * `iframe` sans droit d'exécuter le moindre script ni d'envoyer un formulaire
 * (`sandbox`), et sa propre politique de sécurité interdit d'aller chercher
 * quoi que ce soit sur Internet — sauf si Kevin demande les images. Les
 * liens s'ouvrent dans un nouvel onglet, jamais à la place du BackOffice.
 *
 * `allow-same-origin` sert seulement à mesurer la hauteur du contenu pour que
 * le cadre n'ait pas sa propre barre de défilement. Sans `allow-scripts`, il
 * ne donne rien au message lui-même.
 */
function CorpsHtml({ html, images }: { html: string; images: boolean }) {
  const cadre = useRef<HTMLIFrameElement>(null);
  const observateur = useRef<ResizeObserver | null>(null);

  const doc = useMemo(() => {
    const distant = images ? ' https: http:' : '';
    const politique = [
      "default-src 'none'",
      `style-src 'unsafe-inline'${distant}`,
      `font-src data:${distant}`,
      `img-src data: cid:${distant}`,
    ].join('; ');
    return (
      '<!doctype html><html><head><meta charset="utf-8">' +
      `<meta http-equiv="Content-Security-Policy" content="${politique}">` +
      '<base target="_blank">' +
      '<style>html,body{margin:0;padding:0;background:#fff;color:#1d1d1b;' +
      'font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;overflow-wrap:anywhere}' +
      'img{max-width:100%;height:auto}table{max-width:100%}</style>' +
      `</head><body>${html}</body></html>`
    );
  }, [html, images]);

  useEffect(() => () => observateur.current?.disconnect(), []);

  const ajuster = () => {
    const f = cadre.current;
    const racine = f?.contentDocument?.documentElement;
    if (f && racine) f.style.height = `${racine.scrollHeight + 2}px`;
  };

  return (
    <iframe
      ref={cadre}
      className={e.cadre}
      title="Contenu du message"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      srcDoc={doc}
      onLoad={() => {
        ajuster();
        const corps = cadre.current?.contentDocument?.body;
        observateur.current?.disconnect();
        if (corps && typeof ResizeObserver !== 'undefined') {
          observateur.current = new ResizeObserver(ajuster);
          observateur.current.observe(corps);
        }
      }}
    />
  );
}

/** Des images à aller chercher sur Internet, et pas seulement jointes au message. */
const imagesDistantes = (html: string) =>
  /<img[^>]+src\s*=\s*["']?\s*(https?:)?\/\//i.test(html) ||
  /url\(\s*["']?\s*(https?:)?\/\//i.test(html);

const nomDe = (a: Adresse | null) => (a ? a.nom || a.adresse : 'Expéditeur inconnu');

/** « Marie Dupont <marie@…> », avec des guillemets si le nom porte une virgule. */
const formater = (a: Adresse) =>
  a.nom
    ? `${/[,;<>"@]/.test(a.nom) ? `"${a.nom.replace(/"/g, '')}"` : a.nom} <${a.adresse}>`
    : a.adresse;

function initiales(a: Adresse | null) {
  const source = a?.nom || a?.adresse || '?';
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? '')
    .join('');
}

/** Le message d'origine, cité sous la réponse comme le fait tout logiciel de courrier. */
function citation(m: Lu) {
  const quand = m.date ? `Le ${dateLongue(m.date)}, ` : '';
  const qui = m.de ? formater(m.de) : 'l’expéditeur';
  const cite = m.texte
    .slice(0, 20_000)
    .split(/\r?\n/)
    .map((l) => `> ${l}`)
    .join('\n');
  return `${quand}${qui} a écrit :\n${cite}`;
}

function taille(octets: number) {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} ko`;
  return `${(octets / 1024 / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`;
}

/** Dans la liste : l'heure si c'est aujourd'hui, la date sinon. */
function dateCourte(iso: string) {
  const d = new Date(iso);
  const memeJour = d.toDateString() === new Date().toDateString();
  return d.toLocaleString(
    'fr-FR',
    memeJour ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short' },
  );
}

function dateLongue(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
