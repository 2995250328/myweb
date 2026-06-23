"use client";

import { useEffect, useMemo, useState } from "react";
import type { ElementType, ReactNode } from "react";
import CodeBlock from "@/components/practice/CodeBlock";
import CodeEditor from "@/components/practice/CodeEditor";
import {
  getColabUrl,
  getDownloadUrl,
  questions,
  type Difficulty,
  type Question,
  type QuestionSet,
} from "@/data/questions";

type Language = "zh" | "en";
type Panel = "problem" | "solution";
type CodeAppearance = "light" | "dark";

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut?: boolean;
  error?: string;
}

interface NotebookPayload {
  id: string;
  prompt: Record<Language, string>;
  starterCode: string;
  solution: {
    markdown: string;
    code: string;
  };
  error?: string;
}

const setLabels: Record<QuestionSet | "all", string> = {
  all: "全部",
  v1: "PyTorch",
  v2: "LLM",
  v3: "Advanced",
};

const difficultyLabels: Record<Difficulty, string> = {
  basic: "基础",
  easy: "简单",
  medium: "中等",
  hard: "困难",
  expert: "专家",
};

const difficultyTone: Record<Difficulty, string> = {
  basic: "text-sky-700 bg-sky-50 border-sky-200",
  easy: "text-emerald-700 bg-emerald-50 border-emerald-200",
  medium: "text-amber-700 bg-amber-50 border-amber-200",
  hard: "text-rose-700 bg-rose-50 border-rose-200",
  expert: "text-fuchsia-700 bg-fuchsia-50 border-fuchsia-200",
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function renderMarkdown(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];
  let codeLines: string[] = [];
  let inCode = false;

  const flushList = () => {
    if (!listItems.length) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="my-3 list-disc space-y-1 pl-5">
        {listItems.map((item, index) => (
          <li key={index}>{formatInline(item)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  const flushCode = () => {
    if (!codeLines.length) return;
    blocks.push(
      <pre
        key={`code-${blocks.length}`}
        className="my-4 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-800"
      >
        <code>{codeLines.join("\n")}</code>
      </pre>,
    );
    codeLines = [];
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();

    if (line.trim().startsWith("```")) {
      if (inCode) {
        inCode = false;
        flushCode();
      } else {
        flushList();
        inCode = true;
      }
      return;
    }

    if (inCode) {
      codeLines.push(rawLine);
      return;
    }

    if (!line.trim()) {
      flushList();
      return;
    }

    if (line === "---") {
      flushList();
      blocks.push(<hr key={`hr-${blocks.length}`} className="my-5 border-slate-200" />);
      return;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushList();
      const level = heading[1].length;
      const text = heading[2];
      const Tag = `h${Math.min(level + 1, 4)}` as ElementType;
      blocks.push(
        <Tag
          key={`heading-${blocks.length}`}
          className={classNames(
            "font-semibold text-slate-950",
            level === 1 && "mb-4 mt-1 text-2xl",
            level === 2 && "mb-3 mt-6 text-lg",
            level >= 3 && "mb-2 mt-5 text-base",
          )}
        >
          {formatInline(text)}
        </Tag>,
      );
      return;
    }

    const bullet = line.match(/^[-*]\s+(.*)$/) ?? line.match(/^\d+\.\s+(.*)$/);
    if (bullet) {
      listItems.push(bullet[1]);
      return;
    }

    flushList();
    blocks.push(
      <p key={`p-${blocks.length}`} className="my-3 leading-7 text-slate-700">
        {formatInline(line)}
      </p>,
    );
  });

  flushList();
  flushCode();
  return blocks;
}

function formatInline(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.9em] text-slate-900"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function PracticeApp() {
  const [activeSet, setActiveSet] = useState<QuestionSet | "all">("v3");
  const [language, setLanguage] = useState<Language>("zh");
  const [panel, setPanel] = useState<Panel>("problem");
  const [selectedId, setSelectedId] = useState("v3-1");
  const [search, setSearch] = useState("");
  const [payload, setPayload] = useState<NotebookPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [completed, setCompleted] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [codeAppearance, setCodeAppearance] = useState<CodeAppearance>("light");

  const visibleQuestions = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return questions.filter((question) => {
      const setMatch = activeSet === "all" || question.set === activeSet;
      const textMatch =
        !needle ||
        question.title.toLowerCase().includes(needle) ||
        question.id.toLowerCase().includes(needle) ||
        question.companies.some((company) =>
          company.toLowerCase().includes(needle),
        );
      return setMatch && textMatch;
    });
  }, [activeSet, search]);

  const selectedQuestion =
    questions.find((question) => question.id === selectedId) ?? questions[0];
  const selectedIndex = questions.findIndex(
    (question) => question.id === selectedQuestion.id,
  );

  useEffect(() => {
    const saved = window.localStorage.getItem("torchleet-completed");
    if (saved) setCompleted(JSON.parse(saved) as string[]);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("torchleet-completed", JSON.stringify(completed));
  }, [completed]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPayload(null);

    fetch(`/api/notebook?id=${encodeURIComponent(selectedQuestion.id)}`)
      .then((response) => response.json() as Promise<NotebookPayload>)
      .then((data) => {
        if (cancelled) return;
        setPayload(data);
        setRunResult(null);
        const savedDraft = window.localStorage.getItem(
          `torchleet-draft-${selectedQuestion.id}`,
        );
        setDraft(savedDraft ?? data.starterCode ?? "");
      })
      .catch(() => {
        if (!cancelled) {
          setPayload({
            id: selectedQuestion.id,
            prompt: {
              zh: "# 加载失败\n\n题目内容暂时无法读取。",
              en: "# Failed to load\n\nThe notebook could not be loaded.",
            },
            starterCode: "",
            solution: { markdown: "", code: "" },
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedQuestion.id]);

  useEffect(() => {
    window.localStorage.setItem(`torchleet-draft-${selectedQuestion.id}`, draft);
  }, [draft, selectedQuestion.id]);

  function goTo(offset: number) {
    const next = questions[selectedIndex + offset];
    if (next) {
      setSelectedId(next.id);
      setPanel("problem");
    }
  }

  function toggleCompleted() {
    setCompleted((current) =>
      current.includes(selectedQuestion.id)
        ? current.filter((id) => id !== selectedQuestion.id)
        : [...current, selectedQuestion.id],
    );
  }

  async function runCode() {
    setRunning(true);
    setRunResult(null);

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: draft }),
      });
      const result = (await response.json()) as RunResult;
      setRunResult(result);
    } catch (error) {
      setRunResult({
        stdout: "",
        stderr:
          error instanceof Error
            ? error.message
            : "Failed to connect to local runner.",
        exitCode: 1,
      });
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="h-screen overflow-hidden bg-slate-100 text-slate-950">
      <header className="practice-header flex min-h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <div className="practice-brand flex min-w-0 flex-1 items-center gap-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-slate-950 text-sm font-bold text-white">
            T
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-sm font-semibold leading-5">
              TorchLeet Practice
            </h1>
            <p className="break-words text-xs leading-4 text-slate-500">
              按顺序刷题，题目和题解都在这里
            </p>
          </div>
        </div>

        <div className="practice-header-actions flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {language === "zh" ? "中文" : "English"}
          </button>
          <button
            type="button"
            onClick={toggleCompleted}
            className={classNames(
              "rounded-md border px-3 py-1.5 text-sm font-medium",
              completed.includes(selectedQuestion.id)
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            {completed.includes(selectedQuestion.id) ? "已完成" : "标记完成"}
          </button>
        </div>
      </header>

      <div className="grid h-[calc(100vh-3.5rem)] grid-cols-[320px_minmax(0,1fr)_minmax(360px,42vw)]">
        <aside className="flex min-h-0 flex-col border-r border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-3">
            <div className="mb-3 grid grid-cols-4 gap-1 rounded-md bg-slate-100 p-1">
              {(Object.keys(setLabels) as Array<QuestionSet | "all">).map((set) => (
                <button
                  key={set}
                  type="button"
                  onClick={() => setActiveSet(set)}
                  className={classNames(
                    "rounded px-2 py-1.5 text-xs font-medium",
                    activeSet === set
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  {setLabels[set]}
                </button>
              ))}
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索题目 / 公司"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {visibleQuestions.map((question) => {
              const done = completed.includes(question.id);
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(question.id);
                    setPanel("problem");
                  }}
                  className={classNames(
                    "flex w-full gap-3 border-b border-slate-100 px-3 py-3 text-left hover:bg-slate-50",
                    selectedQuestion.id === question.id && "bg-slate-100",
                  )}
                >
                  <span
                    className={classNames(
                      "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px]",
                      done
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-300 text-slate-400",
                    )}
                  >
                    {done ? "✓" : question.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium leading-5 text-slate-900">
                      {question.title}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{question.id}</span>
                      <span
                        className={classNames(
                          "rounded border px-1.5 py-0.5",
                          difficultyTone[question.difficulty],
                        )}
                      >
                        {difficultyLabels[question.difficulty]}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col border-r border-slate-200 bg-white">
          <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
            <div className="flex items-center gap-2">
              {(["problem", "solution"] as Panel[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPanel(item)}
                  className={classNames(
                    "rounded-md px-3 py-1.5 text-sm font-medium",
                    panel === item
                      ? "bg-slate-950 text-white"
                      : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  {item === "problem" ? "题目" : "题解"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goTo(-1)}
                disabled={selectedIndex <= 0}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                上一题
              </button>
              <button
                type="button"
                onClick={() => goTo(1)}
                disabled={selectedIndex >= questions.length - 1}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                下一题
              </button>
            </div>
          </div>

          <article className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-500">
                {selectedQuestion.id}
              </span>
              <span
                className={classNames(
                  "rounded border px-2 py-1 text-xs font-medium",
                  difficultyTone[selectedQuestion.difficulty],
                )}
              >
                {difficultyLabels[selectedQuestion.difficulty]}
              </span>
              {selectedQuestion.companies.slice(0, 4).map((company) => (
                <span
                  key={company}
                  className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600"
                >
                  {company}
                </span>
              ))}
            </div>

            {loading && <p className="text-sm text-slate-500">加载中...</p>}
            {!loading && payload && (
              <div className="practice-markdown">
                {panel === "problem"
                  ? renderMarkdown(payload.prompt[language])
                  : renderMarkdown(payload.solution.markdown)}
                {panel === "solution" && payload.solution.code && (
                  <CodeBlock
                    code={payload.solution.code}
                    appearance={codeAppearance}
                  />
                )}
              </div>
            )}
          </article>
        </section>

        <section className="flex min-h-0 flex-col bg-white text-slate-950">
          <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
            <div>
              <p className="text-sm font-semibold">代码草稿</p>
              <p className="text-xs text-slate-500">在这台 Mac 上运行并返回结果</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setCodeAppearance((current) =>
                    current === "light" ? "dark" : "light",
                  )
                }
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {codeAppearance === "light" ? "浅色" : "深色"}
              </button>
              {selectedQuestion.questionPath && (
                <a
                  href={getColabUrl(selectedQuestion.questionPath)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-400"
                >
                  Colab
                </a>
              )}
              {selectedQuestion.solutionPath && (
                <a
                  href={getDownloadUrl(selectedQuestion.solutionPath)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  下载题解
                </a>
              )}
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-rows-[minmax(260px,1fr)_minmax(160px,34%)]">
            <div className="min-h-0 border-b border-slate-200">
              <CodeEditor
                value={draft}
                onChange={setDraft}
                appearance={codeAppearance}
              />
            </div>

            <div className="min-h-0 overflow-y-auto bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  运行结果
                </p>
                {runResult && (
                  <span
                    className={classNames(
                      "rounded px-2 py-1 text-xs",
                      runResult.exitCode === 0
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700",
                    )}
                  >
                    {runResult.timedOut
                      ? "超时"
                      : runResult.exitCode === 0
                        ? "通过"
                        : `退出码 ${runResult.exitCode}`}
                  </span>
                )}
              </div>

              {!runResult && (
                <p className="text-sm text-slate-500">
                  点击“运行代码”后，这里会显示 stdout、stderr 和断言错误。
                </p>
              )}

              {runResult?.stdout && (
                <pre className="mb-3 whitespace-pre-wrap rounded-md border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-800">
                  {runResult.stdout}
                </pre>
              )}

              {(runResult?.stderr || runResult?.error) && (
                <pre className="whitespace-pre-wrap rounded-md border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800">
                  {runResult.error || runResult.stderr}
                </pre>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
              <span>Python 高亮 · 自动补全 · Tab 缩进 · 15 秒超时</span>
              <span>{draft.split(/\r?\n/).length} 行</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={runCode}
                disabled={running}
                className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
              >
                {running ? "运行中..." : "运行代码"}
              </button>
              <button
                type="button"
                onClick={() => setDraft(payload?.starterCode ?? "")}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                重置代码
              </button>
              <button
                type="button"
                onClick={() => setPanel("solution")}
                className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                查看题解
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
