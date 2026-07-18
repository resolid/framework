# Mail module for Resolid applications

![GitHub License](https://img.shields.io/github/license/resolid/framework)
![NPM Version](https://img.shields.io/npm/v/%40resolid/app-mail)

<b>[Documentation](https://www.resolid.tech/docs/mail)</b> | [Framework Bundle](https://github.com/resolid/framework)

## Installation

```shell
pnpm add @resolid/app-mail
# or
npm install @resolid/app-mail
# or
yarn add @resolid/app-mail
# or
bun add @resolid/app-mail
```

## Usage

```ts
import { createApp } from "@resolid/app";
import { createMailExtension, type MailConfig, MailService } from "@resolid/app-mail";

const mailConfig: MailConfig = { from: "info@resolid.tech" };

const app = createApp<{
  mailer: MailService;
}>({
  name: "App",
  extensions: [createMailExtension(mailConfig)],
  expose: {
    mailer: {
      token: MailService,
    },
  },
});

app.$.mailer.send({ to: "user@resolid.tech", subject: "Email" });
```

> For more information, see the official Nodemailer website: [https://nodemailer.com/](https://nodemailer.com/)

## Acknowledgment

- [nodemailer](https://github.com/nodemailer/nodemailer)

## License

MIT License (MIT). Please see [LICENSE](./LICENSE) for more information.
