"use client";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { StorePageShell } from "../../components/StorePageShell";
import { firebaseAuth } from "../../../lib/firebase/client";

export function AccountSettings() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [updates, setUpdates] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setUpdates(localStorage.getItem("trevo-email-updates") === "yes");
    if (!firebaseAuth) {
      setReady(true);
      return;
    }
    return onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);
      setReady(true);
    });
  }, []);

  const savePreferences = () => {
    localStorage.setItem("trevo-email-updates", updates ? "yes" : "no");
    setSaved(true);
  };

  return (
    <StorePageShell eyebrow="My Trevo" title="Account settings" introduction="Manage your sign-in and shopping preferences.">
      <div className="settings-card">
        {!ready ? <p>Loading your account…</p> : user ? (
          <>
            <h2>{user.displayName || "Trevo customer"}</h2>
            <p>{user.email}</p>
            <label className="settings-toggle"><input type="checkbox" checked={updates} onChange={(event) => setUpdates(event.target.checked)} /><span>Send me collection previews and Trevo updates.</span></label>
            <div className="settings-actions">
              <button className="information-button" onClick={savePreferences}>Save preferences</button>
              <button onClick={() => firebaseAuth && signOut(firebaseAuth)}>Sign out</button>
            </div>
            {saved && <p className="settings-success">Preferences saved.</p>}
          </>
        ) : (
          <><h2>Sign in to manage your account</h2><p>Your account panel on the store handles secure sign-in and registration.</p><a className="information-button" href="/?account=1">Open sign in</a></>
        )}
      </div>
    </StorePageShell>
  );
}
