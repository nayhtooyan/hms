const asyncHandler = (fn) => (...args) => {
  const next = args[args.length - 1];

  Promise.resolve(fn(...args)).catch(next);
};

module.exports = asyncHandler;