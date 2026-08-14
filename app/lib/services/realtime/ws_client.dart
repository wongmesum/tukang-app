import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:tukangndeso/core/config/app_config.dart';
import 'package:tukangndeso/services/storage/token_storage.dart';

final wsClientProvider = Provider<WsClient>((ref) {
  return WsClient(ref);
});

/// WebSocket event from the server
class WsEvent {
  const WsEvent({required this.type, required this.payload, required this.timestamp});

  final String type;
  final Map<String, dynamic> payload;
  final String timestamp;

  factory WsEvent.fromJson(Map<String, dynamic> json) {
    return WsEvent(
      type: json['type'] as String,
      payload: json['payload'] as Map<String, dynamic>? ?? {},
      timestamp: json['timestamp'] as String? ?? '',
    );
  }
}

/// WebSocket connection states
enum WsConnectionState { disconnected, connecting, connected, reconnecting }

/// WebSocket client with auto-reconnect and room subscriptions
class WsClient {
  WsClient(this._ref);

  final Ref _ref;

  WebSocketChannel? _channel;
  WsConnectionState _state = WsConnectionState.disconnected;
  Timer? _reconnectTimer;
  Timer? _pingTimer;
  int _reconnectAttempts = 0;
  static const int _maxReconnectAttempts = 10;
  static const Duration _pingInterval = Duration(seconds: 25);

  final Set<String> _subscribedOrders = {};

  // Event stream — screens listen to this
  final _eventController = StreamController<WsEvent>.broadcast();
  Stream<WsEvent> get events => _eventController.stream;

  // Connection state stream
  final _stateController = StreamController<WsConnectionState>.broadcast();
  Stream<WsConnectionState> get stateStream => _stateController.stream;
  WsConnectionState get state => _state;

  /// Connect to WebSocket server
  Future<void> connect() async {
    if (_state == WsConnectionState.connected ||
        _state == WsConnectionState.connecting) {
      return;
    }

    _setState(WsConnectionState.connecting);

    final tokenStorage = _ref.read(tokenStorageProvider);
    final token = await tokenStorage.getAccessToken();

    if (token == null) {
      _setState(WsConnectionState.disconnected);
      return;
    }

    final wsUrl = _getWsUrl(token);

    try {
      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));
      await _channel!.ready;

      _setState(WsConnectionState.connected);
      _reconnectAttempts = 0;
      _startPing();

      // Re-subscribe to orders after reconnect
      for (final orderId in _subscribedOrders) {
        _sendRaw({'type': 'subscribe.order', 'payload': {'order_id': orderId}});
      }

      // Listen to incoming messages
      _channel!.stream.listen(
        _onMessage,
        onError: _onError,
        onDone: _onDone,
        cancelOnError: false,
      );
    } catch (e) {
      _setState(WsConnectionState.disconnected);
      _scheduleReconnect();
    }
  }

  /// Disconnect from WebSocket
  void disconnect() {
    _reconnectTimer?.cancel();
    _pingTimer?.cancel();
    _channel?.sink.close();
    _channel = null;
    _setState(WsConnectionState.disconnected);
    _reconnectAttempts = 0;
  }

  /// Subscribe to order updates
  void subscribeToOrder(String orderId) {
    _subscribedOrders.add(orderId);
    if (_state == WsConnectionState.connected) {
      _sendRaw({'type': 'subscribe.order', 'payload': {'order_id': orderId}});
    }
  }

  /// Unsubscribe from order updates
  void unsubscribeFromOrder(String orderId) {
    _subscribedOrders.remove(orderId);
    if (_state == WsConnectionState.connected) {
      _sendRaw({'type': 'unsubscribe.order', 'payload': {'order_id': orderId}});
    }
  }

  /// Send worker location update
  void sendLocation({
    required String orderId,
    required double lat,
    required double lng,
  }) {
    if (_state != WsConnectionState.connected) return;
    _sendRaw({
      'type': 'worker.location',
      'payload': {
        'order_id': orderId,
        'lat': lat,
        'lng': lng,
      },
    });
  }

  /// Filter events by type
  Stream<WsEvent> on(String type) {
    return events.where((e) => e.type == type);
  }

  // --- Private ---

  String _getWsUrl(String token) {
    final baseUrl = AppConfig.baseUrl;
    // Convert http(s) to ws(s)
    final wsBase = baseUrl
        .replaceFirst('https://', 'wss://')
        .replaceFirst('http://', 'ws://')
        .replaceFirst('/v1', '');
    return '$wsBase/v1/realtime?token=$token';
  }

  void _onMessage(dynamic raw) {
    try {
      final data = jsonDecode(raw as String) as Map<String, dynamic>;
      final event = WsEvent.fromJson(data);

      // Don't forward pong/ack to the stream (internal only)
      if (event.type == 'pong' || event.type == 'connection.ack') {
        return;
      }

      _eventController.add(event);
    } catch (_) {
      // Ignore malformed messages
    }
  }

  void _onError(dynamic error) {
    _setState(WsConnectionState.disconnected);
    _scheduleReconnect();
  }

  void _onDone() {
    _pingTimer?.cancel();
    if (_state != WsConnectionState.disconnected) {
      _setState(WsConnectionState.reconnecting);
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      _setState(WsConnectionState.disconnected);
      return;
    }

    _reconnectTimer?.cancel();
    final delay = _getBackoffDelay(_reconnectAttempts);
    _reconnectAttempts++;

    _reconnectTimer = Timer(delay, () {
      connect();
    });
  }

  /// Exponential backoff with jitter: 1s, 2s, 4s, 8s, ... max 30s
  Duration _getBackoffDelay(int attempt) {
    final baseMs = 1000 * pow(2, attempt).toInt();
    final cappedMs = min(baseMs, 30000);
    final jitter = Random().nextInt(1000);
    return Duration(milliseconds: cappedMs + jitter);
  }

  void _startPing() {
    _pingTimer?.cancel();
    _pingTimer = Timer.periodic(_pingInterval, (_) {
      if (_state == WsConnectionState.connected) {
        _sendRaw({'type': 'ping', 'payload': {}});
      }
    });
  }

  void _sendRaw(Map<String, dynamic> message) {
    try {
      _channel?.sink.add(jsonEncode(message));
    } catch (_) {
      // Connection lost — will reconnect
    }
  }

  void _setState(WsConnectionState newState) {
    _state = newState;
    _stateController.add(newState);
  }

  /// Cleanup — call on app dispose
  void dispose() {
    disconnect();
    _eventController.close();
    _stateController.close();
  }
}
