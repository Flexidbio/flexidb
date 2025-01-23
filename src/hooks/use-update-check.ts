import { useState, useEffect } from 'react';
import { toast } from './use-toast';
import { UpdateNotification } from '@/components/update-notification';

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  body: string;
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
      const latest = data.tag_name.replace('v', '');
      const current = currentVersion.replace('v', '');

      if (latest !== current) {
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