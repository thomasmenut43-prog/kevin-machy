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

await b.close();
console.log(rapport.join('\n'));
console.log('\n' + rapport.filter(l=>l.startsWith('KO')).length + ' échec(s) sur ' + rapport.length);
