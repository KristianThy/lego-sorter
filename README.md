# Brikkesjekk

Ein liten app for å sortere delvis demonterte LEGO-sett. Søk opp eit sett, få full brikkeliste
(med del-ID, farge, BrickLink-ID-ar og element-ID), og tel opp brikkene du finn. Framdrifta blir
lagra per sett, så du kan hoppe mellom sett utan å miste oversikta.

**Bruk:** https://kristianthy.github.io/lego-sorter/

## Kom i gang
1. Lag ein gratis konto på [Rebrickable](https://rebrickable.com) og hent ein API-nøkkel under
   *Profile → Settings → API*.
2. Opne appen, gå til Innstillingar og lim inn nøkkelen.
3. Trykk «Legg til sett», søk på nummer (t.d. `10270`) eller namn, eller vel berre eit tema
   og/eller årstal for å bla i alle setta der.

## Installer som app
Brikkesjekk er ein PWA. Du installerer han frå nettlesaren, utan nokon nedlasting. Då får han
eige vindauge og ikon, og fungerer offline for sett som alt er henta.

Opne https://kristianthy.github.io/lego-sorter/ og:

| Eining | Slik gjer du |
| --- | --- |
| PC, Chrome | Meny ⋮ → *Cast, lagre og del* → *Installer siden som en app…* |
| PC, Edge | Meny … → *Flere verktøy* → *Apper* → *Installer dette nettstedet som en app* |
| PC, Firefox | Ikkje støtta – bruk Chrome eller Edge |
| Mac, Safari | *Fil* → *Legg til i Dock* |
| iPhone/iPad, Safari | Del-knappen → *Legg til på Hjem-skjerm* |
| Android, Chrome | Meny ⋮ → *Installer app* |

På PC havnar appen i startmenyen og kan festast til oppgåvelinja.

> **Merk:** Data blir lagra i nettlesaren, knytt til adressa og eininga. Framdrift frå
> `localhost` under utvikling finst ikkje i den publiserte appen, og PC og mobil deler ikkje
> data. Bruk *Innstillingar → Eksporter/Importer* for å flytte.

## Korleis det fungerer
- Data kjem frå [Rebrickable API v3](https://rebrickable.com/api/v3/docs/) direkte frå nettlesaren.
  Settinventar, minifigurar og minifig-delar blir henta. Reservedelar blir merka.
- Alt blir lagra lokalt i IndexedDB. Ingen server, ingen innlogging.
- Bruk *Innstillingar → Eksporter/Importer* for backup eller flytting mellom einingar.
- **Settsøket** kan filtrerast på tema og år, òg med tomt søkefelt. Temaveljaren er eit tre
  der undertema kan opnast og lukkast, og du kan skrive for å filtrere (t.d. «star ucs»).
  *Vis fleire* hentar neste side. Med *Legg til fleire sett* blir du verande på søkesida etter
  at eit sett er lagt til.
- **Finn brikke** (søkeknappen i *Mine sett*) søkjer i alle setta dine på delnummer,
  BrickLink-ID, element-ID eller namn, og viser kva sett brikka høyrer til. Du kan telje ho opp
  direkte der. Element-ID-ar som ikkje finst i nokon av setta dine blir slått opp hos Rebrickable.
- Tannhjulet på settkortet opnar menyen: lenkje til LEGO sine offisielle byggeinstruksjonar,
  *Hent brikkeliste på nytt* (oppdaterer lista utan å nullstille framdrifta), nullstilling og sletting.
- Grupper i brikkelista kan lukkast/opnast, og appen hugsar det per sett.
- *Mine sett* kan grupperast etter **tema** (hovudtema frå Rebrickable, t.d. Star Wars eller
  Technic – undertemaet står på kortet) eller etter **eigne kategoriar**. Eigne kategoriar
  (t.d. «Bygd», «Til sal») set du via tannhjulet → *Eigne kategoriar …*. Eit sett kan vere i
  fleire, og dei blir med i eksport/import.
- Vel fleire sett samtidig i *Mine sett* med avkryssingsknappen øvst (eller langt trykk på eit
  sett). Då kan du nullstille framdrifta for eller slette alle dei valde på ein gong. Avkryssinga
  ved kvar gruppe vel heile gruppa.
- Språk: nynorsk, bokmål eller engelsk – vel under *Innstillingar → Språk*. Namn på brikker,
  fargar, kategoriar og tema kjem frå Rebrickable og er alltid på engelsk.

## Utvikling
```sh
npm install
npm run dev      # http://localhost:5173/lego-sorter/
npm run build
```
Push til `main` byggjer og deployar til GitHub Pages via Actions.

All tekst i appen ligg i [`src/i18n.ts`](src/i18n.ts). Bruk `t('nøkkel')` i staden for fast tekst.
Ein ny nøkkel må finnast på alle tre språka, elles feilar typesjekken.

LEGO® er eit varemerke for LEGO Group, som ikkje står bak dette prosjektet.
