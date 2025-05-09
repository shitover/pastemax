export interface UpdateCheckResultFromMain {
  isUpdateAvailable: boolean;
  currentVersion: string;
  latestVersion?: string;
  releaseUrl?: string;
  error?: string;
  isLoading?: boolean;
}

export interface UpdateDisplayState extends UpdateCheckResultFromMain {
  isLoading: boolean;
}
