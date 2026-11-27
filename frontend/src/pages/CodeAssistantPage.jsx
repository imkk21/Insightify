import { useState } from 'react';
import { PageHeader, Segmented, Loader, EmptyState, ErrorMsg } from '../components/UI';
import { insightAPI } from '../services/api';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp';
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Code2, Copy, Check, Sparkles, FileCode2 } from 'lucide-react';

// Light build: only bundle the languages the picker offers (full Prism added ~1 MB)
Object.entries({ javascript, python, java, cpp, go }).forEach(([n, l]) => SyntaxHighlighter.registerLanguage(n, l));

const LANGUAGES = [
  ['javascript', 'JavaScript'],
  ['python', 'Python'],
  ['java', 'Java'],
  ['cpp', 'C++'],
  ['go', 'Go'],
];
const EXT = { javascript: 'js', python: 'py', java: 'java', cpp: 'cpp', go: 'go' };

/** Editor-style panel: tab strip header + body. */
const Pane = ({ tab, actions, children, className = '' }) => (
  <section className={`flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow ${className}`}>
    <div className="flex h-10 items-center gap-2 border-b border-line bg-bg/60 pl-2 pr-2">
      <div className="flex h-full items-center gap-2 border-b border-accent px-2 font-mono text-xs text-fg">{tab}</div>
      <div className="ml-auto flex items-center gap-2">{actions}</div>
    </div>
    {children}
  </section>
);

export default function CodeAssistantPage() {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const refactor = async () => {
    if (!code.trim()) return;
    setLoading(true); setResult(null); setError('');
    try {
      const { data } = await insightAPI.refactor(code, language);
      setResult(data.content);
    } catch (e) {
      setError(e.response?.data?.error || 'Refactoring failed. Check that the Gemini API key is valid.');
    } finally { setLoading(false); }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = Math.max(1, code.split('\n').length);

  return (
    <div>
      <PageHeader eyebrow="Workspace" title="Code assistant" subtitle="Paste a snippet and Gemini suggests a cleaner version, with reasons." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="max-w-full overflow-x-auto no-scrollbar"><Segmented label="Language" options={LANGUAGES} value={language} onChange={setLanguage} /></div>
        <button onClick={refactor} disabled={loading || !code.trim()} className="btn-primary ml-auto">
          <Sparkles size={14} aria-hidden="true" /> {loading ? 'Working on it…' : 'Improve this code'}
        </button>
      </div>
      {error && <div className="mb-4"><ErrorMsg message={error} /></div>}

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Pane tab={<><FileCode2 size={13} className="text-subtle" aria-hidden="true" /> input.{EXT[language]}</>}
          actions={<span className="font-mono text-2xs text-subtle">{lines} line{lines === 1 ? '' : 's'} · {code.length.toLocaleString()}/20,000</span>}>
          <label htmlFor="code" className="sr-only">Code</label>
          <textarea
            id="code"
            className="h-[460px] w-full resize-y bg-transparent p-4 font-mono text-[13px] leading-6 text-fg placeholder:text-subtle focus:outline-none"
            placeholder="// Paste your code here…"
            spellCheck={false}
            maxLength={20000}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') refactor(); }}
          />
          <div className="border-t border-line px-4 py-2 text-2xs text-subtle"><span className="kbd">Ctrl</span> + <span className="kbd">Enter</span> to run</div>
        </Pane>

        <Pane className="min-h-[300px]"
          tab={<><Sparkles size={13} className="text-accent-hover" aria-hidden="true" /> suggestion.md</>}
          actions={result && (
            <button onClick={copy} className="btn-ghost btn-sm">
              {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
            </button>
          )}>
          <div className="p-4">
            {loading ? <Loader label="Gemini is reviewing your code…" /> : result ? (
              <div className="space-y-3 text-[13px] leading-6 text-muted">
                {result.split('```').map((block, i) => {
                  if (i % 2 === 0) return block.trim() && <div key={i} className="whitespace-pre-wrap">{block.trim()}</div>;
                  const nl = block.indexOf('\n');
                  const lang = block.slice(0, nl).trim() || language;
                  return (
                    <div key={i} className="overflow-hidden rounded-lg border border-line bg-bg">
                      <div className="border-b border-line px-4 py-1.5 font-mono text-2xs text-subtle">{lang}</div>
                      <SyntaxHighlighter
                        language={lang}
                        style={vscDarkPlus}
                        customStyle={{ margin: 0, padding: '12px 16px 16px', background: 'transparent', fontSize: '13px' }}
                        codeTagProps={{ style: { fontFamily: '"Geist Mono", ui-monospace, monospace' } }}
                      >
                        {block.slice(nl).trim()}
                      </SyntaxHighlighter>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={<Code2 size={20} />} title="Nothing yet" subtitle="Your improved code and the reasoning behind it will appear here." />
            )}
          </div>
        </Pane>
      </div>
    </div>
  );
}
