import type { AISettings } from '../db/types';
import type { Payload } from '../db/repo';
import { dayKeyOf } from './date';

/* ============================================================
   内置 AI 整理
   原则：AI 只负责"读懂并提议"，写不写由人决定。
   密钥存在本机浏览器，直接向服务商发起请求，不经过任何中间服务器。
   ============================================================ */

export interface ProposedNote {
  title: string;
  body: string;
  category: string;
  tags: string[];
  source_capture_ids: string[];
  source_journal_dates: string[];
  related_titles: string[];
}

export interface ConsolidationResult {
  summary: string;
  notes: ProposedNote[];
  unused_capture_ids: string[];
}

export const AI_PRESETS: { label: string; baseUrl: string; model: string }[] = [
  { label: 'MiniMax', baseUrl: 'https://api.minimax.chat/v1', model: 'MiniMax-M2' },
  { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { label: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  { label: '硅基流动', baseUrl: 'https://api.siliconflow.cn/v1', model: 'Qwen/Qwen2.5-7B-Instruct' },
  { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { label: '本地 Ollama', baseUrl: 'http://localhost:11434/v1', model: 'llama3' },
];

function endpoint(baseUrl: string): string {
  const b = baseUrl.trim().replace(/\/+$/, '');
  return b.endsWith('/chat/completions') ? b : `${b}/chat/completions`;
}

export async function testConnection(ai: AISettings): Promise<string> {
  if (!ai.apiKey.trim()) throw new Error('还没有填 API Key');
  if (!ai.baseUrl.trim()) throw new Error('还没有填接口地址');
  const out = await chat(
    ai,
    '你是连接测试助手。',
    '只回复两个字：可以',
    0,
  );
  return out.trim() || '连接成功';
}

async function chat(
  ai: AISettings,
  system: string,
  user: string,
  temperature = 0.3,
): Promise<string> {
  const res = await fetch(endpoint(ai.baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ai.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: ai.model.trim() || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature,
      stream: false,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`接口返回 ${res.status}${body ? `：${body.slice(0, 200)}` : ''}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('接口没有返回内容');
  return content;
}

/** 宽容地从一个可能夹带前后缀的回复里抠出 JSON */
export function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const text = (fenced ? fenced[1] : raw).trim();
  try {
    return JSON.parse(text);
  } catch {
    /* 继续尝试 */
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      /* 落到这里说明确实不是 JSON */
    }
  }
  throw new Error('模型返回的内容不是合法 JSON');
}

const SYSTEM = `你是一位私人记录助理，帮主人把零散的想法整理成可长期复用的笔记。

铁律：
1. 只做"提议"，不要替主人下结论。所有内容用主人的话和他的逻辑来写，不要引入外部知识。
2. 笔记标题必须是一句完整的、能独立成立的陈述句（不是"# AI视频"这种词条式短语）。
3. 只提炼真正值得长期保留的想法。琐碎、重复、一次性的念头放进 unused_capture_ids，不要硬凑。
4. 同一件事如果主人以前记过，要指明是"补充"还是"修正"，并填 related_titles。
5. 只使用给定的分类，没有合适的新分类时归到最接近的一个。
6. 正文用简洁的中文，条目式，不要客套开场白。

严格输出 JSON，不要 markdown 代码块以外的任何解释文字。格式：
{
  "summary": "一句话说明你这周读出了什么",
  "notes": [
    {
      "title": "完整句式的标题",
      "body": "正文，可以用 - 开头分条",
      "category": "AI/概念",
      "tags": ["标签1","标签2"],
      "source_capture_ids": ["c_xxx"],
      "source_journal_dates": ["2026-10-18"],
      "related_titles": ["已有笔记的标题"]
    }
  ],
  "unused_capture_ids": ["c_xxx"]
}`;

export async function suggestConsolidation(
  ai: AISettings,
  payload: Payload,
  scope: 'week' | 'all' = 'week',
): Promise<ConsolidationResult> {
  if (!ai.apiKey.trim()) throw new Error('还没有填 API Key —— 去设置里配置');

  const { captures, journals, notes } = pickScope(payload, scope);

  const capText = captures
    .map((c) => `[${c.id}] ${c.text}`)
    .join('\n');
  const jrnText = journals
    .map((j) => {
      const s = j.sections;
      const bits = [
        s.keyFinding && `最重要的发现：${s.keyFinding}`,
        s.learned && `学到：${s.learned}`,
        s.problems && `问题：${s.problems}`,
        s.tomorrow && `明天要做：${s.tomorrow}`,
        (s.done ?? []).length && `完成：${(s.done ?? []).join('；')}`,
      ].filter(Boolean);
      return bits.length ? `【${j.date}】\n${bits.join('\n')}` : '';
    })
    .filter(Boolean)
    .join('\n\n');
  const noteText = notes.length
    ? notes.map((n) => `- ${n.title}（${n.category}）`).join('\n')
    : '（暂无已有笔记）';

  const user = `下面是这个记录系统的数据。

## 速记（${captures.length} 条）
${capText || '（无）'}

## 日志摘要（${journals.length} 天）
${jrnText || '（无）'}

## 已有笔记（${notes.length} 条）
${noteText}

请据此提出整理建议。`;

  const raw = await chat(ai, SYSTEM, user, 0.4);
  const parsed = extractJson(raw) as Partial<ConsolidationResult>;

  const known = new Set(captures.map((c) => c.id));
  const result: ConsolidationResult = {
    summary: String(parsed.summary ?? '').trim(),
    notes: Array.isArray(parsed.notes)
      ? parsed.notes
          .filter((n) => n && n.title && String(n.title).trim())
          .map((n) => ({
            title: String(n.title).trim(),
            body: String(n.body ?? '').trim(),
            category: String(n.category ?? '').trim(),
            tags: Array.isArray(n.tags) ? n.tags.map(String).filter(Boolean) : [],
            source_capture_ids: (n.source_capture_ids ?? []).filter((id) => known.has(id)),
            source_journal_dates: n.source_journal_dates ?? [],
            related_titles: n.related_titles ?? [],
          }))
      : [],
    unused_capture_ids: (parsed.unused_capture_ids ?? []).filter((id) => known.has(id)),
  };

  // 至少让每条提议都挂上来源，方便溯源
  for (const n of result.notes) {
    if (!n.source_capture_ids.length && !n.source_journal_dates.length) {
      n.source_capture_ids = captures.slice(0, 1).map((c) => c.id);
    }
  }

  return result;
}

function pickScope(payload: Payload, scope: 'week' | 'all') {
  if (scope === 'all') {
    return {
      captures: payload.captures.slice(-300),
      journals: payload.journals.slice(-30),
      notes: payload.notes,
    };
  }
  const week = new Set(
    payload.captures
      .map((c) => dayKeyOf(c.createdAt))
      .slice(-14),
  );
  const start = payload.captures.length
    ? dayKeyOf(payload.captures[Math.max(0, payload.captures.length - 40)].createdAt)
    : '';
  const journals = payload.journals.filter((j) => !start || j.date >= start).slice(-7);
  return {
    captures: payload.captures.filter((c) => week.has(dayKeyOf(c.createdAt))).slice(-200),
    journals,
    notes: payload.notes,
  };
}
