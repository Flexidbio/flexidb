"use client";

import { useEffect, useState } from 'react';

interface VersionInfo {
  version: string;
  schemaHash: string;
}

export function VersionDisplay() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);

  useEffect(() => {
    fetch('/api/version')
      .then((res) => res.json())
      .then((data) => setVersionInfo(data))
      .catch(console.error);
  }, []);

  if (!versionInfo) return null;

  return (
    <span title={`Schema: ${versionInfo.schemaHash.slice(0, 8)}`}>
      v{versionInfo.version}
    </span>
  );
}
