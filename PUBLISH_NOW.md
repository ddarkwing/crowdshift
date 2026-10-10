# Publish CrowdShift now

## Local final check

```bash
npm start
```

- Landing: http://127.0.0.1:8080/
- Tool: http://127.0.0.1:8080/tool

## Add Featherless

```bash
cp .env.example .env
```

Paste `FEATHERLESS_API_KEY=...`, restart, then open ActionCast AI and verify the badge says `Featherless · LIVE`.

## Deploy

This is a standard Node app. Configure the service command as:

```bash
npm start
```

Set `PORT` from the host platform if it is not injected automatically. Set `HOST=0.0.0.0` for a public container/server deployment.

MapLibre, deck.gl and Globe.gl are loaded from public CDNs. The basemap is CARTO Dark Matter with a MapLibre demo/fallback visualization underneath. NASA GIBS can be toggled from the Atlas.
