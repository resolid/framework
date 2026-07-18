import type { Emitter, ExtensionCreator, PathResolver } from "@resolid/app";
import type { Address, Attachment, Options } from "nodemailer/lib/mailer";
import nodemailer, { createTransport, type Transport, type Transporter } from "nodemailer";
import { FileTransport } from "./transports/file";

export type MailConfig = {
  from: string | Address | (string | Address)[];
  replyTo?: string | Address | (string | Address)[];
  transporters: Record<string, Transporter>;
  defaultTransport?: string;
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

interface AppMailEvents {
  "mail:sending": [string, MailMessage];
  "mail:error": [string];
  "mail:sent": [string, MailMessage, string];
}

declare module "@resolid/app" {
  // oxlint-disable-next-line typescript/no-empty-object-type
  export interface AppEvents extends AppMailEvents {}
}

export class MailService {
  private readonly _emitter: Emitter<AppMailEvents>;
  private readonly _from: string | Address | (string | Address)[];
  private readonly _replyTo: string | Address | (string | Address)[] | undefined;
  private readonly _transporters: Record<string, Transporter>;
  private readonly _defaultTransport: string;

  constructor(config: MailConfig, runtimePath: PathResolver, emitter: Emitter) {
    this._emitter = emitter;

    const { defaultTransport = "file", transporters, from, replyTo } = config;

    this._from = from;
    this._replyTo = replyTo;
    this._defaultTransport = defaultTransport;

    this._transporters = {
      file: nodemailer.createTransport(new FileTransport(runtimePath("mail"))),
      ...transporters,
    };
  }

  async send(mail: MailMessage, transport?: string): Promise<MailSendResult> {
    const message = { from: this._from, replyTo: this._replyTo, ...mail };

    const current = transport ?? this._defaultTransport;
    const transporter = this._transporters[current];

    this._emitter.emit("mail:sending", current, message);

    if (!transporter) {
      const errorMessage = `Transporter "${current}" is not exists`;
      this._emitter.emit("mail:error", errorMessage);

      return { success: false, message: errorMessage };
    }

    try {
      const result = await transporter.sendMail(message);
      this._emitter.emit("mail:sent", current, message, result.messageId);

      return { success: true, messageId: result.messageId };
    } catch (e) {
      this._emitter.emit("mail:error", (e as Error).message);

      return { success: false, message: (e as Error).message };
    }
  }

  dispose(): void {
    for (const key of Object.keys(this._transporters)) {
      this._transporters[key]?.close();
    }
  }
}

export function createMailExtension(config: MailConfig): ExtensionCreator {
  return ({ runtimePath, emitter }) => ({
    name: "resolid-mail-module",
    providers: [
      {
        token: MailService,
        factory() {
          return new MailService(config, runtimePath, emitter);
        },
      },
    ],
  });
}

export type MailTransport = Transport;

export const createMailTransport: typeof createTransport = createTransport;
