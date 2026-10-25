import { getHonoContext, httpProblem, httpRedirect } from "@resolid/dev/http.server";
import { mergeMeta } from "@resolid/dev/router";
import { Button } from "@resolid/react-ui";
import { Form, useSearchParams } from "react-router";
import { parseFormData, useRemixForm } from "remix-hook-form";
import { FormCheckboxField, FormInputField } from "~/components/form-fields";
import { HistoryLink } from "~/components/history-link";
import { UserService } from "~/modules/user/service.server";
import { UserSessionService } from "~/modules/user/session.service.server";
import { type UserLoginFormData, userLoginResolver } from "~/modules/user/validate";
import type { Route } from "./+types/login";

export const meta = mergeMeta(() => {
  return [{ title: "登陆" }];
});

export const action = async ({ request, context }: Route.ActionArgs) => {
  const hono = getHonoContext(context);
  const remoteAddr = hono.get("remoteAddr");
  const formData = await parseFormData<UserLoginFormData>(request);

  const app = hono.get("app");

  const [errors, user] = await app.get(UserService).login(formData, userLoginResolver);

  if (errors) {
    return httpProblem(errors);
  }

  httpRedirect(
    new URL(request.url).searchParams.get("redirect") ?? "/",
    await app.get(UserSessionService).commitSession(request, user, remoteAddr, formData.rememberMe),
  );
};

export default function Login() {
  const [params] = useSearchParams();

  const {
    handleSubmit,
    formState: { isSubmitting },
    control,
  } = useRemixForm<UserLoginFormData>({
    mode: "onBlur",
    resolver: userLoginResolver,
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
  });

  return (
    <div className="mx-auto flex max-w-96 flex-col gap-5 py-10">
      <h3 className="text-center text-xl font-bold">登陆你的账号</h3>
      <Form method="post" className="flex flex-col gap-7" onSubmit={handleSubmit} noValidate>
        <FormInputField
          control={control}
          name="email"
          label="电子邮箱"
          type="email"
          autoComplete="email"
        />
        <FormInputField
          control={control}
          name="password"
          label="密码"
          type="password"
          autoComplete="current-password"
        />
        <div className="flex flex-row items-center justify-between">
          <FormCheckboxField control={control} name="rememberMe">
            在这台电脑上保持登陆
          </FormCheckboxField>
          <HistoryLink
            className="text-link hover:underline"
            to={{ pathname: "/password-forgot", search: params.toString() }}
          >
            忘记密码
          </HistoryLink>
        </div>
        <Button size="lg" className="w-full tracking-widest" loading={isSubmitting} type="submit">
          登录
        </Button>
      </Form>
      <div>
        还没有账号?&nbsp;
        <HistoryLink
          className="text-link hover:underline"
          to={{ pathname: "/signup", search: params.toString() }}
        >
          注册
        </HistoryLink>
      </div>
    </div>
  );
}
