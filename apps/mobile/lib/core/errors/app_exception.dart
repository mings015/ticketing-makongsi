class AppException implements Exception {
  final String message;
  final int? statusCode;

  const AppException(this.message, {this.statusCode});

  @override
  String toString() => message;
}

class UnauthorizedException extends AppException {
  const UnauthorizedException() : super('Sesi habis. Silakan login kembali.', statusCode: 401);
}

class ForbiddenException extends AppException {
  const ForbiddenException() : super('Akses ditolak.', statusCode: 403);
}

class NotFoundException extends AppException {
  const NotFoundException(super.message) : super(statusCode: 404);
}

class NetworkException extends AppException {
  const NetworkException() : super('Tidak dapat terhubung ke server. Periksa koneksi Anda.');
}

class ServerException extends AppException {
  const ServerException() : super('Terjadi kesalahan pada server.');
}
