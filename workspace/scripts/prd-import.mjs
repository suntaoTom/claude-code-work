#!/usr/bin/env node
// 把非 markdown 格式的需求文档转成 markdown, 作为 /prd 的输入素材。
// 用法: pnpm prd:import <输入文件路径>
// 输出: docs/prds/_imports/<原文件名>-<YYYY-MM-DD>.md
// 详细说明见 .claude/skills/prd-import/SKILL.md

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { basename, extname, resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../..');
const OUTPUT_DIR = join(REPO_ROOT, 'docs/prds/_imports');

const SUPPORTED_BINARY = ['.docx', '.xlsx', '.pptx'];
const SUPPORTED_TEXT = ['.md', '.txt'];
const SUPPORTED_ALL = [...SUPPORTED_BINARY, ...SUPPORTED_TEXT];
const REDIRECT_NATIVE = ['.pdf', '.png', '.jpg', '.jpeg'];

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function now() {
  const d = new Date();
  return `${today()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fail(msg) {
  console.error(`[prd-import] ${msg}`);
  process.exit(1);
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function resolveOutputPath(inputPath) {
  const base = basename(inputPath, extname(inputPath));
  const date = today();
  let candidate = join(OUTPUT_DIR, `${base}-${date}.md`);
  let i = 2;
  while (existsSync(candidate)) {
    candidate = join(OUTPUT_DIR, `${base}-${date}-${i}.md`);
    i += 1;
  }
  return candidate;
}

function buildHeader({ inputPath, ext, extra }) {
  const size = statSync(inputPath).size;
  const sizeKb = (size / 1024).toFixed(1);
  return [
    '<!--',
    `  生成: ${now()}`,
    `  源文件: ${inputPath}`,
    `  格式: ${ext.slice(1)} (${extra ?? 'native'})`,
    `  大小: ${sizeKb} KB`,
    '-->',
    '',
  ].join('\n');
}

async function convertDocx(inputPath) {
  let mammoth;
  try {
    mammoth = (await import('mammoth')).default;
  } catch {
    fail(
      'mammoth 未安装。请先跑:\n  cd workspace && pnpm install\n(首次使用需要装依赖, 后续不用重复)',
    );
  }
  const result = await mammoth.convertToMarkdown({ path: inputPath });
  if (result.messages.length > 0) {
    for (const m of result.messages) {
      if (m.type === 'warning') console.warn(`[mammoth warn] ${m.message}`);
    }
  }
  return { content: result.value, extra: 'mammoth' };
}

async function convertXlsx(inputPath) {
  let xlsx;
  try {
    xlsx = await import('xlsx');
  } catch {
    fail(
      'xlsx 未安装。请先跑:\n  cd workspace && pnpm install\n(首次使用需要装依赖, 后续不用重复)',
    );
  }
  const wb = xlsx.readFile(inputPath, { cellDates: true });
  const parts = [];
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
    if (rows.length === 0) continue;
    parts.push(`## ${name}\n`);
    const maxCol = Math.max(...rows.map((r) => r.length));
    const normalize = (row) => {
      const cells = [];
      for (let i = 0; i < maxCol; i += 1) {
        const v = row[i] ?? '';
        cells.push(String(v).replace(/\n/g, ' ').replace(/\|/g, '\\|').trim());
      }
      return cells;
    };
    const header = normalize(rows[0]);
    const body = rows.slice(1).map(normalize);
    parts.push(`| ${header.join(' | ')} |`);
    parts.push(`| ${header.map(() => '---').join(' | ')} |`);
    for (const row of body) {
      if (row.every((c) => c === '')) continue;
      parts.push(`| ${row.join(' | ')} |`);
    }
    parts.push('');
  }
  return { content: parts.join('\n'), extra: 'sheetjs/xlsx' };
}

async function convertPptx(inputPath) {
  let tmp;
  try {
    tmp = execSync(`unzip -p "${inputPath}" "ppt/slides/slide*.xml" 2>/dev/null || true`, {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch (err) {
    fail(`pptx 解压失败 (需要系统装 unzip): ${err.message}`);
  }
  if (!tmp) {
    return {
      content:
        '> 无法提取幻灯片文本, 可能源文件损坏或不是标准 PPTX。\n> 建议让产品另存为 .docx 或手动复制文本。\n',
      extra: 'unzip + regex',
    };
  }
  const slides = tmp
    .split(/<\?xml\s+version/gi)
    .filter((s) => s.includes('<p:sld'))
    .map((s) => '<?xml version' + s);
  const parts = [];
  slides.forEach((xml, idx) => {
    const texts = [];
    const re = /<a:t[^>]*>([^<]*)<\/a:t>/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
      const t = m[1].trim();
      if (t) texts.push(t);
    }
    if (texts.length > 0) {
      parts.push(`## Slide ${idx + 1}\n`);
      parts.push(texts.join('\n'));
      parts.push('');
    }
  });
  return {
    content: parts.join('\n') || '> 未提取到文本 (可能全是图片幻灯片)\n',
    extra: 'unzip + regex',
  };
}

async function convertText(inputPath, ext) {
  const content = readFileSync(inputPath, 'utf8');
  return { content, extra: `passthrough ${ext}` };
}

async function main() {
  const inputArg = process.argv[2];
  if (!inputArg) {
    console.log('用法: pnpm prd:import <输入文件路径>');
    console.log(`支持: ${SUPPORTED_ALL.join(' / ')}`);
    console.log('示例: pnpm prd:import ../requirements/登录需求.docx');
    process.exit(0);
  }
  const inputPath = resolve(process.cwd(), inputArg);
  if (!existsSync(inputPath)) fail(`文件不存在: ${inputPath}`);
  const ext = extname(inputPath).toLowerCase();

  if (REDIRECT_NATIVE.includes(ext)) {
    console.log(
      `[prd-import] ${ext} 走 Claude Code 原生 Read 工具, 不经本 skill。\n直接跑: /prd @${inputArg}`,
    );
    process.exit(0);
  }
  if (ext === '.doc' || ext === '.xls' || ext === '.ppt') {
    fail(`${ext} (老版 Office 格式) 不支持。请用 Office/WPS 另存为 ${ext}x 后重试。`);
  }
  if (!SUPPORTED_ALL.includes(ext)) {
    fail(`不支持的格式: ${ext}。支持: ${SUPPORTED_ALL.join(' / ')}`);
  }

  ensureDir(OUTPUT_DIR);

  let result;
  switch (ext) {
    case '.docx':
      result = await convertDocx(inputPath);
      break;
    case '.xlsx':
      result = await convertXlsx(inputPath);
      break;
    case '.pptx':
      result = await convertPptx(inputPath);
      break;
    default:
      result = await convertText(inputPath, ext);
  }

  const header = buildHeader({ inputPath, ext, extra: result.extra });
  const outputPath = resolveOutputPath(inputPath);
  const body = (result.content || '').trim() + '\n';
  writeFileSync(outputPath, header + '\n' + body, 'utf8');

  const lineCount = body.split('\n').length;
  const charCount = body.length;
  const relOut = outputPath.replace(REPO_ROOT + '/', '');
  console.log(`✅ 转换完成`);
  console.log(`  源文件:   ${inputPath}`);
  console.log(`  产物:     ${relOut}`);
  console.log(`  统计:     ${lineCount} 行, ${charCount} 字符`);
  console.log('');
  console.log('下一步:');
  console.log(`  /prd @${relOut}`);
}

main().catch((err) => {
  console.error('[prd-import] 转换失败:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
