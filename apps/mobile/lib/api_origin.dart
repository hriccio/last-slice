import 'api_origin_stub.dart'
    if (dart.library.io) 'api_origin_io.dart'
    if (dart.library.js_interop) 'api_origin_web.dart' as selected;

String get defaultApiOrigin => selected.defaultApiOrigin;
