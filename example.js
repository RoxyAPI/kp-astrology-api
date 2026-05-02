import { createRoxy } from '@roxyapi/sdk';

const roxy = createRoxy(process.env.ROXY_API_KEY);

/**
 * Generates a KP astrology chart with sub lord precision for all 12 cusps and 9 planets.
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

  console.log('\nCusp 1 sub lord:', data.cusps[0].subLord);
  console.log('Cusp 7 sub lord:', data.cusps[6].subLord);

  console.log('\nPlanets:');
  for (const planet of data.planets) {
    console.log(
      `  ${planet.planet}: ${planet.sign} H${planet.house} sub=${planet.subLord}`
    );
  }

  console.log('\nRahu:', data.nodes.rahu.sign, 'H' + data.nodes.rahu.house, 'sub=' + data.nodes.rahu.subLord);
  console.log('Ketu:', data.nodes.ketu.sign, 'H' + data.nodes.ketu.house, 'sub=' + data.nodes.ketu.subLord);
}

main().catch(console.error);
