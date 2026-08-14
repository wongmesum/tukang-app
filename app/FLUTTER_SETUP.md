# Flutter Project Setup

File-file di `android/` dan `ios/` adalah **placeholder**.
Untuk mendapatkan project Flutter yang bisa di-build:

## Langkah:

```bash
# 1. Pastikan Flutter SDK ter-install
flutter --version

# 2. Masuk ke folder app
cd app

# 3. Regenerate native project files
flutter create . --org id.tukangndeso --project-name tukangndeso --platforms android,ios

# 4. Restore custom files yang sudah ada:
#    - android/app/build.gradle (sudah custom, bandingkan dengan generated)
#    - android/app/src/main/AndroidManifest.xml (sudah custom)
#    - android/settings.gradle (sudah custom)
#    - ios/Runner/AppDelegate.swift (sudah custom)
#    - ios/Runner/Info.plist (sudah custom)
#    - ios/Podfile (sudah custom)

# 5. Install dependencies
flutter pub get

# 6. Tempatkan Firebase config:
#    - android/app/google-services.json
#    - ios/Runner/GoogleService-Info.plist

# 7. Set Google Maps API Key:
#    - android/app/local.properties → GOOGLE_MAPS_API_KEY=AIza...
#    - ios/Runner/AppDelegate.swift → GMSServices.provideAPIKey("AIza...")

# 8. Run
flutter run --flavor development
```

## Catatan:
- File `lib/` sudah berisi semua kode Dart (22 screens, providers, services)
- `flutter create .` TIDAK menimpa file `lib/` yang sudah ada
- Hanya `android/` dan `ios/` boilerplate yang di-generate ulang
- Setelah itu, merge custom config dari file yang sudah kita buat
