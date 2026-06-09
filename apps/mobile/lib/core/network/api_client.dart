import 'package:dio/dio.dart';
import '../config/app_config.dart';
import '../errors/app_exception.dart';
import '../storage/secure_storage_service.dart';
import 'auth_interceptor.dart';

class ApiClient {
  late final Dio _dio;

  ApiClient(SecureStorageService storage, {void Function()? onSessionExpired}) {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.baseUrl,
        connectTimeout: AppConfig.connectTimeout,
        receiveTimeout: AppConfig.receiveTimeout,
        headers: {'Content-Type': 'application/json'},
        // Treat 401 as an error so AuthInterceptor.onError can intercept it
        validateStatus: (status) => status != null && status < 500 && status != 401,
      ),
    );

    _dio.interceptors.add(
      AuthInterceptor(_dio, storage, onSessionExpired: onSessionExpired),
    );
  }

  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final response = await _dio.get(path, queryParameters: queryParameters);
      _handleError(response);
      return fromJson != null ? fromJson(response.data) : response.data as T;
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  Future<T> post<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final response = await _dio.post(path, data: data);
      _handleError(response);
      return fromJson != null ? fromJson(response.data) : response.data as T;
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  Future<T> patch<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final response = await _dio.patch(path, data: data);
      _handleError(response);
      return fromJson != null ? fromJson(response.data) : response.data as T;
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  void _handleError(Response response) {
    final status = response.statusCode ?? 0;
    if (status == 403) throw const ForbiddenException();
    if (status == 404) {
      final msg = (response.data as Map?)?['error'] ?? 'Tidak ditemukan';
      throw NotFoundException(msg.toString());
    }
    if (status >= 400) {
      final msg = (response.data as Map?)?['error'] ?? 'Terjadi kesalahan';
      throw AppException(msg.toString(), statusCode: status);
    }
  }

  AppException _mapDioError(DioException e) {
    if (e.error is AppException) return e.error as AppException;
    final status = e.response?.statusCode;
    final data = e.response?.data;
    final msg = (data is Map) ? data['error']?.toString() : null;

    if (status == 401) {
      final path = e.requestOptions.path;
      if (path.contains('/auth/login')) {
        return AppException(msg ?? 'Email atau password salah', statusCode: 401);
      }
      return const UnauthorizedException();
    }
    if (status == 403) return const ForbiddenException();
    if (status == 404) return NotFoundException(msg ?? 'Tidak ditemukan');
    if (status != null && status >= 400) {
      return AppException(msg ?? 'Terjadi kesalahan', statusCode: status);
    }
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.connectionError) {
      return const NetworkException();
    }
    return const ServerException();
  }
}
