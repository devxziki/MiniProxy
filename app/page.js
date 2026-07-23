'use client';

import { useState, useEffect, useRef } from 'react';

export default function Dashboard() {
  const [providers, setProviders] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [message, setMessage] = useState('What is the capital of France?');
  const [stream, setStream] = useState(true);

  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('Ready');
  const [elapsed, setElapsed] = useState('');
  const [loading, setLoading] = useState(false);
  const [modelCount, setModelCount] = useState('');
  const [copied, setCopied] = useState(false);
  const controllerRef = useRef(null);
  const responseRef = useRef(null);

  useEffect(() => {
    fetch('/v1/providers')
      .then(r => r.json())
      .then(d => {
        setProviders(d.providers || []);
        if (d.providers?.length) setSelectedProvider(d.providers[0].id);
      });
  }, []);

  useEffect(() => {
    if (!selectedProvider) return;
    setModels([]);
    setSelectedModel('');
    setModelCount('');
    const q = `/v1/models?provider=${selectedProvider}&freeOnly=true`;
    fetch(q)
      .then(r => r.json())
      .then(d => {
        const list = d.data || d.models || [];
        setModels(list);
        setModelCount(`${list.length} models`);
        if (list.length) setSelectedModel(list[0].id);
      });
  }, [selectedProvider]);

  async function send() {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
      setStatus('Stopped');
      return;
    }
    if (!selectedModel) return;

    const messages = [];
    if (systemPrompt.trim()) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: message });

    const start = Date.now();
    setResponse('');
    setElapsed('');
    setLoading(true);
    setStatus('Streaming...');

    try {
      if (stream) {
        const ac = new AbortController();
        controllerRef.current = ac;
        const r = await fetch('/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Provider': selectedProvider },
          body: JSON.stringify({ model: selectedModel, messages, stream: true }),
          signal: ac.signal,
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({ error: r.statusText }));
          throw new Error(err.error || r.statusText);
        }
        const reader = r.body.getReader();
        const decoder = new TextDecoder();
        let buf = '', full = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.text || '';
              if (delta) full += delta;
            } catch {}
          }
          setResponse(full);
        }
        setResponse(full);
        setStatus('Done');
      } else {
        const r = await fetch('/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Provider': selectedProvider },
          body: JSON.stringify({ model: selectedModel, messages, stream: false }),
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({ error: r.statusText }));
          throw new Error(err.error || r.statusText);
        }
        const d = await r.json();
        const content = d.choices?.[0]?.message?.content || JSON.stringify(d, null, 2);
        setResponse(content);
        setStatus('Done');
      }
      setElapsed(`${((Date.now() - start) / 1000).toFixed(1)}s`);
    } catch (err) {
      if (err.name === 'AbortError') setStatus('Stopped');
      else { setResponse(`Error: ${err.message}`); setStatus('Error'); }
    }
    setLoading(false);
    controllerRef.current = null;
  }

  function clear() {
    if (controllerRef.current) { controllerRef.current.abort(); controllerRef.current = null; }
    setResponse(''); setStatus('Ready'); setElapsed(''); setLoading(false);
  }

  async function copyResponse() {
    if (!response) return;
    try {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  const s = {
    container: { display: 'flex', minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" },
    sidebar: { width: 280, background: '#161b22', borderRight: '1px solid #30363d', padding: 20, flexShrink: 0 },
    main: { flex: 1, display: 'flex', flexDirection: 'column' },
    header: { padding: '16px 24px', borderBottom: '1px solid #30363d', background: '#161b22' },
    content: { flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' },
    card: { background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: 16 },
    cardTitle: { fontSize: 13, fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 },
    label: { display: 'block', fontSize: 12, color: '#8b949e', marginBottom: 4 },
    input: { width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none' },
    textarea: { width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', padding: '8px 12px', fontSize: 12, fontFamily: "'SF Mono','Cascadia Code','Consolas',monospace", resize: 'vertical', minHeight: 80, outline: 'none' },
    select: { width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none' },
    badge: (green) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 500, background: green ? '#23863620' : '#30363d40', color: green ? '#3fb950' : '#8b949e', border: `1px solid ${green ? '#23863640' : '#30363d'}` }),
    sidebarLabel: { fontSize: 11, color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, marginTop: 16 },
    mlAuto: { marginLeft: 'auto' },
  };

  return (
    <div style={s.container}>
      <aside style={s.sidebar}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>MiniProxy</div>
        <div style={{ fontSize: 11, color: '#484f58', marginBottom: 20 }}>v1.0.0</div>

        <div style={s.sidebarLabel}>Providers</div>
        {providers.map(p => (
          <div key={p.id} style={{ padding: '10px 12px', background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <span style={s.badge(p.noAuth)}>{p.noAuth ? 'No auth' : 'API key'}</span>
              {p.freeEndpoint && <span style={s.badge(true)}>Free only</span>}
              <span style={{ color: '#484f58' }}>&middot; {p.id}</span>
            </div>
          </div>
        ))}

        <div style={s.sidebarLabel}>Free Models</div>
        <div style={{ fontSize: 11, color: '#484f58', marginBottom: 8 }}>{modelCount}</div>
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {models.map(m => (
            <div key={m.id} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4, color: '#8b949e', cursor: 'default' }}
                 onMouseEnter={e => e.target.style.background = '#0d1117'}
                 onMouseLeave={e => e.target.style.background = 'transparent'}>{m.id}</div>
          ))}
          {!models.length && <div style={{ color: '#484f58', fontSize: 12, padding: 8 }}>No models</div>}
        </div>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #30363d' }}>
          <div style={{ fontSize: 11, color: '#484f58', marginBottom: 6 }}>Endpoints</div>
          <div style={{ fontSize: 11, color: '#8b949e' }}>
            <div><span style={{ color: '#58a6ff' }}>POST</span> /v1/chat/completions</div>
            <div style={{ marginTop: 4 }}><span style={{ color: '#58a6ff' }}>GET</span> /v1/models</div>
            <div style={{ marginTop: 4 }}><span style={{ color: '#58a6ff' }}>GET</span> /v1/providers</div>
          </div>
        </div>
      </aside>

      <div style={s.main}>
        <div style={s.header}>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Chat Playground</h1>
          <p style={{ fontSize: 12, color: '#8b949e', margin: '2px 0 0 0' }}>Test providers and models right from your browser</p>
        </div>

        <div style={s.content}>
          <div style={s.card}>
            <div style={s.cardTitle}>Request</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Provider</label>
                <select style={s.select} value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)}>
                  {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Model</label>
                <select style={s.select} value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
                  {models.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={s.label}>System Prompt</label>
              <textarea style={{ ...s.textarea, minHeight: 60 }} placeholder="Optional system prompt..." value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Messages</label>
              <textarea style={{ ...s.textarea, minHeight: 100 }} value={message} onChange={e => setMessage(e.target.value)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <label style={{ position: 'relative', width: 36, height: 20, cursor: 'pointer' }}>
                <input type="checkbox" checked={stream} onChange={e => setStream(e.target.checked)} style={{ display: 'none' }} />
                <span style={{ position: 'absolute', inset: 0, background: stream ? '#238636' : '#30363d', borderRadius: 10, transition: '.2s' }}>
                  <span style={{ position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: '#fff', top: 2, left: stream ? 18 : 2, transition: '.2s' }} />
                </span>
              </label>
              <span style={{ fontSize: 12, color: '#8b949e' }}>Stream response</span>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button onClick={send} style={{
                padding: '8px 20px', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: loading ? '#da3633' : '#238636', color: '#fff',
              }}>{loading ? 'Stop' : 'Send'}</button>
              <button onClick={clear} style={{
                padding: '8px 20px', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: '#da3633', color: '#fff',
              }}>Clear</button>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#8b949e', marginLeft: 'auto' }}>
                <span>{status}</span>
                {!!selectedModel && <span>{selectedModel}</span>}
                {!!elapsed && <span>{elapsed}</span>}
              </div>
            </div>
          </div>

          <div style={{ ...s.card, flex: 1 }}>
            <div style={{ ...s.cardTitle, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Response</span>
              {response && <button onClick={copyResponse} style={{
                marginLeft: 'auto', background: copied ? '#238636' : 'transparent',
                border: '1px solid', borderColor: copied ? '#238636' : '#30363d',
                borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer',
                color: copied ? '#fff' : '#8b949e',
              }}>{copied ? 'Copied!' : 'Copy'}</button>}
            </div>
            <div ref={responseRef} style={{
              background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, padding: 12,
              minHeight: 200, maxHeight: 500, overflowY: 'auto',
              fontFamily: "'SF Mono','Cascadia Code','Consolas',monospace", fontSize: 13,
              lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              color: response ? '#e6edf3' : '#484f58',
            }}>
              {response || <span style={{ fontStyle: 'italic', fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>Send a message to see the response...</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
