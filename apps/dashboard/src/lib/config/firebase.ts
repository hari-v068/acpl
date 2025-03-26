import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

export const firebaseConfig = {
  apiKey: 'AIzaSyANqyEueMYJsZWG27-8LSQ32EbtqrLvj10',
  authDomain: 'acp-lite-dev.firebaseapp.com',
  databaseURL:
    'https://acp-lite-dev-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'acp-lite-dev',
  storageBucket: 'acp-lite-dev.appspot.com',
  messagingSenderId: '985705903986',
  appId: '1:985705903986:web:14b800cc4adf2918954feb',
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { app, database };
