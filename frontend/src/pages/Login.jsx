import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { setAuth } = useAuth();
  const from = location.state?.from || "/";

  const [tab, setTab]           = useState("login");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);

  // form fields
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setAuth(data);
      toast.success(`Welcome back, ${data.user.name.split(" ")[0]}!`);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/signup", { name, email, password });
      setAuth(data);
      toast.success(`Welcome to ZiyaNisa, ${data.user.name.split(" ")[0]}!`);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Signup failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center px-5">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-peach/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-aqua/15 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative"
      >
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <span className="w-9 h-9 rounded-full bg-gradient-to-br from-gold to-champagne shadow-goldGlow grid place-items-center">
            <span className="text-pearl font-serif text-base">Z</span>
          </span>
          <span className="font-serif text-2xl text-espresso tracking-[0.18em]">
            ZIYA<span className="text-gold">NISA</span>
          </span>
        </Link>

        <div className="bg-pearl rounded-3xl border border-gold/15 shadow-soft p-6 md:p-8">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full bg-rosemist/40 rounded-full mb-6 p-1">
              <TabsTrigger value="login"  className="flex-1 rounded-full data-[state=active]:bg-espresso data-[state=active]:text-ivory text-sm transition-all">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="flex-1 rounded-full data-[state=active]:bg-espresso data-[state=active]:text-ivory text-sm transition-all">Create Account</TabsTrigger>
            </TabsList>

            {/* ── Sign In ── */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <Field label="Email">
                  <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-taupe" />
                  <Input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="pl-11 h-11 rounded-full border-gold/25 bg-ivory/60 focus-visible:ring-gold/40" />
                </Field>
                <Field label="Password">
                  <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-taupe" />
                  <Input type={showPass ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-11 pr-11 h-11 rounded-full border-gold/25 bg-ivory/60 focus-visible:ring-gold/40" />
                  <TogglePass show={showPass} onToggle={() => setShowPass(v => !v)} />
                </Field>
                <Button type="submit" disabled={loading} className="w-full h-11 rounded-full bg-espresso text-ivory hover:bg-espresso/90">
                  {loading ? "Signing in…" : <><span>Sign In</span><ArrowRight className="w-4 h-4 ml-1" /></>}
                </Button>
              </form>
              <p className="text-center text-xs text-taupe mt-4">
                No account?{" "}
                <button onClick={() => setTab("signup")} className="text-espresso underline underline-offset-2">Create one free</button>
              </p>
            </TabsContent>

            {/* ── Create Account ── */}
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <Field label="Full Name">
                  <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-taupe" />
                  <Input type="text" required value={name} onChange={e => setName(e.target.value)}
                    placeholder="Ziya Nisa"
                    className="pl-11 h-11 rounded-full border-gold/25 bg-ivory/60 focus-visible:ring-gold/40" />
                </Field>
                <Field label="Email">
                  <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-taupe" />
                  <Input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="pl-11 h-11 rounded-full border-gold/25 bg-ivory/60 focus-visible:ring-gold/40" />
                </Field>
                <Field label="Password">
                  <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-taupe" />
                  <Input type={showPass ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="pl-11 pr-11 h-11 rounded-full border-gold/25 bg-ivory/60 focus-visible:ring-gold/40" />
                  <TogglePass show={showPass} onToggle={() => setShowPass(v => !v)} />
                </Field>
                <Button type="submit" disabled={loading} className="w-full h-11 rounded-full bg-espresso text-ivory hover:bg-espresso/90">
                  {loading ? "Creating account…" : <><span>Create Account</span><ArrowRight className="w-4 h-4 ml-1" /></>}
                </Button>
              </form>
              <p className="text-center text-xs text-taupe mt-4">
                Already have an account?{" "}
                <button onClick={() => setTab("login")} className="text-espresso underline underline-offset-2">Sign in</button>
              </p>
            </TabsContent>
          </Tabs>

          <p className="text-center text-xs text-taupe mt-5">
            By continuing, you agree to ZiyaNisa's Terms & Privacy Policy.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-[0.2em] text-taupe mb-1.5 block">{label}</label>
      <div className="relative">{children}</div>
    </div>
  );
}

function TogglePass({ show, onToggle }) {
  return (
    <button type="button" onClick={onToggle}
      className="absolute right-4 top-1/2 -translate-y-1/2 text-taupe hover:text-espresso transition"
      aria-label="Toggle password visibility">
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );
}
