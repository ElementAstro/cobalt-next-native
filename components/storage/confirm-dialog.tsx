import React, { memo } from "react";
import { AlertTriangle, Trash2, AlertCircle } from "lucide-react-native";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { DialogType } from "./types";

// Zod schema for dialog validation
const dialogSchema = z.object({
  showDialog: z.boolean(),
  dialogType: z.enum(["delete", "rename", "error"]).nullable(),
  dialogMessage: z.string().min(1, "Message cannot be empty"),
});

interface ConfirmDialogProps {
  showDialog: boolean;
  setShowDialog: (show: boolean) => void;
  dialogType: DialogType;
  dialogMessage: string;
  handleConfirmDialog: () => Promise<void>;
}

/**
 * A reusable confirmation dialog component with different styles based on dialog type
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = memo(
  ({
    showDialog,
    setShowDialog,
    dialogType,
    dialogMessage,
    handleConfirmDialog,
  }) => {
    // Validate props using Zod
    const validationResult = dialogSchema.safeParse({
      showDialog,
      dialogType,
      dialogMessage,
    });

    if (!validationResult.success) {
      console.error("Dialog validation failed:", validationResult.error);
      return null;
    }

    // Dialog type configurations
    const dialogStyles = {
      error: {
        icon: <AlertCircle className="h-6 w-6 text-destructive" />,
        title: "Error",
        buttonColor: "bg-destructive hover:bg-destructive/90",
        bgColor: "border-destructive/20",
      },
      delete: {
        icon: <Trash2 className="h-6 w-6 text-destructive" />,
        title: "Confirm Deletion",
        buttonColor: "bg-destructive hover:bg-destructive/90",
        bgColor: "border-destructive/20",
      },
      rename: {
        icon: <AlertTriangle className="h-6 w-6 text-warning" />,
        title: "Rename",
        buttonColor: "bg-warning hover:bg-warning/90",
        bgColor: "border-warning/20",
      },
    };

    const currentStyle = dialogStyles[dialogType || "error"];

    return (
      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent
          className={`bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 
            shadow-lg rounded-xl ${currentStyle.bgColor} border`}
        >
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              {currentStyle.icon}
              <AlertDialogTitle className="text-xl font-semibold">
                {currentStyle.title}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="mt-3 text-base text-muted-foreground">
              {dialogMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex-row justify-end space-x-4">
            <AlertDialogCancel className="hover:bg-secondary/80 transition-colors">
              Cancel
            </AlertDialogCancel>
            {dialogType !== "error" && (
              <AlertDialogAction
                onPress={handleConfirmDialog}
                className={`${currentStyle.buttonColor} transition-colors font-medium`}
              >
                Confirm
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

// Display name for debugging
ConfirmDialog.displayName = "ConfirmDialog";

export default ConfirmDialog;
