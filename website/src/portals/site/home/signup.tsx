import { RX_DEFAULT_AUTH_GROUP_ID } from "@resolid/app-auth";
import { getHonoContext, httpProblem, httpRedirect } from "@resolid/dev/http";
import { mergeMeta } from "@resolid/dev/react";
import { Button } from "@resolid/react-ui";
import { Form, useSearchParams } from "react-router";
import { parseFormData, useRemixForm } from "remix-hook-form";
import { FormCheckboxField, FormInputField } from "~/components/form-fields";
import { HistoryLink } from "~/components/history-link";
import { UserService } from "~/modules/user/service.server";
import { UserSessionService } from "~/modules/user/session.service.server";
import { type UserSignupFormData, userSignupResolver } from "~/modules/user/validate";
import type { Route } from "./+types/signup";

export const meta = mergeMeta(() => {
  return [{ title: "注册" }];
});

export async function action({ request, context }: Route.ActionArgs) {
  const hono = getHonoContext(context);
  const data = await parseFormData<UserSignupFormData>(request);
  const remoteAddr = hono.get("remoteAddr");
  const app = hono.get("app");

  const [errors, user] = await app
    .get(UserService)
    .signup(
      { ...data, createdIp: remoteAddr, createdFrom: "WEB" },
      RX_DEFAULT_AUTH_GROUP_ID,
      userSignupResolver,
    );

  if (errors) {
    return httpProblem(errors);
  }

  httpRedirect(
    new URL(request.url).searchParams.get("redirect") ?? "/",
    await app.get(UserSessionService).commitSession(request, user, remoteAddr, data.rememberMe),
  );
}

export default function Signup() {
  const [params] = useSearchParams();

  const {
    handleSubmit,
    formState: { isSubmitting },
    control,
  } = useRemixForm<UserSignupFormData>({
    mode: "onBlur",
    resolver: userSignupResolver,
    shouldUseNativeValidation: false,
    defaultValues: {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
      rememberMe: true,
    },
  });

  return (
    <div className="mx-auto flex max-w-96 flex-col gap-5 py-10">
      <h3 className="text-center text-xl font-bold">注册新账号</h3>
      <Form method="post" className="flex flex-col gap-7" onSubmit={handleSubmit} noValidate>
        <FormInputField
          control={control}
          name="email"
          label="电子邮箱"
          type="email"
          autoComplete="email"
        />
        <FormInputField control={control} name="username" label="用户名" autoComplete="username" />
        <FormInputField
          control={control}
          name="password"
          label="密码"
          type="password"
          autoComplete="new-password"
        />
        <FormInputField
          control={control}
          name="confirmPassword"
          label="确认密码"
          type="password"
          autoComplete="new-password"
        />
        <div className="relative flex flex-col gap-3">
          <FormCheckboxField control={control} name="agreeTerms" showError={false}>
            同意{" "}
            <HistoryLink className="text-link hover:underline" target="_blank" to="/terms-service">
              服务协议
            </HistoryLink>{" "}
            并已阅读{" "}
            <HistoryLink className="text-link hover:underline" target="_blank" to="/privacy-policy">
              隐私政策
            </HistoryLink>
          </FormCheckboxField>
          <FormCheckboxField control={control} name="rememberMe">
            在这台电脑上保持登陆
          </FormCheckboxField>
        </div>
        <Button size="lg" className="w-full tracking-widest" loading={isSubmitting} type="submit">
          注册
        </Button>
      </Form>
      <div>
        已有账号?{" "}
        <HistoryLink
          className="text-link hover:underline"
          to={{ pathname: "/login", search: params.toString() }}
        >
          登陆
        </HistoryLink>
      </div>
    </div>
  );
}
