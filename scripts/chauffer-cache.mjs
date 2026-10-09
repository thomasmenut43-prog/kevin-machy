/**
 * Visiter chaque page du site juste après sa mise en ligne.
 *
 * Pourquoi ce script existe, et pourquoi il vit dans le déploiement plutôt que
 * dans une tâche régulière.
 *
 * Les pages du site sont gardées en cache dans Workers KV, sous une clé qui
 * porte l'identifiant de la compilation :
 *
 *     incremental-cache/<identifiant>/<empreinte>.cache
 *
 * **Chaque déploiement change cet identifiant.** Tout ce qui avait été gardé
 * devient donc inatteignable d'un coup, et la première personne qui demande
 * une page la fait reconstruire entièrement.
 *
 * Reconstruire coûte cher. Mesuré le 8 octobre 2026 sur vingt-quatre heures :
 * temps processeur médian de 109 ms, pour une limite de 10 ms sur le forfait
 * gratuit. Résultat, 819 requêtes sur 6 670 tuées en route — 26,5 %, et
 * toutes pour la même raison, « limites de temps processeur dépassées ».
 *
 * Ce script ne supprime pas cette dépense : il décide **qui la paie**. Après
 * chaque mise en ligne, c'est ce workflow qui essuie les reconstructions, et
 * les visiteurs trouvent des pages déjà faites.
 *
 * ———
 *
 * **Ce qu'il ne fait pas, et il faut le savoir avant de lui faire confiance.**
 *
 * Une reconstruction interrompue à la limite n'écrit rien : la page reste
 * froide, et le passage suivant recommencera. D'où plusieurs passes — mais
 * aucune garantie que tout soit chaud à la fin. Le compte-rendu dit ce qui
 * reste froid plutôt que de laisser croire que c'est réglé.
 *
 * Il ne corrige pas non plus la cause. Tant que rendre une page demande dix
 * fois le budget accordé, le site reste à la merci d'un cache vidé. Les deux
 * vraies réponses sont ailleurs : servir la vitrine en fichiers figés, ou
 * payer le forfait. Voir `docs/cloudflare.md`.
 *
 * ———
 *
 * Il ne fausse pas les statistiques de Kevin : la mesure d'audience est
 * déclenchée par le navigateur, et ce script n'exécute aucun JavaScript.
 *
 * Il ne fait jamais échouer la mise en ligne. Un cache froid est un inconfort,
 * pas une panne — le site répond quand même, simplement plus lentement.
 */

const SITE = process.env.NEXT_PUBLIC_URL_SITE ?? 'https://dronezvous.com';

/** Deux passes : la première reconstruit, la seconde vérifie. */
const PASSES = Number(process.env.PASSES ?? 2);

/**
 * Une page à la fois, et une respiration entre chaque.
 *
 * Les lancer de front ferait reconstruire la même page plusieurs fois — chaque
 * requête arrivant avant que la précédente ait écrit son résultat. On paierait
 * le rendu plusieurs fois pour le garder une seule.
 */
const REPOS = Number(process.env.REPOS ?? 300);

const attendre = (ms) => new Promise((f) => setTimeout(f, ms));

/** Les adresses que le site déclare lui-même. Rien n'est écrit en dur ici. */
async function pagesDuSite() {
  const reponse = await fetch(`${SITE}/sitemap.xml`, {
    headers: { 'user-agent': 'chauffe-cache (deploiement kevin-machy)' },
  });
  if (!reponse.ok) {
    throw new Error(`Le plan du site a répondu ${reponse.status}.`);
  }

  const xml = await reponse.text();
  const adresses = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);

  if (!adresses.length) throw new Error('Le plan du site ne liste aucune adresse.');
  return [...new Set(adresses)];
}

async function visiter(adresse) {
  const depart = Date.now();
  try {
    const reponse = await fetch(adresse, {
      headers: { 'user-agent': 'chauffe-cache (deploiement kevin-machy)' },
      redirect: 'follow',
    });
    // Le corps doit être lu jusqu'au bout : sans cela la requête peut être
    // close avant que le Worker ait fini d'écrire sa page en cache.
    await reponse.arrayBuffer();
    return { ok: reponse.ok, code: reponse.status, ms: Date.now() - depart };
  } catch (erreur) {
    return { ok: false, code: String(erreur?.message ?? erreur).slice(0, 60), ms: Date.now() - depart };
  }
}

const pad = (n) => String(n).padStart(4);

async function principal() {
  const pages = await pagesDuSite();
  console.log(`${pages.length} pages déclarées par ${SITE}/sitemap.xml\n`);

  let dernieresFroides = [];

  for (let passe = 1; passe <= PASSES; passe++) {
    const froides = [];
    let chaudes = 0;
    let cumul = 0;

    for (const adresse of pages) {
      const r = await visiter(adresse);
      cumul += r.ms;
      if (r.ok) chaudes++;
      else froides.push(`${adresse} → ${r.code}`);
      await attendre(REPOS);
    }

    const moyenne = Math.round(cumul / pages.length);
    console.log(
      `passe ${passe} — ${pad(chaudes)} servies, ${pad(froides.length)} en échec, ${pad(moyenne)} ms en moyenne`,
    );
    dernieresFroides = froides;
  }

  console.log('');
  if (!dernieresFroides.length) {
    console.log('Toutes les pages répondent. Le cache est chaud.');
    return;
  }

  // Un échec ici ne doit pas arrêter la mise en ligne, mais il ne doit pas non
  // plus passer inaperçu : c'est exactement ce que rencontrera un visiteur.
  console.log(`Encore froides après ${PASSES} passes — un visiteur les paiera :`);
  for (const ligne of dernieresFroides) console.log(`  ${ligne}`);
}

principal().catch((erreur) => {
  // Le chauffage est un confort. Qu'il échoue ne rend pas la mise en ligne
  // fautive, et l'arrêter ici priverait le site d'un déploiement réussi.
  console.log(`Chauffage impossible : ${erreur.message}`);
});
