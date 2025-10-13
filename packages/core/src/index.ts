import {
  type BindingDefinition,
  type Container,
  createContainer,
  type FactoryConfig,
  type Resolver,
  type Scope,
} from "@resolid/di";
import { env } from "node:process";

export type AppConfig = {
  readonly name: string;
  readonly debug?: boolean;
};

export type AppContext = AppConfig & {
  readonly resolve: Container["resolve"];
};

type ExtensionBoot = (app: AppContext) => void | Promise<void>;

export type Extension<T = unknown, Config extends FactoryConfig = FactoryConfig> = {
  readonly name: symbol;
  readonly boot?: ExtensionBoot;
  readonly factory: (context: { resolver: Resolver; config?: Config; app: AppConfig }) => T | Promise<T>;
  readonly scope?: Scope;
};

export type CreateAppOptions = AppConfig & {
  readonly timezone?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly extensions: (Extension<unknown, any> | [Extension<unknown, any>, FactoryConfig?])[];
};

export type AppInstance = {
  readonly app: { run: () => Promise<void>; dispose: () => Promise<void> };
  readonly context: AppContext;
};

// noinspection JSUnusedGlobalSymbols
export const createApp = ({ name, debug = false, timezone = "UTC", extensions }: CreateAppOptions): AppInstance => {
  env.timezone = timezone;

  const bindings: BindingDefinition[] = [];
  const boots: ExtensionBoot[] = [];

  for (const item of extensions) {
    const [extension, config] = Array.isArray(item) ? item : [item];

    bindings.push({
      name: extension.name,
      factory: ({ resolver, config }) => {
        return extension.factory({ resolver, config, app: { name, debug } });
      },
      scope: extension.scope,
      config,
    });

    if (extension.boot) {
      boots.push(extension.boot);
    }
  }

  const container = createContainer(bindings);

  const appContext: AppContext = {
    name,
    debug,
    resolve: container.resolve,
  };

  return {
    app: {
      run: async () => {
        for (const boot of boots) {
          await boot(appContext);
        }
      },
      dispose: async () => {
        await container.dispose();
      },
    },
    context: appContext,
  };
};
