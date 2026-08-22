import 'package:dio/dio.dart';

import 'api_client.dart';

class RuntimeConfig {
  const RuntimeConfig({
    required this.otpEnabled,
    required this.googleAuthEnabled,
    required this.qrisEnabled,
    required this.googleWebClientId,
  });

  final bool otpEnabled;
  final bool googleAuthEnabled;
  final bool qrisEnabled;
  final String googleWebClientId;

  static const fallback = RuntimeConfig(
    otpEnabled: true,
    googleAuthEnabled: false,
    qrisEnabled: true,
    googleWebClientId: '',
  );

  static Future<RuntimeConfig> load() async {
    final dio = Dio(BaseOptions(baseUrl: kApiBaseUrl));
    try {
      final response = await dio.get<Map<String, dynamic>>('/v1/config/public');
      final data = response.data?['data'] as Map<String, dynamic>?;
      final features = data?['features'] as Map<String, dynamic>?;
      final auth = data?['auth'] as Map<String, dynamic>?;
      return RuntimeConfig(
        otpEnabled: features?['otp_enabled'] as bool? ?? true,
        googleAuthEnabled: features?['google_auth_enabled'] as bool? ?? false,
        qrisEnabled: features?['qris_enabled'] as bool? ?? true,
        googleWebClientId: auth?['google_web_client_id'] as String? ?? '',
      );
    } on Exception {
      return fallback;
    }
  }
}
