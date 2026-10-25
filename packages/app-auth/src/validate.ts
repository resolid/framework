import type { ZodEmail, ZodString } from "zod";
import * as z from "zod";

export const usernameValidator: ZodString = z
  .string()
  .nonempty("用户名不能为空")
  .min(4, "用户名不能少于4个字符")
  .max(32, "用户名不能超过32个字符")
  .regex(/^[a-z][a-z0-9_\\.]*$/, "用户名必须以字母开头不能包含特殊字符")
  .refine(
    (value) =>
      ![
        "admin",
        "administrator",
        "hostmaster",
        "webmaster",
        "postmaster",
        "demo",
        "root",
        "null",
        "undefined",
        "abuse",
        "guest",
        "user",
        "username",
        "account",
        "resolid",
      ].includes(value),
    {
      error: "用户名不能为保留字",
    },
  );

export const emailValidator: ZodEmail = z.email().max(100, "电子邮箱不能超过100个字符");

export const passwordValidator: ZodString = z
  .string()
  .nonempty("密码不能为空")
  .min(6, "密码不能少于6个字符")
  .max(32, "密码不能多于32个字符");

export const passwordConfirmCheck: z.core.CheckFn<{
  password: string;
  confirmPassword: string;
}> = (ctx) => {
  if (ctx.value.password != ctx.value.confirmPassword) {
    ctx.issues.push({
      code: "custom",
      input: ctx.value,
      message: "密码与确认密码必须相同",
      path: ["confirmPassword"],
    });
  }
};

export const authLoginSchema: z.ZodObject<{
  email: z.ZodEmail;
  password: z.ZodString;
  rememberMe: z.ZodBoolean;
}> = z.object({
  email: emailValidator,
  password: z.string().nonempty("密码不能为空"),
  rememberMe: z.boolean(),
});

export const authSignupSchema: z.ZodObject<{
  email: z.ZodEmail;
  username: z.ZodString;
  nickname: z.ZodOptional<z.ZodString>;
  password: z.ZodString;
  confirmPassword: z.ZodString;
}> = z.object({
  email: emailValidator,
  username: usernameValidator,
  nickname: z.string().max(32).optional(),
  password: passwordValidator,
  confirmPassword: passwordValidator,
});

export const authPasswordForgotSchema: z.ZodObject<{
  email: z.ZodEmail;
}> = z.object({
  email: emailValidator,
});

export const authPasswordResetSchema: z.ZodObject<{
  password: z.ZodString;
  confirmPassword: z.ZodString;
  token: z.ZodOptional<z.ZodString>;
}> = z
  .object({
    password: passwordValidator,
    confirmPassword: passwordValidator,
    token: z.string().optional(),
  })
  .check(passwordConfirmCheck);
