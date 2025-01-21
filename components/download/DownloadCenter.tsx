// components/DownloadCenter.tsx
import React, { useState, useEffect, useCallback } from "react";
import { View } from "react-native";
import { useDownloads } from "./useDownloads";
import { DownloadList } from "./DownloadList";
import { DownloadForm } from "./DownloadForm";
import { DownloadStats } from "./DownloadStats";
import { DownloadSettings } from "./DownloadSettings";
import { ErrorBoundary, ErrorView } from "./ErrorBoundary";

export const DownloadCenter: React.FC = () => {
  const { downloads, stats, isLoading, error } = useDownloads();
  const [showSettings, setShowSettings] = useState(false);

  if (error) {
    return <ErrorView error={error} />;
  }

  return (
    <ErrorBoundary>
      <View className="flex-1 bg-gray-50">
        <DownloadStats stats={stats} />
        <DownloadForm />
        <DownloadList downloads={downloads} isLoading={isLoading} />
        <DownloadSettings
          visible={showSettings}
          onClose={() => setShowSettings(false)}
        />
      </View>
    </ErrorBoundary>
  );
};
