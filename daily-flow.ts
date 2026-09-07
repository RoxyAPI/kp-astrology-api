import { createRoxy } from '@roxyapi/sdk';

const roxy = createRoxy(process.env.ROXY_API_KEY!);

/** Sample chart every request below is read against. Swap in your own native. */
const BIRTH = { date: '1990-07-04', time: '10:12:00', city: 'New Delhi' };

/**
 * Houses this sample follows through all four layers.
 *
 * A KP reading picks its own set and the schools disagree on which houses belong
 * in it, so this is a list you edit, not a convention the API asserts. Change it
 * and every section below follows.
 */
const HOUSES = [2, 6, 8, 11];

/** Calendar date in a named timezone, YYYY-MM-DD, so the day read is the chart local day. */
function localDate(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
}

/** Wall-clock time in a named timezone, HH:MM:SS, for the ruling planets moment. */
function localTime(timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());
}

/** One tracked house with the planets each layer of the reading puts on it. */
type HouseLayers = {
  house: number;
  natalSignificators: string[];
  runningLords: string[];
  rulingPlanets: string[];
};

/**
 * YOUR WEIGHTING GOES HERE.
 *
 * The four requests return facts. What they add up to is the practitioner half
 * of the reading and KP schools do not agree on it: which houses are positive,
 * whether a fast dasha level outranks a slow one, and how much a ruling planet
 * overlap counts are all choices a reader makes and defends.
 *
 * So this default scores nothing and ranks nothing. It joins the layers per
 * house and prints them side by side. Replace the body with your own model.
 */
function weighDay(layers: HouseLayers[]): string[] {
  return layers.map(
    (l) =>
      `  House ${String(l.house).padStart(2)}  natal: ${l.natalSignificators.join(', ') || '-'}` +
      `  |  dasha: ${l.runningLords.join(', ') || '-'}` +
      `  |  ruling: ${l.rulingPlanets.join(', ') || '-'}`,
  );
}

