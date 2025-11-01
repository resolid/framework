import { Link, Outlet } from "react-router";

export default function SiteLayout() {
  return (
    <>
      <header className="sticky top-0 z-20 w-full border-b border-b-neutral-300">
        <nav className="mx-auto flex h-16 items-center justify-between gap-4 px-4 xl:max-w-6xl">
          <Link to={"/"} aria-label={"Resolid"}>
            <img alt={"Resolid"} src="/images/resolid.png" className="h-6" />
          </Link>
        </nav>
      </header>
      <div className={"min-h-[calc(100vh-var(--spacing)*16-102px)]"}>
        <Outlet />
      </div>
      <footer className="border-t border-t-neutral-300">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 p-4 text-center text-sm text-neutral-700">
          <p>Released under the MIT License</p>
          <p>Copyright Ⓒ 2022-present Resolid Tech</p>
          <p>
            <Link className="rounded bg-green-800 px-2 py-1 text-white" to={"status"}>
              运行状态
            </Link>
          </p>
        </div>
      </footer>
    </>
  );
}
