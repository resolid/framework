import type { Transport, Transporter } from "nodemailer";
import { createApp } from "@resolid/app";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import nodePath from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMailExtension,
  createMailTransport,
  type MailConfig,
  type MailMessage,
  MailService,
} from "./index";
import { FileTransport } from "./transports/file";

const disposers: (() => Promise<void>)[] = [];

async function createTestApp(config: MailConfig) {
  const app = await createApp({
    name: "TestApp",
    debug: true,
    extensions: [createMailExtension(config)],
    expose: {
      mailer: MailService,
    },
  });

  disposers.push(() => app.dispose());

  await app.run();

  return app;
}

function createMemoryTransport(messageId = "<memory@test>") {
  const sent: MailMessage[] = [];

  const transport: Transport = {
    name: "MemoryTransport",
    version: "0.0.0",
    send(mail, done) {
      sent.push(mail.data);

      done(null, {
        envelope: { from: "info@resolid.tech", to: ["admin@resolid.tech"] },
        messageId,
      });
    },
  };

  return { sent, transporter: createMailTransport(transport) };
}

function mailFilePath(messageId: string): string {
  const [id = "message"] = messageId.replaceAll(/^<|>$/g, "").split("@");

  return nodePath.join(process.cwd(), "runtime", "mail", `${id}.txt`);
}

afterEach(async () => {
  for (const dispose of disposers.splice(0).reverse()) {
    // oxlint-disable-next-line no-await-in-loop
    await dispose();
  }

  vi.restoreAllMocks();
});

