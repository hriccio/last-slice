import 'dart:convert';
import 'dart:io';

import 'models.dart';

class ApiException implements Exception {
  const ApiException(this.messageKey, this.statusCode);

  final String messageKey;
  final int statusCode;

  @override
  String toString() => messageKey;
}

class ApiClient {
  ApiClient() : _client = HttpClient();

  final HttpClient _client;

  static const _configuredBaseUrl = String.fromEnvironment('API_BASE_URL');

  String get baseUrl {
    if (_configuredBaseUrl.isNotEmpty) return _configuredBaseUrl;
    return Platform.isAndroid ? 'http://10.0.2.2:3001' : 'http://localhost:3001';
  }

  Future<Json> get(String path) async {
    final request = await _client.getUrl(Uri.parse('$baseUrl$path'));
    return _read(await request.close());
  }

  Future<Json> post(String path, Json payload) async {
    final request = await _client.postUrl(Uri.parse('$baseUrl$path'));
    request.headers.contentType = ContentType.json;
    request.write(jsonEncode(payload));
    return _read(await request.close());
  }

  Future<Json> _read(HttpClientResponse response) async {
    final body = await utf8.decoder.bind(response).join();
    final decoded = body.isEmpty ? <String, dynamic>{} : jsonDecode(body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final error = decoded is Map ? decoded['error'] : null;
      throw ApiException(
        error is Map ? '${error['code'] ?? 'request_failed'}' : 'request_failed',
        response.statusCode,
      );
    }
    if (decoded is! Map<String, dynamic>) {
      throw const ApiException('invalid_response', 500);
    }
    return decoded;
  }

  void close() => _client.close(force: true);
}
