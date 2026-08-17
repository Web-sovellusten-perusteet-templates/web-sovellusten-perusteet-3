#!/usr/bin/env node
/* ==========================================================
   W1L3 — Flexbox-kotitehtava: automaattinen tarkistus
   Ei riippuvuuksia, pelkka Node (fs). Ala muokkaa tata tiedostoa.
   ========================================================== */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);

function read(rel) {
  try {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
  } catch (e) {
    return null;
  }
}

/* ---------- Yksinkertainen CSS-jasennin ----------
   Palauttaa saannot muodossa { selector, decls, media }
   missa decls on { ominaisuus: arvo } ja media on null tai media-ehto.  */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function parseDecls(block) {
  const out = {};
  block.split(';').forEach((part) => {
    const i = part.indexOf(':');
    if (i === -1) return;
    const prop = part.slice(0, i).trim().toLowerCase();
    const val = part.slice(i + 1).trim().toLowerCase().replace(/\s+/g, ' ');
    if (prop) out[prop] = val;
  });
  return out;
}

function parseCss(cssRaw) {
  const css = stripComments(cssRaw || '');
  const rules = [];

  function walk(text, media) {
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf('{', i);
      if (open === -1) break;
      // etsi vastaava sulkeva aaltosulje
      let depth = 1;
      let j = open + 1;
      while (j < text.length && depth > 0) {
        if (text[j] === '{') depth++;
        else if (text[j] === '}') depth--;
        j++;
      }
      const head = text.slice(i, open).trim();
      const body = text.slice(open + 1, j - 1);
      if (head.startsWith('@media')) {
        walk(body, head.replace(/^@media/, '').trim().toLowerCase());
      } else if (head) {
        head.split(',').forEach((sel) => {
          rules.push({
            selector: sel.trim().toLowerCase().replace(/\s+/g, ' '),
            decls: parseDecls(body),
            media: media || null,
          });
        });
      }
      i = j;
    }
  }

  walk(css, null);
  return rules;
}

/* ---------- Apufunktiot ---------- */

// Yhdistaa kaikki saannot jotka osuvat annettuihin selektoreihin.
function declsFor(rules, selectors, mediaFilter) {
  const merged = {};
  rules
    .filter((r) => selectors.includes(r.selector))
    .filter((r) => (mediaFilter ? mediaFilter(r.media) : r.media === null))
    .forEach((r) => Object.assign(merged, r.decls));
  return merged;
}

// Yhdistaa annetun saantojoukon (esim. yhden media queryn) saannot.
function mergeDecls(ruleList, selectors) {
  const merged = {};
  ruleList
    .filter((r) => selectors.includes(r.selector))
    .forEach((r) => Object.assign(merged, r.decls));
  return merged;
}

const noMedia = (m) => m === null;

// Selektorit joilla korttirivisto ja yksittainen kortti tunnistetaan
const KORTIT = ['.kortit', 'div.kortit'];
const KORTTI = ['.kortti', 'article.kortti'];

// Poimii min-width-arvon media-ehdosta, esim. "(min-width: 600px)" -> 600
function minWidthOf(media) {
  if (!media) return null;
  const m = media.match(/min-width\s*:\s*(\d+(?:\.\d+)?)\s*px/);
  return m ? parseFloat(m[1]) : null;
}

// Etsii korttien "leveyden" mista tahansa naista: flex-basis, flex, width, max-width
function basisOf(decls) {
  return [decls['flex-basis'], decls['flex'], decls['width'], decls['max-width']]
    .filter(Boolean)
    .join(' ');
}

// Onko merkkijonossa prosenttiluku halutulla valilla?
function hasPercentBetween(str, min, max) {
  if (!str) return false;
  const matches = str.match(/(\d+(?:\.\d+)?)\s*%/g) || [];
  return matches.some((m) => {
    const v = parseFloat(m);
    return v >= min && v <= max;
  });
}

