import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/models.dart';
import '../../core/theme.dart';

class OrderTrackingScreen extends ConsumerStatefulWidget {
  const OrderTrackingScreen({super.key, required this.orderId});
  final String orderId;

  @override
  ConsumerState<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends ConsumerState<OrderTrackingScreen> {
  OrderSummary? _order;
  Timer? _timer;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(const Duration(seconds: 5), (_) => _load());
  }

  Future<void> _load() async {
    try {
      final dio = ref.read(apiClientProvider);
      final response = await dio.get<Map<String, dynamic>>('/v1/orders/${widget.orderId}');
      final body = response.data;
      if (body != null && body['success'] == true) {
        setState(() {
          _order = OrderSummary.fromJson(body['data'] as Map<String, dynamic>);
        });
      }
    } on Exception catch (_) {}
    if (mounted && _loading) setState(() => _loading = false);
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'PENDING': return AppColors.warning;
      case 'MATCHED': case 'ACCEPTED': return Colors.blue;
      case 'EN_ROUTE': case 'ARRIVED': return Colors.indigo;
      case 'IN_PROGRESS': return AppColors.primary;
      case 'COMPLETED': return AppColors.success;
      case 'PAID': case 'REVIEWED': return AppColors.success;
      default: return AppColors.danger;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Status Order')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _order == null
              ? const Center(child: Text('Order tidak ditemukan'))
              : Padding(
                  padding: const EdgeInsets.all(AppSpacing.l),
                  child: Column(
                    children: [
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(AppSpacing.xl),
                          child: Column(
                            children: [
                              Text(_order!.orderNumber, style: Theme.of(context).textTheme.titleLarge),
                              const SizedBox(height: AppSpacing.l),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                decoration: BoxDecoration(
                                  color: _statusColor(_order!.status).withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(AppRadius.pill),
                                ),
                                child: Text(
                                  _order!.status,
                                  style: TextStyle(
                                    fontWeight: FontWeight.w800,
                                    color: _statusColor(_order!.status),
                                  ),
                                ),
                              ),
                              const SizedBox(height: AppSpacing.xl),
                              Text(formatRupiah(_order!.totalEstimate), style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800)),
                              const SizedBox(height: AppSpacing.l),
                              if (_order!.workerId != null)
                                Text('Tukang: ${_order!.workerId!.substring(0, 8)}...', style: const TextStyle(color: AppColors.textSecondary)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),
                      if (_order!.status == 'COMPLETED')
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: () => context.push('/orders/${widget.orderId}/payment'),
                            child: const Text('Bayar dengan QRIS'),
                          ),
                        ),
                      if (_order!.status == 'PAID')
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: () => context.push('/orders/${widget.orderId}/review'),
                            child: const Text('Beri Rating'),
                          ),
                        ),
                      const Spacer(),
                      TextButton(
                        onPressed: () => context.go('/home'),
                        child: const Text('Kembali ke Home'),
                      ),
                    ],
                  ),
                ),
    );
  }
}
