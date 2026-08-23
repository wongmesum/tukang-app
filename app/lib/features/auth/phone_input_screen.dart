import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../../core/api_client.dart';
import '../../core/auth_state.dart';
import '../../core/runtime_config.dart';
import '../../core/theme.dart';
import 'google_web.dart' as google_web;

bool _googleInitialized = false;
String _initializedClientId = '';

class PhoneInputScreen extends ConsumerStatefulWidget {
  const PhoneInputScreen({super.key});

  @override
  ConsumerState<PhoneInputScreen> createState() => _PhoneInputScreenState();
}

class _PhoneInputScreenState extends ConsumerState<PhoneInputScreen> {
  final _controller = TextEditingController(text: '08');
  final _formKey = GlobalKey<FormState>();
  RuntimeConfig _config = RuntimeConfig.fallback;
  StreamSubscription<GoogleSignInAuthenticationEvent>? _googleEvents;
  bool _loadingConfig = true;
  bool _googleLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    unawaited(_loadConfig());
  }

  Future<void> _loadConfig() async {
    final config = await RuntimeConfig.load();
    if (!mounted) return;
    setState(() { _config = config; _loadingConfig = false; });
    if (config.googleAuthEnabled && config.googleWebClientId.isNotEmpty) {
      await _initializeGoogle(config.googleWebClientId);
    }
  }

  Future<void> _initializeGoogle(String clientId) async {
    final signIn = GoogleSignIn.instance;
    _googleEvents?.cancel();
    _googleEvents = signIn.authenticationEvents.listen((event) {
      if (event is GoogleSignInAuthenticationEventSignIn) {
        unawaited(_finishGoogleLogin(event.user));
      }
    }, onError: (Object error) {
      if (mounted) setState(() { _googleLoading = false; _error = 'Login Google dibatalkan atau gagal.'; });
    });

    if (!_googleInitialized || _initializedClientId != clientId) {
      await signIn.initialize(
        clientId: kIsWeb ? clientId : null,
        serverClientId: kIsWeb ? null : clientId,
      );
      _googleInitialized = true;
      _initializedClientId = clientId;
    }
  }

  Future<void> _startGoogleLogin() async {
    setState(() { _googleLoading = true; _error = null; });
    try {
      await GoogleSignIn.instance.authenticate();
    } on GoogleSignInException catch (error) {
      if (mounted) setState(() { _googleLoading = false; _error = error.description ?? 'Login Google gagal.'; });
    }
  }

  Future<void> _finishGoogleLogin(GoogleSignInAccount account) async {
    setState(() { _googleLoading = true; _error = null; });
    try {
      final idToken = account.authentication.idToken;
      if (idToken == null || idToken.isEmpty) throw Exception('Google ID token tidak tersedia');
      final response = await ref.read(apiClientProvider).post<Map<String, dynamic>>(
        '/v1/auth/google',
        data: {'id_token': idToken},
      );
      final body = response.data;
      if (body?['success'] != true) throw Exception(body?['error']?['message'] ?? 'Login Google gagal');
      final authData = body!['data'] as Map<String, dynamic>;
      await ref.read(authTokenProvider.notifier).setToken(authData['token'] as String);
      if (mounted) context.go('/home');
    } on Exception catch (error) {
      if (mounted) setState(() { _googleLoading = false; _error = error.toString().replaceFirst('Exception: ', ''); });
    }
  }

  String? _validatePhone(String? value) {
    if (value == null || value.isEmpty) return 'Nomor HP wajib diisi';
    if (!RegExp(r'^08\d{8,13}$').hasMatch(value)) return 'Format nomor tidak valid (contoh: 081234567890)';
    return null;
  }

  void _onSubmit() {
    if (_formKey.currentState?.validate() ?? false) {
      context.push('/auth/otp', extra: _controller.text.trim());
    }
  }

  @override
  void dispose() {
    _googleEvents?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 48),
              Text('Masuk ke\nTukangNDeso', style: Theme.of(context).textTheme.displayLarge?.copyWith(fontSize: 32)),
              const SizedBox(height: AppSpacing.s),
              Text('Gunakan nomor HP atau akun Google.', style: Theme.of(context).textTheme.bodyMedium),
              if (_error != null) ...[
                const SizedBox(height: AppSpacing.l),
                Container(width: double.infinity, padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(8)), child: Text(_error!, style: TextStyle(color: Colors.red.shade700))),
              ],
              if (_config.otpEnabled) ...[
                const SizedBox(height: AppSpacing.xxl),
                Form(key: _formKey, child: TextFormField(controller: _controller, keyboardType: TextInputType.phone, maxLength: 15, validator: _validatePhone, decoration: const InputDecoration(labelText: 'Nomor HP', hintText: '081234567890', prefixIcon: Icon(Icons.phone_android)))),
                const SizedBox(height: AppSpacing.l),
                SizedBox(width: double.infinity, child: ElevatedButton(onPressed: _onSubmit, child: const Text('Kirim Kode OTP'))),
              ],
              if (_config.otpEnabled && _config.googleAuthEnabled) ...[
                const SizedBox(height: AppSpacing.l),
                const Row(children: [Expanded(child: Divider()), Padding(padding: EdgeInsets.symmetric(horizontal: 12), child: Text('atau')), Expanded(child: Divider())]),
              ],
              if (_config.googleAuthEnabled) ...[
                const SizedBox(height: AppSpacing.l),
                if (_googleLoading)
                  const Center(child: CircularProgressIndicator())
                else if (kIsWeb)
                  Center(child: google_web.renderGoogleButton())
                else
                  SizedBox(width: double.infinity, child: OutlinedButton.icon(onPressed: _startGoogleLogin, icon: const Icon(Icons.account_circle_outlined), label: const Text('Masuk dengan Google'))),
              ],
              if (_loadingConfig) ...[
                const SizedBox(height: AppSpacing.l),
                const Center(child: CircularProgressIndicator()),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
