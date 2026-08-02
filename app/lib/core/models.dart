/// Shared data models used across features.

class Category {
  const Category({required this.code, required this.name});

  final String code;
  final String name;

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      code: json['code'] as String? ?? '',
      name: json['name'] as String? ?? '',
    );
  }
}

class ServiceItem {
  const ServiceItem({
    required this.id,
    required this.name,
    required this.categoryCode,
    required this.baseHourlyRate,
    required this.baseDailyRate,
    required this.minHours,
  });

  final String id;
  final String name;
  final String categoryCode;
  final int baseHourlyRate;
  final int baseDailyRate;
  final int minHours;

  factory ServiceItem.fromJson(Map<String, dynamic> json) {
    return ServiceItem(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      categoryCode: json['category_code'] as String? ?? '',
      baseHourlyRate: (json['base_hourly_rate'] as num?)?.toInt() ?? 30000,
      baseDailyRate: (json['base_daily_rate'] as num?)?.toInt() ?? 150000,
      minHours: (json['min_hours'] as num?)?.toInt() ?? 2,
    );
  }
}

class PricingEstimate {
  const PricingEstimate({
    required this.baseRate,
    required this.distanceKm,
    required this.travelCost,
    required this.surcharge,
    required this.totalEstimate,
    required this.breakdownText,
  });

  final int baseRate;
  final double distanceKm;
  final int travelCost;
  final Map<String, int> surcharge;
  final int totalEstimate;
  final String breakdownText;

  factory PricingEstimate.fromJson(Map<String, dynamic> json) {
    return PricingEstimate(
      baseRate: (json['base_rate'] as num?)?.toInt() ?? 0,
      distanceKm: (json['distance_km'] as num?)?.toDouble() ?? 0,
      travelCost: (json['travel_cost'] as num?)?.toInt() ?? 0,
      surcharge: Map<String, int>.from(
        (json['surcharge'] as Map<String, dynamic>? ?? {}).map(
          (k, v) => MapEntry(k, (v as num).toInt()),
        ),
      ),
      totalEstimate: (json['total_estimate'] as num?)?.toInt() ?? 0,
      breakdownText: json['breakdown_text'] as String? ?? '',
    );
  }
}

class OrderSummary {
  const OrderSummary({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.serviceId,
    required this.totalEstimate,
    required this.workerId,
    this.startedAt,
    this.customerLat,
    this.customerLng,
    this.description,
  });

  final String id;
  final String orderNumber;
  final String status;
  final String serviceId;
  final int totalEstimate;
  final String? workerId;
  final DateTime? startedAt;
  final double? customerLat;
  final double? customerLng;
  final String? description;

  factory OrderSummary.fromJson(Map<String, dynamic> json) {
    final pricing = json['pricing'] as Map<String, dynamic>? ?? {};
    final custLoc = json['customer_location'] as Map<String, dynamic>?;

    DateTime? started;
    if (json['started_at'] != null) {
      started = DateTime.tryParse(json['started_at'] as String);
    }

    return OrderSummary(
      id: json['id'] as String? ?? '',
      orderNumber: json['order_number'] as String? ?? '',
      status: json['status'] as String? ?? '',
      serviceId: json['service_id'] as String? ?? '',
      totalEstimate: (pricing['total_estimate'] as num?)?.toInt() ?? 0,
      workerId: json['worker_id'] as String?,
      startedAt: started,
      customerLat: (custLoc?['lat'] as num?)?.toDouble(),
      customerLng: (custLoc?['lng'] as num?)?.toDouble(),
      description: json['description'] as String?,
    );
  }
}


/// Formats Indonesian Rupiah — "Rp 65.000".
String formatRupiah(int amount) {
  final str = amount.toString();
  final buffer = StringBuffer();
  for (int i = 0; i < str.length; i++) {
    if (i > 0 && (str.length - i) % 3 == 0) buffer.write('.');
    buffer.write(str[i]);
  }
  return 'Rp ${buffer.toString()}';
}
