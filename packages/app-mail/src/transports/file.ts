import type { Transport } from "nodemailer";
import type MailMessage from "nodemailer/lib/mailer/mail-message";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import nodePath from "node:path";
import { version } from "../../package.json";

export class FileTransport implements Transport {
  public name: string = "FileTransport";
  public version: string;

  private readonly _path: string;

  constructor(path: string) {
    this.version = version;
    this._path = path;
  }

  send(mail: MailMessage, done: (err: Error | null, info?: { messageId: string }) => void): void {
    mail.message.keepBcc = true;

    const messageId = mail.message.messageId();

    if (!existsSync(this._path)) {
      mkdirSync(this._path, { recursive: true });
    }

    const [filename] = messageId.replace("<", "").replace(">", "").split("@");

    const file = nodePath.join(this._path, `${filename}.txt`);

    setImmediate(() => {
      mail.normalize((err, data) => {
        if (err) {
          return done(err);
        }

        if (data) {
          delete data.envelope;
          // @ts-expect-error normalizedHeaders
          delete data.normalizedHeaders;

          writeFileSync(file, JSON.stringify(data));

          return done(null, {
            messageId,
          });
        }
      });
    });
  }

  close(): void {}
}