describe("mailExtension", () => {
  it("sends mail through the default file transport", async () => {
    const app = await createTestApp({
      from: "info@resolid.tech",
      replyTo: "reply@resolid.tech",
    });

    const result = await app.$.mailer.send({ to: "admin@resolid.tech", subject: "Email" });

    if (!result.success) {
      throw new Error(result.message);
    }

    const file = mailFilePath(result.messageId);
    const data = JSON.parse(await readFile(file, "utf-8"));

    expect(data.subject).toBe("Email");
    expect(data.from.address).toBe("info@resolid.tech");
    expect(data.replyTo[0].address).toBe("reply@resolid.tech");

    await rm(file, { force: true });
  });

  it("allows overriding the default sender fields", async () => {
    const app = await createTestApp({
      from: "default@resolid.tech",
      replyTo: "reply@resolid.tech",
    });

    const result = await app.$.mailer.send({
      from: "other@resolid.tech",
      replyTo: "other-reply@resolid.tech",
      to: "admin@resolid.tech",
      subject: "Override",
    });

    if (!result.success) {
      throw new Error(result.message);
    }

    const file = mailFilePath(result.messageId);
    const data = JSON.parse(await readFile(file, "utf-8"));

    expect(data.from.address).toBe("other@resolid.tech");
    expect(data.replyTo[0].address).toBe("other-reply@resolid.tech");

    await rm(file, { force: true });
  });

  it("sends mail through a named transporter and emits events", async () => {
    const { sent, transporter } = createMemoryTransport();

    const app = await createTestApp({
      from: "info@resolid.tech",
      transporters: { memory: transporter },
      defaultTransport: "memory",
    });

    const events: string[] = [];

    app.emitter.on("mail:sending", (name, message) => {
      events.push(`sending:${name}:${message.subject}`);
    });
    app.emitter.on("mail:sent", (name, message, messageId) => {
      events.push(`sent:${name}:${message.subject}:${messageId}`);
    });

    const result = await app.$.mailer.send({ to: "admin@resolid.tech", subject: "Hello" });

    expect(result).toEqual({ success: true, messageId: "<memory@test>" });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ from: "info@resolid.tech", subject: "Hello" });
    expect(events).toEqual(["sending:memory:Hello", "sent:memory:Hello:<memory@test>"]);
  });

  it("uses a custom file transporter when provided", async () => {
    const { sent, transporter } = createMemoryTransport();

    const app = await createTestApp({
      from: "info@resolid.tech",
      transporters: { file: transporter },
    });

    await app.$.mailer.send({ to: "admin@resolid.tech", subject: "Custom file" });

    expect(sent).toHaveLength(1);
  });

  it("returns an error for an unknown transporter", async () => {
    const app = await createTestApp({ from: "info@resolid.tech" });
    const errors: string[] = [];

    app.emitter.on("mail:error", (message) => errors.push(message));

    const message = 'Transporter "missing" does not exist. Available transporters: file.';

    await expect(app.$.mailer.send({ to: "admin@resolid.tech" }, "missing")).resolves.toEqual({
      success: false,
      message,
    });
    expect(errors).toEqual([message]);
  });

  it("rejects an unknown default transporter", async () => {
    await expect(
      createTestApp({ from: "info@resolid.tech", defaultTransport: "missing" }),
    ).rejects.toThrow(
      'Default transporter "missing" does not exist. Available transporters: file.',
    );
  });

  it("returns errors from failing transporters", async () => {
    const transporter = {
      sendMail: vi
        .fn()
        .mockRejectedValueOnce(new Error("smtp down"))
        .mockRejectedValueOnce("connection lost"),
      close: vi.fn(),
    } as unknown as Transporter;

    const app = await createTestApp({
      from: "info@resolid.tech",
      transporters: { broken: transporter },
      defaultTransport: "broken",
    });

    const errors: string[] = [];

    app.emitter.on("mail:error", (message) => errors.push(message));

    await expect(app.$.mailer.send({ to: "admin@resolid.tech" })).resolves.toEqual({
      success: false,
      message: "smtp down",
    });
    await expect(app.$.mailer.send({ to: "admin@resolid.tech" })).resolves.toEqual({
      success: false,
      message: "connection lost",
    });
    expect(errors).toEqual(["smtp down", "connection lost"]);
  });

  it("closes every transporter when disposed", async () => {
    const closeFirst = vi.fn();
    const closeSecond = vi.fn();
    const first = { sendMail: vi.fn(), close: closeFirst } as unknown as Transporter;
    const second = { sendMail: vi.fn(), close: closeSecond } as unknown as Transporter;

    const app = await createTestApp({
      from: "info@resolid.tech",
      transporters: { first, second },
      defaultTransport: "first",
    });

    await app.dispose();

    expect(closeFirst).toHaveBeenCalledTimes(1);
    expect(closeSecond).toHaveBeenCalledTimes(1);
  });

  it("closes the remaining transporters when one fails", async () => {
    const close = vi.fn();
    const failing = {
      sendMail: vi.fn(),
      close: () => {
        throw new Error("close failed");
      },
    } as unknown as Transporter;
    const working = { sendMail: vi.fn(), close } as unknown as Transporter;

    const app = await createTestApp({
      from: "info@resolid.tech",
      transporters: { failing, working },
      defaultTransport: "working",
    });

    expect(() => app.$.mailer.dispose()).toThrow("Failed to close 1 mail transporter(s).");
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("reports file write errors", async () => {
    const blocked = nodePath.join(process.cwd(), "runtime", "mail-blocked");

    await mkdir(nodePath.dirname(blocked), { recursive: true });
    await rm(blocked, { force: true });
    await writeFile(blocked, "not a directory", "utf-8");

    const transporter = createMailTransport(new FileTransport(blocked));

    await expect(
      transporter.sendMail({
        from: "info@resolid.tech",
        to: "admin@resolid.tech",
        subject: "Fail",
      }),
    ).rejects.toThrow();

    transporter.close();

    await rm(blocked, { force: true });
  });

  it("reports message normalization errors", async () => {
    const transporter = createMailTransport(
      new FileTransport(nodePath.join(process.cwd(), "runtime", "mail")),
    );

    await expect(
      transporter.sendMail({
        from: "info@resolid.tech",
        to: "admin@resolid.tech",
        subject: "Invalid attachment",
        attachments: [{ path: "/definitely/not/a/real/file" }],
      }),
    ).rejects.toThrow("ENOENT");

    transporter.close();
  });

  it("reports errors thrown before normalization", () => {
    const done = vi.fn();
    const transport = new FileTransport(nodePath.join(process.cwd(), "runtime", "mail"));
    const mail = {
      message: {
        keepBcc: false,
        getEnvelope: () => {
          throw new Error("envelope failed");
        },
      },
    } as unknown as Parameters<FileTransport["send"]>[0];

    transport.send(mail, done);

    expect(done).toHaveBeenCalledWith(expect.objectContaining({ message: "envelope failed" }));
  });

  it("keeps message ids from escaping the mail directory", async () => {
    const app = await createTestApp({ from: "info@resolid.tech" });

    const result = await app.$.mailer.send({
      to: "admin@resolid.tech",
      subject: "Traversal",
      messageId: "<../../escape@resolid.tech>",
    });

    if (!result.success) {
      throw new Error(result.message);
    }

    const file = nodePath.join(process.cwd(), "runtime", "mail", ".._.._escape.txt");
    const escaped = nodePath.join(process.cwd(), "escape.txt");

    await expect(access(escaped)).rejects.toThrow();
    await expect(access(file)).resolves.toBeUndefined();

    await rm(escaped, { force: true });
    await rm(file, { force: true });
  });

  it("falls back to a generic file name for an empty message id", async () => {
    const app = await createTestApp({ from: "info@resolid.tech" });

    const result = await app.$.mailer.send({
      to: "admin@resolid.tech",
      messageId: "<@resolid.tech>",
    });

    if (!result.success) {
      throw new Error(result.message);
    }

    const file = nodePath.join(process.cwd(), "runtime", "mail", "message.txt");

    await expect(access(file)).resolves.toBeUndefined();

    await rm(file, { force: true });
  });
});
