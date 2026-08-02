import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/models.dart';
import '../../core/theme.dart';

class EstimateScreen extends ConsumerStatefulWidget {
  const EstimateScreen({
    super.key,
    required this.estimate,
    required this.service,
    required this.scheme,
    required this.duration,
    required this.description,
  });

  final PricingEstimate estimate;
  final ServiceItem service;
  final String scheme;
  final int duration;
  final String description;

  @override
  ConsumerState<EstimateScreen> createState() => _EstimateScreenState();
}

class _EstimateScreenState extends ConsumerState<EstimateScreen> {
  bool _loading = false;
  String? _error;

  Future<void> _createOrder() async {
    setState(() { _loading = true; _error = null; });

    try {
      final dio = ref.read(apiClientProvider);
      final response = await dio.post<Map<String, dynamic>>(
        '/v1/orders',
        data: {
          'service_id': widget.service.id,
          'pricing_scheme': widget.scheme,
          'estimated_duration': widget.duration,
          'description': widget.description.isEmpty ? null : widget.description,
          'photos': <String>[],
          'address_id': 'addr-app-default',
          'customer_location': {'lat': -7.4722, 'lng': 112.4336},
          'scheduled_at': null,
          'pricing': {
            'base_rate': widget.estimate.baseRate,
            'distance_km': widget.estimate.distanceKm,
            'travel_cost': widget.estimate.travelCost,
            'surcharge': widget.estimate.surcharge,
            'total_estimate': widget.estimate.totalEstimate,
          },
        },
      );
      final body = response.data;
      if (body != null && body['success'] == true) {
        final orderId = (body['data'] as Map<String, dynamic>)['id'] as String;
        if (mounted) context.go('/orders/$orderId/searching');
      } else {
        setState(() {
          _error = (body?['error']?['message'] as String?) ?? 'Gagal membuat order';
        });
      }
    } on Exception catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final e = widget.estimate;
    return Scaffold(
      appBar: AppBar(title: const Text('Estimasi Harga')),
      body: Padding(
        padding: const EdgeInsets.all(AppSpacing.l),
        child: Column(
          children: [
            Expanded(
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.xl),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(widget.service.name, style: Theme.of(context).textTheme.titleLarge),
                      const Divider(height: 32),
                      _Row('Tarif dasar', formatRupiah(e.baseRate)),
                      _Row('Ongkos jalan (${e.distanceKm} km)', formatRupiah(e.travelCost)),
                      if (e.surcharge['night'] != null && e.surcharge['night']! > 0)
                        _Row('Malam +30%', formatRupiah(e.surcharge['night']!)),
                      if (e.surcharge['weekend'] != null && e.surcharge['weekend']! > 0)
                        _Row('Weekend +20%', formatRupiah(e.surcharge['weekend']!)),
                      if (e.surcharge['urgent'] != null && e.surcharge['urgent']! > 0)
                        _Row('Urgent', formatRupiah(e.surcharge['urgent']!)),
                      if (e.surcharge['floor'] != null && e.surcharge['floor']! > 0)
                        _Row('Lantai', formatRupiah(e.surcharge['floor']!)),
                      const Divider(height: 32),
                      _Row('Total estimasi', formatRupiah(e.totalEstimate), bold: true),
                      const SizedBox(height: AppSpacing.l),
                      Text(e.breakdownText, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
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
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _loading ? null : _createOrder,
                child: _loading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Cari Tukang & Pesan'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row(this.label, this.value, {this.bold = false});
  final String label;
  final String value;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Text(value, style: TextStyle(fontWeight: bold ? FontWeight.w800 : FontWeight.w600, color: bold ? AppColors.primary : null)),
        ],
      ),
    );
  }
}
