import UploadForm from '@/components/UploadForm';

export default function AdminPage() {
  return (
    <div>
      <header
        style={{
          background: '#4F46E5',
          padding: '1rem 1.5rem',
          color: '#fff',
          marginBottom: '2rem',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a href="/" style={{ color: '#C7D2FE', fontSize: '0.875rem' }}>
            ← Dashboard
          </a>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            Knowledge Base Management
          </h1>
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1rem 4rem' }}>
        <p style={{ color: '#6B7280', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Upload PDF rulebooks to populate the vector knowledge base. Uploaded documents are
          chunked, embedded with Voyage AI, and stored in Supabase for semantic search.
        </p>
        <UploadForm />
      </main>
    </div>
  );
}
