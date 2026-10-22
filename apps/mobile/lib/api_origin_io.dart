import 'dart:io';

const _localhost = 'http://localhost:3001';

String get defaultApiOrigin => Platform.isAndroid
    ? 'http://10.0.2.2:3001'
    : _localhost;
