import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

export default function LoginPage() {
  const { login, googleLogin } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/chat", { replace: true });
    } catch {
      setError(t("Invalid username or password.", "اسم المستخدم أو كلمة المرور غير صحيحة."));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(credentialResponse: { credential?: string }) {
    if (!credentialResponse.credential) return;
    setError("");
    setLoading(true);
    try {
      await googleLogin(credentialResponse.credential);
      navigate("/chat", { replace: true });
    } catch {
      setError(t("Google login failed.", "فشل تسجيل الدخول بحساب Google."));
    } finally {
      setLoading(false);
    }
  }

  const loginForm = (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-primary/[0.05] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <Link to="/" className="mx-auto mb-2 inline-flex items-center">
            <img src="/full-logo.svg" alt="Qanoon.ly" className="h-8" />
          </Link>
          <CardTitle className="text-2xl">
            {t("Sign In", "تسجيل الدخول")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t(
              "Sign in to access the legal AI assistant.",
              "سجّل دخولك للوصول إلى المساعد القانوني الذكي."
            )}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t("Username", "اسم المستخدم")}</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("Enter your username", "أدخل اسم المستخدم")}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("Password", "كلمة المرور")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("Enter your password", "أدخل كلمة المرور")}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? t("Signing in...", "جارٍ تسجيل الدخول...")
                : t("Sign In", "تسجيل الدخول")}
            </Button>
          </form>

          {GOOGLE_CLIENT_ID && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    {t("or", "أو")}
                  </span>
                </div>
              </div>

              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() =>
                    setError(t("Google login failed.", "فشل تسجيل الدخول بحساب Google."))
                  }
                  theme="outline"
                  size="large"
                  width="100%"
                  text="continue_with"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );

  if (GOOGLE_CLIENT_ID) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        {loginForm}
      </GoogleOAuthProvider>
    );
  }

  return loginForm;
}