async function main() {
  // Step 0: geocode the birth city. Never hardcode coordinates.
  const { data: loc, error: locErr } = await roxy.location.searchCities({
    query: { q: BIRTH.city },
  });
  if (locErr) throw new Error(locErr.error);
  const { latitude, longitude, timezone } = loc.cities[0];

  const day = localDate(timezone);

  console.log(`KP daily flow for ${BIRTH.date} ${BIRTH.time}, ${BIRTH.city}`);
  console.log(`Day read: ${day} (${timezone})`);

  // Request 1: the natal KP chart. Placidus cusps and KP Newcomb ayanamsa by default.
  const { data: chart, error: chartErr } = await roxy.vedicAstrology.generateKpChart({
    body: { date: BIRTH.date, time: BIRTH.time, latitude, longitude, timezone },
  });
  if (chartErr) throw new Error(chartErr.error);

  console.log('\n1. Cusp lords of the tracked houses');
  for (const house of HOUSES) {
    const cusp = chart.cusps.find((c) => c.house === house);
    if (!cusp) continue;
    console.log(
      `  House ${String(cusp.house).padStart(2)}  ${cusp.sign.padEnd(12)}` +
        `sign: ${cusp.signLord.padEnd(9)}star: ${cusp.starLord.padEnd(9)}sub: ${cusp.subLord}`,
    );
  }

  // The same response carries the four-level significator table, so steps 1 to 3
  // of a KP setup are one request rather than three.
  console.log('\n2. Four-level significators for those houses');
  const natalByHouse = new Map<number, string[]>();
  for (const house of HOUSES) {
    const entry = chart.significators.houseWise.find((h) => h.house === house);
    if (!entry) continue;
    // all[] lists a planet once per level it reaches the house at, so the same
    // planet can appear more than once. Deduplicated for the join in section 6.
    natalByHouse.set(house, [...new Set(entry.all)]);
    console.log(`  House ${house}`);
    for (const level of entry.significators) {
      console.log(
        `    L${level.level} ${level.description.padEnd(34)}${level.planets.join(', ') || '-'}`,
      );
    }
  }

  // Request 2: the five running lords. significators: true attaches each lord star
  // lord, sub lord, L1 to L4 houses and KP strength grade, so the running periods
  // and their signified houses are also one request.
  const { data: dasha, error: dashaErr } = await roxy.vedicAstrology.getCurrentDasha({
    body: {
      date: BIRTH.date,
      time: BIRTH.time,
      latitude,
      longitude,
      timezone,
      // Match the chart. Dasha dates default to Lahiri, and a KP reading wants both
      // halves on the same ayanamsa.
      ayanamsa: 'kp-newcomb',
      significators: true,
    },
  });
  if (dashaErr) throw new Error(dashaErr.error);

  const running = [
    ['Mahadasha', dasha.mahadasha],
    ['Antardasha', dasha.antardasha],
    ['Pratyantardasha', dasha.pratyantardasha],
    ['Sookshma', dasha.sookshmaDasha],
    ['Prana', dasha.pranaDasha],
  ] as const;

  console.log('\n3. Running dasha lords and the houses each signifies');
  for (const [level, period] of running) {
    const s = period.significators;
    const houses = s
      ? `L1 [${s.signifies.L1.join(' ')}]  L2 [${s.signifies.L2.join(' ')}]  ` +
        `L3 [${s.signifies.L3.join(' ')}]  L4 [${s.signifies.L4.join(' ')}]  ` +
        `${s.strength.grade} ${s.strength.label}`
      : '';
    console.log(`  ${level.padEnd(16)}${period.planet.padEnd(9)}${houses}`);
  }
  // commonHouses rides along with significators: true. It is the KP convergence
  // test, the houses every running level points at.
  const common = dasha.commonHouses;
  console.log(
    `  Common to all five levels: [${common?.allLevels.join(' ') || '-'}]  ` +
      `Maha plus Antar plus Pratyantar: [${common?.dashaBhuktiAntara.join(' ') || '-'}]`,
  );

  // Request 3: ruling planets for the moment. birthDate and birthTime are what make
  // the response carry which houses each ruling planet signifies IN THIS CHART.
  const moment = `${day}T${localTime(timezone)}`;
  const { data: rp, error: rpErr } = await roxy.vedicAstrology.getKpRulingPlanets({
    body: {
      latitude,
      longitude,
      timezone,
      datetime: moment,
      birthDate: BIRTH.date,
      birthTime: BIRTH.time,
    },
  });
  if (rpErr) throw new Error(rpErr.error);

  console.log(`\n4. Ruling planets at ${moment} (${timezone})`);
  console.log(
    `  day lord: ${rp.dayLord}   Moon sub: ${rp.moonSublord}   Lagna sub: ${rp.lagnaSublord}`,
  );
  for (const planet of rp.rulingPlanets) {
    const signifies = rp.significators?.find((s) => s.planet === planet);
    console.log(`  ${planet.padEnd(9)}signifies ${signifies?.signifies.join(', ') ?? '-'}`);
  }

  // Request 4: Moon sub lord boundaries. startDate and endDate are calendar days in
  // the timezone you pass, so one local day is the same date in both.
  const { data: moon, error: moonErr } = await roxy.vedicAstrology.getKpSublordChanges({
    body: { planet: 'Moon', startDate: day, endDate: day, timezone },
  });
  if (moonErr) throw new Error(moonErr.error);

  const boundaries = moon.changes;
  console.log(`\n5. Moon sub lord windows on ${day} (${boundaries.length} boundaries)`);
  if (boundaries[0]) {
    console.log(`  00:00 to ${boundaries[0].time}  ${boundaries[0].fromSublord}`);
  }
  boundaries.forEach((change, i) => {
    // The last window of the day runs to midnight; its closing boundary falls on
    // the next date, outside the day requested.
    const end = boundaries[i + 1]?.time ?? '24:00';
    console.log(
      `  ${change.time} to ${end}  ${change.toSublord.padEnd(9)}KP ${change.fromKp} to ${change.toKp}`,
    );
  });

  // Everything above is API output. Everything below is yours.
  const layers: HouseLayers[] = HOUSES.map((house) => ({
    house,
    natalSignificators: natalByHouse.get(house) ?? [],
    runningLords: running
      .filter(([, period]) => period.significators?.signifiedHouses.includes(house))
      .map(([level, period]) => `${period.planet} (${level})`),
    rulingPlanets: rp.rulingPlanets.filter((planet) =>
      rp.significators?.find((s) => s.planet === planet)?.signifies.includes(house),
    ),
  }));

  console.log('\n6. The four layers per house, joined and not weighted');
  for (const line of weighDay(layers)) console.log(line);
}

main().catch(console.error);
