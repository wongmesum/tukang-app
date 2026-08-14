import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:tukangndeso/core/constants/api_endpoints.dart';
import 'package:tukangndeso/core/theme/app_colors.dart';
import 'package:tukangndeso/core/theme/app_spacing.dart';
import 'package:tukangndeso/core/theme/app_typography.dart';
import 'package:tukangndeso/features/profile/presentation/screens/address_form_screen.dart';
import 'package:tukangndeso/services/api/dio_client.dart';

class AddressListScreen extends ConsumerStatefulWidget {
  const AddressListScreen({super.key});

  @override
  ConsumerState<AddressListScreen> createState() => _AddressListScreenState();
}

class _AddressListScreenState extends ConsumerState<AddressListScreen> {
  List<Map<String, dynamic>> _addresses = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadAddresses();
  }

  Future<void> _loadAddresses() async {
    setState(() => _isLoading = true);
    try {
      final dio = ref.read(dioClientProvider).dio;
      final response = await dio.get(ApiEndpoints.addresses);
      if (response.data['success'] == true) {
        setState(() {
          _addresses =
              (response.data['data'] as List).cast<Map<String, dynamic>>();
        });
      }
    } catch (_) {}
    setState(() => _isLoading = false);
  }

  Future<void> _deleteAddress(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hapus Alamat?'),
        content: const Text('Alamat ini akan dihapus permanen.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child:
                const Text('Hapus', style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      final dio = ref.read(dioClientProvider).dio;
      await dio.delete(ApiEndpoints.addressById(id));
      _loadAddresses();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Alamat dihapus'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Gagal menghapus alamat'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
  }

  Future<void> _setDefault(String id) async {
    try {
      final dio = ref.read(dioClientProvider).dio;
      await dio.patch(
        ApiEndpoints.addressById(id),
        data: {'is_default': true},
      );
      _loadAddresses();
    } catch (_) {}
  }

  void _navigateToForm({String? addressId, Map<String, dynamic>? data}) async {
    final result = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => AddressFormScreen(
          addressId: addressId,
          initialData: data,
        ),
      ),
    );
    if (result == true) {
      _loadAddresses();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Alamat Saya')),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _navigateToForm(),
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add, color: Colors.white),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _addresses.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.location_off,
                          size: 64, color: AppColors.textHint),
                      const SizedBox(height: 16),
                      Text('Belum ada alamat', style: AppTypography.body1),
                      const SizedBox(height: 8),
                      Text('Tambahkan alamat untuk booking',
                          style: AppTypography.body2),
                      const SizedBox(height: 24),
                      ElevatedButton.icon(
                        onPressed: () => _navigateToForm(),
                        icon: const Icon(Icons.add),
                        label: const Text('Tambah Alamat'),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadAddresses,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(AppSpacing.base),
                    itemCount: _addresses.length,
                    itemBuilder: (context, index) {
                      final addr = _addresses[index];
                      return _AddressCard(
                        address: addr,
                        onEdit: () => _navigateToForm(
                          addressId: addr['id'] as String,
                          data: addr,
                        ),
                        onDelete: () =>
                            _deleteAddress(addr['id'] as String),
                        onSetDefault: () =>
                            _setDefault(addr['id'] as String),
                      );
                    },
                  ),
                ),
    );
  }
}

class _AddressCard extends StatelessWidget {
  const _AddressCard({
    required this.address,
    required this.onEdit,
    required this.onDelete,
    required this.onSetDefault,
  });

  final Map<String, dynamic> address;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onSetDefault;

  @override
  Widget build(BuildContext context) {
    final isDefault = address['is_default'] == true;
    final label = address['label'] as String? ?? '';
    final fullAddress = address['full_address'] as String? ?? '';
    final district = address['district'] as String? ?? '';

    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: isDefault
            ? const BorderSide(color: AppColors.primary, width: 2)
            : BorderSide.none,
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.base),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  isDefault ? Icons.star : Icons.location_on,
                  color: isDefault ? AppColors.warning : AppColors.textSecondary,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    label,
                    style: AppTypography.h4,
                  ),
                ),
                if (isDefault)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text(
                      'Utama',
                      style: TextStyle(
                        fontSize: 11,
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              fullAddress,
              style: AppTypography.body2,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            if (district.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                'Kec. $district',
                style: AppTypography.caption,
              ),
            ],
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                if (!isDefault)
                  TextButton.icon(
                    onPressed: onSetDefault,
                    icon: const Icon(Icons.star_outline, size: 16),
                    label: const Text('Jadikan Utama'),
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                    ),
                  ),
                const Spacer(),
                IconButton(
                  onPressed: onEdit,
                  icon: const Icon(Icons.edit, size: 18),
                  color: AppColors.textSecondary,
                  tooltip: 'Edit',
                ),
                IconButton(
                  onPressed: onDelete,
                  icon: const Icon(Icons.delete_outline, size: 18),
                  color: AppColors.danger,
                  tooltip: 'Hapus',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}


