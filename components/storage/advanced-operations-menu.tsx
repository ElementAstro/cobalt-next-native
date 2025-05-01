import React from "react";
import { View } from "react-native";
import { Button } from "../ui/button";
import { Text } from "../ui/text";
import {
  Archive,
  ClipboardCheck,
  FolderOpen,
  History,
  Lock,
  Search,
  Sliders,
  Workflow,
} from "lucide-react-native";
import { fileStoreHooks } from "../../stores/useFileStore";
import { useAdvancedFileOperations } from "../../hooks/use-advanced-file-operations";

interface AdvancedOperationsMenuProps {
  onClose: () => void;
}

export function AdvancedOperationsMenu({
  onClose,
}: AdvancedOperationsMenuProps) {
  const { useSelectedFiles, useCurrentPath, useSetError } = fileStoreHooks;

  const selectedFiles = useSelectedFiles();
  const currentPath = useCurrentPath();
  const setError = useSetError();

  const {
    batchOperation,
    searchFiles,
    acquireLock,
    createFileVersion,
    operations,
    fileVersions,
    releaseLock,
  } = useAdvancedFileOperations();

  const handleBatchOperation = async (operation: string) => {
    if (selectedFiles.length === 0) {
      setError("No files selected");
      return;
    }

    try {
      switch (operation) {
        case "copy":
        case "move":
        case "delete":
          await batchOperation(selectedFiles, operation);
          break;

        case "lock":
          for (const file of selectedFiles) {
            if (await acquireLock(file)) {
              setTimeout(() => releaseLock(file), 30000); // Auto-release after 30s
            }
          }
          break;

        case "version":
          for (const file of selectedFiles) {
            const fileItem = {
              name: file.split("/").pop() || "",
              uri: file,
              isDirectory: false,
              version: {
                number: (fileVersions.get(file)?.length || 0) + 1,
                timestamp: Date.now(),
              },
            };
            await createFileVersion(fileItem);
          }
          break;

        default:
          setError("Unknown operation");
      }
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Operation failed");
    }
  };

  const operationButtons = [
    {
      icon: <History className="h-5 w-5" />,
      label: "Version",
      action: () => handleBatchOperation("version"),
    },
    {
      icon: <Lock className="h-5 w-5" />,
      label: "Lock Files",
      action: () => handleBatchOperation("lock"),
    },
    {
      icon: <Workflow className="h-5 w-5" />,
      label: "Operations",
      disabled: operations.size === 0,
      action: () => {
        /* TODO: Show operations status dialog */
      },
    },
  ];

  return (
    <View className="p-4 bg-background rounded-lg">
      <Text className="text-lg font-semibold mb-4">Advanced Operations</Text>
      <View className="flex-row flex-wrap gap-2">
        {operationButtons.map(({ icon, label, action, disabled }) => (
          <Button
            key={label}
            variant="outline"
            className="flex-row items-center gap-2 py-2 px-3"
            onPress={action}
            disabled={disabled}
          >
            {icon}
            <Text className="text-sm">{label}</Text>
          </Button>
        ))}
      </View>

      {operations.size > 0 && (
        <View className="mt-4 border-t border-border pt-4">
          <Text className="text-sm text-muted-foreground">
            {operations.size} operation(s) in progress
          </Text>
        </View>
      )}
    </View>
  );
}
