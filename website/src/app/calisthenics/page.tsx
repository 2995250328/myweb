"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import styles from "./page.module.css";

type Exercise = {
  name: string;
  dose: string;
  cue: string;
  demo?: string;
  mistake?: string;
  sourceHref?: string;
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

type RehabDay = {
  day: string;
  type: "完整恢复课" | "12 分钟维护" | "技术回归" | "休息";
  detail: string;
};

type RehabExercise = {
  name: string;
  weeks: string;
  dose: string;
  cue: string;
  mistake: string;
  demo: string;
  sourceLabel: string;
  sourceHref: string;
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
      { name: "热身", dose: "8-10 分钟", cue: "低强度有氧、肩带热身、腕部活动、dead bug、arch hang。", demo: "warmup", mistake: "直接上强度、手腕肩胛没准备。", sourceHref: "https://www.reddit.com/r/bodyweightfitness/wiki/kb/recommended_routine/" },
      { name: "tuck / advanced tuck front lever hold", dose: "5 x 8-12 秒", cue: "肩胛下沉后倾，躯干空心，髋别塌。", demo: "frontLever", mistake: "弯肘、耸肩、髋塌、腰反弓。", sourceHref: "https://www.youtube.com/watch?v=rx0vr-teG7M" },
      { name: "严格引体或加重引体", dose: "4 x 4-6", cue: "RPE 7-8，保留 1-3 次余力。", demo: "pullup", mistake: "甩腿借力、半程、下放失控。", sourceHref: "https://www.youtube.com/watch?v=aNUSgyWRJYA" },
      { name: "胸触杠引体 / 爆发引体", dose: "4 x 3-5", cue: "速度优先，变慢就停。", demo: "highPull", mistake: "只抬头不拉高、摆动太大、速度下降还硬做。", sourceHref: "https://www.youtube.com/results?search_query=chest+to+bar+pull+up+calisthenics" },
      { name: "环/杠划船", dose: "3 x 8-12", cue: "肩胛后缩下沉，身体保持一条线。", demo: "bodyRow", mistake: "塌腰、耸肩、只用手臂拉。", sourceHref: "https://www.reddit.com/r/bodyweightfitness/wiki/exercises/row/" },
      { name: "直臂下压 / 弹力带前水平下压", dose: "3 x 12-15", cue: "肘伸直，背阔主动发力。", demo: "straightArmPulldown", mistake: "肘弯曲、肩前顶、用身体压。", sourceHref: "https://www.youtube.com/results?search_query=straight+arm+pulldown+front+lever+calisthenics" },
      { name: "悬垂举腿", dose: "3 x 6-10", cue: "不要甩腿，骨盆后倾收住。", demo: "hangingLegRaise", mistake: "摆动、腰反弓、只屈髋不卷骨盆。", sourceHref: "https://www.youtube.com/results?search_query=hanging+leg+raise+calisthenics+form" },
    ],
  },
  {
    day: "第 2 天",
    title: "推力 + 俄挺基础",
    focus: "支撑、肩胛前伸、直臂组织适应和 L-sit 压缩。",
    exercises: [
      { name: "热身", dose: "8-12 分钟", cue: "低强度有氧、手腕预热、wall slide、肩胛俯卧撑。", demo: "wristWarmup", mistake: "手腕没热开就做大角度支撑。", sourceHref: "https://www.reddit.com/r/bodyweightfitness/wiki/kb/recommended_routine/" },
      { name: "planche lean", dose: "5 x 10-20 秒", cue: "主动推地，肘锁定，手腕无痛才加前倾。", demo: "plancheLean", mistake: "只前倒不推地、肘弯、手腕痛还硬撑。", sourceHref: "https://www.youtube.com/results?search_query=planche+lean+tutorial+calisthenics" },
      { name: "双杠臂屈伸 / 加重双杠臂屈伸", dose: "4 x 5-8", cue: "底位稳定，肩不要前顶。", demo: "dip", mistake: "下放过深、肩前顶、耸肩。", sourceHref: "https://www.reddit.com/r/bodyweightfitness/wiki/exercises/dip/" },
      { name: "伪俄挺俯卧撑", dose: "4 x 6-10", cue: "身体前移但不塌腰，肩胛保持前伸。", demo: "pseudoPlanchePushup", mistake: "塌腰、肘外飞、前倾太大导致腕痛。", sourceHref: "https://www.youtube.com/results?search_query=pseudo+planche+push+up+tutorial" },
      { name: "pike push-up", dose: "3 x 6-10", cue: "头部落点稳定，肘向后下。", demo: "pikePushup", mistake: "头随便落、肘外飞、腰反弓。", sourceHref: "https://fitnessfaqs.com/articles/ff-video-tag/handstands/" },
      { name: "L-sit tuck / L-sit", dose: "5 x 10-20 秒", cue: "肩压稳，膝伸直路线逐步推进。", demo: "lsit", mistake: "肩塌、膝松、用摆动抬腿。", sourceHref: "https://www.reddit.com/r/bodyweightfitness/wiki/exercises/l-sit/" },
      { name: "弹力带外旋 + face pull", dose: "各 2-3 x 12-15", cue: "控制式，不追重量。", demo: "facePull", mistake: "重量太大、耸肩、腰后仰。", sourceHref: "https://orthoinfo.aaos.org/en/recovery/rotator-cuff-and-shoulder-conditioning-program/" },
    ],
  },
  {
    day: "第 3 天",
    title: "倒立 + 垂直推 + 稳定性",
    focus: "肩屈活动度、过顶承重、前锯肌与倒立线条。",
    exercises: [
      { name: "热身", dose: "8-12 分钟", cue: "肩屈活动、胸椎伸展、腕部热身、肩胛上提下压。", demo: "overheadWarmup", mistake: "肩屈没打开就上墙。", sourceHref: "https://fitnessfaqs.com/articles/ff-video-tag/handstands/" },
      { name: "面墙倒立", dose: "6 x 20-45 秒", cue: "臀肋收紧，耳夹臂，掌指主动抓地。", demo: "wallHandstand", mistake: "腰反弓、耸肩塌肩、头抬太多。", sourceHref: "https://fitnessfaqs.com/articles/ff-video-tag/handstands/" },
      { name: "pike push-up 或靠墙倒立撑离心", dose: "4 x 4-8", cue: "RPE 7-8，动作线条优先。", demo: "pikePushup", mistake: "下放撞头、肘外飞、躯干松。", sourceHref: "https://fitnessfaqs.com/articles/ff-video-tag/handstands/" },
      { name: "wall walk / 肩触墙倒立控制", dose: "4 x 3-6", cue: "技术练习，不做疲劳堆量。", demo: "wallWalk", mistake: "走太近导致塌腰、手步太大、肩不稳。", sourceHref: "https://fitnessfaqs.com/articles/ff-video-tag/handstands/" },
      { name: "serratus wall slide / push-up plus", dose: "2-3 x 10-12", cue: "重点是推开地面或墙面。", demo: "pushUpPlus", mistake: "弯肘、耸肩、胸椎塌陷。", sourceHref: "https://www.physio-pedia.com/Push_Up_Plus_Exercise" },
      { name: "hollow hold + arch hold", dose: "各 3 x 20-30 秒", cue: "建立前水平与倒立的躯干张力。", demo: "hollowArch", mistake: "腰离地、憋气、肩颈紧。", sourceHref: "https://www.reddit.com/r/bodyweightfitness/wiki/exercises/core/" },
    ],
  },
  {
    day: "第 4 天",
    title: "双力臂 + 综合力量 + 下肢保留",
    focus: "转杠技术、爆发拉力、下肢维持与整体恢复。",
    exercises: [
      { name: "热身", dose: "8-10 分钟", cue: "全身动态热身、腕肩髋准备。", demo: "warmup", mistake: "冷启动就做爆发拉。", sourceHref: "https://www.reddit.com/r/bodyweightfitness/wiki/kb/recommended_routine/" },
      { name: "低杠转杠 / 弹力带辅助双力臂", dose: "5 x 2-4", cue: "先高拉，再快转，再稳撑。", demo: "muscleUpTransition", mistake: "只翻腕、拉高不够、支撑末端塌肩。", sourceHref: "https://www.youtube.com/results?search_query=strict+muscle+up+tutorial+calisthenics" },
      { name: "爆发引体", dose: "5 x 3", cue: "每组速度快，质量下降就减少组数。", demo: "highPull", mistake: "速度变慢还硬做、摆动太大。", sourceHref: "https://www.youtube.com/results?search_query=explosive+pull+up+calisthenics+tutorial" },
      { name: "深蹲/保加利亚分腿蹲 + RDL/单腿 RDL", dose: "4 x 5-8 + 3 x 6-8", cue: "RPE 7-8，保留下肢能力。", demo: "lowerBody", mistake: "膝内扣、髋铰链变弯腰、动作太快。", sourceHref: "https://www.youtube.com/results?search_query=bulgarian+split+squat+single+leg+rdl+form" },
      { name: "dip support hold", dose: "3 x 20-30 秒", cue: "肩稳定，肘伸直，胸骨打开。", demo: "dipSupport", mistake: "耸肩、肘弯、胸塌。", sourceHref: "https://www.reddit.com/r/bodyweightfitness/wiki/exercises/dip/" },
      { name: "chin-up 或中立握引体", dose: "3 x 6-10", cue: "补拉力，避免借摆。", demo: "neutralPull", mistake: "借摆、耸肩启动、下放失控。", sourceHref: "https://www.youtube.com/watch?v=aNUSgyWRJYA" },
      { name: "侧桥或反向挺身", dose: "3 x 20-30 秒或 2 x 10-15", cue: "给躯干和后链收尾。", demo: "sideBridge", mistake: "髋塌、肩顶不稳、憋气。", sourceHref: "https://www.youtube.com/results?search_query=side+plank+back+extension+form" },
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

const maintenance: Exercise[] = [
  { name: "Pendulum", dose: "1 分钟", cue: "身体前倾，手臂像钟摆轻摆，不主动甩臂。", demo: "pendulum", mistake: "主动抡手臂、耸肩。", sourceHref: "https://orthoinfo.aaos.org/en/recovery/shoulder-surgery-exercise-guide/" },
  { name: "交叉抱肩拉伸", dose: "2 x 30 秒", cue: "拉后肩，不用手硬压肘。", demo: "crossover", mistake: "压肘关节、肩前顶。", sourceHref: "https://orthoinfo.aaos.org/en/recovery/rotator-cuff-and-shoulder-conditioning-program/" },
  { name: "墙滑 Wall Slide", dose: "2 x 10", cue: "肋骨收住，前臂贴墙，上滑到不代偿的位置。", demo: "wallSlide", mistake: "腰反弓、前臂离墙。", sourceHref: "https://www.hingehealth.com/resources/articles/wall-slides/" },
  { name: "弹力带外旋", dose: "2 x 15", cue: "手肘夹身，前臂像门轴旋开。", demo: "bandExternal", mistake: "手肘外飞、身体后仰。", sourceHref: "https://www.youtube.com/watch?v=BY7UKjJMx2A" },
  { name: "Serratus Wall Slide 或 Push-up Plus", dose: "2 x 10", cue: "推开地面或墙，避免耸肩。", demo: "pushUpPlus", mistake: "弯肘、耸肩。", sourceHref: "https://www.physio-pedia.com/Push_Up_Plus_Exercise" },
  { name: "站姿划船", dose: "2 x 12", cue: "肩胛后缩下沉，胸骨保持展开。", demo: "row", mistake: "耸肩、腰后仰。", sourceHref: "https://orthoinfo.aaos.org/en/recovery/rotator-cuff-and-shoulder-conditioning-program/" },
];

const rehabWeeklySchedule: RehabDay[] = [
  {
    day: "周一",
    type: "完整恢复课",
    detail: "维护课 12 分钟 + 当前阶段肩袖/肩胛强化。记录最高疼痛和次晨反应。",
  },
  {
    day: "周二",
    type: "12 分钟维护",
    detail: "只做维护课；可加下肢、有氧或散步，不做上肢爆发。",
  },
  {
    day: "周三",
    type: "完整恢复课",
    detail: "维护课 12 分钟 + 闭链稳定或轻度街健回归。动作全程保留 2-3 次余力。",
  },
  {
    day: "周四",
    type: "12 分钟维护",
    detail: "维护课 + 休息/步行。若前一天次晨更痛，今天只做无痛 ROM。",
  },
  {
    day: "周五",
    type: "完整恢复课",
    detail: "维护课 12 分钟 + 肩袖/肩胛强化。只有绿灯状态才维持或小幅推进。",
  },
  {
    day: "周六",
    type: "技术回归",
    detail: "第 1-4 周只做维护课；第 5-8 周可加低风险回归动作，如中立握引体辅助、高斜板俯卧撑、低角度 pike hold。",
  },
  {
    day: "周日",
    type: "休息",
    detail: "散步、胸椎活动或轻拉伸。若夜间痛/静息痛回潮，下一周不要升级。",
  },
];

const rehabExercises: RehabExercise[] = [
  {
    name: "Pendulum",
    weeks: "1-8",
    dose: "2 x 10/方向 或 1 分钟",
    cue: "身体带动手臂轻摆，不主动甩肩。疼痛期用它做低刺激活动。",
    mistake: "主动抡手臂、耸肩、弯腰塌背。",
    demo: "pendulum",
    sourceLabel: "AAOS pendulum 图文",
    sourceHref: "https://orthoinfo.aaos.org/en/recovery/shoulder-surgery-exercise-guide/",
  },
  {
    name: "交叉抱肩拉伸",
    weeks: "1-8",
    dose: "2-4 x 30 秒/侧",
    cue: "拉后肩，不把肩头向前顶。刺痛时减小幅度。",
    mistake: "压肘关节、肩前顶、用力拉到疼痛。",
    demo: "crossover",
    sourceLabel: "AAOS crossover 图文",
    sourceHref: "https://orthoinfo.aaos.org/en/recovery/rotator-cuff-and-shoulder-conditioning-program/",
  },
  {
    name: "被动外旋/内旋拉伸",
    weeks: "1-2",
    dose: "各 4 x 30 秒",
    cue: "轻拉到紧，不拉到痛。用于恢复活动度，不追极限角度。",
    mistake: "身体扭转代偿、肘离开身体、拉到刺痛。",
    demo: "stickRotation",
    sourceLabel: "AAOS 被动旋转图文",
    sourceHref: "https://orthoinfo.aaos.org/en/recovery/rotator-cuff-and-shoulder-conditioning-program/",
  },
  {
    name: "墙滑 Wall Slide",
    weeks: "1-8",
    dose: "2-3 x 8-12",
    cue: "肋骨收住，前臂贴墙；一耸肩或腰反弓就停在较低高度。",
    mistake: "腰反弓、肋骨外翻、前臂离墙、越滑越耸肩。",
    demo: "wallSlide",
    sourceLabel: "Wall slide 图文",
    sourceHref: "https://www.hingehealth.com/resources/articles/wall-slides/",
  },
  {
    name: "肩胛后缩/下沉",
    weeks: "1-2",
    dose: "2-3 x 10，每次停 3-5 秒",
    cue: "轻轻把肩胛放回稳定位置，不夹到脖子紧。",
    mistake: " shrug 耸肩、过度夹背、腰椎代偿。",
    demo: "scapSet",
    sourceLabel: "AAOS 肩部调理图文",
    sourceHref: "https://orthoinfo.aaos.org/en/recovery/rotator-cuff-and-shoulder-conditioning-program/",
  },
  {
    name: "弹力带外旋等长",
    weeks: "1-2",
    dose: "5 x 20-30 秒",
    cue: "手肘夹身，肩不耸。RPE 3-4，接近无痛。",
    mistake: "手肘外飞、身体后仰、阻力太大。",
    demo: "bandExternal",
    sourceLabel: "外旋动作视频",
    sourceHref: "https://www.youtube.com/watch?v=BY7UKjJMx2A",
  },
  {
    name: "弹力带外旋/内旋",
    weeks: "3-8",
    dose: "3 x 12-15",
    cue: "前臂像门轴旋转，身体不后仰。宁可轻阻力慢节奏。",
    mistake: "用身体转动代偿、肘离身、速度太快。",
    demo: "bandRotation",
    sourceLabel: "弹力带旋转视频",
    sourceHref: "https://www.stoneclinic.com/video/Shoulder-Theraband-External-and-Internal-Rotation",
  },
  {
    name: "侧卧外旋",
    weeks: "3-8",
    dose: "3 x 12-15",
    cue: "1-2 kg 起步，肘下可垫毛巾。顶端停一下，不借惯性。",
    mistake: "肘离开身体、手腕乱甩、重量太重导致耸肩。",
    demo: "sideLyingER",
    sourceLabel: "E3 Rehab 肩袖训练",
    sourceHref: "https://e3rehab.com/rotator-cuff-exercises/",
  },
  {
    name: "站姿划船",
    weeks: "1-8",
    dose: "2-3 x 10-12",
    cue: "肩胛后缩下沉，胸骨展开，手肘不要飞太高。",
    mistake: "手臂硬拉、耸肩、腰后仰。",
    demo: "row",
    sourceLabel: "AAOS row 图文",
    sourceHref: "https://orthoinfo.aaos.org/en/recovery/rotator-cuff-and-shoulder-conditioning-program/",
  },
  {
    name: "Serratus Wall Slide / Push-up Plus",
    weeks: "3-8",
    dose: "2-3 x 10-15",
    cue: "重点是推开墙/地面，练前锯肌，不是耸肩。",
    mistake: "弯肘做成俯卧撑、耸肩、胸椎塌陷。",
    demo: "pushUpPlus",
    sourceLabel: "Push-up plus 图文",
    sourceHref: "https://www.physio-pedia.com/Push_Up_Plus_Exercise",
  },
  {
    name: "俯卧 Y / 低斜板 Y",
    weeks: "3-6",
    dose: "2-3 x 8-12",
    cue: "拇指朝上，低负荷找下斜方和肩胛控制。",
    mistake: "抬太高、耸肩、用腰背猛拱。",
    demo: "proneY",
    sourceLabel: "肩胛稳定参考",
    sourceHref: "https://www.physio-pedia.com/Therapeutic_Exercise_for_the_Shoulder",
  },
  {
    name: "桌上闭链负重转移",
    weeks: "3-6",
    dose: "3 x 20-30 秒",
    cue: "从高支撑开始，左右轻移重心；肩不塌、不耸、不痛。",
    mistake: "肩塌下去、手腕疼还硬撑、重心移动太大。",
    demo: "weightShift",
    sourceLabel: "闭链稳定参考",
    sourceHref: "https://www.physio-pedia.com/Therapeutic_Exercise_for_the_Shoulder",
  },
  {
    name: "90 度外展位外旋",
    weeks: "5-8",
    dose: "2-3 x 8-10",
    cue: "只在无静息痛、ROM 明显恢复后加。动作慢，阻力轻。",
    mistake: "肘掉下去、肩前顶、为了转得多而扭身体。",
    demo: "ninetyER",
    sourceLabel: "AAOS 90 度外旋图文",
    sourceHref: "https://orthoinfo.aaos.org/en/recovery/rotator-cuff-and-shoulder-conditioning-program/",
  },
  {
    name: "低斜板肩触碰",
    weeks: "5-8",
    dose: "3 x 6-10/侧",
    cue: "骨盆和胸廓不晃，肩胛稳定。疼痛超过 3/10 立刻退回支撑保持。",
    mistake: "身体左右甩、支撑肩塌陷、速度太快。",
    demo: "shoulderTap",
    sourceLabel: "闭链稳定参考",
    sourceHref: "https://www.physio-pedia.com/Therapeutic_Exercise_for_the_Shoulder",
  },
  {
    name: "低角度 pike hold",
    weeks: "7-8",
    dose: "4 x 20-30 秒",
    cue: "恢复过顶承重前置动作。肩屈不足或次晨更痛就取消。",
    mistake: "腰反弓、耸肩塌肩、角度太低太激进。",
    demo: "pikeHold",
    sourceLabel: "倒立基础示范",
    sourceHref: "https://fitnessfaqs.com/articles/ff-video-tag/handstands/",
  },
  {
    name: "中立握引体回归",
    weeks: "7-8",
    dose: "3-5 组，保留 2-3 次余力",
    cue: "只做严格、慢速、无次晨反应的版本，不做爆发拉或借力。",
    mistake: "借摆、耸肩启动、下放失控。",
    demo: "neutralPull",
    sourceLabel: "引体示范视频",
    sourceHref: "https://www.youtube.com/watch?v=aNUSgyWRJYA",
  },
  {
    name: "高斜板俯卧撑",
    weeks: "7-8",
    dose: "3 x 8-12",
    cue: "用高台降低肩负荷，肩胛稳定、全程无痛才逐步降高度。",
    mistake: "下放过深、肩前顶、肘外飞。",
    demo: "inclinePush",
    sourceLabel: "Push-up plus 参考",
    sourceHref: "https://www.physio-pedia.com/Pushups",
  },
];

function rehabFocusForWeek(week: number) {
  if (week <= 2) {
    return [
      "Pendulum",
      "交叉抱肩拉伸",
      "被动外旋/内旋拉伸",
      "墙滑 Wall Slide",
      "肩胛后缩/下沉",
      "弹力带外旋等长",
      "Serratus Wall Slide / Push-up Plus",
      "站姿划船",
    ];
  }

  if (week <= 4) {
    return [
      "弹力带外旋/内旋",
      "侧卧外旋",
      "站姿划船",
      "Serratus Wall Slide / Push-up Plus",
      "俯卧 Y / 低斜板 Y",
      "桌上闭链负重转移",
    ];
  }

  if (week <= 6) {
    return [
      "侧卧外旋",
      "弹力带外旋/内旋",
      "90 度外展位外旋",
      "站姿划船",
      "Serratus Wall Slide / Push-up Plus",
      "低斜板肩触碰",
      "俯卧 Y / 低斜板 Y",
    ];
  }

  return [
    "侧卧外旋",
    "90 度外展位外旋",
    "Serratus Wall Slide / Push-up Plus",
    "站姿划船",
    "低角度 pike hold",
    "中立握引体回归",
    "高斜板俯卧撑",
    "桌上闭链负重转移",
  ];
}

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

function RehabIllustration({ kind }: { kind: string }) {
  const stroke = "#1f2528";
  const accent = "#c95645";
  const support = "#2f6858";

  return (
    <svg className={styles.rehabSvg} viewBox="0 0 240 150" role="img" aria-label="动作示意图">
      <rect width="240" height="150" rx="10" fill="#f7f3e8" />
      <line x1="18" y1="128" x2="222" y2="128" stroke="#d8d2c4" strokeWidth="4" />
      {kind === "pendulum" && (
        <>
          <circle cx="92" cy="38" r="13" fill={stroke} />
          <path d="M88 52 L62 88 L108 88 Z" fill="none" stroke={stroke} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="108" y1="88" x2="118" y2="126" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
          <line x1="76" y1="88" x2="62" y2="126" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
          <line x1="111" y1="66" x2="138" y2="113" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <path d="M126 92 Q148 105 132 124" fill="none" stroke={accent} strokeWidth="3" strokeDasharray="4 4" />
          <text x="138" y="45" fontSize="14" fill={support} fontWeight="700">身体前倾，手臂放松摆</text>
        </>
      )}
      {kind === "crossover" && (
        <>
          <circle cx="88" cy="35" r="13" fill={stroke} />
          <line x1="88" y1="50" x2="88" y2="103" stroke={stroke} strokeWidth="9" strokeLinecap="round" />
          <line x1="88" y1="60" x2="160" y2="72" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="125" y1="67" x2="96" y2="86" stroke={support} strokeWidth="7" strokeLinecap="round" />
          <line x1="83" y1="103" x2="65" y2="128" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
          <line x1="93" y1="103" x2="116" y2="128" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
          <text x="120" y="42" fontSize="14" fill={support} fontWeight="700">拉后肩，不压肘</text>
        </>
      )}
      {kind === "stickRotation" && (
        <>
          <circle cx="88" cy="33" r="13" fill={stroke} />
          <line x1="88" y1="48" x2="88" y2="102" stroke={stroke} strokeWidth="9" strokeLinecap="round" />
          <line x1="74" y1="66" x2="102" y2="66" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          <line x1="102" y1="66" x2="132" y2="86" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          <line x1="64" y1="58" x2="144" y2="96" stroke={support} strokeWidth="4" strokeLinecap="round" />
          <path d="M118 58 Q145 71 133 102" fill="none" stroke={accent} strokeWidth="3" strokeDasharray="4 4" />
          <line x1="83" y1="102" x2="66" y2="128" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
          <line x1="93" y1="102" x2="112" y2="128" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
        </>
      )}
      {kind === "wallSlide" && (
        <>
          <rect x="170" y="18" width="8" height="110" fill={support} />
          <circle cx="105" cy="42" r="13" fill={stroke} />
          <line x1="105" y1="56" x2="112" y2="110" stroke={stroke} strokeWidth="9" strokeLinecap="round" />
          <line x1="100" y1="68" x2="145" y2="36" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          <line x1="119" y1="70" x2="158" y2="45" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          <path d="M145 98 L158 45" stroke={support} strokeWidth="4" strokeLinecap="round" />
          <line x1="107" y1="110" x2="86" y2="128" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
          <line x1="116" y1="110" x2="138" y2="128" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
          <text x="24" y="26" fontSize="14" fill={support} fontWeight="700">前臂贴墙上滑</text>
        </>
      )}
      {kind === "scapSet" && (
        <>
          <circle cx="112" cy="33" r="13" fill={stroke} />
          <line x1="112" y1="48" x2="112" y2="112" stroke={stroke} strokeWidth="9" strokeLinecap="round" />
          <path d="M82 70 Q112 92 142 70" fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          <path d="M92 76 L102 86 M132 76 L122 86" stroke={support} strokeWidth="3" strokeLinecap="round" />
          <line x1="107" y1="112" x2="90" y2="128" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
          <line x1="117" y1="112" x2="136" y2="128" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
          <text x="42" y="26" fontSize="14" fill={support} fontWeight="700">肩胛轻收、下沉</text>
        </>
      )}
      {(kind === "bandExternal" || kind === "bandRotation" || kind === "ninetyER") && (
        <>
          <rect x="188" y="38" width="7" height="75" fill={support} />
          <circle cx="90" cy="34" r="13" fill={stroke} />
          <line x1="90" y1="49" x2="90" y2="112" stroke={stroke} strokeWidth="9" strokeLinecap="round" />
          {kind === "ninetyER" ? (
            <>
              <line x1="91" y1="63" x2="132" y2="63" stroke={accent} strokeWidth="8" strokeLinecap="round" />
              <line x1="132" y1="63" x2="132" y2="25" stroke={accent} strokeWidth="8" strokeLinecap="round" />
              <line x1="132" y1="25" x2="190" y2="52" stroke={support} strokeWidth="4" strokeLinecap="round" />
            </>
          ) : (
            <>
              <line x1="92" y1="69" x2="121" y2="69" stroke={accent} strokeWidth="8" strokeLinecap="round" />
              <line x1="121" y1="69" x2="150" y2="87" stroke={accent} strokeWidth="8" strokeLinecap="round" />
              <line x1="150" y1="87" x2="190" y2="78" stroke={support} strokeWidth="4" strokeLinecap="round" />
            </>
          )}
          <line x1="85" y1="112" x2="68" y2="128" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
          <line x1="95" y1="112" x2="114" y2="128" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
        </>
      )}
      {kind === "sideLyingER" && (
        <>
          <rect x="52" y="102" width="130" height="10" rx="4" fill={support} />
          <circle cx="70" cy="82" r="13" fill={stroke} />
          <line x1="84" y1="91" x2="146" y2="103" stroke={stroke} strokeWidth="12" strokeLinecap="round" />
          <line x1="112" y1="82" x2="132" y2="82" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="132" y1="82" x2="132" y2="52" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <rect x="126" y="42" width="14" height="14" rx="3" fill={accent} />
          <text x="118" y="28" fontSize="14" fill={support} fontWeight="700">肘夹身，小重量</text>
        </>
      )}
      {kind === "row" && (
        <>
          <rect x="188" y="42" width="7" height="70" fill={support} />
          <circle cx="94" cy="35" r="13" fill={stroke} />
          <line x1="94" y1="50" x2="98" y2="112" stroke={stroke} strokeWidth="9" strokeLinecap="round" />
          <line x1="100" y1="70" x2="142" y2="78" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="142" y1="78" x2="190" y2="68" stroke={support} strokeWidth="4" strokeLinecap="round" />
          <path d="M82 72 Q98 84 114 72" fill="none" stroke={support} strokeWidth="3" />
          <line x1="94" y1="112" x2="76" y2="128" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
          <line x1="103" y1="112" x2="122" y2="128" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
        </>
      )}
      {kind === "pushUpPlus" && (
        <>
          <line x1="54" y1="88" x2="168" y2="88" stroke={stroke} strokeWidth="11" strokeLinecap="round" />
          <circle cx="181" cy="82" r="12" fill={stroke} />
          <line x1="78" y1="91" x2="62" y2="126" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="145" y1="90" x2="158" y2="126" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <path d="M92 72 Q114 60 136 72" fill="none" stroke={support} strokeWidth="4" strokeLinecap="round" />
          <text x="58" y="32" fontSize="14" fill={support} fontWeight="700">肘伸直，主动推开</text>
        </>
      )}
      {kind === "proneY" && (
        <>
          <rect x="50" y="98" width="130" height="9" rx="4" fill={support} />
          <circle cx="74" cy="80" r="12" fill={stroke} />
          <line x1="86" y1="89" x2="146" y2="101" stroke={stroke} strokeWidth="11" strokeLinecap="round" />
          <line x1="106" y1="88" x2="140" y2="55" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          <line x1="112" y1="91" x2="154" y2="69" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          <text x="112" y="30" fontSize="14" fill={support} fontWeight="700">Y 字上抬，不耸肩</text>
        </>
      )}
      {kind === "weightShift" && (
        <>
          <rect x="54" y="95" width="124" height="8" rx="4" fill={support} />
          <circle cx="132" cy="42" r="12" fill={stroke} />
          <line x1="132" y1="56" x2="118" y2="92" stroke={stroke} strokeWidth="10" strokeLinecap="round" />
          <line x1="116" y1="76" x2="84" y2="101" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="126" y1="76" x2="164" y2="101" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <path d="M84 115 Q120 132 164 115" fill="none" stroke={support} strokeWidth="4" strokeDasharray="5 5" />
          <text x="58" y="28" fontSize="14" fill={support} fontWeight="700">左右轻移重心</text>
        </>
      )}
      {kind === "shoulderTap" && (
        <>
          <line x1="58" y1="86" x2="170" y2="86" stroke={stroke} strokeWidth="11" strokeLinecap="round" />
          <circle cx="184" cy="80" r="12" fill={stroke} />
          <line x1="82" y1="90" x2="66" y2="126" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="148" y1="88" x2="162" y2="126" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <path d="M118 83 Q146 66 158 84" fill="none" stroke={support} strokeWidth="6" strokeLinecap="round" />
          <text x="64" y="30" fontSize="14" fill={support} fontWeight="700">身体不晃，轻触肩</text>
        </>
      )}
      {kind === "pikeHold" && (
        <>
          <circle cx="156" cy="78" r="12" fill={stroke} />
          <line x1="150" y1="90" x2="102" y2="66" stroke={stroke} strokeWidth="11" strokeLinecap="round" />
          <line x1="102" y1="66" x2="62" y2="126" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="100" y1="68" x2="140" y2="126" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="156" y1="90" x2="185" y2="124" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <text x="46" y="30" fontSize="14" fill={support} fontWeight="700">低角度，肩不过痛区</text>
        </>
      )}
      {kind === "neutralPull" && (
        <>
          <line x1="60" y1="30" x2="180" y2="30" stroke={support} strokeWidth="8" strokeLinecap="round" />
          <circle cx="120" cy="66" r="13" fill={stroke} />
          <line x1="120" y1="80" x2="120" y2="120" stroke={stroke} strokeWidth="9" strokeLinecap="round" />
          <line x1="110" y1="55" x2="90" y2="32" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          <line x1="130" y1="55" x2="150" y2="32" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          <line x1="116" y1="120" x2="98" y2="128" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
          <line x1="124" y1="120" x2="142" y2="128" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
          <text x="62" y="145" fontSize="13" fill={support} fontWeight="700">严格慢速，保留余力</text>
        </>
      )}
      {kind === "inclinePush" && (
        <>
          <rect x="154" y="88" width="52" height="10" rx="4" fill={support} />
          <circle cx="83" cy="64" r="12" fill={stroke} />
          <line x1="95" y1="72" x2="154" y2="90" stroke={stroke} strokeWidth="11" strokeLinecap="round" />
          <line x1="154" y1="90" x2="184" y2="98" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="112" y1="78" x2="64" y2="126" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <text x="72" y="30" fontSize="14" fill={support} fontWeight="700">高台降低肩负荷</text>
        </>
      )}
    </svg>
  );
}

function StrengthIllustration({ kind = "warmup" }: { kind?: string }) {
  const stroke = "#1f2528";
  const accent = "#c95645";
  const support = "#2f6858";

  return (
    <svg className={styles.strengthSvg} viewBox="0 0 260 160" role="img" aria-label="专项动作示意图">
      <rect width="260" height="160" rx="10" fill="#f7f3e8" />
      <line x1="18" y1="138" x2="242" y2="138" stroke="#d8d2c4" strokeWidth="4" />
      {(kind === "pullup" || kind === "highPull" || kind === "neutralPull") && (
        <>
          <line x1="58" y1="30" x2="202" y2="30" stroke={support} strokeWidth="9" strokeLinecap="round" />
          <circle cx="130" cy={kind === "highPull" ? 55 : 72} r="13" fill={stroke} />
          <line x1="130" y1={kind === "highPull" ? 69 : 86} x2="130" y2="126" stroke={stroke} strokeWidth="10" strokeLinecap="round" />
          <line x1="118" y1={kind === "highPull" ? 48 : 58} x2="100" y2="32" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="142" y1={kind === "highPull" ? 48 : 58} x2="160" y2="32" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="126" y1="126" x2="108" y2="138" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
          <line x1="134" y1="126" x2="152" y2="138" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
          <text x="72" y="154" fontSize="13" fill={support} fontWeight="700">{kind === "highPull" ? "胸口拉向杠，速度优先" : "肩胛先下沉，严格全程"}</text>
        </>
      )}
      {kind === "frontLever" && (
        <>
          <line x1="42" y1="34" x2="210" y2="34" stroke={support} strokeWidth="9" strokeLinecap="round" />
          <circle cx="76" cy="70" r="12" fill={stroke} />
          <line x1="88" y1="73" x2="166" y2="76" stroke={stroke} strokeWidth="12" strokeLinecap="round" />
          <line x1="73" y1="56" x2="58" y2="36" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          <line x1="82" y1="56" x2="98" y2="36" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          <line x1="142" y1="76" x2="142" y2="116" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="158" y1="76" x2="158" y2="116" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <text x="80" y="145" fontSize="13" fill={support} fontWeight="700">肩胛下沉，髋不塌</text>
        </>
      )}
      {kind === "bodyRow" && (
        <>
          <line x1="52" y1="62" x2="202" y2="62" stroke={support} strokeWidth="8" strokeLinecap="round" />
          <circle cx="92" cy="92" r="12" fill={stroke} />
          <line x1="104" y1="96" x2="180" y2="118" stroke={stroke} strokeWidth="11" strokeLinecap="round" />
          <line x1="96" y1="78" x2="82" y2="64" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          <line x1="108" y1="82" x2="126" y2="64" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          <line x1="170" y1="118" x2="204" y2="138" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
          <text x="72" y="34" fontSize="13" fill={support} fontWeight="700">身体一条线，拉胸靠近杠</text>
        </>
      )}
      {kind === "straightArmPulldown" && (
        <>
          <rect x="205" y="32" width="8" height="84" fill={support} />
          <circle cx="86" cy="42" r="12" fill={stroke} />
          <line x1="86" y1="56" x2="90" y2="118" stroke={stroke} strokeWidth="9" strokeLinecap="round" />
          <line x1="92" y1="68" x2="154" y2="92" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="154" y1="92" x2="210" y2="70" stroke={support} strokeWidth="4" strokeLinecap="round" />
          <text x="64" y="148" fontSize="13" fill={support} fontWeight="700">肘伸直，背阔下压</text>
        </>
      )}
      {kind === "hangingLegRaise" && (
        <>
          <line x1="58" y1="28" x2="202" y2="28" stroke={support} strokeWidth="9" strokeLinecap="round" />
          <circle cx="130" cy="58" r="12" fill={stroke} />
          <line x1="130" y1="72" x2="130" y2="110" stroke={stroke} strokeWidth="10" strokeLinecap="round" />
          <line x1="119" y1="48" x2="100" y2="30" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          <line x1="141" y1="48" x2="160" y2="30" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          <line x1="126" y1="110" x2="92" y2="96" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="134" y1="110" x2="170" y2="96" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <text x="80" y="148" fontSize="13" fill={support} fontWeight="700">骨盆后倾，不摆腿</text>
        </>
      )}
      {(kind === "plancheLean" || kind === "pseudoPlanchePushup") && (
        <>
          <circle cx="78" cy="80" r="12" fill={stroke} />
          <line x1="90" y1="86" x2="158" y2="100" stroke={stroke} strokeWidth="12" strokeLinecap="round" />
          <line x1="104" y1="92" x2="74" y2="136" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="151" y1="100" x2="196" y2="136" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
          <path d="M92 62 L74 136" stroke={support} strokeWidth="4" strokeDasharray="5 5" />
          <text x="72" y="36" fontSize="13" fill={support} fontWeight="700">推地前伸，肘锁定</text>
        </>
      )}
      {kind === "dip" && (
        <>
          <line x1="72" y1="60" x2="72" y2="138" stroke={support} strokeWidth="8" />
          <line x1="188" y1="60" x2="188" y2="138" stroke={support} strokeWidth="8" />
          <circle cx="130" cy="54" r="12" fill={stroke} />
          <line x1="130" y1="68" x2="130" y2="110" stroke={stroke} strokeWidth="10" strokeLinecap="round" />
          <line x1="120" y1="76" x2="74" y2="72" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="140" y1="76" x2="186" y2="72" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="126" y1="110" x2="108" y2="138" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
          <line x1="134" y1="110" x2="152" y2="138" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
          <text x="82" y="32" fontSize="13" fill={support} fontWeight="700">肩稳，底位不过深</text>
        </>
      )}
      {kind === "pikePushup" && (
        <>
          <circle cx="168" cy="72" r="12" fill={stroke} />
          <line x1="162" y1="84" x2="116" y2="62" stroke={stroke} strokeWidth="11" strokeLinecap="round" />
          <line x1="116" y1="62" x2="76" y2="136" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="116" y1="62" x2="144" y2="136" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
          <line x1="170" y1="84" x2="198" y2="132" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <text x="58" y="32" fontSize="13" fill={support} fontWeight="700">头落三角点，肘向后</text>
        </>
      )}
      {kind === "lsit" && (
        <>
          <line x1="72" y1="82" x2="72" y2="138" stroke={support} strokeWidth="8" />
          <line x1="118" y1="82" x2="118" y2="138" stroke={support} strokeWidth="8" />
          <circle cx="96" cy="52" r="12" fill={stroke} />
          <line x1="96" y1="66" x2="96" y2="104" stroke={stroke} strokeWidth="10" strokeLinecap="round" />
          <line x1="86" y1="78" x2="72" y2="88" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="106" y1="78" x2="118" y2="88" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="96" y1="104" x2="170" y2="104" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="98" y1="113" x2="172" y2="113" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <text x="78" y="28" fontSize="13" fill={support} fontWeight="700">肩压稳，主动压缩</text>
        </>
      )}
      {kind === "facePull" && (
        <>
          <rect x="208" y="38" width="8" height="82" fill={support} />
          <circle cx="95" cy="48" r="12" fill={stroke} />
          <line x1="95" y1="62" x2="98" y2="124" stroke={stroke} strokeWidth="9" strokeLinecap="round" />
          <line x1="100" y1="76" x2="154" y2="62" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          <line x1="154" y1="62" x2="212" y2="76" stroke={support} strokeWidth="4" />
          <text x="70" y="148" fontSize="13" fill={support} fontWeight="700">拉向脸，肩不耸</text>
        </>
      )}
      {kind === "wallHandstand" && (
        <>
          <rect x="196" y="18" width="8" height="120" fill={support} />
          <circle cx="160" cy="112" r="12" fill={stroke} />
          <line x1="160" y1="100" x2="160" y2="52" stroke={stroke} strokeWidth="10" strokeLinecap="round" />
          <line x1="150" y1="96" x2="128" y2="136" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="170" y1="96" x2="192" y2="136" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="156" y1="52" x2="148" y2="20" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="164" y1="52" x2="198" y2="20" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <text x="44" y="32" fontSize="13" fill={support} fontWeight="700">臀肋收紧，耳夹臂</text>
        </>
      )}
      {kind === "wallWalk" && (
        <>
          <rect x="204" y="24" width="8" height="112" fill={support} />
          <circle cx="150" cy="102" r="12" fill={stroke} />
          <line x1="148" y1="90" x2="172" y2="58" stroke={stroke} strokeWidth="10" strokeLinecap="round" />
          <line x1="162" y1="70" x2="204" y2="62" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="172" y1="58" x2="196" y2="32" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="143" y1="98" x2="112" y2="136" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="156" y1="98" x2="184" y2="136" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <text x="50" y="34" fontSize="13" fill={support} fontWeight="700">小步上墙，线条优先</text>
        </>
      )}
      {kind === "hollowArch" && (
        <>
          <path d="M56 96 Q130 58 204 96" fill="none" stroke={accent} strokeWidth="9" strokeLinecap="round" />
          <circle cx="68" cy="92" r="11" fill={stroke} />
          <path d="M56 122 Q130 138 204 122" fill="none" stroke={support} strokeWidth="9" strokeLinecap="round" />
          <circle cx="68" cy="124" r="11" fill={stroke} />
          <text x="70" y="36" fontSize="13" fill={support} fontWeight="700">空心 / 反弓，躯干张力</text>
        </>
      )}
      {kind === "muscleUpTransition" && (
        <>
          <line x1="54" y1="42" x2="206" y2="42" stroke={support} strokeWidth="9" strokeLinecap="round" />
          <circle cx="116" cy="76" r="12" fill={stroke} />
          <line x1="116" y1="90" x2="136" y2="112" stroke={stroke} strokeWidth="10" strokeLinecap="round" />
          <line x1="106" y1="66" x2="86" y2="44" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          <line x1="126" y1="66" x2="150" y2="44" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          <path d="M100 112 Q142 82 170 52" fill="none" stroke={accent} strokeWidth="4" strokeDasharray="5 5" />
          <text x="70" y="148" fontSize="13" fill={support} fontWeight="700">高拉后快速转杠</text>
        </>
      )}
      {kind === "lowerBody" && (
        <>
          <circle cx="96" cy="42" r="12" fill={stroke} />
          <line x1="96" y1="56" x2="100" y2="96" stroke={stroke} strokeWidth="10" strokeLinecap="round" />
          <line x1="98" y1="96" x2="70" y2="136" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="102" y1="96" x2="144" y2="124" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <rect x="150" y="100" width="34" height="12" rx="4" fill={support} />
          <path d="M174 58 L132 126" stroke={support} strokeWidth="5" strokeLinecap="round" />
          <text x="60" y="150" fontSize="13" fill={support} fontWeight="700">分腿蹲 + 髋铰链</text>
        </>
      )}
      {kind === "dipSupport" && (
        <>
          <line x1="78" y1="54" x2="78" y2="138" stroke={support} strokeWidth="8" />
          <line x1="182" y1="54" x2="182" y2="138" stroke={support} strokeWidth="8" />
          <circle cx="130" cy="42" r="12" fill={stroke} />
          <line x1="130" y1="56" x2="130" y2="108" stroke={stroke} strokeWidth="10" strokeLinecap="round" />
          <line x1="120" y1="66" x2="78" y2="72" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="140" y1="66" x2="182" y2="72" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="126" y1="108" x2="110" y2="138" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
          <line x1="134" y1="108" x2="150" y2="138" stroke={stroke} strokeWidth="8" strokeLinecap="round" />
        </>
      )}
      {kind === "sideBridge" && (
        <>
          <circle cx="82" cy="94" r="11" fill={stroke} />
          <line x1="94" y1="98" x2="178" y2="110" stroke={stroke} strokeWidth="11" strokeLinecap="round" />
          <line x1="116" y1="102" x2="96" y2="136" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="166" y1="110" x2="204" y2="136" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <line x1="116" y1="88" x2="116" y2="46" stroke={support} strokeWidth="7" strokeLinecap="round" />
          <text x="70" y="34" fontSize="13" fill={support} fontWeight="700">髋不塌，身体一条线</text>
        </>
      )}
      {(kind === "warmup" || kind === "wristWarmup" || kind === "overheadWarmup") && (
        <>
          <circle cx="80" cy="54" r="12" fill={stroke} />
          <line x1="80" y1="68" x2="82" y2="118" stroke={stroke} strokeWidth="10" strokeLinecap="round" />
          <path d="M62 72 Q80 42 102 72" fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          <path d="M116 92 Q144 76 172 92" fill="none" stroke={support} strokeWidth="6" strokeLinecap="round" />
          <circle cx="188" cy="92" r="12" fill="none" stroke={accent} strokeWidth="5" />
          <text x="56" y="148" fontSize="13" fill={support} fontWeight="700">肩、腕、胸椎先上线</text>
        </>
      )}
    </svg>
  );
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
  const rehabToday = rehabWeeklySchedule[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const rehabFocus = rehabFocusForWeek(rehabWeek);
  const rehabFocusExercises = rehabFocus
    .map((name) => rehabExercises.find((exercise) => exercise.name === name))
    .filter((exercise): exercise is RehabExercise => Boolean(exercise));
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
                  <label key={`${selectedSession.day}-${item.name}`} className={`${styles.strengthExerciseCard} ${completed[key] ? styles.doneItem : ""}`}>
                    <input type="checkbox" checked={Boolean(completed[key])} onChange={() => toggleDone(item.name)} />
                    {item.demo?.startsWith("band") ||
                    item.demo === "row" ||
                    item.demo === "pushUpPlus" ||
                    item.demo === "wallSlide" ? (
                      <RehabIllustration kind={item.demo} />
                    ) : (
                      <StrengthIllustration kind={item.demo} />
                    )}
                    <span>
                      <strong>{item.name}</strong>
                      <em>{item.dose}</em>
                      <small>{item.cue}</small>
                      {item.mistake && <small className={styles.mistakeText}>常见错误：{item.mistake}</small>}
                      {item.sourceHref && (
                        <a href={item.sourceHref} target="_blank" rel="noreferrer">
                          打开示范来源
                        </a>
                      )}
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
            <p className={styles.eyebrow}>今天怎么做</p>
            <h2>{rehabToday.day}：{rehabToday.type}</h2>
            <p className={styles.lead}>{rehabToday.detail}</p>
            <div className={styles.rehabActionList}>
              <strong>第 {rehabWeek} 周完整课动作</strong>
              {rehabFocusExercises.map((exercise) => (
                <article className={styles.rehabTodayCard} key={exercise.name}>
                  <RehabIllustration kind={exercise.demo} />
                  <div>
                    <strong>{exercise.name}</strong>
                    <span>{exercise.dose}</span>
                    <p>{exercise.cue}</p>
                    <small>常见错误：{exercise.mistake}</small>
                    <a href={exercise.sourceHref} target="_blank" rel="noreferrer">
                      {exercise.sourceLabel}
                    </a>
                  </div>
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
            <p className={styles.eyebrow}>每周安排</p>
            <h2>按周历执行，不靠临场发挥。</h2>
            <div className={styles.rehabCalendar}>
              {rehabWeeklySchedule.map((day) => (
                <article key={day.day}>
                  <strong>{day.day}</strong>
                  <span>{day.type}</span>
                  <p>{day.detail}</p>
                </article>
              ))}
            </div>
          </div>

          <div className={styles.panelWide}>
            <p className={styles.eyebrow}>动作处方库</p>
            <h2>每个恢复动作的周次、组数和执行要点。</h2>
            <div className={styles.rehabExerciseGrid}>
              {rehabExercises.map((exercise) => (
                <article key={exercise.name}>
                  <RehabIllustration kind={exercise.demo} />
                  <strong>{exercise.name}</strong>
                  <span>{exercise.weeks} 周 · {exercise.dose}</span>
                  <p>{exercise.cue}</p>
                  <small>常见错误：{exercise.mistake}</small>
                  <a href={exercise.sourceHref} target="_blank" rel="noreferrer">
                    {exercise.sourceLabel}
                  </a>
                </article>
              ))}
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
