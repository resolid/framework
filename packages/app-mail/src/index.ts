import type { AppEvents, Emitter, ExtensionCreator, PathResolver } from "@resolid/app";
import {
  createTransport,
  type Address,
  type SendMailOptions,
  type Transport,
  type Transporter,
} from "nodemailer";
import { FileTransport } from "./transports/file";

export type MailConfig = {
  from: string | Address | (string | Address)[];
  replyTo?: string | Address | (string | Address)[];
  transporters?: Record<string, Transporter>;
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

export type MailMessage = SendMailOptions;

interface AppMailEvents {
  "mail:sending": [string, MailMessage];
  "mail:error": [string];
  "mail:sent": [string, MailMessage, string];
}

declare module "@resolid/app" {
  // oxlint-disable-next-line typescript/no-empty-object-type
  export interface AppEvents extends AppMailEvents {}
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class MailService {
  private readonly _emitter: Emitter<AppEvents>;
  private readonly _from: MailConfig["from"];
  private readonly _replyTo: MailConfig["replyTo"];
  private readonly _transporters: Record<string, Transporter>;
  private readonly _defaultTransport: string;

  private _disposed = false;

  constructor(config: MailConfig, runtimePath: PathResolver, emitter: Emitter<AppEvents>) {
    const { defaultTransport = "file", transporters = {}, from, replyTo } = config;

    const transportNames = ["file", ...Object.keys(transporters).filter((name) => name !== "file")];

    if (!transportNames.includes(defaultTransport)) {
      throw new Error(
        `Default transporter "${defaultTransport}" does not exist. Available transporters: ${transportNames.join(", ")}.`,
      );
    }

    this._emitter = emitter;
    this._from = from;
    this._replyTo = replyTo;
    this._defaultTransport = defaultTransport;
    this._transporters = { ...transporters };

    this._transporters.file ??= createTransport(new FileTransport(runtimePath("mail")));
  }

  async send(mail: MailMessage, transport?: string): Promise<MailSendResult> {
    const message: MailMessage = { from: this._from, replyTo: this._replyTo, ...mail };

    const current = transport ?? this._defaultTransport;
    const transporter = this._transporters[current];

    this._emitter.emit("mail:sending", current, message);

    if (!transporter) {
      const errorMessage = `Transporter "${current}" does not exist. Available transporters: ${Object.keys(this._transporters).join(", ")}.`;

      this._emitter.emit("mail:error", errorMessage);

      return { success: false, message: errorMessage };
    }

    try {
      const result = await transporter.sendMail(message);

      this._emitter.emit("mail:sent", current, message, result.messageId);

      return { success: true, messageId: result.messageId };
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      this._emitter.emit("mail:error", errorMessage);

      return { success: false, message: errorMessage };
    }
  }

  dispose(): void {
    if (this._disposed) {
      return;
    }

    this._disposed = true;

    const errors: unknown[] = [];

    for (const transporter of Object.values(this._transporters)) {
      try {
        transporter.close();
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(errors, `Failed to close ${errors.length} mail transporter(s).`);
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
