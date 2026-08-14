import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:tukangndeso/core/config/router.dart';
import 'package:tukangndeso/core/theme/app_colors.dart';
import 'package:tukangndeso/core/theme/app_spacing.dart';
import 'package:tukangndeso/core/theme/app_typography.dart';
import 'package:tukangndeso/features/booking/presentation/providers/booking_provider.dart';

class BookingFormScreen extends ConsumerStatefulWidget {
  const BookingFormScreen({super.key, required this.serviceId});

  final String serviceId;

  @override
  ConsumerState<BookingFormScreen> createState() => _BookingFormScreenState();
}

class _BookingFormScreenState extends ConsumerState<BookingFormScreen> {
  final _descriptionController = TextEditingController();
  String _pricingScheme = 'hourly';
  int _duration = 2;
  int _floorLevel = 1;
  bool _isUrgent = false;
  DateTime? _scheduledAt;

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  void _requestEstimate() {
    ref.read(bookingProvider.notifier).setBookingParams(
          serviceId: widget.serviceId,
          pricingScheme: _pricingScheme,
          duration: _duration,
          description: _descriptionController.text.trim().isNotEmpty
              ? _descriptionController.text.trim()
              : null,
          floorLevel: _floorLevel,
          isUrgent: _isUrgent,
          scheduledAt: _scheduledAt?.toIso8601String(),
        );
    context.push(Routes.priceEstimate);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Detail Booking')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.base),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Description
            Text('Deskripsi Masalah', style: AppTypography.h4),
            const SizedBox(height: AppSpacing.sm),
            TextFormField(
              controller: _descriptionController,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: 'Jelaskan masalah atau pekerjaan yang perlu dilakukan...',
              ),
            ),

            const SizedBox(height: AppSpacing.lg),

            // Pricing Scheme
            Text('Skema Tarif', style: AppTypography.h4),
            const SizedBox(height: AppSpacing.sm),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'hourly', label: Text('Per Jam')),
                ButtonSegment(value: 'daily', label: Text('Per Hari')),
              ],
              selected: {_pricingScheme},
              onSelectionChanged: (value) {
                setState(() {
                  _pricingScheme = value.first;
                  if (_pricingScheme == 'hourly' && _duration < 2) {
                    _duration = 2;
                  }
                  if (_pricingScheme == 'daily' && _duration < 1) {
                    _duration = 1;
                  }
                });
              },
            ),

            const SizedBox(height: AppSpacing.lg),

            // Duration
            Text(
              _pricingScheme == 'hourly' ? 'Estimasi Durasi (jam)' : 'Estimasi Durasi (hari)',
              style: AppTypography.h4,
            ),
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                IconButton(
                  onPressed: () {
                    final min = _pricingScheme == 'hourly' ? 2 : 1;
                    if (_duration > min) setState(() => _duration--);
                  },
                  icon: const Icon(Icons.remove_circle_outline),
                  color: AppColors.primary,
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    border: Border.all(color: AppColors.border),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '$_duration',
                    style: AppTypography.price,
                  ),
                ),
                IconButton(
                  onPressed: () {
                    final max = _pricingScheme == 'hourly' ? 12 : 30;
                    if (_duration < max) setState(() => _duration++);
                  },
                  icon: const Icon(Icons.add_circle_outline),
                  color: AppColors.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  _pricingScheme == 'hourly'
                      ? '(min. 2 jam)'
                      : '(1 hari = 8 jam)',
                  style: AppTypography.caption,
                ),
              ],
            ),

            const SizedBox(height: AppSpacing.lg),

            // Floor Level
            Text('Lantai Kerja', style: AppTypography.h4),
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                IconButton(
                  onPressed: _floorLevel > 1
                      ? () => setState(() => _floorLevel--)
                      : null,
                  icon: const Icon(Icons.remove_circle_outline),
                  color: AppColors.primary,
                ),
                Text('Lantai $_floorLevel', style: AppTypography.body1),
                IconButton(
                  onPressed: _floorLevel < 20
                      ? () => setState(() => _floorLevel++)
                      : null,
                  icon: const Icon(Icons.add_circle_outline),
                  color: AppColors.primary,
                ),
                if (_floorLevel > 3)
                  Text(
                    '(+Rp 10.000/lantai)',
                    style: AppTypography.caption.copyWith(color: AppColors.warning),
                  ),
              ],
            ),

            const SizedBox(height: AppSpacing.lg),

            // Urgent toggle
            SwitchListTile(
              title: const Text('Order Mendesak (<2 jam)'),
              subtitle: const Text('+Rp 25.000'),
              value: _isUrgent,
              onChanged: (value) => setState(() => _isUrgent = value),
              activeColor: AppColors.primary,
              contentPadding: EdgeInsets.zero,
            ),

            const SizedBox(height: AppSpacing.lg),

            // Schedule
            Text('Jadwal', style: AppTypography.h4),
            const SizedBox(height: AppSpacing.sm),
            OutlinedButton.icon(
              onPressed: () async {
                final date = await showDatePicker(
                  context: context,
                  initialDate: DateTime.now(),
                  firstDate: DateTime.now(),
                  lastDate: DateTime.now().add(const Duration(days: 30)),
                );
                if (date != null && context.mounted) {
                  final time = await showTimePicker(
                    context: context,
                    initialTime: TimeOfDay.now(),
                  );
                  if (time != null) {
                    setState(() {
                      _scheduledAt = DateTime(
                        date.year,
                        date.month,
                        date.day,
                        time.hour,
                        time.minute,
                      );
                    });
                  }
                }
              },
              icon: const Icon(Icons.calendar_today),
              label: Text(
                _scheduledAt != null
                    ? '${_scheduledAt!.day}/${_scheduledAt!.month}/${_scheduledAt!.year} ${_scheduledAt!.hour}:${_scheduledAt!.minute.toString().padLeft(2, '0')}'
                    : 'Sekarang (segera)',
              ),
            ),

            const SizedBox(height: AppSpacing.xl),

            // Submit button
            ElevatedButton(
              onPressed: _requestEstimate,
              child: const Text('Lihat Estimasi Harga'),
            ),

            const SizedBox(height: AppSpacing.base),
          ],
        ),
      ),
    );
  }
}
