#!/usr/bin/env node
/**
 * java-microservice-structure-skill 安装脚本（多工具支持）
 *
 * 把本 npm 包内的 skill bundle（skills/java-microservice-structure/）
 * 安装到各 AI 编码工具的 skills 目录，或生成通用 AGENTS.md 指引。
 *
 * 支持的 --target（可多次指定，或逗号分隔，默认 dsh）：
 *   dsh      DSH（DeepSeek Harness）        ~/.dsh/skills 或 <project>/.dsh/skills
 *   claude   Claude Code                     ~/.claude/skills 或 <project>/.claude/skills
 *   opencode OpenCode                        ~/.config/opencode/skills 或 <project>/.opencode/skills
 *   cursor   Cursor                          ~/.cursor/skills 或 <project>/.cursor/skills
 *   agents   在项目根生成 AGENTS.md 指引（OpenCode/Codex/Cursor/Claude Code 均支持 AGENTS.md）
 *   all      以上全部
 *
 * 级别：
 *   --user    安装到用户目录（全局，默认）
 *   --project 安装到当前项目（最近含 .git 的祖先）
 *
 * 无第三方依赖，仅用 Node 内置模块，npx 可直接运行。
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const SKILL_NAME = 'java-microservice-structure';
const here = dirname(fileURLToPath(import.meta.url));
const SKILL_SRC = join(here, '..', 'skills', SKILL_NAME);

function dshHome() {
  return process.env.DSH_HOME || join(os.homedir(), '.dsh');
}

/** 最近含 .git 的祖先目录；不存在则回退到当前 cwd */
function projectRoot() {
  let dir = process.cwd();
  for (;;) {
    if (existsSync(join(dir, '.git'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
}

/** 各工具的 skills 根目录（user 级别） */
function userSkillRoots() {
  const home = os.homedir();
  return {
    dsh: join(dshHome(), 'skills'),
    claude: join(home, '.claude', 'skills'),
    opencode: join(home, '.config', 'opencode', 'skills'),
    cursor: join(home, '.cursor', 'skills'),
  };
}

/** 各工具的 skills 根目录（project 级别） */
function projectSkillRoots(proj) {
  return {
    dsh: join(proj, '.dsh', 'skills'),
    claude: join(proj, '.claude', 'skills'),
    opencode: join(proj, '.opencode', 'skills'),
    cursor: join(proj, '.cursor', 'skills'),
  };
}

const args = process.argv.slice(2);
const help = args.includes('--help') || args.includes('-h');
const toProject = args.includes('--project') || args.includes('-p');

/** 解析 --target 值：--target=xx / --target xx / --t xx */
function parseTargets(argv) {
  const list = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    let val = null;
    if (a.startsWith('--target=')) val = a.slice('--target='.length);
    else if ((a === '--target' || a === '-t') && i + 1 < argv.length) val = argv[++i];
    if (val) list.push(...val.split(',').map((s) => s.trim()).filter(Boolean));
  }
  return list.length ? list : ['dsh'];
}

const targets = parseTargets(args);
const wantAll = targets.includes('all') || targets.includes('--all');
const wantAgents = targets.includes('agents');
const want = wantAll ? ['dsh', 'claude', 'opencode', 'cursor'] : targets.filter((t) => t !== 'agents' && t !== 'all');
const validTargets = ['dsh', 'claude', 'opencode', 'cursor', 'agents', 'all'];

if (help) {
  console.log(`java-microservice-structure-skill — 跨工具 skill 安装器

用法:
  jmss-install [--target <dsh|claude|opencode|cursor|agents|all>] [--user|--project]

示例:
  jmss-install                          # DSH 用户目录（默认）
  jmss-install --user                   # 同上（显式）
  jmss-install --target claude          # 安装到 Claude Code 用户 skills
  jmss-install --target claude --project# 安装到当前项目 .claude/skills
  jmss-install --target dsh,claude      # 多目标
  jmss-install --target all --project   # 全部工具 + 项目级
  jmss-install --target agents --project# 仅生成项目根 AGENTS.md 指引
  jmss-install --help                   # 本帮助

目标说明:
  dsh      ~/.dsh/skills 或 <project>/.dsh/skills
  claude   ~/.claude/skills 或 <project>/.claude/skills
  opencode ~/.config/opencode/skills 或 <project>/.opencode/skills
  cursor   ~/.cursor/skills 或 <project>/.cursor/skills
  agents   项目根生成 AGENTS.md（OpenCode/Codex/Cursor/Claude Code 通用）
  all      以上全部

说明:
  - 默认用户级；安装覆盖同名 skill 目录（幂等）
  - skill 是纯 Markdown bundle，各工具均按「SKILL.md + frontmatter(name/description)」约定发现
`);
  process.exit(0);
}

const bad = targets.filter((t) => !validTargets.includes(t));
if (bad.length) {
  console.error(`✖ 未知目标: ${bad.join(', ')}（可选: ${validTargets.join(' | ')}）`);
  process.exit(1);
}

if (!existsSync(SKILL_SRC)) {
  console.error(`✖ 找不到 skill 源目录: ${SKILL_SRC}（包内 files 是否包含 skills/？）`);
  process.exit(1);
}

const proj = projectRoot();
const roots = toProject ? projectSkillRoots(proj) : userSkillRoots();
const installed = [];

function installTo(root) {
  const dest = join(root, SKILL_NAME);
  if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  cpSync(SKILL_SRC, dest, { recursive: true });
  installed.push(dest);
  console.log(`✔ ${dest}`);
}

for (const t of want) installTo(roots[t]);

// 生成 AGENTS.md（通用适配层：OpenCode / Codex / Cursor / Claude Code 等）
if (wantAgents || wantAll) {
  const agentsPath = join(proj, 'AGENTS.md');
  const entries = [];
  for (const dest of installed) {
    entries.push(`- \`${dest.replaceAll('\\', '/')}/SKILL.md\``);
  }
  const body = `# Java 微服务模块设计指引

本仓库已安装 **java-microservice-structure** 技能包（通用 Java 微服务模块设计范式）。

技能包入口（SKILL.md + references/ bundle）位于：

${entries.join('\n')}

设计/修改微服务模块时，请按以下流程执行：

1. 读取技能包入口 SKILL.md，按其「如何使用」分派表选读 \`references/\` 对应文件；
2. 设计新模块：按 \`references/05-design-workflow.md\` 的八步 CoT 思维链执行（职责边界 → 模块形态 → 数据模型 → 接口 → 服务层 → 跨服务协作 → pom 依赖 → 配置资源）；
3. 完成后必须按 \`references/06-quality-checklist.md\` 逐项自检：链路追踪逻辑正确性、工具实用性、健壮性/幂等、安全、依赖配置。

补充资料：\`references/02-pom-guide.md\`（依赖矩阵）、\`references/03-common-toolkits.md\`（工具选型）、\`references/04-service-contract.md\`（Feign/MQ/锁/任务）。
`;
  writeFileSync(agentsPath, body, 'utf8');
  console.log(`✔ ${agentsPath}（AGENTS.md 已生成/更新）`);
}

if (!installed.length && !wantAgents) {
  console.error('✖ 未安装任何目标');
  process.exit(1);
}

console.log(`\n完成。共 ${installed.length} 处 skill + ${wantAgents || wantAll ? 'AGENTS.md' : '无 AGENTS.md'}。`);
console.log('工具会自动发现 skill（无需重启；frontmatter 变更触发目录刷新）。');
