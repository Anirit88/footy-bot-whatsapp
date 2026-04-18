// Minimal Node.js globals for TypeScript without requiring @types/node locally.
// Vercel runs npm install so @types/node will be available in production builds.

declare class Buffer extends Uint8Array {
  static from(data: ArrayBuffer | SharedArrayBuffer | number[] | string, encoding?: string): Buffer;
  static concat(list: Uint8Array[], totalLength?: number): Buffer;
  static isBuffer(obj: unknown): obj is Buffer;
  toString(encoding?: string): string;
}

declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined;
  }
  interface Process {
    env: ProcessEnv;
    cwd(): string;
  }
}
declare const process: NodeJS.Process;
