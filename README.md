# Leonida Trophy Guide — GTA VI

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/Biose-dot/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/Biose-dot/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

An offline guide and tracker for all 55 Grand Theft Auto VI trophies on PlayStation 5. Every trophy appears with its official name, description and grade; each carries a guide written for this tracker that cites its sources, with steps and an honesty note wherever a trigger is still unconfirmed. A six-stage roadmap to the platinum — built from the official descriptions — flags the game's single missable trophy (Positive Mental Attitude: one of its meditation spots is lost when Chapter 1 ends). The checklist saves progress in the browser, filters by kind (story, missable, collectibles, activities) and grade, searches, hides story trophies behind a spoiler mode until they are earned, and exports and imports progress as a file. No build step and no network requests at run time: static files only.

## Run it locally

```sh
node serve.ts
# then open http://localhost:8080
```

Any static file server pointed at `app/` works just as well. The tracker also reads its starting state from the URL — `?earned=2,3,28`, `?spoiler=1`, `?view=roadmap`, `?open=28` — so a link can share one exact view.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

That copies `app/` and `screenshots/` into `out/` and writes `out/dossier.json` with the vendored make.fun library (`vendor/makefun-frontend.ts`, unchanged from the kit).

## Layout

- `app/` — the guide itself: `index.html`, `style.css`, `app.js`, and `app/data/` (`trophies.json`, the 55 trophies with their guides; `roadmap.json`, the six stages).
- `screenshots/` — four renders of the running app; `shots.json` says what each one shows.
- `main.ts` — the hand-in program. `serve.ts` — a small local server for development.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
