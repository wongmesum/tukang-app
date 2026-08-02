import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';
import '../../core/models.dart';
import '../../core/theme.dart';

class OrderHistoryScreen extends ConsumerStatefulWidget {
  const OrderHistoryScreen({super.key});

  @override
  ConsumerState<OrderHistoryScreen> createState() => _OrderHistoryScreenState();
}

class _OrderHistoryScreenState extends ConsumerState<OrderHistoryScreen> {
  List<Map<String, dynamic>> _orders = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.get<Map<String, dynamic>>('/v1/orders');
      final data = res.data?['data'] as List<dynamic>?;
      setState(() {
        _orders = (data ?? []).cast<Map<String, dynamic>>();
      });
    } on Exception catch (_) {
      // Empty state
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'COMPLETED':
      case 'PAID':
      case 'REVIEWED':
        return AppColors.success;
      case 'CANCELLED_BY_CUSTOMER':
      case 'CANCELLED_BY_WORKER':
      case 'DISPUTED':
        return AppColors.danger;
      case 'PENDING':
      case 'MATCHED':
        return AppColors.warning;
      default:
        return AppColors.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Riwayat Order')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _orders.isEmpty
              ? const Center(
                  child: Text('Belum ada order', style: TextStyle(color: AppColors.textSecondary)),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(AppSpacing.l),
                    itemCount: _orders.length,
                    itemBuilder: (context, index) {
                      final o = _orders[index];
                      final status = o['status'] as String? ?? '';
                      final orderNumber = o['order_number'] as String? ?? '';
                      final total = (o['pricing']?['total_estimate'] as num?)?.toInt() ?? 0;

                      return Card(
                        margin: const EdgeInsets.only(bottom: AppSpacing.m),
                        child: ListTile(
                          title: Text(orderNumber, style: const TextStyle(fontWeight: FontWeight.w700)),
                          subtitle: Text(formatRupiah(total)),
                          trailing: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.m,
                              vertical: AppSpacing.xs,
                            ),
                            decoration: BoxDecoration(
                              color: _statusColor(status).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(AppRadius.pill),
                            ),
                            child: Text(
                              status.replaceAll('_', ' '),
                              style: TextStyle(
                                color: _statusColor(status),
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
