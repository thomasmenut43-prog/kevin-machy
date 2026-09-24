# Le nom de domaine

`dronezvous.com` est enregistré chez **IONOS**, expire le 12 juillet 2027, et
ses serveurs de noms sont en train de passer de Hostinger à Cloudflare.

Ce document sert deux fois : avant la bascule comme plan, après comme relevé de
ce qui a été fait. Il porte aussi la zone d'origine, pour pouvoir revenir en
arrière sans rien deviner.

## Pourquoi déplacer la zone

Le site tourne sur Cloudflare Workers. Tant que la zone reste chez Hostinger,
`dronezvous.com` ne peut pas désigner le Worker : Cloudflare ne raccorde un
Worker qu'à un domaine dont il gère lui-même le DNS.

## En deux temps, et c'est délibéré

**Déplacer la zone** et **mettre le nouveau site en ligne** sont deux gestes
différents. Les faire ensemble, c'est ne plus savoir lequel des deux a cassé
quelque chose.

| | |
|---|---|
| **Temps 1** | La zone passe chez Cloudflare, **sans que rien ne change de ce qui est servi**. WordPress répond toujours, le mail aussi. |
| **Temps 2** | Un enregistrement modifié, et `dronezvous.com` désigne le Worker. Instantané, réversible. |

Pendant le temps 1, **tous les enregistrements restent en « DNS only »** — le
nuage gris. Cloudflare n'est alors qu'un annuaire : il répond aux questions,
il ne touche à aucun trafic. Aucun réglage TLS à choisir, aucun intermédiaire
de plus entre les visiteurs et le serveur.

## La zone d'origine, chez Hostinger

Relevée dans l'éditeur de zone le 24 septembre 2026, avant toute modification.
**C'est le point de retour.** Treize enregistrements.

| Type | Nom | Priorité | Contenu | TTL |
|---|---|---|---|---|
| ALIAS | `@` | — | `dronezvous.com.cdn.hstgr.net` | 300 |
| CNAME | `www` | — | `www.dronezvous.com.cdn.hstgr.net` | 300 |
| ALIAS | `apercu` | — | `apercu.dronezvous.com.cdn.hstgr.net` | 300 |
| ALIAS | `medias` | — | `medias.dronezvous.com.cdn.hstgr.net` | 300 |
| A | `ftp` | — | `145.14.156.225` | 1800 |
| CNAME | `autodiscover` | — | `autodiscover.mail.hostinger.com` | 300 |
| CNAME | `autoconfig` | — | `autoconfig.mail.hostinger.com` | 300 |
| MX | `@` | 5 | `mx1.hostinger.fr` | 14400 |
| MX | `@` | 10 | `mx2.hostinger.fr` | 14400 |
| TXT | `@` | — | `v=spf1 include:_spf.mail.hostinger.com ~all` | 14400 |
| TXT | `@` | — | `google-site-verification=th6lWyELs1cnMlo_VOeqi4w1FX0ql7DWcrj98EAjJx8` | 14400 |
| TXT | `@` | — | `openai-domain-verification=dv-ocEOUk5xg8lbb6jkojV244AH` | 14400 |
| TXT | `_dmarc` | — | `v=DMARC1; p=none` | 300 |

### Ce que ce relevé apprend

**Aucun DKIM.** Le courrier de Kevin n'a que SPF et un DMARC en `p=none`. C'est
une faiblesse qui existait avant la bascule et que la bascule n'aggrave pas —
mais elle mérite d'être corrigée un jour, dans hPanel, du côté de l'e-mail.

**`@`, `www`, `apercu` et `medias` ne désignent pas le serveur** mais le CDN
d'Hostinger, par des noms en `.cdn.hstgr.net`. Ces noms appartiennent à
l'hébergeur : rien ne garantit qu'ils continueront de répondre pour un domaine
dont il ne tient plus la zone. On les remplace donc par l'adresse du serveur
lui-même, `145.14.156.225` — celle que l'enregistrement `ftp` donnait déjà.

