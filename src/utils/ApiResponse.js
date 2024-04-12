class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    (this.statusCode = statusCode),
      (this.data = data),
      (this.message = message);
    this.success = statusCode < 400; // above and at 400 => error statusCode below it is sucess.
  }
}

export {ApiResponse};