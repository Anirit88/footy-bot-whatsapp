import { Suspense } from 'react';
import NavTabs from '@/components/NavTabs';
import UploadForm from '@/components/UploadForm';

export default function AdminPage() {
  return (
    <div>
      <header
        style={{
          background: '#4F46E5',
          padding: '1rem 1.5rem 0',
          color: '#fff',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            NY Footy Referee Bot — Operations Dashboard
          </h1>
          <Suspense fallback={null}>
            <NavTabs />
          </Suspense>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 1rem 4rem' }}>
        <p style={{ color: '#6B7280', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Upload PDF rulebooks to populate the vector knowledge base. Uploaded documents are
          chunked, embedded with Voyage AI, and stored in Supabase for semantic search.
        </p>
        <UploadForm />
      </main>
    </div>
  );
}
