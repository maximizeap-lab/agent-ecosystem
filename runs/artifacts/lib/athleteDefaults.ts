// ─────────────────────────────────────────────
//  Athlete Profile – Default / Seed Data
// ─────────────────────────────────────────────
import type {
  AthleteFormValues,
  Sport,
  Team,
  AthleteListItem,
  Position,
} from "../types/athlete";

// ── Form defaults ─────────────────────────────
export function createAthleteDefaults(): AthleteFormValues {
  return {
    firstName: "",
    lastName: "",
    preferredName: "",
    dateOfBirth: "",
    gender: "prefer_not_to_say",
    nationality: "",
    secondaryNationality: "",
    avatarUrl: "",
    bannerUrl: "",
    bio: "",

    email: "",
    phone: "",
    address: {
      street: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
    },

    primarySportId: "",
    primaryTeamId: "",
    jerseyNumber: undefined,
    primaryPositionId: "",
    secondaryPositionId: "",

    careerHistory: [],

    physicalStats: {
      heightCm: undefined,
      weightKg: undefined,
      unit: "metric",
      dominantHand: undefined,
      dominantFoot: undefined,
      wingspan: undefined,
      verticalJump: undefined,
      fortyYardDash: undefined,
    },

    status: "active",
    joinedDate: new Date().toISOString().split("T")[0],
    agentName: "",
    agentEmail: "",
    agentPhone: "",

    socialLinks: {
      instagram: "",
      twitter: "",
      facebook: "",
      tiktok: "",
      youtube: "",
      website: "",
    },

    emergencyContacts: [],

    medicalInfo: {
      bloodType: "",
      allergies: [],
      existingConditions: [],
      medications: [],
      notes: "",
    },
  };
}

// ── Seed – Sports ─────────────────────────────
export const SPORTS: Sport[] = [
  { id: "basketball", name: "Basketball", category: "team" },
  { id: "soccer",     name: "Soccer",     category: "team" },
  { id: "football",   name: "Football",   category: "team" },
  { id: "baseball",   name: "Baseball",   category: "team" },
  { id: "hockey",     name: "Ice Hockey", category: "team" },
  { id: "volleyball", name: "Volleyball", category: "team" },
  { id: "tennis",     name: "Tennis",     category: "individual" },
  { id: "golf",       name: "Golf",       category: "individual" },
  { id: "swimming",   name: "Swimming",   category: "individual" },
  { id: "athletics",  name: "Athletics",  category: "individual" },
  { id: "cycling",    name: "Cycling",    category: "individual" },
  { id: "boxing",     name: "Boxing",     category: "combat" },
  { id: "mma",        name: "MMA",        category: "combat" },
  { id: "wrestling",  name: "Wrestling",  category: "combat" },
  { id: "rugby",      name: "Rugby",      category: "team" },
  { id: "cricket",    name: "Cricket",    category: "team" },
];

