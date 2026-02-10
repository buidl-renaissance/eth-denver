import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styled from 'styled-components';

const Page = styled.div`
  min-height: 100vh;
  padding: 2rem;
  max-width: 480px;
  margin: 0 auto;
`;
const Title = styled.h1`
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
`;
const Subtitle = styled.p`
  color: #888;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
`;
const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;
const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid #333;
  border-radius: 8px;
  background: #111;
  color: #fff;
  font-size: 0.9rem;
`;
const Button = styled.button<{ $loading?: boolean }>`
  padding: 0.75rem 1.25rem;
  background: ${(p) => (p.$loading ? '#444' : '#6366f1')};
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: ${(p) => (p.$loading ? 'not-allowed' : 'pointer')};
`;
const Message = styled.div<{ $error?: boolean }>`
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.9rem;
  background: ${(p) => (p.$error ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)')};
  color: ${(p) => (p.$error ? '#f87171' : '#4ade80')};
`;
const BackLink = styled(Link)`
  display: inline-block;
  margin-top: 1.5rem;
  color: #888;
  font-size: 0.9rem;
  text-decoration: none;
  &:hover {
    color: #fff;
  }
`;

export default function UploadEventsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; imported?: number; error?: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const body = await file.text();
      const res = await fetch('/api/events/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body,
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Upload events – ETHDenver</title>
      </Head>
      <Page>
        <Title>Upload events CSV</Title>
        <Subtitle>
          Use the Caladan &quot;Event List&quot; CSV (e.g. ETHDenver 2026 Side Events Sheet - by Caladan - Event List.csv).
        </Subtitle>
        <Form onSubmit={handleSubmit}>
          <Input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setFile(f ?? null);
              setResult(null);
            }}
          />
          <Button type="submit" disabled={!file || loading} $loading={loading}>
            {loading ? 'Importing…' : 'Import to database'}
          </Button>
        </Form>
        {result && (
          <Message $error={!result.ok}>
            {result.ok
              ? `Imported ${result.imported ?? 0} events.`
              : result.error ?? 'Import failed.'}
          </Message>
        )}
        <BackLink href="/">Back to home</BackLink>
      </Page>
    </>
  );
}
