import * as React from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { Text } from './text';
import { Button } from './button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { ChevronDown, Check } from 'lucide-react-native';
import { cn } from '~/lib/utils';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

// Create a context for Select state
const SelectContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface SelectProps {
  options?: SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  children?: React.ReactNode;
  defaultValue?: SelectOption;
}

const Select = React.forwardRef<View, SelectProps>(
  ({
    options,
    value,
    onValueChange,
    placeholder = "Select an option...",
    disabled = false,
    className,
    triggerClassName,
    contentClassName,
    children,
    defaultValue,
    ...props
  }, ref) => {
    const [open, setOpen] = React.useState(false);

    // If children are provided, use compound component pattern
    if (children) {
      return (
        <SelectContext.Provider value={{
          ...(value && { value }),
          ...(onValueChange && { onValueChange }),
          open,
          setOpen
        }}>
          <View ref={ref} className={cn("w-full", className)} {...props}>
            {children}
          </View>
        </SelectContext.Provider>
      );
    }

    // Fallback to options-based rendering
    const selectedOption = options?.find(option => option.value === value) || defaultValue;

    const handleSelect = (optionValue: string) => {
      onValueChange?.(optionValue);
      setOpen(false);
    };

    return (
      <View ref={ref} className={cn("w-full", className)} {...props}>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Pressable
              disabled={disabled}
              className={cn(
                "flex-row items-center justify-between h-10 native:h-12 px-3 py-2 border border-input bg-background rounded-md",
                disabled && "opacity-50",
                triggerClassName
              )}
            >
              <Text className={cn(
                "text-sm native:text-base",
                selectedOption ? "text-foreground" : "text-muted-foreground"
              )}>
                {selectedOption ? selectedOption.label : placeholder}
              </Text>
              <ChevronDown size={16} className="text-muted-foreground" />
            </Pressable>
          </DialogTrigger>
          
          <DialogContent className={cn("max-h-96", contentClassName)}>
            <DialogHeader>
              <DialogTitle>Select Option</DialogTitle>
            </DialogHeader>
            
            <ScrollView className="max-h-64" showsVerticalScrollIndicator={false}>
              {options?.map((option) => (
                <Animated.View
                  key={option.value}
                  entering={FadeIn.delay(50)}
                  exiting={FadeOut}
                >
                  <Pressable
                    onPress={() => handleSelect(option.value)}
                    disabled={option.disabled}
                    className={cn(
                      "flex-row items-center justify-between p-3 rounded-md",
                      "web:hover:bg-accent active:bg-accent",
                      option.disabled && "opacity-50",
                      value === option.value && "bg-accent"
                    )}
                  >
                    <Text className={cn(
                      "text-sm native:text-base",
                      value === option.value ? "font-medium" : "font-normal"
                    )}>
                      {option.label}
                    </Text>
                    {value === option.value && (
                      <Check size={16} className="text-primary" />
                    )}
                  </Pressable>
                </Animated.View>
              ))}
            </ScrollView>
          </DialogContent>
        </Dialog>
      </View>
    );
  }
);

Select.displayName = 'Select';

// Additional components for more complex select usage
interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
  onSelect?: (value: string) => void;
}

const SelectItem = React.forwardRef<React.ElementRef<typeof Pressable>, SelectItemProps>(
  ({ value, children, disabled, onSelect, ...props }, ref) => {
    const context = React.useContext(SelectContext);

    const handleSelect = () => {
      context?.onValueChange?.(value);
      context?.setOpen(false);
      onSelect?.(value);
    };

    return (
      <Pressable
        ref={ref}
        onPress={handleSelect}
        disabled={disabled}
        className={cn(
          "flex-row items-center p-3 rounded-md",
          "web:hover:bg-accent active:bg-accent",
          disabled && "opacity-50",
          context?.value === value && "bg-accent"
        )}
        {...props}
      >
        <Text className={cn(
          "text-sm native:text-base flex-1",
          context?.value === value && "font-medium"
        )}>
          {children}
        </Text>
      </Pressable>
    );
  }
);

SelectItem.displayName = 'SelectItem';

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

const SelectTrigger = React.forwardRef<React.ElementRef<typeof Pressable>, SelectTriggerProps>(
  ({ children, className, disabled, ...props }, ref) => {
    const context = React.useContext(SelectContext);

    return (
      <Pressable
        ref={ref}
        disabled={disabled}
        onPress={() => context?.setOpen(true)}
        className={cn(
          "flex-row items-center justify-between h-10 native:h-12 px-3 py-2 border border-input bg-background rounded-md",
          disabled && "opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </Pressable>
    );
  }
);

SelectTrigger.displayName = 'SelectTrigger';

interface SelectValueProps {
  placeholder?: string;
  className?: string;
}

const SelectValue = React.forwardRef<React.ElementRef<typeof Text>, SelectValueProps>(
  ({ placeholder, className, ...props }, ref) => {
    return (
      <Text
        ref={ref}
        className={cn("text-sm native:text-base text-muted-foreground", className)}
        {...props}
      >
        {placeholder}
      </Text>
    );
  }
);

SelectValue.displayName = 'SelectValue';

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

const SelectContent = React.forwardRef<ScrollView, SelectContentProps>(
  ({ children, className, ...props }, ref) => {
    const context = React.useContext(SelectContext);

    if (!context) return null;

    return (
      <Dialog open={context.open} onOpenChange={context.setOpen}>
        <DialogContent className="max-h-96">
          <DialogHeader>
            <DialogTitle>Select Option</DialogTitle>
          </DialogHeader>
          <ScrollView
            ref={ref}
            className={cn("max-h-64", className)}
            showsVerticalScrollIndicator={false}
            {...props}
          >
            {children}
          </ScrollView>
        </DialogContent>
      </Dialog>
    );
  }
);

SelectContent.displayName = 'SelectContent';

interface SelectGroupProps {
  children: React.ReactNode;
  className?: string;
}

const SelectGroup = React.forwardRef<View, SelectGroupProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <View ref={ref} className={cn("py-1", className)} {...props}>
        {children}
      </View>
    );
  }
);

SelectGroup.displayName = 'SelectGroup';

interface SelectLabelProps {
  children: React.ReactNode;
  className?: string;
}

const SelectLabel = React.forwardRef<React.ElementRef<typeof Text>, SelectLabelProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <Text
        ref={ref}
        className={cn("px-3 py-2 text-sm font-semibold text-muted-foreground", className)}
        {...props}
      >
        {children}
      </Text>
    );
  }
);

SelectLabel.displayName = 'SelectLabel';

export {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
};

export type { SelectOption as Option, SelectProps };
