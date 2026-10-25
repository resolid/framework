import { render } from "react-email";
import {
  type PasswordForgotEmailProps,
  PasswordForgotEmailTemplate,
} from "./password-forgot-template";

export async function passwordForgotEmail(props: PasswordForgotEmailProps) {
  return {
    html: await render(<PasswordForgotEmailTemplate {...props} />, {
      pretty: true,
    }),
    text: await render(<PasswordForgotEmailTemplate {...props} />, {
      plainText: true,
    }),
  };
}
