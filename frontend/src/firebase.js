import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

// Firebase Config kutoka kwenye Console yako
const firebaseConfig = {
  apiKey: "AIzaSyC42hnZVPT_E5XuBOD_0F1M1vy4-KUWoKE",
  authDomain: "genz-chat-a075f.firebaseapp.com",
  projectId: "genz-chat-a075f",
  storageBucket: "genz-chat-a075f.firebasestorage.app",
  messagingSenderId: "342533801043",
  appId: "1:342533801043:web:77f77b5199fb9dc122f2a6",
  measurementId: "G-SKEK42K36F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Function ya kutengeneza reCAPTCHA
export function setupRecaptcha() {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
      'callback': (response) => {
        // reCAPTCHA imethibitishwa
      }
    });
  }
  return window.recaptchaVerifier;
}

// Function ya Kutuma OTP
export function sendOtpToUser(phoneNumber) {
  const appVerifier = setupRecaptcha();
  
  // phoneNumber lazima iwe na Country Code, mfano: +2557XXXXXXXX
  return signInWithPhoneNumber(auth, phoneNumber, appVerifier)
    .then((confirmationResult) => {
      window.confirmationResult = confirmationResult;
      return { success: true, message: "OTP imetumwa!" };
    })
    .catch((error) => {
      console.error("SMS Error:", error);
      return { success: false, message: error.message || "Failed to send OTP" };
    });
}

// Function ya Kuhakiki OTP
export function verifyUserOtp(otpCode) {
  if (!window.confirmationResult) {
    return Promise.reject({ success: false, message: "No pending OTP verification" });
  }
  
  return window.confirmationResult.confirm(otpCode)
    .then((result) => {
      const user = result.user;
      return { success: true, user, message: "Uhakiki Umefanikiwa!" };
    })
    .catch((error) => {
      return { success: false, message: error.message || "OTP sio sahihi!" };
    });
}

export default app;
