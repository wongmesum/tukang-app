import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tukangndeso/core/constants/api_endpoints.dart';
import 'package:tukangndeso/services/api/api_response.dart';
import 'package:tukangndeso/services/api/dio_client.dart';

final servicesRepositoryProvider = Provider<ServicesRepository>((ref) {
  return ServicesRepository(ref);
});

/// Data models
class CategoryModel {
  const CategoryModel({
    required this.code,
    required this.name,
    this.iconUrl,
    required this.isActive,
  });

  final String code;
  final String name;
  final String? iconUrl;
  final bool isActive;

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    return CategoryModel(
      code: json['code'] as String,
      name: json['name'] as String,
      iconUrl: json['icon_url'] as String?,
      isActive: json['is_active'] as bool? ?? true,
    );
  }
}

class ServiceModel {
  const ServiceModel({
    required this.id,
    required this.categoryCode,
    required this.name,
    this.description,
    required this.baseHourlyRate,
    required this.baseDailyRate,
    required this.minHours,
    required this.isActive,
  });

  final String id;
  final String categoryCode;
  final String name;
  final String? description;
  final int baseHourlyRate;
  final int baseDailyRate;
  final int minHours;
  final bool isActive;

  factory ServiceModel.fromJson(Map<String, dynamic> json) {
    return ServiceModel(
      id: json['id'] as String,
      categoryCode: json['category_code'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      baseHourlyRate: json['base_hourly_rate'] as int? ?? 30000,
      baseDailyRate: json['base_daily_rate'] as int? ?? 150000,
      minHours: json['min_hours'] as int? ?? 2,
      isActive: json['is_active'] as bool? ?? true,
    );
  }
}

class ServicesRepository {
  ServicesRepository(this._ref);

  final Ref _ref;

  Dio get _dio => _ref.read(dioClientProvider).dio;

  /// Fetch all active categories
  Future<List<CategoryModel>> getCategories() async {
    try {
      final response = await _dio.get(ApiEndpoints.categories);
      final apiResponse = ApiResponse.fromJson(response.data, (d) => d);

      if (apiResponse.success && apiResponse.data is List) {
        return (apiResponse.data as List)
            .map((e) => CategoryModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Fetch services by category code
  Future<List<ServiceModel>> getServicesByCategory(String code) async {
    try {
      final response = await _dio.get(ApiEndpoints.servicesByCategory(code));
      final apiResponse = ApiResponse.fromJson(response.data, (d) => d);

      if (apiResponse.success && apiResponse.data is List) {
        return (apiResponse.data as List)
            .map((e) => ServiceModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Fetch a single service detail
  Future<ServiceModel?> getService(String id) async {
    try {
      final response = await _dio.get(ApiEndpoints.serviceById(id));
      final apiResponse = ApiResponse.fromJson(response.data, (d) => d);

      if (apiResponse.success && apiResponse.data != null) {
        return ServiceModel.fromJson(apiResponse.data as Map<String, dynamic>);
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}
