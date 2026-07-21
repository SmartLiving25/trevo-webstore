"use client";

import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      if (!firebaseAuth) {
        throw new Error("Firebase is not configured.");
      }

      const credential = await signInWithEmailAndPassword(
        firebaseAuth,
        email,
        password,
      );

      const idToken = await credential.user.getIdToken();

      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("This account is not authorized as an administrator.");
      }

      window.location.href = "/admin";
    } catch {
      setMessage("Login failed. Check your admin email and password.");
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "#f5f1e9",
        color: "#22211d",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "40px",
          background: "#ffffff",
          border: "1px solid #d8d2c7",
          borderRadius: "12px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
        }}
      >
        <p
          style={{
            margin: "0 0 8px",
            fontSize: "12px",
            letterSpacing: "3px",
          }}
        >
          TREVO
        </p>

        <h1 style={{ margin: "0 0 8px", fontSize: "30px" }}>
          Admin sign in
        </h1>

        <p style={{ margin: "0 0 28px", color: "#6d685f" }}>
          Authorized administrators only.
        </p>

        <label style={{ display: "block", marginBottom: "8px" }}>
          Email
        </label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px",
            marginBottom: "18px",
            border: "1px solid #bdb7ac",
            borderRadius: "6px",
          }}
        />

        <label style={{ display: "block", marginBottom: "8px" }}>
          Password
        </label>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px",
            marginBottom: "20px",
            border: "1px solid #bdb7ac",
            borderRadius: "6px",
          }}
        />

        {message && (
          <p
            role="alert"
            style={{ color: "#a12525", margin: "0 0 18px" }}
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "13px",
            border: 0,
            borderRadius: "6px",
            background: "#22211d",
            color: "#ffffff",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
