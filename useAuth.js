// useAuth.js
import { useEffect } from "react";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

export function useAuth(setUser) {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setUser(user);
      else signInAnonymously(auth);
    });
    return () => unsubscribe();
  }, []);
}
