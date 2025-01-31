import React, { memo } from "react";
import {
  AlertTriangle,
  Trash2,
  CheckCircle,
  X,
  AlertCircle,
  FileWarning,
} from "lucide-react-native";
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
} from "@/components/ui/alert-dialog";
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

    const dialogStyles = {
      error: {
        icon: <AlertCircle className="h-6 w-6 text-destructive" />,
        title: "错误",
        buttonColor: "bg-destructive",
      },
      delete: {
        icon: <Trash2 className="h-6 w-6 text-destructive" />,
        title: "确认删除",
        buttonColor: "bg-destructive",
      },
      rename: {
        icon: <AlertTriangle className="h-6 w-6 text-warning" />,
        title: "重命名",
        buttonColor: "bg-warning",
      },
    };

    const currentStyle = dialogStyles[dialogType || "error"];

    return (
      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              {currentStyle.icon}
              <AlertDialogTitle className="text-xl font-semibold">
                {currentStyle.title}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="mt-2 text-muted-foreground">
              {dialogMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex-row justify-end space-x-4">
            <AlertDialogCancel className="hover:bg-destructive/10">
              取消
            </AlertDialogCancel>
            {dialogType !== "error" && (
              <AlertDialogAction
                onPress={handleConfirmDialog}
                className={`bg-primary hover:bg-primary/90 ${currentStyle.buttonColor}`}
              >
                确认
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

export default ConfirmDialog;
