import { createRoxy } from '@roxyapi/sdk';

const roxy = createRoxy(process.env.ROXY_API_KEY!);

/**
 * Generates a KP astrology chart with full sub lord and sub-sub lord precision for all cusps and planets.
 * Uses Placidus houses and KP Newcomb ayanamsa by default.
 */
async function main() {
  // Step 1: geocode the birth city - never hardcode coordinates
  const { data: loc, error: locErr } = await roxy.location.searchCities({
    query: { q: 'New Delhi' },
  });
  if (locErr) throw new Error(locErr.error);
  const { latitude, longitude, timezone } = loc.cities[0];

  // Step 2: generate the KP chart
  const { data, error } = await roxy.vedicAstrology.generateKpChart({
    body: {
      date: '1990-07-04',
      time: '10:12:00',
      latitude,
      longitude,
      timezone,
    },
  });

  if (error) throw new Error(error.error);

  console.log('Ayanamsa:', data.meta.ayanamsa);
  console.log('House system:', data.meta.houseSystem);
  console.log('Ascendant sign:', data.ascendant.sign);
  console.log('Ascendant sub lord:', data.ascendant.subLord);

  console.log('\nAll 12 cusps:');
  for (const cusp of data.cusps) {
    console.log(
      `  House ${cusp.house}: ${cusp.sign} | star: ${cusp.starLord} | sub: ${cusp.subLord} | ssl: ${cusp.subSubLord}`
    );
  }

  console.log('\nAll planets:');
  for (const planet of data.planets) {
    console.log(
      `  ${planet.planet}: ${planet.sign} H${planet.house} | sub: ${planet.subLord}${planet.retrograde ? ' (R)' : ''}`
    );
  }

  console.log('\nRahu sub lord:', data.nodes.rahu.subLord);
  console.log('Ketu sub lord:', data.nodes.ketu.subLord);
}

main().catch(console.error);
