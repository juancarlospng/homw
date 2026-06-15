export type UnitAvailabilityFilter = "Available" | "Reserved" | "Sold";

export type UnitFilters = {
  surface: number;
  budget: number;
  availability: UnitAvailabilityFilter[];
  bathrooms: number[];
  bedrooms: number[];
};

export type UnitRecord = {
  id: string;
  title: string;
  surface: number;
  budget: number;
  availability: UnitAvailabilityFilter | "Unknown";
  bathrooms: number;
  bedrooms: number;
  raw: Record<string, unknown>;
};

const SUPABASE_BASE_URL = "https://oabwxenpougurdzngyuy.supabase.co/rest/v1";
const SUPABASE_PROJECT_REF = "oabwxenpougurdzngyuy";
const DEFAULT_UNITS_TABLE = "unidades";
const UNIT_ROW_NAME_COLUMN = "Row Name";

export class SupabaseConfigurationError extends Error {
  constructor(message = "Missing Supabase anon key. Add it to explorer-config.js on Hostinger or use VITE_SUPABASE_ANON_KEY before building.") {
    super(message);
    this.name = "SupabaseConfigurationError";
  }
}

export class SupabaseRequestError extends Error {
  status: number;

  constructor(status: number, context: string) {
    const authMessage =
      status === 401 || status === 403
        ? "Supabase rejected the request. Check the anon key in explorer-config.js and the table API permissions."
        : `Supabase ${context} request failed: ${status}`;

    super(authMessage);
    this.name = "SupabaseRequestError";
    this.status = status;
  }
}

function getStringValue(record: Record<string, unknown>, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }

  return fallback;
}

function getNumberValue(record: Record<string, unknown>, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^\d.]/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return fallback;
}

function normalizeAvailability(value: string): UnitRecord["availability"] {
  const normalized = value.toLowerCase();
  if (normalized.includes("available")) return "Available";
  if (normalized.includes("reserved")) return "Reserved";
  if (normalized.includes("sold")) return "Sold";
  return "Unknown";
}

function normalizeSearchValue(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getNumericSearchValue(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).replace(/\D/g, "");
}

function getUnitRowNameFilterValue(identifier: string) {
  return getNumericSearchValue(identifier) || identifier.trim();
}

function getSupabaseToken() {
  const params = new URLSearchParams(window.location.search);
  const token = (
    params.get("supabaseToken") ??
    params.get("token") ??
    window.HOMW_EXPLORER_CONFIG?.supabaseAnonKey ??
    import.meta.env.VITE_SUPABASE_ANON_KEY ??
    ""
  );

  return token.replace(/^Bearer\s+/i, "").trim();
}

function decodeJwtPayload(token: string) {
  const payload = token.split(".")[1];
  if (!payload) return undefined;

  try {
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, "=");
    return JSON.parse(window.atob(paddedPayload)) as { ref?: string; role?: string };
  } catch {
    return undefined;
  }
}

function validateSupabaseToken(token: string) {
  if (/^https?:\/\//i.test(token)) {
    throw new SupabaseConfigurationError(
      "explorer-config.js has a Supabase URL in supabaseAnonKey. Paste the anon public key there; it starts with eyJ.",
    );
  }

  const payload = decodeJwtPayload(token);

  if (!payload) {
    throw new SupabaseConfigurationError(
      "The Supabase anon key in explorer-config.js is not a valid JWT. It should start with eyJ.",
    );
  }

  if (payload.ref && payload.ref !== SUPABASE_PROJECT_REF) {
    throw new SupabaseConfigurationError(
      `The Supabase anon key belongs to project ${payload.ref}, but this app calls ${SUPABASE_PROJECT_REF}.`,
    );
  }

  if (payload.role && payload.role !== "anon") {
    throw new SupabaseConfigurationError("Use the Supabase anon public key, not the service_role key.");
  }
}

export function hasSupabaseCredentials() {
  const token = getSupabaseToken();
  if (!token) return false;

  try {
    validateSupabaseToken(token);
    return true;
  } catch {
    return false;
  }
}

export function getSupabaseCredentialsError() {
  const token = getSupabaseToken();

  if (!token) {
    return "Add the Supabase anon key in explorer-config.js on Hostinger.";
  }

  try {
    validateSupabaseToken(token);
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : "Check the Supabase anon key in explorer-config.js.";
  }
}

function getSupabaseHeaders(): HeadersInit {
  const token = getSupabaseToken();

  if (!token) {
    throw new SupabaseConfigurationError();
  }

  validateSupabaseToken(token);

  return {
    apikey: token,
    Authorization: `Bearer ${token}`,
  };
}

