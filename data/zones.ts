// Bundled zip -> zone + frost dataset. Keyed by 3-digit zip prefix, which the
// PRD accepts for V1 (§5 Phase 2). Frost dates are MM-DD; the plan year is
// applied at lookup time so the data stays year-agnostic.
//
// Phase 4 replaces this with a live lookup and keeps this table as the
// offline fallback.

export interface ZoneRecord {
  city: string;
  zone: string;
  /** Average last spring frost, MM-DD. */
  lastFrost: string;
  /** Average first fall frost, MM-DD. */
  firstFrost: string;
}

export const ZONES_BY_PREFIX: Record<string, ZoneRecord> = {
  // Northeast
  "010": { city: "Springfield, MA", zone: "6a", lastFrost: "04-28", firstFrost: "10-12" },
  "021": { city: "Boston, MA", zone: "6b", lastFrost: "04-15", firstFrost: "10-25" },
  "030": { city: "Manchester, NH", zone: "5b", lastFrost: "05-10", firstFrost: "09-28" },
  "041": { city: "Portland, ME", zone: "5b", lastFrost: "05-05", firstFrost: "10-03" },
  "052": { city: "Burlington, VT", zone: "5a", lastFrost: "05-12", firstFrost: "09-28" },
  "068": { city: "Bridgeport, CT", zone: "7a", lastFrost: "04-12", firstFrost: "10-28" },
  "100": { city: "New York, NY", zone: "7b", lastFrost: "04-05", firstFrost: "11-05" },
  "117": { city: "Hempstead, NY", zone: "7a", lastFrost: "04-12", firstFrost: "11-01" },
  "122": { city: "Albany, NY", zone: "5b", lastFrost: "05-05", firstFrost: "10-02" },
  "142": { city: "Buffalo, NY", zone: "6a", lastFrost: "05-01", firstFrost: "10-15" },
  "070": { city: "Newark, NJ", zone: "7a", lastFrost: "04-15", firstFrost: "10-28" },
  "085": { city: "Trenton, NJ", zone: "7a", lastFrost: "04-18", firstFrost: "10-22" },
  "151": { city: "Pittsburgh, PA", zone: "6b", lastFrost: "04-25", firstFrost: "10-18" },
  "170": { city: "Harrisburg, PA", zone: "6b", lastFrost: "04-20", firstFrost: "10-20" },
  "191": { city: "Philadelphia, PA", zone: "7b", lastFrost: "04-02", firstFrost: "11-08" },

  // Mid-Atlantic and Southeast
  "197": { city: "Wilmington, DE", zone: "7a", lastFrost: "04-15", firstFrost: "10-28" },
  "212": { city: "Baltimore, MD", zone: "7b", lastFrost: "04-05", firstFrost: "11-02" },
  "200": { city: "Washington, DC", zone: "7b", lastFrost: "04-02", firstFrost: "11-05" },
  "232": { city: "Richmond, VA", zone: "7b", lastFrost: "04-08", firstFrost: "10-30" },
  "252": { city: "Charleston, WV", zone: "6b", lastFrost: "04-22", firstFrost: "10-18" },
  "272": { city: "Durham, NC", zone: "7b", lastFrost: "04-05", firstFrost: "11-01" },
  "282": { city: "Charlotte, NC", zone: "8a", lastFrost: "03-28", firstFrost: "11-08" },
  "294": { city: "Columbia, SC", zone: "8a", lastFrost: "03-22", firstFrost: "11-12" },
  "303": { city: "Atlanta, GA", zone: "8a", lastFrost: "03-25", firstFrost: "11-10" },
  "315": { city: "Savannah, GA", zone: "8b", lastFrost: "03-08", firstFrost: "11-25" },
  "322": { city: "Jacksonville, FL", zone: "9a", lastFrost: "02-25", firstFrost: "12-08" },
  "328": { city: "Orlando, FL", zone: "9b", lastFrost: "02-08", firstFrost: "12-18" },
  "331": { city: "Miami, FL", zone: "10b", lastFrost: "01-10", firstFrost: "12-31" },
  "335": { city: "Tampa, FL", zone: "9b", lastFrost: "02-05", firstFrost: "12-20" },
  "352": { city: "Birmingham, AL", zone: "8a", lastFrost: "03-25", firstFrost: "11-05" },
  "372": { city: "Nashville, TN", zone: "7a", lastFrost: "04-10", firstFrost: "10-28" },
  "381": { city: "Memphis, TN", zone: "7b", lastFrost: "03-28", firstFrost: "11-05" },
  "392": { city: "Jackson, MS", zone: "8b", lastFrost: "03-12", firstFrost: "11-08" },
  "402": { city: "Louisville, KY", zone: "6b", lastFrost: "04-15", firstFrost: "10-25" },
  "700": { city: "New Orleans, LA", zone: "9b", lastFrost: "02-15", firstFrost: "12-10" },

  // Midwest
  "432": { city: "Columbus, OH", zone: "6a", lastFrost: "04-28", firstFrost: "10-15" },
  "441": { city: "Cleveland, OH", zone: "6b", lastFrost: "04-25", firstFrost: "10-22" },
  "452": { city: "Cincinnati, OH", zone: "6b", lastFrost: "04-18", firstFrost: "10-22" },
  "462": { city: "Indianapolis, IN", zone: "6a", lastFrost: "04-25", firstFrost: "10-15" },
  "474": { city: "Bloomington, IN", zone: "6b", lastFrost: "04-22", firstFrost: "10-21" },
  "481": { city: "Detroit, MI", zone: "6b", lastFrost: "04-28", firstFrost: "10-18" },
  "495": { city: "Grand Rapids, MI", zone: "6a", lastFrost: "05-05", firstFrost: "10-10" },
  "497": { city: "Traverse City, MI", zone: "5b", lastFrost: "05-15", firstFrost: "10-05" },
  "532": { city: "Milwaukee, WI", zone: "5b", lastFrost: "05-02", firstFrost: "10-12" },
  "537": { city: "Madison, WI", zone: "5a", lastFrost: "05-05", firstFrost: "10-05" },
  "548": { city: "Eau Claire, WI", zone: "4b", lastFrost: "05-12", firstFrost: "09-28" },
  "554": { city: "Minneapolis, MN", zone: "4b", lastFrost: "05-08", firstFrost: "10-01" },
  "558": { city: "Duluth, MN", zone: "3b", lastFrost: "05-22", firstFrost: "09-18" },
  "566": { city: "Bemidji, MN", zone: "3a", lastFrost: "05-28", firstFrost: "09-10" },
  "581": { city: "Fargo, ND", zone: "4a", lastFrost: "05-15", firstFrost: "09-22" },
  "570": { city: "Sioux Falls, SD", zone: "4b", lastFrost: "05-08", firstFrost: "10-02" },
  "601": { city: "Chicago, IL", zone: "6a", lastFrost: "04-28", firstFrost: "10-15" },
  "627": { city: "Springfield, IL", zone: "6a", lastFrost: "04-20", firstFrost: "10-15" },
  "503": { city: "Des Moines, IA", zone: "5b", lastFrost: "04-28", firstFrost: "10-10" },
  "631": { city: "St. Louis, MO", zone: "7a", lastFrost: "04-08", firstFrost: "10-28" },
  "641": { city: "Kansas City, MO", zone: "6b", lastFrost: "04-15", firstFrost: "10-22" },
  "666": { city: "Topeka, KS", zone: "6a", lastFrost: "04-18", firstFrost: "10-18" },
  "681": { city: "Omaha, NE", zone: "5b", lastFrost: "04-25", firstFrost: "10-10" },

  // Plains, Mountain and Southwest
  "730": { city: "Oklahoma City, OK", zone: "7a", lastFrost: "04-02", firstFrost: "11-02" },
  "752": { city: "Dallas, TX", zone: "8b", lastFrost: "03-12", firstFrost: "11-18" },
  "770": { city: "Houston, TX", zone: "9a", lastFrost: "02-20", firstFrost: "12-05" },
  "782": { city: "San Antonio, TX", zone: "9a", lastFrost: "03-01", firstFrost: "11-28" },
  "787": { city: "Austin, TX", zone: "8b", lastFrost: "03-05", firstFrost: "11-25" },
  "798": { city: "El Paso, TX", zone: "8a", lastFrost: "03-18", firstFrost: "11-08" },
  "802": { city: "Denver, CO", zone: "5b", lastFrost: "05-05", firstFrost: "10-05" },
  "816": { city: "Pueblo, CO", zone: "6a", lastFrost: "04-28", firstFrost: "10-12" },
  "820": { city: "Cheyenne, WY", zone: "5a", lastFrost: "05-20", firstFrost: "09-25" },
  "591": { city: "Billings, MT", zone: "4b", lastFrost: "05-12", firstFrost: "09-25" },
  "598": { city: "Missoula, MT", zone: "5a", lastFrost: "05-18", firstFrost: "09-22" },
  "832": { city: "Boise, ID", zone: "7a", lastFrost: "04-25", firstFrost: "10-12" },
  "841": { city: "Salt Lake City, UT", zone: "7a", lastFrost: "04-20", firstFrost: "10-20" },
  "852": { city: "Phoenix, AZ", zone: "9b", lastFrost: "01-28", firstFrost: "12-15" },
  "857": { city: "Tucson, AZ", zone: "9a", lastFrost: "02-18", firstFrost: "11-28" },
  "871": { city: "Albuquerque, NM", zone: "7b", lastFrost: "04-12", firstFrost: "10-28" },
  "891": { city: "Las Vegas, NV", zone: "9a", lastFrost: "02-15", firstFrost: "12-01" },
  "895": { city: "Reno, NV", zone: "6b", lastFrost: "05-12", firstFrost: "10-05" },

  // West Coast and noncontiguous
  "900": { city: "Los Angeles, CA", zone: "10a", lastFrost: "01-20", firstFrost: "12-28" },
  "921": { city: "San Diego, CA", zone: "10b", lastFrost: "01-10", firstFrost: "12-31" },
  "941": { city: "San Francisco, CA", zone: "10a", lastFrost: "01-25", firstFrost: "12-28" },
  "958": { city: "Sacramento, CA", zone: "9b", lastFrost: "02-12", firstFrost: "12-05" },
  "972": { city: "Portland, OR", zone: "8b", lastFrost: "03-22", firstFrost: "11-12" },
  "981": { city: "Seattle, WA", zone: "8b", lastFrost: "03-20", firstFrost: "11-15" },
  "992": { city: "Spokane, WA", zone: "6b", lastFrost: "05-02", firstFrost: "10-08" },
  "967": { city: "Honolulu, HI", zone: "11b", lastFrost: "01-01", firstFrost: "12-31" },
  "995": { city: "Anchorage, AK", zone: "4b", lastFrost: "05-18", firstFrost: "09-15" },
};

