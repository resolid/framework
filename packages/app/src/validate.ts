import type { FieldErrors, FieldValues, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

export const createResolver: typeof zodResolver = zodResolver;

export type ValidateDataResult<T extends FieldValues> =
  | { success: true; values: T }
  | { success: false; errors: FieldErrors<T> };

export const validateData = async <T extends FieldValues>(
  data: T,
  resolver: Resolver<T>,
): Promise<ValidateDataResult<T>> => {
  const { errors, values } = await resolver(
    data,
    {},
    { shouldUseNativeValidation: false, fields: {} },
  );

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return { success: true, values: values as T };
};

export const createFieldErrors = <T extends FieldValues = FieldValues>(
  errors: Record<string, string>,
) => {
  const fieldErrors: FieldErrors = {};

  for (const [name, message] of Object.entries(errors)) {
    fieldErrors[name] = { type: "custom", message };
  }

  return fieldErrors as unknown as FieldErrors<T>;
};

export type ServiceResult<T extends FieldValues, R> = [FieldErrors<T>, undefined] | [undefined, R];

export type SuccessData = { success: boolean } | undefined;

export const isSuccessData = (data: unknown): boolean => {
  return !!(data as SuccessData)?.success;
};
