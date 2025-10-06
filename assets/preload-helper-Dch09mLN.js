// Preload helper module
// This prevents import errors for missing dependency

export const _ = (fn, deps = [], url) => {
  // Simple implementation to prevent errors
  if (typeof fn === 'function') {
    try {
      return fn();
    } catch (e) {
      console.warn('Preload helper error:', e);
    }
  }
  return Promise.resolve();
};
