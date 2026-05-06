import { type RefObject, useEffect, useRef, useState } from "react";
import { useNavigation } from "react-router";

export function useRouteProgress(): {
  ref: RefObject<HTMLDivElement | null>;
  active: boolean;
  animating: boolean;
  state: "idle" | "loading" | "submitting";
} {
  const navigation = useNavigation();
  const active = navigation.state !== "idle";

  const ref = useRef<HTMLDivElement>(null);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    void Promise.allSettled(ref.current.getAnimations().map(({ finished }) => finished)).then(
      () => {
        if (!active) {
          setAnimating(false);
        }
      },
    );

    const id = active ? setTimeout(() => setAnimating(true), 100) : null;

    return () => {
      if (id) {
        clearTimeout(id);
      }
    };
  }, [active]);

  return { ref, active, animating, state: navigation.state };
}
