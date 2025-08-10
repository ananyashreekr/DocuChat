// File polyfill for Node.js environment
if (typeof globalThis.File === 'undefined') {
  globalThis.File = class File {
    constructor(chunks, filename, options = {}) {
      this.name = filename;
      this.type = options.type || '';
      this.lastModified = options.lastModified || Date.now();
      this.size = chunks.reduce((acc, chunk) => {
        return acc + (chunk.byteLength || chunk.length || 0);
      }, 0);
      this._chunks = chunks;
    }
    
    async arrayBuffer() {
      return Buffer.concat(this._chunks.map(chunk => Buffer.from(chunk))).buffer;
    }
  };
}