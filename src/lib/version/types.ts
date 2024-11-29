export interface VersionInfo {
    currentVersion: string;
    latestVersion: string;
    hasUpdate: boolean;
    releaseNotes?: string;
    minCompatibleVersion?: string;
  }