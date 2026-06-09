import 'dart:io';

class AppConfig {
  // Android emulator → 10.0.2.2, iOS simulator → localhost
  // Real device → set to your machine IP, e.g. http://192.168.1.100:3000
  static String get baseUrl {
    if (Platform.isAndroid) return 'http://10.0.2.2:3000';
    return 'http://localhost:3000';
  }

  static const Duration connectTimeout = Duration(seconds: 10);
  static const Duration receiveTimeout = Duration(seconds: 15);
}
