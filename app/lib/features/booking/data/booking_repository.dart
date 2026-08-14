import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tukangndeso/core/constants/api_endpoints.dart';
import 'package:tukangndeso/services/api/api_response.dart';
import 'package:tukangndeso/services/api/dio_client.dart';

final bookingRepositoryProvider = Provider<BookingRepository>((ref) {
  return BookingRepository(ref);
});

/// Pricing estimate model
class PricingEstimate {
  const PricingEstimate({
    required this.baseRate,
    required this.distanceKm,
    required this.travelCost,
    required this.surchargeHoliday,
    required this.surchargeNight,
    required this.surchargeWeekend,
    required this.surchargeUrgent,
    required this.surchargeFloor,
    required this.totalEstimate,
  });

  final int baseRate;
  final double distanceKm;
  final int travelCost;
  final int surchargeHoliday;
  final int surchargeNight;
  final int surchargeWeekend;
  final int surchargeUrgent;
  final int surchargeFloor;
  final int totalEstimate;

  factory PricingEstimate.fromJson(Map<String, dynamic> json) {
    final surcharge = json['surcharge'] as Map<String, dynamic>? ?? {};
    return PricingEstimate(
      baseRate: json['base_rate'] as int,
      distanceKm: (json['distance_km'] as num).toDouble(),
      travelCost: json['travel_cost'] as int,
      surchargeHoliday: surcharge['holiday'] as int? ?? 0,
      surchargeNight: surcharge['night'] as int? ?? 0,
      surchargeWeekend: surcharge['weekend'] as int? ?? 0,
      surchargeUrgent: surcharge['urgent'] as int? ?? 0,
      surchargeFloor: surcharge['floor'] as int? ?? 0,
      totalEstimate: json['total_estimate'] as int,
    );
  }
}

/// Booking form input
class BookingInput {
  const BookingInput({
    required this.serviceId,
    required this.pricingScheme,
    required this.estimatedDuration,
    this.description,
    this.photos = const [],
    required this.addressId,
    required this.customerLocation,
    this.scheduledAt,
    this.isUrgent = false,
    this.floorLevel = 1,
  });

  final String serviceId;
  final String pricingScheme; // 'hourly' or 'daily'
  final int estimatedDuration;
  final String? description;
  final List<String> photos;
  final String addressId;
  final Map<String, double> customerLocation; // {lat, lng}
  final String? scheduledAt;
  final bool isUrgent;
  final int floorLevel;
}

class BookingRepository {
  BookingRepository(this._ref);

  final Ref _ref;
  Dio get _dio => _ref.read(dioClientProvider).dio;

  /// Get pricing estimate
  Future<ApiResponse<PricingEstimate>> getPricingEstimate({
    required String serviceId,
    required String pricingScheme,
    required int duration,
    required Map<String, double> customerLocation,
    String? scheduledAt,
    int floorLevel = 1,
    bool isUrgent = false,
  }) async {
    try {
      final response = await _dio.post(ApiEndpoints.pricingEstimate, data: {
        'service_id': serviceId,
        'pricing_scheme': pricingScheme,
        'duration': duration,
        'customer_location': customerLocation,
        'scheduled_at': scheduledAt,
        'floor_level': floorLevel,
        'is_urgent': isUrgent,
      });

      final apiResponse = ApiResponse.fromJson(
        response.data,
        (d) => PricingEstimate.fromJson(d as Map<String, dynamic>),
      );
      return apiResponse;
    } on DioException catch (e) {
      final data = e.response?.data;
      if (data is Map<String, dynamic>) {
        return ApiResponse(
          success: false,
          error: ApiError.fromJson(data['error'] as Map<String, dynamic>),
        );
      }
      return const ApiResponse(
        success: false,
        error: ApiError(code: 'NETWORK_ERROR', message: 'Gagal menghitung estimasi'),
      );
    }
  }

  /// Submit order
  Future<ApiResponse<Map<String, dynamic>>> createOrder(BookingInput input) async {
    try {
      final response = await _dio.post(ApiEndpoints.orders, data: {
        'service_id': input.serviceId,
        'pricing_scheme': input.pricingScheme,
        'estimated_duration': input.estimatedDuration,
        'description': input.description,
        'photos': input.photos,
        'address_id': input.addressId,
        'customer_location': input.customerLocation,
        'scheduled_at': input.scheduledAt,
        'is_urgent': input.isUrgent,
      });
      return ApiResponse.fromJson(response.data, (d) => d as Map<String, dynamic>);
    } on DioException catch (e) {
      final data = e.response?.data;
      if (data is Map<String, dynamic>) {
        return ApiResponse(
          success: false,
          error: data['error'] != null
              ? ApiError.fromJson(data['error'] as Map<String, dynamic>)
              : const ApiError(code: 'UNKNOWN', message: 'Gagal membuat order'),
        );
      }
      return const ApiResponse(
        success: false,
        error: ApiError(code: 'NETWORK_ERROR', message: 'Gagal terhubung ke server'),
      );
    }
  }
}
