class Formatters {
  static final _priceRegex = RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))');
  static String price(int value) =>
      value.toString().replaceAllMapped(_priceRegex, (m) => '${m[1]},');
}
