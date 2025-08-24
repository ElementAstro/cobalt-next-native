import React from "react";
import { View, Text } from "react-native";
import { cn } from "~/lib/utils";

interface BadgeProps {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "success"
    | "warning";
  className?: string;
  children?: React.ReactNode;
}

export function Badge({
  variant = "default",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <View
      className={cn(
        "items-center justify-center rounded-md px-2.5 py-0.5",
        variant === "default" && "bg-primary",
        variant === "destructive" && "bg-destructive",
        variant === "outline" && "border border-border",
        variant === "secondary" && "bg-secondary",
        variant === "success" && "bg-success",
        variant === "warning" && "bg-warning",
        className
      )}
      {...props}
    >
      <Text
        className={cn(
          "text-xs font-semibold",
          variant === "default" && "text-primary-foreground",
          variant === "destructive" && "text-destructive-foreground",
          variant === "outline" && "text-foreground",
          variant === "secondary" && "text-secondary-foreground",
          variant === "success" && "text-success-foreground",
          variant === "warning" && "text-warning-foreground"
        )}
      >
        {children}
      </Text>
    </View>
  );
}
