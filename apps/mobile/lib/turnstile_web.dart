import 'dart:js_interop';

@JS('lastSliceTurnstileToken')
external JSPromise<JSString> _getToken(JSString siteKey);

Future<String?> getTurnstileToken(String siteKey) async {
  if (siteKey.isEmpty) return null;
  return (await _getToken(siteKey.toJS).toDart).toDart;
}
