// ============================================================
// Agent Team Java - Type Definitions
// ============================================================

/** Agent domain categories from Manager's team role catalog */
export type AgentDomain =
  | "direction-coordination"   // 方向与协调
  | "experience-architecture"  // 体验与架构
  | "delivery-engineering"     // 交付工程
  | "quality-gates"            // 质量门禁
  | "delivery-operations";     // 交付、运维与知识

export const DOMAIN_LABELS: Record<AgentDomain, string> = {
  "direction-coordination": "方向与协调",
  "experience-architecture": "体验与架构",
  "delivery-engineering": "交付工程",
  "quality-gates": "质量门禁",
  "delivery-operations": "交付、运维与知识",
};

/** Parsed metadata from an AGENT.md file */
export interface AgentInfo {
  /** Directory name, e.g. "backend-developer" */
  name: string;
  /** Display name, e.g. "Backend Developer" */
  displayName: string;
  /** 角色定位 */
  role: string;
  /** 核心职责 (bullet list) */
  responsibilities: string[];
  /** 能力边界 (markdown text) */
  boundaries: string;
  /** 技术栈与能力范围 */
  techStack: string;
  /** 输入 */
  inputs: string;
  /** 输出 */
  outputs: string;
  /** 工作规范 */
  workStandards: string;
  /** 协作方式 */
  collaboration: string;
  /** 质量门禁 */
  qualityGates: string;
  /** 禁止事项 */
  prohibitedActions: string;
  /** 完整原始内容 (用于注入 system prompt) */
  rawContent: string;
  /** 领域分类 */
  domain: AgentDomain;
  /** 用户自定义别名 */
  aliases: string[];
}

/** Team operation mode */
export type TeamMode = "manager" | "single-agent" | "multi-agent";

/** Phase status */
export type PhaseStatusCode = "pending" | "active" | "completed" | "blocked";

/** A single gate condition within a phase */
export interface GateCondition {
  description: string;
  passed: boolean;
  evidence?: string;
}

/** Status of one phase */
export interface PhaseStatus {
  phase: number;
  name: string;
  status: PhaseStatusCode;
  gates: GateCondition[];
}

/** Agent work status in the current project */
export interface AgentWorkStatus {
  agentName: string;
  status: "idle" | "working" | "blocked" | "done";
  currentTask?: string;
  lastOutput?: string;
}

/** A delivery plan created by Manager */
export interface Plan {
  id: string;
  request: string;
  phases: PlanPhase[];
  status: "draft" | "approved" | "rejected" | "executing" | "completed";
  createdAt: number;
}

/** One phase within a plan */
export interface PlanPhase {
  phase: number;
  agents: string[];
  deliverables: string[];
  completed: boolean;
}

/** Session-persistent team state */
export interface TeamState {
  mode: TeamMode;
  activeAgent: string | null;
  /** Agents being coordinated in multi-agent mode */
  multiAgentTask: MultiAgentTask | null;
  currentPhase: number;
  phaseStatuses: PhaseStatus[];
  agentStatuses: Record<string, AgentWorkStatus>;
  currentPlan: Plan | null;
  /** When true, /call or /task will auto-return to previous mode after agent settles */
  pendingReturn: boolean;
  previousMode?: TeamMode;
  previousAgent?: string | null;
  aliases: Record<string, string>;
}

/** Phase definition (static, from Manager AGENT.md) */
export interface PhaseDefinition {
  number: number;
  name: string;
  agents: string[];
  deliverables: string[];
  gates: string[];
}

/** A multi-agent coordination task — user explicitly picks which agents to involve */
export interface MultiAgentTask {
  /** The user's original request */
  request: string;
  /** Agent names involved */
  agents: string[];
  /** Status of the multi-agent coordination */
  status: "active" | "completed";
  /** When the task was created */
  createdAt: number;
}

/** Agent scheduling rule from Manager's AGENT.md */
export type TaskCategory =
  | "small-code-change"
  | "api-change"
  | "database-change"
  | "security"
  | "performance"
  | "deployment"
  | "ux"
  | "major-architecture";

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  "small-code-change": "小型代码修改",
  "api-change": "涉及接口契约",
  "database-change": "涉及数据库",
  security: "涉及权限、安全、敏感数据",
  performance: "涉及性能、批处理、大流量",
  deployment: "涉及部署、配置、发布",
  ux: "涉及用户体验",
  "major-architecture": "涉及重大架构变化",
};
