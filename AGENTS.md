# AGENTS.md for KP Astrology API

This repo teaches AI coding agents (Cursor, Claude Code, Aider, Codex, Windsurf, RooCode, Gemini CLI) how to use the RoxyAPI KP chart endpoint.

## Endpoint
- Method: `POST`
- URL: `https://roxyapi.com/api/v2/vedic-astrology/kp/chart`
- Auth: `X-API-Key` header
- Domain: `vedic-astrology` (one of 10 in the RoxyAPI catalog)
- Operation ID: `generateKpChart` matches the SDK method name in camelCase
- MCP tool: `post_vedic_astrology_kp_chart` on `https://roxyapi.com/mcp/vedic-astrology`

## TypeScript SDK
```ts
import { createRoxy } from '@roxyapi/sdk';
const roxy = createRoxy(process.env.ROXY_API_KEY!);
const { data, error } = await roxy.vedicAstrology.generateKpChart({
  body: {
    date: '1990-07-04',
    time: '10:12:00',
    latitude: 28.6139,
    longitude: 77.209,
    timezone: 5.5,
  },
});
```

## Python SDK
```python
import os
from roxy_sdk import create_roxy
roxy = create_roxy(os.environ["ROXY_API_KEY"])
result = roxy.vedic_astrology.generate_kp_chart(
    date="1990-07-04",
    time="10:12:00",
    latitude=28.6139,
    longitude=77.209,
    timezone=5.5,
)
```

## Setup step (coordinate-dependent endpoint)
Always call `GET /location/search?q={city}` first. Take `latitude`, `longitude`, `timezone` from `cities[0]` and pipe them in. Never ask the user to type coordinates.

```ts
const { data: loc } = await roxy.location.searchCities({ query: { q: 'Mumbai' } });
const { latitude, longitude, timezone } = loc.cities[0];
const { data: chart } = await roxy.vedicAstrology.generateKpChart({
  body: { date: '1990-07-04', time: '10:12:00', latitude, longitude, timezone },
});
```

## Request fields
- `date` (string, required): birth date YYYY-MM-DD
- `time` (string, required): birth time HH:MM:SS, 24-hour. Highly sensitive: even 1 minute shifts sub lord assignments near cusp boundaries
- `latitude` (number, required): -90 to 90
- `longitude` (number, required): -180 to 180
- `timezone` (number or IANA string, optional): defaults to 5.5 (IST). Pass IANA string (e.g. "Asia/Kolkata") and the server resolves DST-correct offset for the birth date
- `ayanamsa` (string, optional): `kp-newcomb` (default), `kp-old`, `lahiri`, `custom`
- `ayanamsaValue` (number, optional): custom ayanamsa degrees, only when `ayanamsa` is `custom`
- `nodeType` (string, optional): `mean` (default) or `true` for Rahu/Ketu positions

## Response top level keys
- `meta`: input echo, computed `ayanamsa` decimal, `ayanamsaType`, `houseSystem` ("placidus")
- `ascendant`: Lagna longitude, sign, nakshatra, pada, `starLord`, `subLord`, `subSubLord`, `kpNumber`
- `cusps[12]`: each cusp has `house`, `longitude`, `sign`, `signLord`, `nakshatra`, `nakshatraLord`, `pada`, `starLord`, `subLord`, `subSubLord`, `kpNumber`
- `planets[9]`: Sun through Saturn, each with `planet`, `longitude`, `sign`, `house`, `nakshatra`, `starLord`, `subLord`, `subSubLord`, `kpNumber`, `retrograde`
- `nodes`: `rahu` and `ketu` each with full KP stellar data
- `significators.houseWise[12]`: per-house significator list ranked by KP level (occupant star, occupant, owner star, owner) with `all[]` convenience array
- `significators.planetWise[]`: per-planet list of houses the planet signifies across all four levels

## Domain rules
- KP uses Placidus house system always. Do not pass `houseSystem`; the endpoint ignores it.
- Sub lord assignments depend on the exact cusp degree. A 1-minute birth time error near a sub lord boundary changes the result. Collect birth time carefully.
- `nodeType: "true"` can shift Rahu/Ketu sub lords by up to 1.5 degrees from the mean node. Use `mean` (default) unless the practitioner specifically requests true node.
- The `significators.houseWise[n].all` array contains the complete significator list for house n+1 in priority order. Level 1 (occupant star) outranks level 4 (owner).
- `kpNumber` (1-249) maps the degree to the Vimshottari sub-period catalog. It is the index used by KP ruling planet tables.
- For horary KP ("will X happen"), use `POST /vedic-astrology/kp/ruling-planets` with current latitude and longitude, not this endpoint.

## Related endpoints
- `POST /vedic-astrology/kp/planets` (`getKpPlanets`): planet-only sub lord table, lighter payload
- `POST /vedic-astrology/kp/ruling-planets` (`getKpRulingPlanets`): real-time horary ruling planets
- `POST /vedic-astrology/birth-chart` (`generateBirthChart`): standard Vedic kundli (Lahiri, whole-sign or Placidus)

## Verified
2026-Q2 against `https://roxyapi.com/api/v2/openapi.json`. Re-fetch the spec for ground truth before changing this file.

## Discovery
- Full catalog: https://roxyapi.com/AGENTS.md
- LLM index: https://roxyapi.com/llms.txt
- Methodology: https://roxyapi.com/methodology
