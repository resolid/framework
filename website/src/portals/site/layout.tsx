import { getIdentityDisplayName } from "@resolid/app-auth/utils";
import { getRouteContext } from "@resolid/dev/http";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipTrigger,
  tx,
} from "@resolid/react-ui";
import { omit, trimEnd } from "@resolid/utils";
import { type MouseEventHandler, useState } from "react";
import { createPath, Form, Link, Outlet, useLocation, type Location } from "react-router";
import { ColorModeToggle } from "~/components/color-mode-toggle";
import { HistoryLink, HistoryNavLink } from "~/components/history-link";
import { ResolidLogo } from "~/components/resolid-logo";
import { ResolidUiLogo } from "~/components/resolid-ui-logo";
import { SpriteIcon } from "~/components/sprite-icon";
import { VercelAnalytics } from "~/extensions/vercel/vercel-analytics";
import { VercelSpeedInsights } from "~/extensions/vercel/vercel-speed-insights";
import { UserSessionService } from "~/modules/user/session.service.server";
import type { Route } from "./+types/layout";
import { AuthContext, useAuth } from "./auth";

export const meta = ({ loaderData }: Route.ComponentProps) => {
  const ogImage = new URL("/images/og-image-v2.png", loaderData.requestOrigin).toString();
  const ogUrl = trimEnd(new URL("", loaderData.requestOrigin).toString(), "/");
  const siteName = "Resolid";
  const title = siteName;
  const description =
    "使用 React Router 驱动的全栈网站，展示使用现代 Web 技术构建高性能、可扩展和用户友好的 Web 应用程序的最佳实践。";

  return [
    { title },
    {
      name: "description",
      content: description,
    },
    {
      property: "og:site_name",
      content: siteName,
    },
    {
      property: "og:title",
      content: title,
    },
    {
      property: "og:description",
      content: description,
    },
    {
      property: "og:url",
      content: ogUrl,
    },
    {
      property: "og:image",
      content: ogImage,
    },
    {
      property: "og:type",
      content: "website",
    },
    {
      property: "twitter:title",
      content: title,
    },
    {
      property: "twitter:description",
      content: description,
    },
    {
      property: "twitter:image",
      content: ogImage,
    },
    {
      property: "twitter:url",
      content: ogUrl,
    },
    {
      property: "twitter:card",
      content: "summary_large_image",
    },
  ].filter(Boolean);
};

export async function loader({ request, context }: Route.LoaderArgs) {
  const { app, requestOrigin } = getRouteContext(context);

  return {
    user: await app.get(UserSessionService).getIdentity(request),
    requestOrigin: requestOrigin ?? request.url,
  };
}

