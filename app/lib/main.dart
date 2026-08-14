import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/providers/theme_provider.dart';
import 'core/providers/deal_provider.dart';
import 'core/providers/location_provider.dart';
import 'core/providers/reservation_provider.dart';
import 'core/providers/wishlist_provider.dart';
import 'core/services/device_id.dart';
import 'core/theme/app_theme.dart';
import 'screens/splash/splash_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: 'https://gnrnsbuqmofcjoamjsqk.supabase.co',
    publishableKey: 'sb_publishable_HPLVv4uynMxvMV4nklcU9w_sJNtgTMJ',
  );

  await DeviceId.init();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => DealProvider()),
        ChangeNotifierProvider(create: (_) => LocationProvider()),
        ChangeNotifierProvider(create: (_) => ReservationProvider()),
        ChangeNotifierProvider(create: (_) => WishlistProvider()),
      ],
      child: const TownFlashDealApp(),
    ),
  );
}

class TownFlashDealApp extends StatelessWidget {
  const TownFlashDealApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();
    return MaterialApp(
      title: '우리 동네 타임딜',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: themeProvider.mode,
      home: const SplashScreen(),
    );
  }
}
