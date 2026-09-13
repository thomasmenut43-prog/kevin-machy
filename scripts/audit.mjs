import { chromium } from 'playwright';
const b = await chromium.launch();
const rapport = [];
const ok = (t, v, d='') => rapport.push(`${v ? 'OK ' : 'KO '} ${t}${d ? ' — ' + d : ''}`);

// 1) Débordement horizontal sur les six pages, en desktop et en mobile
for (const [nom, vp] of [['desktop', {width:1440,height:900}], ['mobile', {width:390,height:844}]]) {
  const p = await b.newPage({ viewport: vp });
  for (const c of ['/','/mariage/','/portrait/','/studio-de-l-iris/','/a-propos/','/contact/']) {
    await p.goto('http://localhost:3000'+c, {waitUntil:'domcontentloaded'});
    const deborde = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    ok(`pas de défilement horizontal ${nom} ${c}`, !deborde);
  }
  await p.close();
}

// 2) Menu plein écran en mobile
{
  const p = await b.newPage({ viewport: {width:390,height:844} });
  await p.goto('http://localhost:3000/', {waitUntil:'networkidle'});
  await p.getByRole('button', {name:/menu/i}).click();
  ok('menu mobile s’ouvre', await p.getByRole('navigation',{name:/plein écran/i}).isVisible());
  ok('défilement verrouillé', await p.evaluate(() => getComputedStyle(document.body).overflow === 'hidden'));
  await p.keyboard.press('Escape');
  await p.waitForTimeout(200);
  ok('Échap referme le menu', await p.locator('#menu-principal').count() === 0);
  await p.close();
}

// 3) Visionneuse de galerie
{
  const p = await b.newPage({ viewport: {width:1440,height:900} });
  await p.goto('http://localhost:3000/', {waitUntil:'networkidle'});
  await p.evaluate(() => scrollTo(0, 5000));
  await p.waitForTimeout(900);
  await p.locator('button:has(picture)').first().click();
  const dlg = p.getByRole('dialog');
  ok('visionneuse s’ouvre', await dlg.isVisible());
  const t1 = await dlg.getAttribute('aria-label');
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(200);
  const t2 = await p.getByRole('dialog').getAttribute('aria-label');
  ok('flèche droite change d’image', t1 !== t2, `${t1} → ${t2}`);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(250);
  ok('Échap referme la visionneuse', await p.getByRole('dialog').count() === 0);
  ok('focus rendu au déclencheur', await p.evaluate(() => document.activeElement?.tagName === 'BUTTON'));
  await p.close();
}

// 4) Mouvement réduit
{
  const p = await b.newPage({ viewport: {width:1440,height:900}, reducedMotion: 'reduce' });
  await p.goto('http://localhost:3000/', {waitUntil:'networkidle'});
  await p.evaluate(() => scrollTo(0, 2000));
  await p.waitForTimeout(700);
  const r = await p.evaluate(() => {
    const e = document.querySelector('[data-reveal].est-visible');
    const m = document.querySelector('.hero__media');
    return { tr: getComputedStyle(e).transform, hero: getComputedStyle(m).transform };
  });
  ok('aucune translation en mouvement réduit', r.tr === 'none' && (r.hero === 'none' || r.hero === 'matrix(1, 0, 0, 1, 0, 0)'), JSON.stringify(r));
  await p.close();
}

// 5) Sans JavaScript : le contenu reste visible
{
  const ctx = await b.newContext({ javaScriptEnabled: false, viewport: {width:1440,height:900} });
  const p = await ctx.newPage();
  await p.goto('http://localhost:3000/', {waitUntil:'domcontentloaded'});
  const op = await p.evaluate(() => 1).catch(() => null);
  const txt = await p.locator('h1').first().textContent();
  ok('contenu servi sans JavaScript', !!txt, txt?.slice(0,40));
  await ctx.close();
}

// 6) Structure : un seul h1 par page, alt sur toutes les images
{
  const p = await b.newPage({ viewport: {width:1440,height:900} });
  for (const c of ['/','/mariage/','/portrait/','/studio-de-l-iris/','/a-propos/','/contact/']) {
    await p.goto('http://localhost:3000'+c, {waitUntil:'networkidle'});
    await p.evaluate(async () => { const h=document.body.scrollHeight; for(let y=0;y<h;y+=800){scrollTo(0,y); await new Promise(r=>setTimeout(r,50));} });
    await p.waitForTimeout(500);
    const r = await p.evaluate(() => ({
      h1: document.querySelectorAll('h1').length,
      sansAlt: [...document.images].filter(i => !i.alt && !i.closest('[aria-hidden]') && i.getAttribute('alt') === null).length,
      altVides: [...document.images].filter(i => i.getAttribute('alt') === '').length,
      titre: document.title.length,
      desc: document.querySelector('meta[name=description]')?.content?.length ?? 0,
    }));
    ok(`${c} un seul h1`, r.h1 === 1, `h1=${r.h1}`);
    ok(`${c} alt renseignés`, r.sansAlt === 0, `sans alt=${r.sansAlt}, alt vides (décoratifs)=${r.altVides}`);
    ok(`${c} titre + description`, r.titre > 20 && r.desc > 60, `titre ${r.titre}, desc ${r.desc}`);
  }
  await p.close();
}

