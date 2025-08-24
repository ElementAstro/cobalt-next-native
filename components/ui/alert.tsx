import React from "react";
import { View } from "react-native";
import { cn } from "~/lib/utils";
import { Text } from "./text";
import { AlertTriangle, Info, CheckCircle } from "lucide-react-native";

interface AlertProps {
  variant?: "default" | "destructive" | "success" | "warning";
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

const Alert = React.forwardRef<View, AlertProps>(
  ({ variant = "default", icon, className, children, ...props }, ref) => {
    const getIcon = () => {
      if (icon) return icon;
      switch (variant) {
        case "destructive":
          return <AlertTriangle className="text-destructive" size={18} />;
        case "success":
          return <CheckCircle className="text-success" size={18} />;
        case "warning":
          return <AlertTriangle className="text-warning" size={18} />;
        default:
          return <Info className="text-foreground" size={18} />;
      }
    };

    return (
      <View
        ref={ref}
        role="alert"
        className={cn(
          "relative w-full rounded-lg border p-4",
          variant === "default" && "bg-background text-foreground",
          variant === "destructive" &&
            "border-destructive/50 text-destructive bg-destructive/10",
          variant === "success" && "border-success/50 text-success bg-success/10",
          variant === "warning" && "border-warning/50 text-warning bg-warning/10",
          className
        )}
        {...props}
      >
        <View className="flex-row space-x-2">
          {getIcon()}
          <View className="flex-1 space-y-1">
            {children}
          </View>
        </View>
      </View>
    );
  }
);

Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  React.ElementRef<typeof Text>,
  React.ComponentPropsWithoutRef<typeof Text>
>(({ className, ...props }, ref) => (
  <Text
    ref={ref}
    className={cn("font-medium leading-none tracking-tight mb-1", className)}
    {...props}
  />
));

AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  React.ElementRef<typeof Text>,
  React.ComponentPropsWithoutRef<typeof Text>
>(({ className, ...props }, ref) => (
  <Text
    ref={ref}
    className={cn("text-sm [text-wrap:pretty]", className)}
    {...props}
  />
));

AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
