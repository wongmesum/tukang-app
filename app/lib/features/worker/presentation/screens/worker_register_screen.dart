import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tukangndeso/core/theme/app_colors.dart';
import 'package:tukangndeso/core/theme/app_spacing.dart';
import 'package:tukangndeso/core/theme/app_typography.dart';
import 'package:tukangndeso/core/constants/api_endpoints.dart';
import 'package:tukangndeso/core/widgets/location_picker.dart';
import 'package:tukangndeso/services/api/dio_client.dart';
import 'package:tukangndeso/services/upload/upload_service.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';

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

  /// KTP photo is mandatory — admin cannot verify a worker without it.
  String? _ktpPhotoUrl;
  bool _isUploadingKtp = false;

  /// Home location anchors matching. Previously hardcoded, which placed every
  /// worker at the same coordinates and made distance ranking meaningless.
  LocationResult? _homeLocation;

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

  Future<void> _pickAndUploadKtp() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.camera,
      maxWidth: 1600,
      imageQuality: 85,
    );

    if (picked == null) return;

    setState(() => _isUploadingKtp = true);

    try {
      final result = await ref.read(uploadServiceProvider).uploadImage(
            file: File(picked.path),
            category: UploadCategory.ktp,
          );
      if (!mounted) return;
      setState(() => _ktpPhotoUrl = result.url);
    } on UploadException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), backgroundColor: AppColors.danger),
      );
    } finally {
      if (mounted) setState(() => _isUploadingKtp = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedSkills.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pilih minimal 1 kategori keahlian')),
      );
      return;
    }
    if (_ktpPhotoUrl == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Foto KTP wajib diunggah untuk verifikasi')),
      );
      return;
    }
    if (_homeLocation == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Lokasi rumah wajib diisi — dipakai untuk mencocokkan order terdekat'),
        ),
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
        'ktp_photo_url': _ktpPhotoUrl,
        'home_location': _homeLocation != null
            ? {'lat': _homeLocation!.lat, 'lng': _homeLocation!.lng}
            : null,
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

              // KTP photo
              Text('Foto KTP', style: AppTypography.h4),
              const SizedBox(height: 4),
              Text(
                'Digunakan admin untuk verifikasi identitas. Tidak ditampilkan ke pelanggan.',
                style: AppTypography.caption,
              ),
              const SizedBox(height: AppSpacing.sm),
              if (_ktpPhotoUrl != null)
                Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(
                        _ktpPhotoUrl!,
                        width: 100,
                        height: 70,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          width: 100,
                          height: 70,
                          color: AppColors.border,
                          child: const Icon(Icons.image_not_supported, size: 20),
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    const Icon(Icons.check_circle, color: AppColors.success, size: 20),
                    const SizedBox(width: 4),
                    const Text('Terunggah', style: TextStyle(color: AppColors.success)),
                    const Spacer(),
                    TextButton(
                      onPressed: _isUploadingKtp ? null : _pickAndUploadKtp,
                      child: const Text('Ganti'),
                    ),
                  ],
                )
              else
                OutlinedButton.icon(
                  onPressed: _isUploadingKtp ? null : _pickAndUploadKtp,
                  icon: _isUploadingKtp
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.camera_alt),
                  label: Text(_isUploadingKtp ? 'Mengunggah...' : 'Ambil Foto KTP'),
                ),

              const SizedBox(height: AppSpacing.lg),

              // Home location — drives distance-based matching
              LocationPicker(
                initialLocation: _homeLocation,
                onLocationSelected: (location) {
                  setState(() => _homeLocation = location);
                },
                label: 'Lokasi Rumah / Basecamp',
              ),
              const SizedBox(height: 4),
              Text(
                'Order akan dicocokkan berdasarkan jarak dari titik ini',
                style: AppTypography.caption,
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
