# W1L3 — Flexbox-kotitehtävä: flexbox-responsive

**Kurssi:** Web-sovellusten perusteet
**Deadline:** Ennen W2L3-tuntia

---

## Tehtävän kuvaus

Tehtävässä on samat kolme asettelukohtaa kuin W1L3-tuntiharjoituksessa (navigointipalkki, sisältöalueen rajaus, kortit riviin) ja **kaksi uutta asiaa**:

1. **Responsiivisuus** — viewport-meta ja media query: kortit 3 sarakkeessa desktopilla, 1 sarakkeessa mobiilissa
2. **Kuvien käsittely** — kuva täyttää kortin leveyden 

Sinulle on annettu valmis `index.html` ja `css/style.css`, joihin on merkitty `TODO`-kommentein kohdat, joihin kirjoitat koodia. HTML:ään tarvitaan vain viewport-meta; kaikki muu toteutetaan CSS:ssä.

---

## Vaatimukset

| # | Vaatimus | Tiedosto | Uusi vs. tuntiharjoitus |
|---|----------|----------|-------------------------|
| 1 | `<meta name="viewport" content="width=device-width, initial-scale=1">` löytyy `<head>`-osiosta | `index.html` | **uusi** |
| 2 | `.nav` on Flexbox-rivi: logo vasemmalla, linkit oikealla, pystysuunnassa keskitettyinä | `css/style.css` | tuntiharjoituksesta |
| 3 | `.sisalto` rajoitettu `max-width`-arvolla ja keskitetty `margin: 0 auto` | `css/style.css` | tuntiharjoituksesta |
| 4 | `.kortit` on Flexbox-container, jonka suunta on mobiilissa pystysuora (`flex-direction: column`), ja `.kortti` täyttää rivin (`flex-basis: 100%`) | `css/style.css` | tuntiharjoituksesta |
| 5 | Kortin kuva täyttää kortin leveyden (`width: 100%`) | `css/style.css` | **uusi** |
| 6 | Kortit 1 sarakkeessa alle 600 px ja 3 sarakkeessa vähintään 600 px:n leveydellä (media queryssä `.kortit`: `flex-direction: row` + `gap`) | `css/style.css` | **uusi** |

---

## Tiedostorakenne

```
flexbox-responsive/
  index.html          <- Muokkaa (lisää viewport meta)
  css/
    style.css         <- Kirjoita CSS tänne (TODO-kohdat)
  img/
    kuva1.jpg         <- Placeholder-kuvat annetaan valmiina
    kuva2.jpg
    kuva3.jpg
  check.js            <- Tarkistuslogiikka (älä muokkaa)
  package.json        <- npm test -komennon määrittely
  README.md
```

---

## Paikallinen testaus

Avaa `index.html` selaimessa (ei tarvita palvelinta).
Testaa responsiivisuus: **DevTools > Toggle Device Toolbar** (Ctrl+Shift+M).

Tarkistuksen ajat omalla koneellasi Nodella (v18 tai uudempi):

```bash
npm test
```


Skripti tulostaa jokaisen vaatimuksen tilan ja kertoo, mikä puuttuu. Erillisiä riippuvuuksia ei tarvita — `npm install` ei ole pakollinen.

---

## Tarkistuspisteet

| Näytön leveys | Odotettu tulos |
|---------------|---------------|
| 375 px | Kortit allekkain, 1 sarake |
| 768 px | Kortit 3 sarakkeessa; nav rivinä, logo vasemmalla ja linkit oikealla |
| 1200 px | Kortit 3 sarakkeessa; sisältö max-leveydessä ja keskitetty |

Tarkista myös, että kuva täyttää kortin koko leveyden kaikilla näytön leveyksillä.

---

## Automaattinen arviointi

Tarkistus ajetaan paikallisesti komennolla `npm test`. Läpimeno vaatii kaikki 6 tarkistusta; skripti palauttaa paluuarvon 0 vain silloin, kun kaikki menevät läpi.

Skripti lukee `index.html`- ja `css/style.css`-tiedostot ja tarkistaa:

| # | Mitä testi katsoo | Hyväksytään |
|---|-------------------|-------------|
| 1 | `<meta name="viewport">` | sisältää `width=device-width` ja `initial-scale=1` |
| 2 | `.nav` ja `.nav__linkit` | `.nav`: `display: flex`, `justify-content: space-between`, `align-items: center`; `.nav__linkit`: `list-style: none`, nollattu `margin` ja `padding`, `display: flex` |
| 3 | `.sisalto` | numeerinen `max-width` + `margin: 0 auto` (tai `margin-left/right: auto`) |
| 4 | `.kortit` ja `.kortti` oletuksena | `.kortit`: `display: flex` ja kortit allekkain — joko `flex-direction: column` tai `flex-wrap: wrap`; `.kortti`: leveys `100%` |
| 5 | `.kortti img` | `width: 100%` (myös `max-width: 100%` kelpaa) |
| 6 | `@media (min-width: 600px)` -lohko | `.kortit` on rivisuunnassa (ei `column`). Jos container **ei** rivitä kortteja, riittää `flex-direction: row` + `gap` — kolme 100 % korttia kutistuu tällöin itsestään kolmannekseen. Jos container rivittää kortit (`flex-wrap: wrap`), `.kortti` tarvitsee lisäksi n. kolmanneksen leveyden: prosenttiluku 25–34 %, kolmella jakava `calc()` (esim. `calc(100% / 3)`, `calc((100% - 3rem) / 3)`) tai tasajako `flex-grow`illa (`flex: 1`, `flex: 1 1 0`, `flex: 1 1 auto`, tai `flex-grow: 1` + `flex-basis: 0`) |

Leveyden saa ilmaista `flex`-lyhenteellä tai erillisillä `flex-basis`-, `width`- ja `max-width`-määrittelyillä. Media queryn ja oletustyylien arvot yhdistetään kuten selaimessakin, joten esimerkiksi `gap` tai `flex-grow` saa olla määriteltynä jo media queryn ulkopuolella. Media queryn raja saa olla väliltä 480–800 px.

**Älä muokkaa** `check.js`-tiedostoa.

---

## Apumateriaali

- [Flexbox — MDN](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Flexbox)
- [Responsiivinen suunnittelu — MDN](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design)
- [CSS Media Queries — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Using_media_queries)
- [flex-direction — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/flex-direction)
- [flex-shrink — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/flex-shrink)
