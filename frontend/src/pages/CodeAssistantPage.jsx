import { useState, useEffect } from 'react';
import { PageHeader, Card, CardHeader, CardBody, DotLoader } from '../components/UI';
import { insightAPI } from '../services/api';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Code2, Zap, Copy, RefreshCw, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LANGUAGES = [
  { id: 'javascript', name: 'JavaScript' },
  { id: 'python', name: 'Python' },
  { id: 'java', name: 'Java' },
  { id: 'cpp', name: 'C++' },
  { id: 'go', name: 'Go' },
];

export default function CodeAssistantPage() {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));

  // Listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const handleRefactor = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await insightAPI.refactor(code, language);
      setResult(data.content);
    } catch (err) {
      console.error('Refactor failed:', err);
      alert('AI Refactoring failed. Ensure your Gemini API Key is valid.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <PageHeader 
        title="AI Engineering Sandbox" 
        subtitle="Intelligent refactoring with Google Gemini 2.0 Flash." 
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Input Pane */}
        <Card className="h-full border-border shadow-xl bg-card backdrop-blur-3xl">
          <CardHeader title="Source Vector" subtitle="Input your raw code snippet" />
          <CardBody className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLanguage(l.id)}
                  className={`px-4 py-2 rounded-2xl text-[10px] uppercase font-mono tracking-widest border transition-all ${language === l.id ? 'bg-amber border-amber text-[#1a1714] font-black shadow-lg shadow-amber/20' : 'bg-background/50 border-border text-ink3 hover:border-ink3/40'}`}
                >
                  {l.name}
                </button>
              ))}
            </div>
            
            <div className="relative group">
              <textarea
                className="w-full h-[500px] bg-background/30 text-foreground font-mono text-sm p-6 rounded-[32px] border-2 border-border focus:border-amber outline-none transition-all resize-none shadow-inner"
                placeholder="// Paste your code here..."
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <div className="absolute top-4 right-4 text-[10px] font-mono text-ink3/40 select-none group-hover:opacity-100 opacity-0 transition-opacity uppercase tracking-widest">
                Input Buffer
              </div>
            </div>

            <button
              onClick={handleRefactor}
              disabled={loading || !code.trim()}
              className={`group w-full py-5 rounded-[28px] flex items-center justify-center gap-4 transition-all transform active:scale-95 text-base font-bold shadow-2xl ${loading ? 'bg-background border-border text-ink3 cursor-wait' : 'bg-amber text-[#1a1714] shadow-amber/30 hover:scale-105'}`}
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin text-amber" size={20} />
                  Analyzing Logic...
                </>
              ) : (
                <>
                  <Zap size={20} fill="currentColor" className="group-hover:animate-pulse" />
                  Request Optimization
                </>
              )}
            </button>
          </CardBody>
        </Card>

        {/* Output Pane */}
        <Card className="h-full border-border shadow-xl bg-gradient-to-br from-card to-background relative overflow-hidden group min-h-[650px] backdrop-blur-3xl">
          <CardHeader title="Refined Output" subtitle="AI optimized solution" />
          <CardBody className="h-full overflow-y-auto scrollbar-hide p-0">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center min-h-[500px] gap-6"
                >
                  <div className="relative w-24 h-24">
                    <motion.div
                      animate={{ rotate: 360, opacity: [0.1, 0.3, 0.1] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 bg-amber filter blur-[40px] rounded-full"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                       <Zap size={48} className="text-amber animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-syne font-black text-lg text-foreground mb-1">Neural Refactoring</div>
                    <div className="text-[10px] text-ink3/60 font-mono tracking-widest uppercase">Consulting Gemini Nodes</div>
                  </div>
                </motion.div>
              ) : result ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-8 space-y-6"
                >
                  <div className="flex justify-end">
                    <button 
                      onClick={() => copyToClipboard(result)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ink/5 dark:bg-white/10 hover:bg-ink/10 dark:hover:bg-white/20 transition-all text-[10px] font-mono font-bold uppercase tracking-widest"
                    >
                      {copied ? <CheckCircle size={14} className="text-teal2" /> : <Copy size={14} />}
                      {copied ? 'Copied' : 'Copy Output'}
                    </button>
                  </div>
                  
                  <div className="font-sans text-sm leading-relaxed text-foreground/80 space-y-4">
                    {result.split('```').map((block, i) => {
                      if (i % 2 === 1) {
                        const firstLineEnd = block.indexOf('\n');
                        const langName = block.slice(0, firstLineEnd).trim();
                        const codeContent = block.slice(firstLineEnd).trim();
                        return (
                          <div key={i} className="my-8 rounded-[2rem] overflow-hidden border border-border shadow-2xl bg-black/90 dark:bg-black/40 backdrop-blur-xl">
                            <div className="bg-white/5 px-6 py-4 text-[10px] font-mono text-ink3 border-b border-white/5 flex justify-between items-center">
                              <span className="tracking-widest uppercase">Source_Vector ({langName || language})</span>
                              <div className="flex gap-1.5 opacity-40">
                                <div className="w-2 h-2 rounded-full bg-rose" />
                                <div className="w-2 h-2 rounded-full bg-amber" />
                                <div className="w-2 h-2 rounded-full bg-teal2" />
                              </div>
                            </div>
                            <SyntaxHighlighter
                              language={langName || language}
                              style={isDark ? vscDarkPlus : prism}
                              customStyle={{ 
                                margin: 0, 
                                padding: '24px', 
                                background: 'transparent',
                                fontSize: '13px',
                                lineHeight: '1.6'
                              }}
                            >
                              {codeContent}
                            </SyntaxHighlighter>
                          </div>
                        );
                      }
                      return <div key={i} className="text-ink2">{block}</div>;
                    })}
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[500px] opacity-20 filter grayscale hover:grayscale-0 transition-all duration-700">
                  <div className="w-32 h-32 mb-8 text-ink3 border-4 border-dashed border-ink3/20 rounded-[3rem] flex items-center justify-center">
                    <Code2 size={64} strokeWidth={1} />
                  </div>
                  <div className="text-center font-syne font-black text-xl uppercase tracking-tighter text-foreground">Awaiting Signal</div>
                  <div className="text-[10px] text-ink3 font-mono mt-3 uppercase tracking-[4px]">Neural Buffer Empty</div>
                </div>
              )}
            </AnimatePresence>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
