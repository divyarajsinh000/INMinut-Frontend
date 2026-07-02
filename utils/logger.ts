const originalLog = console.log;

export const logger = (...args: any[]) => {
  if (__DEV__) {
    originalLog(...args);
  }
};