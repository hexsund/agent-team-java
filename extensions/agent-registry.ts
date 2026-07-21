// ============================================================
// Agent Team Java - Agent Registry
// Discover and parse AGENT.md files from agents/ directory
//
// Agents directory is resolved relative to this module file,
// so it works regardless of install method:
//   npm install, git install, or local path.
// ============================================================

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentInfo, AgentDomain, TaskCategory } from "./types";

/**
 * Resolve the agents/ directory relative to this module file.
 * extensions/agent-registry.ts → ../ → package root → agents/
 */
function resolveDefaultAgentsDir(): string {
  const modulePath = fileURLToPath(import.meta.url);
  const moduleDir = dirname(modulePath);          // extensions/
  const packageRoot = resolve(moduleDir, "..");    // package root
  return resolve(packageRoot, "agents");
}

/** Default agents directory (computed once at module load) */
export const DEFAULT_AGENTS_DIR = resolveDefaultAgentsDir();

/**
 * Domain classification per Manager's team role catalog.
 * Maps directory name → domain.
 */
const DOMAIN_MAP: Record<string, AgentDomain> = {
  // Direction & Coordination
  "business-analyst": "direction-coordination",
  "product-manager": "direction-coordination",
  "project-manager": "direction-coordination",
  // Experience & Architecture
  "ux-designer": "experience-architecture",
  "solution-architect": "experience-architecture",
  "technical-architect": "experience-architecture",
  "backend-architect": "experience-architecture",
  "frontend-architect": "experience-architecture",
  "data-architect": "experience-architecture",
  "security-architect": "experience-architecture",
  // Delivery Engineering
  "backend-developer": "delivery-engineering",
  "frontend-developer": "delivery-engineering",
  "database-engineer": "delivery-engineering",
  "integration-engineer": "delivery-engineering",
  "api-governance-engineer": "delivery-engineering",
  "configuration-manager": "delivery-engineering",
  // Quality Gates
  "qa-engineer": "quality-gates",
  "test-automation-engineer": "quality-gates",
  "performance-engineer": "quality-gates",
  "security-engineer": "quality-gates",
  "code-reviewer": "quality-gates",
  // Delivery, Operations & Knowledge
  "devops-engineer": "delivery-operations",
  "sre-engineer": "delivery-operations",
  "operations-engineer": "delivery-operations",
  "observability-engineer": "delivery-operations",
  "release-engineer": "delivery-operations",
  "technical-writer": "delivery-operations",
};

/**
 * Task category → agents to involve (from Manager's scheduling rules).
 */
export const SCHEDULING_RULES: Record<TaskCategory, string[]> = {
  "small-code-change": [
    "manager",
    "backend-developer",
    "frontend-developer",
    "code-reviewer",
    "qa-engineer",
  ],
  "api-change": [
    "manager",
    "backend-developer",
    "frontend-developer",
    "api-governance-engineer",
    "integration-engineer",
    "code-reviewer",
    "qa-engineer",
  ],
  "database-change": [
    "manager",
    "data-architect",
    "database-engineer",
    "backend-developer",
    "code-reviewer",
  ],
  security: [
    "manager",
    "security-architect",
    "security-engineer",
    "backend-developer",
    "code-reviewer",
  ],
  performance: [
    "manager",
    "performance-engineer",
    "sre-engineer",
    "observability-engineer",
    "backend-developer",
  ],
  deployment: [
    "manager",
    "devops-engineer",
    "configuration-manager",
    "release-engineer",
    "operations-engineer",
  ],
  ux: ["manager", "ux-designer", "product-manager", "frontend-developer"],
  "major-architecture": [
    "manager",
    "solution-architect",
    "technical-architect",
    "backend-architect",
    "frontend-architect",
    "data-architect",
    "security-architect",
  ],
};

