# Agent Team Java

> A pi coding agent extension providing **28+1 AI software engineering agents** for Java enterprise projects, with Manager orchestration across 10 delivery phases.

## Install

```bash
pi install npm:agent-team-java
```

That's it. No configuration needed. The extension auto-discovers all agent definitions bundled in the package.

## Quick Start

After installation, start pi in your Java project directory:

```bash
cd your-java-project
pi
```

You'll see `🏢 Team: 28 agents | Manager` in the status bar. The default mode is **Manager orchestration**.

### Try these commands:

```bash
/team                          # List all 28 agents
/plan 实现用户登录功能          # Create a delivery plan
/call security-architect 审查这个设计方案  # Delegate to one agent
/task backend-developer,database-engineer 实现注册功能  # Coordinate multiple agents
/use backend-developer         # Switch to single-agent mode
/status                        # Check progress
```

## Features

- **28 specialized agents** covering business analysis, architecture, development, QA, security, DevOps, and more
- **1 Manager orchestrator** that decomposes tasks, selects agents, and controls 10-phase delivery gates
- **Three working modes**: Manager orchestration (default), single-agent focus, multi-agent collaboration
- **22 slash commands** for team management, task delegation, phase control, and more
- **6 LLM-callable tools** for AI-driven team coordination
- **Session-persistent state** survives restarts and session switches

## Documentation

See [DOCUMENTATION.md](./DOCUMENTATION.md) for complete command reference, usage examples, and best practices.

## License

MIT
