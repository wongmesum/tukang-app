import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tukangndeso/core/constants/api_endpoints.dart';
import 'package:tukangndeso/features/booking/data/booking_repository.dart';
import 'package:tukangndeso/services/api/dio_client.dart';

/// Order summary for list views
class OrderSummary {
  const OrderSummary({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.totalEstimate,
    required this.createdAt,
    this.serviceName,
  });

  final String id;
  final String orderNumber;
  final String status;
  final int totalEstimate;
  final DateTime createdAt;
  final String? serviceName;

  factory OrderSummary.fromJson(Map<String, dynamic> json) {
    final pricing = json['pricing'] as Map<String, dynamic>?;
    return OrderSummary(
      id: json['id'] as String,
      orderNumber: json['order_number'] as String,
      status: json['status'] as String,
      totalEstimate: pricing?['total_estimate'] as int? ?? 0,
      createdAt: DateTime.parse(json['created_at'] as String),
      serviceName: json['service_name'] as String?,
    );
  }
}

/// Order detail for tracking
class OrderDetail {
  const OrderDetail({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.createdAt,
    this.description,
    this.workerName,
    this.workerRating,
    this.workerTotalOrders,
    this.customerName,
    this.distanceKm,
    this.pricing,
  });

  final String id;
  final String orderNumber;
  final String status;
  final DateTime createdAt;
  final String? description;
  final String? workerName;
  final double? workerRating;
  final int? workerTotalOrders;

  /// Shown to the worker so they know who they're serving.
  final String? customerName;

  final double? distanceKm;
  final PricingEstimate? pricing;

  factory OrderDetail.fromJson(Map<String, dynamic> json) {
    final pricingJson = json['pricing'] as Map<String, dynamic>?;
    return OrderDetail(
      id: json['id'] as String,
      orderNumber: json['order_number'] as String,
      status: json['status'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      description: json['description'] as String?,
      workerName: json['worker_name'] as String?,
      workerRating: (json['worker_rating'] as num?)?.toDouble(),
      workerTotalOrders: json['worker_total_orders'] as int?,
      customerName: json['customer_name'] as String?,
      distanceKm: (pricingJson?['distance_km'] as num?)?.toDouble(),
      pricing: pricingJson != null ? PricingEstimate.fromJson(pricingJson) : null,
    );
  }
}

/// Order list provider
final orderListProvider = FutureProvider<List<OrderSummary>>((ref) async {
  final dio = ref.read(dioClientProvider).dio;
  try {
    final response = await dio.get(ApiEndpoints.orders);
    if (response.data['success'] == true) {
      final data = response.data['data'] as List;
      return data.map((e) => OrderSummary.fromJson(e as Map<String, dynamic>)).toList();
    }
    return [];
  } catch (_) {
    return [];
  }
});

/// Order detail with cancel/refresh support
class OrderDetailNotifier extends StateNotifier<AsyncValue<OrderDetail?>> {
  OrderDetailNotifier(this._dio, this._orderId) : super(const AsyncValue.loading()) {
    _fetch();
  }

  final Dio _dio;
  final String _orderId;

  Future<void> _fetch() async {
    try {
      final response = await _dio.get(ApiEndpoints.orderById(_orderId));
      if (response.data['success'] == true) {
        state = AsyncValue.data(OrderDetail.fromJson(response.data['data'] as Map<String, dynamic>));
      } else {
        state = const AsyncValue.data(null);
      }
    } catch (e) {
      state = AsyncValue.error(e, StackTrace.current);
    }
  }

  Future<void> refresh() => _fetch();

  Future<void> cancel(String reason) async {
    try {
      await _dio.post(ApiEndpoints.cancelOrder(_orderId), data: {'reason': reason});
      await _fetch();
    } catch (_) {}
  }
}

final orderDetailProvider =
    StateNotifierProvider.family<OrderDetailNotifier, AsyncValue<OrderDetail?>, String>((ref, orderId) {
  return OrderDetailNotifier(ref.read(dioClientProvider).dio, orderId);
});
