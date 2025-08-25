// hooks/useDownloads.ts
import { useState, useEffect } from "react";
import { getDownloadManager } from "./download";
import type { DownloadTask, DownloadStats } from "./types";

export const useDownloads = () => {
  const [downloads, setDownloads] = useState<DownloadTask[]>([]);
  const [stats, setStats] = useState<DownloadStats>({} as DownloadStats);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Only initialize in browser environment
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    const downloadManager = getDownloadManager();

    const downloadsSub = downloadManager.getDownloads$().subscribe({
      next: (data) => {
        setDownloads(data);
        setIsLoading(false);
      },
      error: (err) => setError(err),
    });

    const statsSub = downloadManager.getStats$().subscribe({
      next: (data) => setStats(data),
      error: (err) => setError(err),
    });

    return () => {
      downloadsSub.unsubscribe();
      statsSub.unsubscribe();
    };
  }, []);

  return { downloads, stats, isLoading, error };
};
