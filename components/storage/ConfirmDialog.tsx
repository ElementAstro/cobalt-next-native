import React from "react";
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
  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent className="bg-white rounded-lg p-6">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold">
            {dialogType === "error" ? "错误" : "确认操作"}
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-2 text-gray-600">
            {dialogMessage}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 flex-row justify-end space-x-4">
          <AlertDialogCancel className="text-red-500">取消</AlertDialogCancel>
          {dialogType !== "error" && (
            <AlertDialogAction
              onPress={handleConfirmDialog}
              className="text-blue-500"
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
