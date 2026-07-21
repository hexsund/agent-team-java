// ============================================================
// Agent Team Java - Custom LLM Tools
// ============================================================

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { StringEnum } from "@earendil-works/pi-ai";
import { getAgentRegistry, SCHEDULING_RULES } from "./agent-registry";
import { getMutableState, persistState, PHASE_DEFINITIONS } from "./state";
import { DOMAIN_LABELS } from "./types";

export function registerTools(pi: ExtensionAPI): void {
  // ---------- 1. delegate_task ----------
  pi.registerTool({
    name: "delegate_task",
    label: "Delegate Task",
    description:
      "Delegate a task to a specific agent by name. The agent will receive the task context and work on it. Use when you need a specialized agent to handle a specific task.",
    promptSnippet: "Delegate tasks to specialized agents by name using delegate_task",
    promptGuidelines: [
      "Use delegate_task when a task requires a specific agent's expertise rather than handling it yourself.",
      "Choose the agent name from the team roster — each agent has distinct capabilities.",
    ],
    parameters: Type.Object({
      agent: Type.String({
        description: "Name of the agent to delegate to (e.g. 'backend-developer', 'security-architect')",
      }),
      task: Type.String({
        description: "Description of the task to be performed",
      }),
      context: Type.Optional(
        Type.String({
          description: "Additional context or background information for the agent",
        })
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const registry = getAgentRegistry();
      const agent = registry.resolve(params.agent.toLowerCase());

      if (!agent) {
        return {
          content: [
            {
              type: "text",
              text: `Agent '${params.agent}' not found. Available agents: ${registry
                .getAll()
                .map((a) => a.name)
                .join(", ")}`,
            },
          ],
          details: { error: `Agent '${params.agent}' not found` },
          isError: true,
        };
      }

      const state = getMutableState();
      state.agentStatuses[agent.name] = {
        agentName: agent.name,
        status: "working",
        currentTask: params.task,
      };
      persistState(pi, state);

      let result = `✅ Task delegated to ${agent.displayName} (${agent.name})\n\n`;
      result += `Task: ${params.task}\n\n`;
      result += `Agent Profile:\n`;
      result += `- Role: ${agent.role.slice(0, 200)}...\n`;
      result += `- Domain: ${DOMAIN_LABELS[agent.domain]}\n`;
      if (agent.responsibilities.length > 0) {
        result += `- Key Responsibilities:\n`;
        for (const r of agent.responsibilities.slice(0, 3)) {
          result += `  • ${r}\n`;
        }
      }
      if (params.context) {
        result += `\nAdditional Context:\n${params.context}\n`;
      }
      result += `\nTo execute this delegation, use /call ${agent.name} ${params.task} in the chat.`;

      return {
        content: [{ type: "text", text: result }],
        details: {
          agentName: agent.name,
          displayName: agent.displayName,
          task: params.task,
        },
      };
    },
  });

  // ---------- 2. get_team_info ----------
  pi.registerTool({
    name: "get_team_info",
    label: "Get Team Info",
    description:
      "Get information about the agent team, including agent roles, domains, and availability. Optionally filter by domain or get details on a specific agent.",
    promptSnippet: "Look up agent roles, responsibilities, and team structure",
    promptGuidelines: [
      "Use get_team_info to learn about agent capabilities before delegating tasks.",
    ],
    parameters: Type.Object({
      agent: Type.Optional(
        Type.String({
          description: "Get details for a specific agent (e.g. 'backend-developer')",
        })
      ),
      domain: Type.Optional(
        Type.String({
          description: "Filter agents by domain category",
        })
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const registry = getAgentRegistry();

      // Specific agent
      if (params.agent) {
        const agent = registry.resolve(params.agent.toLowerCase());
        if (!agent) {
          return {
            content: [
              {
                type: "text",
                text: `Agent '${params.agent}' not found.`,
              },
            ],
            details: { error: "not_found" },
            isError: true,
          };
        }
        return {
          content: [
            {
              type: "text",
              text: [
                `Name: ${agent.displayName} (${agent.name})`,
                `Domain: ${DOMAIN_LABELS[agent.domain]}`,
                `Role: ${agent.role}`,
                `Responsibilities: ${agent.responsibilities.join("; ")}`,
                `Tech Stack: ${agent.techStack.slice(0, 500)}`,
                `Outputs: ${agent.outputs.slice(0, 300)}`,
              ].join("\n"),
            },
          ],
          details: {
            name: agent.name,
            displayName: agent.displayName,
            domain: agent.domain,
            responsibilityCount: agent.responsibilities.length,
          },
        };
      }

      // By domain
      if (params.domain) {
        const domainKey = Object.entries(DOMAIN_LABELS).find(
          ([, label]) =>
            label.includes(params.domain!) ||
            params.domain!.includes(label)
        )?.[0];
        const agents = domainKey
          ? registry.getByDomain(domainKey as any)
          : registry.getAll();

        return {
          content: [
            {
              type: "text",
              text:
                `Agents${domainKey ? ` in ${DOMAIN_LABELS[domainKey as keyof typeof DOMAIN_LABELS]}` : ""}:\n` +
                agents
                  .map(
                    (a) =>
                      `  • ${a.name}: ${a.role.slice(0, 100)}...`
                  )
                  .join("\n"),
            },
          ],
          details: { count: agents.length, domain: domainKey },
        };
      }

      // All agents grouped
      const grouped = registry.getGroupedByDomain();
      let text = "Agent Team:\n\n";
      for (const [domain, agents] of Object.entries(grouped)) {
        text += `${DOMAIN_LABELS[domain as keyof typeof DOMAIN_LABELS]}\n`;
        for (const a of agents) {
          text += `  • ${a.name}\n`;
        }
        text += "\n";
      }
      return {
        content: [{ type: "text", text }],
        details: { totalAgents: registry.getAll().length },
      };
    },
  });

  // ---------- 3. get_phase_status ----------
  pi.registerTool({
    name: "get_phase_status",
    label: "Get Phase Status",
    description:
      "Get the current status of the software engineering phase, including gate conditions and progress.",
    promptSnippet: "Check current phase progress and gate conditions",
    promptGuidelines: [
      "Use get_phase_status before advancing phases to ensure all gates are met.",
    ],
    parameters: Type.Object({}),
    async execute(_toolCallId, _params, _signal, _onUpdate, _ctx) {
      const state = getMutableState();
      const phase = PHASE_DEFINITIONS[state.currentPhase - 1];
      const ps = state.phaseStatuses.find(
        (p) => p.phase === state.currentPhase
      );

      if (!phase || !ps) {
        return {
          content: [{ type: "text", text: "No active phase." }],
          details: {},
        };
      }

      let text = `Phase ${phase.number}: ${phase.name}\n`;
      text += `Status: ${ps.status}\n\n`;
      text += `Gates:\n`;
      for (const gate of ps.gates) {
        text += `  ${gate.passed ? "✅" : "❌"} ${gate.description}\n`;
      }
      text += `\nDeliverables:\n`;
      for (const d of phase.deliverables) {
        text += `  📄 ${d}\n`;
      }

      return {
        content: [{ type: "text", text }],
        details: {
          phaseNumber: phase.number,
          phaseName: phase.name,
          status: ps.status,
          gatesPassed: ps.gates.filter((g) => g.passed).length,
          gatesTotal: ps.gates.length,
        },
      };
    },
  });

  // ---------- 4. advance_phase ----------
  pi.registerTool({
    name: "advance_phase",
    label: "Advance Phase",
    description:
      "Advance to the next software engineering phase. All gates for the current phase must be passed first.",
    promptSnippet: "Advance to the next phase when all current phase gates are met",
    promptGuidelines: [
      "Use advance_phase only after all gates in the current phase are marked as passed.",
      "Check get_phase_status first to verify gate status.",
    ],
    parameters: Type.Object({}),
    async execute(_toolCallId, _params, _signal, _onUpdate, _ctx) {
      const state = getMutableState();

      if (state.mode !== "manager") {
        return {
          content: [
            { type: "text", text: "Phase advancement is only available in Manager mode." },
          ],
          details: { error: "wrong_mode" },
          isError: true,
        };
      }

      const current = state.phaseStatuses.find(
        (p) => p.phase === state.currentPhase
      );
      if (!current) {
        return {
          content: [{ type: "text", text: "No active phase." }],
          details: {},
        };
      }

      const failed = current.gates.filter((g) => !g.passed);
      if (failed.length > 0) {
        return {
          content: [
            {
              type: "text",
              text: `Cannot advance. ${failed.length} gate(s) not met:\n${failed
                .map((g) => `❌ ${g.description}`)
                .join("\n")}`,
            },
          ],
          details: { gatesFailed: failed.length },
          isError: true,
        };
      }

      current.status = "completed";
      if (state.currentPhase < 10) {
        state.currentPhase++;
        const next = state.phaseStatuses.find(
          (p) => p.phase === state.currentPhase
        );
        if (next) next.status = "active";
        persistState(pi, state);

        return {
          content: [
            {
              type: "text",
              text: `✅ Advanced to Phase ${state.currentPhase}: ${PHASE_DEFINITIONS[state.currentPhase - 1]?.name}`,
            },
          ],
          details: {
            newPhase: state.currentPhase,
            newPhaseName: PHASE_DEFINITIONS[state.currentPhase - 1]?.name,
          },
        };
      } else {
        persistState(pi, state);
        return {
          content: [{ type: "text", text: "🎉 All phases completed!" }],
          details: { allPhasesComplete: true },
        };
      }
    },
  });

  // ---------- 5. pass_gate ----------
  pi.registerTool({
    name: "pass_gate",
    label: "Pass Gate",
    description:
      "Mark a specific gate condition as passed in the current phase. Provide evidence and the gate index (1-based).",
    promptSnippet: "Mark a phase gate as passed with supporting evidence",
    promptGuidelines: [
      "Use pass_gate when a gate condition has been verified and satisfied.",
      "Provide clear evidence for why the gate passes.",
    ],
    parameters: Type.Object({
      gateIndex: Type.Integer({
        description: "Gate number (1-based) as shown in phase status",
        minimum: 1,
        maximum: 10,
      }),
      evidence: Type.String({
        description: "Evidence or justification for passing this gate",
      }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const state = getMutableState();
      const ps = state.phaseStatuses.find(
        (p) => p.phase === state.currentPhase
      );

      if (!ps) {
        return {
          content: [{ type: "text", text: "No active phase." }],
          details: {},
          isError: true,
        };
      }

      const idx = params.gateIndex - 1;
      if (idx < 0 || idx >= ps.gates.length) {
        return {
          content: [
            {
              type: "text",
              text: `Invalid gate index ${params.gateIndex}. Valid range: 1-${ps.gates.length}`,
            },
          ],
          details: {},
          isError: true,
        };
      }

      ps.gates[idx].passed = true;
      ps.gates[idx].evidence = params.evidence;
      persistState(pi, state);

      return {
        content: [
          {
            type: "text",
            text: `✅ Gate passed: "${ps.gates[idx].description}"\nEvidence: ${params.evidence}`,
          },
        ],
        details: {
          gateIndex: params.gateIndex,
          gateDescription: ps.gates[idx].description,
          evidence: params.evidence,
        },
      };
    },
  });

  // ---------- 6. suggest_agents ----------
  pi.registerTool({
    name: "suggest_agents",
    label: "Suggest Agents",
    description:
      "Suggest which agents to involve for a given task category. Returns recommended agent roster based on Manager's scheduling rules.",
    promptSnippet: "Get recommendations for which agents to involve based on task type",
    promptGuidelines: [
      "Use suggest_agents when planning which agents to assign to a task.",
    ],
    parameters: Type.Object({
      taskType: StringEnum(
        [
          "small-code-change",
          "api-change",
          "database-change",
          "security",
          "performance",
          "deployment",
          "ux",
          "major-architecture",
        ] as const,
        {
          description: "Category of the task to find suitable agents for",
        }
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const registry = getAgentRegistry();
      const agentNames = SCHEDULING_RULES[params.taskType] ?? [];
      const agents = agentNames
        .map((name) => registry.get(name))
        .filter(Boolean);

      const taskLabels: Record<string, string> = {
        "small-code-change": "小型代码修改",
        "api-change": "涉及接口契约",
        "database-change": "涉及数据库",
        security: "涉及权限、安全、敏感数据",
        performance: "涉及性能、批处理、大流量",
        deployment: "涉及部署、配置、发布",
        ux: "涉及用户体验",
        "major-architecture": "涉及重大架构变化",
      };

      let text = `📋 Suggested Agents for: ${taskLabels[params.taskType] ?? params.taskType}\n\n`;
      for (const agent of agents) {
        text += `  • ${agent.displayName} (${agent.name})\n`;
        text += `    ${agent.role.slice(0, 100)}...\n\n`;
      }

      return {
        content: [{ type: "text", text }],
        details: {
          taskType: params.taskType,
          suggestedAgents: agents.map((a) => a.name),
        },
      };
    },
  });
}
