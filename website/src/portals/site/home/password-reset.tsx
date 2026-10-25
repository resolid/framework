import { isSuccessData } from "@resolid/app/validate";
import { getHonoContext, httpProblem } from "@resolid/dev/http.server";
import { mergeMeta } from "@resolid/dev/router";
import { Button, Input } from "@resolid/react-ui";
import { Controller } from "react-hook-form";
import { Form } from "react-router";
import { parseFormData, useRemixForm } from "remix-hook-form";
import { FormError } from "~/components/form-error";
import { UserService } from "~/modules/user/service.server";
import { userPasswordResetResolver, type UserPasswordResetFormData } from "~/modules/user/validate";
import type { Route } from "./+types/password-reset";

export const meta = mergeMeta(() => {
  return [{ title: "密码重置" }];
});

export const action = async ({ request, context }: Route.ActionArgs) => {
  const honoContext = getHonoContext(context);

  const data = await parseFormData<UserPasswordResetFormData>(request);

  const [errors] = await honoContext
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
        <div className="relative flex flex-col gap-1">
          <label htmlFor="password">密码</label>
          <Controller
            name="password"
            control={control}
            render={({ field: { name, onChange, onBlur, value, ref } }) => (
              <Input
                id={name}
                name={name}
                invalid={Boolean(errors.password?.message)}
                type="password"
                className="w-full"
                placeholder="密码"
                onChange={onChange}
                onBlur={onBlur}
                value={value}
                ref={ref}
              />
            )}
          />
          <FormError message={errors.password?.message} />
        </div>
        <div className="relative flex flex-col gap-1">
          <label htmlFor="confirmPassword">确认密码</label>
          <Controller
            name="confirmPassword"
            control={control}
            render={({ field: { name, onChange, onBlur, value, ref } }) => (
              <Input
                id={name}
                name={name}
                invalid={Boolean(errors.confirmPassword?.message)}
                type="password"
                className="w-full"
                placeholder="确认密码"
                autoComplete="new-password"
                onChange={onChange}
                onBlur={onBlur}
                value={value}
                ref={ref}
              />
            )}
          />
          <FormError message={errors.confirmPassword?.message} />
        </div>
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
