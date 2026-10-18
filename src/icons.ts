export type IconName = 'arrow' | 'arrowUp' | 'search' | 'github' | 'book' | 'close' | 'external' | 'shield' | 'back' | 'coffee';
const paths: Record<IconName, string> = {
  arrow: '<path d="M19 12H5m6-6-6 6 6 6"/>',
  arrowUp: '<path d="M17 17 7 7m0 10V7h10"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  github: '<path d="M9 19c-4.3 1.3-4.3-2.2-6-2.6m12 5v-3.4c0-1 .1-1.7-.5-2.3 3.3-.4 6.8-1.6 6.8-7a5.3 5.3 0 0 0-1.4-3.7 5 5 0 0 0-.1-3.6s-1.1-.4-3.8 1.4a13 13 0 0 0-7 0C6.3 1 5.2 1.4 5.2 1.4A5 5 0 0 0 5.1 5a5.3 5.3 0 0 0-1.4 3.7c0 5.4 3.5 6.6 6.8 7-.6.6-.6 1.4-.5 2.3v3.4"/>',
  book: '<path d="M12 7c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V6c-3-1-6-1-9 1Zm0 0v14"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  external: '<path d="M14 3h7v7m0-7L11 13m-1-9H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-5"/>',
  shield: '<path d="M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Z"/><path d="m8 12 3 3 5-6"/>',
  back: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  coffee: '<path d="M4 8h13v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Zm13 1h1a3 3 0 0 1 0 6h-1M3 22h17M7 2v3M12 2v3"/>'
};
export function icon(name: IconName, size = 18): string { return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`; }
