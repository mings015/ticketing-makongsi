class UserProfile {
  final String id;
  final String email;
  final String fullName;
  final List<String> roles;

  const UserProfile({
    required this.id,
    required this.email,
    required this.fullName,
    required this.roles,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
        id: json['id'] as String,
        email: json['email'] as String,
        fullName: json['fullName'] as String,
        roles: List<String>.from((json['roles'] as List?) ?? []),
      );

  String get primaryRole => roles.isNotEmpty ? roles.first : 'employee';
  bool get isEmployee => roles.contains('employee') && !roles.any((r) => ['support', 'admin', 'super_admin'].contains(r));
  bool get isSupport => roles.contains('support');
  bool get isAdmin => roles.any((r) => ['admin', 'super_admin'].contains(r));
}

class AuthState {
  final UserProfile? user;
  final bool isAuthenticated;

  const AuthState({this.user, this.isAuthenticated = false});

  const AuthState.unauthenticated() : user = null, isAuthenticated = false;
  AuthState.authenticated(this.user) : isAuthenticated = true;
}
