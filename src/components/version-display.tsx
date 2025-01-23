"use client";

import { useEffect, useState } from 'react';

interface VersionInfo {
  version: string;
  schemaHash: string;
}

export function VersionDisplay() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/version')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch version');
        return res.json();
      })
      .then((data) => setVersionInfo(data))
      .catch((err) => {
        console.error('Version fetch error:', err);
        setError(err.message);
      });
  }, []);

  if (error) return <span className="text-red-500">Error: {error}</span>;
  if (!versionInfo) return <span>Loading...</span>;

  return (
    <span title={`Schema: ${versionInfo.schemaHash.slice(0, 8)}`}>
      v{versionInfo.version}
    </span>
  );
}
