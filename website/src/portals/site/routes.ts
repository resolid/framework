import { relativeFactory } from "@resolid/dev/routes";

const { index, layout, route } = relativeFactory(import.meta.dirname);

export default [
  layout("./layout.tsx", [
    index("./home/index.tsx"),
    route("login", "./home/login.tsx"),
    route("logout", "./home/logout.tsx"),
    route("signup", "./home/signup.tsx"),
    route("password-forgot", "./home/password-forgot.tsx"),
    route("password-reset", "./home/password-reset.tsx"),
    route("terms-service", "./home/terms-service.tsx"),
    route("privacy-policy", "./home/privacy-policy.tsx"),
    route("status", "./home/status.tsx"),
    route("*", "../catchall.tsx", { id: "site-not-found-page" }),
  ]),
];
