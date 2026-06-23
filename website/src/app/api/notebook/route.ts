import { readFile } from "node:fs/promises";
import path from "node:path";
import { getQuestionById, type Question } from "@/data/questions";

interface NotebookCell {
  cell_type: "markdown" | "code" | string;
  source?: string[] | string;
}

interface Notebook {
  cells?: NotebookCell[];
}

function sourceToString(source: NotebookCell["source"]): string {
  if (Array.isArray(source)) return source.join("");
  return source ?? "";
}

function safeNotebookPath(repoPath: string): string {
  const repoRoot = path.resolve(process.cwd(), "..");
  const resolved = path.resolve(repoRoot, repoPath);

  if (!resolved.startsWith(repoRoot + path.sep) || !resolved.endsWith(".ipynb")) {
    throw new Error("Invalid notebook path");
  }

  return resolved;
}

async function readNotebook(repoPath?: string) {
  if (!repoPath) return null;

  const content = await readFile(safeNotebookPath(repoPath), "utf8");
  const notebook = JSON.parse(content) as Notebook;
  const cells = notebook.cells ?? [];

  const markdown = cells
    .filter((cell) => cell.cell_type === "markdown")
    .map((cell) => sourceToString(cell.source).trim())
    .filter(Boolean)
    .join("\n\n---\n\n");

  const code = cells
    .filter((cell) => cell.cell_type === "code")
    .map((cell, index) => {
      const body = sourceToString(cell.source).trimEnd();
      return body ? `# Cell ${index + 1}\n${body}` : "";
    })
    .filter(Boolean)
    .join("\n\n");

  return { markdown, code };
}

function englishPrompt(question: Question): string {
  const labels: Record<Question["set"], string> = {
    v1: "PyTorch Question Set",
    v2: "LLM Set",
    v3: "Advanced ML Systems",
  };

  return [
    `# ${question.title}`,
    "",
    `**Difficulty**: ${question.difficulty}`,
    `**Set**: ${labels[question.set]}`,
    question.category ? `**Category**: ${question.category}` : "",
    question.companies.length
      ? `**Companies**: ${question.companies.join(", ")}`
      : "",
    "",
    "## Problem Statement",
    question.description ||
      `Implement and study **${question.title}** using the provided TorchLeet notebook.`,
    "",
    "## How to Work",
    "1. Read the Chinese notebook description or open the original notebook.",
    "2. Fill in the TODO sections in the starter code.",
    "3. Compare your work with the solution after you have tried it yourself.",
  ]
    .filter(Boolean)
    .join("\n");
}

function chinesePrompt(question: Question): string {
  return [
    `# ${question.title}`,
    "",
    `**难度**：${question.difficulty}`,
    question.category ? `**分类**：${question.category}` : "",
    question.companies.length
      ? `**考察公司**：${question.companies.join(", ")}`
      : "",
    "",
    "## 题目描述",
    question.description ||
      `使用提供的 TorchLeet notebook 完成 **${question.title}**。`,
    "",
    "## 做题方式",
    "1. 先阅读题目描述。",
    "2. 在右侧草稿区或 notebook 中补全 TODO。",
    "3. 完成后再查看题解，对照自己的实现。",
  ]
    .filter(Boolean)
    .join("\n");
}

function solutionExplanation(question: Question, hasSolution: boolean): string {
  if (!hasSolution) {
    return [
      `# ${question.title} 题解`,
      "",
      "这道题暂时还没有配套的题解 notebook。",
      "",
      "建议先按题目要求完成右侧代码草稿，然后使用“运行代码”查看输出。如果测试失败，优先检查函数签名、张量形状、广播维度以及数值稳定性这些最常见的问题。",
    ].join("\n");
  }

  return [
    `# ${question.title} 题解`,
    "",
    "## 解题思路",
    "这份参考实现的核心目标是把题目要求拆成几个可以独立验证的小步骤：先准备输入和辅助函数，再实现主体逻辑，最后用 notebook 里的测试代码检查输出是否符合预期。",
    "",
    "## 阅读重点",
    "1. 先看函数签名，确认输入、输出和题目要求完全一致。",
    "2. 再看 `TODO` 对应位置是如何被补全的，尤其是张量维度、广播、mask、概率归一化、梯度或缓存更新这些细节。",
    "3. 最后运行底部测试。如果断言失败，优先对比中间张量的 shape 和 dtype。",
    "",
    "## 常见坑",
    "- 不要只让示例跑通，要确认边界输入也满足题目约束。",
    "- 涉及概率、softmax、log-prob 的题目要特别注意数值稳定性。",
    "- 涉及 attention、batch、sequence 的题目，shape 错误通常比公式错误更常见。",
    "",
    "## 参考代码",
    "下面的代码来自对应的题解 notebook。建议先自己完成一遍，再展开对照。",
  ].join("\n");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "Missing question id" }, { status: 400 });
  }

  const question = getQuestionById(id);
  if (!question) {
    return Response.json({ error: "Question not found" }, { status: 404 });
  }

  try {
    const questionNotebook = await readNotebook(question.questionPath);
    const solutionNotebook = await readNotebook(question.solutionPath);

    return Response.json({
      id: question.id,
      prompt: {
        zh: questionNotebook?.markdown || chinesePrompt(question),
        en: solutionNotebook?.markdown || englishPrompt(question),
      },
      starterCode: questionNotebook?.code || "# Notebook is coming soon.",
      solution: {
        markdown: solutionExplanation(question, Boolean(solutionNotebook?.code)),
        code: solutionNotebook?.code || "",
      },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to read notebook",
      },
      { status: 500 },
    );
  }
}
