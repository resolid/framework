import { isSuccessData } from "@resolid/app/validate";
import { getHonoContext, httpProblem } from "@resolid/dev/http.server";
import { mergeMeta } from "@resolid/dev/router";
import { Button } from "@resolid/react-ui";
import { Form } from "react-router";
import { parseFormData, useRemixForm } from "remix-hook-form";
import { FormInputField } from "~/components/form-fields";
import { UserService } from "~/modules/user/service.server";
import { userPasswordResetResolver, type UserPasswordResetFormData } from "~/modules/user/validate";
import type { Route } from "./+types/password-reset";

export const meta = mergeMeta(() => {
  return [{ title: "密码重置" }];
});

export const action = async ({ request, context }: Route.ActionArgs) => {
  const hono = getHonoContext(context);

  const data = await parseFormData<UserPasswordResetFormData>(request);

  const [errors] = await hono
    .get("app")
    .get(UserService)
    .passwordReset(data, new URL(request.url).searchParams.get("token"), userPasswordResetResolver);

  if (errors) {
    return httpProblem(errors);
  }

  return { success: true };
};

export default function PasswordReset({ actionData }: Route.ComponentProps) {
  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
  } = useRemixForm<UserPasswordResetFormData>({
    mode: "onSubmit",
    resolver: userPasswordResetResolver,
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const isActionSuccess = isSuccessData(actionData);

  return (
    <div className="mx-auto flex max-w-96 flex-col gap-5 py-10">
      <h3 className="text-center text-xl font-bold">密码重置</h3>
      {errors.token?.message && (
        <div className="rounded-md bg-bg-danger p-4 text-fg-danger">{errors.token.message}</div>
      )}
      <Form method="post" className="flex flex-col gap-7" onSubmit={handleSubmit} noValidate>
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
        <Button
          disabled={isActionSuccess}
          color={isActionSuccess ? "success" : "primary"}
          size="lg"
          className="w-full tracking-widest"
          loading={isSubmitting}
          type="submit"
        >
          {isActionSuccess ? "密码重设成功" : "重设密码"}
        </Button>
      </Form>
    </div>
  );
}
