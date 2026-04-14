import { AppRegistry } from 'react-native';
import App from './App';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Register the Headless JS Task for Background Sync
AppRegistry.registerHeadlessTask('LiveSokoSyncTask', () => async (data) => {
  const { originatingAddress, body, timestamp } = data;
  
  // Only process M-PESA messages
  if (!body.includes('MPESA')) return;

  try {
    const webhookUrl = await AsyncStorage.getItem('LIVESOKO_WEBHOOK_URL');
    if (!webhookUrl) return;

    // Forward to LiveSoko Backend
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: body,
        sender_number: originatingAddress,
        sync_meta: { background: true, timestamp }
      })
    });
    
    console.log('[LiveSoko Sync] Successfully forwarded SMS in background.');
  } catch (err) {
    console.error('[LiveSoko Sync] Background forward failed:', err);
  }
});

// 2. Standard App Entry
AppRegistry.registerComponent('main', () => App);
