import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tukangndeso/core/constants/api_endpoints.dart';
import 'package:tukangndeso/services/api/api_response.dart';
import 'package:tukangndeso/services/api/dio_client.dart';

final paymentRepositoryProvider = Provider<PaymentRepository>((ref) {
  return PaymentRepository(ref);
});

class PaymentInfo {
  const PaymentInfo({
    required this.paymentId,
    required this.amount,
    required this.status,
    this.qrString,
    this.qrImageUrl,
    this.expiresAt,
  });

  final String paymentId;
  final int amount;
  final String status;
  final String? qrString;
  final String? qrImageUrl;
  final DateTime? expiresAt;

  factory PaymentInfo.fromJson(Map<String, dynamic> json) {
    return PaymentInfo(
      paymentId: json['payment_id'] as String,
      amount: json['amount'] as int,
      status: json['status'] as String,
      qrString: json['qr_string'] as String?,
      qrImageUrl: json['qr_image_url'] as String?,
      expiresAt: json['expires_at'] != null
          ? DateTime.parse(json['expires_at'] as String)
          : null,
    );
  }
}

class PaymentRepository {
  PaymentRepository(this._ref);

  final Ref _ref;
  Dio get _dio => _ref.read(dioClientProvider).dio;

  Future<ApiResponse<PaymentInfo>> createQris(String orderId) async {
    try {
      final response = await _dio.post(ApiEndpoints.createQris, data: {
        'order_id': orderId,
      });
      return ApiResponse.fromJson(
        response.data,
        (d) => PaymentInfo.fromJson(d as Map<String, dynamic>),
      );
    } on DioException catch (e) {
      final data = e.response?.data;
      if (data is Map<String, dynamic>) {
        return ApiResponse(
          success: false,
          error: data['error'] != null
              ? ApiError.fromJson(data['error'] as Map<String, dynamic>)
              : const ApiError(code: 'UNKNOWN', message: 'Gagal membuat QRIS'),
        );
      }
      return const ApiResponse(
        success: false,
        error: ApiError(code: 'NETWORK_ERROR', message: 'Gagal terhubung ke server'),
      );
    }
  }

  Future<ApiResponse<PaymentInfo>> checkStatus(String paymentId) async {
    try {
      final response = await _dio.get(ApiEndpoints.paymentStatus(paymentId));
      return ApiResponse.fromJson(
        response.data,
        (d) => PaymentInfo.fromJson(d as Map<String, dynamic>),
      );
    } on DioException catch (_) {
      return const ApiResponse(
        success: false,
        error: ApiError(code: 'NETWORK_ERROR', message: 'Gagal cek status'),
      );
    }
  }
}
