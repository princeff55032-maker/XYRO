import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import QRCode from "react-native-qrcode-svg";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const TOKEN_KEY = "xyro-member-token";

type MemberData = {
  profile: { memberId: string; name: string; email: string; phone?: string | null };
  gym: { name: string; gymCode: string; address?: string | null };
  membership: { status: string; endDate: string; plan: { name: string; price: number } } | null;
  attendance: Array<{ id: string; checkIn: string; checkOut?: string | null }>;
  progress: Array<{ id: string; date: string; weight?: number | null; bmi?: number | null }>;
  payments: Array<{ id: string; totalAmount: number; status: string; createdAt: string }>;
  workouts: Array<{ id: string; name: string; description?: string | null; exercises: Array<{ exerciseName: string; sets: number; reps: string }> }>;
  diets: Array<{ id: string; name: string; totalCalories?: number | null; meals: Array<{ mealType: string; foodItems: string }> }>;
  qr: { token: string; expiresAt: string; isValid: boolean };
};

async function request(path: string, token: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options?.headers ?? {}) },
  });
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : { error: `The server returned HTTP ${response.status}. Please redeploy the XYRO API.` };
  if (!response.ok) throw new Error(body.error ?? "Request failed.");
  return body;
}

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/mobile/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const contentType = response.headers.get("content-type") ?? "";
      const body = contentType.includes("application/json")
        ? await response.json()
        : { error: `The server returned HTTP ${response.status}. Please redeploy the XYRO API.` };
      if (!response.ok) throw new Error(body.error ?? "Unable to sign in.");
      await SecureStore.setItemAsync(TOKEN_KEY, body.accessToken);
      onLogin(body.accessToken);
    } catch (error) {
      Alert.alert("Sign in failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.login}>
        <Text style={styles.logo}>XYRO</Text>
        <Text style={styles.kicker}>MEMBER PORTAL</Text>
        <Text style={styles.title}>Your training, in your pocket.</Text>
        <Text style={styles.muted}>Sign in with your member email, phone, or member ID.</Text>
        <TextInput autoCapitalize="none" autoCorrect={false} placeholder="Email, phone, or Member ID" placeholderTextColor="#8C7A6B" value={identifier} onChangeText={setIdentifier} style={styles.input} />
        <TextInput placeholder="Password" placeholderTextColor="#8C7A6B" secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />
        <Pressable onPress={submit} disabled={loading} style={styles.primary}>
          {loading ? <ActivityIndicator color="#08111f" /> : <Text style={styles.primaryText}>Sign in</Text>}
        </Pressable>
      </View>
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [data, setData] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"home" | "plans" | "progress" | "profile">("home");
  const latestProgress = data?.progress[0];
  const expiresAt = useMemo(() => data?.qr.expiresAt ? new Date(data.qr.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "", [data]);

  async function load() {
    try {
      setData(await request("/api/mobile/member", token));
    } catch (error) {
      if (error instanceof Error && error.message === "Unauthorized.") onLogout();
      else Alert.alert("Could not load your account", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // The initial fetch synchronizes persisted authentication with the remote member session.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [token]);

  async function saveProgress() {
    try {
      await request("/api/mobile/member", token, { method: "POST", body: JSON.stringify({ weight: latestProgress?.weight ?? undefined }) });
      await load();
      Alert.alert("Saved", "Your progress entry was added.");
    } catch (error) {
      Alert.alert("Could not save progress", error instanceof Error ? error.message : "Please try again.");
    }
  }

  if (loading || !data) return <SafeAreaView style={styles.safe}><ActivityIndicator color="#b6ff45" size="large" /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}><View><Text style={styles.eyebrow}>{data.gym.name}</Text><Text style={styles.title}>Hey, {data.profile.name.split(" ")[0]}.</Text></View><Text style={styles.avatar}>{data.profile.name.slice(0, 1).toUpperCase()}</Text></View>
        {tab === "home" && <>
          <View style={styles.qrCard}><View><Text style={styles.cardLabel}>MEMBER PASS</Text><Text style={styles.qrState}>{data.qr.isValid ? "Ready to scan" : "Membership inactive"}</Text><Text style={styles.muted}>Refreshes every 60 seconds · until {expiresAt}</Text></View><QRCode value={data.qr.token} size={112} backgroundColor="#ffffff" color="#08111f" /></View>
          <View style={styles.grid}><Stat label="Membership" value={data.membership?.plan.name ?? "No active plan"} /><Stat label="Valid until" value={data.membership ? new Date(data.membership.endDate).toLocaleDateString() : "—"} /><Stat label="Check-ins" value={String(data.attendance.length)} /><Stat label="Latest weight" value={latestProgress?.weight ? `${latestProgress.weight} kg` : "—"} /></View>
          <Section title="Your plans"><Text style={styles.body}>{data.workouts[0]?.name ?? "No workout plan assigned yet."}</Text><Text style={styles.body}>{data.diets[0]?.name ?? "No diet plan assigned yet."}</Text></Section>
        </>}
        {tab === "plans" && <><Section title="Workout plan">{data.workouts.length ? data.workouts.map((plan) => <View key={plan.id} style={styles.listCard}><Text style={styles.cardTitle}>{plan.name}</Text>{plan.exercises.map((exercise) => <Text key={exercise.exerciseName} style={styles.body}>• {exercise.exerciseName} · {exercise.sets} × {exercise.reps}</Text>)}</View>) : <Text style={styles.muted}>Your trainer has not assigned a workout plan yet.</Text>}</Section><Section title="Diet plan">{data.diets.length ? data.diets.map((plan) => <View key={plan.id} style={styles.listCard}><Text style={styles.cardTitle}>{plan.name}</Text>{plan.meals.map((meal) => <Text key={meal.mealType} style={styles.body}>{meal.mealType}: {meal.foodItems}</Text>)}</View>) : <Text style={styles.muted}>Your trainer has not assigned a diet plan yet.</Text>}</Section></>}
        {tab === "progress" && <><Section title="Progress tracking"><Text style={styles.muted}>Latest measurement: {latestProgress?.weight ? `${latestProgress.weight} kg` : "No measurements yet"}.</Text><Pressable onPress={saveProgress} style={styles.secondary}><Text style={styles.secondaryText}>Log today’s current measurement</Text></Pressable>{data.progress.map((entry) => <View key={entry.id} style={styles.row}><Text style={styles.body}>{new Date(entry.date).toLocaleDateString()}</Text><Text style={styles.body}>{entry.weight ? `${entry.weight} kg` : "No weight"} · BMI {entry.bmi ?? "—"}</Text></View>)}</Section><Section title="Attendance">{data.attendance.slice(0, 10).map((entry) => <View key={entry.id} style={styles.row}><Text style={styles.body}>{new Date(entry.checkIn).toLocaleDateString()}</Text><Text style={styles.muted}>{new Date(entry.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text></View>)}</Section></>}
        {tab === "profile" && <Section title="Profile"><Text style={styles.body}>{data.profile.name}</Text><Text style={styles.muted}>{data.profile.email}</Text><Text style={styles.muted}>{data.profile.phone ?? "No phone number"}</Text><Text style={styles.body}>Member ID: {data.profile.memberId}</Text><Text style={styles.body}>{data.gym.address ?? "Gym address unavailable"}</Text><Pressable onPress={onLogout} style={styles.danger}><Text style={styles.dangerText}>Sign out</Text></Pressable></Section>}
      </ScrollView>
      <View style={styles.nav}>{[["home", "Home"], ["plans", "Plans"], ["progress", "Progress"], ["profile", "Profile"]].map(([value, label]) => <Pressable key={value} onPress={() => setTab(value as typeof tab)}><Text style={tab === value ? styles.navActive : styles.navText}>{label}</Text></Pressable>)}</View>
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <View style={styles.stat}><Text style={styles.cardLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>;
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => { SecureStore.getItemAsync(TOKEN_KEY).then(setToken); }, []);
  function logout() { void SecureStore.deleteItemAsync(TOKEN_KEY); setToken(null); }
  return token ? <Dashboard token={token} onLogout={logout} /> : <Login onLogin={setToken} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F9F8F6" },
  content: { padding: 20, paddingBottom: 100 },
  login: { flex: 1, justifyContent: "center", padding: 24 },
  logo: { color: "#8B5E34", fontSize: 40, fontWeight: "900", letterSpacing: 4, marginBottom: 10 },
  kicker: { color: "#A07850", fontSize: 11, fontWeight: "800", letterSpacing: 2, marginBottom: 18 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { color: "#33281E", fontSize: 30, fontWeight: "800", marginBottom: 8 },
  eyebrow: { color: "#8B5E34", fontSize: 12, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  muted: { color: "#8C7A6B", fontSize: 14, lineHeight: 21 },
  input: { backgroundColor: "#FFFFFF", borderColor: "#E5D9C5", borderWidth: 1, borderRadius: 10, color: "#33281E", padding: 16, marginTop: 14, fontSize: 16 },
  primary: { backgroundColor: "#8B5E34", borderRadius: 10, padding: 17, alignItems: "center", marginTop: 18, shadowColor: "#33281E", shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  primaryText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  avatar: { width: 44, height: 44, borderRadius: 22, textAlign: "center", textAlignVertical: "center", backgroundColor: "#E5D9C5", color: "#8B5E34", fontWeight: "900", fontSize: 20 },
  qrCard: { backgroundColor: "#FFFFFF", borderColor: "#E5D9C5", borderWidth: 1, borderRadius: 16, padding: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14, shadowColor: "#33281E", shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  cardLabel: { color: "#A07850", fontSize: 11, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 },
  qrState: { color: "#33281E", fontSize: 21, fontWeight: "900", marginBottom: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 18 },
  stat: { backgroundColor: "#FFFFFF", borderColor: "#E5D9C5", borderWidth: 1, borderRadius: 12, padding: 16, width: "48%", minHeight: 92 },
  statValue: { color: "#33281E", fontSize: 17, fontWeight: "800" },
  section: { marginTop: 16 },
  sectionTitle: { color: "#33281E", fontSize: 19, fontWeight: "800", marginBottom: 12 },
  cardTitle: { color: "#33281E", fontSize: 16, fontWeight: "800", marginBottom: 8 },
  body: { color: "#59493B", fontSize: 15, lineHeight: 24, marginBottom: 6 },
  listCard: { backgroundColor: "#FFFFFF", borderColor: "#E5D9C5", borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", borderBottomColor: "#E5D9C5", borderBottomWidth: 1, paddingVertical: 12 },
  secondary: { borderColor: "#8B5E34", borderWidth: 1, borderRadius: 10, padding: 13, alignItems: "center", marginVertical: 16 },
  secondaryText: { color: "#8B5E34", fontWeight: "800" },
  danger: { borderColor: "#B45309", borderWidth: 1, borderRadius: 10, padding: 14, alignItems: "center", marginTop: 24 },
  dangerText: { color: "#B45309", fontWeight: "800" },
  nav: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FFFFFF", flexDirection: "row", justifyContent: "space-around", paddingVertical: 18, borderTopColor: "#E5D9C5", borderTopWidth: 1 },
  navText: { color: "#8C7A6B", fontWeight: "700" },
  navActive: { color: "#8B5E34", fontWeight: "900" },
});
