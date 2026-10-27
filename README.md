# tarot-admin

Admin front-end for the Tarot Reader: browse and edit the 78 cards, and change the settings the API and the
worker read (the reading model, deck reversals, and the raw `system_settings` rows). It talks to
`Tarot.Admin.Api` in the back-end ([`tarot`](https://github.com/Dativerse/tarot)) and follows the layout and
conventions of [`tarot-client`](https://github.com/Dativerse/tarot-client).

Stack: React 19, Vite, Zod, TanStack Query, i18next (English, Vietnamese), Vitest.

## Develop

Start the Admin API first, from `tarot`:

```sh
dotnet run --project src/Tarot.Admin.Api   # http://localhost:5010; migrates and seeds on start
```

Then:

```sh
npm install
cp .env.example .env   # VITE_API_HOST=http://localhost:5010
npm run dev            # http://localhost:5173, proxies /api to the Admin API
npm test
npm run typecheck
npm run lint
```

Sign in with the admin password: `Admin:Password` in the Admin API's configuration
(`appsettings.Development.json` in development). The API keeps the session in an HttpOnly, `SameSite=Strict`
cookie, so serve this app from the same origin as the API: the Vite proxy in development, a reverse proxy
routing `/api` in production. The Admin API has no CORS. The `Dockerfile` builds a static image served by
`serve` on port 3000.

## Structure

```
src/api/schemas.ts     Zod schemas: the Admin API contract and form validation. Types come from z.infer.
src/api/http.ts        fetch wrapper: unwraps the { errors, data } envelope, parses data with Zod
src/api/queries.ts     TanStack Query hooks and keys: ["session"], ["cards"], ["cards", id], ["settings"], ["settings", "ollama" | "deck"]
src/pages/cards        card grid: search, arcana and suit filters (kept in the URL), re-seed
src/pages/card         card editor: name, arcana, suit, correspondences, upright and reversed meanings
src/pages/settings     reading model, deck reversals, and every system_settings row
src/components         SessionGate (sign-in), Field, ChoiceChips, FormActions, and useForm (values, dirty state, Zod validation)
```

`UNAUTHORIZED` from any request means the session ended: `main.tsx` flips the `["session"]` query to signed out and
`SessionGate` shows the sign-in form, keeping the URL so the same page opens after signing in.

As in the public API, every response is `{ errors: [{ code, metadata }], data }`, with errors sent as 200 OK.
`http.ts` returns `data` parsed with the endpoint's schema, or throws an `ApiError` holding every error, plus the
first one's `code` and `metadata`. The API sends no message text: `useErrorMessage` translates the code. With no
answer from the API, or a 502–504 from the proxy in front of it, the code is `UNAVAILABLE`. A body that isn't an
envelope, or `data` that doesn't match its schema, throws a `ContractError`, as in `tarot-client`.

`PUT /api/admin/cards/{id}` replaces the card's whole `data` object and reads `suit: null` as "unchanged", so
the editor sends every dataset key back (including ones it doesn't show) and clears a suit with `""`.
Setting values are JSON text: `"llama3.2:3b"` with its quotes, `300`, `0.3`.

Readings use the cards as stored here. The API and the worker cache cards and settings for up to 5 minutes, so
edits take that long to reach readings. Re-seeding resets every card to `data/cards.json` and adds missing
default settings; it keeps settings you changed.

## Card images

`public/cards/{id}.jpg` are the public-domain 1909 Rider-Waite-Smith scans also used by `tarot-client`; see
`public/cards/CREDITS.md` for the sources.
