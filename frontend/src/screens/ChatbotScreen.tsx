import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatbotScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🤖 Chatbot</Text>
      <Text style={styles.subtitle}>Trợ lý tâm lý AI của bạn</Text>

      <View style={styles.card}>
        <Text style={styles.cardEmoji}>💬</Text>
        <Text style={styles.cardText}>Tính năng đang được phát triển...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    // paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  cardText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
