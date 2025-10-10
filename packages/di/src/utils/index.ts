export type Disposable = {
  dispose: () => Promise<void> | void;
};

export const isDisposable = (obj: unknown): obj is Disposable =>
  !!obj && typeof (obj as Disposable).dispose === "function";

export const formatChain = <T>(chain: T[], current?: T) => {
  return (current ? [...chain, current] : chain).map(String).join(" -> ");
};
