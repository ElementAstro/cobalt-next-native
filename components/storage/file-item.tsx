import React, { memo, useState } from "react";
import {
  Folder,
  File,
  Image as ImageIcon,
  Music,
  Video,
  Share2,
  Edit2,
  Trash,
  Copy,
  Move,
  Archive,
  Download,
  Eye,
} from "lucide-react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  runOnJS,
} from "react-native-reanimated";
import { View, ScrollView, Image, Pressable } from "react-native";
import { Card, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { Text } from "~/components/ui/text";
import { Checkbox } from "~/components/ui/checkbox";
import { fileStoreHooks } from "../../stores/useFileStore"; // Import hooks from the file store
import { FileItemType } from "./types"; // Import the type definition for a file item

// Define the props interface for the FileItem component
interface FileItemProps {
  file: FileItemType; // The file data object
  index: number; // The index of the item, used for animation delays
  isLandscape: boolean; // Flag indicating if the device is in landscape orientation
  onFileAction: (file: FileItemType, action: string) => void; // Callback function for file actions (open, delete, etc.)
  onLongPress?: () => void; // Optional callback function for long press events
}

// Define the FileItem component using React.memo for performance optimization
const FileItem: React.FC<FileItemProps> = memo(
  ({ file, index, isLandscape, onFileAction, onLongPress }) => {
    // State to track if the thumbnail image failed to load
    const [thumbnailError, setThumbnailError] = useState(false);
    // Destructure hooks from the file store
    const { useSelectedMode, useSelectedFiles, useSetSelectedFiles } =
      fileStoreHooks;

    // Get the current selection mode state from the store
    const selectedMode = useSelectedMode();
    // Get the list of currently selected file URIs from the store
    const selectedFiles = useSelectedFiles();
    // Get the function to update the selected files list in the store
    const setSelectedFiles = useSetSelectedFiles();
    // Check if the current file item is selected
    const isSelected = selectedFiles.includes(file.uri);

    // --- Animation Setup ---
    // Shared value for controlling the scale animation
    const scale = useSharedValue(1);
    // Shared value for controlling the opacity animation (though not explicitly used in animatedStyle here, could be added)
    const opacity = useSharedValue(1);

    // Define the animated style using the shared scale value
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }], // Apply scale transformation
      opacity: opacity.value, // Apply opacity transformation
    }));
    // --- End Animation Setup ---

    // Function to toggle the selection state of the file item
    const toggleSelection = () => {
      if (isSelected) {
        // If already selected, remove it from the list
        setSelectedFiles(
          selectedFiles.filter((uri: string) => uri !== file.uri)
        );
      } else {
        // If not selected, add it to the list
        setSelectedFiles([...selectedFiles, file.uri]);
      }
    };

    // Handler for press events on the file item
    const handlePress = () => {
      // Apply a spring animation sequence for visual feedback
      scale.value = withSequence(
        withSpring(0.95, { damping: 10, stiffness: 100 }), // Scale down slightly
        withSpring(1, { damping: 10, stiffness: 100 }) // Scale back to normal
      );

      if (selectedMode) {
        // If in selection mode, toggle the selection state
        // Use runOnJS to execute the state update on the JS thread
        runOnJS(toggleSelection)();
      } else {
        // If not in selection mode, trigger the 'open' action
        // Use runOnJS to execute the callback on the JS thread
        runOnJS(onFileAction)(file, "open");
      }
    };

    // Handler for long press events on the file item
    const handleLongPress = () => {
      // Apply a spring animation sequence for visual feedback
      scale.value = withSequence(
        withSpring(1.05, { damping: 5 }), // Scale up slightly
        withSpring(1, { damping: 10 }) // Scale back to normal
      );
      // Trigger the optional onLongPress callback provided by the parent
      onLongPress?.();
    };

    // Function to determine the appropriate icon based on file type
    const getFileIcon = (file: FileItemType) => {
      if (file.isDirectory) return <Folder className="h-6 w-6 text-primary" />; // Folder icon for directories
      const ext = file.name.split(".").pop()?.toLowerCase(); // Get file extension
      switch (ext) {
        case "jpg":
        case "jpeg": // Added jpeg as well
        case "png":
        case "gif":
          return <ImageIcon className="h-6 w-6 text-blue-500" />; // Image icon
        case "mp3":
        case "wav":
          return <Music className="h-6 w-6 text-green-500" />; // Music icon
        case "mp4":
        case "mov":
          return <Video className="h-6 w-6 text-purple-500" />; // Video icon
        default:
          return <File className="h-6 w-6 text-muted-foreground" />; // Generic file icon
      }
    };

    // Function to render either an image thumbnail or a file icon
    const renderThumbnail = () => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const isImage = ["jpg", "jpeg", "png", "gif"].includes(ext || ""); // Check if it's a common image type

      // If it's an image and no error occurred loading the thumbnail
      if (isImage && !thumbnailError) {
        return (
          <Image
            source={{ uri: file.uri }} // Use the file URI as the image source
            className="w-12 h-12 rounded" // Style the thumbnail
            onError={() => setThumbnailError(true)} // Set error state if image fails to load
          />
        );
      }

      // Otherwise, render the appropriate file icon
      return getFileIcon(file);
    };

    // Define the available actions for a file item
    const fileActions = [
      { icon: <Eye />, action: "open", label: "Preview" },
      { icon: <Share2 />, action: "share", label: "Share" },
      { icon: <Edit2 />, action: "rename", label: "Rename" },
      { icon: <Copy />, action: "copy", label: "Copy" },
      { icon: <Move />, action: "move", label: "Move" },
      { icon: <Archive />, action: "compress", label: "Compress" },
      { icon: <Download />, action: "download", label: "Download" },
      { icon: <Trash />, action: "delete", label: "Delete" },
    ].filter((action) => {
      // Filter actions based on context
      // Only show the 'Preview' action for specific viewable file types
      if (action.action === "open") {
        const ext = file.name.split(".").pop()?.toLowerCase();
        // Define extensions that can be previewed directly
        const viewableExtensions = ["pdf", "txt", "jpg", "jpeg", "png", "gif"];
        return viewableExtensions.includes(ext || "");
      }
      // Keep all other actions
      return true;
    });

    // Render the FileItem component
    return (
      <Pressable
        onPress={handlePress} // Attach press handler
        onLongPress={handleLongPress} // Attach long press handler
        delayLongPress={300} // Set the duration required for a long press
      >
        {/* Apply entrance and interaction animations */}
        <Animated.View
          entering={FadeIn.delay(index * 50).springify()} // Staggered fade-in animation on mount
          style={animatedStyle} // Apply scale animation style
        >
          <Card
            className={`
            bg-gray-50 overflow-hidden 
            ${isLandscape ? "min-h-[120px]" : ""} 
            ${
              isSelected ? "border-primary" : ""
            } // Highlight border if selected
          `}
          >
            {/* Card Header: Contains checkbox (if in select mode), thumbnail/icon, and file name */}
            <CardHeader className="py-2 flex-row items-center space-x-2">
              {/* Conditionally render Checkbox when in selection mode */}
              {selectedMode && (
                <Checkbox
                  checked={isSelected} // Set checked state based on selection
                  onCheckedChange={toggleSelection} // Toggle selection on change
                />
              )}
              {/* Thumbnail/Icon with fade-in animation */}
              <Animated.View entering={FadeIn.delay(index * 100).springify()}>
                {renderThumbnail()}
              </Animated.View>
              {/* File name, truncated if too long */}
              <CardTitle numberOfLines={1} className="flex-1 text-sm">
                {file.name}
              </CardTitle>
            </CardHeader>
            <Separator /> {/* Visual separator */}
            {/* Card Footer: Contains horizontally scrollable action buttons */}
            <CardFooter
              className={`py-1 px-2 ${isLandscape ? "h-[60px]" : ""}`} // Adjust height in landscape
            >
              <ScrollView
                horizontal // Enable horizontal scrolling
                showsHorizontalScrollIndicator={false} // Hide scrollbar
                className="flex-1"
              >
                <View className="flex-row flex-wrap gap-1">
                  {/* Map through the filtered file actions and render buttons */}
                  {fileActions.map(({ icon, action, label }) => (
                    <Button
                      key={action} // Unique key for each action
                      variant="ghost" // Use ghost button style
                      size="sm" // Use small button size
                      onPress={() => onFileAction(file, action)} // Trigger file action callback on press
                      className={`flex-row items-center ${
                        isLandscape ? "px-2 py-1" : "px-3 py-2" // Adjust padding based on orientation
                      }`}
                    >
                      {/* Clone the icon element to add dynamic classes */}
                      {React.cloneElement(icon, {
                        className: `h-4 w-4 ${isLandscape ? "mr-1" : "mr-2"}`, // Adjust icon margin
                      })}
                      {/* Conditionally hide the label in landscape mode */}
                      <Text
                        className={`text-xs ${isLandscape ? "hidden" : ""}`}
                      >
                        {label}
                      </Text>
                    </Button>
                  ))}
                </View>
              </ScrollView>
            </CardFooter>
          </Card>
        </Animated.View>
      </Pressable>
    );
  }
);

export default FileItem; // Export the component
