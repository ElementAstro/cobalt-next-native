import React, { useState } from "react";
import { View } from "react-native";
import useDownloadStore from "~/stores/useDownloadStore";
import DownloadList from "./list";
import { DownloadForm } from "./form";
import { DownloadStats } from "./stats";
import { DownloadSettings } from "./settings";
import { ErrorBoundary, ErrorView } from "./error-boundary";

export const DownloadCenter: React.FC = () => {
  const downloads = useDownloadStore((state) =>
    Array.from(state.downloads.values())
  );
  const stats = useDownloadStore((state) => state.stats);
  const activeDownloads = useDownloadStore((state) => state.activeDownloads);
  const [showSettings, setShowSettings] = useState(false);

  const isLoading = activeDownloads.size > 0;

  return (
    <ErrorBoundary>
      <View className="flex-1 bg-gray-50">
        <DownloadStats />
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
