FLUTTER ?= flutter
API_BASE_URL ?= http://localhost:3001
CHROME_EXECUTABLE ?= chromium

.PHONY: api flutter flutter-get flutter-web-server flutter-build-web flutter-local

# Start only the API when you do not already run it with `npm run dev`.
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
