import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tukangndeso/features/auth/data/auth_repository.dart';

/// Auth state
enum AuthStatus { initial, loading, otpSent, otpVerified, error }

class AuthState {
  const AuthState({
    this.status = AuthStatus.initial,
    this.phone = '',
    this.errorMessage,
    this.isNewUser = false,
    this.resendCountdown = 0,
  });

  final AuthStatus status;
  final String phone;
  final String? errorMessage;
  final bool isNewUser;
  final int resendCountdown;

  AuthState copyWith({
    AuthStatus? status,
    String? phone,
    String? errorMessage,
    bool? isNewUser,
    int? resendCountdown,
  }) {
    return AuthState(
      status: status ?? this.status,
      phone: phone ?? this.phone,
      errorMessage: errorMessage,
      isNewUser: isNewUser ?? this.isNewUser,
      resendCountdown: resendCountdown ?? this.resendCountdown,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._repository) : super(const AuthState());

  final AuthRepository _repository;
  Timer? _resendTimer;

  Future<void> requestOtp(String phone) async {
    state = state.copyWith(status: AuthStatus.loading, phone: phone);

    final response = await _repository.requestOtp(phone);

    if (response.success) {
      state = state.copyWith(status: AuthStatus.otpSent, resendCountdown: 60);
      _startResendTimer();
    } else {
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: response.error?.message ?? 'Gagal mengirim OTP',
      );
    }
  }

  Future<bool> verifyOtp(String code) async {
    state = state.copyWith(status: AuthStatus.loading);

    final response = await _repository.verifyOtp(state.phone, code);

    if (response.success) {
      final isNew = response.data?['is_new_user'] == true;
      state = state.copyWith(
        status: AuthStatus.otpVerified,
        isNewUser: isNew,
      );
      _cancelResendTimer();
      return true;
    } else {
      state = state.copyWith(
        status: AuthStatus.otpSent, // stay on OTP screen
        errorMessage: response.error?.message ?? 'Kode OTP salah',
      );
      return false;
    }
  }

  Future<bool> completeProfile(String name, String? email) async {
    state = state.copyWith(status: AuthStatus.loading);

    final response = await _repository.completeProfile(name: name, email: email);

    if (response.success) {
      state = state.copyWith(status: AuthStatus.otpVerified);
      return true;
    } else {
      state = state.copyWith(
        status: AuthStatus.error,
        errorMessage: response.error?.message ?? 'Gagal menyimpan profil',
      );
      return false;
    }
  }

  void _startResendTimer() {
    _cancelResendTimer();
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (state.resendCountdown <= 0) {
        _cancelResendTimer();
        return;
      }
      state = state.copyWith(resendCountdown: state.resendCountdown - 1);
    });
  }

  void _cancelResendTimer() {
    _resendTimer?.cancel();
    _resendTimer = null;
  }

  @override
  void dispose() {
    _cancelResendTimer();
    super.dispose();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.read(authRepositoryProvider));
});
