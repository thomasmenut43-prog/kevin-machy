import { headers } from 'next/headers';
import {
  empreinteVisiteur,
  enregistrerEvenement,
  enregistrerVisite,
  estMobile,
  sourceDepuis,
} from '@/lib/audience';

/*
 * Les robots qui exécutent du JavaScript.
 *
 * Les autres ne déclenchent pas cette route : elle n'est appelée que depuis le
 * navigateur. Restent les navigateurs pilotés — Playwright, Puppeteer — et les
 * quelques moissonneurs qui rendent les pages. Ils se déclarent, et c'est la
 * seule chose qu'on ait sur eux.
 */
const ROBOT =
  /bot|crawler|spider|crawling|headless|playwright|puppeteer|phantom|slurp|curl|wget|lighthouse|pagespeed|preview|monitor|uptime|scrapy/i;

/**
 * Point de collecte de la mesure d'audience.
 *
 * Public par nécessité : c'est le navigateur du visiteur qui appelle. Il
 * n'accepte donc que le strict nécessaire, et ne renvoie jamais rien
 * d'exploitable — pas même un accusé de réception détaillé.
 *
 * L'adresse IP sert uniquement à calculer l'empreinte du jour, en mémoire, et
 * n'est jamais écrite.
 */
export async function POST(requete: Request) {
  try {
    // Rien n'est cru sur parole : ce qui arrive ici vient du navigateur d'un
    // visiteur, et chaque champ est reconverti avant usage.
    const corps = (await requete.json()) as Record<string, unknown> | null;
    const chemin = String(corps?.chemin ?? '');

    // Un chemin absolu du site, rien d'autre. Pas d'adresse complète, pas de
    // chaîne de recherche : elles pourraient charrier des données personnelles.
    if (!/^\/[a-z0-9\-/._]*$/i.test(chemin) || chemin.length > 300) {
      return new Response(null, { status: 204 });
    }

    const entetes = await headers();
    const navigateur = entetes.get('user-agent') ?? '';

    /*
     * Ni les robots, ni les gens qui tiennent le site.
     *
     * Kevin se comptait lui-même : rien ne distinguait sa visite de celle d'un
     * client. Son tableau de bord additionnait donc son propre travail à son
     * audience, et plus il relisait ses pages, plus ses chiffres montaient.
     *
     * On ne peut pas démêler ça après coup — l'empreinte d'un visiteur est un
     * condensat de l'adresse et du navigateur, changé chaque jour, qui ne se
     * remonte pas. La seule réponse est de ne plus les compter.
     *
     * Le cookie de session suffit à reconnaître quelqu'un du BackOffice, et
     * suffit sans interroger la base : on ne vérifie pas que la session est
     * valide, seulement qu'elle est revendiquée. Un visiteur ordinaire n'a
     * aucune raison de porter ce cookie, et un faussaire qui s'en poserait un
     * se retirerait des statistiques — ce qui n'intéresse personne.
     */
    if (entetes.get('cookie')?.includes('km_session=')) {
      return new Response(null, { status: 204 });
    }
    if (ROBOT.test(navigateur)) {
      return new Response(null, { status: 204 });
    }

    const adresse = (entetes.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'inconnue';
    const visiteur = empreinteVisiteur(adresse, navigateur);

    if (corps?.evenement) {
      await enregistrerEvenement({ nom: String(corps.evenement), chemin, visiteur });
    } else {
      await enregistrerVisite({
        chemin,
        visiteur,
        source: sourceDepuis(corps?.referent ? String(corps.referent) : null, entetes.get('host')),
        mobile: estMobile(navigateur),
      });
    }
  } catch {
    // La mesure ne doit jamais rien casser ni rien révéler : on se tait.
  }

  return new Response(null, { status: 204 });
}
