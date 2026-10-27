/**
 * Pack-owned play-shell UI — lazy components built from `GameDefinition.shell`
 * loaders. Shared play surfaces never import pack UI paths directly.
 */
import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type {
  GameDefinition,
  ShellCompleteProps,
  ShellUiLoader,
} from "@/engine/definition";

// One lazy component per loader so re-renders don't remount pack UI.
const cache = new WeakMap<ShellUiLoader<never>, LazyExoticComponent<ComponentType<never>>>();

function toLazy<P>(
  loader: ShellUiLoader<P> | false | undefined
): LazyExoticComponent<ComponentType<P>> | null {
  if (typeof loader !== "function") return null;
  let comp = cache.get(loader as ShellUiLoader<never>);
  if (!comp) {
    comp = lazy(loader as ShellUiLoader<never>);
    cache.set(loader as ShellUiLoader<never>, comp);
  }
  return comp as unknown as LazyExoticComponent<ComponentType<P>>;
}

export function getShellIntro(definition: Pick<GameDefinition, "shell">) {
  return toLazy(definition.shell?.intro);
}

export function getShellCanvasFx(definition: Pick<GameDefinition, "shell">) {
  return toLazy(definition.shell?.canvasFx);
}

export function getShellComplete(definition: Pick<GameDefinition, "shell">) {
  const complete = definition.shell?.complete;
  return complete === "generic"
    ? null
    : toLazy<ShellCompleteProps>(complete);
}