// ── Seed – Positions per sport ────────────────
export const POSITIONS: Record<string, Position[]> = {
  basketball: [
    { id: "pg",  name: "Point Guard",      abbreviation: "PG",  sportId: "basketball" },
    { id: "sg",  name: "Shooting Guard",   abbreviation: "SG",  sportId: "basketball" },
    { id: "sf",  name: "Small Forward",    abbreviation: "SF",  sportId: "basketball" },
    { id: "pf",  name: "Power Forward",    abbreviation: "PF",  sportId: "basketball" },
    { id: "c",   name: "Center",           abbreviation: "C",   sportId: "basketball" },
  ],
  soccer: [
    { id: "gk",  name: "Goalkeeper",       abbreviation: "GK",  sportId: "soccer" },
    { id: "cb",  name: "Center Back",      abbreviation: "CB",  sportId: "soccer" },
    { id: "lb",  name: "Left Back",        abbreviation: "LB",  sportId: "soccer" },
    { id: "rb",  name: "Right Back",       abbreviation: "RB",  sportId: "soccer" },
    { id: "cm",  name: "Central Midfield", abbreviation: "CM",  sportId: "soccer" },
    { id: "am",  name: "Attacking Mid",    abbreviation: "AM",  sportId: "soccer" },
    { id: "lw",  name: "Left Wing",        abbreviation: "LW",  sportId: "soccer" },
    { id: "rw",  name: "Right Wing",       abbreviation: "RW",  sportId: "soccer" },
    { id: "cf",  name: "Centre Forward",   abbreviation: "CF",  sportId: "soccer" },
    { id: "st",  name: "Striker",          abbreviation: "ST",  sportId: "soccer" },
  ],
  football: [
    { id: "qb",  name: "Quarterback",      abbreviation: "QB",  sportId: "football" },
    { id: "rb",  name: "Running Back",     abbreviation: "RB",  sportId: "football" },
    { id: "wr",  name: "Wide Receiver",    abbreviation: "WR",  sportId: "football" },
    { id: "te",  name: "Tight End",        abbreviation: "TE",  sportId: "football" },
    { id: "ol",  name: "Offensive Line",   abbreviation: "OL",  sportId: "football" },
    { id: "de",  name: "Defensive End",    abbreviation: "DE",  sportId: "football" },
    { id: "dt",  name: "Defensive Tackle", abbreviation: "DT",  sportId: "football" },
    { id: "lb2", name: "Linebacker",       abbreviation: "LB",  sportId: "football" },
    { id: "cb2", name: "Cornerback",       abbreviation: "CB",  sportId: "football" },
    { id: "s",   name: "Safety",           abbreviation: "S",   sportId: "football" },
    { id: "k",   name: "Kicker",           abbreviation: "K",   sportId: "football" },
    { id: "p",   name: "Punter",           abbreviation: "P",   sportId: "football" },
  ],
  baseball: [
    { id: "p2",  name: "Pitcher",          abbreviation: "P",   sportId: "baseball" },
    { id: "c2",  name: "Catcher",          abbreviation: "C",   sportId: "baseball" },
    { id: "1b",  name: "First Base",       abbreviation: "1B",  sportId: "baseball" },
    { id: "2b",  name: "Second Base",      abbreviation: "2B",  sportId: "baseball" },
    { id: "3b",  name: "Third Base",       abbreviation: "3B",  sportId: "baseball" },
    { id: "ss",  name: "Shortstop",        abbreviation: "SS",  sportId: "baseball" },
    { id: "lf",  name: "Left Field",       abbreviation: "LF",  sportId: "baseball" },
    { id: "cf",  name: "Center Field",     abbreviation: "CF",  sportId: "baseball" },
    { id: "rf",  name: "Right Field",      abbreviation: "RF",  sportId: "baseball" },
  ],
};

// ── Seed – Teams ──────────────────────────────
export const TEAMS: Team[] = [
  { id: "lakers",   name: "Los Angeles Lakers",   city: "Los Angeles",  country: "USA", sportId: "basketball", division: "Pacific",   league: "NBA" },
  { id: "bulls",    name: "Chicago Bulls",         city: "Chicago",      country: "USA", sportId: "basketball", division: "Central",   league: "NBA" },
  { id: "warriors", name: "Golden State Warriors", city: "San Francisco",country: "USA", sportId: "basketball", division: "Pacific",   league: "NBA" },
  { id: "barcelona",name: "FC Barcelona",          city: "Barcelona",    country: "ESP", sportId: "soccer",     division: "Primera",   league: "La Liga" },
  { id: "madrid",   name: "Real Madrid",           city: "Madrid",       country: "ESP", sportId: "soccer",     division: "Primera",   league: "La Liga" },
  { id: "manu",     name: "Manchester United",     city: "Manchester",   country: "ENG", sportId: "soccer",     division: "Premier",   league: "Premier League" },
  { id: "chiefs",   name: "Kansas City Chiefs",    city: "Kansas City",  country: "USA", sportId: "football",   division: "AFC West",  league: "NFL" },
  { id: "eagles",   name: "Philadelphia Eagles",   city: "Philadelphia", country: "USA", sportId: "football",   division: "NFC East",  league: "NFL" },
  { id: "yankees",  name: "New York Yankees",      city: "New York",     country: "USA", sportId: "baseball",   division: "AL East",   league: "MLB" },
  { id: "dodgers",  name: "Los Angeles Dodgers",   city: "Los Angeles",  country: "USA", sportId: "baseball",   division: "NL West",   league: "MLB" },
];

