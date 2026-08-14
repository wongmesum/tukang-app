import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tukangndeso/features/booking/data/booking_repository.dart';

/// Booking state management
class BookingState {
  const BookingState({
    this.serviceId,
    this.pricingScheme = 'hourly',
    this.duration = 2,
    this.description,
    this.floorLevel = 1,
    this.isUrgent = false,
    this.scheduledAt,
    this.photos = const [],
    this.addressId,
    this.customerLocation,
    this.estimate,
    this.isLoading = false,
    this.errorMessage,
    this.createdOrderId,
    this.matchedWorkerId,
    this.noWorkerAvailable = false,
  });

  final String? serviceId;
  final String pricingScheme;
  final int duration;
  final String? description;
  final int floorLevel;
  final bool isUrgent;
  final String? scheduledAt;
  final List<String> photos;
  final String? addressId;
  final Map<String, double>? customerLocation;
  final PricingEstimate? estimate;
  final bool isLoading;
  final String? errorMessage;
  final String? createdOrderId;

  /// Set when the server matched a worker during order creation.
  final String? matchedWorkerId;

  /// True when no eligible worker was available in range.
  final bool noWorkerAvailable;

  BookingState copyWith({
    String? serviceId,
    String? pricingScheme,
    int? duration,
    String? description,
    int? floorLevel,
    bool? isUrgent,
    String? scheduledAt,
    List<String>? photos,
    String? addressId,
    Map<String, double>? customerLocation,
    PricingEstimate? estimate,
    bool? isLoading,
    String? errorMessage,
    String? createdOrderId,
    String? matchedWorkerId,
    bool? noWorkerAvailable,
  }) {
    return BookingState(
      serviceId: serviceId ?? this.serviceId,
      pricingScheme: pricingScheme ?? this.pricingScheme,
      duration: duration ?? this.duration,
      description: description ?? this.description,
      floorLevel: floorLevel ?? this.floorLevel,
      isUrgent: isUrgent ?? this.isUrgent,
      scheduledAt: scheduledAt ?? this.scheduledAt,
      photos: photos ?? this.photos,
      addressId: addressId ?? this.addressId,
      customerLocation: customerLocation ?? this.customerLocation,
      estimate: estimate ?? this.estimate,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      createdOrderId: createdOrderId ?? this.createdOrderId,
      matchedWorkerId: matchedWorkerId ?? this.matchedWorkerId,
      noWorkerAvailable: noWorkerAvailable ?? this.noWorkerAvailable,
    );
  }
}

class BookingNotifier extends StateNotifier<BookingState> {
  BookingNotifier(this._repository) : super(const BookingState());

  final BookingRepository _repository;

  void setBookingParams({
    required String serviceId,
    required String pricingScheme,
    required int duration,
    String? description,
    int floorLevel = 1,
    bool isUrgent = false,
    String? scheduledAt,
    List<String> photos = const [],
  }) {
    state = state.copyWith(
      serviceId: serviceId,
      pricingScheme: pricingScheme,
      duration: duration,
      description: description,
      floorLevel: floorLevel,
      isUrgent: isUrgent,
      scheduledAt: scheduledAt,
      photos: photos,
    );
  }

  void setAddress(String addressId, Map<String, double> location) {
    state = state.copyWith(addressId: addressId, customerLocation: location);
  }

  Future<void> fetchEstimate() async {
    if (state.serviceId == null || state.customerLocation == null) return;

    state = state.copyWith(isLoading: true);

    final response = await _repository.getPricingEstimate(
      serviceId: state.serviceId!,
      pricingScheme: state.pricingScheme,
      duration: state.duration,
      customerLocation: state.customerLocation!,
      scheduledAt: state.scheduledAt,
      floorLevel: state.floorLevel,
      isUrgent: state.isUrgent,
    );

    if (response.success && response.data != null) {
      state = state.copyWith(estimate: response.data, isLoading: false);
    } else {
      state = state.copyWith(
        isLoading: false,
        errorMessage: response.error?.message ?? 'Gagal menghitung estimasi',
      );
    }
  }

  Future<bool> submitOrder() async {
    if (state.serviceId == null ||
        state.addressId == null ||
        state.customerLocation == null) {
      state = state.copyWith(errorMessage: 'Data booking belum lengkap');
      return false;
    }

    state = state.copyWith(isLoading: true);

    final response = await _repository.createOrder(BookingInput(
      serviceId: state.serviceId!,
      pricingScheme: state.pricingScheme,
      estimatedDuration: state.duration,
      description: state.description,
      photos: state.photos,
      addressId: state.addressId!,
      customerLocation: state.customerLocation!,
      scheduledAt: state.scheduledAt,
      isUrgent: state.isUrgent,
      floorLevel: state.floorLevel,
    ));

    if (response.success && response.data != null) {
      final data = response.data!;
      final orderId = data['id'] as String?;

      // The server runs matching during creation and reports the outcome,
      // so the app doesn't need to poll to find out if a worker was found.
      final matching = data['matching'] as Map<String, dynamic>?;
      final matched = matching?['matched'] == true;

      state = state.copyWith(
        isLoading: false,
        createdOrderId: orderId,
        matchedWorkerId: matched ? matching?['worker_id'] as String? : null,
        noWorkerAvailable: !matched,
      );
      return true;
    } else {
      state = state.copyWith(
        isLoading: false,
        errorMessage: response.error?.message ?? 'Gagal membuat order',
      );
      return false;
    }
  }

  void reset() {
    state = const BookingState();
  }
}

final bookingProvider = StateNotifierProvider<BookingNotifier, BookingState>((ref) {
  return BookingNotifier(ref.read(bookingRepositoryProvider));
});
