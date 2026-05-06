import { type Path, useLocation, useNavigate } from "react-router";

export type UseHistoryBackOptions = { backTo?: string | Partial<Path> };

export function useHistoryBack(backTo: string | Partial<Path> = "/") {
  const navigate = useNavigate();
  const { state } = useLocation();

  return async (): Promise<void> => {
    if (state?.previous) {
      await navigate(-1);
    } else {
      await navigate(backTo);
    }
  };
}
