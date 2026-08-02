import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';

class WorkerRegisterScreen extends ConsumerStatefulWidget {
  const WorkerRegisterScreen({super.key});

  @override
  ConsumerState<WorkerRegisterScreen> createState() => _WorkerRegisterScreenState();
}

class _WorkerRegisterScreenState extends ConsumerState<WorkerRegisterScreen> {
  final _ktpController = TextEditingController();
  final _bioController = TextEditingController();
  final _radiusController = TextEditingController(text: '20');
  final Set<String> _selectedSkills = {'AC'};
  bool _loading = false;
  String? _error;

  static const _availableSkills = ['AC', 'BGN', 'LST', 'PLB', 'LAS', 'TKY', 'CLN', 'CAT', 'TNM'];

  Future<void> _submit() async {
    if (_ktpController.text.length != 16) {
      setState(() => _error = 'Nomor KTP harus 16 digit');
      return;
    }
    if (_selectedSkills.isEmpty) {
      setState(() => _error = 'Pilih minimal 1 keahlian');
      return;
    }

    setState(() { _loading = true; _error = null; });

    try {
      final dio = ref.read(apiClientProvider);
      final response = await dio.post<Map<String, dynamic>>(
        '/v1/worker/register',
        data: {
          'ktp_number': _ktpController.text,
          'ktp_photo_url': 'https://cdn.tukangndeso.id/ktp/placeholder.jpg',
          'bio': _bioController.text.isEmpty ? null : _bioController.text,
          'work_radius_km': int.tryParse(_radiusController.text) ?? 20,
          'home_location': {'lat': -7.4722, 'lng': 112.4336},
          'skills': _selectedSkills.toList(),
        },
      );
      final body = response.data;
      if (body != null && body['success'] == true) {
        if (mounted) context.go('/worker/dashboard');
      } else {
        setState(() => _error = (body?['error']?['message'] as String?) ?? 'Gagal daftar');
      }
    } on Exception catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _ktpController.dispose();
    _bioController.dispose();
    _radiusController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Daftar Sebagai Tukang')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.l),
        children: [
          TextField(
            controller: _ktpController,
            keyboardType: TextInputType.number,
            maxLength: 16,
            decoration: const InputDecoration(labelText: 'Nomor KTP'),
          ),
          const SizedBox(height: AppSpacing.l),
          TextField(
            controller: _bioController,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Bio (opsional)', hintText: 'Pengalaman kerja Anda'),
          ),
          const SizedBox(height: AppSpacing.l),
          TextField(
            controller: _radiusController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Radius kerja (km)'),
          ),
          const SizedBox(height: AppSpacing.l),
          const Text('Keahlian', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: AppSpacing.s),
          Wrap(
            spacing: AppSpacing.s,
            children: _availableSkills.map((skill) {
              final selected = _selectedSkills.contains(skill);
              return FilterChip(
                label: Text(skill),
                selected: selected,
                onSelected: (v) => setState(() {
                  if (v) {
                    _selectedSkills.add(skill);
                  } else {
                    _selectedSkills.remove(skill);
                  }
                }),
              );
            }).toList(),
          ),
          if (_error != null) ...[
            const SizedBox(height: AppSpacing.m),
            Text(_error!, style: const TextStyle(color: AppColors.danger)),
          ],
          const SizedBox(height: AppSpacing.xl),
          ElevatedButton(
            onPressed: _loading ? null : _submit,
            child: _loading
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Daftar'),
          ),
        ],
      ),
    );
  }
}