// Jakaako lauseke kolmella? Esim. calc(100% / 3), calc((100% - 3rem) / 3),
// calc(100%/3 - 1rem). Ei osu lukuihin kuten "/ 33" tai "/ 3.5".
function dividesByThree(str) {
  if (!str) return false;
  return /calc\(/.test(str) && /\/\s*3(?![\d.])/.test(str);
}

/* Purkaa flex-lyhenteen osiin.
   Syntaksi: flex: <grow> <shrink>? || <basis>
   - yksikottomat luvut ovat grow ja shrink
   - kaikki muu (pituus, prosentti, auto, content, none) on basis
   - kolmas yksikoton luku on basis-arvo 0 (esim. "flex: 1 1 0")            */
function parseFlexShorthand(raw) {
  const osat = (raw || '').trim().split(/\s+/).filter(Boolean);
  if (osat.length === 0) return { grow: null, basis: null };
  const luvut = [];
  const muut = [];
  osat.forEach((v) => {
    if (/^\d+(?:\.\d+)?$/.test(v)) luvut.push(v);
    else muut.push(v);
  });
  let basis = muut.length ? muut.join(' ') : null;
  if (basis === null && luvut.length >= 3) basis = luvut[2];
  // "flex: 1" ja "flex: 1 1" tarkoittavat basis-arvoa 0 %
  if (basis === null && luvut.length >= 1) basis = '0%';
  return { grow: luvut.length ? parseFloat(luvut[0]) : null, basis };
}

/* Jakautuuko tila tasan flex-growin avulla? Talloin kolme korttia asettuu
   samalle riville ilman ettei leveytta ole kirjoitettu auki.
   Esim. flex: 1 | flex: 1 1 0 | flex: 1 1 auto | flex-grow: 1 + flex-basis: 0 */
function growsEqually(decls) {
  const lyhenne = parseFlexShorthand(decls['flex']);

  const growRaw = decls['flex-grow'] !== undefined ? parseFloat(decls['flex-grow']) : lyhenne.grow;
  if (!(growRaw > 0)) return false;

  const basis = decls['flex-basis'] !== undefined ? decls['flex-basis'] : lyhenne.basis;
  if (basis === null || basis === undefined) return false;

  // Vain "tyhja" basis jakaa tilan tasan; esim. 300px tai 100% ei jaa.
  return /^(0(?:px|%|rem|em|vw)?|auto|content)$/.test(basis.trim());
}

// Onko kortti desktopilla noin kolmasosan levyinen (millä tahansa tekniikalla)?
function isThirdWidth(decls) {
  const basis = basisOf(decls);
  return hasPercentBetween(basis, 25, 34) || dividesByThree(basis) || growsEqually(decls);
}

// Containerin suunta: onko flex-suunta pystysuora (kortit allekkain)?
function isColumn(decls) {
  return /column/.test(decls['flex-direction'] || decls['flex-flow'] || '');
}

// Rivittyyko container (flex-wrap: wrap)?
function isWrapping(decls) {
  const w = decls['flex-wrap'] || decls['flex-flow'] || '';
  return /wrap/.test(w) && !/nowrap/.test(w);
}

// Onko korttien valissa gap?
function hasGap(decls) {
  return Boolean(decls['gap'] || decls['column-gap'] || decls['row-gap']);
}

/* ---------- Tarkistukset ---------- */

const html = read('index.html');
const cssRaw = read('css/style.css');
const rules = parseCss(cssRaw);

const checks = [];

function check(nro, nimi, fn) {
  let ok = false;
  let viesti = '';
  try {
    const res = fn();
    if (res === true) ok = true;
    else viesti = res || 'ei toteutunut';
  } catch (e) {
    viesti = 'virhe tarkistuksessa: ' + e.message;
  }
  checks.push({ nro, nimi, ok, viesti });
}

/* 1 — viewport meta */
check(1, 'viewport meta -tagi index.html:ssa', () => {
  if (html === null) return 'index.html puuttuu';
  const tags = html.match(/<meta[^>]*>/gi) || [];
  const vp = tags.find((t) => /name\s*=\s*["']?viewport["']?/i.test(t));
  if (!vp) return 'meta name="viewport" puuttuu';
  if (!/width\s*=\s*device-width/i.test(vp)) return 'content-attribuutista puuttuu width=device-width';
  if (!/initial-scale\s*=\s*1/i.test(vp)) return 'content-attribuutista puuttuu initial-scale=1';
  return true;
});

/* 2 — nav Flexbox-rivina */
check(2, '.nav on Flexbox-rivi, logo vasemmalla ja linkit oikealla', () => {
  if (cssRaw === null) return 'css/style.css puuttuu';
  const nav = declsFor(rules, ['.nav', 'nav.nav', 'nav'], noMedia);
  if (!/flex/.test(nav['display'] || '')) return '.nav: display: flex puuttuu';
  const jc = nav['justify-content'] || '';
  if (!/space-between|space-around/.test(jc)) {
    return '.nav: justify-content: space-between puuttuu (nyt "' + (jc || 'ei mitaan') + '")';
  }
  if (!/center/.test(nav['align-items'] || '')) return '.nav: align-items: center puuttuu';

  const linkit = declsFor(rules, ['.nav__linkit', 'ul.nav__linkit', '.nav .nav__linkit'], noMedia);
  if (!/none/.test(linkit['list-style'] || linkit['list-style-type'] || '')) {
    return '.nav__linkit: list-style: none puuttuu';
  }
  if (!/flex/.test(linkit['display'] || '')) return '.nav__linkit: display: flex puuttuu';
  if (linkit['margin'] === undefined && linkit['margin-left'] === undefined) {
    return '.nav__linkit: margin nollaamatta';
  }
  if (linkit['padding'] === undefined && linkit['padding-left'] === undefined) {
    return '.nav__linkit: padding nollaamatta';
  }
  return true;
});

/* 3 — sisaltoalueen rajoitus */
check(3, '.sisalto rajoitettu max-widthilla ja keskitetty', () => {
  if (cssRaw === null) return 'css/style.css puuttuu';
  const s = declsFor(rules, ['.sisalto', 'main.sisalto', 'main'], noMedia);
  const mw = s['max-width'];
  if (!mw) return '.sisalto: max-width puuttuu';
  if (!/\d/.test(mw) || /none/.test(mw)) return '.sisalto: max-width ei ole numeerinen arvo';
  const margin = s['margin'] || '';
  const auto = /auto/.test(margin) || /auto/.test(s['margin-left'] || '') && /auto/.test(s['margin-right'] || '');
  if (!auto) return '.sisalto: keskitys puuttuu (margin: 0 auto)';
  return true;
});

/* 4 — kortit Flexboxina, mobiilissa allekkain */
check(4, '.kortit on Flexbox-container ja kortit ovat mobiilissa allekkain', () => {
  if (cssRaw === null) return 'css/style.css puuttuu';
  const k = declsFor(rules, KORTIT, noMedia);
  if (!/flex/.test(k['display'] || '')) return '.kortit: display: flex puuttuu';

  // Allekkain paastaan joko pystysuunnalla tai rivittamalla (flex-wrap: wrap)
  if (!isColumn(k) && !isWrapping(k)) {
    return '.kortit: kortit eivat asetu mobiilissa allekkain (tarvitaan flex-direction: column tai flex-wrap: wrap)';
  }

  const kortti = declsFor(rules, KORTTI, noMedia);
  if (!hasPercentBetween(basisOf(kortti), 100, 100)) {
    return '.kortti: oletusleveys puuttuu (flex-basis: 100%)';
  }
  return true;
});

/* 5 — kortin kuva tayttaa kortin leveyden */
check(5, 'kortin kuva tayttaa kortin leveyden', () => {
  if (cssRaw === null) return 'css/style.css puuttuu';
  const img = declsFor(
    rules,
    ['.kortti img', '.kortti > img', 'article.kortti img', '.kortit img', 'img'],
    () => true
  );
  if (!/100%/.test(img['width'] || img['max-width'] || '')) {
    return 'kortin kuvalta puuttuu width: 100%';
  }
  return true;
});

/* 6 — media query: 3 saraketta desktopilla */
check(6, 'kortit 3 sarakkeessa vahintaan 600 px leveydella', () => {
  if (cssRaw === null) return 'css/style.css puuttuu';

  const mediaRules = rules.filter((r) => {
    const mw = minWidthOf(r.media);
    return mw !== null && mw >= 480 && mw <= 800;
  });
  if (mediaRules.length === 0) {
    return '@media (min-width: 600px) -lohkoa ei loytynyt (raja saa olla 480-800 px)';
  }

  const kortitMedia = mergeDecls(mediaRules, KORTIT);
  const korttiMedia = mergeDecls(mediaRules, KORTTI);
  // Media query voittaa oletustyylit, joten yhdistetaan ne samaan suuntaan
  const kortit = Object.assign({}, declsFor(rules, KORTIT, noMedia), kortitMedia);
  const kortti = Object.assign({}, declsFor(rules, KORTTI, noMedia), korttiMedia);

  if (isColumn(kortit)) {
    return 'desktopilla .kortit on yha pystysuunnassa (flex-direction: column) — vaihda suunnaksi row';
  }

  // Tapa A: rivi ilman rivitysta -> kolme 100 % korttia kutistuu tasan kolmannekseen
  if (!isWrapping(kortit)) {
    if (!hasGap(kortit)) return 'desktopilla .kortit-saannosta puuttuu gap korttien valilta';
    return true;
  }

  // Tapa B: kortit rivittyvat, jolloin kortille on annettava n. kolmanneksen leveys
  if (isThirdWidth(korttiMedia) || isThirdWidth(kortti)) return true;
  return (
    'desktopilla .kortit rivittyy (flex-wrap: wrap), joten .kortti tarvitsee noin kolmanneksen leveyden (nyt "' +
    (basisOf(korttiMedia) || 'ei mitaan') +
    '"). Kelpaa esim. leveys 25-34 %, kolmella jakava calc() tai flex-grow tyhjalla basiksella.'
  );
});

/* ---------- Tuloste ---------- */

console.log('');
console.log('W1L3 — Flexbox-kotitehtava: tarkistus');
console.log('======================================');
checks.forEach((c) => {
  const merkki = c.ok ? 'OK  ' : 'FAIL';
  console.log(`[${merkki}] ${c.nro}. ${c.nimi}`);
  if (!c.ok) console.log(`         -> ${c.viesti}`);
});

const pisteet = checks.filter((c) => c.ok).length;
console.log('--------------------------------------');
console.log(`Hyvaksytyt tarkistukset: ${pisteet} / ${checks.length}`);
console.log('');

process.exit(pisteet === checks.length ? 0 : 1);
