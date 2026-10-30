import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { createFieldErrors, isSuccessData } from "@resolid/app/validate";
import { getRouteContext, httpProblem } from "@resolid/dev/http";
import { HistoryLink, mergeMeta } from "@resolid/dev/react";
import { Button } from "@resolid/react-ui";
import { addMinutes, formatDate } from "@resolid/utils/date";
import { parse } from "bowser";
import { env } from "node:process";
import { useRef, useState } from "react";
import { Controller } from "react-hook-form";
import { Form, useSearchParams } from "react-router";
import { parseFormData, useRemixForm } from "remix-hook-form";
import { FormInputField } from "~/components/form-fields";
import { passwordForgotEmail } from "~/extensions/email/password-forgot.server";
import { TurnstileWidget } from "~/extensions/turnstile/turnstile-widget";
import { turnstileVerify } from "~/extensions/turnstile/turnstile.server";
import { UserService } from "~/modules/user/service.server";
import {
  userPasswordForgotResolver,
  type UserPasswordForgotFormData,
} from "~/modules/user/validate";
import type { Route } from "./+types/password-forgot";

export const meta = mergeMeta(() => {
  return [{ title: "忘记密码" }];
});

export function headers() {
  return {
    "X-Stretchy-Pants": "its for fun",
    "Cache-Control": "max-age=300, s-maxage=3600",
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const { app, remoteAddr, requestOrigin } = getRouteContext(context);
  const data = await parseFormData<UserPasswordForgotFormData>(request);
  const verify = await turnstileVerify(data.captcha, remoteAddr);

  if (!verify.success) {
    return httpProblem(createFieldErrors({ captcha: "验证失败" }));
  }

  const expiresAt = addMinutes(null, 30);
  const userAgent = request.headers.get("user-agent") ?? "";

  const [errors, result] = await app
    .get(UserService)
    .passwordForgot(data, expiresAt, remoteAddr, userAgent, userPasswordForgotResolver);

  if (errors) {
    return httpProblem(errors);
  }

  if (result.identity) {
    const baseUrl = requestOrigin ?? request.url;
    const resetUrl = new URL(`/password-reset?token=${result.resetId}`, baseUrl).toString();

    const { os, browser } = parse(userAgent);
    const displayName = result.identity.nickname || result.identity.username;

    const email = await passwordForgotEmail({
      baseUrl,
      resetUrl,
      displayName,
      expiresAt: formatDate(expiresAt, "YYYY-MM-DD HH:mm"),
      supportEmail: env.RX_SUPPORT_EMAIL,
      deviceOs: os.name ?? "未知设备",
      browserName: browser.name ?? "未知浏览器",
    });

    const sent = await app.$.mailer.send({
      to: {
        name: displayName,
        address: result.identity.email,
      },
      subject: "Resolid 密码重置",
      html: email.html,
      text: email.text,
    });

    if (!sent.success) {
      app.$.logger.error(`密码重置邮件发送失败：${sent.message}`);
    }
  } else {
    app.$.logger.warn(`密码重置邮件发送失败：${data.email} 不存在`);
  }

  return { success: true };
}

export default function PasswordForgot({ actionData }: Route.ComponentProps) {
  const [params] = useSearchParams();
  const captchaRef = useRef<TurnstileInstance>(null);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const isActionSuccess = isSuccessData(actionData);

  const {
    handleSubmit,
    formState: { isSubmitting },
    control,
  } = useRemixForm<UserPasswordForgotFormData>({
    mode: "onSubmit",
    resolver: userPasswordForgotResolver,
    defaultValues: {
      email: "",
    },
  });

  return (
    <div className="mx-auto flex max-w-96 flex-col gap-5 py-10">
      <h3 className="text-center text-xl font-bold">忘记密码</h3>
      <p className="text-center text-sm text-fg-subtle">
        输入你的电子邮箱，我们将向你发送用于重置密码的链接。
      </p>
      <Form method="post" className="flex flex-col gap-7" onSubmit={handleSubmit} noValidate>
        <FormInputField
          control={control}
          name="email"
          label="电子邮箱"
          type="email"
          autoComplete="email"
        />
        <div className="flex justify-center">
          <Controller
            name="captcha"
            control={control}
            render={({ field: { onChange } }) => (
              <TurnstileWidget
                ref={captchaRef}
                onSuccess={(token) => {
                  onChange(token);
                  setCaptchaVerified(true);
                }}
                options={{ responseField: false, size: "flexible" }}
              />
            )}
          />
        </div>
        <Button
          size="lg"
          className="w-full tracking-widest"
          disabled={!captchaVerified || isActionSuccess}
          loading={isSubmitting}
          color={isActionSuccess ? "success" : "primary"}
          type="submit"
        >
          {isActionSuccess ? "如该邮箱存在，重置邮件已发送" : "发送"}
        </Button>
      </Form>
      <div>
        <HistoryLink
          className="text-link hover:underline"
          to={{ pathname: "/login", search: params.toString() }}
        >
          返回登录
        </HistoryLink>
      </div>
    </div>
  );
}
