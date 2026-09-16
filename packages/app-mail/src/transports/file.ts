import type { Transport, MailMessage, SentMessageInfo } from "nodemailer";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import nodePath from "node:path";
import { version } from "../../package.json";

export interface FileSentMessageInfo extends SentMessageInfo {
  messageId: string;
}

export class FileTransport implements Transport {
  public name: string = "FileTransport";
  public version: string;

  private readonly _path: string;

  constructor(path: string) {
    this.version = version;
    this._path = path;
  }

  send(
    mail: MailMessage<FileSentMessageInfo>,
    done: (err: Error | null, info?: FileSentMessageInfo) => void,
  ): void {
    mail.message!.keepBcc = true;

    const envelope = mail.message!.getEnvelope();
    const messageId = mail.message!.messageId();

    // oxlint-disable-next-line node/no-sync
    if (!existsSync(this._path)) {
      // oxlint-disable-next-line node/no-sync
      mkdirSync(this._path, { recursive: true });
    }

    const [filename] = messageId.replace("<", "").replace(">", "").split("@");

    const file = nodePath.join(this._path, `${filename}.txt`);

    setImmediate(() => {
      mail.normalize((err, data) => {
        if (err) {
          return done(err);
        }

        delete data.envelope;
        delete data.normalizedHeaders;

        // oxlint-disable-next-line node/no-sync
        writeFileSync(file, JSON.stringify(data), "utf-8");

        return done(null, {
          envelope,
          messageId,
        });
      });
    });
  }

  close(): void {}
}
