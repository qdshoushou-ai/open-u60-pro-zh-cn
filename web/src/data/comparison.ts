export interface ComparisonRow {
  label: string;
  agent: string;
  official: string;
  agentGood: boolean;
}

export const comparisonData: ComparisonRow[] = [
  {
    label: "进程数",
    agent: "1",
    official: "44",
    agentGood: true,
  },
  {
    label: "内存（RSS）",
    agent: "~0.8 MB",
    official: "225 MB",
    agentGood: true,
  },
  {
    label: "二进制体积",
    agent: "~2.3 MB",
    official: "合计 ~50+ MB",
    agentGood: true,
  },
  {
    label: "线程数",
    agent: "~10",
    official: "~130+",
    agentGood: true,
  },
  {
    label: "遥测",
    agent: "无",
    official: "会向 iot.zte.com.cn 回传数据",
    agentGood: true,
  },
  {
    label: "App",
    agent: "开源 iOS/Android",
    official: "闭源，仅提供中文版",
    agentGood: true,
  },
];
