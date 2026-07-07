export class ApiError extends Error {
  constructor(
    public readonly errorName: string,
    public readonly status: number,
    message?: string,
  ) {
    super(message ?? errorName);
  }

  static userAlreadyExist() {
    return new ApiError("UserAlreadyExist", 409, "Username is already taken");
  }

  static invalidUsernameAndPassword() {
    return new ApiError("InvalidUsernameAndPassword", 401);
  }

  static maxAllowedRetriesExceeded() {
    return new ApiError("MaxAllowedRetriesExceeded", 429);
  }

  static videoNotFound() {
    return new ApiError("VideoNotFound", 404);
  }

  static unauthorized() {
    return new ApiError("Unauthorized", 401);
  }

  static validation(message: string) {
    return new ApiError("ValidationError", 400, message);
  }

  static notFound() {
    return new ApiError("NotFound", 404);
  }
}

export function errorResponse(error: ApiError): Response {
  return Response.json(
    { error: error.errorName, message: error.message },
    { status: error.status },
  );
}