/** Every USDA zone the manual fallback offers (PRD §4.2). */
export const ALL_ZONES = [
  "3a", "3b", "4a", "4b", "5a", "5b", "6a", "6b", "7a",
  "7b", "8a", "8b", "9a", "9b", "10a", "10b", "11a", "11b",
] as const;

/**
 * Typical frost dates per zone, used when the gardener picks a zone by hand
 * and we have no zip to derive from.
 */
export const ZONE_DEFAULTS: Record<string, { lastFrost: string; firstFrost: string }> = {
  "3a": { lastFrost: "05-28", firstFrost: "09-10" },
  "3b": { lastFrost: "05-22", firstFrost: "09-18" },
  "4a": { lastFrost: "05-15", firstFrost: "09-22" },
  "4b": { lastFrost: "05-08", firstFrost: "10-01" },
  "5a": { lastFrost: "05-05", firstFrost: "10-05" },
  "5b": { lastFrost: "04-28", firstFrost: "10-10" },
  "6a": { lastFrost: "04-28", firstFrost: "10-12" },
  "6b": { lastFrost: "04-22", firstFrost: "10-21" },
  "7a": { lastFrost: "04-12", firstFrost: "10-28" },
  "7b": { lastFrost: "04-05", firstFrost: "11-05" },
  "8a": { lastFrost: "03-28", firstFrost: "11-10" },
  "8b": { lastFrost: "03-15", firstFrost: "11-22" },
  "9a": { lastFrost: "02-25", firstFrost: "12-05" },
  "9b": { lastFrost: "02-10", firstFrost: "12-18" },
  "10a": { lastFrost: "01-22", firstFrost: "12-28" },
  "10b": { lastFrost: "01-10", firstFrost: "12-31" },
  "11a": { lastFrost: "01-01", firstFrost: "12-31" },
  "11b": { lastFrost: "01-01", firstFrost: "12-31" },
};
