"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import styles from "./page.module.css";

type Exercise = {
  name: string;
  dose: string;
  cue: string;
};

type Session = {
  day: string;
  title: string;
  focus: string;
  exercises: Exercise[];
};

type VideoDemo = {
  title: string;
  group: "街健技能" | "肩袖康复";
  target: string;
  videoId?: string;
  href: string;
  cues: string[];
};

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
  storage?: "local-json" | "supabase";
  requiresAccessCode?: boolean;
  error?: string;
};

async function responseError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as ProgressPayload;
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}

const todayInShanghai = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const strengthPhases = [
  {
    weeks: "1-4",
    title: "基础转换",
    goal: "把健身房力量转成严格街健动作质量，建立肩胛、手腕、空心位和倒立基础。",
    milestone:
      "严格引体 8-10 次，双杠臂屈伸 12-15 次，L-sit tuck 20 秒，面墙倒立 30-40 秒，死悬 45-60 秒。",
  },
  {
    weeks: "5-8",
    title: "转换完成与第一次复测",
    goal: "建立双力臂、前水平、俄挺和倒立入门专项，决定后续主线。",
    milestone:
      "胸触杠引体 3-5 次，tuck front lever 10-15 秒，planche lean 15-20 秒，面墙倒立 45-60 秒。",
  },
  {
    weeks: "9-12",
    title: "专项积累",
    goal: "推荐以双力臂 + 前水平为主线，倒立/倒立撑为副线，俄挺做长期基础线。",
    milestone:
      "双力臂接近成形，advanced tuck front lever 8-12 秒，靠墙倒立撑离心 3-5 次，tuck planche 3-8 秒。",
  },
  {
    weeks: "13-16",
    title: "专项巩固",
    goal: "稳定技术，提高可重复性，形成中级街健训练结构。",
    milestone:
      "严格双力臂 1-3 个，advanced tuck front lever 12-15 秒或 one-leg 成形，自由倒立 5-15 秒。",
  },
];

const strengthSessions: Session[] = [
  {
    day: "第 1 天",
    title: "拉力 + 前水平基础",
    focus: "严格拉力、爆发拉力、肩胛下沉与核心抗伸展。",
    exercises: [
      { name: "热身", dose: "8-10 分钟", cue: "低强度有氧、肩带热身、腕部活动、dead bug、arch hang。" },
      { name: "tuck / advanced tuck front lever hold", dose: "5 x 8-12 秒", cue: "肩胛下沉后倾，躯干空心，髋别塌。" },
      { name: "严格引体或加重引体", dose: "4 x 4-6", cue: "RPE 7-8，保留 1-3 次余力。" },
      { name: "胸触杠引体 / 爆发引体", dose: "4 x 3-5", cue: "速度优先，变慢就停。" },
      { name: "环/杠划船", dose: "3 x 8-12", cue: "肩胛后缩下沉，身体保持一条线。" },
      { name: "直臂下压 / 弹力带前水平下压", dose: "3 x 12-15", cue: "肘伸直，背阔主动发力。" },
      { name: "悬垂举腿", dose: "3 x 6-10", cue: "不要甩腿，骨盆后倾收住。" },
    ],
  },
  {
    day: "第 2 天",
    title: "推力 + 俄挺基础",
    focus: "支撑、肩胛前伸、直臂组织适应和 L-sit 压缩。",
    exercises: [
      { name: "热身", dose: "8-12 分钟", cue: "低强度有氧、手腕预热、wall slide、肩胛俯卧撑。" },
      { name: "planche lean", dose: "5 x 10-20 秒", cue: "主动推地，肘锁定，手腕无痛才加前倾。" },
      { name: "双杠臂屈伸 / 加重双杠臂屈伸", dose: "4 x 5-8", cue: "底位稳定，肩不要前顶。" },
      { name: "伪俄挺俯卧撑", dose: "4 x 6-10", cue: "身体前移但不塌腰，肩胛保持前伸。" },
      { name: "pike push-up", dose: "3 x 6-10", cue: "头部落点稳定，肘向后下。" },
      { name: "L-sit tuck / L-sit", dose: "5 x 10-20 秒", cue: "肩压稳，膝伸直路线逐步推进。" },
      { name: "弹力带外旋 + face pull", dose: "各 2-3 x 12-15", cue: "控制式，不追重量。" },
    ],
  },
  {
    day: "第 3 天",
    title: "倒立 + 垂直推 + 稳定性",
    focus: "肩屈活动度、过顶承重、前锯肌与倒立线条。",
    exercises: [
      { name: "热身", dose: "8-12 分钟", cue: "肩屈活动、胸椎伸展、腕部热身、肩胛上提下压。" },
      { name: "面墙倒立", dose: "6 x 20-45 秒", cue: "臀肋收紧，耳夹臂，掌指主动抓地。" },
      { name: "pike push-up 或靠墙倒立撑离心", dose: "4 x 4-8", cue: "RPE 7-8，动作线条优先。" },
      { name: "wall walk / 肩触墙倒立控制", dose: "4 x 3-6", cue: "技术练习，不做疲劳堆量。" },
      { name: "serratus wall slide / push-up plus", dose: "2-3 x 10-12", cue: "重点是推开地面或墙面。" },
      { name: "hollow hold + arch hold", dose: "各 3 x 20-30 秒", cue: "建立前水平与倒立的躯干张力。" },
    ],
  },
  {
    day: "第 4 天",
    title: "双力臂 + 综合力量 + 下肢保留",
    focus: "转杠技术、爆发拉力、下肢维持与整体恢复。",
    exercises: [
      { name: "热身", dose: "8-10 分钟", cue: "全身动态热身、腕肩髋准备。" },
      { name: "低杠转杠 / 弹力带辅助双力臂", dose: "5 x 2-4", cue: "先高拉，再快转，再稳撑。" },
      { name: "爆发引体", dose: "5 x 3", cue: "每组速度快，质量下降就减少组数。" },
      { name: "深蹲/保加利亚分腿蹲 + RDL/单腿 RDL", dose: "4 x 5-8 + 3 x 6-8", cue: "RPE 7-8，保留下肢能力。" },
      { name: "dip support hold", dose: "3 x 20-30 秒", cue: "肩稳定，肘伸直，胸骨打开。" },
      { name: "chin-up 或中立握引体", dose: "3 x 6-10", cue: "补拉力，避免借摆。" },
      { name: "侧桥或反向挺身", dose: "3 x 20-30 秒或 2 x 10-15", cue: "给躯干和后链收尾。" },
    ],
  },
];

