import type { Dispatch, SetStateAction } from "react";

export type KeyedStateAction<State extends object> =
  | {
      [Key in keyof State]: {
        type: "set";
        field: Key;
        value: SetStateAction<State[Key]>;
      };
    }[keyof State]
  | { type: "patch"; value: Partial<State> };

export function keyedStateReducer<State extends object>(
  state: State,
  action: KeyedStateAction<State>,
): State {
  if (action.type === "patch") {
    return { ...state, ...action.value };
  }

  const current = state[action.field];
  const value =
    typeof action.value === "function"
      ? (action.value as (currentValue: typeof current) => typeof current)(current)
      : action.value;

  return { ...state, [action.field]: value };
}

export function createKeyedStateSetter<State extends object, Key extends keyof State>(
  dispatch: Dispatch<KeyedStateAction<State>>,
  field: Key,
) {
  return (value: SetStateAction<State[Key]>) =>
    dispatch({ type: "set", field, value } as KeyedStateAction<State>);
}
