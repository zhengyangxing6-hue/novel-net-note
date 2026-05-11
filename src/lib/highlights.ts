import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

const CONTENT_ROOT = path.resolve(process.cwd(), 'content/novels');

export interface HighlightData {
  categories: Record<string, { color: string; style: 'bg' | 'underline' | 'italic' }>;
  terms: Record<string, string>;  // term → category name
}

const DEFAULT_CATEGORIES: HighlightData['categories'] = {
  '主角团': { color: '#DBEAFE', style: 'underline' },
  '反派': { color: '#FEE2E2', style: 'bg' },
  '女巫': { color: '#FCE7F3', style: 'bg' },
  '概念': { color: '#FEF3C7', style: 'bg' },
  '法术': { color: '#E9D5FF', style: 'bg' },
  '地点': { color: '#CCFBF1', style: 'italic' },
};

const CATEGORY_COLORS: Record<string, string> = {
  '主角团': '#DBEAFE', '反派': '#FEE2E2', '女巫': '#FCE7F3',
  '概念': '#FEF3C7', '法术': '#E9D5FF', '地点': '#CCFBF1',
};

export function getHighlightsPath(slug: string): string {
  return path.join(CONTENT_ROOT, slug, 'highlights.json');
}

export function readHighlightsSync(slug: string): HighlightData {
  try {
    const raw = fs.readFileSync(getHighlightsPath(slug), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { categories: { ...DEFAULT_CATEGORIES }, terms: {} };
  }
}

export async function readHighlights(slug: string): Promise<HighlightData> {
  try {
    const raw = await fsp.readFile(getHighlightsPath(slug), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { categories: { ...DEFAULT_CATEGORIES }, terms: {} };
  }
}

export async function saveHighlights(slug: string, data: HighlightData): Promise<void> {
  await fsp.mkdir(path.dirname(getHighlightsPath(slug)), { recursive: true });
  await fsp.writeFile(getHighlightsPath(slug), JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 将高亮数据转换为 AI 提示词规则。
 */
export function highlightsToPromptRules(data: HighlightData): string {
  const lines: string[] = [];
  const grouped: Record<string, string[]> = {};

  for (const [term, cat] of Object.entries(data.terms)) {
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(term);
  }

  for (const [cat, terms] of Object.entries(grouped)) {
    const style = data.categories[cat]?.style || 'bg';
    const styleDesc = style === 'underline' ? '用下划线标记' : style === 'italic' ? '用斜体标记' : '用背景色标记';

    if (cat === '主角团' || cat === '反派') {
      lines.push(`- 人物识别：已知${cat}成员包括 ${terms.join('、')}。在分析时${styleDesc}，如有新增成员请记录。`);
    } else if (cat === '女巫') {
      lines.push(`- 女巫识别：已知女巫包括 ${terms.join('、')}。遇到关于女巫的描述时，判断角色是否为女巫并记录其能力。如有新女巫出现，在分析中注明。`);
    } else if (cat === '概念') {
      lines.push(`- 概念追踪：注意以下关键概念 ${terms.join('、')}。在分析时记录这些概念的出现和展开。`);
    } else if (cat === '地点') {
      lines.push(`- 地点标记：以下地点需要关注 ${terms.join('、')}。${styleDesc}，记录新场景。`);
    } else if (cat === '法术') {
      lines.push(`- 法术追踪：以下法术/技能需要追踪 ${terms.join('、')}。如有新法术出现，记录名称和效果。`);
    } else {
      lines.push(`- ${cat}：关注 ${terms.join('、')}。${styleDesc}。`);
    }
  }

  return lines.length > 0
    ? `\n\n## 额外分析规则（用户自定义）\n${lines.join('\n')}`
    : '';
}

/**
 * 分配新分类的颜色。
 */
export function getColorForCategory(existingCount: number): string {
  const palette = ['#FEF3C7', '#DBEAFE', '#D1FAE5', '#FCE7F3', '#E0E7FF',
    '#FEE2E2', '#CCFBF1', '#FED7AA', '#E9D5FF', '#D9F99D'];
  return palette[existingCount % palette.length];
}
