import { Link, Outlet } from "react-router";

export default function SiteLayout() {
  return (
    <>
      <header className="sticky top-0 z-20 w-full border-b border-b-neutral-300">
        <nav className="mx-auto flex h-16 items-center justify-between gap-4 px-4 xl:max-w-288">
          <Link to={"/"} aria-label={"Resolid"}>
            <img alt={"Resolid"} src="/images/resolid.png" className="h-7" />
          </Link>
        </nav>
      </header>
      <div className={"min-h-[calc(100vh-var(--spacing)*16-78px)]"}>
        <Outlet />
      </div>
      <footer className="border-t border-t-neutral-300">
        <div className="mx-auto flex max-w-288 flex-col gap-1 p-4 text-center text-sm text-neutral-700">
          <p>Released under the MIT License</p>
          <p>Copyright Ⓒ 2022-present Resolid Tech</p>
        </div>
      </footer>
    </>
  );
}
