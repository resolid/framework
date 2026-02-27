import type { RouteConfig } from "@react-router/dev/routes";
import admin from "./portals/admin/routes";
import site from "./portals/site/routes";

export default [...site, ...admin] satisfies RouteConfig;
