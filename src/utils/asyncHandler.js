//const asyncHandler = (fn) => () => {} . higher order function taking fn as input.
const asyncHandler = (fn) => {
  return (req, res, next) => {
    //next (a function to call the next middleware function in the stack.
    Promise.resolve(fn(req, res, next)).catch((error) => {
      next(error); //next(error), passing the error to the next middleware in the chain.(stack)
    });
  };
};

export { asyncHandler };
