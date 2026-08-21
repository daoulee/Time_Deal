import 'dart:developer' as developer;

class AppLogger {
  static void error(String message, Object error, [StackTrace? stackTrace]) {
    developer.log(
      message,
      level: 1000,
      name: 'AppError',
      error: error,
      stackTrace: stackTrace,
    );
  }

  static void info(String message) {
    developer.log(message, name: 'AppInfo');
  }
}
