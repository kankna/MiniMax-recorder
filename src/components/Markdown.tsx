import { useEffect, useState } from 'react';

/** 渲染 Markdown，但绝不执行内嵌 HTML —— 内容来自本地，也可能来自导入文件 */
export function Markdown({ text, className = '' }: { text: string; className?: string }) {
  const [html, setHtml] = useState('');

  useEffect(() => {
    let alive = true;
    if (!text.trim()) {
      setHtml('');
      return;
    }
    import('marked').then(({ marked }) => {
      if (!alive) return;
      const renderer = new marked.Renderer();
      renderer.html = () => '';
      marked.setOptions({ gfm: true, breaks: true });
      try {
        setHtml(marked.parse(text) as string);
      } catch {
        setHtml(escapeHtml(text).replace(/\n/g, '<br />'));
      }
    });
    return () => {
      alive = false;
    };
  }, [text]);

  if (!html) return null;

  return (
    <div
      className={`prose-arc text-body text-ink ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
