import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tukangndeso/services/realtime/ws_client.dart';

/// Provider that manages WebSocket lifecycle and exposes typed event streams
final realtimeServiceProvider = Provider<RealtimeService>((ref) {
  final wsClient = ref.read(wsClientProvider);
  return RealtimeService(wsClient);
});

class RealtimeService {
  RealtimeService(this._ws);

  final WsClient _ws;

  /// Connect (call once after login)
  Future<void> connect() => _ws.connect();

  /// Disconnect (call on logout)
  void disconnect() => _ws.disconnect();

  /// Current connection state
  WsConnectionState get connectionState => _ws.state;
  Stream<WsConnectionState> get connectionStateStream => _ws.stateStream;

  /// Subscribe to a specific order (call when opening tracking screen)
  void subscribeToOrder(String orderId) => _ws.subscribeToOrder(orderId);

  /// Unsubscribe from order (call when leaving tracking screen)
  void unsubscribeFromOrder(String orderId) => _ws.unsubscribeFromOrder(orderId);

  /// Send worker location (call from worker en_route)
  void sendLocation({
    required String orderId,
    required double lat,
    required double lng,
  }) => _ws.sendLocation(orderId: orderId, lat: lat, lng: lng);

  // --- Typed event streams ---

  /// Order status changed events
  Stream<OrderStatusEvent> get orderStatusChanges =>
      _ws.on('order.status_changed').map(
        (e) => OrderStatusEvent(
          orderId: e.payload['order_id'] as String,
          orderNumber: e.payload['order_number'] as String? ?? '',
          status: e.payload['status'] as String,
        ),
      );

  /// New order match (for workers)
  Stream<NewMatchEvent> get newOrderMatches =>
      _ws.on('order.new_match').map(
        (e) => NewMatchEvent(
          orderId: e.payload['order_id'] as String,
          orderNumber: e.payload['order_number'] as String? ?? '',
          categoryCode: e.payload['category_code'] as String? ?? '',
          distanceKm: (e.payload['distance_km'] as num?)?.toDouble() ?? 0,
          totalEstimate: e.payload['total_estimate'] as int? ?? 0,
        ),
      );

  /// Worker location updates (for customer tracking)
  Stream<WorkerLocationEvent> get workerLocationUpdates =>
      _ws.on('worker.location_update').map(
        (e) => WorkerLocationEvent(
          workerId: e.payload['worker_id'] as String,
          orderId: e.payload['order_id'] as String,
          lat: (e.payload['lat'] as num).toDouble(),
          lng: (e.payload['lng'] as num).toDouble(),
        ),
      );

  /// All raw events (for debugging)
  Stream<WsEvent> get allEvents => _ws.events;
}

// --- Event models ---

class OrderStatusEvent {
  const OrderStatusEvent({
    required this.orderId,
    required this.orderNumber,
    required this.status,
  });

  final String orderId;
  final String orderNumber;
  final String status;
}

class NewMatchEvent {
  const NewMatchEvent({
    required this.orderId,
    required this.orderNumber,
    required this.categoryCode,
    required this.distanceKm,
    required this.totalEstimate,
  });

  final String orderId;
  final String orderNumber;
  final String categoryCode;
  final double distanceKm;
  final int totalEstimate;
}

class WorkerLocationEvent {
  const WorkerLocationEvent({
    required this.workerId,
    required this.orderId,
    required this.lat,
    required this.lng,
  });

  final String workerId;
  final String orderId;
  final double lat;
  final double lng;
}
