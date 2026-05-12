import { createApp } from "@resolid/core";
import JSONTransport from "nodemailer/lib/json-transport";
import { beforeEach, describe, expect, it } from "vitest";
import { createMailExtension, MailService } from "./index";

describe("mailExtension", () => {
  let mailer: MailService<{ json: JSONTransport }>;

  beforeEach(async () => {
    const app = await createApp({
      name: "TestApp",
      debug: true,
      extensions: [
        createMailExtension({
          from: "info@resolid.tech",
          transports: { json: new JSONTransport({ jsonTransport: true }) },
        }),
      ],
      expose: {
        mailer: MailService<{ json: JSONTransport }>,
      },
    });

    await app.run();

    ({ mailer } = app.$);
  });

  it("should send mail", async () => {
    const result = await mailer.send({ to: "admin@resolid.tech", subject: "Email" });

    expect(result.success).toBe(true);
  });
});
