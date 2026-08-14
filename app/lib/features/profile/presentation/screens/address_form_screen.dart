import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:tukangndeso/core/constants/api_endpoints.dart';
import 'package:tukangndeso/core/theme/app_colors.dart';
import 'package:tukangndeso/core/theme/app_spacing.dart';
import 'package:tukangndeso/core/theme/app_typography.dart';
import 'package:tukangndeso/core/widgets/location_picker.dart';
import 'package:tukangndeso/services/api/dio_client.dart';

/// Screen for adding or editing an address
class AddressFormScreen extends ConsumerStatefulWidget {
  const AddressFormScreen({super.key, this.addressId, this.initialData});

  final String? addressId; // null = create, non-null = edit
  final Map<String, dynamic>? initialData;

  @override
  ConsumerState<AddressFormScreen> createState() => _AddressFormScreenState();
}

class _AddressFormScreenState extends ConsumerState<AddressFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _labelController = TextEditingController();
  final _fullAddressController = TextEditingController();
  final _districtController = TextEditingController();
  final _cityController = TextEditingController(text: 'Mojokerto');

  LocationResult? _selectedLocation;
  bool _isDefault = false;
  bool _isSubmitting = false;

  bool get isEditing => widget.addressId != null;

  @override
  void initState() {
    super.initState();
    if (widget.initialData != null) {
      final data = widget.initialData!;
      _labelController.text = data['label'] as String? ?? '';
      _fullAddressController.text = data['full_address'] as String? ?? '';
      _districtController.text = data['district'] as String? ?? '';
      _cityController.text = data['city'] as String? ?? 'Mojokerto';
      _isDefault = data['is_default'] as bool? ?? false;
      // JSON gives back int when a coordinate happens to be whole, so read as
      // num before converting — a direct `as double` cast would throw.
      final lat = (data['lat'] as num?)?.toDouble();
      final lng = (data['lng'] as num?)?.toDouble();
      if (lat != null && lng != null) {
        _selectedLocation = LocationResult(lat: lat, lng: lng);
      }
    }
  }

  @override
  void dispose() {
    _labelController.dispose();
    _fullAddressController.dispose();
    _districtController.dispose();
    _cityController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedLocation == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pilih lokasi terlebih dahulu')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final dio = ref.read(dioClientProvider).dio;
      final body = {
        'label': _labelController.text.trim(),
        'full_address': _fullAddressController.text.trim(),
        'district': _districtController.text.trim(),
        'city': _cityController.text.trim(),
        'lat': _selectedLocation!.lat,
        'lng': _selectedLocation!.lng,
        'is_default': _isDefault,
      };

      if (isEditing) {
        await dio.patch(
          ApiEndpoints.addressById(widget.addressId!),
          data: body,
        );
      } else {
        await dio.post(ApiEndpoints.addresses, data: body);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isEditing ? 'Alamat diperbarui' : 'Alamat ditambahkan'),
            backgroundColor: AppColors.success,
          ),
        );
        context.pop(true); // return true = refresh list
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Gagal menyimpan alamat'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(isEditing ? 'Edit Alamat' : 'Tambah Alamat'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.base),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Label
              TextFormField(
                controller: _labelController,
                decoration: const InputDecoration(
                  labelText: 'Label',
                  hintText: 'Contoh: Rumah, Kantor, Kos',
                  prefixIcon: Icon(Icons.bookmark_outline),
                ),
                validator: (v) =>
                    v == null || v.trim().isEmpty ? 'Label wajib diisi' : null,
              ),
              const SizedBox(height: AppSpacing.base),

              // Full Address
              TextFormField(
                controller: _fullAddressController,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Alamat Lengkap',
                  hintText: 'Jl. Raya Mojosari No. 123, RT 01/RW 02',
                  prefixIcon: Icon(Icons.home_outlined),
                ),
                validator: (v) =>
                    v == null || v.trim().isEmpty ? 'Alamat wajib diisi' : null,
              ),
              const SizedBox(height: AppSpacing.base),

              // District & City
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _districtController,
                      decoration: const InputDecoration(
                        labelText: 'Kecamatan',
                        hintText: 'Mojosari',
                      ),
                      validator: (v) =>
                          v == null || v.trim().isEmpty ? 'Wajib diisi' : null,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: TextFormField(
                      controller: _cityController,
                      decoration: const InputDecoration(
                        labelText: 'Kota/Kabupaten',
                        hintText: 'Mojokerto',
                      ),
                      validator: (v) =>
                          v == null || v.trim().isEmpty ? 'Wajib diisi' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),

              // Location Picker
              LocationPicker(
                initialLocation: _selectedLocation,
                onLocationSelected: (location) {
                  setState(() => _selectedLocation = location);
                },
                label: 'Titik Lokasi (GPS)',
              ),

              const SizedBox(height: AppSpacing.lg),

              // Default toggle
              SwitchListTile(
                title: const Text('Jadikan Alamat Utama'),
                subtitle: const Text(
                  'Alamat ini akan dipilih otomatis saat booking',
                ),
                value: _isDefault,
                onChanged: (value) => setState(() => _isDefault = value),
                activeColor: AppColors.primary,
                contentPadding: EdgeInsets.zero,
              ),

              const SizedBox(height: AppSpacing.xl),

              // Submit
              ElevatedButton(
                onPressed: _isSubmitting ? null : _submit,
                child: _isSubmitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Text(isEditing ? 'Simpan Perubahan' : 'Tambah Alamat'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
