import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tukangndeso/core/constants/api_endpoints.dart';
import 'package:tukangndeso/services/api/dio_client.dart';

final disputeRepositoryProvider = Provider<DisputeRepository>((ref) {
  return DisputeRepository(ref);
});

class Dispute {
  const Dispute({
    required this.id,
    required this.orderId,
    required this.filedByRole,
    required this.reason,
    required this.photos,
    required this.status,
    required this.createdAt,
    this.resolution,
    this.refunded = false,
  });

  final String id;
  final String orderId;
  final String filedByRole;
  final String reason;
  final List<String> photos;
  final String status;
  final DateTime createdAt;
  final String? resolution;
  final bool refunded;

  bool get isOpen => status == 'open';

  factory Dispute.fromJson(Map<String, dynamic> json) {
    return Dispute(
      id: json['id'] as String,
      orderId: json['order_id'] as String,
      filedByRole: json['filed_by_role'] as String,
      reason: json['reason'] as String,
      photos: (json['photos'] as List?)?.cast<String>() ?? const [],
      status: json['status'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      resolution: json['resolution'] as String?,
      refunded: json['refunded'] as bool? ?? false,
    );
  }
}

class DisputeException implements Exception {
  const DisputeException(this.message);
  final String message;

  @override
  String toString() => message;
}

class DisputeRepository {
  DisputeRepository(this._ref);

  final Ref _ref;
  Dio get _dio => _ref.read(dioClientProvider).dio;

  Future<Dispute> fileDispute({
    required String orderId,
    required String reason,
    List<String> photos = const [],
  }) async {
    try {
      final response = await _dio.post(
        ApiEndpoints.fileDispute(orderId),
        data: {'reason': reason, 'photos': photos},
      );

      final body = response.data as Map<String, dynamic>;
      if (body['success'] != true) {
        throw DisputeException(
          body['error']?['message'] as String? ?? 'Gagal melaporkan masalah',
        );
      }

      return Dispute.fromJson(body['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw DisputeException(_describe(e));
    }
  }

  Future<List<Dispute>> fetchForOrder(String orderId) async {
    try {
      final response = await _dio.get(ApiEndpoints.orderDisputes(orderId));
      final body = response.data as Map<String, dynamic>;

      if (body['success'] != true) return const [];

      return (body['data'] as List)
          .map((e) => Dispute.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException {
      return const [];
    }
  }

  String _describe(DioException e) {
    // The server already phrases these in Indonesian, including the useful
    // "sudah dibuka dan sedang ditinjau" conflict case.
    final data = e.response?.data;
    if (data is Map<String, dynamic>) {
      final message = data['error']?['message'];
      if (message is String) return message;
    }

    return switch (e.type) {
      DioExceptionType.connectionError =>
        'Tidak dapat terhubung ke server. Periksa koneksi internet.',
      _ => 'Gagal melaporkan masalah. Coba lagi.',
    };
  }
}
