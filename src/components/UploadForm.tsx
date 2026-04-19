'use client';

import { useEffect, useRef, useState } from 'react';

interface DocStat {
  source: string;
  chunks: number;
  ingested_at: string;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function UploadForm() {
  const [state, setState] = useState<UploadState>('idle');
  const [message, setMessage] = useState('');
  const [docs, setDocs] = useState<DocStat[]>([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  async function fetchDocs() {
    setLoading(true);
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const json = await res.json();
        setDocs(json.docs ?? []);
      }
    } catch {
      // silently fail — table may not exist yet
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchDocs();
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
      if (!res.ok) throw new Error(json.error ?? 'Upload failed');

      if (json.chunksIngested === 0) {
        setState('error');
        setMessage(`⚠ ${json.filename} stored but 0 chunks extracted. ${json.message ?? 'The PDF may be scanned/image-only with no text layer.'}`);
      } else {
        setState('success');
        setMessage(`✓ ${json.filename} — ${json.chunksIngested} chunks ingested`);
      }
      if (inputRef.current) inputRef.current.value = '';
      await fetchDocs();
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  const totalChunks = docs.reduce((s, d) => s + d.chunks, 0);

  return (
    <div>
      {/* Upload card */}
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

      {/* Documents table */}
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
            Knowledge Base Documents
          </h2>
          {docs.length > 0 && (
            <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>
              {docs.length} document{docs.length !== 1 ? 's' : ''} · {totalChunks.toLocaleString()} total chunks
            </span>
          )}
        </div>

        {loading && (
          <p style={{ padding: '1.5rem', color: '#9CA3AF', fontSize: '0.875rem' }}>
            Loading documents…
          </p>
        )}

        {!loading && docs.length === 0 && (
          <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
            <p style={{ color: '#9CA3AF', fontSize: '0.875rem', marginBottom: '0.4rem' }}>
              No documents ingested yet.
            </p>
            <p style={{ color: '#D1D5DB', fontSize: '0.8rem' }}>
              Upload a PDF above or run <code style={{ background: '#F3F4F6', padding: '1px 6px', borderRadius: '4px' }}>npm run ingest</code> from the docs/ folder.
            </p>
          </div>
        )}

        {!loading && docs.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontWeight: 600, color: '#374151' }}>
                  Document
                </th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
                  Chunks
                </th>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
                  Ingested
                </th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc, i) => (
                <tr
                  key={doc.source}
                  style={{
                    borderBottom: i < docs.length - 1 ? '1px solid #F3F4F6' : 'none',
                  }}
                >
                  <td style={{ padding: '0.875rem 1.5rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1rem' }}>📄</span>
                    <span style={{ fontWeight: 500 }}>{doc.source}</span>
                  </td>
                  <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                    <span
                      style={{
                        background: doc.chunks === 0 ? '#FEF3C7' : '#EEF2FF',
                        color: doc.chunks === 0 ? '#92400E' : '#4F46E5',
                        borderRadius: '9999px',
                        padding: '2px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                      }}
                    >
                      {doc.chunks === 0 ? 'No text extracted' : `${doc.chunks.toLocaleString()} chunks`}
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem 1.5rem', textAlign: 'right', color: '#6B7280', whiteSpace: 'nowrap' }}>
                    {formatDate(doc.ingested_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
