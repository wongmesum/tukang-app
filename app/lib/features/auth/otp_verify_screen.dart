import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/auth_state.dart';
import '../../core/theme.dart';

class OtpVerifyScreen extends ConsumerStatefulWidget {
  const OtpVerifyScreen({super.key, required this.phone});

  final String phone;

  @override
  ConsumerState<OtpVerifyScreen> createState() => _OtpVerifyScreenState();
}

class _OtpVerifyScreenState extends ConsumerState<OtpVerifyScreen> {
  final _controller = TextEditingController();
  bool _loading = false;
  String? _error;
  String? _devOtp;

  @override
  void initState() {
    super.initState();
    _requestOtp();
  }

  Future<void> _requestOtp() async {
    try {
      final dio = ref.read(apiClientProvider);
      final response = await dio.post<Map<String, dynamic>>(
        '/v1/auth/otp/request',
        data: {'phone': widget.phone},
      );
      final body = response.data;
      if (body != null && body['data'] != null) {
        final data = body['data'] as Map<String, dynamic>;
        if (data.containsKey('dev_otp_code')) {
          setState(() {
            _devOtp = data['dev_otp_code'] as String?;
            if (_devOtp != null) _controller.text = _devOtp!;
          });
        }
      }
    } on Exception catch (e) {
      setState(() => _error = e.toString());
    }
  }

  Future<void> _verify() async {
    final code = _controller.text.trim();
    if (code.length != 6) {
      setState(() => _error = 'Kode OTP harus 6 digit');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final dio = ref.read(apiClientProvider);
      final response = await dio.post<Map<String, dynamic>>(
        '/v1/auth/otp/verify',
        data: {'phone': widget.phone, 'code': code},
      );

      final body = response.data;
      if (body != null && body['success'] == true) {
        final data = body['data'] as Map<String, dynamic>;
        final token = data['token'] as String;
        await ref.read(authTokenProvider.notifier).setToken(token);
        if (mounted) context.go('/home');
      } else {
        setState(() {
          _error = (body?['error']?['message'] as String?) ?? 'Verifikasi gagal';
        });
      }
    } on Exception catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Verifikasi OTP'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Kode dikirim ke',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            Text(
              widget.phone,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            if (_devOtp != null)
              Padding(
                padding: const EdgeInsets.only(top: AppSpacing.s),
                child: Text(
                  '[DEV] OTP: $_devOtp',
                  style: const TextStyle(
                    color: AppColors.success,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            const SizedBox(height: AppSpacing.xxl),
            TextFormField(
              controller: _controller,
              keyboardType: TextInputType.number,
              maxLength: 6,
              autofocus: true,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w700,
                letterSpacing: 8,
              ),
              decoration: const InputDecoration(
                hintText: '000000',
                counterText: '',
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: AppSpacing.m),
              Text(
                _error!,
                style: const TextStyle(color: AppColors.danger),
              ),
            ],
            const SizedBox(height: AppSpacing.xl),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _loading ? null : _verify,
                child: _loading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('Verifikasi'),
              ),
            ),
            const SizedBox(height: AppSpacing.l),
            Center(
              child: TextButton(
                onPressed: _requestOtp,
                child: const Text('Kirim ulang kode'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