// ── Seed – Nationalities ──────────────────────
export const NATIONALITIES = [
  "American", "British", "Brazilian", "French", "German", "Spanish", "Italian",
  "Portuguese", "Argentine", "Mexican", "Canadian", "Australian", "Japanese",
  "South Korean", "Chinese", "Nigerian", "Ghanaian", "Senegalese", "South African",
  "Dutch", "Belgian", "Swiss", "Swedish", "Norwegian", "Danish", "Finnish",
  "Polish", "Croatian", "Serbian", "Greek", "Turkish", "Russian", "Ukrainian",
  "Colombian", "Uruguayan", "Chilean", "Peruvian", "Ecuadorian", "Venezuelan",
  "Moroccan", "Egyptian", "Ivorian", "Cameroonian", "Algerian",
  "Indian", "Pakistani", "Bangladeshi", "Sri Lankan", "Jamaican", "Trinidadian",
];

export const BLOOD_TYPES = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"];

// ── Mock athlete list (demo data) ─────────────
export const MOCK_ATHLETES: AthleteListItem[] = [
  {
    id: "a1", firstName: "James",    lastName: "Mitchell",  avatarUrl: "", primarySport: "Basketball",
    primaryTeam: "Los Angeles Lakers",   jerseyNumber: 23, status: "active",    nationality: "American",   dateOfBirth: "1999-03-12", updatedAt: "2024-11-01",
  },
  {
    id: "a2", firstName: "Sofia",    lastName: "Ramirez",   avatarUrl: "", primarySport: "Soccer",
    primaryTeam: "FC Barcelona",         jerseyNumber: 10, status: "active",    nationality: "Spanish",    dateOfBirth: "2001-07-22", updatedAt: "2024-10-28",
  },
  {
    id: "a3", firstName: "Marcus",   lastName: "Thompson",  avatarUrl: "", primarySport: "Football",
    primaryTeam: "Kansas City Chiefs",   jerseyNumber: 15, status: "injured",   nationality: "American",   dateOfBirth: "1997-01-05", updatedAt: "2024-11-03",
  },
  {
    id: "a4", firstName: "Yuki",     lastName: "Tanaka",    avatarUrl: "", primarySport: "Baseball",
    primaryTeam: "New York Yankees",     jerseyNumber: 7,  status: "active",    nationality: "Japanese",   dateOfBirth: "2000-09-18", updatedAt: "2024-10-15",
  },
  {
    id: "a5", firstName: "Amara",    lastName: "Diallo",    avatarUrl: "", primarySport: "Soccer",
    primaryTeam: "Manchester United",    jerseyNumber: 9,  status: "active",    nationality: "Senegalese", dateOfBirth: "1998-04-30", updatedAt: "2024-11-02",
  },
  {
    id: "a6", firstName: "Lena",     lastName: "Fischer",   avatarUrl: "", primarySport: "Athletics",
    primaryTeam: undefined,              jerseyNumber: undefined, status: "active", nationality: "German", dateOfBirth: "2002-06-14", updatedAt: "2024-09-22",
  },
  {
    id: "a7", firstName: "Carlos",   lastName: "Herrera",   avatarUrl: "", primarySport: "Basketball",
    primaryTeam: "Golden State Warriors",jerseyNumber: 3,  status: "suspended", nationality: "Argentine", dateOfBirth: "1996-12-08", updatedAt: "2024-10-30",
  },
  {
    id: "a8", firstName: "Grace",    lastName: "Okonkwo",   avatarUrl: "", primarySport: "Athletics",
    primaryTeam: undefined,              jerseyNumber: undefined, status: "retired", nationality: "Nigerian", dateOfBirth: "1988-02-25", updatedAt: "2024-08-11",
  },
];
