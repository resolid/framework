import { type BindingDefinition, createContainer, type FactoryConfig, type Resolver, type Scope } from "@resolid/di";
import { env } from "node:process";

export type AppConfig = {
  readonly name: string;
  readonly debug?: boolean;
};

export type AppContext = AppConfig & {
  readonly resolve: <T>(key: string) => Promise<T>;
};

type ExtensionBoot = (app: AppContext) => void | Promise<void>;

export type Extension<T = unknown, Config extends FactoryConfig = FactoryConfig> = {
  readonly name: string;
  readonly boot?: ExtensionBoot;
  readonly factory: (context: { resolver: Resolver; config?: Config; app: AppConfig }) => T | Promise<T>;
  readonly scope?: Scope;
};

export type CreateAppOptions = AppConfig & {
  readonly timezone?: string;
  readonly extensions: {
    key: string;
    extension: Extension;
    config?: FactoryConfig;
  }[];
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
    bindings.push({
      name: item.key,
      factory: ({ resolver, config }) => {
        return item.extension.factory({ resolver, config, app: { name, debug } });
      },
      scope: item.extension.scope,
      config: item.config,
    });

    if (item.extension.boot) {
      boots.push(item.extension.boot);
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
