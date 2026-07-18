import { createApp } from "@resolid/app";
import { beforeEach, describe, expect, it } from "vitest";
import { createMailExtension, createMailTransport, MailService } from "./index";

describe("mailExtension", () => {
  let mailer: MailService;

  beforeEach(async () => {
    const app = await createApp({
      name: "TestApp",
      debug: true,
      extensions: [
        createMailExtension({
          from: "info@resolid.tech",
          transporters: { json: createMailTransport({ jsonTransport: true }) },
        }),
      ],
      expose: {
        mailer: MailService,
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
