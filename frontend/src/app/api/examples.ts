import lobbyDeveloperJson from '../../../../contracts/api/examples/lobby-developer.json';
import lobbyScrumMasterJson from '../../../../contracts/api/examples/lobby-scrum-master.json';
import revealedDeveloperJson from '../../../../contracts/api/examples/revealed-developer.json';
import revealedScrumMasterJson from '../../../../contracts/api/examples/revealed-scrum-master.json';
import votingDeveloperJson from '../../../../contracts/api/examples/voting-developer.json';
import votingScrumMasterJson from '../../../../contracts/api/examples/voting-scrum-master.json';
import type { components } from './schema';

export type SessionView = components['schemas']['SessionView'];

type RequiredKeys<S> = {
  [K in keyof S]-?: object extends Pick<S, K> ? never : K;
}[keyof S];

type Exact<T, S> = T extends readonly (infer E)[]
  ? NonNullable<S> extends readonly (infer F)[]
    ? readonly Exact<E, F>[]
    : never
  : T extends object
    ? NonNullable<S> extends object
      ? {
          [K in keyof T]: K extends keyof NonNullable<S> ? Exact<T[K], NonNullable<S>[K]> : never;
        } & {
          [K in Exclude<RequiredKeys<NonNullable<S>>, keyof T>]: never;
        }
      : never
    : T extends null
      ? null extends S
        ? T
        : never
      : T extends string
        ? NonNullable<S> extends string
          ? T
          : never
        : T extends number
          ? NonNullable<S> extends number
            ? T
            : never
          : T extends boolean
            ? NonNullable<S> extends boolean
              ? T
              : never
            : never;

export const lobbyScrumMaster = lobbyScrumMasterJson satisfies Exact<
  typeof lobbyScrumMasterJson,
  SessionView
> as SessionView;
export const lobbyDeveloper = lobbyDeveloperJson satisfies Exact<
  typeof lobbyDeveloperJson,
  SessionView
> as SessionView;
export const votingScrumMaster = votingScrumMasterJson satisfies Exact<
  typeof votingScrumMasterJson,
  SessionView
> as SessionView;
export const votingDeveloper = votingDeveloperJson satisfies Exact<
  typeof votingDeveloperJson,
  SessionView
> as SessionView;
export const revealedScrumMaster = revealedScrumMasterJson satisfies Exact<
  typeof revealedScrumMasterJson,
  SessionView
> as SessionView;
export const revealedDeveloper = revealedDeveloperJson satisfies Exact<
  typeof revealedDeveloperJson,
  SessionView
> as SessionView;
