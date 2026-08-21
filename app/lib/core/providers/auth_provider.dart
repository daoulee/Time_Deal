import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../utils/app_logger.dart';

class AuthProvider extends ChangeNotifier {
  final _supabase = Supabase.instance.client;
  bool _loading = false;
  String? _error;
  final List<String> _authLog = [];

  User? get currentUser => _supabase.auth.currentUser;
  bool get isLoggedIn => currentUser != null;
  bool get loading => _loading;
  String? get error => _error;
  List<String> get authLog => List.unmodifiable(_authLog);

  // [Antigravity | 2026-08-21] 수정범위: isRegistered / isNewUser / markRegistered — Supabase 메타데이터 및 타임스탬프 기반 가입 여부 완벽 판별
  bool get isRegistered {
    final user = currentUser;
    if (user == null) return false;
    final meta = user.userMetadata;
    if (meta != null && meta['is_registered'] == true) return true;
    final created = DateTime.tryParse(user.createdAt);
    if (created != null && DateTime.now().toUtc().difference(created.toUtc()).inMinutes > 3) {
      return true;
    }
    return false;
  }

  bool get isNewUser => !isRegistered;

  Future<void> markRegistered() async {
    try {
      await _supabase.auth.updateUser(
        UserAttributes(data: {'is_registered': true}),
      );
      _log('사용자 가입 상태 등록 완료 (is_registered=true)');
      notifyListeners();
    } catch (e) {
      _log('markRegistered 에러: $e');
    }
  }

  void _log(String msg) {
    final line = '[${DateTime.now().toIso8601String().substring(11, 19)}] $msg';
    _authLog.add(line);
    AppLogger.info('[AuthProvider] $msg');
    notifyListeners();
  }

  String get displayName =>
      currentUser?.userMetadata?['full_name'] as String? ??
      currentUser?.userMetadata?['name'] as String? ??
      currentUser?.email?.split('@').first ??
      '김동네';

  String? get avatarUrl =>
      currentUser?.userMetadata?['avatar_url'] as String? ??
      currentUser?.userMetadata?['picture'] as String?;

  AuthProvider() {
    _supabase.auth.onAuthStateChange.listen((event) {
      _log('onAuthStateChange: ${event.event} / user=${event.session?.user.email}');
      notifyListeners();
    });
  }

  void _setLoading(bool v) {
    _loading = v;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void clearLog() {
    _authLog.clear();
    notifyListeners();
  }

  Future<bool> signInWithGoogle() => _oauthWithWebAuth(OAuthProvider.google);
  Future<bool> signInWithKakao() => _oauthWithWebAuth(OAuthProvider.kakao);

  Future<bool> _oauthWithWebAuth(OAuthProvider provider, {String? scopes}) async {
    _log('${provider.name} 로그인 시작');
    _setLoading(true);
    try {
      _log('getOAuthSignInUrl 호출 중...');
      final res = await _supabase.auth.getOAuthSignInUrl(
        provider: provider,
        redirectTo: 'io.supabase.townflashdeal://login-callback',
        scopes: scopes,
      );
      _log('OAuth URL 생성 완료. FlutterWebAuth2 호출...');
      final callbackUrl = await FlutterWebAuth2.authenticate(
        url: res.url,
        callbackUrlScheme: 'io.supabase.townflashdeal',
      );
      _log('콜백 URL 수신: $callbackUrl');
      final uri = Uri.parse(callbackUrl);
      await _supabase.auth.getSessionFromUrl(uri);
      _log('세션 획득 완료! 로그인 성공');
      return true;
    } on PlatformException catch (e) {
      if (e.code == 'CANCELED' || e.message?.contains('User canceled') == true) {
        _log('로그인이 취소되었습니다');
        _error = null;
      } else {
        _log('PlatformException: ${e.message}');
        _error = e.message ?? '로그인 중 오류가 발생했어요';
      }
      return false;
    } on AuthException catch (e) {
      _log('AuthException: ${e.message} (statusCode: ${e.statusCode})');
      AppLogger.error('Supabase Auth 에러', e);
      _error = '인증 오류: ${e.message}';
      return false;
    } catch (e, st) {
      _log('ERROR: $e');
      AppLogger.error('OAuth 로그인 실패', e, st);
      _error = '로그인 실패: $e';
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> signInWithEmail(String email, String password) async {
    _setLoading(true);
    try {
      await _supabase.auth.signInWithPassword(email: email, password: password);
      return true;
    } on AuthException catch (e) {
      _error = e.message == 'Invalid login credentials'
          ? '이메일 또는 비밀번호가 올바르지 않아요'
          : e.message;
      return false;
    } catch (e, st) {
      AppLogger.error('이메일 로그인 실패', e, st);
      _error = '로그인에 실패했어요';
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> signUpWithEmail(String email, String password) async {
    _setLoading(true);
    try {
      await _supabase.auth.signUp(email: email, password: password);
      return true;
    } on AuthException catch (e) {
      _error = e.message;
      return false;
    } catch (e, st) {
      AppLogger.error('이메일 회원가입 실패', e, st);
      _error = '회원가입에 실패했어요';
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<void> signOut() async {
    _setLoading(true);
    try {
      await _supabase.auth.signOut();
    } finally {
      _setLoading(false);
    }
  }
}
