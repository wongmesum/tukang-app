import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:tukangndeso/core/theme/app_colors.dart';
import 'package:tukangndeso/core/theme/app_spacing.dart';
import 'package:tukangndeso/core/theme/app_typography.dart';
import 'package:tukangndeso/core/utils/formatters.dart';
import 'package:tukangndeso/features/payments/data/payment_repository.dart';

class PaymentScreen extends ConsumerStatefulWidget {
  const PaymentScreen({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends ConsumerState<PaymentScreen> {
  PaymentInfo? _payment;
  bool _isLoading = true;
  String? _error;
  Timer? _statusPollTimer;

  @override
  void initState() {
    super.initState();
    _createQris();
  }

  Future<void> _createQris() async {
    final repo = ref.read(paymentRepositoryProvider);
    final response = await repo.createQris(widget.orderId);

    if (response.success && response.data != null) {
      setState(() {
        _payment = response.data;
        _isLoading = false;
      });
      _startPollingStatus();
    } else {
      setState(() {
        _error = response.error?.message ?? 'Gagal membuat QRIS';
        _isLoading = false;
      });
    }
  }

  void _startPollingStatus() {
    _statusPollTimer = Timer.periodic(const Duration(seconds: 3), (_) async {
      if (_payment == null) return;
      final repo = ref.read(paymentRepositoryProvider);
      final response = await repo.checkStatus(_payment!.paymentId);
      if (response.success && response.data?.status == 'paid') {
        _statusPollTimer?.cancel();
        if (mounted) {
          _showSuccessDialog();
        }
      }
    });
  }

  void _showSuccessDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.check_circle, color: AppColors.success, size: 28),
            SizedBox(width: 8),
            Text('Pembayaran Berhasil!'),
          ],
        ),
        content: const Text('Terima kasih, pembayaran QRIS Anda telah diterima.'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.go('/orders/${widget.orderId}/review');
            },
            child: const Text('Beri Rating'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _statusPollTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pembayaran')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: AppColors.danger)))
              : Padding(
                  padding: const EdgeInsets.all(AppSpacing.base),
                  child: Column(
                    children: [
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(AppSpacing.lg),
                          child: Column(
                            children: [
                              Text('Total Bayar', style: AppTypography.body2),
                              const SizedBox(height: 8),
                              Text(
                                Formatters.rupiah(_payment!.amount),
                                style: AppTypography.priceLarge,
                              ),
                              const SizedBox(height: AppSpacing.lg),
                              // QR Code placeholder
                              Container(
                                width: 220,
                                height: 220,
                                decoration: BoxDecoration(
                                  border: Border.all(color: AppColors.border),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Center(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.qr_code_2, size: 120, color: AppColors.secondary),
                                      SizedBox(height: 8),
                                      Text(
                                        'Scan dengan app apapun',
                                        style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(height: AppSpacing.base),
                              Text(
                                'Berlaku ${_payment!.expiresAt != null ? "sampai ${Formatters.time(_payment!.expiresAt!)}" : "15 menit"}',
                                style: AppTypography.caption,
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      // Cash fallback
                      OutlinedButton.icon(
                        onPressed: _handleCashPayment,
                        icon: const Icon(Icons.money),
                        label: const Text('Bayar Cash (di lokasi)'),
                      ),
                      const Spacer(),
                      Text(
                        'Menunggu pembayaran...',
                        style: AppTypography.body2,
                      ),
                      const SizedBox(height: 8),
                      const LinearProgressIndicator(color: AppColors.primary),
                    ],
                  ),
                ),
    );
  }

  void _handleCashPayment() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Bayar Cash'),
        content: const Text(
          'Pastikan Anda telah membayar langsung ke tukang. '
          'Tukang akan mengkonfirmasi pembayaran dari sisi mereka.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              // In a real app, call confirm-cash endpoint
              context.go('/orders/${widget.orderId}/review');
            },
            child: const Text('Sudah Bayar'),
          ),
        ],
      ),
    );
  }
}
