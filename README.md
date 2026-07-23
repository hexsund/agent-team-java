# Agent Team Java

> A pi coding agent extension providing **28+1 AI software engineering agents** for Java enterprise projects, with Manager orchestration across 10 delivery phases.

---

## 📦 安装

### 前置条件

- [pi coding agent](https://github.com/earendil-works/pi-coding-agent) 已安装

### 安装步骤（推荐）

一行命令安装，无需任何手动配置：

```bash
pi install npm:agent-team-java
```

安装后启动 pi：

```bash
cd your-java-project
pi
```

你会看到状态栏显示 `🏢 Team: 28 agents | Manager`，表示扩展已自动加载。

### 其他安装方式

```bash
# 从 GitHub 安装
pi install git:github.com/你的用户名/agent-team-java@v1

# 本地路径（开发调试）
pi install /path/to/agent-team-java
```

### 包结构说明

```
agent-team-java/                  ← npm 包根目录
├── package.json                  ← pi 自动发现 extensions/
├── extensions/                   ← TypeScript 源码
│   ├── index.ts
│   ├── types.ts
│   ├── agent-registry.ts
│   ├── state.ts
│   ├── commands.ts
│   └── tools.ts
├── agents/                       ← 28+1 个 AGENT.md 打包在包内
│   ├── manager/AGENT.md
│   ├── backend-developer/AGENT.md
│   └── ...
├── README.md
└── DOCUMENTATION.md
```

> Agent 的 AGENT.md 文件已经打包在 npm 包内，不需要用户手动准备。
> 扩展内部使用 `import.meta.url` 定位包内路径，无论通过 npm/git/本地安装都能正确找到。

---

## 🏗️ 架构概览

### 团队结构

| 领域 | Agent 数量 | 包含角色 |
|------|-----------|----------|
| 🏆 Manager 编排 | 1 | Manager |
| 📋 方向与协调 | 3 | Business Analyst, Product Manager, Project Manager |
| 🏛️ 体验与架构 | 7 | UX Designer, Solution/Technical/Backend/Frontend/Data/Security Architect |
| 🔧 交付工程 | 6 | Backend/Frontend Developer, Database/Integration/API Governance Engineer, Configuration Manager |
| 🛡️ 质量门禁 | 5 | QA/Test Automation/Performance/Security Engineer, Code Reviewer |
| 🚀 交付、运维与知识 | 6 | DevOps/SRE/Operations/Observability/Release Engineer, Technical Writer |

### 两种工作模式

| 模式 | 说明 | 切换方式 |
|------|------|----------|
| **Manager 编排**（默认） | Manager 自动拆解任务、选派 Agent、控制阶段门禁 | `/use manager` |
| **单 Agent 模式** | 聚焦某个 Agent 的角色身份工作 | `/use <agent-name>` |
| **多 Agent 协作** | 用户指定多个 Agent，Manager 负责协调分工 | `/task <agent1,agent2,...> <task>` |

---

## ⌨️ 全部 Slash 命令

### Manager 编排命令

#### `/plan`

生成或管理交付计划。

```bash
# 创建新计划
/plan 实现用户权限管理模块，包括RBAC、OAuth2集成

# 查看当前计划
/plan

# 批准计划（进入执行）
/plan approve

# 驳回计划
/plan reject 缺少性能指标
```

**使用场景**：项目启动时，让 Manager 根据需求创建包含阶段划分、Agent 分派、交付物清单的完整计划。

---

#### `/status`

查看全局状态仪表盘。

```bash
/status
```

输出示例：
```
🏢 Agent Team Status
Mode: Manager 编排
Current Phase: 3/10 - 架构与设计

--- Phase Progress ---
✅ Phase 1: 需求进入 (3/3 gates)
✅ Phase 2: 可行性与方案 (2/2 gates)
🔄 Phase 3: 架构与设计 (1/3 gates)
⏳ Phase 4: ...
```

**使用场景**：随时了解项目整体进展、当前阶段、活跃 Agent。

---

#### `/phase`

查看当前阶段详细信息，包括门禁条件和交付物清单。

```bash
/phase
```

**使用场景**：了解当前阶段还需要完成哪些门禁才能推进。

---

#### `/gate`

列出当前阶段的所有门禁条件。

```bash
/gate
```

**使用场景**：查看具体有哪些条件需要满足才能进入下一阶段。

---

#### `/gate-pass`

标记某个门禁条件为已通过。

```bash
/gate-pass 1 API契约已完成并通过评审
/gate-pass 2 数据模型已确认
```

**使用场景**：完成某个门禁条件后标记为通过，为阶段推进做准备。

---

#### `/advance`

推进到下一阶段（必须先通过所有门禁）。

```bash
/advance
```

**使用场景**：当前阶段所有工作完成、门禁通过后，进入下一阶段。

---

#### `/review`

触发跨 Agent 代码评审，列出质量门禁域的评审角色。

```bash
/review
/review 用户权限模块所有代码
```

**使用场景**：开发完成后，组织 Code Reviewer、Security Engineer 等质量门禁 Agent 进行评审。

---

#### `/resolve`

发起两个 Agent 之间的冲突解决。

```bash
/resolve backend-architect security-architect
```

**使用场景**：当两个 Agent 对同一问题有不同意见时，启动正式的冲突解决流程。

---

#### `/handover`

生成标准化的 Agent 交接文档模板。

```bash
/handover backend-developer qa-engineer
```

输出包含：当前结论、依据和证据、影响范围、风险和未决问题、建议下一步、需接力事项。

**使用场景**：一个 Agent 完成工作后，将上下文正式移交给下一个 Agent。

---

### 单 Agent 模式命令

#### `/use`

切换到指定 Agent 的角色模式（长期使用）。

```bash
# 切换到 Backend Developer 模式
/use backend-developer

# 切换到 Manager 编排模式
/use manager

# 使用别名
/use bd   # 如果已注册 'bd' → 'backend-developer' 别名
```

**使用场景**：需要长时间专注于某个 Agent 的工作（如整个下午都在写后端代码，使用 `/use backend-developer`）。

**原理**：切换后，后续所有与 LLM 的对话都会注入该 Agent 的 AGENT.md 上下文，LLM 将以此 Agent 的角色身份思考和输出。

---

#### `/whoami`

查看当前所处的模式和活跃 Agent。

```bash
/whoami
# Manager 模式输出: Mode: Manager 编排模式 🏢
# 单 Agent 模式输出: Mode: 单 Agent 模式 / Active Agent: Backend Developer
# 多 Agent 模式输出: Mode: 多 Agent 协作模式 👥 / Coordinating: backend-developer, database-engineer
```

---

#### `/call`

临时委派任务给指定 Agent，执行完后自动返回原模式。

```bash
/call performance-engineer 评估用户列表接口在高并发下的性能瓶颈
/call security-architect 审查新的 OAuth2 集成方案安全性
/call bd 实现用户注册接口（使用别名）
```

**使用场景**：在 Manager 工作流中临时需要某个 Agent 的专业意见或产出，不需要长期切换模式。

**自动返回**：该 Agent 完成回复后，`/call` 会自动将模式切回之前的状态（Manager 或之前的 Agent）。

---

#### `/task`

将任务指派给**多个 Agent**，由 Manager 负责分解和协调。

```bash
# 指定多个 Agent 协作
/task backend-developer,database-engineer 实现用户注册功能，包括数据库表设计

# 三个 Agent 协同
/task backend-developer,integration-engineer,security-engineer 实现第三方登录集成

# 使用别名
/task bd,sa 审查用户权限模块的安全性
```

**与 `/plan` 的区别**：
| | `/task` | `/plan` |
|---|---------|--------|
| Agent 选择 | **用户显式指定** | Manager 自动选派 |
| 流程 | Manager 按需协调 | 10 阶段标准化流程 |
| 门禁 | 无（即席协作） | 有（阶段门禁） |
| 适用场景 | 你知道需要哪些 Agent | 不确定哪些 Agent 参与 |

**自动返回**：该多 Agent 协作完成后，自动返回之前的模式（Manager 或单 Agent）。

---

#### `/ask`

快速咨询某个 Agent 的专业意见，不切换模式、不产生交付物，只获取观点。

```bash
/ask security-architect 这个 JWT token 过期时间设置为24小时是否合理？
/ask data-architect 用户订单表应该怎么设计分区？
```

**使用场景**：需要快速的专业建议，不需要 Agent 完成完整任务。

**与 `/call` 的区别**：
| | `/call` | `/ask` |
|---|---------|--------|
| 目的 | 执行任务 | 获取意见 |
| 产出 | 代码/文档/交付物 | 观点/建议 |
| 模式 | 切换后自动返回 | 切换后自动返回 |

---

#### `/chat`

进入与指定 Agent 的持续对话模式。

```bash
/chat database-engineer
# 进入后可以连续提问：
# "帮我设计用户表"
# "这个查询怎么优化？"
# ... 持续对话 ...
/back   # 返回 Manager 模式
```

**使用场景**：需要与某个 Agent 进行多轮深入讨论。

---

#### `/back`

从 `/chat` 模式返回 Manager 编排模式。

```bash
/back
```

---

### 团队信息命令

#### `/team` / `/agents`

列出所有 Agent，按领域分组显示。

```bash
# 全部列出
/team

# 按领域筛选
/team --domain quality-gates
/team --domain delivery-engineering

# 支持的 domain 值
direction-coordination  # 方向与协调
experience-architecture # 体验与架构
delivery-engineering    # 交付工程
quality-gates           # 质量门禁
delivery-operations     # 交付、运维与知识
```

---

#### `/agent`

查看某个 Agent 的详细信息。

```bash
/agent backend-developer
/agent security-architect
/agent bd  # 使用别名
```

---

### 别名配置命令

#### `/alias`

为 Agent 注册短别名。

```bash
/alias bd backend-developer
/alias fe frontend-developer
/alias sa security-architect
```

#### `/unalias`

删除别名。

```bash
/unalias bd
```

#### `/aliases`

列出所有已注册的别名。

```bash
/aliases
```

---

### 系统命令

#### `/team-config`

查看团队配置信息。

```bash
/team-config
```

输出包含：已加载 Agent 数量、当前模式、当前阶段、已配置别名数。

---

## 🛠️ 自定义工具（LLM 可调用）

这些工具会出现在 pi 的系统提示中，LLM 可以在对话中直接调用。

| 工具名 | 用途 |
|--------|------|
| `delegate_task` | 将任务委派给指定 Agent |
| `get_team_info` | 查询 Agent 角色、职责、团队结构 |
| `get_phase_status` | 查询当前阶段进度和门禁状态 |
| `advance_phase` | 推进到下一阶段（门禁检查后） |
| `pass_gate` | 标记门禁条件为已通过并附证据 |
| `suggest_agents` | 根据任务类型推荐应参与的 Agent |

---

## 🧪 使用示例

### 示例 1：完整项目交付流程

```bash
# 1. 创建计划
/plan 开发一个用户反馈系统，用户可以提交反馈，管理员可以查看和管理

# 2. 查看计划详情
/plan

# 3. 批准计划
/plan approve

# 4. 查看当前阶段（需求进入）
/phase

# 5. 需求阶段完成后，标记门禁通过
/gate-pass 1 需求目标已与产品经理确认
/gate-pass 2 业务规则已文档化
/gate-pass 3 验收标准已定义
/gate-pass 4 范围边界已明确

# 6. 推进到下一阶段
/advance

# 7. 在 Manager 模式下临时咨询安全专家
/ask security-architect 用户反馈系统需要存储用户邮箱，有什么安全注意事项？

# 8. 在 Manager 模式下临时委派任务
/call backend-developer 实现用户反馈的 CRUD 接口

# 9. 多 Agent 协作：指定多个 Agent 让 Manager 协调
/task backend-developer,database-engineer,integration-engineer 实现用户反馈的数据库设计、后端接口和第三方通知集成

# 10. 持续推进...
/status   # 随时查看总体进度
```

### 示例 2：专注后端开发

```bash
# 切换到 Backend Developer 模式
/use backend-developer

# 在此模式下所有对话都以后端开发者身份进行
# "帮我实现用户注册接口，使用 Spring Boot 3.x"

# 完成后切回 Manager 模式
/use manager
```

### 示例 3：快速咨询

```bash
# 在 Manager 工作流中临时咨询
/ask data-architect 反馈表的读写比例大约是10:1，应该怎么设计索引？
# 咨询完后自动回到 Manager 模式
```

### 示例 4：多 Agent 协作（用户指定团队）

```bash
# 用户显式指定需要哪些 Agent，Manager 负责协调
/task backend-developer,database-engineer,integration-engineer 实现用户反馈的完整后端功能

# Manager 输出协作计划 
# → Backend Developer: 实现接口
# → Database Engineer: 设计表结构
# → Integration Engineer: 对接通知服务

# 查看当前模式确认
/whoami
# 输出: Mode: 多 Agent 协作模式 👥
#       Coordinating: backend-developer, database-engineer, integration-engineer

# 协作完成后自动返回 Manager 模式
```

### 示例 5：使用别名提高效率

```bash
# 注册常用别名
/alias bd backend-developer
/alias sa security-architect
/alias qa qa-engineer

# 使用别名
/call bd 修改用户状态接口
/ask sa review-security
/use qa
```

---

## 🏢 10 阶段软件工程流程

| 阶段 | 名称 | 关键参与 Agent |
|------|------|---------------|
| 1 | 需求进入 | PM, BA, UX Designer, Project Manager |
| 2 | 可行性与方案 | Solution/Tech/Security/Data Architect, DevOps, Performance |
| 3 | 架构与设计 | Solution/Tech/Backend/Frontend/Data/Security Architect, API Governance |
| 4 | 计划与任务拆解 | Manager, Project/Product Manager, QA, Release, Tech Writer |
| 5 | 开发实现 | Backend/Frontend Developer, Database/Integration Engineer, Config Manager |
| 6 | 代码评审与工程质量 | Code Reviewer, Security/Performance Engineer, Test Automation |
| 7 | QA 与验收 | QA, Test Automation, PM, BA, UX Designer |
| 8 | 发布准备 | Release/DevOps Engineer, Config/Database Manager, SRE, Ops, Tech Writer |
| 9 | 上线与生产验证 | Release/DevOps/Ops/SRE/Observability Engineer, PM, BA |
| 10 | 运维、复盘与知识沉淀 | SRE/Ops/Observability/Security Engineer, Tech Writer, PM, Manager |

---

## ⚙️ 冲突解决规则

当 Agent 之间出现意见冲突时，按以下规则处理：

| 冲突类型 | 决策者 | 说明 |
|----------|--------|------|
| 产品范围 | Product Manager | 决策并记录影响 |
| 技术方案 | Solution/Technical Architect | 主持取舍分析，相关 Architect 提供证据 |
| 安全 | Security Architect | 对架构安全要求有否决权 |
| 数据 | Data Architect | 对数据模型和一致性策略有主导权 |
| 发布 | Release Engineer | 对发布准入负责 |
| 质量 | QA Engineer | 对验收测试结论负责 |

---

## 💡 最佳实践

### 1. 默认使用 Manager 模式

新会话默认处于 Manager 编排模式，让 Manager 处理任务分解和 Agent 选派。**不要一上来就用 `/use` 切到某个 Agent**——让 Manager 先做全局规划。

### 2. 先 `/plan` 再执行

对于稍复杂的任务，先 `/plan` 生成计划，浏览后 `/plan approve` 批准，让 Manager 按阶段推进。

### 3. 用 `/ask` 代替 `/call` 做咨询

如果需要快速意见而不是完整产出，使用 `/ask`。它更轻量，不会记录 Agent 为 "working" 状态。

### 4. 用 `/call` 做临时委派

在 Manager 工作流中遇到需要专业 Agent 处理的子任务，用 `/call` 临时委派，完成后自动返回，不影响主线流程。

### 5. 用 `/use` + `/back` 做深度协作

需要与某个 Agent 长时间协作时先 `/use` 切换，完成后 `/use manager` 返回。需要多轮讨论时用 `/chat`。

### 6. 注册常用别名

```bash
/alias bd backend-developer
/alias sa security-architect
/alias qa qa-engineer
/alias cr code-reviewer
```

### 7. 合理使用门禁

不要为了赶进度跳过门禁检查。`/gate-pass` 时需要附上证据，这些证据会成为后续阶段的决策依据。

### 8. 定期 `/status`

养成定期检查 `/status` 的习惯，及时发现阻塞点和进度偏差。

---

## ❓ 常见问题

**Q: 为什么我的 Agent 没反应？**

A: 确认 `agents/` 目录存在且包含正确的 `AGENT.md` 文件。启动时应有 `🏢 Team: 28 agents` 的状态提示。

**Q: 如何临时退出单 Agent 模式？**

A: 使用 `/use manager` 返回 Manager 模式，或 `/back` 返回上一模式。

**Q: 别名丢失了？**

A: 别名会持久化在会话中，但 `/new` 后需要重新注册。考虑将常用别名加入个人配置。

**Q: 如何自定义阶段流程？**

A: 当前阶段定义硬编码在 `state.ts` 中。未来版本将支持通过配置文件自定义。

**Q: 支持非 Java 项目吗？**

A: Agent 的技术栈定义聚焦 Java 生态，但框架本身与语言无关。修改 AGENT.md 的技术栈部分即可适配其他语言。

---

## 🔧 技术细节

- **扩展框架**：pi coding agent Extension API
- **状态持久化**：`pi.appendEntry()` custom entry type `agent-team-state`
- **Agent 发现**：启动时扫描包内 `agents/*/AGENT.md`，路径通过 `import.meta.url` 相对于模块文件解析，确保 npm/git/本地安装均正确工作
- **上下文注入**：通过 `before_agent_start` 事件向 system prompt 追加 Agent 角色上下文
- **自动返回**：通过 `agent_settled` 事件检测 `/call`、`/ask`、`/task` 完成并切换模式
- **包入口**：pi 通过 `package.json` → `pi.extensions: ["./extensions"]` 自动发现

### 包文件结构

```
agent-team-java/                  ← npm 包根目录
├── package.json                  ← pi.extensions: ["./extensions"]
├── extensions/
│   ├── index.ts           # 主入口：事件绑定、初始化、命令/工具注册
│   ├── types.ts           # 类型定义
│   ├── agent-registry.ts  # Agent 发现、AGENT.md 解析、领域分类
│   ├── state.ts           # 会话状态管理、10 阶段定义和门禁
│   ├── commands.ts        # 所有 23 个 slash 命令
│   └── tools.ts           # 6 个 LLM 可调用工具
├── agents/                       # 28+1 个 AGENT.md（打包在包内）
│   ├── manager/AGENT.md
│   ├── backend-developer/AGENT.md
│   └── ...
├── README.md
└── DOCUMENTATION.md
```

---

> **提示**：本文档的 Agent 团队规模和阶段流程基于 `agents/` 目录中的实际 AGENT.md 定义。如果你修改了 AGENT.md 内容或增减了 Agent，扩展会自动适配（Agent 发现是动态的）。

## License

MIT
