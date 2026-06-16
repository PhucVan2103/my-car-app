import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDQ6jUxK1MI-ZxdxjnDZs_iP9vs_v_dxbg",
  authDomain: "my-car-app-112a3.firebaseapp.com",
  projectId: "my-car-app-112a3",
  storageBucket: "my-car-app-112a3.firebasestorage.app",
  messagingSenderId: "660836639837",
  appId: "1:660836639837:web:5d8b28ce464cd3a2ba19b4"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);

// Khởi tạo Cloud Firestore và lấy tham chiếu đến dịch vụ
export const db = getFirestore(app);