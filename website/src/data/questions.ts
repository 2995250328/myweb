export type Difficulty = "basic" | "easy" | "medium" | "hard" | "expert";
export type QuestionSet = "v1" | "v2" | "v3";
export type V3Category =
  | "classical-ml"
  | "llm-decoding"
  | "llm-inference"
  | "modern-architectures"
  | "alignment-training"
  | "gpu-systems";

export interface Question {
  id: string;
  number: number;
  title: string;
  difficulty: Difficulty;
  set: QuestionSet;
  category?: string;
  companies: string[];
  description?: string;
  hasNotebook?: boolean;
  questionPath?: string;
  solutionPath?: string;
}

export const questions: Question[] = [
  {
    id: "calisthenics",
    number: 1,
    title: "街头健身进阶工作台",
    difficulty: "basic",
    set: "v3",
    category: "Training",
    companies: [],
    hasNotebook: false,
    description:
      "This deployment focuses on the calisthenics tracker at /calisthenics.",
  },
];

export function getQuestionById(id: string) {
  return questions.find((question) => question.id === id);
}

export function getQuestionsBySet(set: QuestionSet) {
  return questions.filter((question) => question.set === set);
}

export function getQuestionsByCompany(company: string) {
  const needle = company.toLowerCase();
  return questions.filter((question) =>
    question.companies.some((item) => item.toLowerCase().includes(needle)),
  );
}

export function getQuestionsByDifficulty(difficulty: Difficulty) {
  return questions.filter((question) => question.difficulty === difficulty);
}

export function getQuestionsByCategory(category: V3Category) {
  return questions.filter((question) => question.category === category);
}

export function getAllCompanies() {
  return Array.from(new Set(questions.flatMap((question) => question.companies))).sort();
}

export function getColabUrl(pathOrQuestion: string | Question) {
  const repoPath =
    typeof pathOrQuestion === "string"
      ? pathOrQuestion
      : pathOrQuestion.questionPath;

  return repoPath
    ? `https://colab.research.google.com/github/2995250328/myweb/blob/main/${repoPath}`
    : "";
}

export function getDownloadUrl(pathOrQuestion: string | Question) {
  const repoPath =
    typeof pathOrQuestion === "string"
      ? pathOrQuestion
      : pathOrQuestion.questionPath;

  return repoPath ? `/${repoPath}` : "";
}
