import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth_state.dart';

/// Base URL for the TukangNDeso API.
///
/// Override this value in CI or a local release build with:
/// flutter build apk --dart-define=API_BASE_URL=https://api.example.com
const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3000',
);

/// Provides a configured Dio instance with auth token injection.
final apiClientProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: kApiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
      contentType: 'application/json',
      responseType: ResponseType.json,
    ),
  );

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) {
        final token = ref.read(authTokenProvider);
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (error, handler) {
        // Log-ready hook; real logging goes to a separate service in production
        return handler.next(error);
      },
    ),
  );

  return dio;
});

/// Wraps an API response for consistent success/error checks.
class ApiResult<T> {
  const ApiResult({required this.success, this.data, this.error});

  final bool success;
  final T? data;
  final ApiError? error;

  bool get hasError => !success || error != null;
}

class ApiError {
  const ApiError({required this.code, required this.message});

  final String code;
  final String message;

  factory ApiError.fromResponse(Map<String, dynamic>? body) {
    if (body == null || body['error'] == null) {
      return const ApiError(
        code: 'UNKNOWN',
        message: 'Terjadi kesalahan tidak diketahui',
      );
    }
    final err = body['error'] as Map<String, dynamic>;
    return ApiError(
      code: (err['code'] as String?) ?? 'UNKNOWN',
      message: (err['message'] as String?) ?? 'Terjadi kesalahan',
    );
  }
}
