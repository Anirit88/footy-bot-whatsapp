'use client';

import { useEffect, useRef, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

interface IngestedSource {
  source: string;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export default function UploadForm() {
  const [state, setState] = useState<UploadState>('idle');
  const [message, setMessage] = useState('');
  const [sources, setSources] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  async function fetchSources() {
    const supabase = getSupabaseBrowser();
    const { data } = await supabase.from('chunks').select('source');
    if (data) {
      const unique = [...new Set((data as IngestedSource[]).map(r => r.source))].sort();
      setSources(unique);
    }
  }

  useEffect(() => {
    fetchSources();
  }, []);

  async function handleUpload() {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setMessage('Please select a PDF file first.');
      setState('error');
      return;
    }

    setState('uploading');
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/ingest', { method: 'POST', body: formData });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? 'Upload failed');
      }

      setState('success');
      setMessage(`✓ ${json.filename} — ${json.chunksIngested} chunks ingested`);
      if (inputRef.current) inputRef.current.value = '';
      await fetchSources();
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  return (
    <div>
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          border: '1px solid #E5E7EB',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#111827' }}>
          Upload Rulebook PDF
        </h2>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            style={{
              flex: '1 1 200px',
              padding: '0.5rem',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              fontSize: '0.875rem',
            }}
          />
          <button
            onClick={handleUpload}
            disabled={state === 'uploading'}
            style={{
              padding: '0.5rem 1.25rem',
              background: state === 'uploading' ? '#818CF8' : '#4F46E5',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: state === 'uploading' ? 'not-allowed' : 'pointer',
            }}
          >
            {state === 'uploading' ? 'Uploading…' : 'Upload & Ingest'}
          </button>
        </div>
        {message && (
          <p
            style={{
              marginTop: '0.75rem',
              fontSize: '0.875rem',
              color: state === 'error' ? '#DC2626' : '#059669',
              fontWeight: 500,
            }}
          >
            {message}
          </p>
        )}
      </div>

      {sources.length > 0 && (
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            padding: '1.5rem',
          }}
        >
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#111827' }}>
            Ingested Documents ({sources.length})
          </h2>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {sources.map(s => (
              <li
                key={s}
                style={{
                  fontSize: '0.875rem',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span style={{ color: '#059669', fontWeight: 700 }}>✓</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
