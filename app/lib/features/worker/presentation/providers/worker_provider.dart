import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tukangndeso/core/constants/api_endpoints.dart';
import 'package:tukangndeso/services/api/dio_client.dart';

class WorkerState {
  const WorkerState({
    this.isAvailable = false,
    this.balance = 0,
    this.ratingAvg = 0,
    this.todayOrders = 0,
    this.totalOrders = 0,
    this.isLoading = false,
  });

  final bool isAvailable;
  final int balance;
  final double ratingAvg;
  final int todayOrders;
  final int totalOrders;
  final bool isLoading;

  WorkerState copyWith({
    bool? isAvailable,
    int? balance,
    double? ratingAvg,
    int? todayOrders,
    int? totalOrders,
    bool? isLoading,
  }) {
    return WorkerState(
      isAvailable: isAvailable ?? this.isAvailable,
      balance: balance ?? this.balance,
      ratingAvg: ratingAvg ?? this.ratingAvg,
      todayOrders: todayOrders ?? this.todayOrders,
      totalOrders: totalOrders ?? this.totalOrders,
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

class WorkerNotifier extends StateNotifier<WorkerState> {
  WorkerNotifier(this._dio) : super(const WorkerState()) {
    _loadProfile();
  }

  final Dio _dio;

  Future<void> _loadProfile() async {
    state = state.copyWith(isLoading: true);
    try {
      final response = await _dio.get(ApiEndpoints.workerProfile);
      if (response.data['success'] == true) {
        final data = response.data['data'] as Map<String, dynamic>;
        state = state.copyWith(
          isAvailable: data['is_available'] as bool? ?? false,
          ratingAvg: (data['rating_avg'] as num?)?.toDouble() ?? 0,
          totalOrders: data['total_orders'] as int? ?? 0,
          isLoading: false,
        );
      }
    } catch (_) {
      state = state.copyWith(isLoading: false);
    }

    // Load wallet balance
    try {
      final response = await _dio.get(ApiEndpoints.workerWallet);
      if (response.data['success'] == true) {
        final data = response.data['data'] as Map<String, dynamic>;
        state = state.copyWith(
          balance: data['balance'] as int? ?? 0,
        );
      }
    } catch (_) {}
  }

  Future<void> toggleAvailability(bool value) async {
    try {
      await _dio.post(ApiEndpoints.workerAvailability, data: {
        'is_available': value,
      });
      state = state.copyWith(isAvailable: value);
    } catch (_) {
      // Revert on failure
    }
  }
}

final workerProvider = StateNotifierProvider<WorkerNotifier, WorkerState>((ref) {
  return WorkerNotifier(ref.read(dioClientProvider).dio);
});
