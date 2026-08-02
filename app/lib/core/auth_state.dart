import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const String _kTokenKey = 'tukangndeso_token';

/// Reactive JWT token — null when logged out.
class AuthTokenNotifier extends StateNotifier<String?> {
  AuthTokenNotifier() : super(null) {
    _restore();
  }

  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  Future<void> _restore() async {
    try {
      final saved = await _storage.read(key: _kTokenKey);
      if (saved != null && saved.isNotEmpty) {
        state = saved;
      }
    } on Exception catch (error) {
      if (kDebugMode) {
        debugPrint('Failed to restore token: $error');
      }
    }
  }

  Future<void> setToken(String token) async {
    state = token;
    await _storage.write(key: _kTokenKey, value: token);
  }

  Future<void> clear() async {
    state = null;
    await _storage.delete(key: _kTokenKey);
  }
}

final authTokenProvider =
    StateNotifierProvider<AuthTokenNotifier, String?>((ref) {
  return AuthTokenNotifier();
});

/// True when user has an active token.
final isLoggedInProvider = Provider<bool>((ref) {
  final token = ref.watch(authTokenProvider);
  return token != null && token.isNotEmpty;
});