Vérifié avant de s'y fier : le serveur répond en direct sur `dronezvous.com` et
`medias.dronezvous.com`, **et son certificat est valide pour ces deux noms**.

```bash
curl -s -o /dev/null -w "%{http_code} %{ssl_verify_result}\n" \
  -H "Host: medias.dronezvous.com" \
  --resolve medias.dronezvous.com:443:145.14.156.225 \
  https://medias.dronezvous.com/
```

Un `0` en seconde valeur veut dire que le certificat est accepté sans
complaisance. C'est ce qui permettra plus tard de mettre Cloudflare en mode
« Full (strict) » plutôt qu'en confiance aveugle.

## La zone à recréer chez Cloudflare

Douze enregistrements : les treize d'origine, moins `apercu`.

| Type | Nom | Contenu | Proxy |
|---|---|---|---|
| A | `@` | `145.14.156.225` | **gris** |
| A | `www` | `145.14.156.225` | **gris** |
| A | `medias` | `145.14.156.225` | **gris** au début — voir plus bas |
| A | `ftp` | `145.14.156.225` | **gris** |
| CNAME | `autodiscover` | `autodiscover.mail.hostinger.com` | gris |
| CNAME | `autoconfig` | `autoconfig.mail.hostinger.com` | gris |
| MX | `@` | `mx1.hostinger.fr` — priorité 5 | — |
| MX | `@` | `mx2.hostinger.fr` — priorité 10 | — |
| TXT | `@` | `v=spf1 include:_spf.mail.hostinger.com ~all` | — |
| TXT | `@` | `google-site-verification=th6lWyELs1cnMlo_VOeqi4w1FX0ql7DWcrj98EAjJx8` | — |
| TXT | `@` | `openai-domain-verification=dv-ocEOUk5xg8lbb6jkojV244AH` | — |
| TXT | `_dmarc` | `v=DMARC1; p=none` | — |

`apercu` est supprimé : c'était une prévisualisation, elle n'a plus d'usage.

**Le nuage orange sur `medias` viendra après**, une fois la zone stable. Il met
les photographies dans le cache de Cloudflare, gratuitement et sans consommer
de requête de Worker — mais c'est un changement de plus, et on n'en fait qu'un
à la fois.

**Jamais de nuage orange sur les enregistrements de courrier.** Cloudflare ne
relaie pas le protocole des e-mails : un MX proxifié ne reçoit rien. Ils n'ont
d'ailleurs pas d'option de proxy, mais le réflexe vaut d'être écrit.

## Les serveurs de noms, chez IONOS

Le changement se fait chez le **registrar**, pas chez Hostinger : c'est IONOS
qui dit au monde entier qui fait autorité sur la zone.

Cloudflare donne deux noms à la création de la zone, du genre
`xxx.ns.cloudflare.com`. Ils remplacent `ns1.dns-parking.com` et
`ns2.dns-parking.com`.

**Ne pas supprimer la zone chez Hostinger** dans la foulée. Tant qu'elle existe,
le retour en arrière consiste à remettre les deux anciens serveurs de noms chez
IONOS, et rien d'autre.

## Ce qu'il faut vérifier après

La propagation prend de quelques minutes à quelques heures. Ce qui compte n'est
pas le site — il se voit — mais le courrier, qui tombe en silence.

```bash
# Les serveurs de noms ont-ils changé ?
nslookup -type=NS dronezvous.com 8.8.8.8

# Le courrier arrive-t-il toujours quelque part ?
nslookup -type=MX dronezvous.com 8.8.8.8

# Les trois TXT sont-ils tous là ? Il en faut trois.
nslookup -type=TXT dronezvous.com 8.8.8.8
```

Puis, et c'est le seul contrôle qui prouve vraiment quelque chose :
**s'envoyer un message depuis une adresse extérieure vers
`kevin@dronezvous.com`, et vérifier qu'il arrive.**
