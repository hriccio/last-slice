import 'dart:convert';

import 'package:http/http.dart' as http;

import 'api_origin.dart' as platform;
import 'models.dart';

class ApiException implements Exception {
  const ApiException(this.messageKey, this.statusCode);

  final String messageKey;
  final int statusCode;

  @override
  String toString() => messageKey;
}

class ApiClient {
  ApiClient() : _client = http.Client();

  final http.Client _client;

  static const _configuredBaseUrl = String.fromEnvironment('API_BASE_URL');

  String get baseUrl => (_configuredBaseUrl.isNotEmpty
          ? _configuredBaseUrl
          : platform.defaultApiOrigin)
      .replaceFirst(RegExp(r'/+$'), '');

  Future<Json> get(String path) async =>
      _read(await _client.get(Uri.parse('$baseUrl$path')));

  Future<Json> post(String path, Json payload) async => _read(
        await _client.post(
          Uri.parse('$baseUrl$path'),
          headers: const {'content-type': 'application/json'},
          body: jsonEncode(payload),
        ),
      );

  Json _read(http.Response response) {
    final decoded = response.body.isEmpty ? <String, dynamic>{} : jsonDecode(response.body);
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

  void close() => _client.close();
}
