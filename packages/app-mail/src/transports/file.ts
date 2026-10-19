import type { MailMessage, SentMessageInfo, Transport } from "nodemailer";
import { mkdir, writeFile } from "node:fs/promises";
import nodePath from "node:path";
import { version } from "../../package.json";

function getMessageFileName(messageId: string): string {
  const [filename = "message"] = messageId.replaceAll(/^<|>$/g, "").split("@");

  return filename.replaceAll(/[^\w.-]/g, "_") || "message";
}

export class FileTransport implements Transport {
  public name: string = "FileTransport";
  public version: string;

  private readonly _path: string;

  constructor(path: string) {
    this.version = version;
    this._path = path;
  }

  send(mail: MailMessage, done: (err: Error | null, info?: SentMessageInfo) => void): void {
    try {
      mail.message.keepBcc = true;

      const envelope = mail.message.getEnvelope();
      const messageId = mail.message.messageId();
      const file = nodePath.join(this._path, `${getMessageFileName(messageId)}.txt`);

      setImmediate(() => {
        mail.normalize((error, data) => {
          if (error) {
            done(error);
            return;
          }

          delete data.envelope;
          delete data.normalizedHeaders;

          void (async () => {
            try {
              await mkdir(this._path, { recursive: true });
              await writeFile(file, JSON.stringify(data), "utf-8");
            } catch (writeError) {
              done(writeError as Error);
              return;
            }

            done(null, { envelope, messageId });
          })();
        });
      });
    } catch (error) {
      done(error as Error);
    }
  }

  close(): void {}
}
