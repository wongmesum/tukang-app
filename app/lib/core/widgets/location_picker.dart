import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:tukangndeso/core/constants/app_constants.dart';
import 'package:tukangndeso/core/theme/app_colors.dart';
import 'package:tukangndeso/core/theme/app_spacing.dart';
import 'package:tukangndeso/core/theme/app_typography.dart';

/// Location data returned from the picker
class LocationResult {
  const LocationResult({
    required this.lat,
    required this.lng,
    this.address,
  });

  final double lat;
  final double lng;
  final String? address;

  bool get isValid =>
      lat >= AppConstants.minLat &&
      lat <= AppConstants.maxLat &&
      lng >= AppConstants.minLng &&
      lng <= AppConstants.maxLng;
}

/// Callback when location is selected
typedef OnLocationSelected = void Function(LocationResult location);

/// GPS Location Picker Widget
///
/// Features:
/// - Auto-detect GPS on tap
/// - Map preview (placeholder — Google Maps in production)
/// - Manual lat/lng input as fallback
/// - Validates location is within Mojokerto Kabupaten bounding box
class LocationPicker extends StatefulWidget {
  const LocationPicker({
    super.key,
    this.initialLocation,
    required this.onLocationSelected,
    this.label = 'Lokasi',
  });

  final LocationResult? initialLocation;
  final OnLocationSelected onLocationSelected;
  final String label;

  @override
  State<LocationPicker> createState() => _LocationPickerState();
}

class _LocationPickerState extends State<LocationPicker> {
  LocationResult? _selectedLocation;
  bool _isDetecting = false;
  String? _error;
  bool _showManualInput = false;

  final _latController = TextEditingController();
  final _lngController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _selectedLocation = widget.initialLocation;
    if (_selectedLocation != null) {
      _latController.text = _selectedLocation!.lat.toStringAsFixed(6);
      _lngController.text = _selectedLocation!.lng.toStringAsFixed(6);
    }
  }

  @override
  void dispose() {
    _latController.dispose();
    _lngController.dispose();
    super.dispose();
  }

  Future<void> _detectLocation() async {
    setState(() {
      _isDetecting = true;
      _error = null;
    });

    try {
      // Check if location services are enabled
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() {
          _error = 'Layanan lokasi tidak aktif. Aktifkan GPS di pengaturan.';
          _isDetecting = false;
        });
        return;
      }

      // Check permission
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          setState(() {
            _error = 'Izin lokasi ditolak. Gunakan input manual.';
            _isDetecting = false;
            _showManualInput = true;
          });
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        setState(() {
          _error = 'Izin lokasi ditolak permanen. Ubah di pengaturan atau gunakan input manual.';
          _isDetecting = false;
          _showManualInput = true;
        });
        return;
      }

      // Get current position
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 15),
      );

      final location = LocationResult(
        lat: position.latitude,
        lng: position.longitude,
      );

      // Validate bounding box
      if (!location.isValid) {
        setState(() {
          _error = 'Lokasi Anda di luar area layanan Mojokerto Kabupaten. Gunakan input manual jika salah.';
          _isDetecting = false;
          _showManualInput = true;
          // Still set the location so user can see it
          _selectedLocation = location;
          _latController.text = location.lat.toStringAsFixed(6);
          _lngController.text = location.lng.toStringAsFixed(6);
        });
        return;
      }

      setState(() {
        _selectedLocation = location;
        _isDetecting = false;
        _latController.text = location.lat.toStringAsFixed(6);
        _lngController.text = location.lng.toStringAsFixed(6);
      });

      widget.onLocationSelected(location);
    } catch (e) {
      setState(() {
        _error = 'Gagal mendeteksi lokasi. Coba lagi atau gunakan input manual.';
        _isDetecting = false;
        _showManualInput = true;
      });
    }
  }

  void _submitManualLocation() {
    final lat = double.tryParse(_latController.text);
    final lng = double.tryParse(_lngController.text);

    if (lat == null || lng == null) {
      setState(() => _error = 'Format koordinat tidak valid');
      return;
    }

    final location = LocationResult(lat: lat, lng: lng);

    if (!location.isValid) {
      setState(() => _error = 'Lokasi di luar area layanan Mojokerto Kabupaten');
      return;
    }

    setState(() {
      _selectedLocation = location;
      _error = null;
    });

    widget.onLocationSelected(location);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(widget.label, style: AppTypography.h4),
        const SizedBox(height: AppSpacing.sm),

        // Auto-detect button
        OutlinedButton.icon(
          onPressed: _isDetecting ? null : _detectLocation,
          icon: _isDetecting
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.my_location),
          label: Text(_isDetecting ? 'Mendeteksi...' : 'Deteksi Lokasi Saya'),
        ),

        const SizedBox(height: AppSpacing.sm),

        // Location preview
        if (_selectedLocation != null) ...[
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: AppColors.success.withOpacity(0.05),
              borderRadius: BorderRadius.circular(AppSpacing.sm),
              border: Border.all(color: AppColors.success.withOpacity(0.3)),
            ),
            child: Row(
              children: [
                const Icon(Icons.location_on, color: AppColors.success, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Lokasi terpilih',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      Text(
                        '${_selectedLocation!.lat.toStringAsFixed(5)}, ${_selectedLocation!.lng.toStringAsFixed(5)}',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                if (!_selectedLocation!.isValid)
                  const Icon(Icons.warning, color: AppColors.warning, size: 20),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.sm),

          // Map preview placeholder
          Container(
            height: 150,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.grey[200],
              borderRadius: BorderRadius.circular(AppSpacing.sm),
              border: Border.all(color: AppColors.border),
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                // In production: GoogleMap widget here
                const Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.map, size: 40, color: AppColors.textHint),
                    SizedBox(height: 4),
                    Text(
                      'Map Preview',
                      style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
                    ),
                  ],
                ),
                // Pin overlay
                const Positioned(
                  child: Icon(Icons.location_pin, size: 36, color: AppColors.primary),
                ),
              ],
            ),
          ),
        ],

        // Error message
        if (_error != null) ...[
          const SizedBox(height: AppSpacing.sm),
          Text(
            _error!,
            style: const TextStyle(color: AppColors.warning, fontSize: 13),
          ),
        ],

        // Manual input fallback
        if (_showManualInput || _selectedLocation == null) ...[
          const SizedBox(height: AppSpacing.md),
          TextButton.icon(
            onPressed: () => setState(() => _showManualInput = !_showManualInput),
            icon: Icon(
              _showManualInput ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
              size: 18,
            ),
            label: const Text('Input Manual Koordinat'),
          ),
          if (_showManualInput) ...[
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _latController,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                      signed: true,
                    ),
                    decoration: const InputDecoration(
                      labelText: 'Latitude',
                      hintText: '-7.47',
                      isDense: true,
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: TextFormField(
                    controller: _lngController,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                      signed: true,
                    ),
                    decoration: const InputDecoration(
                      labelText: 'Longitude',
                      hintText: '112.55',
                      isDense: true,
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                IconButton(
                  onPressed: _submitManualLocation,
                  icon: const Icon(Icons.check_circle),
                  color: AppColors.primary,
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Area layanan: Lat -7.60 s.d. -7.35, Lng 112.35 s.d. 112.75',
              style: AppTypography.caption,
            ),
          ],
        ],
      ],
    );
  }
}