const rehabStages = [
  {
    weeks: "1-2",
    title: "疼痛控制与活动度",
    prescription:
      "每周 5-6 天，其中 4 天完整恢复课，1-2 天只做 12 分钟维护。Pendulum、交叉抱肩拉伸、被动旋转拉伸、墙滑、肩胛后缩下沉、弹力带外旋等长、斜板 Push-up Plus。",
    advance:
      "静息痛 <=2/10，主动无负重抬臂痛 <=3/10，墙滑 2 x 10 无明显耸肩，高位支撑 20-30 秒稳定。",
  },
  {
    weeks: "3-4",
    title: "肩袖与肩胛耐力",
    prescription:
      "每周 4-5 天，3 天强化，2 天维护。弹力带外旋/内旋、侧卧外旋、站姿划船、Serratus wall slide、斜板 Push-up Plus、俯卧 Y、桌上闭链负重转移。",
    advance:
      "ROM >= 对侧 85%，静息痛 <=1-2/10，侧卧外旋 1-2 kg 可做 3 x 15，斜板 Push-up Plus 3 x 12 稳定。",
  },
  {
    weeks: "5-6",
    title: "闭链稳定和可控支撑",
    prescription:
      "每周 4 天，3 天强化 + 1 天技术维护。加入 90 度外展位外旋、低斜板肩触碰、scaption、Pike lean 或箱上熊爬支撑。",
    advance:
      "无静息痛，主动无负重抬臂痛 <=1/10，轻中阻力外旋 30 次无代偿，闭链肩触碰稳定。",
  },
  {
    weeks: "7-8",
    title: "渐进回归街健",
    prescription:
      "每周 4 天，2 天恢复 + 力量，2 天恢复 + 街健回归。维持外旋、Push-up Plus、划船，加入低角度 pike hold、中立握引体、高斜板俯卧撑、低台支撑转移。",
    advance:
      "ROM >= 对侧 95%，疼痛稳定 0-1/10，肩袖/肩胛力量耐力接近对侧，回归动作后次晨无反应。",
  },
];

