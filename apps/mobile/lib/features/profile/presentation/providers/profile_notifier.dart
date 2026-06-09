import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/providers/core_providers.dart';
import '../../data/repositories/profile_repository.dart';
import '../../../auth/data/models/auth_models.dart';

final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  return ProfileRepository(ref.read(apiClientProvider));
});

final profileProvider = FutureProvider.autoDispose<UserProfile>((ref) {
  return ref.read(profileRepositoryProvider).getMe();
});
