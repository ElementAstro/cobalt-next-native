import React, { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "use-debounce";

interface InputFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  disabled?: boolean;
  keyboardType?: "default" | "numeric";
  className?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  value: externalValue,
  onChangeText,
  placeholder,
  disabled = false,
  keyboardType = "default",
  className = "",
}) => {
  const [localValue, setLocalValue] = useState(externalValue);

  const debouncedOnChange = useDebouncedCallback((text: string) => {
    onChangeText(text);
  }, 300);

  const handleChangeText = useCallback(
    (text: string) => {
      setLocalValue(text);
      debouncedOnChange(text);
    },
    [debouncedOnChange]
  );

  return (
    <Input
      value={localValue}
      onChangeText={handleChangeText}
      placeholder={placeholder}
      editable={!disabled}
      keyboardType={keyboardType}
      className={className}
    />
  );
};

export default React.memo(InputField);
