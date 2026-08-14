import 'dart:convert';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tukangndeso/core/constants/api_endpoints.dart';
import 'package:tukangndeso/services/api/dio_client.dart';
import 'package:tukangndeso/services/storage/token_storage.dart';
import 'dart:io' show Platform;

final pushNotificationProvider = Provider<PushNotificationService>((ref) {
  return PushNotificationService(ref);
});

/// Background message handler — must be top-level function
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  // Handle background notification data here if needed
  // For now, Firebase handles display automatically
}

/// Push Notification Service
///
/// Responsibilities:
/// - Request notification permission
/// - Get/refresh FCM token
/// - Register token with backend
/// - Handle foreground/background messages
/// - Navigate user based on notification tap
class PushNotificationService {
  PushNotificationService(this._ref);

  final Ref _ref;
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  String? _currentToken;

  /// Initialize Firebase Messaging — call after successful auth
  Future<void> initialize() async {
    // 1. Request permission
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    if (settings.authorizationStatus == AuthorizationStatus.denied) {
      return; // User denied — don't proceed
    }

    // 2. Get FCM token
    _currentToken = await _messaging.getToken();
    if (_currentToken != null) {
      await _registerToken(_currentToken!);
    }

    // 3. Listen for token refresh
    _messaging.onTokenRefresh.listen((newToken) async {
      if (_currentToken != null && _currentToken != newToken) {
        // Unregister old, register new
        await _unregisterToken(_currentToken!);
      }
      _currentToken = newToken;
      await _registerToken(newToken);
    });

    // 4. Configure foreground notification display
    await _messaging.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );

    // 5. Handle foreground messages
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // 6. Handle notification tap (app in background → opened)
    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

    // 7. Check if app was opened from a terminated state by notification
    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      _handleNotificationTap(initialMessage);
    }
  }

  /// Cleanup — call on logout
  Future<void> dispose() async {
    if (_currentToken != null) {
      await _unregisterToken(_currentToken!);
      _currentToken = null;
    }
  }

  // --- Private methods ---

  /// Register device token with backend
  Future<void> _registerToken(String token) async {
    try {
      final hasAuth = await _ref.read(tokenStorageProvider).hasToken();
      if (!hasAuth) return;

      final dio = _ref.read(dioClientProvider).dio;
      await dio.post('/notifications/register', data: {
        'token': token,
        'platform': Platform.isIOS ? 'ios' : 'android',
      });
    } catch (_) {
      // Silently fail — will retry on next app start
    }
  }

  /// Unregister device token from backend
  Future<void> _unregisterToken(String token) async {
    try {
      final dio = _ref.read(dioClientProvider).dio;
      await dio.post('/notifications/unregister', data: {
        'token': token,
      });
    } catch (_) {
      // Silently fail
    }
  }

  /// Handle foreground messages — show local notification or update UI
  void _handleForegroundMessage(RemoteMessage message) {
    final notification = message.notification;
    final data = message.data;

    if (notification == null) return;

    // Foreground notification is automatically displayed by
    // setForegroundNotificationPresentationOptions.
    // Additional handling (e.g., updating badge count) can go here.

    // If there's order data, could trigger a state update
    if (data.containsKey('order_id')) {
      // Could emit an event to update order screens
    }
  }

  /// Handle notification tap — navigate to relevant screen
  void _handleNotificationTap(RemoteMessage message) {
    final data = message.data;

    // Navigation based on notification data
    // This would use a navigation service or GoRouter
    final orderId = data['order_id'];
    final status = data['status'];

    if (orderId != null) {
      // Navigate to order detail/tracking
      // In production: use a NavigationService that has access to GoRouter
      // ref.read(navigationServiceProvider).goTo('/orders/$orderId/tracking');
    }
  }
}
