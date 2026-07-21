// ============================================================
// Agent Team Java - Main Extension Entry
// ============================================================
//
// This extension provides a team of software engineering agents
// that work together under a Manager orchestrator to deliver
// Java enterprise projects.
//
// The agents/ directory is bundled with the package and resolved
// relative to this module file using import.meta.url, so it works
// regardless of install method: npm install, git install, or local.
//
// Features:
//   - 28 specialized agents + 1 Manager orchestrator
//   - 10-phase software engineering workflow
//   - Manager coordination mode (default)
//   - Single-agent mode for focused work
//   - Multi-agent mode for user-specified agent teams
//   - Task delegation, consultation, and conflict resolution
//   - Gate-based phase advancement
//   - Custom aliases for quick agent access
//   - Session-persistent team state
// ============================================================

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getAgentRegistry, initAgentRegistry } from "./agent-registry";
import {
  getMutableState,
  setMutableState,
  resetMutableState,
  persistState,
  createDefaultState,
} from "./state";
import { DOMAIN_LABELS } from "./types";
import { registerCommands } from "./commands";
import { registerTools } from "./tools";

export default function (pi: ExtensionAPI) {
  // ==========================================================
  // 1. Session Start - Initialize state and discover agents
  // ==========================================================
  pi.on("session_start", async (_event, ctx) => {
    // Discover agents from the package's bundled agents/ directory.
    // The path is resolved relative to agent-registry.ts via import.meta.url,
    // so it works for npm install, git install, and local paths alike.
    initAgentRegistry();

    // Reconstruct state from persisted entries
    let state = getMutableState();
    for (const entry of ctx.sessionManager.getEntries()) {
      if (
        entry.type === "custom" &&
        entry.customType === "agent-team-state" &&
        entry.data
      ) {
        state = entry.data as ReturnType<typeof createDefaultState>;
        setMutableState(state);
        break;
      }
    }

    // Restore aliases to registry
    const registry = getAgentRegistry();
    for (const [alias, agentName] of Object.entries(state.aliases)) {
      registry.addAlias(alias, agentName);
    }

    const agentCount = registry.getAll().length;
    const modeLabel =
      state.mode === "multi-agent"
        ? `Multi-Agent (${state.multiAgentTask?.agents.length ?? 0} agents)`
        : state.mode === "manager"
          ? "Manager"
          : state.activeAgent ?? "idle";
    ctx.ui.setStatus("agent-team", `🏢 Team: ${agentCount} agents | ${modeLabel}`);
  });

  // ==========================================================
  // 2. Before Agent Start - Inject agent context
  // ==========================================================
  pi.on("before_agent_start", async (event, ctx) => {
    const state = getMutableState();
    const registry = getAgentRegistry();

    if (state.mode === "single-agent" && state.activeAgent) {
      const agent = registry.get(state.activeAgent);
      if (agent) {
        // Inject the agent's role and context into the system prompt
        const contextBlock = [
          "",
          "=== Agent Role Context ===",
          `You are currently acting as: ${agent.displayName}`,
          "",
          `--- Role ---`,
          agent.role,
          "",
          `--- Core Responsibilities ---`,
          ...agent.responsibilities.map((r) => `- ${r}`),
          "",
          `--- Capability Boundaries ---`,
          agent.boundaries,
          "",
          `--- Tech Stack ---`,
          agent.techStack,
          "",
          `--- Work Standards ---`,
          agent.workStandards,
          "",
          `--- Prohibited Actions ---`,
          agent.prohibitedActions,
          "",
          "=== End Agent Role Context ===",
        ].join("\n");

        return {
          systemPrompt: event.systemPrompt + "\n" + contextBlock,
        };
      }
    }

    // ----- Multi-Agent Coordination Mode -----
    if (state.mode === "multi-agent" && state.multiAgentTask) {
      const manager = registry.get("manager");
      if (manager) {
        const agentProfiles = state.multiAgentTask.agents
          .map((name) => {
            const a = registry.get(name);
            if (!a) return null;
            return [
              `### ${a.displayName} (${a.name})`,
              `Domain: ${DOMAIN_LABELS[a.domain]}`,
              `Role: ${a.role.slice(0, 200)}`,
              a.responsibilities.length > 0
                ? `Responsibilities:\n${a.responsibilities.slice(0, 4).map((r) => `  - ${r}`).join("\n")}`
                : "",
              a.techStack ? `Tech Stack: ${a.techStack.slice(0, 200)}` : "",
              a.qualityGates ? `Quality Gates: ${a.qualityGates.slice(0, 200)}` : "",
              a.prohibitedActions ? `Prohibited: ${a.prohibitedActions.slice(0, 200)}` : "",
            ]
              .filter(Boolean)
              .join("\n");
          })
          .filter(Boolean)
          .join("\n\n---\n\n");

        const multiAgentContext = [
          "",
          "=== Manager Orchestrator Context (Multi-Agent Coordination) ===",
          "You are the Manager Agent. You have been tasked with coordinating a specific set of agents on a user request.",
          "Your job is to break down the work, assign sub-tasks to each agent based on their expertise,",
          "manage dependencies between agents, integrate their outputs, and report the final result.",
          "",
          `--- Assigned Task ---`,
          state.multiAgentTask.request,
          "",
          `--- Agents to Coordinate ---`,
          agentProfiles,
          "",
          `--- Coordination Rules ---`,
          `1. Break the task into clear sub-tasks, each assigned to the most suitable agent`,
          `2. Define the execution order (parallel vs sequential) based on dependencies`,
          `3. Ensure each agent's output feeds correctly into the next agent's work`,
          `4. Verify quality gates: each agent's output must meet their defined standards`,
          `5. Resolve any conflicts between agents using the conflict resolution rules`,
          `6. Produce an integrated result that satisfies the original task request`,
          "",
          `--- Agent Scheduling Reference ---`,
          `- Small code changes: Manager + Developer + Code Reviewer + QA`,
          `- API changes: + API Governance Engineer + Integration Engineer`,
          `- Database changes: + Data Architect + Database Engineer`,
          `- Security: + Security Architect + Security Engineer`,
          `- Performance: + Performance Engineer + SRE + Observability`,
          `- Deployment: + DevOps + Config Manager + Release + Operations`,
          `- UX changes: + UX Designer + Product Manager`,
          `- Major architecture: + Solution/Technical/Backend/Frontend/Data/Security Architects`,
          "",
          `--- Conflict Resolution ---`,
          `- Technical: Solution/Technical Architect chairs with evidence`,
          `- Security: Security Architect has veto on architecture`,
          `- Data: Data Architect leads on data model`,
          `- Quality: QA Engineer owns acceptance conclusions`,
          `- Release: Release Engineer owns release admission`,
          "",
          "=== End Manager Orchestrator Context ===",
        ].join("\n");

        return {
          systemPrompt: event.systemPrompt + "\n" + multiAgentContext,
        };
      }
    }

    if (state.mode === "manager") {
      const manager = registry.get("manager");
      if (manager) {
        const managerContext = [
          "",
          "=== Manager Orchestrator Context ===",
          "You are the Manager Agent — the orchestrator of the entire agent team.",
          "Your job is to decompose user requests into executable workflows,",
          "select the right agents, control phase gates, resolve conflicts,",
          "and ensure end-to-end delivery quality.",
          "",
          `--- Role ---`,
          manager.role,
          "",
          `--- Core Responsibilities ---`,
          ...manager.responsibilities.map((r) => `- ${r}`),
          "",
          `--- Agent Scheduling Rules ---`,
          `- Small code changes: Manager + Developer + Code Reviewer + QA`,
          `- API changes: + API Governance Engineer + Integration Engineer`,
          `- Database changes: + Data Architect + Database Engineer`,
          `- Security: + Security Architect + Security Engineer`,
          `- Performance: + Performance Engineer + SRE + Observability`,
          `- Deployment: + DevOps + Config Manager + Release + Operations`,
          `- UX changes: + UX Designer + Product Manager`,
          `- Major architecture: + Solution/Technical/Backend/Frontend/Data/Security Architects`,
          "",
          `--- Conflict Resolution ---`,
          `- Product scope: Product Manager decides`,
          `- Technical: Solution/Technical Architect chairs with evidence`,
          `- Security: Security Architect has veto`,
          `- Data: Data Architect leads`,
          `- Release: Release Engineer owns admission`,
          `- Quality: QA Engineer owns acceptance`,
          "",
          "=== End Manager Orchestrator Context ===",
        ].join("\n");

        return {
          systemPrompt: event.systemPrompt + "\n" + managerContext,
        };
      }
    }
  });

  // ==========================================================
  // 3. Agent Settled - Handle auto-return from /call, /ask, /task
  // ==========================================================
  pi.on("agent_settled", async (_event, ctx) => {
    const state = getMutableState();

    if (state.pendingReturn) {
      // Auto-return to previous mode
      const previousMode = state.previousMode ?? "manager";
      const previousAgent = state.previousAgent ?? null;

      // Mark all involved agents as done before switching
      if (state.mode === "multi-agent" && state.multiAgentTask) {
        for (const name of state.multiAgentTask.agents) {
          if (state.agentStatuses[name]) {
            state.agentStatuses[name].status = "done";
          }
        }
        state.multiAgentTask.status = "completed";
      } else if (state.activeAgent && state.agentStatuses[state.activeAgent]) {
        state.agentStatuses[state.activeAgent].status = "done";
      }

      state.mode = previousMode;
      state.activeAgent = previousAgent;
      state.multiAgentTask = previousMode !== "multi-agent" ? null : state.multiAgentTask;
      state.pendingReturn = false;
      state.previousMode = undefined;
      state.previousAgent = undefined;

      persistState(pi, state);

      const modeLabel =
        previousMode === "manager"
          ? "Manager orchestration"
          : previousMode === "multi-agent"
            ? "multi-agent coordination"
            : previousAgent ?? "idle";

      ctx.ui.setStatus(
        "agent-team",
        `🏢 Team: ${getAgentRegistry().getAll().length} agents | ${modeLabel}`
      );

      ctx.ui.notify(`Auto-returned to ${modeLabel} mode.`, "info");
    }
  });

  // ==========================================================
  // 4. Session Shutdown - Cleanup
  // ==========================================================
  pi.on("session_shutdown", async () => {
    resetMutableState();
  });

  // ==========================================================
  // 5. Register all commands and tools
  // ==========================================================
  registerCommands(pi);
  registerTools(pi);
}
