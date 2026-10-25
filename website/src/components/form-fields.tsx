import type { ReactNode } from "react";
import { Checkbox, Input, tx, type InputProps } from "@resolid/react-ui";
import { type Control, type FieldValues, type Path, useController } from "react-hook-form";
import { FormError } from "./form-error";

type FormInputFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  type?: InputProps["type"];
  autoComplete?: string;
  placeholder?: string;
  className?: string;
};

export function FormInputField<T extends FieldValues>({
  control,
  name,
  label,
  type,
  autoComplete,
  placeholder = label,
  className,
}: FormInputFieldProps<T>) {
  const {
    field: { value, onChange, onBlur, ref },
    fieldState,
  } = useController({ control, name });

  return (
    <div className={tx("relative flex flex-col gap-1", className)}>
      <label htmlFor={name}>{label}</label>
      <Input
        id={name}
        name={name}
        invalid={fieldState.invalid}
        type={type}
        className="w-full"
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={String(value)}
        onChange={onChange}
        onBlur={onBlur}
        ref={ref}
      />
      <FormError message={fieldState.error?.message} />
    </div>
  );
}

type FormCheckboxFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  children: ReactNode;
  className?: string;
  showError?: boolean;
};

export function FormCheckboxField<T extends FieldValues>({
  control,
  name,
  children,
  className,
  showError = true,
}: FormCheckboxFieldProps<T>) {
  const {
    field: { value, onChange, onBlur, ref },
    fieldState,
  } = useController({ control, name });

  return (
    <div className={tx("relative flex flex-col gap-1", className)}>
      <Checkbox
        id={name}
        name={name}
        checked={Boolean(value)}
        invalid={fieldState.invalid}
        onChange={onChange}
        onBlur={onBlur}
        ref={ref}
      >
        {children}
      </Checkbox>
      {showError && <FormError message={fieldState.error?.message} />}
    </div>
  );
}
