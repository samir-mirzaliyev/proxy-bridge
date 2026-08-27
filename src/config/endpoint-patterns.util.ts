import type { EndpointPattern } from '../types';

const STATEFUL_FLAGS = ['g', 'y'];

/**
 * Strips the `g` and `y` flags from configured patterns. Those flags make `RegExp.test` advance
 * `lastIndex`, and pattern objects live for the lifetime of the process — a stateful pattern would
 * match on every other request.
 */
export function normalizeEndpointPatterns(patterns: EndpointPattern[]): EndpointPattern[] {
  return patterns.map((pattern) => {
    if (typeof pattern === 'string') {
      return pattern;
    }

    const flags = [...pattern.flags].filter((flag) => !STATEFUL_FLAGS.includes(flag)).join('');

    return flags === pattern.flags ? pattern : new RegExp(pattern.source, flags);
  });
}

export function matchesEndpointPattern(backendPath: string, patterns: EndpointPattern[]) {
  return patterns.some((pattern) =>
    typeof pattern === 'string' ? pattern === backendPath : pattern.test(backendPath),
  );
}
