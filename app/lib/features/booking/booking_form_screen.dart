import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/models.dart';
import '../../core/theme.dart';

class BookingFormScreen extends ConsumerStatefulWidget {
  const BookingFormScreen({super.key, required this.service});

  final ServiceItem service;

  @override
  ConsumerState<BookingFormScreen> createState() => _BookingFormScreenState();
}

class _BookingFormScreenState extends ConsumerState<BookingFormScreen> {
  String _scheme = 'hourly';
  int _duration = 3;
  int _floor = 1;
  bool _urgent = false;
  bool _loading = false;
  String? _error;
  final _descController = TextEditingController();

  Future<void> _estimate() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final dio = ref.read(apiClientProvider);
      final response = await dio.post<Map<String, dynamic>>(
        '/v1/pricing/estimate',
        data: {
          'service_id': widget.service.id,
          'pricing_scheme': _scheme,
          'duration': _duration,
          'customer_location': {'lat': -7.4722, 'lng': 112.4336},
          'scheduled_at': null,
          'floor_level': _floor,
          'is_urgent': _urgent,
        },
      );
      final body = response.data;
      if (body != null && body['success'] == true) {
        final estimate = PricingEstimate.fromJson(
          body['data'] as Map<String, dynamic>,
        );
        if (mounted) {
          context.push(
            '/booking/estimate',
            extra: {
              'estimate': estimate,
              'service': widget.service,
              'scheme': _scheme,
              'duration': _duration,
              'description': _descController.text,
            },
          );
        }
      } else {
        setState(() {
          _error = (body?['error']?['message'] as String?) ?? 'Gagal menghitung';
        });
      }
    } on Exception catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _descController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Detail Booking')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.l),
        children: [
          Text(
            widget.service.name,
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: AppSpacing.xl),
          _SchemeSelector(
            selected: _scheme,
            onChanged: (v) => setState(() => _scheme = v),
          ),
          const SizedBox(height: AppSpacing.l),
          _CounterField(
            label: _scheme == 'hourly' ? 'Durasi (jam)' : 'Durasi (hari)',
            value: _duration,
            min: 1,
            max: 24,
            onChanged: (v) => setState(() => _duration = v),
          ),
          const SizedBox(height: AppSpacing.l),
          _CounterField(
            label: 'Lantai',
            value: _floor,
            min: 1,
            max: 10,
            onChanged: (v) => setState(() => _floor = v),
          ),
          const SizedBox(height: AppSpacing.l),
          SwitchListTile(
            value: _urgent,
            onChanged: (v) => setState(() => _urgent = v),
            title: const Text('Perlu segera (urgent)'),
            subtitle: const Text('Tambahan Rp 25.000'),
            contentPadding: EdgeInsets.zero,
          ),
          const SizedBox(height: AppSpacing.l),
          TextField(
            controller: _descController,
            maxLines: 4,
            decoration: const InputDecoration(
              labelText: 'Deskripsi masalah (opsional)',
              hintText: 'Contoh: AC bocor di kamar utama',
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: AppSpacing.m),
            Text(_error!, style: const TextStyle(color: AppColors.danger)),
          ],
          const SizedBox(height: AppSpacing.xl),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _loading ? null : _estimate,
              child: _loading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text('Lihat Estimasi Harga'),
            ),
          ),
        ],
      ),
    );
  }
}

class _SchemeSelector extends StatelessWidget {
  const _SchemeSelector({required this.selected, required this.onChanged});

  final String selected;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return SegmentedButton<String>(
      segments: const [
        ButtonSegment(value: 'hourly', label: Text('Per Jam')),
        ButtonSegment(value: 'daily', label: Text('Per Hari')),
      ],
      selected: {selected},
      onSelectionChanged: (s) => onChanged(s.first),
    );
  }
}

class _CounterField extends StatelessWidget {
  const _CounterField({
    required this.label,
    required this.value,
    required this.min,
    required this.max,
    required this.onChanged,
  });

  final String label;
  final int value;
  final int min;
  final int max;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: Text(label, style: const TextStyle(fontSize: 14))),
        IconButton(
          icon: const Icon(Icons.remove_circle_outline),
          onPressed: value > min ? () => onChanged(value - 1) : null,
        ),
        SizedBox(
          width: 40,
          child: Center(
            child: Text(
              '$value',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
        IconButton(
          icon: const Icon(Icons.add_circle_outline),
          onPressed: value < max ? () => onChanged(value + 1) : null,
        ),
      ],
    );
  }
}
