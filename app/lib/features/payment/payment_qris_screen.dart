import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/models.dart';
import '../../core/theme.dart';

class PaymentQrisScreen extends ConsumerStatefulWidget {
  const PaymentQrisScreen({super.key, required this.orderId});
  final String orderId;

  @override
  ConsumerState<PaymentQrisScreen> createState() => _PaymentQrisScreenState();
}

class _PaymentQrisScreenState extends ConsumerState<PaymentQrisScreen> {
  Map<String, dynamic>? _payment;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _generateQris();
  }

  Future<void> _generateQris() async {
    try {
      final dio = ref.read(apiClientProvider);
      final response = await dio.post<Map<String, dynamic>>(
        '/v1/payments/qris/create',
        data: {'order_id': widget.orderId},
      );
      final body = response.data;
      if (body != null && body['success'] == true) {
        setState(() => _payment = body['data'] as Map<String, dynamic>);
      } else {
        setState(() => _error = (body?['error']?['message'] as String?) ?? 'Gagal generate QRIS');
      }
    } on Exception catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _simulatePaid() async {
    if (_payment == null) return;
    setState(() { _loading = true; _error = null; });
    try {
      final dio = ref.read(apiClientProvider);
      await dio.post<Map<String, dynamic>>(
        '/v1/payments/simulate-paid',
        data: {'payment_id': _payment!['payment_id']},
      );
      if (mounted) context.go('/orders/${widget.orderId}/tracking');
    } on Exception catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pembayaran QRIS')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: AppColors.danger)))
              : Padding(
                  padding: const EdgeInsets.all(AppSpacing.l),
                  child: Column(
                    children: [
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(AppSpacing.xl),
                          child: Column(
                            children: [
                              const Icon(Icons.qr_code_2, size: 120, color: AppColors.primary),
                              const SizedBox(height: AppSpacing.l),
                              Text(formatRupiah((_payment!['amount'] as num).toInt()), style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800)),
                              const SizedBox(height: AppSpacing.m),
                              const Text('Scan QR di atas dengan aplikasi e-wallet atau mobile banking', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary)),
                              const SizedBox(height: AppSpacing.l),
                              Text('ID: ${_payment!['payment_id']}', style: const TextStyle(fontSize: 10, color: AppColors.textSecondary)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _simulatePaid,
                          child: const Text('Simulasi Bayar (Dev)'),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.m),
                      TextButton(
                        onPressed: () => context.go('/orders/${widget.orderId}/tracking'),
                        child: const Text('Kembali ke tracking'),
                      ),
                    ],
                  ),
                ),
    );
  }
}
