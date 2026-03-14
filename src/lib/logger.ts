/**
 * Sistema de logging para produção (renderer)
 * Remove logs desnecessários em produção para melhorar performance
 */

const IS_DEV = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    if (IS_DEV) {
      console.log(...args);
    }
  },

  warn: (...args: unknown[]) => {
    if (IS_DEV) {
      console.warn(...args);
    }
  },

  error: (...args: unknown[]) => {
    console.error(...args);
  },

  debug: (...args: unknown[]) => {
    if (IS_DEV) {
      console.debug(...args);
    }
  },

  info: (...args: unknown[]) => {
    if (IS_DEV) {
      console.info(...args);
    }
  },

  group: (...args: unknown[]) => {
    if (IS_DEV) {
      console.group(...args);
    }
  },

  groupEnd: () => {
    if (IS_DEV) {
      console.groupEnd();
    }
  },
};

export default logger;
