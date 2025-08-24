import * as React from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { Text } from './text';
import { cn } from '~/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const inputVariants = cva(
  'web:flex h-10 native:h-12 web:w-full rounded-md border bg-background px-3 web:py-2 text-base lg:text-sm native:text-lg native:leading-[1.25] text-foreground placeholder:text-muted-foreground web:ring-offset-background file:border-0 file:bg-transparent file:font-medium web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-input',
        outline: 'border-input',
        filled: 'border-transparent bg-muted',
      },
      size: {
        sm: 'h-8 native:h-10 px-2 text-sm',
        md: 'h-10 native:h-12 px-3',
        lg: 'h-12 native:h-14 px-4 text-lg',
      },
      state: {
        default: '',
        error: 'border-destructive focus:border-destructive',
        success: 'border-green-500 focus:border-green-500',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      state: 'default',
    },
  }
);

interface InputProps extends TextInputProps, VariantProps<typeof inputVariants> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isRequired?: boolean;
  showCharacterCount?: boolean;
  maxLength?: number;
  placeholderClassName?: string;
}

const Input = React.forwardRef<TextInput, InputProps>(
  ({
    className,
    placeholderClassName,
    variant,
    size,
    state,
    label,
    hint,
    error,
    leftIcon,
    rightIcon,
    isRequired,
    showCharacterCount,
    maxLength,
    value,
    ...props
  }, ref) => {
    const inputState = error ? 'error' : state;
    const characterCount = value?.length || 0;

    return (
      <View className="w-full">
        {label && (
          <View className="flex-row items-center mb-2">
            <Text className="text-sm font-medium text-foreground">
              {label}
              {isRequired && <Text className="text-destructive ml-1">*</Text>}
            </Text>
          </View>
        )}

        <View className="relative">
          {leftIcon && (
            <View className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
              {leftIcon}
            </View>
          )}

          <TextInput
            ref={ref}
            className={cn(
              inputVariants({ variant, size, state: inputState }),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              props.editable === false && 'opacity-50 web:cursor-not-allowed',
              className
            )}
            placeholderClassName={cn('text-muted-foreground', placeholderClassName)}
            value={value}
            maxLength={maxLength}
            {...props}
          />

          {rightIcon && (
            <View className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
              {rightIcon}
            </View>
          )}
        </View>

        <View className="flex-row justify-between items-center mt-1">
          <View className="flex-1">
            {error && (
              <Text className="text-sm text-destructive">{error}</Text>
            )}
            {!error && hint && (
              <Text className="text-sm text-muted-foreground">{hint}</Text>
            )}
          </View>

          {showCharacterCount && maxLength && (
            <Text className={cn(
              "text-xs",
              characterCount > maxLength * 0.9 ? "text-destructive" : "text-muted-foreground"
            )}>
              {characterCount}/{maxLength}
            </Text>
          )}
        </View>
      </View>
    );
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };
export type { InputProps };
