import { useState, useEffect } from 'react';
import { toast } from './use-toast';
import { UpdateNotification } from '@/components/update-notification';

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  body: string;
  name: string;
}

function compareVersions(v1: string, v2: string): boolean {
  const cleanV1 = v1.replace(/^v/, '').split('-')[0];
  const cleanV2 = v2.replace(/^v/, '').split('-')[0];
  
  const [major1, minor1, patch1] = cleanV1.split('.').map(Number);
  const [major2, minor2, patch2] = cleanV2.split('.').map(Number);
  
  return major1 > major2 || 
    (major1 === major2 && minor1 > minor2) ||
    (major1 === major2 && minor1 === minor2 && patch1 > patch2);
}

async function fetchLatestRelease(): Promise<GitHubRelease> {
  const response = await fetch('https://api.github.com/repos/flexidbio/flexidb/releases/latest');
  if (!response.ok) {
    throw new Error('Failed to fetch latest release');
  }
  return response.json();
}

export function useUpdateCheck() {
  const [currentVersion, setCurrentVersion] = useState<string>('');

  useEffect(() => {
    fetch('/api/version')
      .then(res => res.json())
      .then(data => setCurrentVersion(data.version))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!currentVersion) return;

    fetchLatestRelease().then(data => {
      const latest = data.name.replace(/^v/, '');
      const current = currentVersion.replace(/^v/, '');

      if (compareVersions(latest, current)) {
        toast({
          title: "Update Available",
          description: `Version ${latest} is available. You are currently on ${current}`,
          duration: 0
        });
      }
    }).catch(console.error);
  }, [currentVersion]);

  return { currentVersion };
} 