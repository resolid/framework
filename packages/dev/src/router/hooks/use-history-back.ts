import { type Path, useLocation, useNavigate } from "react-router";

export type UseHistoryBackOptions = { backTo?: string | Partial<Path> };

export function useHistoryBack(backTo: string | Partial<Path> = "/") {
  const navigate = useNavigate();
  const { state } = useLocation();

  return async (): Promise<void> => {
    await (state?.previous ? navigate(-1) : navigate(backTo));
  };
}
