import 'dart:convert';

import 'package:http/http.dart' as http;

import 'api_origin.dart' as platform;
import 'models.dart';

class ApiException implements Exception {
  const ApiException(this.messageKey, this.statusCode, {this.resetsAt});

  final String messageKey;
  final int statusCode;
  final String? resetsAt;

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

  Future<Json> assistantRequest(String method, String path,
      {required String capability, Json? payload}) async {
    final request = http.Request(method, Uri.parse('$baseUrl$path'));
    request.headers.addAll({
      'content-type': 'application/json',
      'authorization': 'Bearer $capability'
    });
    if (payload != null) request.body = jsonEncode(payload);
    return _read(await http.Response.fromStream(await _client.send(request))
        .timeout(const Duration(seconds: 12)));
  }

  Json _read(http.Response response) {
    final decoded =
        response.body.isEmpty ? <String, dynamic>{} : jsonDecode(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final error = decoded is Map ? decoded['error'] : null;
      throw ApiException(
        error is Map
            ? '${error['code'] ?? 'request_failed'}'
            : 'request_failed',
        response.statusCode,
        resetsAt: decoded is Map ? decoded['resetsAt'] as String? : null,
      );
    }
    if (decoded is! Map<String, dynamic>) {
      throw const ApiException('invalid_response', 500);
    }
    return decoded;
  }

  void close() => _client.close();
}
