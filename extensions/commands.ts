// ============================================================
// Agent Team Java - Slash Commands
// ============================================================

import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { getAgentRegistry } from "./agent-registry";
import {
  getMutableState,
  setMutableState,
  resetMutableState,
  persistState,
  PHASE_DEFINITIONS,
} from "./state";
import { DOMAIN_LABELS, type AgentDomain, type Plan } from "./types";

/** Generate a simple unique id */
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Parse command args into positional parts and flags */
function parseArgs(input: string): { positional: string[]; flags: Record<string, string> } {
  const parts = input.trim().split(/\s+/);
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith("--")) {
      const eqIdx = parts[i].indexOf("=");
      if (eqIdx !== -1) {
        flags[parts[i].slice(2, eqIdx)] = parts[i].slice(eqIdx + 1);
      } else {
        flags[parts[i].slice(2)] = parts[++i] ?? "true";
      }
    } else {
      positional.push(parts[i]);
    }
  }
  return { positional, flags };
}

/** Format a plan for display */
function formatPlan(plan: Plan): string {
  let s = `📋 Plan: ${plan.request.slice(0, 60)}...\n`;
  s += `Status: ${plan.status}\n`;
  for (const pp of plan.phases) {
    const mark = pp.completed ? "✅" : "⬜";
    const phaseDef = PHASE_DEFINITIONS[pp.phase - 1];
    s += `\n${mark} Phase ${pp.phase}: ${phaseDef?.name ?? "?"}\n`;
    s += `   Agents: ${pp.agents.join(", ")}\n`;
    s += `   Deliverables: ${pp.deliverables.join(", ")}\n`;
  }
  return s;
}

/** Format phase status */
function formatPhaseStatus(state: ReturnType<typeof getMutableState>): string {
  const phase = PHASE_DEFINITIONS[state.currentPhase - 1];
  if (!phase) return "Unknown phase.";

  const ps = state.phaseStatuses.find((p) => p.phase === state.currentPhase);
  let s = `📌 Phase ${phase.number}: ${phase.name}\n`;
  s += `Status: ${ps?.status ?? "active"}\n\n`;
  s += `Gates:\n`;
  for (const gate of ps?.gates ?? []) {
    const mark = gate.passed ? "✅" : "❌";
    s += `  ${mark} ${gate.description}\n`;
  }
  s += `\nDeliverables:\n`;
  for (const d of phase.deliverables) {
    s += `  📄 ${d}\n`;
  }
  s += `\nInvolved Agents:\n`;
  for (const a of phase.agents) {
    const st = state.agentStatuses[a];
    const statusIcon = st?.status === "done" ? "✅" : st?.status === "working" ? "🔄" : st?.status === "blocked" ? "🚫" : "⏸️";
    s += `  ${statusIcon} ${a}\n`;
  }
  return s;
}

/** Format overall status */
function formatFullStatus(state: ReturnType<typeof getMutableState>): string {
  let s = `🏢 Agent Team Status\n`;
  s += `Mode: ${state.mode === "manager" ? "Manager 编排" : state.mode === "multi-agent" ? `多 Agent 协作 (${state.multiAgentTask?.agents.length ?? 0} agents)` : `单 Agent (${state.activeAgent})`}\n`;
  s += `Current Phase: ${state.currentPhase}/10 - ${PHASE_DEFINITIONS[state.currentPhase - 1]?.name ?? "?"}\n\n`;

  s += `--- Phase Progress ---\n`;
  for (const ps of state.phaseStatuses) {
    const icon =
      ps.status === "completed" ? "✅" :
      ps.status === "active" ? "🔄" :
      ps.status === "blocked" ? "🚫" : "⏳";
    const passed = ps.gates.filter((g) => g.passed).length;
    const total = ps.gates.length;
    s += `  ${icon} Phase ${ps.phase}: ${ps.name} (${passed}/${total} gates)\n`;
  }

  const busyCount = Object.values(state.agentStatuses).filter((a) => a.status === "working").length;
  s += `\n--- Agent Status ---\n`;
  s += `  Active agents: ${busyCount}\n`;
  for (const [name, st] of Object.entries(state.agentStatuses)) {
    const icon =
      st.status === "done" ? "✅" :
      st.status === "working" ? "🔄" :
      st.status === "blocked" ? "🚫" : "⏸️";
    s += `  ${icon} ${name}: ${st.status}${st.currentTask ? ` - ${st.currentTask}` : ""}\n`;
  }

  if (state.currentPlan) {
    s += `\n--- Current Plan ---\n`;
    s += `${state.currentPlan.request.slice(0, 80)}... (${state.currentPlan.status})\n`;
  }

  return s;
}

