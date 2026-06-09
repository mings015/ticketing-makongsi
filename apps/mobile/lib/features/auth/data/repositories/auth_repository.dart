import '../../../../core/network/api_client.dart';
import '../../../../core/storage/secure_storage_service.dart';
import '../models/auth_models.dart';

class AuthRepository {
  final ApiClient _api;
  final SecureStorageService _storage;

  const AuthRepository(this._api, this._storage);

  Future<UserProfile> login({
    required String email,
    required String password,
  }) async {
    final data = await _api.post<Map<String, dynamic>>(
      '/auth/login',
      data: {'email': email, 'password': password},
      fromJson: (json) => json as Map<String, dynamic>,
    );

    await _storage.saveTokens(
      accessToken: data['accessToken'] as String,
      refreshToken: data['refreshToken'] as String,
    );

    return UserProfile.fromJson(data['user'] as Map<String, dynamic>);
  }

  Future<void> logout() async {
    final refreshToken = await _storage.getRefreshToken();
    try {
      await _api.post<void>(
        '/auth/logout',
        data: {'refreshToken': refreshToken},
      );
    } finally {
      await _storage.clearTokens();
    }
  }

  Future<UserProfile?> tryAutoLogin() async {
    final token = await _storage.getAccessToken();
    if (token == null) return null;

    try {
      return await _api.get<UserProfile>(
        '/users/me',
        fromJson: (json) => UserProfile.fromJson(json as Map<String, dynamic>),
      );
    } catch (_) {
      return null;
    }
  }
}
