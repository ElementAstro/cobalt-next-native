import React from "react";
import { AlertTriangle, Trash2, CheckCircle } from "lucide-react-native";
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

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
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

  const getDialogIcon = () => {
    switch (dialogType) {
      case "error":
        return <AlertTriangle className="h-6 w-6 text-red-500" />;
      case "delete":
        return <Trash2 className="h-6 w-6 text-red-500" />;
      default:
        return <CheckCircle className="h-6 w-6 text-green-500" />;
    }
  };

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent className="bg-background rounded-lg p-6 shadow-lg">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {getDialogIcon()}
            <AlertDialogTitle className="text-xl font-semibold">
              {dialogType === "error"
                ? "错误"
                : dialogType === "delete"
                ? "确认删除"
                : "确认操作"}
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
              className="bg-primary hover:bg-primary/90"
            >
              确认
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDialog;