/** Format agent list grouped by domain */
function formatAgentList(registry: ReturnType<typeof getAgentRegistry>): string {
  const grouped = registry.getGroupedByDomain();
  const domains: AgentDomain[] = [
    "direction-coordination",
    "experience-architecture",
    "delivery-engineering",
    "quality-gates",
    "delivery-operations",
  ];

  let s = `👥 Agent Team (${registry.getAll().length} members)\n\n`;

  // Special: Manager always listed first
  const mgr = registry.get("manager");
  if (mgr) {
    s += `🏆 Manager: ${mgr.displayName}\n`;
    s += `   ${mgr.role.slice(0, 100)}...\n\n`;
  }

  for (const domain of domains) {
    const agents = grouped[domain];
    if (!agents || agents.length === 0) continue;
    s += `📂 ${DOMAIN_LABELS[domain]}\n`;
    for (const agent of agents) {
      const aliases = agent.aliases.length > 0 ? ` (aliases: ${agent.aliases.join(", ")})` : "";
      s += `  • ${agent.name}${aliases}\n`;
    }
    s += "\n";
  }
  return s;
}

/** Format a single agent's detailed info */
function formatAgentDetail(registry: ReturnType<typeof getAgentRegistry>, name: string): string {
  const agent = registry.get(name);
  if (!agent) return `Agent '${name}' not found.`;

  let s = `📋 ${agent.displayName}\n`;
  s += `Domain: ${DOMAIN_LABELS[agent.domain] ?? agent.domain}\n`;
  s += `Aliases: ${agent.aliases.length > 0 ? agent.aliases.join(", ") : "(none)"}\n\n`;

  s += `--- Role ---\n${agent.role.slice(0, 300)}${agent.role.length > 300 ? "..." : ""}\n\n`;

  if (agent.responsibilities.length > 0) {
    s += `--- Core Responsibilities ---\n`;
    for (const r of agent.responsibilities.slice(0, 6)) {
      s += `  • ${r}\n`;
    }
    s += "\n";
  }

  if (agent.techStack) {
    s += `--- Tech Stack ---\n${agent.techStack.slice(0, 300)}${agent.techStack.length > 300 ? "..." : ""}\n\n`;
  }

  if (agent.inputs) {
    s += `--- Inputs ---\n${agent.inputs.slice(0, 200)}${agent.inputs.length > 200 ? "..." : ""}\n\n`;
  }
  if (agent.outputs) {
    s += `--- Outputs ---\n${agent.outputs.slice(0, 200)}${agent.outputs.length > 200 ? "..." : ""}\n\n`;
  }
  if (agent.qualityGates) {
    s += `--- Quality Gates ---\n${agent.qualityGates.slice(0, 200)}${agent.qualityGates.length > 200 ? "..." : ""}\n`;
  }

  return s;
}

// ============================================================
// Register all commands
// ============================================================

