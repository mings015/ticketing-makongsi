import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';
import '../storage/secure_storage_service.dart';
import '../../features/auth/presentation/providers/auth_notifier.dart';

final secureStorageProvider = Provider<SecureStorageService>(
  (_) => SecureStorageService(),
);

final apiClientProvider = Provider<ApiClient>((ref) {
  final storage = ref.read(secureStorageProvider);
  return ApiClient(
    storage,
    onSessionExpired: () {
      ref.read(authNotifierProvider.notifier).forceLogout();
    },
  );
});
