import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:tukangndeso/core/theme/app_colors.dart';
import 'package:tukangndeso/core/theme/app_spacing.dart';
import 'package:tukangndeso/core/theme/app_typography.dart';
import 'package:tukangndeso/core/utils/formatters.dart';
import 'package:tukangndeso/core/constants/api_endpoints.dart';
import 'package:tukangndeso/core/widgets/order_status_badge.dart';
import 'package:tukangndeso/services/api/dio_client.dart';

class IncomingOrderScreen extends ConsumerStatefulWidget {
  const IncomingOrderScreen({super.key});

  @override
  ConsumerState<IncomingOrderScreen> createState() => _IncomingOrderScreenState();
}

class _IncomingOrderScreenState extends ConsumerState<IncomingOrderScreen> {
  List<Map<String, dynamic>> _orders = [];
  bool _isLoading = true;
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    _fetchOrders();
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) => _fetchOrders());
  }

  Future<void> _fetchOrders() async {
    try {
      final dio = ref.read(dioClientProvider).dio;
      final response = await dio.get(ApiEndpoints.workerIncoming);
      if (response.data['success'] == true) {
        final data = response.data['data'] as List;
        setState(() {
          _orders = data.cast<Map<String, dynamic>>();
          _isLoading = false;
        });
      }
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _acceptOrder(String orderId) async {
    try {
      final dio = ref.read(dioClientProvider).dio;
      await dio.post(ApiEndpoints.workerAccept(orderId));
      if (mounted) context.push('/worker/active/$orderId');
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Gagal menerima order')),
        );
      }
    }
  }

  Future<void> _rejectOrder(String orderId) async {
    try {
      final dio = ref.read(dioClientProvider).dio;
      await dio.post(ApiEndpoints.workerReject(orderId), data: {'reason': 'Tidak bisa saat ini'});
      _fetchOrders();
    } catch (_) {}
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Order Masuk')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _orders.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.inbox, size: 64, color: AppColors.textHint),
                      SizedBox(height: 16),
                      Text('Belum ada order masuk'),
                      SizedBox(height: 8),
                      Text(
                        'Order baru akan muncul di sini',
                        style: TextStyle(color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(AppSpacing.base),
                  itemCount: _orders.length,
                  itemBuilder: (context, index) {
                    final order = _orders[index];
                    return _IncomingOrderCard(
                      order: order,
                      onAccept: () => _acceptOrder(order['id'] as String),
                      onReject: () => _rejectOrder(order['id'] as String),
                    );
                  },
                ),
    );
  }
}

class _IncomingOrderCard extends StatelessWidget {
  const _IncomingOrderCard({
    required this.order,
    required this.onAccept,
    required this.onReject,
  });

  final Map<String, dynamic> order;
  final VoidCallback onAccept;
  final VoidCallback onReject;

  @override
  Widget build(BuildContext context) {
    final pricing = order['pricing'] as Map<String, dynamic>?;
    final totalEstimate = pricing?['total_estimate'] as int? ?? 0;
    final distanceKm = (pricing?['distance_km'] as num?)?.toDouble() ?? 0;

    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.base),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('#${order['order_number']}', style: AppTypography.h4),
                OrderStatusBadge(status: order['status'] as String),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                const Icon(Icons.location_on, size: 16, color: AppColors.textSecondary),
                const SizedBox(width: 4),
                Text('${Formatters.distance(distanceKm)} dari Anda', style: AppTypography.body2),
              ],
            ),
            if (order['description'] != null) ...[
              const SizedBox(height: 8),
              Text(order['description'] as String, style: AppTypography.body2, maxLines: 2),
            ],
            const SizedBox(height: AppSpacing.md),
            Text(
              'Estimasi: ${Formatters.rupiah(totalEstimate)}',
              style: AppTypography.body1.copyWith(
                color: AppColors.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: AppSpacing.base),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: onReject,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.danger,
                      side: const BorderSide(color: AppColors.danger),
                    ),
                    child: const Text('Tolak'),
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: onAccept,
                    child: const Text('Terima Order'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
