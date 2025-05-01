import type { StoreApi } from "zustand";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function createSelectors<TState extends Record<string, any>>(
  store: StoreApi<TState>
) {
  const selectors = {} as {
    [K in keyof TState as `use${Capitalize<string & K>}`]: () => TState[K];
  } & {
    useStoreState: () => TState;
  };

  // Get all state keys from the initial state
  const stateKeys = Object.keys(store.getState()) as Array<keyof TState>;

  // Create a selector for each state key
  stateKeys.forEach((key) => {
    const selectorName = `use${capitalize(key as string)}` as `use${Capitalize<
      string & keyof TState
    >}`;
    selectors[selectorName] = () => {
      return store.getState()[key as keyof TState];
    };
  });

  // Create a selector for the entire state
  selectors.useStoreState = () => store.getState();

  return selectors;
}

// Helper function to capitalize the first letter
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