function getUnitsTable() {
  const params = new URLSearchParams(window.location.search);
  return (
    params.get("supabaseUnitsTable") ??
    window.HOMW_EXPLORER_CONFIG?.supabaseUnitsTable ??
    import.meta.env.VITE_SUPABASE_UNITS_TABLE ??
    DEFAULT_UNITS_TABLE
  );
}

function normalizeUnit(record: Record<string, unknown>, index: number): UnitRecord {
  const id = getStringValue(record, ["Row Name", "rowname", "Unit", "unit", "number", "apartment", "unit_id", "unitId", "name", "id"], `unit-${index + 1}`);
  const title = getStringValue(record, ["Row Name", "rowname", "title", "name", "unit", "Unit", "number", "apartment"], id);
  const availability = normalizeAvailability(
    getStringValue(record, ["availability", "Availability", "status", "Status"], "Unknown"),
  );

  return {
    id,
    title,
    availability,
    bathrooms: getNumberValue(record, ["bathrooms", "bathroom_count", "Bathroomcount", "bathrooms_count"]),
    bedrooms: getNumberValue(record, ["bedrooms", "bedroom_count", "Bedroomcount", "bedrooms_count"]),
    budget: getNumberValue(record, ["budget", "price", "Price", "Budget"]),
    raw: record,
    surface: getNumberValue(record, ["surface", "Surface", "area", "m2", "sqm"]),
  };
}

export async function fetchUnitsFromSupabase() {
  const table = getUnitsTable();
  const url = `${SUPABASE_BASE_URL}/${encodeURIComponent(table)}?select=*`;
  const response = await fetch(url, { headers: getSupabaseHeaders(), cache: "no-store" });

  if (!response.ok) {
    throw new SupabaseRequestError(response.status, "units");
  }

  const data = (await response.json()) as Record<string, unknown>[];
  return data.map(normalizeUnit);
}

export async function fetchUnitByRowNameFromSupabase(identifier: string) {
  const table = getUnitsTable();
  const rowName = getUnitRowNameFilterValue(identifier);
  const params = new URLSearchParams({
    select: "*",
    [UNIT_ROW_NAME_COLUMN]: `eq.${rowName}`,
  });
  const url = `${SUPABASE_BASE_URL}/${encodeURIComponent(table)}?${params.toString()}`;
  console.info("[HOMW Supabase] Unit detail query", url);

  const response = await fetch(url, { headers: getSupabaseHeaders(), cache: "no-store" });

  if (!response.ok) {
    throw new SupabaseRequestError(response.status, "unit detail");
  }

  const data = (await response.json()) as Record<string, unknown>[];
  return data[0] ? normalizeUnit(data[0], 0) : undefined;
}

export function findUnitByIdentifier(units: UnitRecord[], identifier: string) {
  const normalizedIdentifier = normalizeSearchValue(identifier);
  const numericIdentifier = getNumericSearchValue(identifier);

  if (!normalizedIdentifier && !numericIdentifier) return undefined;

  return units.find((unit) => {
    const values = [
      unit.id,
      unit.title,
      unit.raw.id,
      unit.raw.unit_id,
      unit.raw.unitId,
      unit.raw.rowname,
      unit.raw["Row Name"],
      unit.raw.Unit,
      unit.raw.unit,
      unit.raw.name,
      unit.raw.number,
      unit.raw.apartment,
    ];

    return values.some((value) => {
      const normalizedValue = normalizeSearchValue(value);
      const numericValue = getNumericSearchValue(value);

      return (
        normalizedValue === normalizedIdentifier ||
        (!!numericIdentifier && numericValue === numericIdentifier)
      );
    });
  });
}

export async function fetchUnitFromSupabase(identifier: string) {
  return fetchUnitByRowNameFromSupabase(identifier);
}

export function filterUnits(units: UnitRecord[], filters: UnitFilters) {
  return units.filter((unit) => {
    const matchesSurface = !unit.surface || unit.surface >= filters.surface;
    const matchesBudget = !unit.budget || unit.budget <= filters.budget;
    const matchesAvailability =
      unit.availability === "Unknown" || filters.availability.includes(unit.availability);
    const matchesBedrooms = !unit.bedrooms || filters.bedrooms.includes(unit.bedrooms);
    const matchesBathrooms = !unit.bathrooms || filters.bathrooms.includes(unit.bathrooms);

    return matchesSurface && matchesBudget && matchesAvailability && matchesBedrooms && matchesBathrooms;
  });
}
