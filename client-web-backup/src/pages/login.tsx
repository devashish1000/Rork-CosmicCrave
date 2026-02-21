import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Aperture, ChefHat, UtensilsCrossed, Check, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "@/hooks/use-toast";
import { setOnboardingComplete } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/supabase";
import { PAGE_TITLE_CLASS, EYEBROW_CLASS } from "@/lib/design-tokens";

type AuthAction = "login" | "signup" | "reset";

const AUTH_NOT_CONFIGURED_MESSAGE =
  "Sign-in isn't configured. In the app folder (where you run npm), add a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (names must start with VITE_). If you copied from another project that used SUPABASE_URL, add lines with the VITE_ prefix and the same values, then restart the dev server.";

function mapAuthError(action: AuthAction, raw: string | null | undefined) {
  const message = (raw ?? "").toLowerCase();

  const isNetworkOrConfig =
    message.includes("failed to fetch") ||
    message.includes("network error") ||
    message.includes("load failed") ||
    message.includes("network request failed") ||
    message.includes("fetch failed") ||
    message.includes("invalid json") ||
    message.includes("placeholder");
  if (isNetworkOrConfig || !isSupabaseConfigured) {
    return AUTH_NOT_CONFIGURED_MESSAGE;
  }

  const isRateLimited =
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("too many attempt");

  if (isRateLimited) {
    if (action === "signup") {
      return "Too many signup attempts right now. Please wait about a minute and try again.";
    }
    if (action === "login") {
      return "Too many sign-in attempts right now. Please wait about a minute and try again.";
    }
    return "Too many reset requests right now. Please wait about a minute and try again.";
  }

  if (message.includes("invalid email") || (message.includes("email") && message.includes("invalid"))) {
    return "Please enter a valid email address.";
  }

  if (
    action === "signup" &&
    (message.includes("already registered") || message.includes("already exists"))
  ) {
    return "That email already has an account. Use Login instead.";
  }

  if (action === "login" && message.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }

  if (action === "login" && message.includes("email not confirmed")) {
    return "Please verify your email before signing in.";
  }

  if (action === "signup") return "Unable to create account right now. Please try again.";
  if (action === "reset") return "Unable to send reset email right now. Please try again.";
  return "Unable to sign in right now. Please try again.";
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { user, loading, signIn, signUp, signInAsGuest, resetPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [status, setStatus] = useState<'IDLE' | 'SYNCING' | 'SUCCESS'>('IDLE');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      setLocation("/home");
    }
  }, [user, loading, setLocation]);

  const clearTransientError = () => {
    if (error) setError(null);
    if (status !== "IDLE") setStatus("IDLE");
  };

  const switchMode = (nextMode: "login" | "signup") => {
    if (mode === nextMode) return;
    setMode(nextMode);
    setError(null);
    setStatus("IDLE");
    setPassword("");
    setConfirmPassword("");
    if (nextMode === "login") {
      setAgreedToTerms(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validation
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    
    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    
    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (!agreedToTerms) {
        setError("Please agree to the terms and conditions");
        return;
      }
    }
    
    setStatus('SYNCING');
    
    try {
      if (mode === 'signup') {
        const { error, needsEmailVerification } = await signUp(email.trim(), password);
        if (error) {
          setError(mapAuthError("signup", error.message));
          setStatus('IDLE');
          return;
        }
        setOnboardingComplete();

        if (needsEmailVerification) {
          toast({
            title: "Account created!",
            description: "Check your email to verify your account before first sign-in.",
          });
          setStatus('IDLE');
          setMode('login');
          setPassword("");
          setConfirmPassword("");
          return;
        }

        toast({
          title: "Account created!",
          description: "You're signed in and ready to cook.",
        });
        setStatus('SUCCESS');
        setTimeout(() => {
          setLocation("/home");
        }, 700);
      } else {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          setError(mapAuthError("login", error.message));
          setStatus('IDLE');
          return;
        }
        setOnboardingComplete();
        setStatus('SUCCESS');
        setTimeout(() => {
          setLocation("/home");
        }, 1000);
      }
    } catch (err) {
      const action: AuthAction = mode === "signup" ? "signup" : "login";
      setError(mapAuthError(action, err instanceof Error ? err.message : null));
      setStatus('IDLE');
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError("Please enter your email first");
      return;
    }
    setError(null);
    const { error } = await resetPassword(email.trim());
    if (error) {
      setError(mapAuthError("reset", error.message));
    } else {
      toast({
        title: "Reset email sent!",
        description: "Check your email for password reset instructions.",
      });
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-hidden">
      <div className="relative mx-auto min-h-screen w-full max-w-[430px] px-4 pb-24 pt-8">
        {/* Cinematic top-left glow */}
        <div
          className="pointer-events-none fixed left-0 top-0 h-[600px] w-[600px] opacity-60"
          style={{
            background: 'radial-gradient(circle at 0% 0%, hsl(25 90% 55% / 0.35) 0%, hsl(30 85% 50% / 0.18) 25%, transparent 60%)',
            filter: 'blur(60px)',
          }}
        />

        {/* Background Floating Wireframe Icons - KEPT FROM GOOGLE AI STUDIO */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
            className="absolute top-[-10%] left-[-10%] text-white"
          >
            <ChefHat size={300} strokeWidth={0.5} />
          </motion.div>
          <motion.div 
            animate={{ rotate: -360 }} 
            transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-[-10%] right-[-10%] text-white"
          >
            <UtensilsCrossed size={300} strokeWidth={0.5} />
          </motion.div>
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm"
          >
            {/* Glass Card */}
            <div className="glass-card rounded-3xl p-8 border border-white/5 relative overflow-hidden">
              
              {/* Camera/Aperture Logo Animation - KEPT FROM GOOGLE AI STUDIO */}
              <div className="relative w-24 h-24 mx-auto mb-8 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-white/10" />
                
                {/* Spinning Ring */}
                <motion.div 
                  animate={{ rotate: status === 'SYNCING' ? 360 : 0 }}
                  transition={{ duration: 2, repeat: status === 'SYNCING' ? Infinity : 0, ease: "linear" }}
                  className="absolute inset-2 rounded-full border-t-2 border-l-2 border-[hsl(var(--ring))] opacity-50"
                />

                {/* Center Lens */}
                <div className="relative z-10 bg-[hsl(var(--card))] rounded-full p-4 border border-white/5 shadow-inner">
                  {status === 'SUCCESS' ? (
                    <Check size={32} className="text-emerald-500" />
                  ) : (
                    <Aperture size={32} className={`text-[hsl(var(--ring))] ${status === 'SYNCING' ? 'animate-spin' : ''}`} />
                  )}
                </div>
              </div>

              <div className="text-center mb-8">
                <h2 className={PAGE_TITLE_CLASS + " mb-2"}>CosmicCrave</h2>
                <p className={"mt-1 " + EYEBROW_CLASS + " text-neutral-500"}>
                  {status === 'IDLE' && 'PALATE PROFILE SYNC'}
                  {status === 'SYNCING' && 'Syncing Pantry DB...'}
                  {status === 'SUCCESS' && 'Cookbook Loaded'}
                </p>
              </div>

              {/* Login/Signup Toggle */}
              <div className="flex gap-2 mb-6 p-1 bg-[hsl(var(--muted))] rounded-2xl">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all
                    ${mode === 'login'
                      ? 'bg-[hsl(var(--ring))] text-[hsl(var(--primary-foreground))] shadow-md'
                      : 'text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all
                    ${mode === 'signup'
                      ? 'bg-[hsl(var(--ring))] text-[hsl(var(--primary-foreground))] shadow-md'
                      : 'text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Error Message */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}
                
                {/* Email Field */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">Email</label>
                  <input 
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => {
                      clearTransientError();
                      setEmail(e.target.value);
                    }}
                    required
                    className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[hsl(var(--ring))] transition-colors"
                  />
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => {
                        clearTransientError();
                        setPassword(e.target.value);
                      }}
                      required
                      className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-2xl px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[hsl(var(--ring))] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field (Signup only) */}
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground">Confirm Password</label>
                    <div className="relative">
                      <input 
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => {
                          clearTransientError();
                          setConfirmPassword(e.target.value);
                        }}
                        required
                        className="w-full bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-2xl px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[hsl(var(--ring))] transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-red-400">Passwords do not match</p>
                    )}
                  </div>
                )}

                {/* Forgot Password Link (Login only) */}
                {mode === 'login' && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs text-[hsl(var(--ring))] hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}

                {/* Terms Checkbox (Signup only) */}
                {mode === 'signup' && (
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={agreedToTerms}
                      onChange={(e) => {
                        clearTransientError();
                        setAgreedToTerms(e.target.checked);
                      }}
                      className="mt-1 w-4 h-4 rounded border-[hsl(var(--border))] bg-[hsl(var(--input))] text-[hsl(var(--ring))] focus:ring-[hsl(var(--ring))]"
                    />
                    <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed">
                      I agree to the{' '}
                      <a href="#" className="text-[hsl(var(--ring))] hover:underline" onClick={(e) => { e.preventDefault(); }}>
                        Terms of Service
                      </a>
                      {' '}and{' '}
                      <a href="#" className="text-[hsl(var(--ring))] hover:underline" onClick={(e) => { e.preventDefault(); }}>
                        Privacy Policy
                      </a>
                    </label>
                  </div>
                )}

                {/* Submit Button */}
                <button 
                  type="submit"
                  disabled={status !== 'IDLE' || (mode === 'signup' && (!agreedToTerms || password !== confirmPassword))}
                  className={`w-full py-4 rounded-2xl text-sm font-semibold transition-all duration-300
                    ${status === 'IDLE' && (mode === 'login' || (agreedToTerms && password === confirmPassword))
                      ? 'bg-[hsl(var(--ring))] text-[hsl(var(--primary-foreground))] hover:brightness-105 shadow-lg' 
                      : 'bg-[hsl(var(--muted))] text-muted-foreground cursor-not-allowed'
                    }
                  `}
                >
                  {status === 'IDLE' && (mode === 'login' ? 'Sign In' : 'Create Account')}
                  {status === 'SYNCING' && (mode === 'login' ? 'Signing in...' : 'Creating account...')}
                  {status === 'SUCCESS' && 'Success!'}
                </button>

                {/* Social Login Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[hsl(var(--border))]"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-[hsl(var(--card))] px-4 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                {/* Social Login Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--input))] text-foreground hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span className="text-sm font-medium">Google</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--input))] text-foreground hover:bg-[hsl(var(--muted))] transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 17.5c-.169.47-.537.872-1.03 1.16-.494.29-1.06.44-1.638.44-.578 0-1.144-.15-1.638-.44-.493-.288-.861-.69-1.03-1.16-.17-.47-.17-.98 0-1.45.169-.47.537-.872 1.03-1.16.494-.29 1.06-.44 1.638-.44.578 0 1.144.15 1.638.44.493.288.861.69 1.03 1.16.17.47.17.98 0 1.45z" fill="#000000"/>
                    </svg>
                    <span className="text-sm font-medium">Apple</span>
                  </button>
                </div>

                {/* Dev bypass when Supabase not configured */}
                {!isSupabaseConfigured && import.meta.env.DEV && (
                  <div className="mt-4 pt-4 border-t border-[hsl(var(--border))]">
                    <button
                      type="button"
                      onClick={() => {
                        setOnboardingComplete();
                        signInAsGuest();
                        setLocation("/home");
                      }}
                      className="w-full py-2.5 rounded-xl text-sm font-medium border border-amber-500/40 text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                    >
                      Continue to app (development)
                    </button>
                    <p className="mt-2 text-xs text-center text-muted-foreground">
                      Sign-in is not configured; use this to preview the app.
                    </p>
                  </div>
                )}
              </form>

              {/* Privacy/Terms Footer */}
              <div className="mt-6 pt-6 border-t border-[hsl(var(--border))]">
                <p className="text-xs text-center text-muted-foreground">
                  By continuing, you agree to our{' '}
                  <a href="#" className="text-[hsl(var(--ring))] hover:underline" onClick={(e) => { e.preventDefault(); }}>
                    Terms of Service
                  </a>
                  {' '}and{' '}
                  <a href="#" className="text-[hsl(var(--ring))] hover:underline" onClick={(e) => { e.preventDefault(); }}>
                    Privacy Policy
                  </a>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
