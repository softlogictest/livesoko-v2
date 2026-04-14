import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SmsListener from 'expo-sms-listener';

export default function App() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('Idle');

  // Load saved Webhook on startup
  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem('LIVESOKO_WEBHOOK_URL');
      if (saved) setWebhookUrl(saved);
    };
    load();
  }, []);

  // Listen for SMS while app is in foreground (UI Feedback)
  useEffect(() => {
    const subscription = SmsListener.addListener((message) => {
      if (message.body.includes('MPESA')) {
        addLog(`📩 Received M-Pesa: ${message.originatingAddress}`);
        handleSync(message.body, message.originatingAddress);
      }
    });
    return () => subscription.remove();
  }, [webhookUrl]);

  const addLog = (msg) => {
    setLogs(prev => [`${new Date().toLocaleTimeString()} - ${msg}`, ...prev].slice(0, 5));
  };

  const handleSave = async () => {
    if (!webhookUrl.startsWith('http')) {
      alert('Please enter a valid Webhook URL starting with http/https');
      return;
    }
    await AsyncStorage.getItem('LIVESOKO_WEBHOOK_URL');
    await AsyncStorage.setItem('LIVESOKO_WEBHOOK_URL', webhookUrl);
    setStatus('Ready');
    addLog('✅ Webhook URL Updated');
  };

  const handleSync = async (body, sender) => {
    if (!webhookUrl) return;
    try {
      setStatus('Syncing...');
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: body, sender_number: sender })
      });
      if (res.ok) {
        setStatus('Ready');
        addLog('🚀 Forwarded successfully');
      } else {
        setStatus('Error');
        addLog('❌ Server rejected SMS');
      }
    } catch (e) {
      setStatus('Offline');
      addLog('⚠️ Connection error');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.title}>LiveSoko Sync</Text>
        <Text style={styles.subtitle}>M-Pesa Automation Engine</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>WEBHOOK URL</Text>
        <TextInput 
          style={styles.input}
          value={webhookUrl}
          onChangeText={setWebhookUrl}
          placeholder="Paste URL from LiveSoko Settings"
          placeholderTextColor="#666"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>SAVE & CONNECT</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.dot, { backgroundColor: status === 'Ready' ? '#00FF88' : '#FF4444' }]} />
        <Text style={styles.statusText}>Status: {status}</Text>
      </View>

      <View style={styles.logContainer}>
        <Text style={styles.logHeader}>ACTIVITY LOG</Text>
        <ScrollView style={styles.logScroll}>
          {logs.map((log, i) => (
            <Text key={i} style={styles.logText}>{log}</Text>
          ))}
          {logs.length === 0 && (
            <Text style={styles.emptyLog}>Waiting for incoming M-Pesa...</Text>
          )}
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Keep this app running in background for 24/7 automation.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    color: '#00FF88',
    fontSize: 28,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#888',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#111',
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 20,
  },
  label: {
    color: '#888',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#333',
    padding: 15,
    borderRadius: 8,
    color: '#fff',
    fontSize: 14,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#00FF88',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 30,
    marginLeft: 5,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#050505',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: '#111',
  },
  logHeader: {
    color: '#444',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 10,
    letterSpacing: 2,
  },
  logScroll: {
    flex: 1,
  },
  logText: {
    color: '#AAA',
    fontSize: 11,
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  emptyLog: {
    color: '#333',
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  footer: {
    marginTop: 20,
    opacity: 0.5,
  },
  footerText: {
    color: '#888',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 16,
  }
});