// 7) Barre de rappel du tarif iris : apparition, état partagé, repli, mobile
{
  const IRIS = 'http://localhost:3000/studio-de-l-iris/';
  const barre = p => p.locator('aside[aria-label="Rappel du tarif simulé"]');
  const affichee = p => barre(p).evaluate(n => n.hasAttribute('data-visible'));

  // La page charge beaucoup d'images : un aller-retour stabilise la mise en
  // page avant toute mesure de position.
  const preparer = async p => {
    await p.goto(IRIS, {waitUntil:'networkidle'});
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await p.waitForTimeout(600);
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(400);
  };
  // Les images qui se chargent au-dessus rallongent la page pendant le
  // défilement : viser une position absolue ne suffit pas, on descend jusqu'à
  // ce que le simulateur soit réellement sorti par le haut.
  const depasser = async p => {
    for (let i = 0; i < 8; i++) {
      const bas = await p.evaluate(() => document.getElementById('simulateur-iris').getBoundingClientRect().bottom);
      if (bas < -50) break;
      await p.evaluate(d => window.scrollBy(0, d), bas + 700);
      await p.waitForTimeout(400);
    }
    await p.waitForTimeout(400);
  };

  const p = await b.newPage({ viewport: {width:1440,height:900} });
  await preparer(p);
  ok('barre iris masquée en haut de page', await affichee(p) === false);
  ok('barre iris inerte quand masquée', await barre(p).evaluate(n => n.hasAttribute('inert')));

  await p.locator('#simulateur-iris').scrollIntoViewIfNeeded();
  await p.waitForTimeout(500);
  ok('barre iris masquée quand le simulateur est à l’écran', await affichee(p) === false);

  await depasser(p);
  ok('barre iris visible une fois le simulateur dépassé', await affichee(p) === true);
  ok('barre iris rendue au clavier quand visible', await barre(p).evaluate(n => !n.hasAttribute('inert')));
  let t = await barre(p).innerText();
  ok('barre iris annonce 49 € et 30 min', t.includes('49') && t.includes('30 min'), t.replace(/\n/g,' | '));

  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(700);
  ok('barre iris masquée au pied de page', await affichee(p) === false);

  // Le réglage fait dans la page doit se lire tel quel dans la barre.
  await preparer(p);
  await p.locator('#simulateur-iris').scrollIntoViewIfNeeded();
  await p.waitForTimeout(300);
  await p.getByRole('button', {name:'Ajouter un humain'}).click();
  await p.getByRole('button', {name:'Ajouter un animal'}).click();
  await p.waitForTimeout(200);
  ok('simulateur à 3 iris affiche 99 €', (await p.locator('#simulateur-iris').innerText()).includes('99'));
  await depasser(p);
  t = await barre(p).innerText();
  ok('barre iris reprend le même tarif', t.includes('99') && t.includes('3 iris'), t.replace(/\n/g,' | '));

  // Au-delà du dernier palier, aucun montant n'est deviné.
  await preparer(p);
  await p.locator('#simulateur-iris').scrollIntoViewIfNeeded();
  await p.waitForTimeout(300);
  for (let i = 0; i < 4; i++) await p.getByRole('button', {name:'Ajouter un humain'}).click();
  await p.getByRole('button', {name:'Ajouter un animal'}).click();
  await depasser(p);
  t = await barre(p).innerText();
  ok('barre iris passe sur devis au-delà de 5 iris', t.includes('Sur devis'), t.replace(/\n/g,' | '));
  ok('barre iris bascule vers le contact', await barre(p).getByRole('link',{name:'Écrivez-moi'}).count() === 1);

  // Le repli vaut pour le passage en cours, pas pour la visite entière.
  await preparer(p);
  await depasser(p);
  await barre(p).getByRole('button', {name:/masquer/i}).click();
  await p.waitForTimeout(300);
  ok('barre iris se replie', await affichee(p) === false);
  await p.locator('#simulateur-iris').scrollIntoViewIfNeeded();
  await p.waitForTimeout(500);
  await depasser(p);
  ok('barre iris revient après un passage sur le simulateur', await affichee(p) === true);
  await p.close();

  const m = await b.newPage({ viewport: {width:390,height:844} });
  await preparer(m);
  await depasser(m);
  ok('barre iris visible en mobile', await affichee(m) === true);
  const mes = await barre(m).evaluate(n => {
    const enfants = [...n.firstElementChild.children].map(e => e.getBoundingClientRect());
    // Une seule ligne : tous les enfants se chevauchent verticalement. Comparer
    // leurs `top` ne dirait rien, ils sont centrés et de hauteurs différentes.
    return {
      hauteur: Math.round(n.getBoundingClientRect().height),
      surUneLigne: Math.max(...enfants.map(r => r.top)) < Math.min(...enfants.map(r => r.bottom)),
      deborde: Math.max(...enfants.map(r => r.right)) > window.innerWidth + 1,
      dureeMasquee: getComputedStyle(n.querySelector('span[class*="duree"]')).display === 'none',
    };
  });
  ok('barre iris tient sur une ligne en mobile', mes.surUneLigne);
  ok('barre iris ne déborde pas en mobile', !mes.deborde);
  ok('barre iris masque la durée en mobile', mes.dureeMasquee);
  ok('barre iris reste sous 80 px de haut', mes.hauteur <= 80, `${mes.hauteur} px`);
  await m.close();

  const autre = await b.newPage({ viewport: {width:1440,height:900} });
  for (const c of ['/','/portrait/','/mariage/']) {
    await autre.goto('http://localhost:3000'+c, {waitUntil:'domcontentloaded'});
    ok(`aucune barre iris sur ${c}`, await barre(autre).count() === 0);
  }
  await autre.close();
}

await b.close();
console.log(rapport.join('\n'));
console.log('\n' + rapport.filter(l=>l.startsWith('KO')).length + ' échec(s) sur ' + rapport.length);
