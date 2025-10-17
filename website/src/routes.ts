import type { RouteConfig } from "@resolid/dev/routes";
import admin from "./portals/admin/routes";
import site from "./portals/site/routes";

export default [...site, ...admin] satisfies RouteConfig;
