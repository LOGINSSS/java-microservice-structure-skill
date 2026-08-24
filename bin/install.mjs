#!/usr/bin/env node
/**
 * java-microservice-structure-skill 安装脚本
 *
 * 把本 npm 包内的 skill（skills/java-microservice-structure/SKILL.md）
 * 安装到指定 DSH skill 根目录：
 *   - 默认（--project）：当前项目（最近含 .git 的祖先）的 .dsh/skills/，项目级，仅该项目生效
 *   - --user：DSH 用户目录（$DSH_HOME 或 ~/.dsh）的 skills/，全局生效，任何项目可用
 *
 * 无第三方依赖，仅用 Node 内置模块，npx 可直接运行。
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
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

const args = process.argv.slice(2);
const toUser = args.includes('--user') || args.includes('-u');
const toProject = args.includes('--project') || args.includes('-p');
const help = args.includes('--help') || args.includes('-h');

if (help) {
  console.log(`java-microservice-structure-skill — DSH skill 安装器

用法:
  jmss-install            安装到当前项目（最近 .git 祖先）的 .dsh/skills/（项目级）
  jmss-install --user     安装到 DSH 用户目录 skills/（全局，推荐：任意项目可用）
  jmss-install --project  显式安装到当前项目（等价于默认）
  jmss-install --help     显示本帮助

说明:
  - 用户目录 = $DSH_HOME 或 ~/.dsh（Windows: %USERPROFILE%\\.dsh）
  - 安装会覆盖目标位置的同名 skill 目录（幂等）
`);
  process.exit(0);
}

if (!existsSync(SKILL_SRC)) {
  console.error(`✖ 找不到 skill 源目录: ${SKILL_SRC}（包内 files 是否包含 skills/？）`);
  process.exit(1);
}

const targetRoot = toUser
  ? join(dshHome(), 'skills')
  : join(projectRoot(), '.dsh', 'skills');

const dest = join(targetRoot, SKILL_NAME);
if (existsSync(dest)) {
  rmSync(dest, { recursive: true, force: true });
}
mkdirSync(dest, { recursive: true });
cpSync(join(SKILL_SRC, 'SKILL.md'), join(dest, 'SKILL.md'));

console.log(`✔ skill 已安装: ${dest}`);
console.log(`  类型: ${toUser ? '用户级（全局生效）' : '项目级（当前项目生效）'}`);
console.log('  DSH 会自动发现该 skill（无需重启；frontmatter 变更触发目录刷新）');
