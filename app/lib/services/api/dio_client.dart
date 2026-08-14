import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tukangndeso/core/config/app_config.dart';
import 'package:tukangndeso/services/storage/token_storage.dart';

final dioClientProvider = Provider<DioClient>((ref) {
  return DioClient(ref);
});

/// Configured Dio HTTP client with auth interceptor
class DioClient {
  DioClient(this._ref) {
    _dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.addAll([
      _AuthInterceptor(_ref),
      if (AppConfig.isDevelopment) LogInterceptor(
        requestBody: true,
        responseBody: true,
        logPrint: (obj) => print('[DIO] $obj'),
      ),
    ]);
  }

  final Ref _ref;
  late final Dio _dio;

  Dio get dio => _dio;
}

/// Interceptor that adds auth token and handles 401 refresh
class _AuthInterceptor extends Interceptor {
  _AuthInterceptor(this._ref);

  final Ref _ref;

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final tokenStorage = _ref.read(tokenStorageProvider);
    final token = await tokenStorage.getAccessToken();

    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }

    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // Try to refresh token
      final tokenStorage = _ref.read(tokenStorageProvider);
      final refreshToken = await tokenStorage.getRefreshToken();

      if (refreshToken != null) {
        try {
          final dio = Dio(BaseOptions(baseUrl: AppConfig.baseUrl));
          final response = await dio.post('/auth/refresh', data: {
            'refresh_token': refreshToken,
          });

          if (response.data['success'] == true) {
            final newToken = response.data['data']['token'] as String;
            final newRefresh = response.data['data']['refresh_token'] as String;

            await tokenStorage.saveTokens(
              accessToken: newToken,
              refreshToken: newRefresh,
            );

            // Retry original request with new token
            err.requestOptions.headers['Authorization'] = 'Bearer $newToken';
            final retryResponse = await dio.fetch(err.requestOptions);
            return handler.resolve(retryResponse);
          }
        } catch (_) {
          // Refresh failed — clear tokens, force re-login
          await tokenStorage.clearTokens();
        }
      }
    }

    handler.next(err);
  }
}
