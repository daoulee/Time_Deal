class AppConfig {
  // 빌드 시 --dart-define으로 주입, 없으면 하드코딩 fallback (개발용)
  static const supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://gnrnsbuqmofcjoamjsqk.supabase.co',
  );
  static const supabasePublishableKey = String.fromEnvironment(
    'SUPABASE_KEY',
    defaultValue: 'sb_publishable_s6iikkgXxBka9Uo9R0fN7A_qgQqG_YI',
  );
}
