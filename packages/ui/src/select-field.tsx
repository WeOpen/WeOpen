"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type ReactNode
} from "react";
import {
  getSelectFieldSummary,
  toggleSelectFieldValue,
  type SelectFieldSelectionMode,
  type SelectFieldValue
} from "./form-controls-state";
import { PixelIcon } from "./pixel-icon";
import { cn } from "./utils";

export type SelectFieldOption = {
  description?: ReactNode;
  disabled?: boolean;
  label: ReactNode;
  summaryLabel?: string;
  value: string;
};

type SelectFieldBaseProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled" | "onChange" | "value"> & {
  disabled?: boolean;
  errorMessage?: ReactNode;
  fullWidth?: boolean;
  isDisabled?: boolean;
  label?: ReactNode;
  name?: string;
  options: SelectFieldOption[];
  placeholder?: string;
  popoverClassName?: string;
};

export type SelectFieldSingleProps = SelectFieldBaseProps & {
  onChange: (value: string) => void;
  selectionMode?: "single";
  value: string;
};

export type SelectFieldMultipleProps = SelectFieldBaseProps & {
  onChange: (value: string[]) => void;
  selectionMode: "multiple";
  value: string[];
};

export type SelectFieldProps = SelectFieldSingleProps | SelectFieldMultipleProps;

export function SelectField({
  className,
  disabled,
  errorMessage,
  fullWidth = true,
  id,
  isDisabled,
  label,
  name,
  onChange,
  options,
  placeholder = "Select an option",
  popoverClassName,
  selectionMode = "single",
  value,
  ...props
}: SelectFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? `${generatedId}-select-field`;
  const listboxId = `${fieldId}-listbox`;
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const isFieldDisabled = Boolean(disabled || isDisabled);
  const selectedValues = getSelectedValues(value);
  const summaryOptions = useMemo(() => {
    return options.map((option) => ({
      label: option.summaryLabel ?? getReadableLabel(option.label) ?? option.value,
      value: option.value
    }));
  }, [options]);
  const summary = getSelectFieldSummary(summaryOptions, value, placeholder);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen(true);
    }
  }

  function handleOptionPress(option: SelectFieldOption) {
    if (option.disabled || isFieldDisabled) {
      return;
    }

    const nextValue = toggleSelectFieldValue(value, option.value, selectionMode as SelectFieldSelectionMode);

    if (selectionMode === "multiple") {
      (onChange as (value: string[]) => void)(nextValue as string[]);
      return;
    }

    (onChange as (value: string) => void)(nextValue as string);
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className={cn("field", { "field--full": fullWidth })} ref={containerRef}>
      {label ? <label className="field__label" htmlFor={fieldId}>{label}</label> : null}
      <span className={cn("select-field", { "select-field--open": isOpen, "select-field--invalid": Boolean(errorMessage) })}>
        <button
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className={cn("select", "select-field__trigger", className)}
          disabled={isFieldDisabled}
          id={fieldId}
          onClick={() => setIsOpen((current) => !current)}
          onKeyDown={handleTriggerKeyDown}
          ref={triggerRef}
          type="button"
          {...props}
        >
          <span className={cn("select-field__value", { "select-field__value--placeholder": selectedValues.length === 0 })}>
            {summary}
          </span>
          <span className="select-field__icon" aria-hidden="true">
            <PixelIcon name="chevron-down" variant="bare" />
          </span>
        </button>

        {name ? (
          selectionMode === "multiple"
            ? selectedValues.map((selectedValue) => (
                <input key={selectedValue} name={name} type="hidden" value={selectedValue} />
              ))
            : <input name={name} type="hidden" value={selectedValues[0] ?? ""} />
        ) : null}

        {isOpen ? (
          <span
            aria-labelledby={fieldId}
            aria-multiselectable={selectionMode === "multiple" || undefined}
            className={cn("select-field__popover", popoverClassName)}
            id={listboxId}
            role="listbox"
          >
            {options.map((option) => {
              const isSelected = selectedValues.includes(option.value);

              return (
                <button
                  aria-selected={isSelected}
                  className="select-field__option"
                  disabled={option.disabled}
                  key={option.value}
                  onClick={() => handleOptionPress(option)}
                  role="option"
                  type="button"
                >
                  <span className="select-field__mark" aria-hidden="true">{isSelected ? <PixelIcon name="check" variant="bare" /> : null}</span>
                  <span className="select-field__option-copy">
                    <span>{option.label}</span>
                    {option.description ? <small>{option.description}</small> : null}
                  </span>
                </button>
              );
            })}
          </span>
        ) : null}
      </span>
      {errorMessage ? <span className="field__error">{errorMessage}</span> : null}
    </div>
  );
}

function getSelectedValues(value: SelectFieldValue) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function getReadableLabel(label: ReactNode): string | null {
  if (typeof label === "string" || typeof label === "number") {
    return String(label);
  }

  if (Array.isArray(label)) {
    return label.map(getReadableLabel).filter(Boolean).join(" ");
  }

  return null;
}