const maintenance = [
  { name: "Pendulum", dose: "1 分钟", cue: "身体前倾，手臂像钟摆轻摆，不主动甩臂。" },
  { name: "交叉抱肩拉伸", dose: "2 x 30 秒", cue: "拉后肩，不用手硬压肘。" },
  { name: "墙滑 Wall Slide", dose: "2 x 10", cue: "肋骨收住，前臂贴墙，上滑到不代偿的位置。" },
  { name: "弹力带外旋", dose: "2 x 15", cue: "手肘夹身，前臂像门轴旋开。" },
  { name: "Serratus Wall Slide 或 Push-up Plus", dose: "2 x 10", cue: "推开地面或墙，避免耸肩代偿。" },
  { name: "站姿划船", dose: "2 x 12", cue: "肩胛后缩下沉，胸骨保持展开。" },
];

const readinessTests = [
  "严格引体 8-12 次，全程伸肘、下巴过杠、无摆动。",
  "胸触杠引体 3-5 次，胸部明确接近横杠。",
  "双杠臂屈伸 12-15 次，底位稳定，肩无明显前顶。",
  "L-sit tuck 20 秒或 L-sit 10-15 秒，肩压稳，膝盖或双腿不松垮。",
  "死悬 45-60 秒，正握，肩不耸死。",
  "Hollow hold 20-40 秒，腰背不过度拱起。",
  "面墙倒立 30-45 秒，臀肋收紧，脚尖指天，耳夹臂。",
  "四足跪姿前移承重，肩可过腕 5-10 cm，20 秒无痛。",
];

const trafficRules = [
  { level: "绿灯", rule: "训练中 0-2/10，不影响动作质量，训练后和次晨回到基线。可以维持或小幅推进。" },
  { level: "黄灯", rule: "训练中约 3/10、可控制、无代偿、次晨不加重。第 5 周后才短暂允许，不升级。" },
  { level: "红灯", rule: "训练中 >3/10 且继续升高，刺痛/塌肩/无力，或 24 小时仍明显更痛。停止该动作并回退。" },
];

const researchedSettings = [
  "动态动作采用到顶再进：例如 4 x 4-6 或 3 x 6-10，连续 2 次达到上限且 RPE <=8，再加 2.5-5 kg 或换更难变式。",
  "静态技能采用到时再进：例如 5 x 8-12 秒，全组到 12 秒且姿态稳定，再加杠杆或前倾幅度。",
  "肩袖恢复期第 1-4 周以无痛或接近无痛为主；第 5-8 周只在动作稳定时接受 <=3/10 的可耐受不适，且次晨必须回线。",
  "上肢训练保留 2-3 次余力，不做失败组、不做爆发借力组，不在明显疼痛上硬顶。",
  "恢复优先级：睡眠 > 总热量与蛋白 > 训练量管理 > 关节准备 > 补剂。按 76 kg 体重，蛋白可先落在约 110-150 g/天。",
];

const sources = [
  {
    label: "AAOS Rotator Cuff and Shoulder Conditioning Program",
    href: "https://orthoinfo.aaos.org/en/recovery/rotator-cuff-and-shoulder-conditioning-program/",
  },
  {
    label: "JOSPT 2025 Rotator Cuff Tendinopathy CPG",
    href: "https://www.orthopt.org/uploads/content_files/files/Rotator_Cuff_CPG.pdf",
  },
  {
    label: "MOON Shoulder Nonoperative Rotator Cuff PT Guidelines",
    href: "https://moonshoulder.com/wp-content/uploads/2020/04/Nonoperative-Treatment-of-Rotator-Cuff-Tendinopathy-PT-Guidelines.pdf",
  },
  {
    label: "ACSM Resistance Training Guidelines Update",
    href: "https://acsm.org/resistance-training-guidelines-update-2026/",
  },
  {
    label: "Overcoming Gravity Progression Charts",
    href: "https://stevenlow.org/wp-content/uploads/2017/02/OG2ChartsPrint.pdf",
  },
  {
    label: "r/bodyweightfitness Recommended Routine",
    href: "https://www.reddit.com/r/bodyweightfitness/wiki/kb/recommended_routine/",
  },
];

const pdfs = [
  {
    title: "健身房力量到街头健身进阶执行规划",
    href: "/calisthenics/strength-calisthenics-plan.pdf",
  },
  {
    title: "面向街头健身练习者的肩袖恢复与强化训练计划",
    href: "/calisthenics/rotator-cuff-rehab-plan.pdf",
  },
];

