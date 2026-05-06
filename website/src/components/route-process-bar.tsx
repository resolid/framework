import { useRouteProgress } from "@resolid/dev/router";
import { tx } from "@resolid/react-ui";

export function RouteProcessBar() {
  const { ref, active, animating, state } = useRouteProgress();

  return (
    <div
      aria-hidden={!active}
      aria-valuetext={active ? "正在加载" : undefined}
      className="pointer-events-none fixed inset-x-0 top-0 z-99 h-1 animate-pulse"
    >
      <div
        ref={ref}
        className={tx(
          "h-full transition-[width,background-image] duration-500",
          "bg-linear-to-r from-bg-primary-emphasis to-bg-primary-pressed",
          state === "idle" && (animating ? "w-full" : "w-0 opacity-0 transition-none"),
          state === "submitting" && "w-4/12",
          state === "loading" && "w-10/12",
        )}
      />
    </div>
  );
}
