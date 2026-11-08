# Brikkesjekk

Ein liten app for å sortere delvis demonterte LEGO-sett. Søk opp eit sett, få full brikkeliste
(med del-ID, farge, BrickLink-ID-ar og element-ID), og tel opp brikkene du finn. Framdrifta blir
lagra per sett, så du kan hoppe mellom sett utan å miste oversikta.

**Bruk:** https://kristianthy.github.io/lego-sorter/

## Kom i gang
1. Lag ein gratis konto på [Rebrickable](https://rebrickable.com) og hent ein API-nøkkel under
   *Profile → Settings → API*.
2. Opne appen, gå til Innstillingar og lim inn nøkkelen.
3. Trykk «Legg til sett», søk på nummer (t.d. `10270`) eller namn.

Appen kan installerast på mobil/PC («Legg til på heimeskjerm» / «Installer app») og fungerer
offline for sett som alt er henta.

## Korleis det fungerer
- Data kjem frå [Rebrickable API v3](https://rebrickable.com/api/v3/docs/) direkte frå nettlesaren.
  Settinventar, minifigurar og minifig-delar blir henta. Reservedelar blir merka.
- Alt blir lagra lokalt i IndexedDB. Ingen server, ingen innlogging.
- Bruk *Innstillingar → Eksporter/Importer* for backup eller flytting mellom einingar.
- *Hent brikkeliste på nytt* oppdaterer lista utan å nullstille framdrifta.

## Utvikling
```sh
npm install
npm run dev      # http://localhost:5173/lego-sorter/
npm run build
```
Push til `main` byggjer og deployar til GitHub Pages via Actions.

LEGO® er eit varemerke for LEGO Group, som ikkje står bak dette prosjektet.
