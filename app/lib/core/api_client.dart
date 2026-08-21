import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

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

/// Compatibility client for legacy screens that have not yet migrated to
/// Riverpod's [apiClientProvider].
class ApiClient {
  ApiClient._()
      : _dio = Dio(
          BaseOptions(
            baseUrl:
                '${kApiBaseUrl.replaceFirst(RegExp(r'/\$'), '')}/v1',
            connectTimeout: const Duration(seconds: 10),
            receiveTimeout: const Duration(seconds: 15),
            contentType: 'application/json',
            responseType: ResponseType.json,
          ),
        );

  static final ApiClient instance = ApiClient._();
  static const FlutterSecureStorage _storage = FlutterSecureStorage();
  static const String _tokenKey = 'tukangndeso_token';

  final Dio _dio;

  Future<Options> _options() async {
    final token = await _storage.read(key: _tokenKey);
    return Options(
      headers: {
        if (token != null && token.isNotEmpty)
          'Authorization': 'Bearer $token',
      },
    );
  }

  Future<Map<String, dynamic>?> get(String path) async {
    final response = await _dio.get<dynamic>(
      path,
      options: await _options(),
    );
    return _unwrap(response.data);
  }

  Future<Map<String, dynamic>?> post(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final response = await _dio.post<dynamic>(
      path,
      data: body,
      options: await _options(),
    );
    return _unwrap(response.data);
  }

  Future<Map<String, dynamic>?> patch(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final response = await _dio.patch<dynamic>(
      path,
      data: body,
      options: await _options(),
    );
    return _unwrap(response.data);
  }

  Map<String, dynamic>? _unwrap(dynamic responseBody) {
    if (responseBody is! Map<String, dynamic>) {
      return null;
    }

    if (responseBody['success'] == false) {
      final error = responseBody['error'];
      final message = error is Map<String, dynamic>
          ? error['message']?.toString()
          : null;
      throw Exception(message ?? 'Permintaan API gagal');
    }

    final data = responseBody['data'];
    if (data == null) return null;
    if (data is Map<String, dynamic>) return data;
    return {'value': data};
  }
}
