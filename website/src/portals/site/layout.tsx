import { Badge, Button, Tooltip, TooltipArrow, TooltipContent, TooltipTrigger } from "@resolid/react-ui";
import { Link, Outlet } from "react-router";
import { HistoryLink } from "~/components/history-link";
import { ResolidLogo } from "~/components/resolid-logo";
import { SpriteIcon } from "~/components/sprite-icon";

export default function SiteLayout() {
  return (
    <>
      <header className="sticky top-0 z-20 w-full border-b border-bd-normal bg-bg-normal">
        <nav className="mx-auto flex h-16 items-center justify-between gap-4 px-4 xl:max-w-288">
          <Link to={"/"} aria-label={"Resolid"}>
            <ResolidLogo />
          </Link>
          <div className={"inline-flex items-center gap-1 text-fg-muted"}>
            <Tooltip placement={"bottom"}>
              <TooltipTrigger
                render={(props) => (
                  <Button
                    {...props}
                    aria-label={"Github 上的 Resolid Framework"}
                    color={"neutral"}
                    variant={"ghost"}
                    size={"sm"}
                    iconOnly
                    render={(props) => (
                      <a {...props} href={"https://github.com/resolid/framework"} target={"_blank"} rel={"noreferrer"}>
                        <SpriteIcon size={"1.5em"} name={"github"} />
                      </a>
                    )}
                  />
                )}
              />
              <TooltipContent>
                <TooltipArrow />
                Github 上的 Resolid Framework
              </TooltipContent>
            </Tooltip>
          </div>
        </nav>
      </header>
      <div className={"min-h-[calc(100vh-var(--spacing)*16-108px)]"}>
        <Outlet />
      </div>
      <footer className="border-t border-bd-normal">
        <div className="mx-auto flex max-w-288 flex-col gap-1 p-4 text-center text-sm text-fg-muted">
          <p>Released under the MIT License</p>
          <p>Copyright Ⓒ 2022-present Resolid Tech</p>
          <p className="inline-flex items-center justify-center gap-2">
            <Badge color={"success"} render={(props) => <HistoryLink {...props} to={"status"} />}>
              <SpriteIcon className={"me-1"} name={"status"} />
              运行状态
            </Badge>
            {import.meta.env.RESOLID_PLATFORM == "vercel" && (
              <Badge className="pointer-events-none" color={"neutral"}>
                部署于 Vercel
              </Badge>
            )}
            {import.meta.env.RESOLID_PLATFORM == "netlify" && (
              <Badge className="pointer-events-none" color={"secondary"}>
                部署于 Netlify
              </Badge>
            )}
          </p>
        </div>
      </footer>
    </>
  );
}
