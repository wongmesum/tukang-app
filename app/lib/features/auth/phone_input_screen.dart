import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';

class PhoneInputScreen extends ConsumerStatefulWidget {
  const PhoneInputScreen({super.key});

  @override
  ConsumerState<PhoneInputScreen> createState() => _PhoneInputScreenState();
}

class _PhoneInputScreenState extends ConsumerState<PhoneInputScreen> {
  final _controller = TextEditingController(text: '08');
  final _formKey = GlobalKey<FormState>();

  String? _validatePhone(String? value) {
    if (value == null || value.isEmpty) return 'Nomor HP wajib diisi';
    if (!RegExp(r'^08\d{8,13}$').hasMatch(value)) {
      return 'Format nomor tidak valid (contoh: 081234567890)';
    }
    return null;
  }

  void _onSubmit() {
    if (_formKey.currentState?.validate() ?? false) {
      context.push('/auth/otp', extra: _controller.text.trim());
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
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 60),
              Text(
                'Masuk ke\nTukangNDeso',
                style: Theme.of(context).textTheme.displayLarge?.copyWith(
                      fontSize: 32,
                    ),
              ),
              const SizedBox(height: AppSpacing.s),
              Text(
                'Masukkan nomor HP untuk menerima kode verifikasi.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: AppSpacing.xxl),
              Form(
                key: _formKey,
                child: TextFormField(
                  controller: _controller,
                  keyboardType: TextInputType.phone,
                  maxLength: 15,
                  autofocus: true,
                  validator: _validatePhone,
                  decoration: const InputDecoration(
                    labelText: 'Nomor HP',
                    hintText: '081234567890',
                    prefixIcon: Icon(Icons.phone_android),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _onSubmit,
                  child: const Text('Kirim Kode OTP'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