/** Convert directory name to display name */
function dirToDisplayName(dir: string): string {
  return dir
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Extract a section from markdown by ## header name */
function extractSection(content: string, header: string): string {
  const regex = new RegExp(
    `## ${header}\\s*\\n([\\s\\S]*?)(?=\\n## |\\n# |$)`,
    "i"
  );
  const match = content.match(regex);
  return match ? match[1].trim() : "";
}

/** Extract bullet list items from a section */
function extractBullets(text: string): string[] {
  const items: string[] = [];
  const regex = /^[-*]\s+(.+)$/gm;
  let m;
  while ((m = regex.exec(text)) !== null) {
    items.push(m[1].trim());
  }
  return items;
}

/** Parse an AGENT.md file into AgentInfo */
function parseAgentFile(
  dirName: string,
  filePath: string,
  domain: AgentDomain
): AgentInfo {
  const rawContent = readFileSync(filePath, "utf-8");

  const role = extractSection(rawContent, "角色定位");
  const responsibilities = extractBullets(
    extractSection(rawContent, "核心职责")
  );
  const boundaries = extractSection(rawContent, "能力边界");
  const techStack = extractSection(rawContent, "技术栈与能力范围") || extractSection(rawContent, "技术栈范围");
  const inputs = extractSection(rawContent, "输入");
  const outputs = extractSection(rawContent, "输出");
  const workStandards = extractSection(rawContent, "工作规范");
  const collaboration = extractSection(rawContent, "协作方式");
  const qualityGates = extractSection(rawContent, "质量门禁");
  const prohibitedActions = extractSection(rawContent, "禁止事项");

  return {
    name: dirName,
    displayName: dirToDisplayName(dirName),
    role,
    responsibilities,
    boundaries,
    techStack,
    inputs,
    outputs,
    workStandards,
    collaboration,
    qualityGates,
    prohibitedActions,
    rawContent,
    domain,
    aliases: [],
  };
}

/** Agent registry - singleton holding all agent info */
export class AgentRegistry {
  private agents = new Map<string, AgentInfo>();
  private aliasMap = new Map<string, string>(); // alias → agentName

  constructor() {}

  /** Discover agents from the agents/ directory */
  discover(agentsDir: string): void {
    let entries: string[];
    try {
      entries = readdirSync(agentsDir);
    } catch {
      console.warn(
        `[agent-team-java] agents/ directory not found at: ${agentsDir}`
      );
      return;
    }

    for (const entry of entries) {
      const fullPath = join(agentsDir, entry);
      const agentFilePath = join(fullPath, "AGENT.md");

      try {
        const stat = statSync(fullPath);
        if (!stat.isDirectory()) continue;
        // Verify AGENT.md exists
        statSync(agentFilePath);
      } catch {
        continue; // skip entries without AGENT.md
      }

      const domain =
        DOMAIN_MAP[entry] ?? ("delivery-engineering" as AgentDomain);
      const agent = parseAgentFile(entry, agentFilePath, domain);
      this.agents.set(entry, agent);
    }

    // Also check if there's a manager agent in the list
    if (!this.agents.has("manager")) {
      const managerPath = join(agentsDir, "manager", "AGENT.md");
      try {
        statSync(managerPath);
        const agent = parseAgentFile(
          "manager",
          managerPath,
          "direction-coordination"
        );
        this.agents.set("manager", agent);
      } catch {
        console.warn(
          "[agent-team-java] manager/AGENT.md not found, Manager agent unavailable"
        );
      }
    }
  }

  /** Get agent by name */
  get(name: string): AgentInfo | undefined {
    return this.agents.get(name);
  }

  /** Resolve name (check alias first, then exact match) */
  resolve(name: string): AgentInfo | undefined {
    const alias = this.aliasMap.get(name);
    if (alias) return this.agents.get(alias);
    return this.agents.get(name);
  }

  /** Get all agents */
  getAll(): AgentInfo[] {
    return Array.from(this.agents.values());
  }

  /** Get agents by domain */
  getByDomain(domain: AgentDomain): AgentInfo[] {
    return this.getAll().filter((a) => a.domain === domain);
  }

  /** Get agent names by domain */
  getNamesByDomain(domain: AgentDomain): string[] {
    return this.getByDomain(domain).map((a) => a.name);
  }

  /** Check if agent exists */
  has(name: string): boolean {
    return this.agents.has(name);
  }

  /** Add an alias */
  addAlias(alias: string, agentName: string): boolean {
    if (!this.agents.has(agentName)) return false;
    this.aliasMap.set(alias, agentName);
    const agent = this.agents.get(agentName)!;
    if (!agent.aliases.includes(alias)) {
      agent.aliases.push(alias);
    }
    return true;
  }

  /** Remove an alias */
  removeAlias(alias: string): boolean {
    const agentName = this.aliasMap.get(alias);
    if (!agentName) return false;
    this.aliasMap.delete(alias);
    const agent = this.agents.get(agentName);
    if (agent) {
      agent.aliases = agent.aliases.filter((a) => a !== alias);
    }
    return true;
  }

  /** Get all aliases */
  getAllAliases(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [alias, name] of this.aliasMap) {
      result[alias] = name;
    }
    return result;
  }

  /** Build a compact summary of an agent for display */
  getSummary(name: string): string {
    const agent = this.agents.get(name);
    if (!agent) return `Unknown agent: ${name}`;
    return `${agent.displayName} (${agent.domain})\n  Role: ${agent.role.slice(0, 120)}...`;
  }

  /** List all agents grouped by domain */
  getGroupedByDomain(): Record<AgentDomain, AgentInfo[]> {
    const groups: Record<string, AgentInfo[]> = {};
    for (const agent of this.agents.values()) {
      if (agent.name === "manager") continue; // Manager is special
      const domain = agent.domain;
      if (!groups[domain]) groups[domain] = [];
      groups[domain].push(agent);
    }
    return groups as Record<AgentDomain, AgentInfo[]>;
  }

  /** Get agent names for a task category */
  static getAgentsForTask(category: TaskCategory): string[] {
    return SCHEDULING_RULES[category] ?? [];
  }
}

/** Singleton instance */
let _instance: AgentRegistry | null = null;

export function getAgentRegistry(): AgentRegistry {
  if (!_instance) {
    _instance = new AgentRegistry();
  }
  return _instance;
}

export function initAgentRegistry(agentsDir?: string): AgentRegistry {
  const registry = getAgentRegistry();
  registry.discover(agentsDir ?? DEFAULT_AGENTS_DIR);
  return registry;
}
