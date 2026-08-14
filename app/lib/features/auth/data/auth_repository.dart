import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tukangndeso/core/constants/api_endpoints.dart';
import 'package:tukangndeso/services/api/api_response.dart';
import 'package:tukangndeso/services/api/dio_client.dart';
import 'package:tukangndeso/services/storage/token_storage.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref);
});

class AuthRepository {
  AuthRepository(this._ref);

  final Ref _ref;

  Dio get _dio => _ref.read(dioClientProvider).dio;
  TokenStorage get _tokenStorage => _ref.read(tokenStorageProvider);

  /// Request OTP for the given phone number
  Future<ApiResponse<Map<String, dynamic>>> requestOtp(String phone) async {
    try {
      final response = await _dio.post(
        ApiEndpoints.otpRequest,
        data: {'phone': phone},
      );
      return ApiResponse.fromJson(response.data, (d) => d as Map<String, dynamic>);
    } on DioException catch (e) {
      return _handleDioError(e);
    }
  }

  /// Verify OTP code
  Future<ApiResponse<Map<String, dynamic>>> verifyOtp(
    String phone,
    String code,
  ) async {
    try {
      final response = await _dio.post(
        ApiEndpoints.otpVerify,
        data: {'phone': phone, 'code': code},
      );

      final apiResponse = ApiResponse.fromJson(
        response.data,
        (d) => d as Map<String, dynamic>,
      );

      if (apiResponse.success && apiResponse.data != null) {
        final data = apiResponse.data!;
        await _tokenStorage.saveTokens(
          accessToken: data['token'] as String,
          refreshToken: data['refresh_token'] as String,
        );
        final user = data['user'] as Map<String, dynamic>;
        await _tokenStorage.saveUserInfo(
          userId: user['id'] as String,
          role: user['role'] as String,
        );
      }

      return apiResponse;
    } on DioException catch (e) {
      return _handleDioError(e);
    }
  }

  /// Complete profile after OTP
  Future<ApiResponse<Map<String, dynamic>>> completeProfile({
    required String name,
    String? email,
  }) async {
    try {
      final response = await _dio.post(
        ApiEndpoints.register,
        data: {
          'name': name,
          if (email != null && email.isNotEmpty) 'email': email,
        },
      );
      return ApiResponse.fromJson(response.data, (d) => d as Map<String, dynamic>);
    } on DioException catch (e) {
      return _handleDioError(e);
    }
  }

  /// Logout — revoke tokens
  Future<void> logout() async {
    try {
      final refreshToken = await _tokenStorage.getRefreshToken();
      if (refreshToken != null) {
        await _dio.post(
          ApiEndpoints.logout,
          data: {'refresh_token': refreshToken},
        );
      }
    } catch (_) {
      // Ignore errors during logout
    } finally {
      await _tokenStorage.clearTokens();
    }
  }

  /// Check if user is logged in
  Future<bool> isLoggedIn() async {
    return _tokenStorage.hasToken();
  }

  ApiResponse<Map<String, dynamic>> _handleDioError(DioException e) {
    final data = e.response?.data;
    if (data is Map<String, dynamic>) {
      return ApiResponse.fromJson(data, (d) => d as Map<String, dynamic>);
    }
    return ApiResponse(
      success: false,
      error: ApiError(
        code: 'NETWORK_ERROR',
        message: 'Gagal terhubung ke server. Periksa koneksi internet Anda.',
      ),
    );
  }
}
