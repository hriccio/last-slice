FLUTTER ?= flutter
API_BASE_URL ?= http://localhost:3001
CHROME_EXECUTABLE ?=

.PHONY: api flutter flutter-get flutter-web-server flutter-build-web flutter-local

# Start the API in its own terminal when you only want to run Flutter.
api:
	npm run dev:api

flutter-get:
	cd apps/mobile && $(FLUTTER) pub get

# Run the Flutter app in Chrome. Override CHROME_EXECUTABLE when needed.
flutter: flutter-get
	cd apps/mobile && $(if $(CHROME_EXECUTABLE),CHROME_EXECUTABLE=$(CHROME_EXECUTABLE) ,)$(FLUTTER) run -d chrome --dart-define=API_BASE_URL=$(API_BASE_URL)

# Run Flutter's local web server when Chrome launch is unavailable.
flutter-web-server: flutter-get
	cd apps/mobile && $(FLUTTER) run -d web-server --dart-define=API_BASE_URL=$(API_BASE_URL)

flutter-build-web: flutter-get
	cd apps/mobile && $(FLUTTER) build web --release --dart-define=API_BASE_URL=$(API_BASE_URL)

# Start the API and Flutter app together; Ctrl+C stops both.
flutter-local: flutter-get
	npx concurrently -k -n api,flutter -c yellow,cyan "npm run dev:api" "cd apps/mobile && $(if $(CHROME_EXECUTABLE),CHROME_EXECUTABLE=$(CHROME_EXECUTABLE) ,)$(FLUTTER) run -d chrome --dart-define=API_BASE_URL=$(API_BASE_URL)"
