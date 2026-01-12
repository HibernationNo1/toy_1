export type CancelFn = () => void;

export const createInterval = (intervalSeconds: number, callback: () => void): CancelFn => {
  let running = true;
  task.spawn(() => {
    while (running) {
      task.wait(intervalSeconds);
      if (!running) {
        break;
      }
      callback();
    }
  });

  return () => {
    running = false;
  };
};

export const createDebouncer = (delaySeconds: number, callback: () => void): (() => void) => {
  let scheduled = false;
  return () => {
    if (scheduled) {
      return;
    }
    scheduled = true;
    task.delay(delaySeconds, () => {
      scheduled = false;
      callback();
    });
  };
};
