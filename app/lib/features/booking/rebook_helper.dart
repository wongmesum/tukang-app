import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/models.dart';

/// Helper to re-book an order from history.
/// Creates pre-filled booking with same service, scheme, and duration.
class RebookHelper {
  /// Navigate to booking form with data from a previous order
  static void rebookFromOrder(BuildContext context, Map<String, dynamic> order) {
    final serviceId = order['service_id'] as String? ?? '';
    final pricingScheme = order['pricing_scheme'] as String? ?? 'hourly';
    final estimatedDuration = order['estimated_duration'] as int? ?? 2;
    final serviceName = serviceId.split('-').skip(1).join(' ');

    // Create a ServiceItem from the order data
    final service = ServiceItem(
      id: serviceId,
      categoryCode: serviceId.split('-').length > 1 ? serviceId.split('-')[1] : '',
      name: serviceName,
      description: null,
      baseHourlyRate: 30000,
      baseDailyRate: 150000,
      minHours: 2,
    );

    context.push('/booking/form', extra: service);
  }
}

/// A button widget to display on order history items
class RebookButton extends StatelessWidget {
  final Map<String, dynamic> order;

  const RebookButton({super.key, required this.order});

  @override
  Widget build(BuildContext context) {
    // Only show for completed/reviewed/paid orders
    final status = order['status'] as String? ?? '';
    final showable = ['COMPLETED', 'PAID', 'REVIEWED'].contains(status);
    if (!showable) return const SizedBox.shrink();

    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: () => RebookHelper.rebookFromOrder(context, order),
        icon: const Icon(Icons.replay, size: 18),
        label: const Text('Pesan Lagi'),
        style: OutlinedButton.styleFrom(
          foregroundColor: const Color(0xFFFF6B35),
          side: const BorderSide(color: Color(0xFFFF6B35)),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          padding: const EdgeInsets.symmetric(vertical: 10),
        ),
      ),
    );
  }
}
