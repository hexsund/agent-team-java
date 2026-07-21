// ============================================================
// Agent Team Java - Session State Management
// ============================================================

import type {
  TeamState,
  TeamMode,
  PhaseStatus,
  AgentWorkStatus,
  Plan,
  PhaseDefinition,
} from "./types";

const STATE_ENTRY_TYPE = "agent-team-state";

/** Default phase definitions (from Manager's 10-phase workflow) */
export const PHASE_DEFINITIONS: PhaseDefinition[] = [
  {
    number: 1,
    name: "需求进入",
    agents: ["manager", "product-manager", "business-analyst", "ux-designer", "project-manager"],
    deliverables: ["需求说明/用户故事/用例清单", "业务流程和异常流程", "验收标准", "范围边界和非目标清单", "初步风险清单"],
    gates: ["需求目标清晰", "业务规则可验证", "验收标准可测试", "范围边界明确"],
  },
  {
    number: 2,
    name: "可行性与方案",
    agents: ["manager", "solution-architect", "technical-architect", "security-architect", "data-architect", "devops-engineer", "performance-engineer"],
    deliverables: ["解决方案草案", "关键技术决策", "风险矩阵", "非功能需求清单", "外部依赖清单"],
    gates: ["至少有一个可执行方案", "高风险项有缓解措施", "核心依赖和约束已记录"],
  },
  {
    number: 3,
    name: "架构与设计",
    agents: ["solution-architect", "technical-architect", "backend-architect", "frontend-architect", "data-architect", "api-governance-engineer", "security-architect", "observability-engineer"],
    deliverables: ["架构说明或 ADR", "C4 上下文图/容器图/组件图", "API 契约", "数据模型和迁移计划", "权限模型", "可观测性设计"],
    gates: ["核心接口、数据和权限已定义", "设计能支撑验收标准和非功能需求", "主要架构决策有理由和取舍说明"],
  },
  {
    number: 4,
    name: "计划与任务拆解",
    agents: ["manager", "project-manager", "product-manager", "qa-engineer", "release-engineer", "technical-writer"],
    deliverables: ["任务清单", "里程碑计划", "测试策略", "发布策略", "文档计划"],
    gates: ["每个任务有明确 owner、输入、输出、验收标准", "高风险任务有验证策略", "发布和回滚不依赖临时口头约定"],
  },
  {
    number: 5,
    name: "开发实现",
    agents: ["backend-developer", "frontend-developer", "database-engineer", "integration-engineer", "configuration-manager"],
    deliverables: ["可运行代码", "单元测试和必要的集成测试", "数据库迁移脚本", "配置变更说明", "本地验证记录"],
    gates: ["代码能构建", "基础测试通过", "关键路径有测试或明确验证记录", "不引入未记录配置和数据库变更"],
  },
  {
    number: 6,
    name: "代码评审与工程质量",
    agents: ["code-reviewer", "security-engineer", "performance-engineer", "test-automation-engineer"],
    deliverables: ["Review findings", "修复建议", "测试覆盖报告", "安全和性能风险记录"],
    gates: ["高优先级 review 问题关闭或有明确豁免", "关键测试可重复执行", "安全高危问题不得遗留到发布阶段"],
  },
  {
    number: 7,
    name: "QA 与验收",
    agents: ["qa-engineer", "test-automation-engineer", "product-manager", "business-analyst", "ux-designer"],
    deliverables: ["测试报告", "缺陷列表", "验收结论", "回归范围记录"],
    gates: ["阻塞级和严重缺陷关闭", "验收标准逐条验证", "遗留问题有 owner、影响说明和处理计划"],
  },
  {
    number: 8,
    name: "发布准备",
    agents: ["release-engineer", "devops-engineer", "configuration-manager", "database-engineer", "sre-engineer", "operations-engineer", "technical-writer"],
    deliverables: ["发布清单", "部署包或镜像版本", "数据库迁移和回滚方案", "配置清单", "运行手册", "发布说明"],
    gates: ["发布、验证、回滚步骤可执行", "监控和告警准备完成", "关键人员和责任明确"],
  },
  {
    number: 9,
    name: "上线与生产验证",
    agents: ["release-engineer", "devops-engineer", "operations-engineer", "sre-engineer", "observability-engineer", "product-manager", "business-analyst"],
    deliverables: ["上线记录", "生产验证结果", "监控快照", "异常和处置记录"],
    gates: ["核心路径可用", "错误率、延迟、资源使用在可接受范围内", "没有未处理的高风险告警"],
  },
  {
    number: 10,
    name: "运维、复盘与知识沉淀",
    agents: ["sre-engineer", "operations-engineer", "observability-engineer", "security-engineer", "technical-writer", "project-manager", "manager"],
    deliverables: ["复盘报告", "改进任务", "更新后的文档", "运行指标基线", "经验教训记录"],
    gates: ["复盘完成", "改进项已记录并有 owner", "文档已更新"],
  },
];

/** Create default initial state */
export function createDefaultState(): TeamState {
  const phaseStatuses: PhaseStatus[] = PHASE_DEFINITIONS.map((pd) => ({
    phase: pd.number,
    name: pd.name,
    status: pd.number === 1 ? "active" : "pending",
    gates: pd.gates.map((g) => ({ description: g, passed: false })),
  }));

  return {
    mode: "manager",
    activeAgent: null,
    multiAgentTask: null,
    currentPhase: 1,
    phaseStatuses,
    agentStatuses: {},
    currentPlan: null,
    pendingReturn: false,
    aliases: {},
  };
}

// ============================================================
// Helper for session persistence
// ============================================================

export function getState(ctx: { sessionManager: { getEntries: () => Array<{ type: string; customType?: string; data?: unknown }> } }): TeamState {
  // Try to reconstruct from session entries
  for (const entry of ctx.sessionManager.getEntries()) {
    if (entry.type === "custom" && entry.customType === STATE_ENTRY_TYPE && entry.data) {
      return entry.data as TeamState;
    }
  }
  return createDefaultState();
}

// We store the state reference so we can mutate it and persist
let _currentState: TeamState | null = null;

export function getMutableState(): TeamState {
  if (!_currentState) {
    _currentState = createDefaultState();
  }
  return _currentState;
}

export function setMutableState(state: TeamState): void {
  _currentState = state;
}

export function resetMutableState(): void {
  _currentState = createDefaultState();
}

/**
 * Persist state via pi.appendEntry.
 * Call this after every state mutation.
 */
export function persistState(pi: { appendEntry: (type: string, data: unknown) => void }, state: TeamState): void {
  pi.appendEntry(STATE_ENTRY_TYPE, state);
}
