FLUTTER ?= flutter
API_BASE_URL ?= http://localhost:3001
CHROME_EXECUTABLE ?= chromium
ANDROID_API_BASE_URL ?= http://10.0.2.2:3001

.PHONY: dev dev-ai api api-ai flutter flutter-get flutter-web-server flutter-build-web flutter-local android android-build

# Start the API and web app for local development.
dev:
	npm run dev

# Start only the API when you do not already run it with `npm run dev`.
dev-ai:
	npm run dev:ai

api-ai:
	npm run dev:api:ai

api:
	npm run dev:api

flutter-get:
	cd apps/mobile && $(FLUTTER) pub get

# Run the Flutter PWA in Chrome. Web support is enabled in Flutter's local config.
flutter: flutter-get
	$(FLUTTER) config --enable-web
	cd apps/mobile && CHROME_EXECUTABLE=$(CHROME_EXECUTABLE) $(FLUTTER) run -d chrome --dart-define=API_BASE_URL=$(API_BASE_URL)

# Alias for the Flutter app only; API should already be running at API_BASE_URL.
flutter-local: flutter

# Start Flutter's browser-independent web server and open its printed local URL.
flutter-web-server: flutter-get
	$(FLUTTER) config --enable-web
	cd apps/mobile && $(FLUTTER) run -d web-server --dart-define=API_BASE_URL=$(API_BASE_URL)

flutter-build-web: flutter-get
	$(FLUTTER) config --enable-web
	cd apps/mobile && $(FLUTTER) build web --release --dart-define=API_BASE_URL=$(API_BASE_URL)

# Run on the selected Android emulator; start the API with `npm run dev` first.
android: flutter-get
	cd apps/mobile && $(FLUTTER) run --dart-define=API_BASE_URL=$(ANDROID_API_BASE_URL)

# Build a locally installable debug APK for the Android emulator.
android-build: flutter-get
	cd apps/mobile && $(FLUTTER) build apk --debug --dart-define=API_BASE_URL=$(ANDROID_API_BASE_URL)
