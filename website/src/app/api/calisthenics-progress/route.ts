import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type LogEntry = {
  id: string;
  date: string;
  session: string;
  pain: number;
  rpe: number;
  sleep: number;
  note: string;
};

type ProgressPayload = {
  completed: Record<string, boolean>;
  logs: LogEntry[];
  settings: {
    week: number;
    rehabWeek: number;
    sessionIndex: number;
  };
  updatedAt?: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "calisthenics-progress.json");
const PROGRESS_ROW_ID = "default";

const defaultProgress: ProgressPayload = {
  completed: {},
  logs: [],
  settings: {
    week: 1,
    rehabWeek: 1,
    sessionIndex: 0,
  },
};

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numberValue)));
}

function normalizeProgress(value: Partial<ProgressPayload> | null): ProgressPayload {
  const settings = value?.settings ?? defaultProgress.settings;
  const logs = Array.isArray(value?.logs) ? value.logs : [];
  const completed =
    value?.completed && typeof value.completed === "object"
      ? Object.fromEntries(
          Object.entries(value.completed).filter(([, done]) => typeof done === "boolean"),
        )
      : {};

  return {
    completed,
    logs: logs
      .filter((entry) => entry && typeof entry === "object")
      .slice(0, 200)
      .map((entry) => ({
        id: String(entry.id ?? crypto.randomUUID()),
        date: String(entry.date ?? ""),
        session: String(entry.session ?? ""),
        pain: clampNumber(entry.pain, 0, 10, 0),
        rpe: clampNumber(entry.rpe, 1, 10, 7),
        sleep: Math.min(14, Math.max(0, Number(entry.sleep) || 0)),
        note: String(entry.note ?? "").slice(0, 1000),
      })),
    settings: {
      week: clampNumber(settings.week, 1, 16, 1),
      rehabWeek: clampNumber(settings.rehabWeek, 1, 8, 1),
      sessionIndex: clampNumber(settings.sessionIndex, 0, 3, 0),
    },
    updatedAt: value?.updatedAt ? String(value.updatedAt) : undefined,
  };
}

async function readProgress() {
  try {
    const content = await readFile(DATA_FILE, "utf8");
    return normalizeProgress(JSON.parse(content) as ProgressPayload);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return defaultProgress;
    throw error;
  }
}

async function writeProgress(progress: ProgressPayload) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, `${JSON.stringify(progress, null, 2)}\n`, "utf8");
}

function storageMode() {
  return process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    ? "supabase"
    : "local-json";
}

function checkAccess(request: Request) {
  const expectedCode = process.env.CALISTHENICS_ACCESS_CODE?.trim();
  if (!expectedCode) return true;
  return request.headers.get("x-calisthenics-code") === expectedCode;
}

function unauthorized() {
  return Response.json(
    { error: "Access code required.", requiresAccessCode: true },
    { status: 401 },
  );
}

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  return {
    apikey: key ?? "",
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function supabaseBaseUrl() {
  const projectUrl = (process.env.SUPABASE_URL ?? "")
    .trim()
    .replace(/\/rest\/v1\/?$/, "")
    .replace(/\/$/, "");

  return `${projectUrl}/rest/v1/calisthenics_progress`;
}

async function readSupabaseProgress() {
  const response = await fetch(
    `${supabaseBaseUrl()}?id=eq.${PROGRESS_ROW_ID}&select=data,updated_at&limit=1`,
    {
      headers: supabaseHeaders(),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase read failed: ${response.status} ${details}`);
  }

  const rows = (await response.json()) as Array<{
    data?: Partial<ProgressPayload>;
    updated_at?: string;
  }>;
  const row = rows[0];
  if (!row) return defaultProgress;

  return normalizeProgress({
    ...row.data,
    updatedAt: row.updated_at ?? row.data?.updatedAt,
  });
}

async function writeSupabaseProgress(progress: ProgressPayload) {
  const response = await fetch(
    `${supabaseBaseUrl()}?on_conflict=id`,
    {
      method: "POST",
      headers: {
        ...supabaseHeaders(),
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify([
        {
          id: PROGRESS_ROW_ID,
          data: progress,
          updated_at: progress.updatedAt,
        },
      ]),
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase write failed: ${response.status} ${details}`);
  }
}

async function readFromConfiguredStorage() {
  if (storageMode() === "supabase") return readSupabaseProgress();
  return readProgress();
}

async function writeToConfiguredStorage(progress: ProgressPayload) {
  if (storageMode() === "supabase") {
    await writeSupabaseProgress(progress);
    return;
  }

  await writeProgress(progress);
}

export async function GET(request: Request) {
  if (!checkAccess(request)) return unauthorized();

  try {
    return Response.json({
      ...(await readFromConfiguredStorage()),
      storage: storageMode(),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to read progress.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!checkAccess(request)) return unauthorized();

  try {
    const body = normalizeProgress((await request.json()) as Partial<ProgressPayload>);
    const progress = {
      ...body,
      updatedAt: new Date().toISOString(),
    };
    await writeToConfiguredStorage(progress);
    return Response.json({
      ...progress,
      storage: storageMode(),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save progress.",
      },
      { status: 500 },
    );
  }
}
