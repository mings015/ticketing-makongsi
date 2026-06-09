import '../../../../core/network/api_client.dart';
import '../models/dashboard_models.dart';

class DashboardRepository {
  final ApiClient _api;

  const DashboardRepository(this._api);

  Future<DashboardData> getDashboard() async {
    return _api.get<DashboardData>(
      '/dashboard',
      fromJson: (json) =>
          DashboardData.fromJson(json as Map<String, dynamic>),
    );
  }
}
