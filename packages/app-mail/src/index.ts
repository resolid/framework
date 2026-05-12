import type { ExtensionCreator, PathResolver } from "@resolid/core";
import type { Address, Attachment, Options } from "nodemailer/lib/mailer";
import nodemailer, { type Transport, type Transporter } from "nodemailer";
import { FileTransport } from "./transports/file";

type KnownTransports = Record<string, Transport>;

export type MailConfig<T extends KnownTransports> = {
  from: string | Address | (string | Address)[];
  replyTo?: string | Address | (string | Address)[];
  default?: keyof T | "file";
  transports: Record<keyof T, Transport>;
};

export type MailSendResult =
  | {
      success: true;
      messageId: string;
    }
  | {
      success: false;
      message: string;
    };

export type MailMessage = Options & {
  attachments?: (Attachment & { href?: string })[];
};

export class MailService<T extends KnownTransports> {
  private readonly _from: string | Address | (string | Address)[];
  private readonly _replyTo: string | Address | (string | Address)[] | undefined;
  private readonly _transporters: Record<keyof T | "file", Transporter>;
  private readonly _defaultTransport: keyof T | "file";

  constructor(config: MailConfig<T>, runtimePath: PathResolver) {
    const { default: defaultTransport = "file", transports, from, replyTo } = config;

    this._from = from;
    this._replyTo = replyTo;
    this._defaultTransport = defaultTransport;

    const transporters: Record<string, Transporter> = {};

    for (const key of Object.keys(transports)) {
      transporters[key] = nodemailer.createTransport(transports[key]);
    }

    this._transporters = {
      file: nodemailer.createTransport(new FileTransport(runtimePath("mail"))),
      ...(transporters as Record<keyof T, Transporter>),
    };
  }

  async send(mail: MailMessage, transport?: keyof T | "file"): Promise<MailSendResult> {
    try {
      const message = { from: this._from, replyTo: this._replyTo, ...mail };

      const result =
        await this._transporters[transport ?? this._defaultTransport].sendMail(message);

      return { success: true, messageId: result.messageId };
    } catch (e) {
      return { success: false, message: (e as Error).message };
    }
  }

  dispose(): void {
    for (const key of Object.keys(this._transporters)) {
      this._transporters[key]?.close();
    }
  }
}

export function createMailExtension<T extends KnownTransports>(
  config: MailConfig<T>,
): ExtensionCreator {
  return ({ runtimePath }) => ({
    name: "resolid-mail-module",
    providers: [
      {
        token: MailService,
        factory() {
          return new MailService(config, runtimePath);
        },
      },
    ],
  });
}
