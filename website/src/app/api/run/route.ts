import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const MAX_CODE_SIZE = 300_000;
const TIMEOUT_MS = 15_000;

interface RunRequest {
  code?: string;
}

function pythonCommand() {
  if (process.env.TORCHLEET_PYTHON) return process.env.TORCHLEET_PYTHON;

  const projectPython = path.resolve(process.cwd(), "..", ".venv", "bin", "python");
  return existsSync(projectPython) ? projectPython : "python3";
}

export async function POST(request: Request) {
  const body = (await request.json()) as RunRequest;
  const code = body.code ?? "";

  if (!code.trim()) {
    return Response.json(
      { error: "No code provided.", stdout: "", stderr: "", exitCode: 1 },
      { status: 400 },
    );
  }

  if (code.length > MAX_CODE_SIZE) {
    return Response.json(
      {
        error: "Code is too large.",
        stdout: "",
        stderr: "",
        exitCode: 1,
      },
      { status: 400 },
    );
  }

  const runDir = await mkdtemp(path.join(os.tmpdir(), "torchleet-run-"));
  const filePath = path.join(runDir, "solution.py");

  try {
    await writeFile(filePath, code, "utf8");

    const result = await execFileAsync(pythonCommand(), [filePath], {
      cwd: runDir,
      timeout: TIMEOUT_MS,
      maxBuffer: 1024 * 1024 * 5,
      env: {
        ...process.env,
        PYTHONPATH: "",
      },
    });

    return Response.json({
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: 0,
      timedOut: false,
    });
  } catch (error) {
    const err = error as NodeJS.ErrnoException & {
      stdout?: string;
      stderr?: string;
      code?: number | string;
      signal?: string;
      killed?: boolean;
    };

    return Response.json({
      stdout: err.stdout ?? "",
      stderr:
        err.stderr ||
        err.message ||
        "Execution failed. Make sure Python and required packages are installed.",
      exitCode: typeof err.code === "number" ? err.code : 1,
      timedOut: err.killed || err.signal === "SIGTERM",
    });
  } finally {
    await rm(runDir, { recursive: true, force: true });
  }
}
