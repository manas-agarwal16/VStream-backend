class ApiError extends Error {
  // Error is a predefined class in node.js containing all properties of error
  constructor(statusCode, message = "Something went wrong", errors = []) {
    // errors = [] for handling multiple errors if there.
    super(message), //Error class constructor expects only one argument i.e message
      (this.message = message),
      (this.statusCode = statusCode),
      (this.errors = errors),
      this.success = false // error dont proceed
  }
}
