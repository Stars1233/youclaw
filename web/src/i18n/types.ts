import type { en } from './en'

// Widen all literal strings to string, preserving structure
type DeepStringify<T> = {
  readonly [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends readonly string[]
      ? readonly string[]
      : DeepStringify<T[K]>
}

export type Translations = DeepStringify<typeof en>
