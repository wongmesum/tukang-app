import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tukangndeso/core/config/router.dart';
import 'package:tukangndeso/core/constants/api_endpoints.dart';
import 'package:tukangndeso/services/api/dio_client.dart';
import 'package:tukangndeso/services/storage/token_storage.dart';

final pushNotificationProvider = Provider<PushNotificationService>((ref) {
  return PushNotificationService(ref);
});

/// Background handler — must be a top-level function so the Flutter engine can
/// find it in a fresh isolate.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  // Display is handled by the OS from the notification payload. Nothing to do
  // here yet, but the handler must exist or FCM logs a warning on every push.
}

/// Registers this device for push notifications and routes taps.
///
/// Without [initialize] being called the backend has no device token for the
/// user, so every `sendToUser` finds an empty token list and silently does
/// nothing — the whole push chain depends on this running after login.
class PushNotificationService {
  PushNotificationService(this._ref);

  final Ref _ref;
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  String? _currentToken;
  bool _initialized = false;

  /// Call after authentication succeeds. Safe to call more than once.
  Future<void> initialize() async {
    if (_initialized) return;

    try {
      final settings = await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      if (settings.authorizationStatus == AuthorizationStatus.denied) {
        // Respect the refusal; orders still work, just without banners.
        return;
      }

      _currentToken = await _messaging.getToken();
      if (_currentToken != null) {
        await _registerToken(_currentToken!);
      }

      // Tokens rotate. Swap the registration so pushes keep arriving.
      _messaging.onTokenRefresh.listen((newToken) async {
        final previous = _currentToken;
        _currentToken = newToken;
        if (previous != null && previous != newToken) {
          await _unregisterToken(previous);
        }
        await _registerToken(newToken);
      });

      await _messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

      // A tap that cold-started the app is delivered here instead.
      final initialMessage = await _messaging.getInitialMessage();
      if (initialMessage != null) {
        _handleNotificationTap(initialMessage);
      }

      _initialized = true;
    } catch (error) {
      // Missing Firebase config or an unavailable device shouldn't break login.
      debugPrint('[Push] Initialization failed: $error');
    }
  }

  /// Call on logout so the next user of this device doesn't inherit the pushes.
  Future<void> dispose() async {
    if (_currentToken != null) {
      await _unregisterToken(_currentToken!);
      _currentToken = null;
    }
    _initialized = false;
  }

  // --- Token registration ---

  Future<void> _registerToken(String token) async {
    try {
      final hasAuth = await _ref.read(tokenStorageProvider).hasToken();
      if (!hasAuth) return;

      await _ref.read(dioClientProvider).dio.post(
            ApiEndpoints.registerDevice,
            data: {
              'token': token,
              'platform': Platform.isIOS ? 'ios' : 'android',
            },
          );
    } catch (error) {
      // Retried on next app start — not worth surfacing to the user.
      debugPrint('[Push] Token registration failed: $error');
    }
  }

  Future<void> _unregisterToken(String token) async {
    try {
      await _ref.read(dioClientProvider).dio.post(
            ApiEndpoints.unregisterDevice,
            data: {'token': token},
          );
    } catch (_) {
      // The backend drops invalid tokens on its own when a send fails.
    }
  }

  // --- Tap routing ---

  /// Send the user to whatever the notification was about.
  void _handleNotificationTap(RemoteMessage message) {
    final data = message.data;
    final orderId = data['order_id'];

    if (orderId == null || orderId is! String || orderId.isEmpty) return;

    final router = _ref.read(routerProvider);

    // Chat pushes should land in the conversation, not the tracking page.
    if (data['type'] == 'chat') {
      router.push('/orders/$orderId/chat');
      return;
    }

    router.push('/orders/$orderId/tracking');
  }
}
