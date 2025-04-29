import React, { useEffect, useState } from "react";
import { View, TextInput, useWindowDimensions } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { documentDirectory } from "expo-file-system";
import { Sliders } from "lucide-react-native";
import { Button } from "../ui/button";
import {
  AlertDialog,
  AlertDialogContent,
} from "../ui/alert-dialog";
import FileList from "./file-list";
import FileDetailsDialog from "./file-details-dialog";
import { SortMenu } from "./sort-menu";
import ConfirmDialog from "./confirm-dialog";
import FileHeader from "./file-header";          
import { fileStoreHooks, useFileStore } from "../../stores/useFileStore";
import { useFileOperations } from "../../hooks/use-file-operations";
import { DialogState, FileItemType } from "./types";
import OperationBar from "./operation-bar";
import { AdvancedOperationsMenu } from "./advanced-operations-menu";

/**
 * FileSystemBrowser is the main component that provides a file management interface.
 * It handles:
 * - File navigation and browsing
 * - File operations (open, delete, share)
 * - File filtering and sorting
 * - Selection mode for batch operations
 * - Integration with the file system store
 */
export default function FileSystemBrowser() {
  const { colorScheme } = useColorScheme();
  const isFocused = useIsFocused();
  const [dialogState, setDialogState] = useState<DialogState>({
    showDialog: false,
    type: null,
    message: "",
  });
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [showAdvancedMenu, setShowAdvancedMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState<string | null>(null);

  // Store hooks
  const {
    useFiles,
    useCurrentPath,
    useSelectedFiles,
    useSearchQuery,
    useSortBy,
    useSortOrder,
    useFilterType,
    useViewMode,
    useSelectedMode,
    useShowDetails,
    useDetailsFile,
    useSetFiles,
    useSetCurrentPath,
    useSetSelectedFiles,
    useSetSearchQuery,
    useSetSortBy,
    useSetSortOrder,
    useSetFilterType,
    useSetShowDetails,
    useSetError,
  } = fileStoreHooks;

  // Store selectors
  const files = useFiles();
  const currentPath = useCurrentPath();
  const selectedFiles = useSelectedFiles();
  const searchQuery = useSearchQuery();
  const sortBy = useSortBy();
  const sortOrder = useSortOrder();
  const filterType = useFilterType();
  const viewMode = useViewMode();
  const selectedMode = useSelectedMode();
  const showDetails = useShowDetails();
  const detailsFile = useDetailsFile();
  const setFiles = useSetFiles();
  const setCurrentPath = useSetCurrentPath();
  const setSelectedFiles = useSetSelectedFiles();
  const setSearchQuery = useSetSearchQuery();
  const setSortBy = useSetSortBy();
  const setSortOrder = useSetSortOrder();
  const setFilterType = useSetFilterType();
  const setShowDetails = useSetShowDetails();
  const setError = useSetError();

  // Custom hooks
  const { loadDirectory, handleFileAction, handleBatchOperation } =
    useFileOperations();

  // Load directory on mount and when path changes
  useEffect(() => {
    if (isFocused) {
      loadDirectory(currentPath);
    }
  }, [currentPath, isFocused, loadDirectory]);

  /**
   * Process the files array to apply:
   * - Search filtering
   * - Type filtering (all/folders/files)
   * - Sorting by name, date, or size
   */
  const processedFiles = React.useMemo(() => {
    let result = [...files];

    // Search filter
    if (searchQuery) {
      result = result.filter((file) =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Type filter
    if (filterType !== "all") {
      result = result.filter((file) =>
        filterType === "folders" ? file.isDirectory : !file.isDirectory
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "date":
          comparison = (a.modificationTime || 0) - (b.modificationTime || 0);
          break;
        case "size":
          comparison = (a.size || 0) - (b.size || 0);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [files, searchQuery, sortBy, sortOrder, filterType]);

  /**
   * Event handlers for file and batch operations
   */
  const handleNavigateUp = () => {
    const newPath = currentPath.split("/").slice(0, -2).join("/") + "/";
    if (newPath.startsWith(documentDirectory || "")) {
      setCurrentPath(newPath);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDirectory(currentPath);
    setIsRefreshing(false);
  };

  /**
   * Handles individual file operations such as open, delete, or share.
   * For delete operations, it shows a confirmation dialog.
   * For file opening, it either navigates to the directory or shows the file preview.
   */
  const onFileAction = async (file: FileItemType, action: string) => {
    if (action === "delete") {
      setDialogState({
        showDialog: true,
        type: "delete",
        message: `Are you sure you want to delete ${file.name}?`,
      });
      setSelectedFiles([file.uri]);
    } else {
      const webViewUri = await handleFileAction(file, action);
      if (webViewUri) {
        setWebViewUrl(webViewUri);
      }
    }
  };

  /**
   * Handles the confirmation dialog actions.
   * Currently supports batch delete operations.
   * After successful operation, it clears the selection and refreshes the directory.
   */
  const handleConfirmDialog = async () => {
    if (dialogState.type === "delete" && selectedFiles.length > 0) {
      await handleBatchOperation(selectedFiles, "delete");
    }
    setDialogState({ showDialog: false, type: null, message: "" });
    setSelectedFiles([]);
  };

  // Layout dimensions
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  /**
   * Main render:
   * - Split view for landscape mode
   * - Search and filter controls
   * - File list with drag and drop support
   * - Operation bar for batch operations
   * - Dialogs for file details and confirmations
   */
  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />

      <View className={`flex-1 ${isLandscape ? "flex-row" : "flex-col"}`}>
        <View
          className={isLandscape ? "w-1/4 border-r border-border" : "w-full"}
        >
          <FileHeader
            onNavigateUp={handleNavigateUp}
            isDisabled={currentPath === documentDirectory}
            isLandscape={isLandscape}
            currentPath={currentPath}
          />
        </View>

        <View className="px-4 py-2 flex-row items-center space-x-2">
          <View className="flex-1 flex-row items-center space-x-2">
            <TextInput
              placeholder="Search files..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 h-10 px-4 rounded-lg bg-secondary"
            />
            <Button
              variant="outline"
              size="icon"
              onPress={() => setShowAdvancedMenu(true)}
            >
              <Sliders className="h-5 w-5" />
            </Button>
            <SortMenu
              isVisible={isMenuVisible}
              onClose={() => setIsMenuVisible(false)}
              onSortChange={setSortBy}
              onOrderChange={() =>
                setSortOrder(sortOrder === "asc" ? "desc" : "asc")
              }
              sortOrder={sortOrder}
              filterType={filterType}
              onFilterChange={setFilterType}
            />
          </View>
        </View>

        <View className={isLandscape ? "w-3/4" : "w-full"}>
          <FileList
            files={processedFiles}
            viewMode={viewMode}
            isLandscape={isLandscape}
            onFileAction={onFileAction}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
        </View>
      </View>

      {selectedMode && (
        <OperationBar
          selectedCount={selectedFiles.length}
          onShare={() => handleBatchOperation(selectedFiles, "share")}
          onDelete={() => {
            setDialogState({
              showDialog: true,
              type: "delete",
              message: `Are you sure you want to delete ${selectedFiles.length} files?`,
            });
          }}
        />
      )}

      <FileDetailsDialog
        file={detailsFile}
        open={showDetails}
        onClose={() => setShowDetails(false)}
      />

      <ConfirmDialog
        showDialog={dialogState.showDialog}
        setShowDialog={(show) =>
          setDialogState((prev) => ({ ...prev, showDialog: show }))
        }
        dialogType={dialogState.type}
        dialogMessage={dialogState.message}
        handleConfirmDialog={handleConfirmDialog}
      />

      {showAdvancedMenu && (
        <AlertDialog open={showAdvancedMenu} onOpenChange={setShowAdvancedMenu}>
          <AlertDialogContent>
            <AdvancedOperationsMenu onClose={() => setShowAdvancedMenu(false)} />
          </AlertDialogContent>
        </AlertDialog>
      )}
    </SafeAreaView>
  );
}
