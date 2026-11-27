import { useState } from 'react';
import { PageHeader, Card, CardTitle, Loader, EmptyState, ErrorMsg } from '../components/UI';
import { insightAPI } from '../services/api';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp';
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Code2, Copy, Check } from 'lucide-react';

// Light build: only bundle the languages the picker offers (full Prism added ~1 MB)
Object.entries({ javascript, python, java, cpp, go }).forEach(([n, l]) => SyntaxHighlighter.registerLanguage(n, l));

const LANGUAGES = [
  ['javascript', 'JavaScript'],
  ['python', 'Python'],
  ['java', 'Java'],
  ['cpp', 'C++'],
  ['go', 'Go'],
];

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

  return (
    <div>
      <PageHeader title="Code assistant" subtitle="Paste a snippet and Gemini suggests a cleaner version, with reasons." />

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Card className="rounded-xl p-6">
          <div className="mb-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Language">
            {LANGUAGES.map(([id, name]) => (
              <button
                key={id}
                role="radio"
                aria-checked={language === id}
                onClick={() => setLanguage(id)}
                className={`btn px-3 py-2 ${language === id ? 'bg-plum text-white' : 'bg-white text-plum hover:bg-sand'}`}
              >
                {name}
              </button>
            ))}
          </div>
          <label htmlFor="code" className="sr-only">Code</label>
          <textarea
            id="code"
            className="input h-[420px] resize-y font-mono text-sm"
            placeholder="// Paste your code here…"
            spellCheck={false}
            maxLength={20000}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button onClick={refactor} disabled={loading || !code.trim()} className="btn-primary mt-4 w-full py-3 text-base">
            {loading ? 'Working on it…' : 'Improve this code'}
          </button>
          {error && <div className="mt-4"><ErrorMsg message={error} /></div>}
        </Card>

        <Card className="min-h-[300px] rounded-xl p-6">
          <CardTitle
            title="Result"
            action={result && (
              <button onClick={copy} className="btn-secondary px-3 py-2">
                {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          />
          {loading ? <Loader label="Gemini is reviewing your code…" /> : result ? (
            <div className="space-y-3 text-sm leading-relaxed">
              {result.split('```').map((block, i) => {
                if (i % 2 === 0) return block.trim() && <div key={i} className="whitespace-pre-wrap">{block.trim()}</div>;
                const nl = block.indexOf('\n');
                const lang = block.slice(0, nl).trim() || language;
                return (
                  <div key={i} className="overflow-hidden rounded-sm bg-char">
                    <div className="px-4 pt-3 text-xs font-semibold text-silver">{lang}</div>
                    <SyntaxHighlighter
                      language={lang}
                      style={vscDarkPlus}
                      customStyle={{ margin: 0, padding: '12px 16px 16px', background: 'transparent', fontSize: '13px' }}
                    >
                      {block.slice(nl).trim()}
                    </SyntaxHighlighter>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={<Code2 size={22} />} title="Nothing yet" subtitle="Your improved code and the reasoning behind it will appear here." />
          )}
        </Card>
      </div>
    </div>
  );
}
