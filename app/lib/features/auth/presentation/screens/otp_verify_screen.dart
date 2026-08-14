import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:pin_code_fields/pin_code_fields.dart';
import 'package:tukangndeso/core/config/router.dart';
import 'package:tukangndeso/core/constants/app_constants.dart';
import 'package:tukangndeso/core/theme/app_colors.dart';
import 'package:tukangndeso/core/theme/app_spacing.dart';
import 'package:tukangndeso/core/theme/app_typography.dart';
import 'package:tukangndeso/features/auth/presentation/providers/auth_provider.dart';
import 'package:tukangndeso/services/realtime/realtime_provider.dart';
import 'package:tukangndeso/services/push/push_notification_service.dart';

class OtpVerifyScreen extends ConsumerStatefulWidget {
  const OtpVerifyScreen({super.key, required this.phone});

  final String phone;

  @override
  ConsumerState<OtpVerifyScreen> createState() => _OtpVerifyScreenState();
}

class _OtpVerifyScreenState extends ConsumerState<OtpVerifyScreen> {
  final _otpController = TextEditingController();

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _verifyOtp(String code) async {
    if (code.length != AppConstants.otpLength) return;

    final success = await ref.read(authProvider.notifier).verifyOtp(code);

    if (!mounted) return;

    if (success) {
      // A fresh login has no token yet at splash time, so start realtime and
      // push registration here too — otherwise the first session after login
      // would receive no notifications at all.
      ref.read(realtimeServiceProvider).connect();
      ref.read(pushNotificationProvider).initialize();

      final state = ref.read(authProvider);
      if (state.isNewUser) {
        context.go(Routes.completeProfile);
      } else {
        context.go(Routes.home);
      }
    }
  }

  Future<void> _resendOtp() async {
    _otpController.clear();
    await ref.read(authProvider.notifier).requestOtp(widget.phone);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(authProvider);
    final isLoading = state.status == AuthStatus.loading;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Verifikasi OTP', style: AppTypography.h2),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Masukkan 6 digit kode yang dikirim ke ${widget.phone}',
                style: AppTypography.body2,
              ),
              const SizedBox(height: AppSpacing.xl),
              PinCodeTextField(
                appContext: context,
                length: AppConstants.otpLength,
                controller: _otpController,
                animationType: AnimationType.fade,
                pinTheme: PinTheme(
                  shape: PinCodeFieldShape.box,
                  borderRadius: BorderRadius.circular(8),
                  fieldHeight: 56,
                  fieldWidth: 48,
                  activeFillColor: Colors.white,
                  selectedFillColor: Colors.white,
                  inactiveFillColor: Colors.white,
                  activeColor: AppColors.primary,
                  selectedColor: AppColors.primary,
                  inactiveColor: AppColors.border,
                ),
                enableActiveFill: true,
                keyboardType: TextInputType.number,
                enabled: !isLoading,
                onCompleted: _verifyOtp,
                onChanged: (_) {},
              ),
              if (state.errorMessage != null) ...[
                const SizedBox(height: AppSpacing.md),
                Text(
                  state.errorMessage!,
                  style: const TextStyle(color: AppColors.danger, fontSize: 14),
                ),
              ],
              const SizedBox(height: AppSpacing.lg),
              Center(
                child: state.resendCountdown > 0
                    ? Text(
                        'Kirim ulang dalam ${state.resendCountdown} detik',
                        style: AppTypography.body2,
                      )
                    : TextButton(
                        onPressed: _resendOtp,
                        child: const Text('Kirim Ulang OTP'),
                      ),
              ),
              if (isLoading) ...[
                const SizedBox(height: AppSpacing.lg),
                const Center(child: CircularProgressIndicator()),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
