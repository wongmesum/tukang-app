import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tukangndeso/core/theme/app_colors.dart';
import 'package:tukangndeso/core/theme/app_spacing.dart';
import 'package:tukangndeso/core/theme/app_typography.dart';
import 'package:tukangndeso/core/constants/api_endpoints.dart';
import 'package:tukangndeso/services/api/dio_client.dart';

class WorkerRegisterScreen extends ConsumerStatefulWidget {
  const WorkerRegisterScreen({super.key});

  @override
  ConsumerState<WorkerRegisterScreen> createState() => _WorkerRegisterScreenState();
}

class _WorkerRegisterScreenState extends ConsumerState<WorkerRegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _ktpController = TextEditingController();
  final _bioController = TextEditingController();
  final _radiusController = TextEditingController(text: '20');

  final List<String> _selectedSkills = [];
  bool _isSubmitting = false;

  static const _categories = [
    ('AC', 'AC & Pendingin'),
    ('BGN', 'Bangunan'),
    ('LST', 'Listrik'),
    ('PLB', 'Plumbing'),
    ('LAS', 'Las & Besi'),
    ('TKY', 'Tukang Kayu'),
    ('CLN', 'Cleaning'),
    ('CAT', 'Cat & Finishing'),
    ('TNM', 'Taman'),
  ];

  @override
  void dispose() {
    _ktpController.dispose();
    _bioController.dispose();
    _radiusController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedSkills.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pilih minimal 1 kategori keahlian')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final dio = ref.read(dioClientProvider).dio;
      final response = await dio.post(ApiEndpoints.workerRegister, data: {
        'ktp_number': _ktpController.text.trim(),
        'bio': _bioController.text.trim().isNotEmpty ? _bioController.text.trim() : null,
        'work_radius_km': int.parse(_radiusController.text),
        'skills': _selectedSkills,
        // KTP photo and home_location would use upload and GPS in production
        'ktp_photo_url': 'https://placeholder.com/ktp.jpg',
        'home_location': {'lat': -7.47, 'lng': 112.55},
      });

      if (mounted) {
        if (response.data['success'] == true) {
          showDialog(
            context: context,
            barrierDismissible: false,
            builder: (ctx) => AlertDialog(
              title: const Text('Pendaftaran Berhasil! 🎉'),
              content: const Text(
                'Pendaftaran Anda sedang diproses. Admin akan memverifikasi dalam 24-48 jam.',
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('OK'),
                ),
              ],
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(response.data['error']?['message'] ?? 'Gagal mendaftar')),
          );
        }
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Gagal mengirim pendaftaran')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Daftar Sebagai Tukang')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.base),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Nomor KTP', style: AppTypography.h4),
              const SizedBox(height: AppSpacing.sm),
              TextFormField(
                controller: _ktpController,
                keyboardType: TextInputType.number,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(16),
                ],
                decoration: const InputDecoration(hintText: '16 digit nomor KTP'),
                validator: (v) {
                  if (v == null || v.length != 16) return 'Nomor KTP harus 16 digit';
                  return null;
                },
              ),

              const SizedBox(height: AppSpacing.lg),
              Text('Bio / Deskripsi Singkat', style: AppTypography.h4),
              const SizedBox(height: AppSpacing.sm),
              TextFormField(
                controller: _bioController,
                maxLines: 2,
                decoration: const InputDecoration(hintText: 'Contoh: Tukang AC berpengalaman 5 tahun'),
              ),

              const SizedBox(height: AppSpacing.lg),
              Text('Radius Kerja (km)', style: AppTypography.h4),
              const SizedBox(height: AppSpacing.sm),
              TextFormField(
                controller: _radiusController,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                decoration: const InputDecoration(hintText: 'Contoh: 20'),
                validator: (v) {
                  final n = int.tryParse(v ?? '');
                  if (n == null || n < 5 || n > 50) return 'Radius harus antara 5 - 50 km';
                  return null;
                },
              ),

              const SizedBox(height: AppSpacing.lg),
              Text('Kategori Keahlian', style: AppTypography.h4),
              const SizedBox(height: AppSpacing.sm),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _categories.map((cat) {
                  final isSelected = _selectedSkills.contains(cat.$1);
                  return FilterChip(
                    label: Text(cat.$2),
                    selected: isSelected,
                    selectedColor: AppColors.primary.withOpacity(0.2),
                    checkmarkColor: AppColors.primary,
                    onSelected: (selected) {
                      setState(() {
                        if (selected) {
                          _selectedSkills.add(cat.$1);
                        } else {
                          _selectedSkills.remove(cat.$1);
                        }
                      });
                    },
                  );
                }).toList(),
              ),

              const SizedBox(height: AppSpacing.xl),
              ElevatedButton(
                onPressed: _isSubmitting ? null : _submit,
                child: _isSubmitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Daftar Sekarang'),
              ),
              const SizedBox(height: AppSpacing.base),
            ],
          ),
        ),
      ),
    );
  }
}
