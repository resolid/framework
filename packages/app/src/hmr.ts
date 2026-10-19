export interface HotContext {
  readonly data: Record<string, unknown>;
}

interface DisposableApp {
  dispose: () => Promise<void> | void;
}

const RESOLID_APP = "resolidApp";

export const hotContext: HotContext | undefined = (
  import.meta as ImportMeta & { readonly hot?: HotContext }
).hot;

export async function disposeApp(hot: HotContext): Promise<void> {
  const previous = hot.data[RESOLID_APP] as DisposableApp | undefined;

  hot.data[RESOLID_APP] = undefined;

  try {
    await previous?.dispose();
  } catch (error) {
    console.error("[resolid] Error during hot reload dispose:", error);
  }
}

export function rememberApp(hot: HotContext, app: DisposableApp): void {
  hot.data[RESOLID_APP] = app;
}
