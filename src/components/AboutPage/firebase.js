import app from 'firebase/app'
import 'firebase/firestore'

const config = {
  apiKey: 'AIzaSyDuC6seaXRHfexm4Vrz1KY1zcj7Fzs4Kyw',
  authDomain: 'iblog-ba559.firebaseapp.com',
  databaseURL: 'https://blog-ba559.firebaseio.com',
  projectId: 'blog-ba559',
  storageBucket: 'blog-ba559.appspot.com',
  messagingSenderId: '253423669610',
  appId: '1:253423669610:web:f95b270a41c14c8a'
}
// Initalize and export Firebase.
export default (!app.apps.length ? app.initializeApp(config) : app.app())
