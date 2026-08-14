import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../data/mock_data.dart';

class LocationProvider extends ChangeNotifier {
  static const _key = 'neighborhood';

  String _neighborhood = '성수동 2가';
  Position? _position;

  String get neighborhood => _neighborhood;
  Position? get position => _position;

  ({double lat, double lng}) get mapCenter {
    final pos = _position;
    if (pos != null) return (lat: pos.latitude, lng: pos.longitude);
    return neighborhoodCoords[_neighborhood] ?? dealCenter;
  }

  LocationProvider() {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_key);
    if (saved != null && saved != _neighborhood) {
      _neighborhood = saved;
      notifyListeners();
    }
  }

  Future<void> setNeighborhood(String name) async {
    _neighborhood = name;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, name);
  }

  Future<void> requestLocation() async {
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return;

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) return;
      }
      if (permission == LocationPermission.deniedForever) return;

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
      _position = pos;
      notifyListeners();
    } catch (_) {}
  }
}
