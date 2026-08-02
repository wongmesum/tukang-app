import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/models.dart';
import '../../core/theme.dart';

/// Full-screen modal shown when a worker receives an incoming order.
/// Auto-declines after 3 minutes if not acted on.
class IncomingOrderScreen extends ConsumerStatefulWidget {
  const IncomingOrderScreen({super.key, required this.orderId});
  final String orderId;

  @override
  ConsumerState<IncomingOrderScreen> createState() => _IncomingOrderScreenState();
}

class _IncomingOrderScreenState extends ConsumerState<IncomingOrderScreen> {
  Map<String, dynamic>? _order;
  bool _loading = true;
  bool _accepting = false;
  String? _error;
  int _remainingSeconds = 180; // 3 minutes
  Timer? _countdownTimer;

  @override
  void initState() {
    super.initState();
    _loadOrder();
    _startCountdown();
  }

  void _startCountdown() {
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_remainingSeconds <= 0) {
        _countdownTimer?.cancel();
        if (mounted) _onDecline();
        return;
      }
      setState(() => _remainingSeconds--);
    });
  }

  Future<void> _loadOrder() async {
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.get<Map<String, dynamic>>('/v1/orders/${widget.orderId}');
      final body = res.data;
      if (body != null && body['success'] == true) {
        setState(() => _order = body['data'] as Map<String, dynamic>);
      }
    } on Exception catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _onAccept() async {
    setState(() => _accepting = true);
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.post<Map<String, dynamic>>(
        '/v1/worker/orders/${widget.orderId}/accept',
      );
      final body = res.data;
      if (body != null && body['success'] == true) {
        _countdownTimer?.cancel();
        if (mounted) context.go('/worker/orders/${widget.orderId}');
      } else {
        setState(() => _error = (body?['error']?['message'] as String?) ?? 'Gagal menerima order');
      }
    } on Exception catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _accepting = false);
    }
  }

  void _onDecline() {
    _countdownTimer?.cancel();
    if (mounted) context.pop();
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  String get _formattedTime {
    final m = _remainingSeconds ~/ 60;
    final s = _remainingSeconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_order == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Order Masuk')),
        body: Center(child: Text(_error ?? 'Order tidak ditemukan')),
      );
    }

    final orderNumber = _order!['order_number'] as String? ?? '';
    final description = _order!['description'] as String? ?? 'Tidak ada deskripsi';
    final pricing = _order!['pricing'] as Map<String, dynamic>? ?? {};
    final totalEstimate = (pricing['total_estimate'] as num?)?.toInt() ?? 0;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            children: [
              // Countdown header
              Container(
                padding: const EdgeInsets.all(AppSpacing.l),
                decoration: BoxDecoration(
                  color: AppColors.warning.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(AppRadius.medium),
                  border: Border.all(color: AppColors.warning.withOpacity(0.4)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.timer_outlined, color: AppColors.warning),
                    const SizedBox(width: AppSpacing.m),
                    Text(
                      'Sisa waktu: $_formattedTime',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: AppColors.warning,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.xl),

              // Order details
              Expanded(
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.xl),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Order Masuk', style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: AppSpacing.m),
                        Text(orderNumber, style: const TextStyle(color: AppColors.textSecondary)),
                        const Divider(height: 32),
                        _DetailRow('Masalah', description),
                        const SizedBox(height: AppSpacing.m),
                        _DetailRow('Estimasi', formatRupiah(totalEstimate)),
                        const SizedBox(height: AppSpacing.m),
                        _DetailRow('Skema', (_order!['pricing_scheme'] as String? ?? 'hourly').toUpperCase()),
                      ],
                    ),
                  ),
                ),
              ),

              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.m),
                  child: Text(_error!, style: const TextStyle(color: AppColors.danger)),
                ),

              // Action buttons
              const SizedBox(height: AppSpacing.l),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _accepting ? null : _onDecline,
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: AppSpacing.l),
                        side: const BorderSide(color: AppColors.danger),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppRadius.pill),
                        ),
                      ),
                      child: const Text('Tolak', style: TextStyle(color: AppColors.danger)),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.l),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: _accepting ? null : _onAccept,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: AppSpacing.l),
                      ),
                      child: _accepting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Text('Terima Order'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow(this.label, this.value);
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: AppColors.textSecondary)),
        Flexible(
          child: Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w700),
            textAlign: TextAlign.end,
          ),
        ),
      ],
    );
  }
}
