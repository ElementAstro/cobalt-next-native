/// <reference types="nativewind/types" />

declare module "react-native" {
  interface ViewProps {
    className?: string;
  }
  interface TextProps {
    className?: string;
  }
  interface ScrollViewProps {
    className?: string;
  }
  interface PressableProps {
    className?: string;
  }
  interface TextInputProps {
    className?: string;
  }
  interface ImageProps {
    className?: string;
  }
}

declare module "react-native-reanimated" {
  interface AnimateProps<T> {
    className?: string;
  }
}

declare module "lucide-react-native" {
  interface LucideProps {
    className?: string;
  }
}

// Extend all UI component props to support className
declare global {
  namespace JSX {
    interface IntrinsicAttributes {
      className?: string;
    }
  }
}

// Extend @rn-primitives components
declare module "@rn-primitives/avatar" {
  interface AvatarProps {
    className?: string;
  }
  interface AvatarImageProps {
    className?: string;
  }
  interface AvatarFallbackProps {
    className?: string;
  }
}

declare module "@rn-primitives/dialog" {
  interface DialogProps {
    className?: string;
  }
  interface DialogContentProps {
    className?: string;
  }
  interface DialogHeaderProps {
    className?: string;
  }
  interface DialogTitleProps {
    className?: string;
  }
  interface DialogDescriptionProps {
    className?: string;
  }
  interface DialogFooterProps {
    className?: string;
  }
  interface DialogTriggerProps {
    className?: string;
  }
}

declare module "@rn-primitives/label" {
  interface LabelProps {
    className?: string;
  }
}

declare module "@rn-primitives/progress" {
  interface ProgressProps {
    className?: string;
  }
}

declare module "@rn-primitives/switch" {
  interface SwitchProps {
    className?: string;
  }
}

declare module "@rn-primitives/tooltip" {
  interface TooltipProps {
    className?: string;
  }
  interface TooltipContentProps {
    className?: string;
  }
  interface TooltipTriggerProps {
    className?: string;
  }
}
