import { type BindingDefinition, createContainer, type FactoryConfig, type Resolver, type Scope } from "@resolid/di";
import { createEmitter, type Emitter } from "@resolid/event";
import { env } from "node:process";

export type AppConfig = {
  readonly name: string;
  readonly debug?: boolean;
  readonly timezone?: string;
};

export type AppContext = AppConfig & {
  emitter: Emitter;
};

export type AppRuntime = AppContext & {
  readonly resolve: <T>(key: string) => Promise<T>;
};

type ExtensionBoot = (runtime: AppRuntime) => void | Promise<void>;

export type Extension<T = unknown> = {
  readonly name: string;
  readonly boot?: ExtensionBoot;
  readonly factory: (options: { resolver: Resolver; context: AppContext }) => T | Promise<T>;
  readonly scope?: Scope;
};

export type ExtensionBuilder<T = unknown, C extends FactoryConfig = FactoryConfig, P = void> = P extends void
  ? (options?: { config?: C }) => Extension<T>
  : (options: { config?: C; bindings: P }) => Extension<T>;

export type CreateAppOptions<Services extends Record<string, unknown>> = AppConfig & {
  readonly extensions: {
    key: string;
    extension: Extension;
  }[];
  readonly instanceProps?: { [K in keyof Services]: string };
};

export type AppInstance<Services extends Record<string, unknown>> = {
  run: () => Promise<void>;
  dispose: () => Promise<void>;
} & AppRuntime &
  Services;

// noinspection JSUnusedGlobalSymbols
export const createApp = async <Services extends Record<string, unknown> = Record<string, never>>({
  name,
  debug = false,
  timezone = "UTC",
  extensions,
  instanceProps,
}: CreateAppOptions<Services>): Promise<AppInstance<Services>> => {
  env.timezone = timezone;

  const emitter = createEmitter();

  const context: AppContext = {
    name,
    debug,
    timezone,
    emitter,
  };

  const bindings: BindingDefinition[] = [];
  const boots: ExtensionBoot[] = [];

  for (const item of extensions) {
    bindings.push({
      name: item.key,
      factory: ({ resolver }) => {
        return item.extension.factory({ resolver, context });
      },
      scope: item.extension.scope,
    });

    if (item.extension.boot) {
      boots.push(item.extension.boot);
    }
  }

  const container = createContainer(bindings);

  const runtime = {
    ...context,
    resolve: container.resolve,
  };

  const services: Partial<Services> = {};

  if (instanceProps) {
    for (const [propKey, bindingName] of Object.entries(instanceProps)) {
      services[propKey as keyof Services] = await container.resolve(bindingName);
    }
  }

  let running = false;

  return {
    run: async () => {
      if (!running) {
        for (const boot of boots) {
          await boot(runtime);
        }

        running = true;

        emitter.emit("app:ready");
      }
    },
    dispose: async () => {
      await container.dispose();
      emitter.offAll();
    },
    ...runtime,
    ...services,
  } as AppInstance<Services>;
};
