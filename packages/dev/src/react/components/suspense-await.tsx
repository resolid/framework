import { Suspense, use, type ReactNode } from "react";

type ResolvedProps<T> = {
  promise: Promise<T>;
  children: (value: T) => ReactNode;
};

export type SuspenseAwaitProps<T> = ResolvedProps<T> & {
  fallback?: ReactNode;
};

function Resolved<T>({ promise, children }: ResolvedProps<T>) {
  return children(use(promise));
}

export function SuspenseAwait<T>({
  promise,
  fallback,
  children,
}: SuspenseAwaitProps<T>): ReactNode {
  return (
    <Suspense fallback={fallback}>
      <Resolved promise={promise}>{children}</Resolved>
    </Suspense>
  );
}
