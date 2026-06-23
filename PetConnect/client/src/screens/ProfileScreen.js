import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '../context/AuthContext';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>Account</Text>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Username</Text>
        <Text style={styles.value}>{user?.username}</Text>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email}</Text>
        <Text style={styles.label}>Role</Text>
        <Text style={styles.value}>{user?.role}</Text>
      </View>

      <View style={styles.actionCard}>
        <TouchableOpacity
          style={styles.primaryAction}
          onPress={() => navigation.navigate('Statistics')}
        >
          <Text style={styles.primaryActionText}>View My Activity Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryAction}
          onPress={() => navigation.navigate('MediaStudio')}
        >
          <Text style={styles.secondaryActionText}>Open Pet Post Creator</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f7fbf6'
  },
  kicker: {
    color: '#2f8f68',
    fontWeight: '800',
    marginBottom: 4
  },
  title: {
    color: '#173b2c',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 14
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 18,
    borderWidth: 1,
    borderColor: '#dcebe1',
    marginBottom: 14
  },
  label: {
    color: '#2f8f68',
    fontWeight: '800',
    marginTop: 10
  },
  value: {
    color: '#173b2c',
    fontSize: 16,
    marginTop: 4
  },
  actionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 18,
    borderWidth: 1,
    borderColor: '#dcebe1',
    gap: 12
  },
  primaryAction: {
    backgroundColor: '#2f8f68',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center'
  },
  primaryActionText: {
    color: '#ffffff',
    fontWeight: '800'
  },
  secondaryAction: {
    borderWidth: 1,
    borderColor: '#2f8f68',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center'
  },
  secondaryActionText: {
    color: '#2f8f68',
    fontWeight: '800'
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#b3261e',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center'
  },
  logoutText: {
    color: '#b3261e',
    fontWeight: '800'
  }
});
