export type SelectFieldStateOption = {
  label: string;
  value: string;
};

export type SelectFieldValue = string | string[];
export type SelectFieldSelectionMode = "single" | "multiple";

export function getSelectFieldSummary(
  options: SelectFieldStateOption[],
  value: SelectFieldValue,
  placeholder: string
) {
  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];

  if (selectedValues.length === 0) {
    return placeholder;
  }

  const labels = selectedValues.map((selectedValue) => {
    return options.find((option) => option.value === selectedValue)?.label ?? selectedValue;
  });

  return labels.join(", ");
}

export function toggleSelectFieldValue(
  currentValue: SelectFieldValue,
  optionValue: string,
  selectionMode: SelectFieldSelectionMode
) {
  if (selectionMode === "single") {
    return optionValue;
  }

  const currentValues = Array.isArray(currentValue) ? currentValue : currentValue ? [currentValue] : [];

  if (currentValues.includes(optionValue)) {
    return currentValues.filter((value) => value !== optionValue);
  }

  return [...currentValues, optionValue];
}