export function registerCommands(pi: ExtensionAPI): void {
  // ---------- 1. /plan ----------
  pi.registerCommand("plan", {
    description: "Create, approve, or reject a delivery plan. Usage: /plan <request> | /plan approve | /plan reject <reason>",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const state = getMutableState();

      if (state.mode !== "manager") {
        ctx.ui.notify("Only available in Manager mode. Use /use manager first.", "error");
        return;
      }

      const trimmed = args.trim();
      if (!trimmed) {
        const plan = state.currentPlan;
        if (plan) {
          ctx.ui.notify(formatPlan(plan), "info");
        } else {
          ctx.ui.notify("No plan yet. Use /plan <your request> to create one.", "info");
        }
        return;
      }

      // Subcommands
      if (trimmed === "approve") {
        if (!state.currentPlan || state.currentPlan.status !== "draft") {
          ctx.ui.notify("No draft plan to approve.", "error");
          return;
        }
        state.currentPlan.status = "approved";
        persistState(pi, state);
        ctx.ui.notify("Plan approved! Entering execution phase.", "info");
        return;
      }

      if (trimmed.startsWith("reject")) {
        if (!state.currentPlan || state.currentPlan.status !== "draft") {
          ctx.ui.notify("No draft plan to reject.", "error");
          return;
        }
        state.currentPlan.status = "rejected";
        const reason = trimmed.slice(6).trim() || "No reason given";
        persistState(pi, state);
        ctx.ui.notify(`Plan rejected. Reason: ${reason}`, "warning");
        return;
      }

      // Create a new plan from the request
      const request = trimmed;
      const plan: Plan = {
        id: uid(),
        request,
        phases: PHASE_DEFINITIONS.map((pd) => ({
          phase: pd.number,
          agents: [...pd.agents],
          deliverables: [...pd.deliverables],
          completed: false,
        })),
        status: "draft",
        createdAt: Date.now(),
      };

      state.currentPlan = plan;
      persistState(pi, state);

      ctx.ui.notify(
        `Plan created! Phase 1: ${PHASE_DEFINITIONS[0].name}. Use /plan approve to start or /plan reject <reason> to reject.`,
        "info"
      );
    },
  });

  // ---------- 2. /status ----------
  pi.registerCommand("status", {
    description: "Show overall team and phase status",
    handler: async (_args: string, ctx: ExtensionCommandContext) => {
      const state = getMutableState();
      ctx.ui.notify(formatFullStatus(state), "info");
    },
  });

  // ---------- 3. /phase ----------
  pi.registerCommand("phase", {
    description: "Show current phase details",
    handler: async (_args: string, ctx: ExtensionCommandContext) => {
      const state = getMutableState();
      ctx.ui.notify(formatPhaseStatus(state), "info");
    },
  });

  // ---------- 4. /advance ----------
  pi.registerCommand("advance", {
    description: "Advance to the next phase (with gate check)",
    handler: async (_args: string, ctx: ExtensionCommandContext) => {
      const state = getMutableState();

      if (state.mode !== "manager") {
        ctx.ui.notify("Only available in Manager mode.", "error");
        return;
      }

      const current = state.phaseStatuses.find(
        (p) => p.phase === state.currentPhase
      );
      if (!current) {
        ctx.ui.notify("No active phase.", "error");
        return;
      }

      // Check gates
      const failed = current.gates.filter((g) => !g.passed);
      if (failed.length > 0) {
        ctx.ui.notify(
          `Cannot advance. Gates not met:\n${failed.map((g) => `  ❌ ${g.description}`).join("\n")}`,
          "error"
        );
        return;
      }

      // Mark current as completed
      current.status = "completed";

      // Advance to next
      if (state.currentPhase < 10) {
        state.currentPhase++;
        const next = state.phaseStatuses.find(
          (p) => p.phase === state.currentPhase
        );
        if (next) {
          next.status = "active";
        }
        ctx.ui.notify(
          `✅ Advanced to Phase ${state.currentPhase}: ${PHASE_DEFINITIONS[state.currentPhase - 1]?.name}`,
          "info"
        );
      } else {
        ctx.ui.notify("🎉 All phases completed! Project delivery finished.", "info");
      }

      persistState(pi, state);
    },
  });

  // ---------- 5. /gate ----------
  pi.registerCommand("gate", {
    description: "Show all gates for current phase",
    handler: async (_args: string, ctx: ExtensionCommandContext) => {
      const state = getMutableState();
      const ps = state.phaseStatuses.find((p) => p.phase === state.currentPhase);
      if (!ps) {
        ctx.ui.notify("No active phase.", "error");
        return;
      }
      let s = `🚧 Gates for Phase ${ps.phase}: ${ps.name}\n\n`;
      for (const gate of ps.gates) {
        const mark = gate.passed ? "✅" : "❌";
        s += `${mark} ${gate.description}\n`;
        if (gate.evidence) s += `   Evidence: ${gate.evidence}\n`;
      }
      s += `\nTo pass a gate: use /gate-pass <gate-number> [evidence]`;
      s += `\nTo advance: /advance (all gates must pass first)`;
      ctx.ui.notify(s, "info");
    },
  });

  // ---------- 6. /gate-pass ----------
  pi.registerCommand("gate-pass", {
    description: "Mark a gate as passed. Usage: /gate-pass <gate-number> [evidence]",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const state = getMutableState();
      const ps = state.phaseStatuses.find((p) => p.phase === state.currentPhase);
      if (!ps) {
        ctx.ui.notify("No active phase.", "error");
        return;
      }

      const { positional } = parseArgs(args);
      if (positional.length === 0) {
        ctx.ui.notify("Usage: /gate-pass <gate-number> [evidence]", "error");
        return;
      }

      const gateIdx = parseInt(positional[0], 10) - 1;
      if (isNaN(gateIdx) || gateIdx < 0 || gateIdx >= ps.gates.length) {
        ctx.ui.notify(`Gate number must be 1-${ps.gates.length}.`, "error");
        return;
      }

      ps.gates[gateIdx].passed = true;
      ps.gates[gateIdx].evidence = positional.slice(1).join(" ") || "User confirmed";
      persistState(pi, state);
      ctx.ui.notify(`✅ Gate "${ps.gates[gateIdx].description}" passed.`, "info");
    },
  });

  // ---------- 7. /review ----------
  pi.registerCommand("review", {
    description: "Trigger cross-agent code review",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const state = getMutableState();

      if (state.mode !== "manager") {
        ctx.ui.notify("Only available in Manager mode.", "error");
        return;
      }

      const registry = getAgentRegistry();
      const reviewAgents = registry.getByDomain("quality-gates");
      let s = "🔍 Cross-Agent Review\n\n";
      s += `Phase ${state.currentPhase}: ${PHASE_DEFINITIONS[state.currentPhase - 1]?.name}\n\n`;

      if (args.trim()) {
        s += `Review Target: ${args.trim()}\n\n`;
      }

      s += "Quality Gate Agents:\n";
      for (const agent of reviewAgents) {
        s += `  • ${agent.displayName}: ${agent.role.slice(0, 80)}...\n`;
      }

      s += "\nUse /call <agent> <task> to engage a specific reviewer.";

      ctx.ui.notify(s, "info");
    },
  });

  // ---------- 8. /resolve ----------
  pi.registerCommand("resolve", {
    description: "Resolve conflict between two agents. Usage: /resolve <agent1> <agent2>",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const state = getMutableState();
      const { positional } = parseArgs(args);

      if (positional.length < 2) {
        ctx.ui.notify("Usage: /resolve <agent1> <agent2>", "error");
        return;
      }

      const registry = getAgentRegistry();
      const agent1 = registry.resolve(positional[0]);
      const agent2 = registry.resolve(positional[1]);

      if (!agent1) {
        ctx.ui.notify(`Agent '${positional[0]}' not found.`, "error");
        return;
      }
      if (!agent2) {
        ctx.ui.notify(`Agent '${positional[1]}' not found.`, "error");
        return;
      }

      let s = `⚖️ Conflict Resolution\n\n`;
      s += `Between: ${agent1.displayName} vs ${agent2.displayName}\n\n`;
      s += `Resolution Rules (from Manager):\n`;
      s += `- Technical conflicts: Solution/Technical Architect chairs with evidence\n`;
      s += `- Security conflicts: Security Architect has veto on architecture\n`;
      s += `- Data conflicts: Data Architect has lead on data model\n`;
      s += `- Quality conflicts: QA Engineer owns acceptance conclusions\n`;
      s += `- Release conflicts: Release Engineer owns release admission\n\n`;

      s += `Suggested approach:\n`;
      s += `1. Each agent states their position with evidence\n`;
      s += `2. The authoritative agent (per conflict type) makes the call\n`;
      s += `3. Manager records the decision and impact\n`;

      ctx.ui.notify(s, "info");
    },
  });

  // ---------- 9. /handover ----------
  pi.registerCommand("handover", {
    description: "Generate a handover document. Usage: /handover <from-agent> <to-agent>",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const { positional } = parseArgs(args);
      if (positional.length < 2) {
        ctx.ui.notify("Usage: /handover <from-agent> <to-agent>", "error");
        return;
      }

      const registry = getAgentRegistry();
      const fromAgent = registry.resolve(positional[0]);
      const toAgent = registry.resolve(positional[1]);

      if (!fromAgent) {
        ctx.ui.notify(`Agent '${positional[0]}' not found.`, "error");
        return;
      }
      if (!toAgent) {
        ctx.ui.notify(`Agent '${positional[1]}' not found.`, "error");
        return;
      }

      const s = `📋 Handover Document\n\n` +
        `From: ${fromAgent.displayName}\n` +
        `To: ${toAgent.displayName}\n\n` +
        `--- Current Conclusions ---\n` +
        `(To be filled by ${fromAgent.displayName})\n\n` +
        `--- Evidence & Basis ---\n` +
        `(Supporting evidence for conclusions)\n\n` +
        `--- Impact Scope ---\n` +
        `(What is affected by this handover)\n\n` +
        `--- Risks & Open Issues ---\n` +
        `(Items that need attention)\n\n` +
        `--- Suggested Next Steps ---\n` +
        `(Recommended actions for ${toAgent.displayName})\n\n` +
        `--- Items Needing接力 ---\n` +
        `(Specific items ${toAgent.displayName} needs to take over)\n`;

      ctx.ui.notify(s, "info");
    },
  });

  // ---------- 10. /use ----------
  pi.registerCommand("use", {
    description: "Switch to a specific agent mode. Usage: /use <agent-name> | /use manager",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const state = getMutableState();
      const agentName = args.trim().toLowerCase();

      if (!agentName) {
        ctx.ui.notify("Usage: /use <agent-name> or /use manager", "error");
        return;
      }

      if (agentName === "manager") {
        state.mode = "manager";
        state.activeAgent = null;
        persistState(pi, state);
        ctx.ui.notify("Switched to Manager orchestration mode.", "info");
        return;
      }

      const registry = getAgentRegistry();
      const agent = registry.resolve(agentName);
      if (!agent) {
        ctx.ui.notify(
          `Agent '${agentName}' not found. Use /team to list available agents.`,
          "error"
        );
        return;
      }

      state.mode = "single-agent";
      state.activeAgent = agent.name;
      persistState(pi, state);
      ctx.ui.notify(
        `Switched to ${agent.displayName} mode. Use /whoami to confirm, /use manager to return to orchestration.`,
        "info"
      );
    },
  });

  // ---------- 11. /whoami ----------
  pi.registerCommand("whoami", {
    description: "Show current mode and active agent",
    handler: async (_args: string, ctx: ExtensionCommandContext) => {
      const state = getMutableState();
      if (state.mode === "manager") {
        ctx.ui.notify("Mode: Manager 编排模式 🏢", "info");
      } else if (state.mode === "multi-agent" && state.multiAgentTask) {
        const registry = getAgentRegistry();
        const agentNames = state.multiAgentTask.agents
          .map((n) => registry.get(n)?.displayName ?? n)
          .join(", ");
        ctx.ui.notify(
          `Mode: 多 Agent 协作模式 👥\nCoordinating: ${agentNames}\nTask: ${state.multiAgentTask.request.slice(0, 100)}`,
          "info"
        );
      } else if (state.activeAgent) {
        const registry = getAgentRegistry();
        const agent = registry.get(state.activeAgent);
        ctx.ui.notify(
          `Mode: 单 Agent 模式\nActive Agent: ${agent?.displayName ?? state.activeAgent}`,
          "info"
        );
      } else {
        ctx.ui.notify("Mode: 无指派 (use /use <agent> or /use manager)", "info");
      }
    },
  });

  // ---------- 12. /task ----------
  pi.registerCommand("task", {
    description:
      "Assign a task to multiple agents coordinated by Manager. Usage: /task <agent1,agent2,...> <task description>",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const state = getMutableState();
      const trimmed = args.trim();

      if (!trimmed) {
        ctx.ui.notify(
          "Usage: /task <agent1,agent2,...> <task description>\n" +
            "Example: /task backend-developer,database-engineer 实现用户注册功能",
          "error"
        );
        return;
      }

      // Parse: comma-separated agent names, then space, then task description
      const parts = trimmed.split(",");
      if (parts.length < 2) {
        ctx.ui.notify(
          "Use commas to separate agent names. Format: /task <agent1,agent2,...> <task>\n" +
            "Example: /task backend-developer,database-engineer 实现用户注册功能",
          "error"
        );
        return;
      }

      // Last part may contain the last agent name + space + task description
      const lastPart = parts[parts.length - 1];
      const lastSpaceIdx = lastPart.indexOf(" ");
      if (lastSpaceIdx === -1) {
        ctx.ui.notify(
          "Task description missing. Format: /task <agent1,agent2,...> <task>\n" +
            "Example: /task backend-developer,database-engineer 实现用户注册功能",
          "error"
        );
        return;
      }

      const rawAgentNames = [
        ...parts.slice(0, -1).map((s) => s.trim()),
        lastPart.slice(0, lastSpaceIdx).trim(),
      ]
        .map((s) => s.toLowerCase())
        .filter(Boolean);
      const task = lastPart.slice(lastSpaceIdx + 1).trim();

      if (rawAgentNames.length < 2) {
        ctx.ui.notify(
          "Use /call for single-agent tasks. /task needs at least 2 agents.",
          "error"
        );
        return;
      }

      const registry = getAgentRegistry();

      // Resolve all agent names (support aliases)
      const resolvedAgents: Array<{ name: string; displayName: string }> = [];
      const notFound: string[] = [];

      for (const rawName of rawAgentNames) {
        const agent = registry.resolve(rawName);
        if (agent) {
          resolvedAgents.push({
            name: agent.name,
            displayName: agent.displayName,
          });
        } else {
          notFound.push(rawName);
        }
      }

      if (notFound.length > 0) {
        ctx.ui.notify(
          `Agents not found: ${notFound.join(", ")}. Use /team to list available agents.`,
          "error"
        );
        return;
      }

      // Save current mode for auto-return
      state.pendingReturn = true;
      state.previousMode = state.mode;
      state.previousAgent = state.activeAgent;

      // Switch to multi-agent mode
      state.mode = "multi-agent";
      state.activeAgent = null;
      state.multiAgentTask = {
        request: task,
        agents: resolvedAgents.map((a) => a.name),
        status: "active",
        createdAt: Date.now(),
      };
      persistState(pi, state);

      // Set all agents to working status
      for (const agent of resolvedAgents) {
        state.agentStatuses[agent.name] = {
          agentName: agent.name,
          status: "working",
          currentTask: task,
        };
      }
      persistState(pi, state);

      // Build agent profiles for the message
      const agentProfiles = resolvedAgents
        .map((a) => {
          const info = registry.get(a.name);
          return [
            `### ${a.displayName} (${a.name})`,
            `Role: ${info?.role?.slice(0, 150) ?? "N/A"}`,
            `Domain: ${DOMAIN_LABELS[info?.domain ?? "delivery-engineering"]}`,
            info?.responsibilities?.length
              ? `Key responsibilities:\n${info.responsibilities.slice(0, 3).map((r) => `  - ${r}`).join("\n")}`
              : "",
          ]
            .filter(Boolean)
            .join("\n");
        })
        .join("\n\n");

      pi.sendUserMessage(
        [
          `[Multi-Agent Coordination Task]`,
          ``,
          `You are the Manager. Coordinate the following agents to accomplish this task.`,
          ``,
          `## Task`,
          task,
          ``,
          `## Assigned Agents`,
          agentProfiles,
          ``,
          `## Your Responsibilities`,
          `1. Break down the task into sub-tasks for each agent based on their expertise`,
          `2. Define the order of work (parallel vs sequential)`,
          `3. Specify what each agent needs to produce`,
          `4. Identify dependencies between agents' work`,
          `5. Define how the outputs should be integrated`,
          ``,
          `Please provide a coordination plan first, then guide the execution step by step.`,
          `When all agents have completed their work, summarize the results.`,
        ].join("\n"),
        { deliverAs: "steer" }
      );

      ctx.ui.notify(
        `🎯 Multi-agent task assigned!\n` +
          `Coordinating: ${resolvedAgents.map((a) => a.displayName).join(", ")}\n` +
          `Task: ${task.slice(0, 80)}...\n\n` +
          `Manager will break down the work and coordinate the agents.\n` +
          `Use /status to check progress, /back to return to previous mode after completion.`,
        "info"
      );
    },
  });

  // ---------- 13. /call ----------
  pi.registerCommand("call", {
    description: "Delegate a task to a specific agent. Usage: /call <agent-name> <task description>",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const state = getMutableState();
      const trimmed = args.trim();

      if (!trimmed) {
        ctx.ui.notify("Usage: /call <agent-name> <task description>", "error");
        return;
      }

      // First word is agent name
      const spaceIdx = trimmed.indexOf(" ");
      if (spaceIdx === -1) {
        ctx.ui.notify("Usage: /call <agent-name> <task description>", "error");
        return;
      }

      const agentName = trimmed.slice(0, spaceIdx).trim().toLowerCase();
      const task = trimmed.slice(spaceIdx + 1).trim();

      const registry = getAgentRegistry();
      const agent = registry.resolve(agentName);
      if (!agent) {
        ctx.ui.notify(
          `Agent '${agentName}' not found. Use /team to list available agents.`,
          "error"
        );
        return;
      }

      // Save current mode for auto-return
      state.pendingReturn = true;
      state.previousMode = state.mode;
      state.previousAgent = state.activeAgent;

      // Switch to single-agent mode
      state.mode = "single-agent";
      state.activeAgent = agent.name;
      persistState(pi, state);

      // Update agent status
      state.agentStatuses[agent.name] = {
        agentName: agent.name,
        status: "working",
        currentTask: task,
      };
      persistState(pi, state);

      // Send the task as a user message (triggers LLM turn)
      pi.sendUserMessage(
        `[Delegated Task for ${agent.displayName}]\n\n${task}\n\nPlease complete this task as ${agent.displayName}. When done, clearly state what was accomplished.`,
        { deliverAs: "steer" }
      );

      ctx.ui.notify(
        `Delegated to ${agent.displayName}. Task: ${task.slice(0, 60)}...\nAfter completion, will auto-return to ${state.previousMode === "manager" ? "Manager" : state.previousAgent ?? "previous"} mode.`,
        "info"
      );
    },
  });

  // ---------- 14. /ask ----------
  pi.registerCommand("ask", {
    description: "Quick consultation with an agent. Usage: /ask <agent-name> <question>",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const state = getMutableState();
      const trimmed = args.trim();

      if (!trimmed) {
        ctx.ui.notify("Usage: /ask <agent-name> <question>", "error");
        return;
      }

      const spaceIdx = trimmed.indexOf(" ");
      if (spaceIdx === -1) {
        ctx.ui.notify("Usage: /ask <agent-name> <question>", "error");
        return;
      }

      const agentName = trimmed.slice(0, spaceIdx).trim().toLowerCase();
      const question = trimmed.slice(spaceIdx + 1).trim();

      const registry = getAgentRegistry();
      const agent = registry.resolve(agentName);
      if (!agent) {
        ctx.ui.notify(
          `Agent '${agentName}' not found. Use /team to list available agents.`,
          "error"
        );
        return;
      }

      // Save and switch
      state.pendingReturn = true;
      state.previousMode = state.mode;
      state.previousAgent = state.activeAgent;

      state.mode = "single-agent";
      state.activeAgent = agent.name;
      persistState(pi, state);

      pi.sendUserMessage(
        `[Consultation Request for ${agent.displayName}]\n\nPlease provide your expert opinion on:\n\n${question}\n\nKeep the response focused and concise.`,
        { deliverAs: "steer" }
      );

      ctx.ui.notify(
        `Consulting ${agent.displayName}... Will auto-return after response.`,
        "info"
      );
    },
  });

  // ---------- 15. /chat ----------
  pi.registerCommand("chat", {
    description: "Start an interactive chat session with an agent. Usage: /chat <agent-name>",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const state = getMutableState();
      const agentName = args.trim().toLowerCase();

      if (!agentName) {
        ctx.ui.notify("Usage: /chat <agent-name>", "error");
        return;
      }

      const registry = getAgentRegistry();
      const agent = registry.resolve(agentName);
      if (!agent) {
        ctx.ui.notify(
          `Agent '${agentName}' not found. Use /team to list available agents.`,
          "error"
        );
        return;
      }

      state.mode = "single-agent";
      state.activeAgent = agent.name;
      state.pendingReturn = false; // Don't auto-return, user controls with /back
      persistState(pi, state);

      ctx.ui.notify(
        `💬 Now chatting with ${agent.displayName}.\nType your message to interact. Use /back to return to previous mode.`,
        "info"
      );
    },
  });

  // ---------- 16. /back ----------
  pi.registerCommand("back", {
    description: "Return to previous mode from single-agent chat",
    handler: async (_args: string, ctx: ExtensionCommandContext) => {
      const state = getMutableState();

      if (state.mode !== "single-agent") {
        ctx.ui.notify("Already in Manager mode.", "info");
        return;
      }

      state.mode = "manager";
      state.activeAgent = null;
      state.pendingReturn = false;
      persistState(pi, state);

      ctx.ui.notify("Returned to Manager orchestration mode.", "info");
    },
  });

  // ---------- 17. /team ----------
  pi.registerCommand("team", {
    description: "List all agents. Filter by: --domain <domain>",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const registry = getAgentRegistry();
      const { flags } = parseArgs(args);

      if (flags.domain) {
        const domain = flags.domain as AgentDomain;
        if (!DOMAIN_LABELS[domain]) {
          ctx.ui.notify(
            `Unknown domain: ${domain}. Valid: ${Object.keys(DOMAIN_LABELS).join(", ")}`,
            "error"
          );
          return;
        }
        const agents = registry.getByDomain(domain);
        let s = `📂 ${DOMAIN_LABELS[domain]}\n`;
        for (const agent of agents) {
          s += `  • ${agent.name} - ${agent.role.slice(0, 80)}...\n`;
        }
        ctx.ui.notify(s, "info");
      } else {
        ctx.ui.notify(formatAgentList(registry), "info");
      }
    },
  });

  // ---------- 18. /agents (alias for /team) ----------
  pi.registerCommand("agents", {
    description: "Alias for /team. List all team agents.",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const registry = getAgentRegistry();
      ctx.ui.notify(formatAgentList(registry), "info");
    },
  });

  // ---------- 19. /agent ----------
  pi.registerCommand("agent", {
    description: "Show detailed info for a specific agent. Usage: /agent <agent-name>",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const registry = getAgentRegistry();
      const agentName = args.trim().toLowerCase();

      if (!agentName) {
        ctx.ui.notify("Usage: /agent <agent-name>", "error");
        return;
      }

      const agent = registry.resolve(agentName);
      if (!agent) {
        ctx.ui.notify(
          `Agent '${agentName}' not found. Use /team to list available agents.`,
          "error"
        );
        return;
      }

      ctx.ui.notify(formatAgentDetail(registry, agent.name), "info");
    },
  });

  // ---------- 20. /alias ----------
  pi.registerCommand("alias", {
    description: "Set a short alias for an agent. Usage: /alias <short-name> <agent-name>",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const state = getMutableState();
      const { positional } = parseArgs(args);

      if (positional.length < 2) {
        ctx.ui.notify("Usage: /alias <short-name> <agent-name>", "error");
        return;
      }

      const shortName = positional[0].toLowerCase();
      const agentName = positional.slice(1).join("-").toLowerCase();

      const registry = getAgentRegistry();
      if (!registry.has(agentName)) {
        ctx.ui.notify(`Agent '${agentName}' not found.`, "error");
        return;
      }

      registry.addAlias(shortName, agentName);
      state.aliases[shortName] = agentName;
      persistState(pi, state);

      ctx.ui.notify(`Alias '${shortName}' → ${agentName} registered.`, "info");
    },
  });

  // ---------- 21. /unalias ----------
  pi.registerCommand("unalias", {
    description: "Remove an alias. Usage: /unalias <short-name>",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const state = getMutableState();
      const shortName = args.trim().toLowerCase();

      if (!shortName) {
        ctx.ui.notify("Usage: /unalias <short-name>", "error");
        return;
      }

      const registry = getAgentRegistry();
      if (registry.removeAlias(shortName)) {
        delete state.aliases[shortName];
        persistState(pi, state);
        ctx.ui.notify(`Alias '${shortName}' removed.`, "info");
      } else {
        ctx.ui.notify(`Alias '${shortName}' not found.`, "error");
      }
    },
  });

  // ---------- 22. /aliases ----------
  pi.registerCommand("aliases", {
    description: "List all registered aliases",
    handler: async (_args: string, ctx: ExtensionCommandContext) => {
      const registry = getAgentRegistry();
      const aliases = registry.getAllAliases();
      const entries = Object.entries(aliases);

      if (entries.length === 0) {
        ctx.ui.notify("No aliases configured. Use /alias <short> <agent> to add one.", "info");
        return;
      }

      let s = "🔗 Agent Aliases\n";
      for (const [short, full] of entries) {
        s += `  ${short} → ${full}\n`;
      }
      ctx.ui.notify(s, "info");
    },
  });

  // ---------- 23. /team-config ----------
  pi.registerCommand("team-config", {
    description: "View team configuration",
    handler: async (_args: string, ctx: ExtensionCommandContext) => {
      const state = getMutableState();
      const registry = getAgentRegistry();

      let s = "⚙️ Team Configuration\n\n";
      s += `Default Mode: Manager 编排\n`;
      s += `Agents Loaded: ${registry.getAll().length}\n`;
      s += `Current Mode: ${state.mode === "manager" ? "Manager 编排" : state.mode === "multi-agent" ? "多 Agent 协作" : `单 Agent (${state.activeAgent})`}\n`;
      s += `Current Phase: ${state.currentPhase}/10\n`;
      s += `Aliases: ${Object.keys(state.aliases).length} configured\n\n`;

      s += "--- Phase Definitions ---\n";
      for (const pd of PHASE_DEFINITIONS) {
        const ps = state.phaseStatuses.find((p) => p.phase === pd.number);
        const status = ps?.status ?? "pending";
        s += `  ${pd.number}. ${pd.name} (${status})\n`;
      }

      ctx.ui.notify(s, "info");
    },
  });
}