const videoDemos: VideoDemo[] = [
  {
    title: "严格引体向上",
    group: "街健技能",
    target: "第 1 天拉力基础、双力臂前置能力",
    videoId: "aNUSgyWRJYA",
    href: "https://www.youtube.com/watch?v=aNUSgyWRJYA",
    cues: [
      "起始先下沉肩胛，再屈肘上拉。",
      "全程收紧躯干，避免甩腿借摆。",
      "下放到接近伸肘，不要半程刷次数。",
    ],
  },
  {
    title: "前水平进阶",
    group: "街健技能",
    target: "tuck / advanced tuck front lever、直臂下压",
    videoId: "rx0vr-teG7M",
    href: "https://www.youtube.com/watch?v=rx0vr-teG7M",
    cues: [
      "肩胛下沉后倾，肘保持伸直。",
      "先稳定 tuck，再推进到 advanced tuck。",
      "髋不要塌，身体维持空心位。",
    ],
  },
  {
    title: "动作进阶选择",
    group: "街健技能",
    target: "什么时候加重、什么时候换变式",
    videoId: "pnpn7Rtsa74",
    href: "https://www.youtube.com/watch?v=pnpn7Rtsa74",
    cues: [
      "动态动作到区间上限再加重。",
      "静态动作到目标时间再增加杠杆。",
      "不要在动作质量变形时升级。",
    ],
  },
  {
    title: "双力臂技术",
    group: "街健技能",
    target: "低杠转杠、弹力带辅助双力臂、爆发拉力",
    href: "https://www.youtube.com/results?search_query=strict+muscle+up+tutorial+calisthenics",
    cues: [
      "先练高拉高度，再练快速转杠。",
      "支撑末端要稳，不要靠翻腕硬蹭。",
      "肩不舒服时只做低杠分解，不做爆发转换。",
    ],
  },
  {
    title: "倒立与倒立撑基础",
    group: "街健技能",
    target: "面墙倒立、pike push-up、靠墙倒立撑离心",
    href: "https://fitnessfaqs.com/articles/ff-video-tag/handstands/",
    cues: [
      "面墙倒立先追线条，不追时间。",
      "臀肋收紧，耳夹臂，掌指主动抓地。",
      "肩屈受限时先退回 wall slide 和 pike hold。",
    ],
  },
  {
    title: "俄挺 lean / planche lean",
    group: "街健技能",
    target: "planche lean、伪俄挺俯卧撑、手腕承重适应",
    href: "https://www.youtube.com/results?search_query=planche+lean+tutorial+calisthenics",
    cues: [
      "主动推地，肩胛前伸，不是只把身体往前倒。",
      "肘锁定，手腕无痛才增加前倾。",
      "高身高训练者更要慢推进，避免一开始追大角度。",
    ],
  },
  {
    title: "AAOS 肩部调理动作",
    group: "肩袖康复",
    target: "Pendulum、交叉抱肩、弹力带外旋、站姿划船",
    href: "https://orthoinfo.aaos.org/en/recovery/rotator-cuff-and-shoulder-conditioning-program/",
    cues: [
      "恢复期先追无痛活动度和动作控制。",
      "外旋动作手肘夹身，阻力宁轻不重。",
      "任何刺痛、夜间痛或次晨加重都先回退。",
    ],
  },
  {
    title: "Wall Slide / Push-up Plus",
    group: "肩袖康复",
    target: "前锯肌、肩胛上旋、闭链稳定",
    href: "https://www.youtube.com/results?search_query=serratus+wall+slide+push+up+plus+physical+therapy",
    cues: [
      "肋骨收住，不用腰椎代偿上举。",
      "重点是推开墙或地面，不是耸肩。",
      "只做到动作稳定的高度和角度。",
    ],
  },
  {
    title: "肩袖恢复总览",
    group: "肩袖康复",
    target: "外旋、内旋、肩胛稳定、回归上肢训练",
    href: "https://www.youtube.com/results?search_query=E3+Rehab+rotator+cuff+exercises",
    cues: [
      "先恢复疼痛耐受和 ROM，再上强度。",
      "第 1-4 周更保守，第 5 周后才允许很轻微不适。",
      "训练后和次晨必须回到基线。",
    ],
  },
];

function phaseForWeek(week: number) {
  if (week <= 4) return strengthPhases[0];
  if (week <= 8) return strengthPhases[1];
  if (week <= 12) return strengthPhases[2];
  return strengthPhases[3];
}

function rehabForWeek(week: number) {
  if (week <= 2) return rehabStages[0];
  if (week <= 4) return rehabStages[1];
  if (week <= 6) return rehabStages[2];
  return rehabStages[3];
}

