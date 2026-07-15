declare module "unzipper" {
  import { Readable, Transform } from "node:stream";

  interface Entry extends Readable {
    path: string;
    type: "File" | "Directory";
    autodrain(): void;
  }

  interface ParseStream extends Transform {
    [Symbol.asyncIterator](): AsyncIterableIterator<Entry>;
  }

  function Parse(): ParseStream;

  const _default: { Parse: typeof Parse };
  export default _default;
  export { Parse };
}
