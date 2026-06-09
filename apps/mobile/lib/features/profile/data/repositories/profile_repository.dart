import '../../../../core/network/api_client.dart';
import '../../../auth/data/models/auth_models.dart';

class ProfileRepository {
  final ApiClient _api;

  const ProfileRepository(this._api);

  Future<UserProfile> getMe() async {
    return _api.get<UserProfile>(
      '/users/me',
      fromJson: (json) =>
          UserProfile.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<void> changePassword({
    required String password,
    required String confirmPassword,
  }) async {
    await _api.patch<void>(
      '/users/me/password',
      data: {
        'password': password,
        'confirmPassword': confirmPassword,
      },
    );
  }
}
