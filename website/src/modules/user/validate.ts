import {
  authPasswordForgotSchema,
  authPasswordResetSchema,
  authSignupSchema,
  authLoginSchema,
  passwordConfirmCheck,
} from "@resolid/app-auth/validate";
import { createResolver } from "@resolid/app/validate";
import * as z from "zod";

export type UserLoginFormData = z.infer<typeof authLoginSchema>;

export const userLoginResolver = createResolver(authLoginSchema);

const userSignupSchema = z
  .object({
    ...authSignupSchema.shape,
    agreeTerms: z.literal<boolean>(true),
    rememberMe: z.boolean(),
    createdIp: z.string().optional(),
    createdFrom: z.string().optional(),
  })
  .check(passwordConfirmCheck);

export type UserSignupFormData = z.infer<typeof userSignupSchema>;

export const userSignupResolver = createResolver(userSignupSchema);

const userPasswordForgotSchema = z.object({
  ...authPasswordForgotSchema.shape,
  captcha: z.string().nonempty(),
});

export type UserPasswordForgotFormData = z.infer<typeof userPasswordForgotSchema>;

export const userPasswordForgotResolver = createResolver(userPasswordForgotSchema);

export type UserPasswordResetFormData = z.infer<typeof authPasswordResetSchema>;

export const userPasswordResetResolver = createResolver(authPasswordResetSchema);
