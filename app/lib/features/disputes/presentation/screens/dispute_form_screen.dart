import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:tukangndeso/core/theme/app_colors.dart';
import 'package:tukangndeso/core/theme/app_spacing.dart';
import 'package:tukangndeso/core/theme/app_typography.dart';
import 'package:tukangndeso/core/widgets/photo_uploader.dart';
import 'package:tukangndeso/features/disputes/data/dispute_repository.dart';
import 'package:tukangndeso/services/upload/upload_service.dart';

/// Lets either party escalate a problem to admin.
///
/// Deliberately asks for a substantial description: admin decides who is right
/// based only on what's written here, and the backend rejects anything under
/// 10 characters.
class DisputeFormScreen extends ConsumerStatefulWidget {
  const DisputeFormScreen({super.key, required this.orderId, this.orderNumber});

  final String orderId;
  final String? orderNumber;

  @override
  ConsumerState<DisputeFormScreen> createState() => _DisputeFormScreenState();
}

class _DisputeFormScreenState extends ConsumerState<DisputeFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _reasonController = TextEditingController();

  final List<String> _photoUrls = [];
  bool _isUploadingPhoto = false;
  bool _isSubmitting = false;

  static const _minReasonLength = 10;

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _pickAndUploadPhoto() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1600,
      imageQuality: 85,
    );
    if (picked == null) return;

    setState(() => _isUploadingPhoto = true);

    try {
      final result = await ref.read(uploadServiceProvider).uploadImage(
            file: File(picked.path),
            category: UploadCategory.dispute,
          );
      if (!mounted) return;
      setState(() => _photoUrls.add(result.url));
    } on UploadException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), backgroundColor: AppColors.danger),
      );
    } finally {
      if (mounted) setState(() => _isUploadingPhoto = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Laporkan ke Admin?'),
        content: const Text(
          'Order akan ditandai sebagai sengketa dan ditinjau admin. '
          'Pembayaran ditahan sampai ada keputusan.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Ya, Laporkan'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isSubmitting = true);

    try {
      await ref.read(disputeRepositoryProvider).fileDispute(
            orderId: widget.orderId,
            reason: _reasonController.text.trim(),
            photos: _photoUrls,
          );

      if (!mounted) return;

      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          title: const Text('Laporan Terkirim'),
          content: const Text(
            'Admin akan meninjau laporan Anda. Anda akan diberi tahu '
            'begitu ada keputusan.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Mengerti'),
            ),
          ],
        ),
      );

      if (mounted) context.pop(true);
    } on DisputeException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), backgroundColor: AppColors.danger),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.orderNumber != null
              ? 'Laporkan Masalah — ${widget.orderNumber}'
              : 'Laporkan Masalah',
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.base),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.warning.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                  border: Border.all(color: AppColors.warning.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, color: AppColors.warning, size: 20),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Text(
                        'Gunakan ini hanya jika masalah tidak bisa diselesaikan '
                        'lewat chat dengan pihak lain.',
                        style: AppTypography.caption,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.lg),

              Text('Jelaskan Masalahnya', style: AppTypography.h4),
              const SizedBox(height: 4),
              Text(
                'Semakin jelas, semakin cepat admin bisa memutuskan',
                style: AppTypography.caption,
              ),
              const SizedBox(height: AppSpacing.sm),
              TextFormField(
                controller: _reasonController,
                maxLines: 5,
                maxLength: 1000,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  hintText:
                      'Contoh: Tukang menandai pekerjaan selesai, tetapi keramik '
                      'di kamar mandi belum dipasang sama sekali.',
                ),
                validator: (value) {
                  final text = value?.trim() ?? '';
                  if (text.isEmpty) return 'Penjelasan wajib diisi';
                  if (text.length < _minReasonLength) {
                    return 'Minimal $_minReasonLength karakter agar bisa ditindaklanjuti';
                  }
                  return null;
                },
              ),

              const SizedBox(height: AppSpacing.base),

              Row(
                children: [
                  Text('Foto Bukti', style: AppTypography.h4),
                  const SizedBox(width: 8),
                  Text('(opsional, maks 5)', style: AppTypography.caption),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              PhotoUploader(
                photos: _photoUrls,
                onAdd: _isUploadingPhoto ? () {} : _pickAndUploadPhoto,
                onRemove: (index) => setState(() => _photoUrls.removeAt(index)),
                maxPhotos: 5,
              ),
              if (_isUploadingPhoto) ...[
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: [
                    const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                    const SizedBox(width: 8),
                    Text('Mengunggah foto...', style: AppTypography.caption),
                  ],
                ),
              ],

              const SizedBox(height: AppSpacing.xl),

              ElevatedButton(
                onPressed: _isSubmitting ? null : _submit,
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
                child: _isSubmitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('Kirim Laporan'),
              ),
              const SizedBox(height: AppSpacing.base),
            ],
          ),
        ),
      ),
    );
  }
}
