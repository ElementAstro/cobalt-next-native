import React, { memo } from "react";
import {
  AlertTriangle,
  Trash2,
  AlertCircle,
  FileWarning,
  CheckCircle2,
  X,
} from "lucide-react-native";
import { z } from "zod";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
} from "react-native-reanimated";
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
import { DialogType } from "~/stores/useImageStore";
import { Button } from "~/components/ui/button";

// Zod schema for dialog validation
const dialogSchema = z.object({
  showDialog: z.boolean(),
  dialogType: z.enum(["delete", "rename", "error", "success"]).nullable(),
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
        icon: <AlertCircle className="h-8 w-8 text-destructive animate-pulse" />,
        title: "错误",
        buttonColor: "bg-destructive hover:bg-destructive/90",
        description: "发生错误，请重试",
      },
      delete: {
        icon: <Trash2 className="h-8 w-8 text-destructive" />,
        title: "确认删除",
        buttonColor: "bg-destructive hover:bg-destructive/90",
        description: "此操作无法撤销",
      },
      rename: {
        icon: <FileWarning className="h-8 w-8 text-warning" />,
        title: "重命名",
        buttonColor: "bg-warning hover:bg-warning/90",
        description: "请确认是否重命名",
      },
      success: {
        icon: <CheckCircle2 className="h-8 w-8 text-success" />,
        title: "成功",
        buttonColor: "bg-success hover:bg-success/90",
        description: "操作已完成",
      },
    };

    const currentStyle = dialogStyles[dialogType || "error"];

    return (
      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent asChild>
          <Animated.View
            entering={SlideInUp.springify().damping(15)}
            exiting={SlideOutDown.springify().damping(15)}
            className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60
              p-6 rounded-3xl shadow-2xl border border-border/50 max-w-md w-[95%] mx-auto"
          >
            <AlertDialogHeader>
              <Animated.View
                entering={FadeIn.delay(100)}
                className="flex-row items-center space-x-3 mb-4"
              >
                {currentStyle.icon}
                <AlertDialogTitle className="text-2xl font-bold">
                  {currentStyle.title}
                </AlertDialogTitle>
              </Animated.View>
              <Animated.View
                entering={FadeIn.delay(200)}
                className="space-y-2"
              >
                <AlertDialogDescription className="text-base text-muted-foreground">
                  {dialogMessage || currentStyle.description}
                </AlertDialogDescription>
              </Animated.View>
            </AlertDialogHeader>

            <AlertDialogFooter className="mt-6 flex-row justify-end space-x-3">
              <AlertDialogCancel asChild>
                <Button
                  variant="outline"
                  className="flex-1 h-14 rounded-2xl border-2"
                >
                  <X className="h-5 w-5 mr-2" />
                  取消
                </Button>
              </AlertDialogCancel>
              
              {dialogType !== "error" && (
                <AlertDialogAction asChild>
                  <Button
                    className={`flex-1 h-14 rounded-2xl ${currentStyle.buttonColor}`}
                    onPress={handleConfirmDialog}
                  >
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    确认
                  </Button>
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </Animated.View>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

ConfirmDialog.displayName = "ConfirmDialog";

export default ConfirmDialog;
