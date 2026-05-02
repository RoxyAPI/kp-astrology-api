"""
KP astrology chart: sub lord and sub-sub lord precision for all 12 cusps and 9 planets.
Uses Placidus houses and KP Newcomb ayanamsa via the RoxyAPI vedic_astrology domain.
"""

import os
from roxy_sdk import create_roxy

roxy = create_roxy(os.environ["ROXY_API_KEY"])


def main():
    # Step 1: geocode the birth city - never hardcode coordinates
    loc = roxy.location.search_cities(q="New Delhi")
    city = loc["cities"][0]
    lat = city["latitude"]
    lng = city["longitude"]
    tz = city["timezone"]

    # Step 2: generate the KP astrology chart
    chart = roxy.vedic_astrology.generate_kp_chart(
        date="1990-07-04",
        time="10:12:00",
        latitude=lat,
        longitude=lng,
        timezone=tz,
    )

    print("Ayanamsa:", chart["meta"]["ayanamsa"])
    print("House system:", chart["meta"]["houseSystem"])
    print("Ascendant sign:", chart["ascendant"]["sign"])
    print("Ascendant sub lord:", chart["ascendant"]["subLord"])

    print("\nAll 12 cusps:")
    for cusp in chart["cusps"]:
        print(
            f"  House {cusp['house']}: {cusp['sign']} | "
            f"star: {cusp['starLord']} | sub: {cusp['subLord']} | ssl: {cusp['subSubLord']}"
        )

    print("\nPlanets:")
    for planet in chart["planets"]:
        retro = " (R)" if planet["retrograde"] else ""
        print(
            f"  {planet['planet']}: {planet['sign']} H{planet['house']} "
            f"sub={planet['subLord']}{retro}"
        )

    print("\nRahu:", chart["nodes"]["rahu"]["sign"], "H" + str(chart["nodes"]["rahu"]["house"]),
          "sub=" + chart["nodes"]["rahu"]["subLord"])
    print("Ketu:", chart["nodes"]["ketu"]["sign"], "H" + str(chart["nodes"]["ketu"]["house"]),
          "sub=" + chart["nodes"]["ketu"]["subLord"])


if __name__ == "__main__":
    main()
