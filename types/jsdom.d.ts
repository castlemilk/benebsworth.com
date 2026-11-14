/** Narrow surface used by our inert exported-HTML checks; no script execution API. */
declare module 'jsdom' {
  export class JSDOM {
    constructor(input?: string | Buffer, options?: { contentType?: string })
    window: { document: Document; close(): void }
  }
}