export default function CalisthenicsPlanPage() {
  const [week, setWeek] = useState(1);
  const [rehabWeek, setRehabWeek] = useState(1);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"plan" | "rehab" | "demos" | "logs" | "library">("plan");
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [needsAccessCode, setNeedsAccessCode] = useState(false);
  const [storageMode, setStorageMode] = useState("正在检测");
  const [saveStatus, setSaveStatus] = useState("正在读取统一进度...");
  const [form, setForm] = useState({
    date: todayInShanghai(),
    pain: "0",
    rpe: "7",
    sleep: "7.5",
    note: "",
  });

  const selectedSession = strengthSessions[sessionIndex];
  const selectedPhase = phaseForWeek(week);
  const selectedRehab = rehabForWeek(rehabWeek);
  const checklist = useMemo(
    () => [...maintenance, ...selectedSession.exercises],
    [selectedSession.exercises],
  );
  const today = form.date;

  useEffect(() => {
    let cancelled = false;

    async function loadProgress() {
      const savedAccessCode = localStorage.getItem("calisthenics.accessCode") ?? "";
      if (!cancelled) setAccessCode(savedAccessCode);

      try {
        const response = await fetch("/api/calisthenics-progress", {
          cache: "no-store",
          headers: savedAccessCode
            ? {
                "x-calisthenics-code": savedAccessCode,
              }
            : {},
        });
        if (response.status === 401) {
          if (!cancelled) {
            setNeedsAccessCode(true);
            setSaveStatus("请输入访问码以加载云端进度");
          }
          return;
        }
        if (!response.ok) throw new Error(await responseError(response, "读取统一进度失败"));

        const progress = (await response.json()) as ProgressPayload;
        const serverHasData =
          Object.keys(progress.completed ?? {}).length > 0 ||
          (progress.logs ?? []).length > 0;

        const localCompleted = localStorage.getItem("calisthenics.completed");
        const localLogs = localStorage.getItem("calisthenics.logs");
        const migratedCompleted = localCompleted
          ? (JSON.parse(localCompleted) as Record<string, boolean>)
          : {};
        const migratedLogs = localLogs ? (JSON.parse(localLogs) as LogEntry[]) : [];

        if (cancelled) return;

        setCompleted(serverHasData ? progress.completed : migratedCompleted);
        setLogs(serverHasData ? progress.logs : migratedLogs);
        setWeek(progress.settings?.week ?? 1);
        setRehabWeek(progress.settings?.rehabWeek ?? 1);
        setSessionIndex(progress.settings?.sessionIndex ?? 0);
        setStorageMode(progress.storage === "supabase" ? "Supabase 云端" : "本地 JSON");
        setNeedsAccessCode(false);
        setSaveStatus(
          progress.updatedAt
            ? `统一进度已加载：${new Date(progress.updatedAt).toLocaleString("zh-CN")}`
            : "统一进度已加载",
        );
      } catch (error) {
        if (cancelled) return;
        setSaveStatus(
          error instanceof Error
            ? `${error.message}，当前页面改动不会跨设备同步`
            : "读取统一进度失败，当前页面改动不会跨设备同步",
        );
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    loadProgress();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (needsAccessCode) return;

    const timeout = window.setTimeout(async () => {
      try {
        setSaveStatus("正在保存到这台 Mac...");
        const response = await fetch("/api/calisthenics-progress", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessCode ? { "x-calisthenics-code": accessCode } : {}),
          },
          body: JSON.stringify({
            completed,
            logs,
            settings: {
              week,
              rehabWeek,
              sessionIndex,
            },
          } satisfies ProgressPayload),
        });
        if (!response.ok) throw new Error(await responseError(response, "保存失败"));

        const progress = (await response.json()) as ProgressPayload;
        setStorageMode(progress.storage === "supabase" ? "Supabase 云端" : "本地 JSON");
        setSaveStatus(
          progress.updatedAt
            ? `已保存到${progress.storage === "supabase" ? "云端" : "本地 JSON"}：${new Date(progress.updatedAt).toLocaleString("zh-CN")}`
            : "已保存",
        );
      } catch (error) {
        setSaveStatus(
          error instanceof Error
            ? `${error.message}，请确认服务仍在运行`
            : "保存失败，请确认服务仍在运行",
        );
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [accessCode, completed, loaded, logs, needsAccessCode, rehabWeek, sessionIndex, week]);

  async function unlockProgress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    localStorage.setItem("calisthenics.accessCode", accessCode);
    setLoaded(false);
    setNeedsAccessCode(false);
    setSaveStatus("正在重新读取统一进度...");

    try {
      const response = await fetch("/api/calisthenics-progress", {
        cache: "no-store",
        headers: {
          "x-calisthenics-code": accessCode,
        },
      });
      if (response.status === 401) {
        setNeedsAccessCode(true);
        setSaveStatus("访问码不正确");
        return;
      }
      if (!response.ok) throw new Error(await responseError(response, "读取统一进度失败"));

      const progress = (await response.json()) as ProgressPayload;
      setCompleted(progress.completed ?? {});
      setLogs(progress.logs ?? []);
      setWeek(progress.settings?.week ?? 1);
      setRehabWeek(progress.settings?.rehabWeek ?? 1);
      setSessionIndex(progress.settings?.sessionIndex ?? 0);
      setStorageMode(progress.storage === "supabase" ? "Supabase 云端" : "本地 JSON");
      setSaveStatus(
        progress.updatedAt
          ? `统一进度已加载：${new Date(progress.updatedAt).toLocaleString("zh-CN")}`
          : "统一进度已加载",
      );
    } catch (error) {
      setSaveStatus(
        error instanceof Error
          ? error.message
          : "读取统一进度失败",
      );
    } finally {
      setLoaded(true);
    }
  }

  const stats = useMemo(() => {
    const total = logs.length || 1;
    const avgPain = logs.reduce((sum, item) => sum + item.pain, 0) / total;
    const avgRpe = logs.reduce((sum, item) => sum + item.rpe, 0) / total;
    const avgSleep = logs.reduce((sum, item) => sum + item.sleep, 0) / total;
    const doneToday = checklist.filter((item) => completed[`${today}:${selectedSession.day}:${item.name}`]).length;
    return {
      totalLogs: logs.length,
      avgPain: avgPain.toFixed(1),
      avgRpe: avgRpe.toFixed(1),
      avgSleep: avgSleep.toFixed(1),
      doneToday,
      totalToday: checklist.length,
    };
  }, [checklist, completed, logs, selectedSession.day, today]);

  function toggleDone(name: string) {
    const key = `${today}:${selectedSession.day}:${name}`;
    setCompleted((current) => ({ ...current, [key]: !current[key] }));
  }

  function submitLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      date: form.date,
      session: selectedSession.title,
      pain: Number(form.pain),
      rpe: Number(form.rpe),
      sleep: Number(form.sleep),
      note: form.note.trim(),
    };
    setLogs((current) => [entry, ...current].slice(0, 80));
    setForm((current) => ({ ...current, note: "" }));
  }

  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>街头健身进阶工作台</p>
          <h1>从力量房到街健技能，把计划、恢复和记录放在同一个屏幕里。</h1>
          <p>
            已整合两份 PDF 的完整原文查看、16 周专项进阶、8 周肩袖恢复、每日维护课、训练记录和外部资料校准。
          </p>
          <div className={styles.heroControls}>
            <label>
              训练周
              <input
                type="number"
                min="1"
                max="16"
                value={week}
                onChange={(event) => setWeek(Math.min(16, Math.max(1, Number(event.target.value))))}
              />
            </label>
            <label>
              肩袖周
              <input
                type="number"
                min="1"
                max="8"
                value={rehabWeek}
                onChange={(event) => setRehabWeek(Math.min(8, Math.max(1, Number(event.target.value))))}
              />
            </label>
          </div>
          <p className={styles.saveStatus}>{saveStatus}</p>
          <p className={styles.storageStatus}>当前存储：{storageMode}</p>
          {needsAccessCode && (
            <form className={styles.accessForm} onSubmit={unlockProgress}>
              <label>
                访问码
                <input
                  type="password"
                  value={accessCode}
                  onChange={(event) => setAccessCode(event.target.value)}
                  placeholder="输入云端访问码"
                />
              </label>
              <button type="submit">解锁</button>
            </form>
          )}
        </div>
        <Image
          src="/calisthenics/training-workspace.png"
          alt="街头健身训练记录插画"
          width={1600}
          height={680}
          priority
          className={styles.heroImage}
        />
      </section>

      <section className={styles.statusGrid} aria-label="当前状态">
        <article>
          <span>当前阶段</span>
          <strong>{selectedPhase.title}</strong>
          <p>{selectedPhase.goal}</p>
        </article>
        <article>
          <span>肩袖阶段</span>
          <strong>{selectedRehab.title}</strong>
          <p>{selectedRehab.advance}</p>
        </article>
        <article>
          <span>今日完成</span>
          <strong>
            {stats.doneToday}/{stats.totalToday}
          </strong>
          <p>勾选会自动同步到当前存储。</p>
        </article>
        <article>
          <span>记录均值</span>
          <strong>痛 {stats.avgPain} / RPE {stats.avgRpe}</strong>
          <p>{stats.totalLogs} 条记录，平均睡眠 {stats.avgSleep} 小时。</p>
        </article>
      </section>

      <nav className={styles.tabs} aria-label="页面分区">
        {[
          ["plan", "专项计划"],
          ["rehab", "肩袖恢复"],
          ["demos", "动作示范"],
          ["logs", "记录面板"],
          ["library", "PDF 原文库"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={activeTab === id ? styles.activeTab : ""}
            onClick={() => setActiveTab(id as typeof activeTab)}
          >
            {label}
          </button>
        ))}
      </nav>

      {activeTab === "plan" && (
        <section className={styles.twoColumn}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>16 周路线</p>
                <h2>{selectedPhase.weeks} 周：{selectedPhase.title}</h2>
              </div>
              <span>{selectedPhase.milestone}</span>
            </div>
            <div className={styles.phaseList}>
              {strengthPhases.map((phase) => (
                <article key={phase.weeks} className={phase.title === selectedPhase.title ? styles.highlightCard : ""}>
                  <strong>{phase.weeks} 周 · {phase.title}</strong>
                  <p>{phase.goal}</p>
                  <small>{phase.milestone}</small>
                </article>
              ))}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>本周训练日</p>
                <h2>{selectedSession.day}：{selectedSession.title}</h2>
              </div>
              <select value={sessionIndex} onChange={(event) => setSessionIndex(Number(event.target.value))}>
                {strengthSessions.map((session, index) => (
                  <option key={session.day} value={index}>
                    {session.day} · {session.title}
                  </option>
                ))}
              </select>
            </div>
            <p className={styles.lead}>{selectedSession.focus}</p>
            <div className={styles.checklist}>
              {checklist.map((item) => {
                const key = `${today}:${selectedSession.day}:${item.name}`;
                return (
                  <label key={`${selectedSession.day}-${item.name}`} className={completed[key] ? styles.doneItem : ""}>
                    <input type="checkbox" checked={Boolean(completed[key])} onChange={() => toggleDone(item.name)} />
                    <span>
                      <strong>{item.name}</strong>
                      <em>{item.dose}</em>
                      <small>{item.cue}</small>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className={styles.panelWide}>
            <p className={styles.eyebrow}>转专项检测</p>
            <h2>多数达标后，再把双力臂/前水平设为主线。</h2>
            <div className={styles.testGrid}>
              {readinessTests.map((test) => (
                <span key={test}>{test}</span>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === "rehab" && (
        <section className={styles.twoColumn}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>8 周肩袖恢复</p>
                <h2>{selectedRehab.weeks} 周：{selectedRehab.title}</h2>
              </div>
            </div>
            <p className={styles.lead}>{selectedRehab.prescription}</p>
            <div className={styles.phaseList}>
              {rehabStages.map((stage) => (
                <article key={stage.weeks} className={stage.title === selectedRehab.title ? styles.highlightCard : ""}>
                  <strong>{stage.weeks} 周 · {stage.title}</strong>
                  <p>{stage.prescription}</p>
                  <small>{stage.advance}</small>
                </article>
              ))}
            </div>
          </div>

          <div className={styles.panel}>
            <p className={styles.eyebrow}>疼痛交通灯</p>
            <h2>先降级，再加量。</h2>
            <div className={styles.traffic}>
              {trafficRules.map((item) => (
                <article key={item.level} data-level={item.level}>
                  <strong>{item.level}</strong>
                  <p>{item.rule}</p>
                </article>
              ))}
            </div>
            <div className={styles.warningBox}>
              <strong>立即停训并就医：</strong>
              跌倒或扭伤后畸形、完全抬不起手臂、明显无力坠落、剧烈肿胀、麻木放射痛、胸痛气短，或 12 周规范训练仍严重疼痛。
            </div>
          </div>

          <div className={styles.panelWide}>
            <p className={styles.eyebrow}>调研后优化设置</p>
            <h2>更适合你当前目标的执行规则</h2>
            <div className={styles.researchList}>
              {researchedSettings.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === "demos" && (
        <section className={styles.library}>
          <div className={styles.panelWide}>
            <p className={styles.eyebrow}>动作示范</p>
            <h2>先看动作，再照计划执行。</h2>
            <p className={styles.lead}>
              视频用于理解动作路线和常见代偿；肩袖恢复动作以无痛、慢速、可控为第一优先。若视频无法在当前网络内嵌播放，点卡片里的“打开示范”。
            </p>
          </div>
          <div className={styles.demoGrid}>
            {videoDemos.map((demo) => (
              <article className={styles.demoCard} key={demo.title}>
                <div className={styles.demoHeader}>
                  <span>{demo.group}</span>
                  <strong>{demo.title}</strong>
                  <small>{demo.target}</small>
                </div>
                {demo.videoId ? (
                  <iframe
                    className={styles.videoFrame}
                    src={`https://www.youtube.com/embed/${demo.videoId}`}
                    title={demo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <a className={styles.videoFallback} href={demo.href} target="_blank" rel="noreferrer">
                    打开示范
                  </a>
                )}
                <ul className={styles.demoCues}>
                  {demo.cues.map((cue) => (
                    <li key={cue}>{cue}</li>
                  ))}
                </ul>
                <a className={styles.demoLink} href={demo.href} target="_blank" rel="noreferrer">
                  打开示范来源
                </a>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === "logs" && (
        <section className={styles.twoColumn}>
          <form className={styles.panel} onSubmit={submitLog}>
            <p className={styles.eyebrow}>训练记录</p>
            <h2>记录一次训练或恢复课</h2>
            <div className={styles.formGrid}>
              <label>
                日期
                <input value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
              </label>
              <label>
                最高疼痛 0-10
                <input type="number" min="0" max="10" value={form.pain} onChange={(event) => setForm({ ...form, pain: event.target.value })} />
              </label>
              <label>
                RPE
                <input type="number" min="1" max="10" value={form.rpe} onChange={(event) => setForm({ ...form, rpe: event.target.value })} />
              </label>
              <label>
                睡眠小时
                <input type="number" min="0" max="14" step="0.5" value={form.sleep} onChange={(event) => setForm({ ...form, sleep: event.target.value })} />
              </label>
            </div>
            <label className={styles.noteField}>
              备注
              <textarea
                rows={4}
                placeholder="动作质量、次晨反应、是否需要回退..."
                value={form.note}
                onChange={(event) => setForm({ ...form, note: event.target.value })}
              />
            </label>
            <button type="submit" className={styles.primaryButton}>保存记录</button>
          </form>

          <div className={styles.panel}>
            <p className={styles.eyebrow}>最近记录</p>
            <h2>用趋势判断是否该进阶</h2>
            <div className={styles.logList}>
              {logs.length === 0 && <p className={styles.empty}>还没有记录。先做今天的维护课，回来打第一条。</p>}
              {logs.map((entry) => (
                <article key={entry.id}>
                  <div>
                    <strong>{entry.date}</strong>
                    <span>{entry.session}</span>
                  </div>
                  <p>痛 {entry.pain}/10 · RPE {entry.rpe} · 睡眠 {entry.sleep}h</p>
                  {entry.note && <small>{entry.note}</small>}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === "library" && (
        <section className={styles.library}>
          <div className={styles.panelWide}>
            <p className={styles.eyebrow}>完整原文</p>
            <h2>两份 PDF 已放入网页，可直接核对原文。</h2>
            <p className={styles.lead}>
              上面的计划卡片用于执行；这里保留 PDF 完整内容，避免训练细节丢失。若浏览器未直接显示 PDF，可点标题在新标签打开。
            </p>
          </div>
          {pdfs.map((pdf) => (
            <article className={styles.pdfFrame} key={pdf.href}>
              <a href={pdf.href} target="_blank" rel="noreferrer">{pdf.title}</a>
              <iframe src={pdf.href} title={pdf.title} />
            </article>
          ))}
          <div className={styles.panelWide}>
            <p className={styles.eyebrow}>外部依据</p>
            <h2>用于校准计划的优先来源</h2>
            <div className={styles.sourceGrid}>
              {sources.map((source) => (
                <a href={source.href} key={source.href} target="_blank" rel="noreferrer">
                  {source.label}
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