export default function SiteLayout({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;

  return (
    <AuthContext value={user}>
      <header className="sticky top-0 z-20 w-full border-b border-bd-normal bg-bg-normal">
        <NavBar />
      </header>
      <div className="min-h-[calc(100vh-var(--spacing)*16-108px)]">
        <Outlet />
      </div>
      <footer className="border-t border-bd-normal">
        <div className="mx-auto flex max-w-288 flex-col gap-1 p-4 text-center text-sm text-fg-muted">
          <p>Released under the MIT License</p>
          <p>Copyright Ⓒ 2022-present Resolid Tech</p>
          <p className="inline-flex items-center justify-center gap-2">
            <Badge color="success" render={(props) => <HistoryLink {...props} to="status" />}>
              <SpriteIcon className="me-1" name="status" />
              运行状态
            </Badge>
            {import.meta.env.RESOLID_PLATFORM == "vercel" && (
              <Badge className="pointer-events-none" color="neutral">
                部署于 Vercel
              </Badge>
            )}
            {import.meta.env.RESOLID_PLATFORM == "netlify" && (
              <Badge className="pointer-events-none" color="secondary">
                部署于 Netlify
              </Badge>
            )}
          </p>
        </div>
      </footer>
      {import.meta.env.RESOLID_PLATFORM == "vercel" && (
        <>
          <VercelAnalytics endpoint="/growth" scriptSrc="/growth/script.js" />
          <VercelSpeedInsights
            endpoint="/speed-growth/vitals"
            scriptSrc="/speed-growth/script.js"
          />
        </>
      )}
    </AuthContext>
  );
}

function NavUser() {
  const location = useLocation();
  const user = useAuth();

  if (user) {
    const displayName = getIdentityDisplayName(user);

    return (
      <DropdownMenu placement="bottom">
        <DropdownMenuTrigger
          render={(props) => (
            <Button {...props} variant="ghost" color="neutral" size="sm" iconOnly />
          )}
        >
          <Avatar size={25} name={displayName}>
            <AvatarImage src={user.avatar} />
            <AvatarFallback />
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="text-sm">
          <DropdownMenuLabel className="gap-2">
            <Avatar size={42} name={displayName}>
              <AvatarImage src={user.avatar} />
              <AvatarFallback />
            </Avatar>
            <div className="flex flex-col text-left">
              <span className="text-base font-medium">{displayName}</span>
              <span className="text-fg-muted">{user.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuItem
            render={(props) => <HistoryLink {...props} to={`user/${user.username}`} />}
          >
            <SpriteIcon size="1rem" name="user" className="me-1.5" />
            个人主页
          </DropdownMenuItem>
          <DropdownMenuItem render={(props) => <HistoryLink {...props} to="settings" />}>
            <SpriteIcon size="1rem" name="setting" className="me-1.5" />
            用户设置
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <Form action={createPath(getLoginTo("logout", location))} method="post">
            <DropdownMenuItem render={(props) => <button {...props} type="submit" />}>
              <SpriteIcon size="1rem" name="logout" className="me-1.5" />
              退出登陆
            </DropdownMenuItem>
          </Form>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Tooltip placement="bottom">
      <TooltipTrigger
        render={(props) => (
          <Button
            {...props}
            color="neutral"
            variant="ghost"
            size="sm"
            iconOnly
            render={(props) => <HistoryLink {...props} to={getLoginTo("login", location)} />}
          />
        )}
        aria-label="用户登录"
      >
        <SpriteIcon size="1.5em" name="user" />
      </TooltipTrigger>
      <TooltipContent>
        <TooltipArrow />
        用户登录
      </TooltipContent>
    </Tooltip>
  );
}

const getLoginTo = (pathname: string, location: Location) => {
  const to = {
    pathname,
    search: location.search,
  };

  if (
    !location.pathname.endsWith("login") &&
    !location.pathname.endsWith("signup") &&
    !location.pathname.endsWith("logout") &&
    !location.pathname.endsWith("password-forgot")
  ) {
    to.search = new URLSearchParams({ redirect: createPath(omit(location, ["hash"])) }).toString();
  }

  return to;
};

function NavMenu({ onClick }: { onClick?: MouseEventHandler<HTMLAnchorElement> }) {
  return (
    <ul
      className={tx(
        "mx-auto flex max-w-80 list-none flex-col justify-end p-4 text-center font-medium tracking-widest",
        "md:max-w-none md:flex-row md:p-0 md:tracking-normal",
      )}
    >
      {[
        { name: "主页", href: "", end: true },
        { name: "关于", href: "about" },
      ].map((menu) => (
        <li className="p-2.5 md:px-4" key={menu.name}>
          <HistoryNavLink
            className={({ isActive }) =>
              tx("block hover:text-link-hovered", isActive && "text-link-pressed")
            }
            onClick={onClick}
            to={menu.href}
            end={menu.end}
          >
            {menu.name}
          </HistoryNavLink>
        </li>
      ))}
      <li className="inline-flex justify-center p-5 md:hidden">
        <a href="https://ui.resolid.tech" target="_blank" rel="noreferrer">
          <ResolidUiLogo height={16} />
        </a>
      </li>
    </ul>
  );
}

function NavBar() {
  const [opened, setOpened] = useState(false);

  return (
    <nav className="mx-auto flex h-16 items-center justify-between gap-4 px-4 xl:max-w-288">
      <Link to="/" aria-label="Resolid">
        <ResolidLogo />
      </Link>
      <div
        className={tx(
          "absolute inset-x-0 top-[calc(var(--spacing)*16+1px)] z-20 h-screen grow bg-bg-normal p-0",
          "md:relative md:top-0 md:block md:h-auto md:bg-inherit",
          opened ? "block" : "hidden",
        )}
      >
        <NavMenu onClick={() => setOpened(false)} />
      </div>
      <div className="inline-flex items-center gap-1 text-fg-muted">
        <NavUser />
        <ColorModeToggle />
        <Tooltip placement="bottom">
          <TooltipTrigger
            render={(props) => (
              <Button
                {...props}
                aria-label="Github 上的 Resolid Framework"
                color="neutral"
                variant="ghost"
                size="sm"
                iconOnly
                render={(buttonProps) => (
                  <a
                    {...buttonProps}
                    href="https://github.com/resolid/framework"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <SpriteIcon size="1.5em" name="github" />
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
        <Tooltip placement="bottom">
          <TooltipTrigger
            render={(props) => (
              <a
                {...props}
                className="ms-3 hidden hover:text-fg-primary md:block"
                aria-label="Resolid UI"
                href="https://ui.resolid.tech"
                target="_blank"
                rel="noreferrer"
              >
                <ResolidUiLogo height={16} />
              </a>
            )}
          />
          <TooltipContent>
            <TooltipArrow />
            访问 Resolid UI
          </TooltipContent>
        </Tooltip>
        <Button
          aria-label="导航菜单"
          color="neutral"
          variant="ghost"
          size="sm"
          iconOnly
          className="md:hidden"
          onClick={() => setOpened((prev) => !prev)}
        >
          {opened ? (
            <SpriteIcon size="1.5em" name="close" />
          ) : (
            <SpriteIcon size="1.5em" name="menu" />
          )}
        </Button>
      </div>
    </nav>
  );
}
